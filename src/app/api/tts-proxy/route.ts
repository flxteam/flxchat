import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const audioUrl = searchParams.get('url');

  if (!audioUrl) {
    return new NextResponse('Missing audio URL', { status: 400 });
  }

  try {
    // Fetch the audio from the original source
    const response = await fetch(audioUrl);

    if (!response.ok) {
      // Pass through the error from the origin server
      return new NextResponse(response.statusText, { status: response.status });
    }

    // Get the audio data as a Blob
    const audioBlob = await response.blob();
    
    // Return the audio file to the client with the correct content type
    return new NextResponse(audioBlob, {
      status: 200,
      headers: {
        'Content-Type': 'audio/wav', // Assuming it's always wav based on the example
      },
    });
  } catch (error) {
    console.error('Error proxying TTS audio:', error);
    return new NextResponse('Error proxying audio', { status: 500 });
  }
}