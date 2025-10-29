import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { spawn } from 'child_process';

// Python Whisper STT validation function
async function runSTTValidation(audioFilePath: string, expectedText: string, chunkId: string): Promise<any> {
  return new Promise((resolve, reject) => {
    console.log(`🎙️ Starting STT validation for ${chunkId}...`);
    
    const pythonScript = `
import sys
import json
import difflib

try:
    # Use Whisper for STT validation
    import whisper
    print("🔄 Running Whisper STT validation...", file=sys.stderr)
    
    model = whisper.load_model("tiny")
    result = model.transcribe("${audioFilePath.replace(/\\/g, '\\\\')}", 
                             language="en",
                             temperature=0.0)
    
    transcribed_text = result.get("text", "").strip()
    expected_text = "${expectedText.replace(/\\/g, '\\\\')}".strip()
    
    print(f"🎯 Expected: {expected_text[:100]}...", file=sys.stderr)
    print(f"🎙️ Transcribed: {transcribed_text[:100]}...", file=sys.stderr)
    
    # Calculate similarity using difflib
    similarity = difflib.SequenceMatcher(None, expected_text.lower(), transcribed_text.lower()).ratio()
    
    # Check for gibberish patterns
    gibberish_indicators = [
        len(transcribed_text) < len(expected_text) * 0.3,  # Too short
        len(transcribed_text) > len(expected_text) * 3.0,  # Too long
        transcribed_text.count(' ') < len(expected_text.split()) * 0.5,  # Too few words
        any(word in transcribed_text.lower() for word in ['blah', 'blah blah', 'um', 'uh', 'er', 'ah'] * 3),  # Repetitive sounds
    ]
    
    # Check for word repetition (same word repeated many times)
    words = transcribed_text.lower().split()
    if len(words) > 0:
        word_counts = {}
        for word in words:
            word_counts[word] = word_counts.get(word, 0) + 1
        max_repetition = max(word_counts.values()) if word_counts else 0
        repetition_ratio = max_repetition / len(words) if words else 0
        has_excessive_repetition = repetition_ratio > 0.4  # More than 40% same word
    else:
        has_excessive_repetition = False
    
    # Check for confidence (simplified)
    confidence = similarity * 0.9  # Base confidence on similarity
    
    # Determine if it passed
    passed = similarity >= 0.6 and not any(gibberish_indicators) and not has_excessive_repetition
    
    print(f"📊 STT Validation Results:", file=sys.stderr)
    print(f"   Similarity: {similarity:.3f}", file=sys.stderr)
    print(f"   Confidence: {confidence:.3f}", file=sys.stderr)
    print(f"   Passed: {passed}", file=sys.stderr)
    print(f"   Gibberish indicators: {gibberish_indicators}", file=sys.stderr)
    print(f"   Excessive repetition: {has_excessive_repetition}", file=sys.stderr)
    
    result_data = {
        "passed": passed,
        "confidence": confidence,
        "similarity": similarity,
        "transcribedText": transcribed_text,
        "expectedText": expected_text,
        "gibberishIndicators": gibberish_indicators,
        "hasExcessiveRepetition": has_excessive_repetition,
        "processingTime": 0  # Will be set by caller
    }
    
    print(json.dumps(result_data))
    
except Exception as e:
    print(f"❌ STT validation error: {e}", file=sys.stderr)
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
      if (stderr) console.log(`🐍 STT validation stderr for ${chunkId}:`, stderr);
      
      if (code === 0 && stdout.trim()) {
        try {
          const result = JSON.parse(stdout.trim());
          console.log(`✅ STT validation completed for ${chunkId}`);
          resolve(result);
        } catch (parseError) {
          reject(new Error(`Failed to parse STT validation output: ${parseError.message}`));
        }
      } else {
        reject(new Error(`STT validation failed with code ${code}: ${stderr}`));
      }
    });
    
    pythonProcess.on('error', (error) => {
      reject(new Error(`Failed to start STT validation subprocess: ${error.message}`));
    });
  });
}

export async function POST(request: NextRequest) {
  try {
    const { audioBase64, expectedText, chunkId } = await request.json();
    
    if (!audioBase64 || !expectedText || !chunkId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Missing required parameters: audioBase64, expectedText, chunkId' 
      }, { status: 400 });
    }

    console.log(`🎙️ STT VALIDATION for ${chunkId}: Checking for gibberish and repetition...`);
    const startTime = Date.now();

    // Create temp directory and file
    const tempDir = path.join(os.tmpdir(), 'tts-stt-validation');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    const tempFilePath = path.join(tempDir, `${chunkId}_stt_${Date.now()}.wav`);
    
    let validationResult;
    try {
      // Save audio to temp file
      const audioBuffer = Buffer.from(audioBase64, 'base64');
      fs.writeFileSync(tempFilePath, audioBuffer);
      
      console.log(`🎙️ Running STT validation on ${chunkId} (${audioBuffer.length} bytes)...`);
      
      // Run STT validation
      validationResult = await runSTTValidation(tempFilePath, expectedText, chunkId);
      validationResult.processingTime = Date.now() - startTime;

      console.log(`✅ STT validation complete for ${chunkId} in ${validationResult.processingTime}ms`);
      console.log(`🔍 STT Results:`, {
        passed: validationResult.passed,
        similarity: validationResult.similarity?.toFixed(3),
        confidence: validationResult.confidence?.toFixed(3),
        hasExcessiveRepetition: validationResult.hasExcessiveRepetition,
        gibberishIndicators: validationResult.gibberishIndicators
      });

    } finally {
      // Cleanup temp file
      try {
        if (fs.existsSync(tempFilePath)) {
          fs.unlinkSync(tempFilePath);
        }
      } catch (cleanupError) {
        console.warn(`⚠️ Failed to cleanup STT validation temp file ${tempFilePath}:`, cleanupError);
      }
    }

    return NextResponse.json({ 
      success: true, 
      ...validationResult 
    });

  } catch (error) {
    console.error('❌ STT validation failed:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown STT validation error',
      passed: false,
      confidence: 0,
      similarity: 0,
      transcribedText: '',
      expectedText: ''
    }, { status: 500 });
  }
}