/**
 * AI 服務核心模組 - 支援 Google Gemini 與 OpenRouter 雙通道
 * 100% 純前端執行，金鑰由使用者自備並存於本地 localStorage (BYOK)
 */

export const AI_PROVIDERS = {
  GEMINI: 'gemini',
  OPENROUTER: 'openrouter',
};

// 預設熱門模型清單
export const GEMINI_DEFAULT_MODELS = [
  { id: 'gemini-3.5-flash-lite', name: 'Gemini 3.5 Flash Lite（推薦‧極速首選）' },
  { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash（次世代極速）' },
  { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash（穩定高效）' },
  { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro（大師級深度長文）' },
];

export const OPENROUTER_DEFAULT_MODELS = [
  { id: 'deepseek/deepseek-chat', name: 'DeepSeek Flash / V3（推薦‧高性價比解盤首選）' },
  { id: 'deepseek/deepseek-r1', name: 'DeepSeek R1（深度思考推理模型）' },
  { id: 'google/gemini-2.0-flash-001', name: 'Gemini 2.0 Flash 001 (OpenRouter)' },
  { id: 'anthropic/claude-3.5-sonnet', name: 'Claude 3.5 Sonnet（頂級文字功底）' },
  { id: 'meta-llama/llama-3.3-70b-instruct', name: 'Llama 3.3 70B Instruct' },
];

const STORAGE_KEYS = {
  PROVIDER: 'ask5_ai_provider',
  GEMINI_KEY: 'ask5_gemini_key',
  GEMINI_MODEL: 'ask5_gemini_model',
  OPENROUTER_KEY: 'ask5_openrouter_key',
  OPENROUTER_MODEL: 'ask5_openrouter_model',
};

/**
 * 讀取本地儲存的 AI 配置
 */
export function getAiConfig() {
  const provider = localStorage.getItem(STORAGE_KEYS.PROVIDER) || AI_PROVIDERS.GEMINI;
  const geminiKey = localStorage.getItem(STORAGE_KEYS.GEMINI_KEY) || '';
  const geminiModel = localStorage.getItem(STORAGE_KEYS.GEMINI_MODEL) || GEMINI_DEFAULT_MODELS[0].id;
  const openrouterKey = localStorage.getItem(STORAGE_KEYS.OPENROUTER_KEY) || '';
  const openrouterModel = localStorage.getItem(STORAGE_KEYS.OPENROUTER_MODEL) || OPENROUTER_DEFAULT_MODELS[0].id;

  return {
    provider,
    geminiKey,
    geminiModel,
    openrouterKey,
    openrouterModel,
    // 當前作用中的 key 與 model
    activeKey: provider === AI_PROVIDERS.GEMINI ? geminiKey : openrouterKey,
    activeModel: provider === AI_PROVIDERS.GEMINI ? geminiModel : openrouterModel,
  };
}

/**
 * 儲存 AI 配置到 localStorage
 */
export function saveAiConfig({ provider, geminiKey, geminiModel, openrouterKey, openrouterModel }) {
  if (provider !== undefined) localStorage.setItem(STORAGE_KEYS.PROVIDER, provider);
  if (geminiKey !== undefined) localStorage.setItem(STORAGE_KEYS.GEMINI_KEY, geminiKey.trim());
  if (geminiModel !== undefined) localStorage.setItem(STORAGE_KEYS.GEMINI_MODEL, geminiModel.trim());
  if (openrouterKey !== undefined) localStorage.setItem(STORAGE_KEYS.OPENROUTER_KEY, openrouterKey.trim());
  if (openrouterModel !== undefined) localStorage.setItem(STORAGE_KEYS.OPENROUTER_MODEL, openrouterModel.trim());
}

/**
 * 快速連線測試 (Ping)
 */
export function testAiConnection({ provider, apiKey, model }) {
  const pingMessage = [{ role: 'user', content: '請只回覆「連線成功」四個字' }];
  let testModel = model;

  return new Promise(async (resolve, reject) => {
    try {
      if (!apiKey || !apiKey.trim()) {
        throw new Error('未輸入 API Key，請先填入金鑰');
      }

      let receivedText = '';
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15秒超時

      await streamAiCompletion({
        provider,
        apiKey: apiKey.trim(),
        model: testModel,
        messages: pingMessage,
        signal: controller.signal,
        onChunk: (chunk) => {
          receivedText += chunk;
        },
      });

      clearTimeout(timeoutId);
      if (receivedText.length > 0) {
        resolve({ success: true, message: receivedText.trim() });
      } else {
        throw new Error('模型未回傳任何內容');
      }
    } catch (err) {
      if (err.name === 'AbortError') {
        reject(new Error('連線逾時（超過 15 秒未響應）'));
      } else {
        reject(err);
      }
    }
  });
}

/**
 * 流式呼叫 (Streaming Completion)
 * 支援 Google Gemini 與 OpenRouter (SSE 傳輸)
 * 
 * @param {Object} options
 * @param {string} options.provider - 'gemini' | 'openrouter'
 * @param {string} options.apiKey - API Key
 * @param {string} options.model - 模型 ID
 * @param {Array} options.messages - [{ role: 'system'|'user'|'assistant', content: string }]
 * @param {Function} options.onChunk - (delta: string, accumulatedText: string) => void
 * @param {AbortSignal} [options.signal] - 中斷信號
 */
export async function streamAiCompletion({
  provider,
  apiKey,
  model,
  messages = [],
  onChunk = () => {},
  signal,
}) {
  if (!apiKey || !apiKey.trim()) {
    throw new Error('未設定 API Key，請點擊右上角設定填入金鑰。');
  }

  if (provider === AI_PROVIDERS.GEMINI) {
    return streamGemini({ apiKey: apiKey.trim(), model, messages, onChunk, signal });
  } else if (provider === AI_PROVIDERS.OPENROUTER) {
    return streamOpenRouter({ apiKey: apiKey.trim(), model, messages, onChunk, signal });
  } else {
    throw new Error(`不支援的 AI 提供商: ${provider}`);
  }
}

/**
 * Gemini SSE 流式傳輸處理
 */
async function streamGemini({ apiKey, model, messages, onChunk, signal }) {
  // 分離 system prompt 與 user/assistant 對話內容
  let systemInstructionText = '';
  const contents = [];

  for (const m of messages) {
    if (m.role === 'system') {
      systemInstructionText += (systemInstructionText ? '\n\n' : '') + m.content;
    } else {
      contents.push({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      });
    }
  }

  // 若只有 system prompt，加一條提示
  if (contents.length === 0) {
    contents.push({ role: 'user', parts: [{ text: '請進行解讀。' }] });
  }

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:streamGenerateContent?key=${apiKey}&alt=sse`;

  const payload = {
    contents,
    generationConfig: {
      temperature: 0.7,
    },
  };

  if (systemInstructionText) {
    payload.systemInstruction = {
      parts: [{ text: systemInstructionText }],
    };
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal,
  });

  if (!response.ok) {
    let errorDetail = '';
    try {
      const errJson = await response.json();
      errorDetail = errJson.error?.message || JSON.stringify(errJson);
    } catch (_) {
      errorDetail = await response.text();
    }
    throw new Error(`Gemini API 錯誤 (${response.status}): ${errorDetail || response.statusText}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let accumulatedText = '';
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop(); // 保留最後尚未換行的片段

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || !trimmed.startsWith('data: ')) continue;
      const dataStr = trimmed.slice(6).trim();
      if (dataStr === '[DONE]') continue;

      try {
        const parsed = JSON.parse(dataStr);
        const textChunk = parsed.candidates?.[0]?.content?.parts?.[0]?.text || '';
        if (textChunk) {
          accumulatedText += textChunk;
          onChunk(textChunk, accumulatedText);
        }
      } catch (e) {
        // 部分 chunk 可能跨行或非完整 JSON，忽略解析錯誤
      }
    }
  }

  return accumulatedText;
}

