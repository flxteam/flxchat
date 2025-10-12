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
  const { messages, systemPrompt, modelId, useSearch, useThinkingMode } = body;

  if (!messages) {
    return new NextResponse('Messages are required', { status: 400 });
  }

  // 1. Sanitize all message content
  const sanitizeContent = (content: string) => {
    if (typeof content !== 'string') return '';
    return content
      .replace(/[\r\n]+/g, '\n')      // Normalize newlines
      .replace(/[“”]/g, '"')         // Replace curly double quotes
      .replace(/[‘’]/g, "'")         // Replace curly single quotes
      .replace(/—/g, '-')           // Replace em dash
      .replace(/…/g, '...')         // Replace ellipsis
      .replace(/&#x27;/g, "'")        // Replace HTML entity for single quote
      .replace(/[◆|]/g, ' ')         // Replace special symbols with a space
      .replace(/：/g, ':')           // Full-width colon
      .replace(/（/g, '(')           // Full-width open parenthesis
      .replace(/）/g, ')')           // Full-width close parenthesis
      .replace(/，/g, ',')           // Full-width comma
      .replace(/。/g, '. ')          // Full-width period
      .replace(/？/g, '?')           // Full-width question mark
      .replace(/！/g, '!')           // Full-width exclamation mark
      .replace(/；/g, ';')           // Full-width semicolon
      .replace(/[\x00-\x1F\x7F]/g, '') // Remove control characters
      .trim();
  };

  const sanitizedMessages = messages.map((msg: any) => ({
    ...msg,
    content: sanitizeContent(msg.content),
  }));

  const sanitizedSystemPrompt = systemPrompt ? sanitizeContent(systemPrompt) : '';

  // 2. Truncate conversation history to fit within a token limit (approximated by character count)
  const MAX_CONTEXT_LENGTH = 8000; // Approximate character limit for context
  
  let finalMessages: any[] = [];

  // Add system prompt if it exists
  if (sanitizedSystemPrompt) {
    finalMessages.push({ role: 'system', content: sanitizedSystemPrompt });
  }

  // Add user messages from the end, calculating total length
  let currentLength = finalMessages.reduce((acc, msg) => acc + msg.content.length, 0);

  for (let i = sanitizedMessages.length - 1; i >= 0; i--) {
    const msg = sanitizedMessages[i];
    const messageLength = msg.content.length;
    if (currentLength + messageLength <= MAX_CONTEXT_LENGTH) {
      finalMessages.unshift(msg);
      currentLength += messageLength;
    } else {
      // If the last message is too long, truncate it.
      if (i === sanitizedMessages.length - 1) {
        const availableSpace = MAX_CONTEXT_LENGTH - currentLength;
        const truncatedContent = `...[内容过长，已截断]...\n${msg.content.slice(messageLength - availableSpace)}`;
        finalMessages.unshift({ ...msg, content: truncatedContent });
      }
      break; 
    }
  }

  // If no messages could be added (e.g., system prompt is too long), handle it.
  if (finalMessages.length === (sanitizedSystemPrompt ? 1 : 0) && sanitizedMessages.length > 0) {
      const lastMsg = sanitizedMessages[sanitizedMessages.length - 1];
      const availableSpace = MAX_CONTEXT_LENGTH - (sanitizedSystemPrompt ? sanitizedSystemPrompt.length : 0);
      const truncatedContent = `...[内容过长，已截断]...\n${lastMsg.content.slice(lastMsg.content.length - availableSpace)}`;
      finalMessages.push({ ...lastMsg, content: truncatedContent });
  }

  const apiKey = process.env.SILICONFLOW_API_KEY;
  const apiBase = 'https://api.siliconflow.cn/v1';

  if (!apiKey) {
    console.error('Missing environment variable: SILICONFLOW_API_KEY');
    return new NextResponse('API configuration is missing on the server.', { status: 500 });
  }

  const requestBody: any = {
    model: modelId,
    messages: finalMessages, // Use the truncated and sanitized messages
  };

  if (useSearch) {
    requestBody.tools = [searchTool];
    requestBody.stream = false;
  } else {
    requestBody.stream = true;
    if (useThinkingMode) {
      requestBody.stream_options = {
        include_thinking: true,
      };
    }
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
            const messagesWithToolResults = [...finalMessages];
            messagesWithToolResults.push(responseData.choices[0].message); // Add AI's tool request
            messagesWithToolResults.push({
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
                    messages: messagesWithToolResults,
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
        const decoder = new TextDecoder();

        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            break;
          }
          // Manually process and forward the stream
          const chunk = decoder.decode(value, { stream: true });
          // Here you could inspect the chunk for 'event: thinking' if needed,
          -          // but for now, we just forward everything.
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