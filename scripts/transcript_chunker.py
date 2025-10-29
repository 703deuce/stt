#!/usr/bin/env python3
"""
Smart transcript chunking script that splits audio files into 15-minute chunks for transcription.
Uses librosa for silence detection to avoid cutting mid-sentence for better transcription quality.
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
    import librosa
    from pydub import AudioSegment
except ImportError as e:
    logger.error(f"Required dependencies not found: {e}")
    logger.error("Please install: pip install soundfile numpy librosa pydub")
    sys.exit(1)

class TranscriptAudioChunker:
    def __init__(self, target_chunk_duration: int = 900, overlap_duration: int = 30, max_deviation: int = 60, use_mp3: bool = True):
        """
        Initialize the Transcript Audio Chunker.
        
        Args:
            target_chunk_duration: Target duration of each chunk in seconds (default: 900 = 15 minutes)
            overlap_duration: Overlap between chunks in seconds (default: 30 = 30 seconds)
            max_deviation: Maximum deviation from target duration to find silence (default: 60 = 1 minute)
            use_mp3: Whether to convert chunks to MP3 format (default: True for transcription)
        """
        self.target_chunk_duration = target_chunk_duration
        self.overlap_duration = overlap_duration
        self.max_deviation = max_deviation
        self.temp_dir = None
        
        # Audio output format preferences for transcription
        self.output_format = "mp3" if use_mp3 else "wav"
        self.mp3_bitrate = "128k"   # Good quality vs size balance for speech recognition
        
    def __enter__(self):
        self.temp_dir = tempfile.mkdtemp(prefix="transcript_chunking_")
        logger.info(f"Created temporary directory: {self.temp_dir}")
        return self
        
    def __exit__(self, exc_type, exc_val, exc_tb):
        # Only clean up on error - let chunks persist for processing
        if exc_type is not None and self.temp_dir and os.path.exists(self.temp_dir):
            import shutil
            shutil.rmtree(self.temp_dir)
            logger.info(f"Cleaned up temporary directory due to error: {self.temp_dir}")
    
    def convert_wav_to_mp3(self, wav_path: str, mp3_path: str) -> bool:
        """
        Convert WAV file to MP3 using FFmpeg directly for better memory efficiency.
        
        Args:
            wav_path: Path to input WAV file
            mp3_path: Path to output MP3 file
            
        Returns:
            True if conversion successful, False otherwise
        """
        import subprocess
        import shutil
        
        try:
            # Check if WAV file exists
            if not os.path.exists(wav_path):
                logger.error(f"WAV file not found: {wav_path}")
                return False
            
            # Check available disk space
            wav_size = os.path.getsize(wav_path)
            free_space = shutil.disk_usage(os.path.dirname(mp3_path)).free
            
            # Estimate MP3 size (roughly 1/10 of WAV size at 128k)
            estimated_mp3_size = wav_size // 10
            
            if free_space < estimated_mp3_size + (50 * 1024 * 1024):  # 50MB buffer
                logger.warning(f"Insufficient disk space for MP3 conversion. "
                              f"Available: {free_space/1024/1024:.1f}MB, "
                              f"Estimated needed: {estimated_mp3_size/1024/1024:.1f}MB")
                return False
            
            logger.info(f"Converting {wav_size/1024/1024:.1f}MB WAV to MP3 using FFmpeg...")
            
            # Use FFmpeg directly for memory-efficient conversion
            ffmpeg_cmd = [
                'ffmpeg', '-y',  # Overwrite output files
                '-i', wav_path,  # Input file
                '-b:a', self.mp3_bitrate,  # Audio bitrate
                '-ar', '44100',  # Sample rate (compatible with most systems)
                '-ac', '2',      # Stereo (or mono if original is mono)
                '-f', 'mp3',     # Output format
                mp3_path         # Output file
            ]
            
            # Run FFmpeg conversion
            result = subprocess.run(
                ffmpeg_cmd,
                capture_output=True,
                text=True,
                timeout=300  # 5 minute timeout
            )
            
            if result.returncode != 0:
                logger.error(f"FFmpeg conversion failed with return code {result.returncode}")
                logger.error(f"FFmpeg stderr: {result.stderr}")
                return False
            
            # Verify the MP3 file was created successfully
            if not os.path.exists(mp3_path) or os.path.getsize(mp3_path) == 0:
                logger.error("MP3 conversion failed - output file is missing or empty")
                return False
            
            # Get file sizes for comparison
            mp3_size = os.path.getsize(mp3_path)
            compression_ratio = (wav_size - mp3_size) / wav_size * 100
            
            logger.info(f"Successfully converted to MP3: {wav_size/1024/1024:.1f}MB → {mp3_size/1024/1024:.1f}MB "
                       f"({compression_ratio:.1f}% reduction)")
            
            # Remove the WAV file to save space IMMEDIATELY after successful conversion
            try:
                os.remove(wav_path)
                logger.info(f"Freed disk space by removing WAV file")
            except Exception as e:
                logger.warning(f"Failed to remove WAV file: {e}")
            
            return True
            
        except subprocess.TimeoutExpired:
            logger.error("FFmpeg conversion timed out after 5 minutes")
            return False
        except FileNotFoundError:
            logger.error("FFmpeg not found. Please install FFmpeg and ensure it's in your PATH")
            return False
        except Exception as e:
            logger.error(f"Failed to convert WAV to MP3: {e}")
            # Clean up any partial MP3 file
            if os.path.exists(mp3_path):
                try:
                    os.remove(mp3_path)
                except:
                    pass
            return False
    
    def create_mp3_chunk_directly(self, chunk_data: np.ndarray, sample_rate: int, mp3_path: str) -> bool:
        """
        Create MP3 chunk directly from audio data using FFmpeg without intermediate WAV file.
        This saves disk space by avoiding temporary WAV files.
        
        Args:
            chunk_data: Audio data array
            sample_rate: Sample rate of the audio
            mp3_path: Path to output MP3 file
            
        Returns:
            True if creation successful, False otherwise
        """
        import subprocess
        import tempfile
        import shutil
        
        try:
            # Check available disk space first
            free_space = shutil.disk_usage(os.path.dirname(mp3_path)).free
            estimated_mp3_size = (chunk_data.nbytes // 10)  # Rough estimate
            
            if free_space < estimated_mp3_size + (20 * 1024 * 1024):  # 20MB buffer
                logger.error(f"Insufficient disk space for MP3 creation. "
                            f"Available: {free_space/1024/1024:.1f}MB, "
                            f"Estimated needed: {estimated_mp3_size/1024/1024:.1f}MB")
                return False
            
            logger.info(f"Creating MP3 directly using FFmpeg (data size: {chunk_data.nbytes/1024/1024:.1f}MB)")
            
            # Create a temporary named pipe (stdin) for FFmpeg
            ffmpeg_cmd = [
                'ffmpeg', '-y',
                '-f', 'f32le',  # Input format: 32-bit float little endian
                '-ar', str(sample_rate),
                '-ac', str(chunk_data.shape[1]) if len(chunk_data.shape) > 1 else '1',
                '-i', 'pipe:0',  # Read from stdin
                '-b:a', self.mp3_bitrate,
                '-ar', '44100',  # Output sample rate
                '-f', 'mp3',
                mp3_path
            ]
            
            # Start FFmpeg process
            process = subprocess.Popen(
                ffmpeg_cmd,
                stdin=subprocess.PIPE,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=False  # Binary mode for audio data
            )
            
            # Convert audio data to float32 and send to FFmpeg
            try:
                # Ensure data is in the right format (float32)
                if chunk_data.dtype != np.float32:
                    chunk_data_f32 = chunk_data.astype(np.float32)
                else:
                    chunk_data_f32 = chunk_data
                
                # Send audio data to FFmpeg stdin
                stdout, stderr = process.communicate(input=chunk_data_f32.tobytes(), timeout=120)
                
            except subprocess.TimeoutExpired:
                process.kill()
                logger.error("FFmpeg process timed out during direct MP3 creation")
                return False
            
            if process.returncode != 0:
                logger.error(f"FFmpeg failed with return code {process.returncode}")
                logger.error(f"FFmpeg stderr: {stderr.decode('utf-8', errors='ignore')}")
                return False
            
            # Verify the MP3 file was created successfully
            if not os.path.exists(mp3_path) or os.path.getsize(mp3_path) == 0:
                logger.error("Direct MP3 creation failed - output file is missing or empty")
                return False
            
            mp3_size = os.path.getsize(mp3_path)
            compression_ratio = ((chunk_data.nbytes - mp3_size) / chunk_data.nbytes) * 100
            
            logger.info(f"Successfully created MP3 directly: {chunk_data.nbytes/1024/1024:.1f}MB → {mp3_size/1024/1024:.1f}MB "
                       f"({compression_ratio:.1f}% reduction)")
            
            return True
            
        except FileNotFoundError:
            logger.error("FFmpeg not found. Please install FFmpeg and ensure it's in your PATH")
            return False
        except Exception as e:
            logger.error(f"Failed to create MP3 directly: {e}")
            # Clean up any partial MP3 file
            if os.path.exists(mp3_path):
                try:
                    os.remove(mp3_path)
                except:
                    pass
            return False
    
    def find_silence_boundaries(self, audio_data: np.ndarray, sample_rate: int, top_db: int = 25) -> List[int]:
        """
        Find silence boundaries in the audio using librosa.
        Uses slightly higher threshold for transcription to catch sentence boundaries.
        
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
            
            # Extract silence boundaries (gaps between speech)
            silence_boundaries = []
            
            # Add the start of the file
            silence_boundaries.append(0)
            
            # Add boundaries between non-silent regions (sentence/paragraph boundaries)
            for i in range(len(non_silent_intervals) - 1):
                # End of current speech segment
                silence_start = non_silent_intervals[i][1]
                # Start of next speech segment  
                silence_end = non_silent_intervals[i + 1][0]
                
                # Use the middle of the silence gap as the boundary (natural sentence break)
                silence_middle = (silence_start + silence_end) // 2
                silence_boundaries.append(silence_middle)
            
            # Add the end of the file
            silence_boundaries.append(len(mono_audio))
            
            logger.info(f"Found {len(silence_boundaries)} silence boundaries for transcription (top_db={top_db})")
            return sorted(set(silence_boundaries))
            
        except Exception as e:
            logger.warning(f"Silence detection failed: {e}, falling back to no silence boundaries")
            return [0, len(audio_data)]
    
    def find_optimal_transcript_split_point(self, target_sample: int, silence_boundaries: List[int], 
                                          sample_rate: int) -> int:
        """
        Find the optimal split point near the target sample for transcription.
        Prioritizes longer silences (sentence/paragraph boundaries).
        
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
            # For transcription, prefer boundaries closer to the target for consistent chunk sizes
            optimal_point = min(valid_boundaries, key=lambda x: abs(x - target_sample))
            deviation_sec = abs(optimal_point - target_sample) / sample_rate
            logger.info(f"Found optimal transcript split point {deviation_sec:.1f}s from target (sample {optimal_point})")
            return optimal_point
        else:
            # No silence found within range, use the target point
            logger.warning(f"No silence boundary within ±{self.max_deviation/60:.1f} minutes, using target point")
            return target_sample
    
    def split_audio_for_transcription(self, input_file: str) -> List[Dict[str, Any]]:
        """
        Split audio file into 15-minute chunks optimized for transcription.
        
        Args:
            input_file: Path to the input audio file
            
        Returns:
            List of chunk information dictionaries
        """
        try:
            # Load audio file
            logger.info(f"Loading audio file for transcription chunking: {input_file}")
            audio_data, sample_rate = sf.read(input_file, always_2d=True)
            total_samples = audio_data.shape[0]
            n_channels = audio_data.shape[1]
            total_duration = total_samples / sample_rate
            
            logger.info(f"Audio loaded: {total_duration/60:.1f} minutes, {sample_rate}Hz, {n_channels} channels")
            
            # Find silence boundaries for natural transcription splits
            silence_boundaries = self.find_silence_boundaries(audio_data, sample_rate)
            
            # Calculate target split points and find optimal boundaries
            chunks = []
            chunk_index = 0
            current_start = 0
            
            while current_start < total_samples:
                # Calculate target end point (15 minutes without overlap)
                target_end_sample = current_start + int(self.target_chunk_duration * sample_rate)
                
                if target_end_sample >= total_samples:
                    # Last chunk - use the end of the file
                    actual_end_sample = total_samples
                else:
                    # Find optimal split point for transcription quality
                    actual_end_sample = self.find_optimal_transcript_split_point(
                        target_end_sample, silence_boundaries, sample_rate
                    )
                
                # Add small overlap for transcription context (helps with speaker continuity)
                if actual_end_sample < total_samples:
                    chunk_end_sample = min(actual_end_sample + int(self.overlap_duration * sample_rate), total_samples)
                else:
                    chunk_end_sample = actual_end_sample
                
                # Extract chunk data
                chunk_data = audio_data[current_start:chunk_end_sample]
                
                # Calculate times
                start_time = current_start / sample_rate
                end_time = chunk_end_sample / sample_rate
                actual_duration = (chunk_end_sample - current_start) / sample_rate
                chunk_duration_no_overlap = (actual_end_sample - current_start) / sample_rate
                
                # Create chunk filenames (WAV first, then MP3)
                wav_filename = f"transcript_chunk_{chunk_index:03d}_{current_start}_{chunk_end_sample}.wav"
                mp3_filename = f"transcript_chunk_{chunk_index:03d}_{current_start}_{chunk_end_sample}.mp3"
                wav_path = os.path.join(self.temp_dir, wav_filename)
                mp3_path = os.path.join(self.temp_dir, mp3_filename)
                
                # DIRECT MP3 CREATION to save disk space
                if self.output_format == "mp3":
                    # Create MP3 directly using FFmpeg to avoid temporary WAV files
                    success = self.create_mp3_chunk_directly(chunk_data, sample_rate, mp3_path)
                    if success:
                        final_chunk_path = mp3_path
                        conversion_success = True
                        logger.info(f"Created MP3 chunk {chunk_index} directly (space-efficient)")
                    else:
                        # Fallback to WAV only if MP3 fails
                        logger.warning(f"Direct MP3 creation failed for chunk {chunk_index}, using WAV fallback")
                        sf.write(wav_path, chunk_data, sample_rate)
                        final_chunk_path = wav_path
                        conversion_success = False
                else:
                    # Write WAV directly
                    sf.write(wav_path, chunk_data, sample_rate)
                    final_chunk_path = wav_path
                    conversion_success = False
                    logger.info(f"Created WAV chunk {chunk_index}")
                
                # Store chunk information (convert numpy types to Python types for JSON)
                chunk_info = {
                    "id": f"transcript_chunk_{chunk_index}",
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
                    "file_path": final_chunk_path,
                    "audio_format": "mp3" if conversion_success else "wav",
                    "status": "ready",
                    "split_method": "silence_boundary_transcription",
                    "start_time_formatted": f"{int(start_time//3600):02d}:{int((start_time%3600)//60):02d}:{int(start_time%60):02d}",
                    "end_time_formatted": f"{int(end_time//3600):02d}:{int((end_time%3600)//60):02d}:{int(end_time%60):02d}"
                }
                chunks.append(chunk_info)
                
                logger.info(f"Created transcript chunk {chunk_index}: {start_time/60:.1f}min - {end_time/60:.1f}min "
                           f"(target: {self.target_chunk_duration/60:.0f}min, actual: {chunk_duration_no_overlap/60:.1f}min)")
                
                # Move to next chunk start (without overlap for transcription)
                current_start = actual_end_sample
                chunk_index += 1
                
                # Safety check
                if chunk_index > 100:  # Allow more chunks for very long audio
                    raise Exception("Too many chunks generated - possible infinite loop")
            
            logger.info(f"Successfully created {len(chunks)} transcript chunks with smart splitting")
            return chunks
            
        except Exception as e:
            logger.error(f"Failed to split audio for transcription: {e}")
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
            duration_hours = info.duration / 3600
            return {
                "duration": info.duration,
                "duration_hours": duration_hours,
                "duration_formatted": f"{int(duration_hours):02d}:{int((info.duration%3600)//60):02d}:{int(info.duration%60):02d}",
                "sample_rate": info.samplerate,
                "channels": info.channels,
                "frames": info.frames,
                "format": info.format,
                "subtype": info.subtype
            }
        except Exception as e:
            raise Exception(f"Failed to get audio info: {e}")

def process_transcript_audio_chunks(input_file: str, output_file: str = None) -> Dict[str, Any]:
    """
    Process audio file into chunks optimized for transcription.
    
    Args:
        input_file: Path to the input audio file
        output_file: Placeholder for compatibility (not used)
        
    Returns:
        Dictionary containing chunk information
    """
    chunker = TranscriptAudioChunker()
    chunker.temp_dir = tempfile.mkdtemp(prefix="transcript_chunking_")
    logger.info(f"Created temporary directory: {chunker.temp_dir}")
    
    try:
        # Get audio info first
        audio_info = chunker.get_audio_info(input_file)
        logger.info(f"Audio info: {audio_info['duration_formatted']} ({audio_info['duration_hours']:.1f} hours)")
        
        # Split into chunks with smart silence detection for transcription
        chunks = chunker.split_audio_for_transcription(input_file)
        
        # Calculate statistics (convert numpy types to Python types for JSON)
        durations = [chunk["duration_no_overlap"] for chunk in chunks]
        avg_duration = float(np.mean(durations))
        deviation_from_target = [abs(d - chunker.target_chunk_duration) for d in durations]
        avg_deviation = float(np.mean(deviation_from_target))
        
        # Estimate transcription time (rough estimate: 1 hour audio = 10-15 minutes transcription)
        estimated_transcription_time = len(chunks) * 2  # 2 minutes per chunk estimate
        
        result = {
            "success": True,
            "chunks": chunks,
            "total_chunks": len(chunks),
            "temp_dir": chunker.temp_dir,
            "audio_info": audio_info,
            "method": "smart_silence_transcription_chunking",
            "statistics": {
                "target_duration": int(chunker.target_chunk_duration),
                "target_duration_minutes": int(chunker.target_chunk_duration / 60),
                "average_duration": avg_duration,
                "average_duration_minutes": avg_duration / 60,
                "average_deviation": avg_deviation,
                "max_deviation_allowed": int(chunker.max_deviation),
                "durations": durations,
                "estimated_transcription_time_minutes": estimated_transcription_time
            }
        }
        
        return result
        
    except Exception as e:
        # Clean up on error
        if chunker.temp_dir and os.path.exists(chunker.temp_dir):
            import shutil
            shutil.rmtree(chunker.temp_dir)
            logger.info(f"Cleaned up temporary directory due to error: {chunker.temp_dir}")
        raise Exception(f"Smart transcript audio chunking failed: {e}")

def main():
    if len(sys.argv) < 3:
        print("Usage: python transcript_chunker.py <input_file> <output_file>", file=sys.stderr)
        sys.exit(1)
    
    input_file = sys.argv[1]
    output_file = sys.argv[2]  # Not used but kept for compatibility
    
    try:
        result = process_transcript_audio_chunks(input_file, output_file)
        
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
