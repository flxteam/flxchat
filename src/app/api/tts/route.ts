import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { text } = await req.json();

    if (!text) {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 });
    }

    const externalTtsUrl = `https://api.cenguigui.cn/api/speech/AiChat/?module=audio&text=${encodeURIComponent(text)}&voice=体虚生`;
    const externalTtsResponse = await fetch(externalTtsUrl);

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

    const proxyUrl = `${req.nextUrl.origin}/api/tts-proxy?url=${encodeURIComponent(audioUrl)}`;
    const proxyResponse = await fetch(proxyUrl);

    if (!proxyResponse.ok) {
      const errorText = await proxyResponse.text();
      console.error('TTS proxy error:', errorText);
      return NextResponse.json({ error: 'Failed to fetch audio from proxy', details: errorText }, { status: proxyResponse.status });
    }

    const audioBlob = await proxyResponse.blob();
    const headers = new Headers();
    headers.set('Content-Type', proxyResponse.headers.get('Content-Type') || 'audio/wav');

    return new NextResponse(audioBlob, { status: 200, headers });

  } catch (error) {
    console.error('TTS proxy error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}