#!/usr/bin/env python3
"""
Simple test for Python Whisper word-level timestamps
"""

import sys
import json
import whisper

def test_word_timestamps(audio_file_path: str):
    """Simple test of word_timestamps=True"""
    print(f"🎯 Testing Whisper word-level timestamps on: {audio_file_path}")
    
    try:
        # Load tiny model for speed
        print("📥 Loading Whisper tiny model...")
        model = whisper.load_model("tiny")
        print("✅ Model loaded successfully")
        
        # Test word_timestamps=True
        print("\n🔧 Testing with word_timestamps=True...")
        result = model.transcribe(
            audio_file_path,
            language="en",
            temperature=0.0,
            word_timestamps=True
        )
        
        print("✅ Transcription succeeded!")
        print(f"   Text: {result.get('text', '')[:100]}...")
        print(f"   Segments: {len(result.get('segments', []))}")
        
        if result.get('segments'):
            first_segment = result['segments'][0]
            print(f"   First segment text: {first_segment.get('text', '')}")
            print(f"   First segment words: {len(first_segment.get('words', []))}")
            
            if first_segment.get('words'):
                print("\n📝 First few words with timestamps:")
                for i, word_info in enumerate(first_segment['words'][:5]):
                    print(f"   {i+1}. '{word_info['word']}' - {word_info['start']:.2f}s to {word_info['end']:.2f}s")
        
        # Save result
        with open('simple_whisper_result.json', 'w') as f:
            json.dump(result, f, indent=2, default=str)
        print("\n💾 Result saved to simple_whisper_result.json")
        
        return True
        
    except Exception as e:
        print(f"❌ Test failed: {e}")
        return False

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python simple_whisper_test.py <audio_file>")
        sys.exit(1)
    
    success = test_word_timestamps(sys.argv[1])
    sys.exit(0 if success else 1)
