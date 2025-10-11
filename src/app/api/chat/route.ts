import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

export async function POST(req: NextRequest) {
    const body = await req.json();
    // Use the modelId from the request, or fall back to the environment variable
    const { messages, systemPrompt, modelId: requestModelId } = body;

    if (!messages) {
        return new NextResponse('Messages are required', { status: 400 });
    }

    const apiKey = process.env.SILICONFLOW_API_KEY;
    const apiBase = process.env.SILICONFLOW_API_BASE;
    const defaultModelId = process.env.SILICONFLOW_MODEL_ID;

    if (!apiKey || !apiBase || !defaultModelId) {
        console.error('Missing environment variables: SILICONFLOW_API_KEY, SILICONFLOW_API_BASE, or SILICONFLOW_MODEL_ID');
        return new NextResponse('API configuration is missing on the server.', { status: 500 });
    }

    const modelToUse = requestModelId || defaultModelId;

    // Add the system prompt to the beginning of the messages array
    const messagesWithPrompt = [...messages];
    if (systemPrompt) {
        messagesWithPrompt.unshift({ role: 'system', content: systemPrompt });
    }

    try {
        const response = await fetch(`${apiBase}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: modelToUse, // Use the selected model
                messages: messagesWithPrompt,
                stream: true,
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('SiliconFlow API error:', errorText);
            return new Response(JSON.stringify({ error: 'SiliconFlow API error', details: errorText }), {
                status: response.status,
                headers: { 'Content-Type': 'application/json' }
            });
        }

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
                    controller.enqueue(value);
                }
                controller.close();
            },
        });

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