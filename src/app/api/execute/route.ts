
import { NextRequest, NextResponse } from 'next/server';

const log = console.log;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { code } = body;

    if (!code || typeof code !== 'string') {
      return new NextResponse('Code is required and must be a string', { status: 400 });
    }

    log(`--- Received Code for Execution ---\n${code}\n--------------------`);

    // TODO: Replace this with actual Docker-based sandboxed execution
    // For now, we are just simulating the execution and returning a fixed result.
    // This proves the API endpoint is working.
    await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate network delay and execution time

    const result = {
      success: true,
      output: `(Simulated Execution) Output:\nHello from the REAL (but simulated) execution endpoint!`,
      error: null,
    };

    log(`--- Simulated Execution Result ---\n${JSON.stringify(result, null, 2)}\n---------------------------`);

    return NextResponse.json(result);

  } catch (error: any) {
    log(`!!! ERROR in /api/execute !!!: ${error.message}`);
    return new NextResponse(JSON.stringify({ error: 'Internal Server Error', details: error.message }), {
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
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
}