import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json();

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: 'Invalid messages' }, { status: 400 });
    }

    const userMessages = messages.map(m => m.content).join('\n');
    const prompt = `请为以下对话内容提炼一个简洁的标题。要求：核心聚焦：准确概括对话的核心主题或关键事件。语言风格：简洁、中性，直接点明主旨。格式与长度：标题长度严格控制在10个汉字以内，无需使用任何标点符号。（不超过10个字）：\n\n${userMessages}`;

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