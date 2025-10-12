import { NextRequest, NextResponse } from 'next/server';

const log = console.log;

log('--- NEW REQUEST ---');



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

const dailyNewsTool = {
  type: 'function',
  function: {
    name: 'get_daily_news',
    description: '获取指定平台的实时热点新闻。',
    parameters: {
      type: 'object',
      properties: {
        platform: {
          type: 'string',
          description: '平台代码，例如：baidu, weibo, zhihu, github 等。',
        },
      },
      required: ['platform'],
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
  } catch (error: any) {
    log(`Search failed: ${error.message}`);
    return 'Search failed.';
  }
}

async function getDailyNews(platform: string) {
  try {
    const response = await fetch(`https://orz.ai/api/v1/dailynews/?platform=${platform}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    if (!response.ok) {
      return `Error: Failed to fetch daily news. Status: ${response.status}`;
      throw new Error(`Daily News API error: ${response.statusText}`);
    }
    const data = await response.json();
    if (data.status !== '200') {
      throw new Error(`Daily News API error: ${data.msg}`);
    }
    const news = data.data.map((item: any) => `标题：${item.title}，链接：${item.url}`).join('\n');
    return news || '没有找到相关新闻。';
  } catch (error: any) {
    log(`Failed to get daily news: ${error.message}`);
    return '获取新闻失败。';
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { messages, systemPrompt, useSearch, useThinkingMode } = body;
  const modelId = 'Qwen/Qwen3-8B'; // Hardcode modelId for testing

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
    log('Missing environment variable: SILICONFLOW_API_KEY');
    return new NextResponse('API configuration is missing on the server.', { status: 500 });
  }

  const requestBody: any = {
    model: modelId,
    messages: finalMessages, // Use the truncated and sanitized messages
  };

  if (useSearch) {
    requestBody.tools = [searchTool, dailyNewsTool];
    requestBody.tool_choice = 'auto';
  }
  requestBody.stream = true; // Always stream

  try {
    const response = await fetch(`${apiBase}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      log(`SiliconFlow API error: ${errorText}`);
      return new Response(JSON.stringify({ error: 'SiliconFlow API error', details: errorText }), {
        status: response.status,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const stream = new ReadableStream({
      async start(controller) {
        const reader = response.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let toolCallMessage: any = null;
        let accumulatedToolCalls: any[] = [];

        const pipeThrough = async (stream: ReadableStream<Uint8Array>) => {
          const reader = stream.getReader();
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            controller.enqueue(value);
          }
        };

        let firstChunkProcessed = false;
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            const data = line.substring(6);
            if (data.trim() === '[DONE]') continue;

            try {
              const parsed = JSON.parse(data);
              const delta = parsed.choices?.[0]?.delta;

              if (delta?.tool_calls) {
                if (!firstChunkProcessed) {
                  firstChunkProcessed = true;
                  // This is the first sign of a tool call. We will handle it after the stream ends.
                  toolCallMessage = { role: 'assistant', content: null, tool_calls: [] };
                }
                accumulatedToolCalls.push(...delta.tool_calls);
              } else if (!toolCallMessage) {
                // Not a tool call, just a regular message, so enqueue it.
                controller.enqueue(new TextEncoder().encode(line + '\n'));
              }
            } catch (e) {
              // In case of partial JSON, just continue buffering.
            }
          }
        }

        // If a tool call was detected and accumulated
        if (toolCallMessage) {
          try {
            // Reconstruct the full tool_calls array
            toolCallMessage.tool_calls = accumulatedToolCalls.reduce((acc: any[], current: any) => {
              if (current.index !== undefined) {
                if (!acc[current.index]) {
                  acc[current.index] = { id: '', type: 'function', function: { name: '', arguments: '' } };
                }
                const tool = acc[current.index];
                if (current.id) tool.id = current.id;
                if (current.function?.name) tool.function.name = current.function.name;
                if (current.function?.arguments) tool.function.arguments += current.function.arguments;
              }
              return acc;
            }, []);
            
            log("--- Tool Call Detected ---");
            log(`Reconstructed Tool Call: ${JSON.stringify(toolCallMessage.tool_calls, null, 2)}`);

            const toolCall = toolCallMessage.tool_calls[0];
            
            log(`Raw Arguments String: ${toolCall.function.arguments}`);
            const toolArgs = JSON.parse(toolCall.function.arguments);
            const toolName = toolCall.function.name;

            let thinkingMessage = '思考中...';
            if (toolName === 'search') {
              thinkingMessage = `正在搜索: ${toolArgs.query}`;
            } else if (toolName === 'get_daily_news') {
              thinkingMessage = `正在获取每日新闻...`;
            }
            controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ thinking: thinkingMessage })}\n\n`));

            let toolResult;
            if (toolName === 'search') {
              toolResult = await performSearch(toolArgs.query);
            } else if (toolName === 'get_daily_news') {
              toolResult = await getDailyNews(toolArgs.platform);
            } else {
              toolResult = { error: `Unknown tool: ${toolName}` };
            }
            
            log(`Tool Result: ${JSON.stringify(toolResult)}`);

            const newMessages = [
              ...finalMessages,
              toolCallMessage,
              { role: 'tool', content: JSON.stringify(toolResult), tool_call_id: toolCall.id }
            ];

            const secondResponse = await fetch(`${apiBase}/chat/completions`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
              body: JSON.stringify({ ...requestBody, messages: newMessages, tools: undefined, tool_choice: undefined, stream: true }),
            });

            if (secondResponse.body) {
              await pipeThrough(secondResponse.body);
            }
          } catch (e: any) {
            log(`!!! ERROR during tool processing !!!: ${e.message}`);
            const errorMessage = `data: ${JSON.stringify({ error: "处理工具调用时出错" })}\n\n`;
            controller.enqueue(new TextEncoder().encode(errorMessage));
          }
        }

        controller.close();
      },
    });

    return new Response(stream, {
      headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' },
    });

  } catch (error: any) {
    log(`!!! Top-level error calling SiliconFlow API !!!: ${error.message}`);
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

export async function OPTIONS(request: Request) {
  const origin = request.headers.get('origin')

  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': origin || '*',
      'Access-Control-Allow-Methods': 'GET,OPTIONS,PATCH,DELETE,POST,PUT',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
}