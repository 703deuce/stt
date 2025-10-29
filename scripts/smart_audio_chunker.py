#!/usr/bin/env python3
"""
Smart audio chunking script that splits audio files at silence boundaries for VOICE TRANSFER.
Uses librosa for silence detection to avoid cutting in the middle of words.

IMPORTANT: This chunker keeps WAV format for maximum audio quality since voice transfer
models are sensitive to compression artifacts that could affect voice cloning quality.
For transcription chunks, see transcript_chunker.py which uses MP3 for efficiency.
"""

import sys
import os
import json
import tempfile
import logging
from pathlib import Path
from typing import List, Dict, Any, Tuple

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

try:
    import soundfile as sf
    import numpy as np
    import librosa
except ImportError as e:
    logger.error(f"Required dependencies not found: {e}")
    logger.error("Please install: pip install soundfile numpy librosa")
    sys.exit(1)

class SmartAudioChunker:
    def __init__(self, target_chunk_duration: int = 90, overlap_duration: int = 2, max_deviation: int = 15):
        """
        Initialize the Smart Audio Chunker.
        
        Args:
            target_chunk_duration: Target duration of each chunk in seconds (default: 90)
            overlap_duration: Overlap between chunks in seconds (default: 2)
            max_deviation: Maximum deviation from target duration to find silence (default: 15)
        """
        self.target_chunk_duration = target_chunk_duration
        self.overlap_duration = overlap_duration
        self.max_deviation = max_deviation  # Allow ±15 seconds to find silence
        self.temp_dir = None
        
    def __enter__(self):
        self.temp_dir = tempfile.mkdtemp(prefix="smart_audio_chunking_")
        logger.info(f"Created temporary directory: {self.temp_dir}")
        return self
        
    def __exit__(self, exc_type, exc_val, exc_tb):
        # Only clean up on error - let chunks persist for processing
        if exc_type is not None and self.temp_dir and os.path.exists(self.temp_dir):
            import shutil
            shutil.rmtree(self.temp_dir)
            logger.info(f"Cleaned up temporary directory due to error: {self.temp_dir}")
    
    def find_silence_boundaries(self, audio_data: np.ndarray, sample_rate: int, top_db: int = 20) -> List[int]:
        """
        Find silence boundaries in the audio using librosa.
        
        Args:
            audio_data: Audio data array
            sample_rate: Sample rate of the audio
            top_db: The threshold (in decibels) below which to consider silence
            
        Returns:
            List of sample indices where silence boundaries occur
        """
        try:
            # Convert to mono for silence detection if stereo
            if len(audio_data.shape) > 1:
                mono_audio = np.mean(audio_data, axis=1)
            else:
                mono_audio = audio_data
            
            # Find non-silent regions
            non_silent_intervals = librosa.effects.split(mono_audio, top_db=top_db)
            
            # Extract silence boundaries (end of non-silent + start of next non-silent)
            silence_boundaries = []
            
            # Add the start of the file
            silence_boundaries.append(0)
            
            # Add boundaries between non-silent regions (silence gaps)
            for i in range(len(non_silent_intervals) - 1):
                # End of current non-silent region
                silence_start = non_silent_intervals[i][1]
                # Start of next non-silent region  
                silence_end = non_silent_intervals[i + 1][0]
                
                # Use the middle of the silence gap as the boundary
                silence_middle = (silence_start + silence_end) // 2
                silence_boundaries.append(silence_middle)
            
            # Add the end of the file
            silence_boundaries.append(len(mono_audio))
            
            logger.info(f"Found {len(silence_boundaries)} silence boundaries (top_db={top_db})")
            return sorted(set(silence_boundaries))  # Remove duplicates and sort
            
        except Exception as e:
            logger.warning(f"Silence detection failed: {e}, falling back to no silence boundaries")
            return [0, len(audio_data)]
    
    def find_optimal_split_point(self, target_sample: int, silence_boundaries: List[int], 
                                sample_rate: int) -> int:
        """
        Find the optimal split point near the target sample by snapping to silence.
        
        Args:
            target_sample: Target sample position for splitting
            silence_boundaries: List of silence boundary sample positions
            sample_rate: Sample rate of the audio
            
        Returns:
            Optimal sample position for splitting
        """
        max_deviation_samples = self.max_deviation * sample_rate
        
        # Find silence boundaries within the acceptable range
        valid_boundaries = []
        for boundary in silence_boundaries:
            if abs(boundary - target_sample) <= max_deviation_samples:
                valid_boundaries.append(boundary)
        
        if valid_boundaries:
            # Choose the boundary closest to our target
            optimal_point = min(valid_boundaries, key=lambda x: abs(x - target_sample))
            deviation_sec = abs(optimal_point - target_sample) / sample_rate
            logger.info(f"Found silence boundary {deviation_sec:.1f}s from target (sample {optimal_point})")
            return optimal_point
        else:
            # No silence found within range, use the target point
            logger.warning(f"No silence boundary within ±{self.max_deviation}s, using target point")
            return target_sample
    
    def split_audio_at_silence_boundaries(self, input_file: str) -> List[Dict[str, Any]]:
        """
        Split audio file into chunks at optimal silence boundaries.
        
        Args:
            input_file: Path to the input audio file
            
        Returns:
            List of chunk information dictionaries
        """
        try:
            # Load audio file
            logger.info(f"Loading audio file: {input_file}")
            audio_data, sample_rate = sf.read(input_file, always_2d=True)
            total_samples = audio_data.shape[0]
            n_channels = audio_data.shape[1]
            total_duration = total_samples / sample_rate
            
            logger.info(f"Audio loaded: {total_duration:.2f}s, {sample_rate}Hz, {n_channels} channels, {total_samples} samples")
            
            # Find silence boundaries
            silence_boundaries = self.find_silence_boundaries(audio_data, sample_rate)
            
            # Calculate target split points and find optimal boundaries
            chunks = []
            chunk_index = 0
            current_start = 0
            
            while current_start < total_samples:
                # Calculate target end point (without overlap)
                target_end_sample = current_start + int(self.target_chunk_duration * sample_rate)
                
                if target_end_sample >= total_samples:
                    # Last chunk - use the end of the file
                    actual_end_sample = total_samples
                else:
                    # Find optimal split point near target using silence detection
                    actual_end_sample = self.find_optimal_split_point(
                        target_end_sample, silence_boundaries, sample_rate
                    )
                
                # Add overlap for all chunks except the last
                if actual_end_sample < total_samples:
                    chunk_end_sample = min(actual_end_sample + int(self.overlap_duration * sample_rate), total_samples)
                else:
                    chunk_end_sample = actual_end_sample
                
                # Extract chunk data
                chunk_data = audio_data[current_start:chunk_end_sample]
                
                # Calculate actual times
                start_time = current_start / sample_rate
                end_time = chunk_end_sample / sample_rate
                actual_duration = (chunk_end_sample - current_start) / sample_rate
                chunk_duration_no_overlap = (actual_end_sample - current_start) / sample_rate
                
                # Create chunk filename
                chunk_filename = f"smart_chunk_{chunk_index:03d}_{current_start}_{chunk_end_sample}.wav"
                chunk_path = os.path.join(self.temp_dir, chunk_filename)
                
                # Write chunk to file
                sf.write(chunk_path, chunk_data, sample_rate)
                
                # Store chunk information (convert numpy types to Python types for JSON)
                chunk_info = {
                    "id": f"chunk_{chunk_index}",
                    "index": int(chunk_index),
                    "start_time": float(start_time),
                    "end_time": float(end_time),
                    "duration": float(actual_duration),
                    "duration_no_overlap": float(chunk_duration_no_overlap),
                    "target_duration": int(self.target_chunk_duration),
                    "start_sample": int(current_start),
                    "end_sample": int(chunk_end_sample),
                    "actual_split_sample": int(actual_end_sample),
                    "sample_rate": int(sample_rate),
                    "channels": int(n_channels),
                    "file_path": chunk_path,
                    "status": "ready",
                    "split_method": "silence_boundary"
                }
                chunks.append(chunk_info)
                
                logger.info(f"Created smart chunk {chunk_index}: {start_time:.1f}s - {end_time:.1f}s "
                           f"(target: {self.target_chunk_duration}s, actual: {chunk_duration_no_overlap:.1f}s)")
                
                # Move to next chunk start (without overlap)
                current_start = actual_end_sample
                chunk_index += 1
                
                # Safety check
                if chunk_index > 1000:
                    raise Exception("Too many chunks generated - possible infinite loop")
            
            logger.info(f"Successfully created {len(chunks)} smart chunks with silence-aware splitting")
            return chunks
            
        except Exception as e:
            logger.error(f"Failed to split audio at silence boundaries: {e}")
            raise
    
    def get_audio_info(self, input_file: str) -> Dict[str, Any]:
        """
        Get information about an audio file.
        
        Args:
            input_file: Path to the input audio file
            
        Returns:
            Dictionary with audio information
        """
        try:
            info = sf.info(input_file)
            return {
                "duration": info.duration,
                "sample_rate": info.samplerate,
                "channels": info.channels,
                "frames": info.frames,
                "format": info.format,
                "subtype": info.subtype
            }
        except Exception as e:
            raise Exception(f"Failed to get audio info: {e}")

