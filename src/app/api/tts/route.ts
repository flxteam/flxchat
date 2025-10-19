import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { text } = await req.json();

    if (!text) {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 });
    }

    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    };

    const externalTtsUrl = `https://api.cenguigui.cn/api/speech/AiChat/?module=audio&text=${encodeURIComponent(text)}&voice=体虚生`;
    const externalTtsResponse = await fetch(externalTtsUrl, { headers });

    if (!externalTtsResponse.ok) {
      const errorText = await externalTtsResponse.text();
      console.error('External TTS service error:', errorText);
      return NextResponse.json({ error: 'Failed to get audio URL from external service', details: errorText }, { status: externalTtsResponse.status });
    }

    const responseData = await externalTtsResponse.json();
    const audioUrl = responseData?.data?.audio_url;

    if (!audioUrl) {
      console.error('Audio URL not found in external TTS response:', responseData);
      return NextResponse.json({ error: 'Audio URL not found in response' }, { status: 500 });
    }

    const audioResponse = await fetch(audioUrl, { headers });

    if (!audioResponse.ok) {
      const errorText = await audioResponse.text();
      console.error('Failed to fetch audio from audio_url:', errorText);
      return NextResponse.json({ error: 'Failed to fetch audio from audio_url', details: errorText }, { status: audioResponse.status });
    }

    const audioBlob = await audioResponse.blob();
    const headers = new Headers();
    headers.set('Content-Type', audioResponse.headers.get('Content-Type') || 'audio/wav');

    return new NextResponse(audioBlob, { status: 200, headers });

  } catch (error) {
    console.error('TTS proxy error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}