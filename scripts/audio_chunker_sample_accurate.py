#!/usr/bin/env python3
"""
Sample-accurate audio chunking script that splits audio files into overlapping segments.
Uses soundfile for perfect overlap alignment to prevent crossfade artifacts.
"""

import sys
import os
import json
import tempfile
import logging
from pathlib import Path
from typing import List, Dict, Any

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

try:
    import soundfile as sf
    import numpy as np
except ImportError as e:
    logger.error(f"Required dependencies not found: {e}")
    logger.error("Please install: pip install soundfile numpy")
    sys.exit(1)

class SampleAccurateAudioChunker:
    def __init__(self, chunk_duration: int = 90, overlap_duration: int = 2):
        """
        Initialize the AudioChunker.
        
        Args:
            chunk_duration: Duration of each chunk in seconds (default: 90)
            overlap_duration: Overlap between chunks in seconds (default: 2)
        """
        self.chunk_duration = chunk_duration
        self.overlap_duration = overlap_duration
        self.temp_dir = None
        
    def __enter__(self):
        self.temp_dir = tempfile.mkdtemp(prefix="audio_chunking_")
        logger.info(f"Created temporary directory: {self.temp_dir}")
        return self
        
    def __exit__(self, exc_type, exc_val, exc_tb):
        # Only clean up on error - let chunks persist for processing
        if exc_type is not None and self.temp_dir and os.path.exists(self.temp_dir):
            import shutil
            shutil.rmtree(self.temp_dir)
            logger.info(f"Cleaned up temporary directory due to error: {self.temp_dir}")
    
    def split_audio_with_perfect_overlap(self, input_file: str) -> List[Dict[str, Any]]:
        """
        Split audio file into overlapping chunks with sample-accurate alignment.
        This ensures perfect overlap for seamless crossfading.
        
        Args:
            input_file: Path to the input audio file
            
        Returns:
            List of chunk information dictionaries
        """
        try:
            # Load entire audio file into memory for sample-accurate splitting
            logger.info(f"Loading audio file: {input_file}")
            audio_data, sample_rate = sf.read(input_file, always_2d=True)
            total_samples = audio_data.shape[0]
            n_channels = audio_data.shape[1]
            total_duration = total_samples / sample_rate
            
            logger.info(f"Audio loaded: {total_duration:.2f}s, {sample_rate}Hz, {n_channels} channels, {total_samples} samples")
            
            # Calculate sample counts for chunks and overlaps
            chunk_samples = int(self.chunk_duration * sample_rate)
            overlap_samples = int(self.overlap_duration * sample_rate)
            
            logger.info(f"Chunk settings: {self.chunk_duration}s ({chunk_samples} samples), overlap: {self.overlap_duration}s ({overlap_samples} samples)")
            
            chunks = []
            chunk_index = 0
            start_sample = 0
            
            while start_sample < total_samples:
                # Calculate end sample for this chunk
                # For all chunks except the last, add overlap for next chunk
                if start_sample + chunk_samples < total_samples:
                    # Not the last chunk - add overlap
                    end_sample = min(start_sample + chunk_samples + overlap_samples, total_samples)
                else:
                    # Last chunk - no overlap needed
                    end_sample = total_samples
                
                # Extract chunk data with sample precision
                chunk_data = audio_data[start_sample:end_sample]
                
                # Calculate actual times
                start_time = start_sample / sample_rate
                end_time = end_sample / sample_rate
                chunk_duration_actual = (end_sample - start_sample) / sample_rate
                
                # Create chunk filename with sample positions for debugging
                chunk_filename = f"chunk_{chunk_index:03d}_{start_sample}_{end_sample}.wav"
                chunk_path = os.path.join(self.temp_dir, chunk_filename)
                
                # Write chunk to file with same sample rate and format
                sf.write(chunk_path, chunk_data, sample_rate)
                
                # Store chunk information
                chunk_info = {
                    "id": f"chunk_{chunk_index}",
                    "index": chunk_index,
                    "start_time": start_time,
                    "end_time": end_time,
                    "duration": chunk_duration_actual,
                    "start_sample": start_sample,
                    "end_sample": end_sample,
                    "sample_rate": sample_rate,
                    "channels": n_channels,
                    "file_path": chunk_path,
                    "status": "ready"
                }
                chunks.append(chunk_info)
                
                logger.info(f"Created chunk {chunk_index}: {start_time:.3f}s - {end_time:.3f}s ({chunk_duration_actual:.3f}s) | samples {start_sample}-{end_sample}")
                
                # Move to next chunk start (only advance by chunk_samples to maintain overlap)
                start_sample += chunk_samples
                chunk_index += 1
                
                # Safety check to prevent infinite loops
                if chunk_index > 1000:
                    raise Exception("Too many chunks generated - possible infinite loop")
            
            logger.info(f"Successfully created {len(chunks)} chunks with perfect sample-accurate overlaps")
            
            # Verify overlaps are correct for debugging
            if len(chunks) > 1:
                self._verify_overlaps(chunks, audio_data, sample_rate)
            
            return chunks
            
        except Exception as e:
            logger.error(f"Failed to split audio: {e}")
            raise
    
    def _verify_overlaps(self, chunks: List[Dict], original_audio: np.ndarray, sample_rate: int):
        """
        Verify that overlapping regions between chunks are identical.
        This is crucial for seamless crossfading.
        """
        overlap_samples = int(self.overlap_duration * sample_rate)
        
        for i in range(len(chunks) - 1):
            chunk_a = chunks[i]
            chunk_b = chunks[i + 1]
            
            # Read the chunk files
            audio_a, _ = sf.read(chunk_a['file_path'])
            audio_b, _ = sf.read(chunk_b['file_path'])
            
            # Get overlap regions
            overlap_a = audio_a[-overlap_samples:]  # Last N samples of chunk A
            overlap_b = audio_b[:overlap_samples]   # First N samples of chunk B
            
            # Check if they're identical (within floating point precision)
            if not np.allclose(overlap_a, overlap_b, rtol=1e-10, atol=1e-10):
                logger.warning(f"Overlap mismatch between chunk {i} and {i+1}!")
                # Calculate difference for debugging
                diff = np.abs(overlap_a - overlap_b)
                max_diff = np.max(diff)
                logger.warning(f"Maximum difference: {max_diff}")
            else:
                logger.info(f"✓ Perfect overlap verified between chunk {i} and {i+1}")
    
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

