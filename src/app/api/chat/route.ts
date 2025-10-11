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

  const apiKey = process.env.OPENROUTER_API_KEY;
  const apiBase = 'https://openrouter.ai/api/v1';

  if (!apiKey) {
    console.error('Missing environment variable: OPENROUTER_API_KEY');
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

  if (useSearch) {
    requestBody.tools = [searchTool];
  }

  try {
    const initialResponse = await fetch(`${apiBase}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(requestBody),
    });

    if (!initialResponse.ok) {
      const errorText = await initialResponse.text();
      console.error('OpenRouter API error (initial request):', errorText);
      return new Response(JSON.stringify({ error: 'OpenRouter API error', details: errorText }), {
        status: initialResponse.status,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const contentType = initialResponse.headers.get('Content-Type') || '';

    if (contentType.includes('application/json')) {
      const responseData = await initialResponse.json();
      const toolCall = responseData.choices?.[0]?.message?.tool_calls?.[0];

      if (toolCall && toolCall.function.name === 'search') {
        const { query } = JSON.parse(toolCall.function.arguments);
        const searchResult = await performSearch(query);

        messagesWithPrompt.push(responseData.choices[0].message);
        messagesWithPrompt.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          content: searchResult,
        });

        const secondResponse = await fetch(`${apiBase}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: modelId,
            messages: messagesWithPrompt,
            stream: true,
          }),
        });

        if (!secondResponse.ok) {
          const errorText = await secondResponse.text();
          console.error('OpenRouter API error (second request):', errorText);
          return new Response(JSON.stringify({ error: 'OpenRouter API error on second call', details: errorText }), {
            status: secondResponse.status,
            headers: { 'Content-Type': 'application/json' },
          });
        }
        
        return new Response(secondResponse.body, {
          headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' },
        });
      } else {
        const content = responseData.choices?.[0]?.message?.content || '';
        const stream = new ReadableStream({
          start(controller) {
            const delta = { choices: [{ delta: { content } }] };
            controller.enqueue(`data: ${JSON.stringify(delta)}\n\n`);
            controller.enqueue(`data: [DONE]\n\n`);
            controller.close();
          },
        });
        return new Response(stream, {
          headers: { 'Content-Type': 'text/event-stream' },
        });
      }
    } else if (contentType.includes('text/event-stream')) {
      return new Response(initialResponse.body, {
        headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' },
      });
    } else {
      const errorText = await initialResponse.text();
      console.error('Unexpected Content-Type from OpenRouter:', contentType, errorText);
      return new Response(JSON.stringify({ error: 'Unexpected response format from API.', details: errorText }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  } catch (error) {
    console.error('Error in chat API:', error);
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}