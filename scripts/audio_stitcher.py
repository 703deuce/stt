#!/usr/bin/env python3
"""
Audio Stitching Script
Combines processed audio chunks back together with seamless crossfading.
"""

import os
import sys
import json
import argparse
import subprocess
import tempfile
import shutil
from pathlib import Path
from typing import List, Dict
import logging

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class AudioStitcher:
    def __init__(self, overlap_duration: int = 2):
        """
        Initialize the audio stitcher.
        
        Args:
            overlap_duration: Overlap duration in seconds (default: 2)
        """
        self.overlap_duration = overlap_duration
        self.temp_dir = None
        
    def __enter__(self):
        """Create temporary directory for processing."""
        self.temp_dir = tempfile.mkdtemp(prefix="audio_stitcher_")
        logger.info(f"Created temporary directory: {self.temp_dir}")
        return self
        
    def __exit__(self, exc_type, exc_val, exc_tb):
        """Clean up temporary directory."""
        if self.temp_dir and os.path.exists(self.temp_dir):
            shutil.rmtree(self.temp_dir)
            logger.info("Cleaned up temporary directory")
    
    def stitch_chunks_with_crossfade(self, chunk_files: List[str], output_file: str) -> str:
        """
        Stitch processed chunks together. For ML-processed chunks, uses concatenation
        without crossfade to avoid doubled audio artifacts.
        
        Args:
            chunk_files: List of paths to processed chunk files
            output_file: Path for the output file
            
        Returns:
            Path to the output file
        """
        try:
            if len(chunk_files) == 0:
                raise ValueError("No chunk files provided")
                
            if len(chunk_files) == 1:
                # Only one chunk, just copy it
                shutil.copy2(chunk_files[0], output_file)
                logger.info("Single chunk, copied directly")
                return output_file
            
            # For ML-processed chunks, use simple concatenation without crossfade
            # This prevents doubled/echoed audio from ML processing drift
            logger.info("Stitching ML-processed chunks with concatenation (no crossfade)...")
            self._stitch_ml_chunks_no_crossfade(chunk_files, output_file)
            
            logger.info(f"Successfully stitched chunks to: {output_file}")
            return output_file
            
        except Exception as e:
            logger.error(f"Failed to stitch chunks: {e}")
            raise
    
    def _stitch_ml_chunks_no_crossfade(self, chunk_files: List[str], output_file: str):
        """
        Stitch ML-processed chunks using professional concatenation with fade-ins.
        
        For each chunk except the first, skip the overlap duration at the start
        and apply a gentle fade-in to prevent clicks at chunk boundaries.
        
        Args:
            chunk_files: List of paths to processed chunk files
            output_file: Path for the output file
        """
        try:
            # Import soundfile for sample-accurate processing
            import soundfile as sf
            import numpy as np
            
            stitched_data = []
            sample_rate = None
            
            # Fade settings for professional audio joining
            fade_ms = 50  # 50 milliseconds fade-in to prevent clicks
            
            for i, chunk_file in enumerate(chunk_files):
                logger.info(f"Processing chunk {i+1}/{len(chunk_files)}: {chunk_file}")
                
                # Load chunk audio data
                data, sr = sf.read(chunk_file, always_2d=True)
                
                if sample_rate is None:
                    sample_rate = sr
                elif sr != sample_rate:
                    logger.warning(f"Sample rate mismatch: expected {sample_rate}, got {sr}")
                
                if i == 0:
                    # First chunk: use entire chunk as-is
                    stitched_data.append(data)
                    logger.info(f"Added first chunk: {data.shape[0]} samples")
                else:
                    # Subsequent chunks: skip overlap and apply fade-in
                    overlap_samples = int(self.overlap_duration * sr)
                    if data.shape[0] > overlap_samples:
                        # Skip the overlap region
                        trimmed_data = data[overlap_samples:].copy()
                        
                        # Apply gentle fade-in to prevent clicks at chunk boundary
                        fade_samples = min(int(fade_ms / 1000 * sr), trimmed_data.shape[0])
                        if fade_samples > 0:
                            fade_curve = np.linspace(0, 1, fade_samples)
                            # Apply fade-in to all channels
                            for channel in range(trimmed_data.shape[1]):
                                trimmed_data[:fade_samples, channel] *= fade_curve
                            logger.info(f"Applied {fade_ms}ms fade-in ({fade_samples} samples)")
                        
                        stitched_data.append(trimmed_data)
                        logger.info(f"Added chunk {i+1}: skipped {overlap_samples} overlap samples, added {trimmed_data.shape[0]} samples with fade-in")
                    else:
                        logger.warning(f"Chunk {i+1} is shorter than overlap duration, skipping")
            
            if not stitched_data:
                raise Exception("No valid audio data to stitch")
            
            # Concatenate all chunks
            final_audio = np.vstack(stitched_data)
            logger.info(f"Final stitched audio: {final_audio.shape[0]} samples, {final_audio.shape[0]/sample_rate:.2f}s")
            
            # Write output file
            sf.write(output_file, final_audio, sample_rate)
            logger.info(f"Wrote professional stitched audio with fade-ins to: {output_file}")
            
        except ImportError:
            logger.error("soundfile and numpy are required for ML chunk stitching")
            raise Exception("Missing dependencies: soundfile, numpy")
        except Exception as e:
            logger.error(f"Failed to stitch ML chunks: {e}")
            raise
    
    def _create_crossfade_filter(self, num_chunks: int) -> str:
        """
        Create a filter complex string for proper crossfading multiple audio chunks.
        This implementation uses acrossfade with overlap mode to properly blend overlapping regions.
        
        Args:
            num_chunks: Number of chunks to stitch
            
        Returns:
            Filter complex string for ffmpeg
        """
        if num_chunks == 1:
            return "[0]aformat=sample_fmts=s16:sample_rates=44100:channel_layouts=stereo[out]"
        
        filters = []
        
        # Format all inputs first
        for i in range(num_chunks):
            filters.append(f"[{i}]aformat=sample_fmts=s16:sample_rates=44100:channel_layouts=stereo[input{i}]")
        
        # Start with first chunk
        current_output = f"[input0]"
        
        # Process subsequent chunks with proper crossfading
        for i in range(1, num_chunks):
            next_input = f"[input{i}]"
            output_label = f"[chunk{i}]" if i < num_chunks - 1 else "[out]"
            
            # Create crossfade filter with overlap mode
            # This properly blends the overlapping regions instead of just mixing them
            filter_str = (
                f"{current_output}{next_input}acrossfade=d={self.overlap_duration}:"
                f"o=1:c1=tri:c2=tri{output_label}"
            )
            filters.append(filter_str)
            current_output = output_label
        
        return ";".join(filters)
    
    def get_audio_duration(self, audio_file: str) -> float:
        """
        Get the duration of an audio file using ffprobe.
        
        Args:
            audio_file: Path to the audio file
            
        Returns:
            Duration in seconds
        """
        try:
            cmd = [
                'ffprobe', '-v', 'quiet', '-show_entries', 'format=duration',
                '-of', 'csv=p=0', audio_file
            ]
            result = subprocess.run(cmd, capture_output=True, text=True, check=True)
            duration = float(result.stdout.strip())
            return duration
        except subprocess.CalledProcessError as e:
            logger.error(f"Failed to get audio duration: {e}")
            raise
        except ValueError as e:
            logger.error(f"Invalid duration value: {e}")
            raise

