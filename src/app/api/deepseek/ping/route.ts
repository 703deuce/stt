import { NextResponse } from 'next/server';

function getNormalizedKey(): string {
  let key = (process.env.DEEPSEEK_API_KEY || '').trim();
  if (key.toLowerCase().startsWith('bearer ')) key = key.slice(7).trim();
  return key;
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({} as any));
    const prompt: string = body?.prompt || 'ping';

    const endpoint = process.env.DEEPSEEK_API_ENDPOINT || 'https://api.deepseek.com/v1/chat/completions';
    const key = getNormalizedKey();
    const authHeader = key ? `Bearer ${key}` : '';

    // Safe previews for debugging
    const keyPreview = key ? `${key.substring(0, 6)}...` : 'MISSING';
    const headerPreview = authHeader ? `${authHeader.substring(0, 20)}...` : 'MISSING';

    console.log('[DeepSeek PING] Endpoint:', endpoint);
    console.log('[DeepSeek PING] Key exists:', !!key, 'Key preview:', keyPreview);
    console.log('[DeepSeek PING] Authorization header preview:', headerPreview);

    const dsRes = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: 'You are a helpful assistant.' },
          { role: 'user', content: prompt }
        ],
        max_tokens: 5,
        temperature: 0.1,
        stream: false
      })
    });

    const text = await dsRes.text();
    console.log('[DeepSeek PING] Status:', dsRes.status);
    console.log('[DeepSeek PING] Body preview:', text.substring(0, 300));

    return NextResponse.json({
      ok: dsRes.ok,
      status: dsRes.status,
      endpoint,
      keyPreview,
      headerStartsWith: authHeader.startsWith('Bearer sk-'),
      bodyPreview: text.substring(0, 300)
    }, { status: dsRes.ok ? 200 : 200 });
  } catch (err: any) {
    console.error('[DeepSeek PING] Error:', err);
    return NextResponse.json({ ok: false, error: err?.message || 'Unknown error' }, { status: 200 });
  }
}


