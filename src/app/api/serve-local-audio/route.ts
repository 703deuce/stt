import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const filePath = searchParams.get('path');
    
    if (!filePath) {
      return NextResponse.json({ error: 'No file path provided' }, { status: 400 });
    }
    
    // Security check - only allow temp directory files
    if (!filePath.includes('audio_stitching_')) {
      return NextResponse.json({ error: 'Invalid file path' }, { status: 403 });
    }
    
    // Read the audio file
    const fileContent = await readFile(filePath);
    
    // Return the file as a response
    return new NextResponse(new Uint8Array(fileContent), {
      headers: {
        'Content-Type': 'audio/wav',
        'Content-Length': fileContent.length.toString(),
        'Cache-Control': 'no-cache'
      }
    });
    
  } catch (error) {
    console.error('Error serving local audio file:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Failed to serve audio file' 
    }, { status: 500 });
  }
}
