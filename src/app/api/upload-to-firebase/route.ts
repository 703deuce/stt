import { NextRequest, NextResponse } from 'next/server';
import { transcriptionService } from '@/services/transcriptionService';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const uploadResult = await transcriptionService.uploadFileToFirebase(file);
    
    return NextResponse.json({
      success: true,
      url: uploadResult.url,
      filename: uploadResult.filename
    });
  } catch (error) {
    console.error('Error uploading file to Firebase:', error);
    return NextResponse.json(
      { error: 'Failed to upload file' },
      { status: 500 }
    );
  }
}
