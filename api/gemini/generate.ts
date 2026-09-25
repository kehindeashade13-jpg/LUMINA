import { GoogleGenAI } from '@google/genai';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Method not allowed' }));
    return;
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const { prompt, contents, systemInstruction, responseMimeType, maxOutputTokens } = body;
    const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;

    if (!apiKey) {
      res.statusCode = 400;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'Missing GEMINI_API_KEY in server environment' }));
      return;
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    const candidateModels = [
      'gemini-3.1-flash-lite',
      'gemini-flash-latest',
      'gemini-3.8-flash',
      'gemini-3.1-pro-preview',
    ];
    let generatedText: string | undefined;
    let lastError: any = null;

    const inputContents = contents || prompt;

    for (const modelName of candidateModels) {
      let attempts = 0;
      const maxAttempts = 2;

      while (attempts < maxAttempts) {
        attempts++;
        try {
          const response = await ai.models.generateContent({
            model: modelName,
            contents: inputContents,
            config: {
              systemInstruction: systemInstruction || undefined,
              responseMimeType: responseMimeType || undefined,
              maxOutputTokens: maxOutputTokens || 8192,
            },
          });

          if (response && response.text) {
            generatedText = response.text;
            break;
          }
        } catch (modelErr: any) {
          lastError = modelErr;
          const errMsg = modelErr?.message || String(modelErr);
          const is503OrRateLimit =
            errMsg.includes('503') ||
            errMsg.includes('high demand') ||
            errMsg.includes('429') ||
            errMsg.includes('RESOURCE_EXHAUSTED');

          if (is503OrRateLimit && attempts < maxAttempts) {
            await new Promise((resolve) => setTimeout(resolve, 600));
            continue;
          }
          break;
        }
      }

      if (generatedText) break;
    }

    if (generatedText) {
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ text: generatedText }));
      return;
    }

    res.statusCode = 503;
    res.setHeader('Content-Type', 'application/json');
    res.end(
      JSON.stringify({
        error: 'MODEL_OVERLOADED',
        message: lastError?.message || 'Gemini models currently at capacity. Please retry.',
      })
    );
  } catch (err: unknown) {
    console.error('API Gemini generate error:', err);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: err instanceof Error ? err.message : 'Server error' }));
  }
}
