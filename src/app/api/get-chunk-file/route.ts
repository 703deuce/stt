import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const filePath = searchParams.get('path');
    
    if (!filePath) {
      return NextResponse.json({ error: 'No file path provided' }, { status: 400 });
    }
    
    // Read the chunk file
    const fileContent = await readFile(filePath);
    
    // Return the file as a response
    return new NextResponse(new Uint8Array(fileContent), {
      headers: {
        'Content-Type': 'audio/wav',
        'Content-Disposition': 'attachment; filename="chunk.wav"'
      }
    });
    
  } catch (error) {
    console.error('Error reading chunk file:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Failed to read chunk file' 
    }, { status: 500 });
  }
}