def main():
    """Main function for command-line usage."""
    parser = argparse.ArgumentParser(description='Stitch processed audio chunks together')
    parser.add_argument('chunk_files', nargs='+', help='List of processed chunk files')
    parser.add_argument('output_file', help='Output audio file path')
    parser.add_argument('--overlap-duration', type=int, default=2,
                       help='Overlap duration in seconds (default: 2)')
    parser.add_argument('--json', action='store_true', 
                       help='Output results in JSON format')
    
    args = parser.parse_args()
    
    # Validate chunk files
    for chunk_file in args.chunk_files:
        if not os.path.exists(chunk_file):
            logger.error(f"Chunk file not found: {chunk_file}")
            sys.exit(1)
    
    # Process audio
    with AudioStitcher(args.overlap_duration) as stitcher:
        try:
            # Stitch chunks together
            final_output = stitcher.stitch_chunks_with_crossfade(args.chunk_files, args.output_file)
            
            # Get final duration
            final_duration = stitcher.get_audio_duration(final_output)
            
            result = {
                'success': True,
                'output_file': final_output,
                'chunks_stitched': len(args.chunk_files),
                'final_duration': final_duration,
                'overlap_duration': args.overlap_duration
            }
            
            if args.json:
                # Only output JSON, no logging to stdout
                sys.stdout.write(json.dumps(result, indent=2))
                sys.stdout.flush()
            else:
                print(f"✅ Successfully stitched audio:")
                print(f"   Output: {result['output_file']}")
                print(f"   Chunks: {result['chunks_stitched']}")
                print(f"   Duration: {result['final_duration']:.2f}s")
                print(f"   Overlap: {result['overlap_duration']}s")
                
        except Exception as e:
            result = {
                'success': False,
                'error': str(e),
                'chunks_stitched': 0
            }
            
            if args.json:
                # Only output JSON, no logging to stdout
                sys.stdout.write(json.dumps(result, indent=2))
                sys.stdout.flush()
            else:
                print(f"❌ Failed to stitch audio: {e}")
                sys.exit(1)

if __name__ == '__main__':
    main()
