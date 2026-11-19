import { NextResponse } from 'next/server';

const PYTHON_LLM_URL = process.env.PYTHON_LLM_SERVICE_URL || 'http://127.0.0.1:8000';
const AI_API_URL = process.env.AI_LOCAL_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta/openai';
const AI_MODEL = process.env.GEMINI_MODEL || process.env.AI_LOCAL_MODEL || 'gemini-3.5-flash-lite';

let activeChatKeyIdx = 0;
function getChatApiKeyPool(): string[] {
  const raw = [
    process.env.GEMINI_API_KEYS || '',
    process.env.GEMINI_API_KEY || '',
    process.env.AI_LOCAL_API_KEY || '',
  ].join(',');
  return Array.from(new Set(raw.split(',').map((k) => k.trim()).filter(Boolean)));
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const question = body.question || body.message || '';
    const province = body.province || body.destination || '';

    if (!question.trim()) {
      return NextResponse.json({ error: 'Question is required' }, { status: 400 });
    }

    // 1. Primary: Forward to dedicated Python LLM Microservice (Grounding with 646 real places)
    try {
      const pyRes = await fetch(`${PYTHON_LLM_URL}/api/v1/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Internal-Token': process.env.INTERNAL_TOKEN || '',
        },
        body: JSON.stringify({ question, province }),
      });

      if (pyRes.ok) {
        const pyData = await pyRes.json();
        return NextResponse.json({
          source: 'python-llm-service',
          answer: pyData.answer,
          grounded_destinations: pyData.grounded_destinations || [],
          model: pyData.model || 'vista-python-llm',
        });
      }
    } catch {
      // Python service not running, fallback to direct Claude API
    }

    // 2. Secondary: Fallback to direct Gemini OpenAI-compatible API with automatic key rotation
    const systemPrompt = `Bạn là VISTA AI Co-Pilot - Trợ lý Du lịch thông minh, vui nhộn và am hiểu văn hóa bản địa Việt Nam. Trả lời hóm hỉnh, chính xác, không bịa đặt thông tin. Món chè/ăn vặt Việt Nam chỉ từ 12k - 20k/ly.`;
    const keyPool = getChatApiKeyPool();
    for (let offset = 0; offset < keyPool.length; offset++) {
      const keyIdx = (activeChatKeyIdx + offset) % keyPool.length;
      const apiKey = keyPool[keyIdx];
      try {
        const aiRes = await fetch(`${AI_API_URL}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: AI_MODEL,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: question },
            ],
            max_tokens: 1500,
          }),
          signal: AbortSignal.timeout(20000),
        });

        if (aiRes.ok) {
          const aiData = await aiRes.json();
          const answer = aiData.choices?.[0]?.message?.content || aiData.choices?.[0]?.message?.reasoning || '';
          if (answer && answer.trim()) {
            activeChatKeyIdx = keyIdx;
            return NextResponse.json({
              source: 'direct-gemini-api',
              answer,
              grounded_destinations: [],
              model: AI_MODEL,
            });
          }
        }
        if ([401, 403, 429, 500, 502, 503, 504].includes(aiRes.status)) {
          activeChatKeyIdx = (keyIdx + 1) % keyPool.length;
          continue;
        }
      } catch {
        activeChatKeyIdx = (keyIdx + 1) % keyPool.length;
      }
    }

    return NextResponse.json({
      source: 'offline-rule-based',
      answer: `Chào bạn! Về câu hỏi tại ${province || 'điểm đến'}: Bạn nên ưu tiên ghé thăm các danh lam thắng cảnh biểu tượng và các quán đặc sản uy tín lâu năm để có trải nghiệm tuyệt vời nhất nhé!`,
      grounded_destinations: [],
    });
  } catch (err: any) {
    return NextResponse.json({ error: 'Internal Server Error', message: err.message }, { status: 500 });
  }
}

