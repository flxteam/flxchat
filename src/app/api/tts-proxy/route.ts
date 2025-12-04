import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const text = searchParams.get('text');
    const voice = searchParams.get('voice');

    if (!text || !voice) {
      return NextResponse.json({ error: 'Text and voice are required' }, { status: 400 });
    }

    const externalApiUrl = `https://api.cenguigui.cn/api/speech/AiChat/?module=audio&text=${encodeURIComponent(text as string)}&voice=${encodeURIComponent(voice as string)}`;

    console.log(`[TTS Proxy] Fetching external API: ${externalApiUrl}`);

    // 1. Call the external API to get the audio URL
    const externalApiResponse = await fetch(externalApiUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36'
      }
    });
    if (!externalApiResponse.ok) {
      console.error('External TTS API responded with status:', externalApiResponse.status);
      const errorBody = await externalApiResponse.text();
      console.error('External TTS API response body:', errorBody);
      throw new Error(`External TTS API responded with status ${externalApiResponse.status}`);
    }

    const data = await externalApiResponse.json();
    if (data.code !== 200 || !data.data || !data.data.audio_url) {
      console.error('External TTS API did not return a valid audio URL:', data);
      throw new Error(data.message || 'Failed to get audio URL from external TTS API');
    }

    const audioUrl = data.data.audio_url;

    console.log(`[TTS Proxy] Fetching audio file from: ${audioUrl}`);

    // 2. Fetch the actual audio file from the URL
    const audioResponse = await fetch(audioUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36'
      }
    });
    if (!audioResponse.ok) {
      throw new Error(`Failed to fetch audio file, status: ${audioResponse.status}`);
    }

    // 3. Stream the audio back to the client
    const audioBlob = await audioResponse.blob();
    
    return new NextResponse(audioBlob, {
      status: 200,
      headers: {
        'Content-Type': 'audio/wav',
      },
    });

  } catch (error) {
    console.error('TTS Proxy Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ error: 'Failed to process TTS request.', details: errorMessage }, { status: 500 });
  }
}