import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, Plugin} from 'vite';
import {GoogleGenAI} from '@google/genai';

function geminiServerPlugin(): Plugin {
  return {
    name: 'lumina-gemini-server',
    configureServer(server) {
      server.middlewares.use('/api/gemini/generate', async (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end(JSON.stringify({ error: 'Method not allowed' }));
          return;
        }

        let body = '';
        req.on('data', chunk => {
          body += chunk;
        });

        req.on('end', async () => {
          try {
            const { prompt, systemInstruction, responseMimeType, maxOutputTokens } = JSON.parse(body || '{}');
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

            // Robust candidate models list in priority order
            const candidateModels = [
              'gemini-2.5-flash',
              'gemini-3.8-flash',
              'gemini-flash-latest',
              'gemini-3.1-flash-lite',
              'gemini-3.1-pro-preview',
            ];
            let generatedText: string | undefined;
            let lastError: any = null;

            for (const modelName of candidateModels) {
              let attempts = 0;
              const maxAttempts = 2;

              while (attempts < maxAttempts) {
                attempts++;
                try {
                  const response = await ai.models.generateContent({
                    model: modelName,
                    contents: prompt,
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
                  const is503OrRateLimit = errMsg.includes('503') || errMsg.includes('high demand') || errMsg.includes('429') || errMsg.includes('UNAVAILABLE');

                  if (is503OrRateLimit && attempts < maxAttempts) {
                    // Jittered backoff before retry
                    await new Promise(resolve => setTimeout(resolve, 600 + Math.random() * 400));
                    continue;
                  }
                  // Break attempt loop to move to next candidate model
                  break;
                }
              }

              if (generatedText) {
                break;
              }
            }

            if (generatedText) {
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ text: generatedText }));
              return;
            }

            // If all models failed or are overloaded
            console.warn('All Gemini candidate models busy or encountered error:', lastError?.message || lastError);
            const message = lastError instanceof Error ? lastError.message : 'Gemini models currently at capacity';
            res.statusCode = 503;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: 'MODEL_OVERLOADED', message }));
          } catch (err: unknown) {
            console.error('Gemini Server Processing Error:', err);
            const message = err instanceof Error ? err.message : 'Unknown generation error';
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: message }));
          }
        });
      });
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), geminiServerPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});