def process_smart_audio_chunks(input_file: str, output_file: str = None) -> Dict[str, Any]:
    """
    Process audio file into chunks with smart silence-aware splitting.
    
    Args:
        input_file: Path to the input audio file
        output_file: Placeholder for compatibility (not used)
        
    Returns:
        Dictionary containing chunk information
    """
    chunker = SmartAudioChunker()
    chunker.temp_dir = tempfile.mkdtemp(prefix="smart_audio_chunking_")
    logger.info(f"Created temporary directory: {chunker.temp_dir}")
    
    try:
        # Get audio info first
        audio_info = chunker.get_audio_info(input_file)
        logger.info(f"Audio info: {audio_info}")
        
        # Split into chunks with smart silence detection
        chunks = chunker.split_audio_at_silence_boundaries(input_file)
        
        # Calculate statistics (convert numpy types to Python types for JSON)
        durations = [chunk["duration_no_overlap"] for chunk in chunks]
        avg_duration = float(np.mean(durations))
        deviation_from_target = [abs(d - chunker.target_chunk_duration) for d in durations]
        avg_deviation = float(np.mean(deviation_from_target))
        
        result = {
            "success": True,
            "chunks": chunks,
            "total_chunks": len(chunks),
            "temp_dir": chunker.temp_dir,
            "audio_info": audio_info,
            "method": "smart_silence_aware_splitting",
            "statistics": {
                "target_duration": int(chunker.target_chunk_duration),
                "average_duration": avg_duration,
                "average_deviation": avg_deviation,
                "max_deviation_allowed": int(chunker.max_deviation),
                "durations": durations
            }
        }
        
        return result
        
    except Exception as e:
        # Clean up on error
        if chunker.temp_dir and os.path.exists(chunker.temp_dir):
            import shutil
            shutil.rmtree(chunker.temp_dir)
            logger.info(f"Cleaned up temporary directory due to error: {chunker.temp_dir}")
        raise Exception(f"Smart audio chunking failed: {e}")

def main():
    if len(sys.argv) < 3:
        print("Usage: python smart_audio_chunker.py <input_file> <output_file>", file=sys.stderr)
        sys.exit(1)
    
    input_file = sys.argv[1]
    output_file = sys.argv[2]  # Not used but kept for compatibility
    
    try:
        result = process_smart_audio_chunks(input_file, output_file)
        
        # Output JSON result
        print(json.dumps(result, indent=2))
        
    except Exception as e:
        result = {
            "success": False,
            "error": str(e)
        }
        print(json.dumps(result, indent=2))
        sys.exit(1)

if __name__ == "__main__":
    main()
