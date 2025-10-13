import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { text, voice = '曼波' } = await req.json();

    if (!text) {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 });
    }

    const ttsApiUrl = `https://api.cenguigui.cn/api/speech/AiChat/?module=audio&text=${encodeURIComponent(text)}&voice=${encodeURIComponent(voice)}`;

    const response = await fetch(ttsApiUrl);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('TTS API request failed:', errorText);
      return NextResponse.json({ error: 'Failed to generate audio from external API', details: errorText }, { status: response.status });
    }

    const data = await response.json();

    if (data.code !== 200 || !data.data.audio_url) {
      console.error('TTS API returned an error:', data);
      return NextResponse.json({ error: 'Failed to get audio URL', details: data }, { status: 500 });
    }

    return NextResponse.json({ audioUrl: data.data.audio_url });
  } catch (error) {
    console.error('Error in TTS route:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}