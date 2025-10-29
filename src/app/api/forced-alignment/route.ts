import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { spawn } from 'child_process';

// Python Whisper subprocess function
async function runPythonWhisperSubprocess(audioFilePath: string, chunkId: string): Promise<any> {
  return new Promise((resolve, reject) => {
    console.log(`🐍 Starting Python Whisper subprocess for ${chunkId}...`);
    
    // Create Python script using whisper-timestamped for word-level timestamps
    const pythonScript = `
import sys
import json

try:
    # Use latest OpenAI Whisper with word_timestamps=True parameter
    import whisper
    print("🔄 Using latest OpenAI Whisper with word_timestamps=True...", file=sys.stderr)
    
    model = whisper.load_model("tiny")
    result = model.transcribe("${audioFilePath.replace(/\\/g, '\\\\')}", 
                             language="en",
                             temperature=0.0,
                             word_timestamps=True)  # This now works with latest version!
    
    print(f"🎯 Transcription complete with {len(result.get('segments', []))} segments", file=sys.stderr)
    
    # Process segments with REAL word-level timestamps
    segments_with_words = []
    total_words = 0
    
    for segment in result.get("segments", []):
        segment_data = {
            "text": segment.get("text", ""),
            "start": segment.get("start", 0),
            "end": segment.get("end", 0),
            "words": []
        }
        
        # Extract REAL word-level timestamps from latest Whisper
        if "words" in segment and segment["words"]:
            for word_info in segment["words"]:
                segment_data["words"].append({
                    "word": word_info.get("word", ""),
                    "start": word_info.get("start", 0),
                    "end": word_info.get("end", 0),
                    "confidence": word_info.get("probability", 0.9),  # Real confidence from Whisper
                    "estimated": False  # These are REAL word timestamps!
                })
                total_words += 1
        else:
            # Fallback estimation if words not available
            if segment.get("text"):
                words = segment["text"].strip().split()
                segment_duration = (segment.get("end", 0) - segment.get("start", 0))
                if len(words) > 0 and segment_duration > 0:
                    avg_word_duration = segment_duration / len(words)
                    
                    for i, word in enumerate(words):
                        word_start = segment.get("start", 0) + (i * avg_word_duration)
                        word_end = segment.get("start", 0) + ((i + 1) * avg_word_duration)
                        
                        segment_data["words"].append({
                            "word": word,
                            "start": word_start,
                            "end": word_end,
                            "confidence": 0.7,
                            "estimated": True
                        })
                        total_words += 1
        
        segments_with_words.append(segment_data)
    
    print(f"✅ Extracted {total_words} word timestamps successfully", file=sys.stderr)
    
    output = {
        "text": result.get("text", ""),
        "json": {
            "text": result.get("text", ""),
            "segments": segments_with_words,
            "language": result.get("language", "en")
        }
    }
    
    print(json.dumps(output))
    
except Exception as e:
    print(f"❌ Python Whisper error: {e}", file=sys.stderr)
    sys.exit(1)
`;

    const pythonProcess = spawn('python', ['-c', pythonScript], {
      stdio: ['pipe', 'pipe', 'pipe']
    });
    
    let stdout = '';
    let stderr = '';
    
    pythonProcess.stdout.on('data', (data) => {
      stdout += data.toString();
    });
    
    pythonProcess.stderr.on('data', (data) => {
      stderr += data.toString();
    });
    
    pythonProcess.on('close', (code) => {
      if (stderr) console.log(`🐍 Python subprocess stderr for ${chunkId}:`, stderr);
      
      if (code === 0 && stdout.trim()) {
        try {
          const result = JSON.parse(stdout.trim());
          console.log(`✅ Python Whisper subprocess completed for ${chunkId}`);
          resolve(result);
        } catch (parseError) {
          reject(new Error(`Failed to parse Python Whisper output: ${parseError.message}`));
        }
      } else {
        reject(new Error(`Python Whisper subprocess failed with code ${code}: ${stderr}`));
      }
    });
    
    pythonProcess.on('error', (error) => {
      reject(new Error(`Failed to start Python subprocess: ${error.message}`));
    });
  });
}

