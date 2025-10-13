import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { text } = await req.json();

    if (!text) {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 });
    }

    // 步骤 1: 调用外部 TTS 服务获取包含 audio_url 的 JSON
    const externalTtsUrl = `https://api.cenguigui.cn/api/speech/AiChat/?text=${encodeURIComponent(text)}`;
    const externalTtsResponse = await fetch(externalTtsUrl, {
      method: 'GET',
    });

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

    // 步骤 2: 服务器端直接访问 audio_url 获取音频文件
    const audioResponse = await fetch(audioUrl);

    if (!audioResponse.ok) {
        const errorText = await audioResponse.text();
        console.error('Failed to fetch audio file:', errorText);
        return NextResponse.json({ error: 'Failed to fetch audio file', details: errorText }, { status: audioResponse.status });
    }

    // 步骤 3: 将获取到的音频流直接返回给前端
    const audioBlob = await audioResponse.blob();
    const headers = new Headers();
    headers.set('Content-Type', audioResponse.headers.get('Content-Type') || 'audio/wav');

    return new NextResponse(audioBlob, { status: 200, headers });

  } catch (error) {
    console.error('TTS proxy error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}