/**
 * OpenRouter SSE 流式傳輸處理 (相容 OpenAI 規範)
 */
async function streamOpenRouter({ apiKey, model, messages, onChunk, signal }) {
  const endpoint = 'https://openrouter.ai/api/v1/chat/completions';

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://den3do.github.io/ask5/',
      'X-Title': '易數神策 ask5',
    },
    body: JSON.stringify({
      model: model,
      messages: messages,
      stream: true,
      temperature: 0.7,
    }),
    signal,
  });

  if (!response.ok) {
    let errorDetail = '';
    try {
      const errJson = await response.json();
      errorDetail = errJson.error?.message || JSON.stringify(errJson);
    } catch (_) {
      errorDetail = await response.text();
    }
    throw new Error(`OpenRouter API 錯誤 (${response.status}): ${errorDetail || response.statusText}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let accumulatedText = '';
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop();

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || !trimmed.startsWith('data: ')) continue;
      const dataStr = trimmed.slice(6).trim();
      if (dataStr === '[DONE]') continue;

      try {
        const parsed = JSON.parse(dataStr);
        const textChunk = parsed.choices?.[0]?.delta?.content || '';
        if (textChunk) {
          accumulatedText += textChunk;
          onChunk(textChunk, accumulatedText);
        }
      } catch (e) {
        // 忽略單個 chunk 解析失敗
      }
    }
  }

  return accumulatedText;
}
