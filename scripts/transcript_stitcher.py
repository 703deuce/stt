#!/usr/bin/env python3
"""
Transcript stitching script that combines multiple transcript chunks into a final document.
Handles overlap removal, speaker continuity, and formatting preservation.
"""

import sys
import os
import json
import tempfile
import logging
import re
from pathlib import Path
from typing import List, Dict, Any, Optional

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class TranscriptStitcher:
    def __init__(self, overlap_duration: int = 30):
        """
        Initialize the Transcript Stitcher.
        
        Args:
            overlap_duration: Overlap duration in seconds between chunks
        """
        self.overlap_duration = overlap_duration
        self.temp_dir = None
        
    def __enter__(self):
        self.temp_dir = tempfile.mkdtemp(prefix="transcript_stitching_")
        logger.info(f"Created temporary directory: {self.temp_dir}")
        return self
        
    def __exit__(self, exc_type, exc_val, exc_tb):
        # Clean up temporary directory
        if self.temp_dir and os.path.exists(self.temp_dir):
            import shutil
            shutil.rmtree(self.temp_dir)
            logger.info("Cleaned up temporary directory")
    
    def extract_text_from_transcript(self, transcript_data: Dict[str, Any]) -> str:
        """
        Extract plain text from transcript data, handling various formats.
        
        Args:
            transcript_data: Transcript data from API
            
        Returns:
            Plain text string
        """
        try:
            # Handle different transcript formats
            if isinstance(transcript_data, dict):
                # Check for nested transcription object first
                if 'transcription' in transcript_data and isinstance(transcript_data['transcription'], dict):
                    transcription_obj = transcript_data['transcription']
                    if 'text' in transcription_obj:
                        return str(transcription_obj['text'])
                
                # Check for direct text fields
                if 'text' in transcript_data:
                    return str(transcript_data['text'])
                elif 'transcript' in transcript_data:
                    if isinstance(transcript_data['transcript'], dict) and 'text' in transcript_data['transcript']:
                        return str(transcript_data['transcript']['text'])
                    return str(transcript_data['transcript'])
                elif 'content' in transcript_data:
                    return str(transcript_data['content'])
                elif 'result' in transcript_data:
                    return self.extract_text_from_transcript(transcript_data['result'])
                else:
                    # If it's a dict with unknown structure, try to find any text field
                    for key, value in transcript_data.items():
                        if 'text' in key.lower() and isinstance(value, str):
                            return value
                    
                    logger.warning(f"Unknown transcript format, keys: {list(transcript_data.keys())}")
                    return str(transcript_data)
            elif isinstance(transcript_data, str):
                return transcript_data
            else:
                return str(transcript_data)
                
        except Exception as e:
            logger.error(f"Failed to extract text from transcript: {e}")
            return str(transcript_data)
    
    def clean_transcript_text(self, text: str) -> str:
        """
        Clean and normalize transcript text.
        
        Args:
            text: Raw transcript text
            
        Returns:
            Cleaned text
        """
        if not text or not isinstance(text, str):
            return ""
        
        # Remove extra whitespace
        text = re.sub(r'\s+', ' ', text.strip())
        
        # Ensure sentences end with proper punctuation
        text = re.sub(r'([.!?])\s*', r'\1 ', text)
        
        # Remove trailing incomplete sentences at chunk boundaries
        # (these will be completed in the next chunk)
        text = text.strip()
        
        return text
    
    def detect_overlap_boundary(self, chunk1_text: str, chunk2_text: str, 
                              overlap_duration: int = 30) -> Optional[int]:
        """
        Detect where chunks overlap by finding similar text patterns.
        
        Args:
            chunk1_text: Text from first chunk
            chunk2_text: Text from second chunk
            overlap_duration: Expected overlap duration in seconds
            
        Returns:
            Position in chunk2_text where overlap ends, or None if not found
        """
        try:
            # For transcript overlap, we'll use a simple approach:
            # Look for the last complete sentence in chunk1 that appears at the start of chunk2
            
            # Get the last few sentences from chunk1
            chunk1_sentences = re.split(r'[.!?]+', chunk1_text)
            chunk1_sentences = [s.strip() for s in chunk1_sentences if s.strip()]
            
            if len(chunk1_sentences) < 2:
                return None
            
            # Get the last 1-3 sentences from chunk1
            search_sentences = chunk1_sentences[-3:] if len(chunk1_sentences) >= 3 else chunk1_sentences[-2:]
            search_text = ' '.join(search_sentences).strip()
            
            # Look for this text at the beginning of chunk2
            chunk2_start = chunk2_text[:len(search_text) + 100]  # Search in first part of chunk2
            
            # Find overlap using fuzzy matching
            for i, sentence in enumerate(search_sentences):
                if sentence in chunk2_start:
                    # Found overlap, find where it ends in chunk2
                    overlap_end = chunk2_text.find(sentence) + len(sentence)
                    logger.info(f"Found transcript overlap ending at position {overlap_end} in chunk 2")
                    return overlap_end
            
            # If no exact match, estimate based on text length and overlap duration
            # Rough estimate: 150 words per minute, 3 chars per word = 450 chars per minute
            estimated_overlap_chars = overlap_duration * 7.5  # ~7.5 chars per second
            estimated_position = min(int(estimated_overlap_chars), len(chunk2_text) // 4)
            
            logger.info(f"No exact overlap found, using estimated position: {estimated_position}")
            return estimated_position
            
        except Exception as e:
            logger.warning(f"Failed to detect overlap boundary: {e}")
            return None
    
    def stitch_transcript_chunks(self, chunk_transcripts: List[Dict[str, Any]], 
                               output_file: str) -> Dict[str, Any]:
        """
        Stitch multiple transcript chunks into a single document.
        
        Args:
            chunk_transcripts: List of transcript data for each chunk
            output_file: Path for the output file
            
        Returns:
            Dictionary containing stitch results
        """
        try:
            if len(chunk_transcripts) == 0:
                raise Exception("No transcript chunks provided")
            
            if len(chunk_transcripts) == 1:
                # Only one chunk, just save it
                text = self.extract_text_from_transcript(chunk_transcripts[0])
                cleaned_text = self.clean_transcript_text(text)
                
                with open(output_file, 'w', encoding='utf-8') as f:
                    f.write(cleaned_text)
                
                logger.info("Single transcript chunk, saved directly")
                return {
                    "success": True,
                    "output_file": output_file,
                    "chunks_stitched": 1,
                    "total_length": len(cleaned_text),
                    "method": "single_chunk"
                }
            
            # Stitch multiple chunks
            logger.info(f"Stitching {len(chunk_transcripts)} transcript chunks...")
            
            stitched_text = ""
            total_overlap_removed = 0
            
            for i, chunk_transcript in enumerate(chunk_transcripts):
                logger.info(f"Processing transcript chunk {i+1}/{len(chunk_transcripts)}")
                
                # Extract text from current chunk
                chunk_text = self.extract_text_from_transcript(chunk_transcript)
                chunk_text = self.clean_transcript_text(chunk_text)
                
                if i == 0:
                    # First chunk: use entire text
                    stitched_text = chunk_text
                    logger.info(f"Added first chunk: {len(chunk_text)} characters")
                else:
                    # Subsequent chunks: remove overlap
                    previous_text = self.extract_text_from_transcript(chunk_transcripts[i-1])
                    previous_text = self.clean_transcript_text(previous_text)
                    
                    # Detect and remove overlap
                    overlap_end = self.detect_overlap_boundary(
                        previous_text, chunk_text, self.overlap_duration
                    )
                    
                    if overlap_end is not None:
                        # Remove overlap from current chunk
                        chunk_text_trimmed = chunk_text[overlap_end:].strip()
                        overlap_removed = overlap_end
                        total_overlap_removed += overlap_removed
                        
                        logger.info(f"Removed {overlap_removed} characters of overlap from chunk {i+1}")
                    else:
                        # No overlap detected, use full chunk with separator
                        chunk_text_trimmed = chunk_text
                        logger.info(f"No overlap detected for chunk {i+1}, using full text")
                    
                    # Add to stitched text with proper spacing
                    if stitched_text and chunk_text_trimmed:
                        # Ensure proper sentence separation
                        if not stitched_text.endswith(('.', '!', '?')):
                            stitched_text += '. '
                        else:
                            stitched_text += ' '
                        
                        stitched_text += chunk_text_trimmed
                    
                    logger.info(f"Added chunk {i+1}: {len(chunk_text_trimmed)} characters")
            
            # Final cleanup
            final_text = self.clean_transcript_text(stitched_text)
            
            # Write to output file
            with open(output_file, 'w', encoding='utf-8') as f:
                f.write(final_text)
            
            # Calculate statistics
            word_count = len(final_text.split())
            estimated_reading_time = word_count / 200  # ~200 words per minute reading
            
            logger.info(f"Successfully stitched transcript to: {output_file}")
            logger.info(f"Final transcript: {len(final_text)} characters, {word_count} words")
            
            return {
                "success": True,
                "output_file": output_file,
                "chunks_stitched": len(chunk_transcripts),
                "total_length": len(final_text),
                "word_count": word_count,
                "overlap_characters_removed": total_overlap_removed,
                "estimated_reading_time_minutes": estimated_reading_time,
                "method": "overlap_aware_stitching"
            }
            
        except Exception as e:
            logger.error(f"Failed to stitch transcript chunks: {e}")
            raise
    
    def stitch_transcript_chunks_from_files(self, chunk_files: List[str], 
                                          output_file: str) -> Dict[str, Any]:
        """
        Stitch transcript chunks from JSON files.
        
        Args:
            chunk_files: List of paths to transcript JSON files
            output_file: Path for the output file
            
        Returns:
            Dictionary containing stitch results
        """
        try:
            chunk_transcripts = []
            
            for chunk_file in chunk_files:
                logger.info(f"Loading transcript from: {chunk_file}")
                
                try:
                    with open(chunk_file, 'r', encoding='utf-8') as f:
                        chunk_data = json.load(f)
                    chunk_transcripts.append(chunk_data)
                except Exception as e:
                    logger.error(f"Failed to load chunk file {chunk_file}: {e}")
                    # Continue with other chunks
                    continue
            
            if not chunk_transcripts:
                raise Exception("No valid transcript chunks loaded")
            
            return self.stitch_transcript_chunks(chunk_transcripts, output_file)
            
        except Exception as e:
            logger.error(f"Failed to stitch transcript chunks from files: {e}")
            raise

def main():
    """Main function for command-line usage."""
    import argparse
    
    parser = argparse.ArgumentParser(description='Stitch transcript chunks together')
    parser.add_argument('chunk_files', nargs='+', help='List of transcript chunk JSON files')
    parser.add_argument('output_file', help='Output transcript file path')
    parser.add_argument('--overlap-duration', type=int, default=30,
                       help='Overlap duration in seconds (default: 30)')
    parser.add_argument('--json', action='store_true', 
                       help='Output results in JSON format')
    
    args = parser.parse_args()
    
    # Separate chunk files from output file
    chunk_files = args.chunk_files[:-1]  # All but last
    output_file = args.chunk_files[-1]   # Last argument is output file
    
    if args.output_file:
        output_file = args.output_file
    
    try:
        stitcher = TranscriptStitcher(args.overlap_duration)
        with stitcher:
            result = stitcher.stitch_transcript_chunks_from_files(chunk_files, output_file)
            
            if args.json:
                print(json.dumps(result, indent=2))
            else:
                if result['success']:
                    print(f"✅ Successfully stitched transcript:")
                    print(f"   Output: {result['output_file']}")
                    print(f"   Chunks: {result['chunks_stitched']}")
                    print(f"   Length: {result['total_length']} characters")
                    print(f"   Words: {result['word_count']}")
                    print(f"   Reading time: ~{result['estimated_reading_time_minutes']:.1f} minutes")
                else:
                    print(f"❌ Failed to stitch transcript: {result.get('error')}")
                    sys.exit(1)
                    
    except Exception as e:
        if args.json:
            result = {
                "success": False,
                "error": str(e)
            }
            print(json.dumps(result, indent=2))
        else:
            print(f"❌ Error: {e}")
        sys.exit(1)

if __name__ == '__main__':
    main()