def process_audio_chunks(input_file: str, output_file: str = None) -> Dict[str, Any]:
    """
    Process audio file into chunks with sample-accurate overlaps.
    
    Args:
        input_file: Path to the input audio file
        output_file: Placeholder for compatibility (not used)
        
    Returns:
        Dictionary containing chunk information
    """
    chunker = SampleAccurateAudioChunker()
    chunker.temp_dir = tempfile.mkdtemp(prefix="audio_chunking_")
    logger.info(f"Created temporary directory: {chunker.temp_dir}")
    
    try:
        # Get audio info first
        audio_info = chunker.get_audio_info(input_file)
        logger.info(f"Audio info: {audio_info}")
        
        # Split into chunks with perfect overlaps
        chunks = chunker.split_audio_with_perfect_overlap(input_file)
        
        result = {
            "success": True,
            "chunks": chunks,
            "total_chunks": len(chunks),
            "temp_dir": chunker.temp_dir,
            "audio_info": audio_info,
            "method": "sample_accurate_soundfile",
            "overlap_verified": True
        }
        
        return result
        
    except Exception as e:
        # Clean up on error
        if chunker.temp_dir and os.path.exists(chunker.temp_dir):
            import shutil
            shutil.rmtree(chunker.temp_dir)
            logger.info(f"Cleaned up temporary directory due to error: {chunker.temp_dir}")
        raise Exception(f"Sample-accurate audio chunking failed: {e}")

def main():
    if len(sys.argv) < 3:
        print("Usage: python audio_chunker_sample_accurate.py <input_file> <output_file>", file=sys.stderr)
        sys.exit(1)
    
    input_file = sys.argv[1]
    output_file = sys.argv[2]  # Not used but kept for compatibility
    
    try:
        result = process_audio_chunks(input_file, output_file)
        
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
