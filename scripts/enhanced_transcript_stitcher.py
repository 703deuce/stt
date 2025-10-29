#!/usr/bin/env python3
"""
SIMPLIFIED Enhanced Transcript Stitcher for Single-Pass Diarization Workflow.

This script now works with the corrected workflow where:
1. Diarization runs ONCE on the full audio file
2. Chunks are transcribed WITHOUT diarization
3. This script simply maps the full diarization to chunked transcription

No more complex speaker permutation solving - just simple mapping!
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

class SimplifiedTranscriptStitcher:
    """
    Simplified transcript stitcher that maps full-audio diarization to chunked transcription.
    """
    
    def __init__(self):
        """Initialize the simplified stitcher."""
        self.full_diarization_segments = []
        self.chunks = []
        
    def load_chunks_data(self, chunks_file: str):
        """
        Load chunks and full diarization data from the chunks file.
        
        Args:
            chunks_file: Path to JSON file containing chunks and diarization data
        """
        try:
            with open(chunks_file, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            self.chunks = data.get('chunks', [])
            self.full_diarization_segments = data.get('full_audio_diarization_segments', [])
            
            logger.info(f"✅ Loaded {len(self.chunks)} chunks")
            logger.info(f"✅ Loaded {len(self.full_diarization_segments)} full diarization segments")
            
            # Log sample diarization segments
            if self.full_diarization_segments:
                logger.info("🎭 Sample diarization segments:")
                for i, segment in enumerate(self.full_diarization_segments[:3]):
                    duration = segment.get('end_time', 0) - segment.get('start_time', 0)
                    logger.info(f"  {i+1}. {segment.get('speaker', 'UNKNOWN')}: {segment.get('start_time', 0):.1f}s - {segment.get('end_time', 0):.1f}s ({duration:.1f}s)")
            
        except Exception as e:
            logger.error(f"❌ Failed to load data: {e}")
            raise
    
    def load_individual_chunks(self, chunk_files: List[str]):
        """
        Load individual chunk files (fallback method for old API calls).
        
        Args:
            chunk_files: List of paths to individual chunk JSON files
        """
        try:
            self.chunks = []
            
            for i, chunk_file in enumerate(chunk_files):
                with open(chunk_file, 'r', encoding='utf-8') as f:
                    chunk_data = json.load(f)
                
                # Wrap in chunk structure
                chunk = {
                    'chunk_index': i,
                    'start_time': 0,  # Will be calculated from timestamps
                    'end_time': 0,
                    'transcription_result': chunk_data
                }
                
                self.chunks.append(chunk)
            
            logger.info(f"✅ Loaded {len(self.chunks)} individual chunk files")
            
        except Exception as e:
            logger.error(f"❌ Failed to load individual chunks: {e}")
            raise
    
    def find_speaker_at_time(self, timestamp: float) -> str:
        """
        Find which speaker was talking at a specific timestamp using full diarization.
        
        Args:
            timestamp: Time in seconds
            
        Returns:
            Speaker ID or 'UNKNOWN' if no speaker found
        """
        for segment in self.full_diarization_segments:
            start_time = segment.get('start_time', 0)
            end_time = segment.get('end_time', 0)
            
            if start_time <= timestamp <= end_time:
                return segment.get('speaker', 'UNKNOWN')
        
        # If no exact match, find the closest segment
        if self.full_diarization_segments:
            closest_segment = min(
                self.full_diarization_segments,
                key=lambda s: min(
                    abs(timestamp - s.get('start_time', 0)),
                    abs(timestamp - s.get('end_time', 0))
                )
            )
            return closest_segment.get('speaker', 'UNKNOWN')
        
        return 'UNKNOWN'
    
    def extract_transcription_data(self, transcript_chunk: Dict[str, Any]) -> Dict[str, Any]:
        """
        Extract complete transcription data including text, diarization, and timestamps.
        
        Args:
            transcript_chunk: Transcript data from API
            
        Returns:
            Dictionary with extracted transcription data
        """
        try:
            # Handle different transcript formats
            result = {
                "text": "",
                "diarized_transcript": [],
                "timestamps": [],
                "speaker_count": 0,
                "duration": 0,
                "metadata": {}
            }
            
            # Extract from nested structure if present
            if 'transcription' in transcript_chunk and isinstance(transcript_chunk['transcription'], dict):
                data = transcript_chunk['transcription']
            else:
                data = transcript_chunk
            
            # Extract text
            if 'merged_text' in data:
                result["text"] = str(data['merged_text'])
            elif 'text' in data:
                result["text"] = str(data['text'])
            
            # Extract diarized transcript (speaker segments)
            if 'diarized_transcript' in data and isinstance(data['diarized_transcript'], list):
                result["diarized_transcript"] = data['diarized_transcript']
            
            # Extract timestamps
            if 'timestamps' in data and isinstance(data['timestamps'], list):
                result["timestamps"] = data['timestamps']
            
            # Extract word-level timestamps
            if 'words' in data and isinstance(data['words'], list):
                result["words"] = data['words']
            
            # Extract metadata
            if 'metadata' in data and isinstance(data['metadata'], dict):
                result["metadata"] = data['metadata']
            
            # Extract speaker count
            if 'speaker_count' in data:
                result["speaker_count"] = data['speaker_count']
            
            # Extract duration
            if 'duration' in data:
                result["duration"] = data['duration']
            
            return result
            
        except Exception as e:
            logger.error(f"Failed to extract transcription data: {e}")
                return {
                "text": "",
                "diarized_transcript": [],
                "timestamps": [],
                "speaker_count": 0,
                "duration": 0,
                "metadata": {}
            }
    
    def map_chunk_to_full_diarization(self, chunk: Dict) -> Dict:
        """
        Map a chunk's transcription to the full audio diarization.
        
        Args:
            chunk: Chunk data with transcription results
            
        Returns:
            Updated chunk with speaker mapping
        """
        try:
            chunk_start_time = chunk.get('start_time', 0)
            chunk_end_time = chunk.get('end_time', 0)
            
            logger.info(f"🎯 Mapping chunk {chunk.get('chunk_index', '?')} ({chunk_start_time:.1f}s - {chunk_end_time:.1f}s)")
            
            # Get transcription result
            transcription_result = chunk.get('transcription_result', {})
            if not transcription_result:
                logger.warning(f"⚠️ No transcription result found for chunk {chunk.get('chunk_index', '?')}")
                return chunk
            
            # Extract transcription data
            extracted_data = self.extract_transcription_data(transcription_result)
            
            # Map words to speakers using full diarization
            words = extracted_data.get('words', [])
            mapped_words = []
            
            for word in words:
                word_start = word.get('start', 0)
                word_end = word.get('end', 0)
                word_midpoint = (word_start + word_end) / 2
                
                # Find speaker at word's midpoint time
                speaker = self.find_speaker_at_time(word_midpoint)
                
                mapped_word = {
                    **word,
                    'speaker': speaker
                }
                mapped_words.append(mapped_word)
            
            # Create diarized transcript from mapped words
            diarized_transcript = self.create_diarized_transcript_from_words(mapped_words)
            
            # Update transcription result with mapped data
            updated_transcription = {
                **extracted_data,
                'words': mapped_words,
                'diarized_transcript': diarized_transcript
            }
            
            # Update chunk with mapped transcription
            updated_chunk = {
                **chunk,
                'transcription_result': updated_transcription
            }
            
            logger.info(f"✅ Mapped {len(mapped_words)} words to speakers")
            return updated_chunk
            
        except Exception as e:
            logger.error(f"❌ Failed to map chunk: {e}")
            return chunk
    
    def map_words_to_diarization_segments(self, words: List[Dict], diarization_segments: List[Dict]) -> List[Dict]:
        """
        Map chunked transcription words into full-audio diarization segments.
        
        Args:
            words: List of words from chunked transcription
            diarization_segments: List of speaker segments from full-audio diarization
            
        Returns:
            List of diarized transcript segments with mapped words
        """
        if not words or not diarization_segments:
            return []
        
        # Sort words by timestamp
        words.sort(key=lambda w: w.get('start', 0))
        
        # Create segments with mapped words
        segments = []
        
        for segment in diarization_segments:
            segment_start = segment.get('start_time', 0)
            segment_end = segment.get('end_time', 0)
            speaker = segment.get('speaker', 'UNKNOWN')
            
            # Find words that fall within this segment's time range
            segment_words = []
            for word in words:
                word_start = word.get('start', 0)
                word_end = word.get('end', 0)
                
                # Check if word overlaps with segment (with small tolerance)
                if (word_start < segment_end and word_end > segment_start):
                    segment_words.append(word)
            
            if segment_words:
                # Sort words by timestamp within segment
                segment_words.sort(key=lambda w: w.get('start', 0))
                
                # Create text from words
                segment_text = ' '.join([w.get('word', w.get('text', '')) for w in segment_words])
                
                # Create segment with mapped words
                mapped_segment = {
                    'speaker': speaker,
                    'start_time': segment_start,
                    'end_time': segment_end,
                    'text': segment_text,
                    'words': segment_words
                }
                
                segments.append(mapped_segment)
        
        return segments
    
    def create_diarized_transcript_from_words(self, words: List[Dict]) -> List[Dict]:
        """
        Create diarized transcript segments from mapped words (fallback method).
        
        Args:
            words: List of words with speaker assignments
            
        Returns:
            List of diarized transcript segments
        """
        if not words:
            return []
        
        segments = []
        current_segment = None
        
        for word in words:
            speaker = word.get('speaker', 'UNKNOWN')
            word_text = word.get('word', word.get('text', ''))
            start_time = word.get('start', 0)
            end_time = word.get('end', 0)
            
            if current_segment is None or current_segment['speaker'] != speaker:
                # Start new segment
                if current_segment:
                    segments.append(current_segment)
                
                current_segment = {
                    'speaker': speaker,
                    'start_time': start_time,
                    'end_time': end_time,
                    'text': word_text,
                    'words': [word]
                }
            else:
                # Continue current segment
                current_segment['end_time'] = end_time
                current_segment['text'] += ' ' + word_text
                current_segment['words'].append(word)
        
        # Add final segment
        if current_segment:
            segments.append(current_segment)
        
        return segments
    
    def stitch_chunks(self) -> Dict[str, Any]:
        """
        Stitch all chunks together using full diarization mapping.
        
        Returns:
            Complete stitched transcript with consistent speakers
        """
        logger.info("🧩 Starting simplified stitching with full diarization mapping...")
        
        # Map each chunk to full diarization
        mapped_chunks = []
        all_words = []
        all_diarized_segments = []
        
        for chunk in self.chunks:
            mapped_chunk = self.map_chunk_to_full_diarization(chunk)
            mapped_chunks.append(mapped_chunk)
            
            # Collect words and segments
            transcription_result = mapped_chunk.get('transcription_result', {})
            words = transcription_result.get('words', [])
            diarized_segments = transcription_result.get('diarized_transcript', [])
            
            all_words.extend(words)
            all_diarized_segments.extend(diarized_segments)
        
        # Sort words by timestamp
        all_words.sort(key=lambda w: w.get('start', 0))
        
        # Create final merged text
        merged_text = ' '.join([word.get('word', word.get('text', '')) for word in all_words])
        
        # Create final diarized transcript by mapping words to full-audio diarization segments
        if self.full_audio_diarization_segments and all_words:
            logger.info("🎯 Mapping chunked words to full-audio diarization segments...")
            final_diarized_transcript = self.map_words_to_diarization_segments(all_words, self.full_audio_diarization_segments)
        else:
            logger.warning("⚠️ No full-audio diarization segments available, using word-based segmentation...")
            final_diarized_transcript = self.create_diarized_transcript_from_words(all_words)
        
        # Calculate statistics
        unique_speakers = set(segment.get('speaker', 'UNKNOWN') for segment in final_diarized_transcript)
        total_duration = max([word.get('end', 0) for word in all_words], default=0)
        
        result = {
            'merged_text': merged_text,
            'text': merged_text,
            'diarized_transcript': final_diarized_transcript,
            'timestamps': all_words,
            'speaker_count': len(unique_speakers),
            'word_count': len(all_words),
            'duration': total_duration,
            'diarized_segments': len(final_diarized_transcript),
            'enhanced_stitching': True,
            'processing_method': 'simplified_full_diarization_stitching',
            'metadata': {
                'chunks_processed': len(self.chunks),
                'full_diarization_segments_used': len(self.full_diarization_segments),
                'stitching_method': 'full_diarization_mapping',
                'unique_speakers': list(unique_speakers)
            }
        }
        
        logger.info(f"✅ Stitching complete:")
        logger.info(f"   📝 Words: {result['word_count']}")
        logger.info(f"   👥 Speakers: {result['speaker_count']} ({list(unique_speakers)})")
        logger.info(f"   📋 Segments: {result['diarized_segments']}")
        logger.info(f"   ⏱️ Duration: {result['duration']:.1f}s")
        logger.info(f"   🎯 Method: Full diarization mapping")
        
        return result

def main():
    """Main function to run the simplified stitcher."""
    if len(sys.argv) < 3:
        print("Usage: python enhanced_transcript_stitcher.py <chunks_file_or_chunk1> [chunk2] ... <output_file> [--overlap-duration 30] [--json]")
        print("  For new workflow: python enhanced_transcript_stitcher.py --chunks-file chunks.json --output result.json")
        print("  For old workflow: python enhanced_transcript_stitcher.py chunk1.json chunk2.json result.json --json")
        sys.exit(1)
    
    try:
        logger.info("🚀 Starting SIMPLIFIED Enhanced Transcript Stitcher (Single-Pass Diarization)")
        
        # Initialize stitcher
        stitcher = SimplifiedTranscriptStitcher()
        
        # Check if using new workflow (chunks file) or old workflow (individual files)
        if '--chunks-file' in sys.argv:
            # New workflow: single chunks file with full diarization
            chunks_file_idx = sys.argv.index('--chunks-file') + 1
            output_file_idx = sys.argv.index('--output') + 1
            
            chunks_file = sys.argv[chunks_file_idx]
            output_file = sys.argv[output_file_idx]
            
            logger.info(f"📁 Chunks file: {chunks_file}")
            logger.info(f"📄 Output file: {output_file}")
            
            # Load data
            stitcher.load_chunks_data(chunks_file)
            
        else:
            # Old workflow: individual chunk files (fallback)
            output_file = sys.argv[-1]
            chunk_files = sys.argv[1:-1]
            
            # Remove flags
            chunk_files = [f for f in chunk_files if not f.startswith('--')]
            
            logger.info(f"📁 Chunk files: {chunk_files}")
            logger.info(f"📄 Output file: {output_file}")
            
            # Load individual chunks
            stitcher.load_individual_chunks(chunk_files)
        
        # Stitch chunks
        result = stitcher.stitch_chunks()
        
        # Save result
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(result, f, indent=2, ensure_ascii=False)
        
        logger.info(f"✅ Result saved to: {output_file}")
                    
    except Exception as e:
        logger.error(f"❌ Error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
