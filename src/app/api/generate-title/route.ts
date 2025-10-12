import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json();

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: 'Invalid messages' }, { status: 400 });
    }

    const userMessages = messages.map(m => m.content).join('\n');
    const prompt = `为以下对话生成一个简洁的标题（不超过10个字）：\n\n${userMessages}`;

    const response = await fetch('https://api.siliconflow.cn/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.SILICONFLOW_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'tencent/Hunyuan-MT-7B',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 20,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      throw new Error(`SiliconFlow API error: ${response.statusText}`);
    }

    const data = await response.json();
    const title = data.choices[0]?.message?.content.trim() || '新对话';

    return NextResponse.json({ title });
  } catch (error) {
    console.error('Error generating title:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}