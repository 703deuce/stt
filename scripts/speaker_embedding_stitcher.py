#!/usr/bin/env python3
"""
SIMPLIFIED Speaker Embedding Stitcher for Single-Pass Diarization Workflow.

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
import argparse
from pathlib import Path
from typing import Dict, List, Any, Tuple, Optional
import numpy as np

class SimplifiedSpeakerStitcher:
    """
    Simplified stitcher that maps full-audio diarization to chunked transcription.
    """
    
    def __init__(self):
        """Initialize the simplified stitcher."""
        self.full_diarization_segments = []
        self.chunks = []
        
    def load_data(self, chunks_file: str):
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
            
            print(f"✅ Loaded {len(self.chunks)} chunks")
            print(f"✅ Loaded {len(self.full_diarization_segments)} full diarization segments")
            
            # Log sample diarization segments
            if self.full_diarization_segments:
                print("🎭 Sample diarization segments:")
                for i, segment in enumerate(self.full_diarization_segments[:3]):
                    duration = segment.get('end_time', 0) - segment.get('start_time', 0)
                    print(f"  {i+1}. {segment.get('speaker', 'UNKNOWN')}: {segment.get('start_time', 0):.1f}s - {segment.get('end_time', 0):.1f}s ({duration:.1f}s)")
                    
            except Exception as e:
            print(f"❌ Failed to load data: {e}")
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
            
            print(f"🎯 Mapping chunk {chunk.get('chunk_index', '?')} ({chunk_start_time:.1f}s - {chunk_end_time:.1f}s)")
            
            # Get transcription result
            transcription_result = chunk.get('transcription_result', {})
            if not transcription_result:
                print(f"⚠️ No transcription result found for chunk {chunk.get('chunk_index', '?')}")
                return chunk
            
            # Map words to speakers using full diarization
            words = transcription_result.get('words', [])
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
            
            # Update transcription result with mapped words
            updated_transcription = {
                **transcription_result,
                'words': mapped_words
            }
            
            # Create diarized transcript from mapped words
            diarized_transcript = self.create_diarized_transcript_from_words(mapped_words)
            updated_transcription['diarized_transcript'] = diarized_transcript
            
            # Update chunk with mapped transcription
            updated_chunk = {
                **chunk,
                'transcription_result': updated_transcription
            }
            
            print(f"✅ Mapped {len(mapped_words)} words to speakers")
            return updated_chunk
            
        except Exception as e:
            print(f"❌ Failed to map chunk: {e}")
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
        print("🧩 Starting simplified stitching with full diarization mapping...")
        
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
            print("🎯 Mapping chunked words to full-audio diarization segments...")
            final_diarized_transcript = self.map_words_to_diarization_segments(all_words, self.full_audio_diarization_segments)
        else:
            print("⚠️ No full-audio diarization segments available, using word-based segmentation...")
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
            'speaker_embedding_method': 'full_diarization_mapping',
            'processing_method': 'simplified_full_diarization_stitching',
            'metadata': {
                'chunks_processed': len(self.chunks),
                'full_diarization_segments_used': len(self.full_diarization_segments),
                'stitching_method': 'full_diarization_mapping',
                'unique_speakers': list(unique_speakers)
            }
        }
        
        print(f"✅ Stitching complete:")
        print(f"   📝 Words: {result['word_count']}")
        print(f"   👥 Speakers: {result['speaker_count']} ({list(unique_speakers)})")
        print(f"   📋 Segments: {result['diarized_segments']}")
        print(f"   ⏱️ Duration: {result['duration']:.1f}s")
        print(f"   🎯 Method: Full diarization mapping")
        
        return result

def main():
    """Main function to run the simplified stitcher."""
    parser = argparse.ArgumentParser(description='Simplified Speaker Embedding Stitcher')
    parser.add_argument('--chunks-file', required=True, help='Path to chunks data JSON file')
    parser.add_argument('--output', required=True, help='Path to output JSON file')
    parser.add_argument('--threshold', type=float, default=0.45, help='Similarity threshold (not used in simplified version)')
    parser.add_argument('--model', default='pyannote/embedding', help='Model name (not used in simplified version)')
    
    args = parser.parse_args()
    
    try:
        print("🚀 Starting SIMPLIFIED Speaker Stitcher (Single-Pass Diarization)")
        print(f"📁 Chunks file: {args.chunks_file}")
        print(f"📄 Output file: {args.output}")
        
        # Initialize stitcher
        stitcher = SimplifiedSpeakerStitcher()
        
        # Load data
        stitcher.load_data(args.chunks_file)
        
        # Stitch chunks
        result = stitcher.stitch_chunks()
        
        # Save result
        with open(args.output, 'w', encoding='utf-8') as f:
            json.dump(result, f, indent=2, ensure_ascii=False)
        
        print(f"✅ Result saved to: {args.output}")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
