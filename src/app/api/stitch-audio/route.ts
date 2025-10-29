import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import { join } from 'path';
import { tmpdir } from 'os';
import { promises as fs } from 'fs';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../../../config/firebase';

export async function POST(request: NextRequest) {
  try {
    const { chunks } = await request.json();
    
    console.log('🧵 Stitching audio chunks:', chunks.length);
    console.log('📁 Chunks data:', JSON.stringify(chunks, null, 2));
    
    if (!chunks || !Array.isArray(chunks) || chunks.length === 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'No valid chunks provided for stitching' 
      }, { status: 400 });
    }
    
    // Create temp directory for processing
    const tempDir = join(tmpdir(), `audio_stitching_${Date.now()}`);
    await fs.mkdir(tempDir, { recursive: true });
    
    // Call Python stitching script
    const pythonScript = join(process.cwd(), 'scripts', 'audio_stitcher.py');
    const outputFilePath = join(tempDir, 'final_stitched.wav');
    
    // Download processed chunks from Firebase URLs to temp files
    const downloadedChunkPaths: string[] = [];
    for (const chunk of chunks) {
      console.log(`📥 Downloading chunk ${chunk.id} from: ${chunk.download_url}`);
      
      if (!chunk.download_url) {
        throw new Error(`Chunk ${chunk.id} missing download_url`);
      }
      
      // Fix malformed Firebase Storage URLs
      let downloadUrl = chunk.download_url;
      if (downloadUrl.includes('firebasestorage.googleapis.com')) {
        // Extract the bucket and path from the malformed URL
        const urlParts = downloadUrl.split('/o/');
        if (urlParts.length === 2) {
          const baseUrl = urlParts[0] + '/o/';
          const storagePath = urlParts[1].split('?')[0]; // Remove query parameters
          const encodedPath = encodeURIComponent(storagePath);
          downloadUrl = baseUrl + encodedPath + '?alt=media';
          console.log(`🔧 Fixed URL for chunk ${chunk.id}: ${downloadUrl}`);
        }
      }
      
      const response = await fetch(downloadUrl);
      if (!response.ok) {
        throw new Error(`Failed to download processed chunk ${chunk.id}: ${response.status} ${response.statusText}`);
      }
      
      const buffer = Buffer.from(await response.arrayBuffer());
      const chunkFilePath = join(tempDir, `processed_${chunk.id}.wav`);
      await fs.writeFile(chunkFilePath, buffer);
      downloadedChunkPaths.push(chunkFilePath);
      
      console.log(`✅ Downloaded chunk ${chunk.id} to: ${chunkFilePath}`);
    }
    
    console.log('🐍 Starting Python stitching script...');
    console.log('📁 Python script path:', pythonScript);
    console.log('📁 Downloaded chunk paths:', downloadedChunkPaths);
    console.log('📁 Output file path:', outputFilePath);
    
    const pythonArgs = [
      pythonScript, 
      ...downloadedChunkPaths,
      outputFilePath,
      '--overlap-duration', '2',
      '--json'
    ];
    console.log('🐍 Python command:', 'python', pythonArgs.join(' '));
    
    const pythonProcess = spawn('python', pythonArgs);
    
    return new Promise((resolve, reject) => {
      let output = '';
      let errorOutput = '';
      
      pythonProcess.stdout.on('data', (data) => {
        output += data.toString();
      });
      
      pythonProcess.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });
      
      pythonProcess.on('close', async (code) => {
                 if (code === 0) {
                       try {
              // Parse the output to get the final stitched audio info
              console.log('📝 Python script output:', output);
              const result = parseStitchOutput(output, tempDir);
              console.log('📊 Parsed result:', result);
              
              // Upload the final stitched audio to Firebase Storage
              let downloadUrl = '';
              
              // For now, just use the local file path instead of uploading to Firebase
              if (result.output_file && await fs.access(result.output_file).then(() => true).catch(() => false)) {
                const finalOutputFile = result.output_file;
                console.log('📁 Final output file path:', finalOutputFile);
                
                // Create a URL that the browser can access via our API
                downloadUrl = `/api/serve-local-audio?path=${encodeURIComponent(finalOutputFile)}`;
                console.log('✅ Using local file API URL:', downloadUrl);
                
              } else {
                console.log('❌ No output file created by Python script or file does not exist');
              }
              
              // Don't clean up temp directory yet - we need the file for local access
              console.log('⚠️ Temp directory not cleaned up - file available at:', downloadUrl);
              
              resolve(NextResponse.json({ 
                success: true, 
                ...result,
                download_url: downloadUrl
              }));
            } catch (parseError) {
             reject(NextResponse.json({ 
               success: false, 
               error: 'Failed to parse stitch output' 
             }, { status: 500 }));
           }
         } else {
          console.error('❌ Python script failed!');
          console.error('❌ Exit code:', code);
          console.error('❌ Stdout:', output);
          console.error('❌ Stderr:', errorOutput);
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
    console.error('❌ Error in stitch-audio API:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}

function parseStitchOutput(output: string, tempDir: string) {
  try {
    // The Python script outputs JSON when --json flag is used
    // Look for JSON output in the stdout
    const jsonMatch = output.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const result = JSON.parse(jsonMatch[0]);
      
      if (result.success) {
        return {
          duration: result.final_duration || 0,
          output_file: result.output_file || '',
          chunks_stitched: result.chunks_stitched || 0,
          tempDir
        };
      }
    }
    
    // Fallback: parse text output if JSON not found
    const lines = output.split('\n');
    let duration = 0;
    let outputFile = '';
    
    for (const line of lines) {
      if (line.includes('Duration:')) {
        const durationMatch = line.match(/Duration:\s*([\d.]+)s/);
        if (durationMatch) {
          duration = parseFloat(durationMatch[1]);
        }
      }
      if (line.includes('Output:')) {
        const outputMatch = line.match(/Output:\s*(.+)/);
        if (outputMatch) {
          outputFile = outputMatch[1].trim();
        }
      }
    }
    
    return {
      duration,
      output_file: outputFile,
      chunks_stitched: 0,
      tempDir
    };
  } catch (error) {
    console.error('Error parsing stitch output:', error);
    return {
      duration: 0,
      output_file: '',
      chunks_stitched: 0,
      tempDir
    };
  }
}