export async function POST(request: NextRequest) {
  try {
    const { audioBase64, contextText, expectedText, chunkId } = await request.json();
    
    if (!audioBase64 || !expectedText || !chunkId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Missing required parameters: audioBase64, expectedText, chunkId' 
      }, { status: 400 });
    }

    console.log(`🎯 FORCED ALIGNMENT for ${chunkId}: Finding word boundaries...`);
    const startTime = Date.now();

    // Create temp directory and file
    const tempDir = path.join(os.tmpdir(), 'tts-alignment');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    const tempFilePath = path.join(tempDir, `${chunkId}_alignment_${Date.now()}.wav`);
    
    let alignmentResult;
    try {
      // Save audio to temp file
      const audioBuffer = Buffer.from(audioBase64, 'base64');
      fs.writeFileSync(tempFilePath, audioBuffer);
      
      console.log(`🎙️ Running Whisper alignment on ${chunkId} (${audioBuffer.length} bytes)...`);
      
      // Use Python Whisper subprocess for reliable word-level timestamps
      console.log(`🐍 Using Python Whisper subprocess for ${chunkId}...`);
      
      const transcriptionData = await runPythonWhisperSubprocess(tempFilePath, chunkId);
      const wordTimestampsAttempted = true;

      console.log(`🔍 Python Whisper alignment output for ${chunkId}:`, {
        hasText: !!transcriptionData.text,
        hasJson: !!transcriptionData.json,
        hasSegments: !!(transcriptionData.json && typeof transcriptionData.json === 'object' && transcriptionData.json.segments),
        hasRealWordTimestamps: !!(transcriptionData.json?.segments?.some((s: any) => s.words)),
        keys: Object.keys(transcriptionData),
        type: typeof transcriptionData
      });

      let transcribedText = '';
      let wordTimestamps: any[] = [];
      let segments: any[] = [];
      
      try {
        // Parse transcription data
        if (transcriptionData.text) {
          transcribedText = transcriptionData.text.trim();
        }

        if (transcriptionData.json) {
          let jsonData;
          if (typeof transcriptionData.json === 'string') {
            jsonData = JSON.parse(transcriptionData.json);
          } else {
            jsonData = transcriptionData.json;
          }
          
          if (jsonData.text) {
            transcribedText = jsonData.text.trim();
          }

          if (jsonData.segments) {
            segments = jsonData.segments;
            
            // Enhanced word-level timestamp extraction
            for (const segment of segments) {
              console.log(`📝 Processing segment for ${chunkId}:`, {
                hasWords: !!segment.words,
                wordsIsArray: Array.isArray(segment.words),
                wordsLength: segment.words ? segment.words.length : 0,
                segmentText: segment.text?.substring(0, 50) + '...',
                segmentStart: segment.start,
                segmentEnd: segment.end,
                wordTimestampsSupported: wordTimestampsAttempted
              });
              
              if (segment.words && Array.isArray(segment.words)) {
                // BEST CASE: Real word-level timestamps available
                for (const word of segment.words) {
                  wordTimestamps.push({
                    word: word.word || word.text || '',
                    start: word.start || 0,
                    end: word.end || 0,
                    confidence: word.confidence || word.prob || word.probability || 0.5
                  });
                }
                console.log(`✅ Found ${segment.words.length} word timestamps in segment for ${chunkId}`);
              } else if (segment.text) {
                // FALLBACK: Estimate word positions within segment
                const words = segment.text.trim().split(/\s+/);
                const segmentDuration = (segment.end || 0) - (segment.start || 0);
                const avgWordDuration = segmentDuration / words.length;
                
                console.log(`📊 Estimating ${words.length} word positions in ${segmentDuration.toFixed(2)}s segment`);
                
                words.forEach((word, index) => {
                  wordTimestamps.push({
                    word: word,
                    start: (segment.start || 0) + (index * avgWordDuration),
                    end: (segment.start || 0) + ((index + 1) * avgWordDuration),
                    confidence: segment.confidence || 0.5,
                    estimated: true  // Mark as estimated
                  });
                });
              }
            }
          }
        }
      } catch (parseError) {
        console.warn(`⚠️ Failed to parse Whisper alignment data for ${chunkId}:`, parseError);
        transcribedText = String(transcriptionData).trim();
      }

      // Find exact context boundary using word-level timestamps
      let contextEndTime = 0;
      if (contextText && contextText.trim() && wordTimestamps.length > 0) {
        const contextWords = contextText.trim().toLowerCase().split(/\s+/).filter(w => w.length > 0);
        const alignedWords = wordTimestamps.map(w => ({
          ...w,
          word: w.word.toLowerCase().replace(/[^\w]/g, '')
        }));

        console.log(`🔍 Finding exact context boundary for "${contextText}"`);
        console.log(`🎯 Context words (${contextWords.length}):`, contextWords);
        console.log(`🎙️ Transcribed words (${alignedWords.length}):`, alignedWords.slice(0, 10).map(w => `${w.word}(${w.start.toFixed(2)}s)`));

        // Find the exact end of the context text by matching the last context word
        const lastContextWord = contextWords[contextWords.length - 1];
        let contextEndIndex = -1;
        
        // Search backwards through transcribed words to find the last context word
        for (let i = alignedWords.length - 1; i >= 0; i--) {
          const transcribedWord = alignedWords[i].word;
          if (lastContextWord === transcribedWord || transcribedWord.includes(lastContextWord) || lastContextWord.includes(transcribedWord)) {
            // Use the END time of the word (when it finishes speaking)
            contextEndTime = alignedWords[i].end;
            contextEndIndex = i;
            console.log(`🎯 Found last context word "${lastContextWord}" ends at ${contextEndTime.toFixed(3)}s (word ${i})`);
            console.log(`🎯 Word timing: starts at ${alignedWords[i].start.toFixed(3)}s, ends at ${alignedWords[i].end.toFixed(3)}s`);
            break;
          }
        }
        
        // If we found the last word, verify we have enough context words matched
        if (contextEndIndex >= 0) {
          let matchedContextWords = 0;
          let contextWordIndex = contextWords.length - 1;
          
          // Count backwards to see how many context words we matched
          for (let i = contextEndIndex; i >= 0 && contextWordIndex >= 0; i--) {
            const transcribedWord = alignedWords[i].word;
            const contextWord = contextWords[contextWordIndex];
            
            if (contextWord === transcribedWord || transcribedWord.includes(contextWord) || contextWord.includes(transcribedWord)) {
              matchedContextWords++;
              contextWordIndex--;
            } else {
              break;
            }
          }
          
          console.log(`✅ Context matching: ${matchedContextWords}/${contextWords.length} words matched`);
          
          // If we matched at least half the context words, use this timestamp
          if (matchedContextWords >= Math.ceil(contextWords.length / 2)) {
            console.log(`🎯 Using word-level timestamp: context ends at ${contextEndTime.toFixed(3)}s`);
          } else {
            console.warn(`⚠️ Insufficient context word matches (${matchedContextWords}/${contextWords.length}), falling back to estimation`);
            contextEndTime = 0; // Fall back to estimation
          }
        } else {
          console.warn(`⚠️ Could not find last context word "${lastContextWord}" in transcription`);
        }
      }
      
      // Fallback to estimation if word-level matching failed
      if (contextEndTime === 0 && contextText && contextText.trim()) {
        console.log(`📊 Falling back to estimation-based context boundary detection`);
        const contextWords = contextText.trim().toLowerCase().split(/\s+/).filter(w => w.length > 0);
        const totalWords = wordTimestamps.length;
        const totalDuration = Math.max(...wordTimestamps.map(w => w.end));
        
        // Estimate context duration based on word ratio
        const wordRatio = Math.min(contextWords.length / totalWords, 0.6); // Max 60% of audio
        contextEndTime = totalDuration * wordRatio;
        
        console.log(`📊 Estimation fallback:`, {
          contextWords: contextWords.length,
          totalWords,
          wordRatio: (wordRatio * 100).toFixed(1) + '%',
          estimatedEndTime: contextEndTime.toFixed(3) + 's',
          totalDuration: totalDuration.toFixed(3) + 's'
        });
      }

      const processingTime = Date.now() - startTime;

      alignmentResult = {
        transcribedText,
        wordTimestamps,
        segments,
        contextEndTime,
        processingTime,
        alignment: {
          totalWords: wordTimestamps.length,
          contextWords: contextText ? contextText.split(/\s+/).length : 0,
          contextEndTime,
          trimRecommendation: contextEndTime > 0 ? `Trim first ${contextEndTime.toFixed(3)}s` : 'No trimming needed'
        }
      };

      console.log(`✅ Forced alignment complete for ${chunkId} in ${processingTime}ms`);
      console.log(`🎯 Alignment summary:`, {
        totalWords: wordTimestamps.length,
        contextEndTime: contextEndTime.toFixed(3) + 's',
        transcription: transcribedText.substring(0, 100) + '...'
      });

    } finally {
      // Cleanup temp file
      try {
        if (fs.existsSync(tempFilePath)) {
          fs.unlinkSync(tempFilePath);
        }
      } catch (cleanupError) {
        console.warn(`⚠️ Failed to cleanup alignment temp file ${tempFilePath}:`, cleanupError);
      }
    }

    return NextResponse.json({ 
      success: true, 
      ...alignmentResult 
    });

  } catch (error) {
    console.error('❌ Forced alignment failed:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown alignment error',
      contextEndTime: 0,
      wordTimestamps: [],
      transcribedText: ''
    }, { status: 500 });
  }
}
