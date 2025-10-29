import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import { writeFile, mkdir, readFile } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';

export async function POST(request: NextRequest) {
  try {
    const { chunks, use_voice_embeddings = true, similarity_threshold = 0.75, full_audio_diarization_segments = [] } = await request.json();
    
    if (!chunks || !Array.isArray(chunks) || chunks.length === 0) {
      return NextResponse.json({ success: false, error: 'No transcript chunks provided' }, { status: 400 });
    }
    
    console.log('🎤 Advanced transcript stitching with speaker embeddings');
    console.log(`📝 Processing ${chunks.length} chunks`);
    console.log(`🎯 Voice embeddings: ${use_voice_embeddings ? 'enabled' : 'disabled'}`);
    console.log(`📊 Similarity threshold: ${similarity_threshold}`);
    console.log(`🎭 Full audio diarization segments: ${full_audio_diarization_segments.length}`);
    
    // Create temp directory for processing
    const tempDir = join(tmpdir(), `advanced_transcript_stitching_${Date.now()}`);
    await mkdir(tempDir, { recursive: true });
    
    // Prepare chunks data with audio file paths for embedding extraction
    const chunksWithAudio = chunks.map((chunk, index) => ({
      ...chunk,
      chunk_index: index,
      // Ensure we have the audio file path for embedding extraction
      file_path: chunk.file_path || join(tmpdir(), `audio_chunking_${Date.now()}`, `chunk_${index}.wav`)
    }));
    
    // Add full audio diarization segments to the data passed to Python
    const stitchingData = {
      chunks: chunksWithAudio,
      full_audio_diarization_segments: full_audio_diarization_segments,
      use_voice_embeddings: use_voice_embeddings,
      similarity_threshold: similarity_threshold
    };
    
    // Create output file path
    const outputFileName = `advanced_stitched_transcript_${Date.now()}.json`;
    const outputFilePath = join(tempDir, outputFileName);
    
    // Choose the appropriate Python script
    const pythonScript = use_voice_embeddings 
      ? join(process.cwd(), 'scripts', 'speaker_embedding_stitcher.py')
      : join(process.cwd(), 'scripts', 'enhanced_transcript_stitcher.py');
    
    return new Promise(async (resolve, reject) => {
      console.log(`🚀 Starting ${use_voice_embeddings ? 'voice embedding' : 'enhanced text-based'} stitcher...`);
      
      let pythonArgs: string[];
      
      if (use_voice_embeddings) {
        // Advanced voice embedding stitcher
        // Write chunks to a file to avoid ENAMETOOLONG error
        const chunksFilePath = join(tempDir, 'chunks_data.json');
        await writeFile(chunksFilePath, JSON.stringify(stitchingData, null, 2), 'utf-8');
        
        pythonArgs = [
          pythonScript,
          '--chunks-file', chunksFilePath,
          '--output', outputFilePath,
          '--threshold', '0.45',  // Further lowered threshold to reduce false speaker detection (0.45-0.50 range)
          '--model', 'pyannote/embedding'
        ];
      } else {
        // Enhanced text-based stitcher (fallback)
        // First save chunks to individual JSON files
        const chunkFiles: string[] = [];
        for (let i = 0; i < chunks.length; i++) {
          const chunkFileName = `transcript_chunk_${i}.json`;
          const chunkFilePath = join(tempDir, chunkFileName);
          await writeFile(chunkFilePath, JSON.stringify(chunks[i].transcription_result || chunks[i], null, 2), 'utf-8');
          chunkFiles.push(chunkFilePath);
        }
        
        pythonArgs = [
          pythonScript,
          ...chunkFiles,
          outputFilePath,
          '--overlap-duration', '30',
          '--json'
        ];
      }
      
      const pythonProcess = spawn('python', pythonArgs, {
        env: { ...process.env, PYTHONIOENCODING: 'utf-8' }
      });
      
      let output = '';
      let errorOutput = '';
      
      pythonProcess.stdout.on('data', (data) => {
        output += data.toString();
        console.log('🐍 Python:', data.toString().trim());
      });
      
      pythonProcess.stderr.on('data', (data) => {
        errorOutput += data.toString();
        console.error('🐍 Python Error:', data.toString().trim());
      });
      
      pythonProcess.on('close', async (code) => {
        if (code === 0) {
          try {
            console.log('✅ Advanced stitcher completed successfully');
            
            // Read the final transcript result
            let result;
            try {
              const resultData = await readFile(outputFilePath, 'utf-8');
              result = JSON.parse(resultData);
            } catch (readError) {
              // Fallback: try to parse from stdout
              const jsonMatch = output.match(/\{[\s\S]*\}/);
              if (jsonMatch) {
                result = JSON.parse(jsonMatch[0]);
              } else {
                throw new Error('No result file or JSON output found');
              }
            }
            
            console.log(`📊 Advanced stitching stats:`);
            console.log(`   📝 Words: ${result.word_count || 'N/A'}`);
            console.log(`   👥 Speakers: ${result.speaker_count || 'N/A'}`);
            console.log(`   📋 Segments: ${result.diarized_segments || 'N/A'}`);
            console.log(`   ⏱️ Duration: ${result.duration?.toFixed(1) || 'N/A'}s`);
            console.log(`   🎯 Method: ${result.speaker_embedding_method || 'unknown'}`);
            
            resolve(NextResponse.json({
              success: true,
              // Core transcript data
              text: result.merged_text || result.text,
              merged_text: result.merged_text || result.text,
              diarized_transcript: result.diarized_transcript || [],
              timestamps: result.timestamps || [],
              
              // Speaker and processing metadata
              speaker_count: result.speaker_count || 0,
              duration: result.duration || 0,
              diarized_segments: result.diarized_segments || 0,
              word_count: result.word_count || 0,
              
              // Advanced features
              enhanced_stitching: true,
              speaker_embedding_method: result.speaker_embedding_method || 'text_fallback',
              similarity_threshold: similarity_threshold,
              processing_method: use_voice_embeddings ? 'voice_embedding_stitching' : 'enhanced_text_stitching',
              
              // Full metadata
              metadata: {
                ...result.metadata,
                chunks_processed: chunks.length,
                voice_embeddings_used: use_voice_embeddings,
                similarity_threshold: similarity_threshold,
                temp_directory: tempDir,
                output_file: outputFilePath
              }
            }));
            
          } catch (parseError) {
            console.error('❌ Failed to parse advanced stitching result:', parseError);
            console.error('Raw output:', output);
            reject(NextResponse.json({
              success: false,
              error: `Failed to parse advanced stitching result: ${parseError}`
            }, { status: 500 }));
          }
        } else {
          console.error(`❌ Advanced stitcher failed with code: ${code}`);
          console.error('Error output:', errorOutput);
          reject(NextResponse.json({
            success: false,
            error: `Advanced transcript stitching failed: ${errorOutput}`
          }, { status: 500 }));
        }
      });
      
      pythonProcess.on('error', (error) => {
        console.error('❌ Failed to start advanced stitcher:', error);
        reject(NextResponse.json({
          success: false,
          error: `Failed to start advanced stitcher: ${error.message}`
        }, { status: 500 }));
      });
    });
    
  } catch (error) {
    console.error('❌ Error in advanced stitch-transcript API:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
