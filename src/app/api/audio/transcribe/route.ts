import { NextRequest, NextResponse } from 'next/server';



export async function POST(req: NextRequest) {
  try {
    // 从客户端请求中获取音频文件
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No audio file provided.' }, { status: 400 });
    }

    // 创建一个新的 FormData 用于发送到 SiliconFlow API
    const siliconFlowFormData = new FormData();
    siliconFlowFormData.append('file', file);
    siliconFlowFormData.append('model', 'TeleAI/TeleSpeechASR');

    // 向 SiliconFlow API 发送 POST 请求
    const response = await fetch('https://api.siliconflow.cn/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.SILICONFLOW_API_KEY}`,
      },
      body: siliconFlowFormData,
    });

    // 处理来自 SiliconFlow 的响应
    if (!response.ok) {
      const errorText = await response.text();
      console.error('SiliconFlow API Error:', errorText);
      return NextResponse.json({ error: 'Failed to transcribe audio.', details: errorText }, { status: response.status });
    }

    const data = await response.json();

    // 将转录的文本返回给客户端
    return NextResponse.json(data);

  } catch (error) {
    console.error('Error in transcribe route:', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}