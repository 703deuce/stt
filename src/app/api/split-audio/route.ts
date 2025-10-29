import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const inputFile = formData.get('inputFile') as File;
    const duration = formData.get('duration') as string;
    const useSmartSplitting = formData.get('useSmartSplitting') === 'true';
    
    if (!inputFile) {
      return NextResponse.json({ success: false, error: 'No input file provided' }, { status: 400 });
    }
    
    console.log('🎵 Splitting audio file:', inputFile.name);
    console.log('⏱️ Duration:', duration);
    console.log('🧠 Smart splitting:', useSmartSplitting ? 'enabled' : 'disabled');
    
    // Create temp directory for processing
    const tempDir = join(tmpdir(), `audio_chunking_${Date.now()}`);
    await mkdir(tempDir, { recursive: true });
    
    // Save uploaded file to temp directory
    const inputFilePath = join(tempDir, inputFile.name);
    const bytes = await inputFile.arrayBuffer();
    await writeFile(inputFilePath, Buffer.from(bytes));
    
    // Choose chunking script based on user preference
    const pythonScript = useSmartSplitting 
      ? join(process.cwd(), 'scripts', 'smart_audio_chunker.py')
      : join(process.cwd(), 'scripts', 'audio_chunker_sample_accurate.py');
    
    console.log('🔧 Using chunker:', useSmartSplitting ? 'Smart (silence-aware)' : 'Sample-accurate');
    
    // The script expects input_file and output_file, but we'll use a dummy output since we only want chunks
    const dummyOutput = join(tempDir, 'dummy_output.wav');
    const pythonProcess = spawn('python', [pythonScript, inputFilePath, dummyOutput]);
    
    return new Promise((resolve, reject) => {
      let output = '';
      let errorOutput = '';
      
      pythonProcess.stdout.on('data', (data) => {
        output += data.toString();
      });
      
      pythonProcess.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });
      
      pythonProcess.on('close', (code) => {
        if (code === 0) {
                      try {
              // Parse the output to get chunk information
              const chunks = parseChunkOutput(output, tempDir);
              console.log('✅ Successfully parsed chunks:', chunks);
              resolve(NextResponse.json({ 
                success: true, 
                chunks,
                tempDir 
              }));
            } catch (parseError) {
              console.error('❌ Parse error:', parseError);
              reject(NextResponse.json({ 
                success: false, 
                error: 'Failed to parse chunk output' 
              }, { status: 500 }));
            }
        } else {
          reject(NextResponse.json({ 
            success: false, 
            error: `Python script failed with code ${code}: ${errorOutput}` 
          }, { status: 500 }));
        }
      });
      
      pythonProcess.on('error', (error) => {
        reject(NextResponse.json({ 
          success: false, 
          error: `Failed to start Python script: ${error.message}` 
        }, { status: 500 }));
      });
    });
    
  } catch (error) {
    console.error('❌ Error in split-audio API:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}

function parseChunkOutput(output: string, tempDir: string) {
  try {
    // The Python script outputs JSON when --json flag is used
    // Look for JSON output in the stdout
    const jsonMatch = output.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const result = JSON.parse(jsonMatch[0]);
      
      if (result.success && result.chunks) {
        // Transform the Python script output to our expected format
        return result.chunks.map((chunk: Record<string, unknown>, index: number) => ({
          id: chunk.id || `chunk_${index + 1}`,
          start_time: chunk.start_time || 0,
          end_time: chunk.end_time || 0,
          duration: chunk.duration || 0,
          status: 'pending',
          file_path: chunk.file_path || join(tempDir, `chunk_${index + 1}.wav`)
        }));
      }
    }
    
    // Fallback: parse text output if JSON not found
    const lines = output.split('\n');
    const chunks = [];
    let chunkIndex = 1;
    
    for (const line of lines) {
      if (line.includes('chunk') && line.includes('processed')) {
        // Extract chunk info from text output
        chunks.push({
          id: `chunk_${chunkIndex}`,
          start_time: (chunkIndex - 1) * 90,
          end_time: chunkIndex * 90,
          duration: 90,
          status: 'pending',
          file_path: join(tempDir, `chunk_${chunkIndex}.wav`)
        });
        chunkIndex++;
      }
    }
    
    return chunks;
  } catch (error) {
    console.error('Error parsing chunk output:', error);
    // Return empty array if parsing fails
    return [];
  }
}
