import { NextRequest, NextResponse } from 'next/server';
import { transcriptionService } from '@/services/transcriptionService';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const userId = formData.get('userId') as string | null;
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required for upload' }, { status: 401 });
    }

    const uploadResult = await transcriptionService.uploadFileToFirebase(file, undefined, userId);
    
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
