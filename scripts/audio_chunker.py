#!/usr/bin/env python3
"""
Audio Chunking and Stitching Script
Efficiently splits long audio files into chunks, processes them, and stitches them back together.
Uses ffmpeg for memory-efficient audio processing.
"""

import os
import sys
import json
import argparse
import subprocess
import tempfile
import shutil
from pathlib import Path
from typing import List, Dict, Tuple
import logging

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class AudioChunker:
    def __init__(self, chunk_duration: int = 90, overlap_duration: int = 2):
        """
        Initialize the audio chunker.
        
        Args:
            chunk_duration: Duration of each chunk in seconds (default: 90)
            overlap_duration: Overlap between chunks in seconds (default: 2)
        """
        self.chunk_duration = chunk_duration
        self.overlap_duration = overlap_duration
        self.temp_dir = None
        
    def __enter__(self):
        """Create temporary directory for processing."""
        self.temp_dir = tempfile.mkdtemp(prefix="audio_chunker_")
        logger.info(f"Created temporary directory: {self.temp_dir}")
        return self
        
    def __exit__(self, exc_type, exc_val, exc_tb):
        """Clean up temporary directory only on error."""
        if exc_type is not None and self.temp_dir and os.path.exists(self.temp_dir):
            shutil.rmtree(self.temp_dir)
            logger.info("Cleaned up temporary directory due to error")
        # Don't clean up on success - let the calling code handle cleanup
    
    def cleanup(self):
        """Manually clean up temporary directory."""
        if self.temp_dir and os.path.exists(self.temp_dir):
            shutil.rmtree(self.temp_dir)
            logger.info("Manually cleaned up temporary directory")
    
    def get_audio_duration(self, input_file: str) -> float:
        """
        Get the duration of an audio file using ffprobe.
        
        Args:
            input_file: Path to the input audio file
            
        Returns:
            Duration in seconds
        """
        try:
            cmd = [
                'ffprobe', '-v', 'quiet', '-show_entries', 'format=duration',
                '-of', 'csv=p=0', input_file
            ]
            result = subprocess.run(cmd, capture_output=True, text=True, check=True)
            duration = float(result.stdout.strip())
            logger.info(f"Audio duration: {duration:.2f} seconds")
            return duration
        except subprocess.CalledProcessError as e:
            logger.error(f"Failed to get audio duration: {e}")
            raise
        except ValueError as e:
            logger.error(f"Invalid duration value: {e}")
            raise
    
    def split_audio_into_chunks(self, input_file: str) -> List[Dict]:
        """
        Split audio file into chunks using ffmpeg.
        
        Args:
            input_file: Path to the input audio file
            
        Returns:
            List of chunk information dictionaries
        """
        try:
            duration = self.get_audio_duration(input_file)
            
            # Calculate chunk parameters
            chunks = []
            start_time = 0
            chunk_id = 0
            
            while start_time < duration:
                end_time = min(start_time + self.chunk_duration, duration)
                actual_duration = end_time - start_time
                
                chunk_info = {
                    'id': f'chunk_{chunk_id:03d}',
                    'start_time': start_time,
                    'end_time': end_time,
                    'duration': actual_duration,
                    'filename': f'chunk_{chunk_id:03d}_{start_time:.0f}_{end_time:.0f}.wav'
                }
                chunks.append(chunk_info)
                
                # Move to next chunk with overlap - ensure we always progress forward
                start_time = end_time - self.overlap_duration
                if start_time <= chunk_info['start_time']:  # Prevent infinite loop
                    start_time = end_time
                chunk_id += 1
            
            logger.info(f"Split audio into {len(chunks)} chunks")
            
            # Create chunks using ffmpeg
            for chunk in chunks:
                output_path = os.path.join(self.temp_dir, chunk['filename'])
                
                cmd = [
                    'ffmpeg', '-y',  # Overwrite output files
                    '-i', input_file,
                    '-ss', str(chunk['start_time']),  # Start time
                    '-t', str(chunk['duration']),     # Duration
                    '-c', 'copy',                     # Copy codec (no re-encoding)
                    output_path
                ]
                
                logger.info(f"Creating chunk: {chunk['id']} ({chunk['start_time']:.1f}s - {chunk['end_time']:.1f}s)")
                logger.info(f"FFmpeg command: {' '.join(cmd)}")
                
                try:
                    result = subprocess.run(cmd, check=True, capture_output=True, text=True, timeout=30)
                    logger.info(f"Chunk {chunk['id']} created successfully")
                except subprocess.CalledProcessError as e:
                    logger.error(f"FFmpeg failed for chunk {chunk['id']}: {e}")
                    logger.error(f"FFmpeg stderr: {e.stderr}")
                    raise
                except subprocess.TimeoutExpired:
                    logger.error(f"FFmpeg timed out for chunk {chunk['id']}")
                    raise Exception(f"FFmpeg timed out for chunk {chunk['id']}")
                
                # Update chunk info with file path
                chunk['file_path'] = output_path
            
            return chunks
            
        except Exception as e:
            logger.error(f"Failed to split audio: {e}")
            raise
    
    def stitch_chunks_with_crossfade(self, chunk_files: List[str], output_file: str) -> str:
        """
        Stitch processed chunks together with crossfading using ffmpeg.
        
        Args:
            chunk_files: List of paths to processed chunk files
            output_file: Path for the output file
            
        Returns:
            Path to the output file
        """
        try:
            if len(chunk_files) == 1:
                # Only one chunk, just copy it
                shutil.copy2(chunk_files[0], output_file)
                logger.info("Single chunk, copied directly")
                return output_file
            
            # Create a filter complex for crossfading
            filter_complex = self._create_crossfade_filter(len(chunk_files))
            
            # Build ffmpeg command
            cmd = ['ffmpeg', '-y']
            
            # Add input files
            for chunk_file in chunk_files:
                cmd.extend(['-i', chunk_file])
            
            # Add filter complex and output
            cmd.extend([
                '-filter_complex', filter_complex,
                '-c:a', 'pcm_s16le',  # WAV format
                output_file
            ])
            
            logger.info("Stitching chunks with crossfading...")
            subprocess.run(cmd, check=True, capture_output=True)
            
            logger.info(f"Successfully stitched chunks to: {output_file}")
            return output_file
            
        except Exception as e:
            logger.error(f"Failed to stitch chunks: {e}")
            raise
    
    def _create_crossfade_filter(self, num_chunks: int) -> str:
        """
        Create a filter complex string for crossfading multiple audio chunks.
        
        Args:
            num_chunks: Number of chunks to stitch
            
        Returns:
            Filter complex string for ffmpeg
        """
        if num_chunks == 1:
            return "[0]aformat=sample_fmts=s16:sample_rates=44100:channel_layouts=stereo[out]"
        
        # Calculate crossfade duration in samples (assuming 44.1kHz)
        sample_rate = 44100
        crossfade_samples = int(self.overlap_duration * sample_rate)
        
        filters = []
        inputs = []
        
        for i in range(num_chunks):
            inputs.append(f"[{i}]")
        
        # Start with first chunk
        filters.append(f"{inputs[0]}aformat=sample_fmts=s16:sample_rates=44100:channel_layouts=stereo[chunk0]")
        
        # Process subsequent chunks with crossfading
        for i in range(1, num_chunks):
            prev_chunk = f"[chunk{i-1}]"
            curr_chunk = f"{inputs[i]}aformat=sample_fmts=s16:sample_rates=44100:channel_layouts=stereo"
            
            # Create crossfade filter
            filter_str = (
                f"{prev_chunk}{curr_chunk}acrossfade=d={self.overlap_duration}:"
                f"c1=tri:c2=tri[chunk{i}]"
            )
            filters.append(filter_str)
        
        # Final output
        filters.append(f"[chunk{num_chunks-1}]aformat=sample_fmts=s16:sample_rates=44100:channel_layouts=stereo[out]")
        
        return ";".join(filters)
    
    def process_audio_chunks(self, input_file: str, output_file: str) -> Dict:
        """
        Main method to process audio chunks.
        
        Args:
            input_file: Path to input audio file
            output_file: Path for output file (not used for chunking, just for compatibility)
            
        Returns:
            Dictionary with processing results
        """
        try:
            logger.info(f"Starting audio chunking process for: {input_file}")
            
            # Split audio into chunks
            chunks = self.split_audio_into_chunks(input_file)
            
            # We only need the chunks for voice transfer processing
            # The stitching will be done separately after processing
            result = {
                'success': True,
                'input_file': input_file,
                'chunks_processed': len(chunks),
                'chunks': [
                    {
                        'id': chunk['id'],
                        'start_time': chunk['start_time'],
                        'end_time': chunk['end_time'],
                        'duration': chunk['duration'],
                        'file_path': chunk['file_path']  # Include the actual file path
                    }
                    for chunk in chunks
                ]
            }
            
            logger.info("Audio chunking process completed successfully")
            return result
            
        except Exception as e:
            logger.error(f"Audio chunking process failed: {e}")
            return {
                'success': False,
                'error': str(e),
                'input_file': input_file
            }

