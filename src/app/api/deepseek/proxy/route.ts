import { NextResponse } from 'next/server';

function getKey(): string {
  let k = (process.env.DEEPSEEK_API_KEY || '').trim();
  if (k.toLowerCase().startsWith('bearer ')) k = k.slice(7).trim();
  return k;
}

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const { messages, max_tokens = 1000, temperature = 0.7, model = 'deepseek-chat' } = await req.json();
    const endpoint = process.env.DEEPSEEK_API_ENDPOINT || 'https://api.deepseek.com/v1/chat/completions';
    const key = getKey();

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({ model, messages, max_tokens, temperature, stream: false })
    });

    const text = await res.text();
    let data: any;
    try { data = JSON.parse(text); } catch { data = { raw: text }; }
    return NextResponse.json({ ok: res.ok, status: res.status, data });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'Unknown error' }, { status: 200 });
  }
}


