import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

// Define the search tool structure
const searchTool = {
  type: 'function',
  function: {
    name: 'search',
    description: 'Search for information on the web.',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'The search query.',
        },
      },
      required: ['query'],
    },
  },
};

async function performSearch(query: string) {
  try {
    const response = await fetch('https://google.serper.dev/search', {
      method: 'POST',
      headers: {
        'X-API-KEY': process.env.SERPER_API_KEY!,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ q: query }),
    });
    if (!response.ok) {
      throw new Error(`Serper API error: ${response.statusText}`);
    }
    const data = await response.json();
    // Extract relevant snippets or organic results
    const snippets = data.organic?.map((r: any) => r.snippet).join('\n') || 'No results found.';
    return snippets;
  } catch (error) {
    console.error('Search failed:', error);
    return 'Search failed.';
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { messages, systemPrompt, modelId, useSearch } = body;

  if (!messages) {
    return new NextResponse('Messages are required', { status: 400 });
  }

  const apiKey = process.env.SILICONFLOW_API_KEY;
  const apiBase = 'https://api.siliconflow.cn/v1'; // Correct API base for SiliconFlow

  if (!apiKey) {
    console.error('Missing environment variable: SILICONFLOW_API_KEY');
    return new NextResponse('API configuration is missing on the server.', { status: 500 });
  }

  const messagesWithPrompt = [...messages];
  if (systemPrompt) {
    messagesWithPrompt.unshift({ role: 'system', content: systemPrompt });
  }

  const requestBody: any = {
    model: modelId,
    messages: messagesWithPrompt,
    stream: true,
  };

  // Add tools if search is enabled
  if (useSearch) {
    requestBody.tools = [searchTool];
    requestBody.stream = false; // First request is not streamed to check for tool calls
  }

  try {
    let response = await fetch(`${apiBase}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(requestBody),
    });

    // Check for tool calls if search is enabled
    if (useSearch) {
        const responseData = await response.json();
        const toolCall = responseData.choices?.[0]?.message?.tool_calls?.[0];

        if (toolCall && toolCall.function.name === 'search') {
            const { query } = JSON.parse(toolCall.function.arguments);
            const searchResult = await performSearch(query);

            // Add tool call and result to messages
            messagesWithPrompt.push(responseData.choices[0].message); // Add AI's tool request
            messagesWithPrompt.push({
                role: 'tool',
                tool_call_id: toolCall.id,
                content: searchResult,
            });

            // Make a second call with the search result, this time streamed
            response = await fetch(`${apiBase}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`,
                },
                body: JSON.stringify({
                    model: modelId,
                    messages: messagesWithPrompt,
                    stream: true, // Get the final answer as a stream
                }),
            });
        } else {
            // If no tool call, we need to convert the non-streamed response back to a stream
            // that mimics the format of a real stream.
            const stream = new ReadableStream({
                start(controller) {
                    const content = responseData.choices?.[0]?.message?.content || '';
                    const chunk = {
                        choices: [{
                            delta: { content: content },
                            index: 0,
                            finish_reason: responseData.choices?.[0]?.finish_reason
                        }]
                    };
                    controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(chunk)}\n\n`));
                    controller.enqueue(new TextEncoder().encode('data: [DONE]\n\n'));
                    controller.close();
                }
            });
            return new Response(stream, {
                headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' },
            });
        }
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error('SiliconFlow API error:', errorText);
      return new Response(JSON.stringify({ error: 'SiliconFlow API error', details: errorText }), {
        status: response.status,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const stream = new ReadableStream({
      async start(controller) {
        if (!response.body) {
          controller.close();
          return;
        }
        const reader = response.body.getReader();

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
      headers: { 'Content-Type': 'application/json' },
    });
  }
}