def main():
    """Main function for command-line usage."""
    parser = argparse.ArgumentParser(description='Split and stitch audio files efficiently')
    parser.add_argument('input_file', help='Input audio file path')
    parser.add_argument('output_file', help='Output audio file path')
    parser.add_argument('--chunk-duration', type=int, default=90, 
                       help='Chunk duration in seconds (default: 90)')
    parser.add_argument('--overlap-duration', type=int, default=2,
                       help='Overlap duration in seconds (default: 2)')
    parser.add_argument('--json', action='store_true', 
                       help='Output results in JSON format')
    
    args = parser.parse_args()
    
    # Validate input file
    if not os.path.exists(args.input_file):
        logger.error(f"Input file not found: {args.input_file}")
        sys.exit(1)
    
    # Process audio
    chunker = AudioChunker(args.chunk_duration, args.overlap_duration)
    try:
        chunker.__enter__()
        result = chunker.process_audio_chunks(args.input_file, args.output_file)
        
        if args.json:
            print(json.dumps(result, indent=2))
        else:
            if result['success']:
                print(f"✅ Successfully processed audio:")
                print(f"   Input: {result['input_file']}")
                print(f"   Chunks: {result['chunks_processed']}")
            else:
                print(f"❌ Failed to process audio: {result['error']}")
                sys.exit(1)
    finally:
        # Don't clean up - let the calling code handle it
        pass

if __name__ == '__main__':
    main()
