import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
    const body = await req.json();
    const { messages } = body;

    if (!messages) {
        return new NextResponse('Messages are required', { status: 400 });
    }

    const siliconflow_api_key = process.env.SILICONFLOW_API_KEY;
    const siliconflow_model_id = process.env.SILICONFLOW_MODEL_ID;

    if (!siliconflow_api_key) {
        return new NextResponse('API configuration is missing', { status: 500 });
    }

    try {
        const response = await fetch(`https://api.siliconflow.cn/v1/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${siliconflow_api_key}`
            },
            body: JSON.stringify({
                model: siliconflow_model_id,
                messages,
                stream: true, // 开启流式响应
            })
        });

        // 检查响应是否成功
        if (!response.ok) {
            const errorData = await response.json();
            return new Response(JSON.stringify({ error: 'SiliconFlow API error', details: errorData }), {
                status: response.status,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // 创建一个可读流以将数据发送到客户端
        const stream = new ReadableStream({
            async start(controller) {
                if (!response.body) {
                    controller.close();
                    return;
                }
                const reader = response.body.getReader();
                const decoder = new TextDecoder();

                while (true) {
                    const { done, value } = await reader.read();
                    if (done) {
                        break;
                    }
                    // 将收到的数据块直接推送到流中
                    controller.enqueue(value);
                }
                controller.close();
            },
        });

        // 将流作为响应返回
        return new Response(stream, {
            headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' },
        });

    } catch (error) {
        console.error('Error calling SiliconFlow API:', error);
        return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}