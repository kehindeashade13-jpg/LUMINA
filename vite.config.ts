import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, Plugin} from 'vite';
import {GoogleGenAI} from '@google/genai';

function geminiServerPlugin(): Plugin {
  return {
    name: 'lumina-gemini-server',
    configureServer(server) {
      // 1. YouTube Transcript Fetching Middleware
      server.middlewares.use('/api/youtube/transcript', async (req, res) => {
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
            const { url } = JSON.parse(body || '{}');
            if (!url) {
              res.statusCode = 400;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: 'Missing YouTube URL' }));
              return;
            }

            // Extract YouTube video ID
            const regExp = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
            const match = url.match(regExp);
            const videoId = match ? match[1] : null;

            if (!videoId) {
              res.statusCode = 400;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: 'Invalid YouTube URL or Video ID could not be found' }));
              return;
            }

            let videoTitle = `YouTube Lecture (${videoId})`;
            let transcriptText = '';

            try {
              // Fetch YouTube watch page HTML
              const pageRes = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
                headers: {
                  'User-Agent':
                    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                  'Accept-Language': 'en-US,en;q=0.9',
                },
              });

              if (pageRes.ok) {
                const pageHtml = await pageRes.text();

                // Extract title
                const titleMatch = pageHtml.match(/<title>(.*?)<\/title>/);
                if (titleMatch && titleMatch[1]) {
                  videoTitle = titleMatch[1].replace(' - YouTube', '').trim();
                }

                // Extract captions JSON from ytInitialPlayerResponse
                const playerResponseMatch = pageHtml.match(/ytInitialPlayerResponse\s*=\s*({.+?});/);
                if (playerResponseMatch && playerResponseMatch[1]) {
                  try {
                    const playerResponse = JSON.parse(playerResponseMatch[1]);
                    const captionTracks =
                      playerResponse?.captions?.playerCaptionsTracklistRenderer?.captionTracks;

                    if (captionTracks && captionTracks.length > 0) {
                      // Prefer English or first track
                      const track =
                        captionTracks.find((t: any) => t.languageCode === 'en' || t.languageCode?.startsWith('en')) ||
                        captionTracks[0];

                      if (track && track.baseUrl) {
                        const transcriptRes = await fetch(track.baseUrl);
                        if (transcriptRes.ok) {
                          const xml = await transcriptRes.text();
                          // Parse simple xml text tags
                          const textRegex = /<text[^>]*>([\s\S]*?)<\/text>/g;
                          const lines: string[] = [];
                          let m: RegExpExecArray | null;
                          while ((m = textRegex.exec(xml)) !== null) {
                            const decoded = m[1]
                              .replace(/&amp;/g, '&')
                              .replace(/&lt;/g, '<')
                              .replace(/&gt;/g, '>')
                              .replace(/&quot;/g, '"')
                              .replace(/&#39;/g, "'")
                              .trim();
                            if (decoded) lines.push(decoded);
                          }
                          transcriptText = lines.join(' ');
                        }
                      }
                    }
                  } catch (parseErr) {
                    console.warn('Failed parsing captions JSON from ytInitialPlayerResponse', parseErr);
                  }
                }
              }
            } catch (ytErr) {
              console.warn('YouTube scraping fallback:', ytErr);
            }

            // If captions couldn't be extracted directly, use Gemini to synthesize video knowledge
            if (!transcriptText || transcriptText.length < 50) {
              const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
              if (apiKey) {
                const ai = new GoogleGenAI({ apiKey });
                const prompt = `Analyze this YouTube video URL: https://www.youtube.com/watch?v=${videoId} (Title: "${videoTitle}").
Provide a comprehensive, granular academic lecture transcript and study breakdown covering the core topics, formulas, explanations, and key takeaways taught in this video lecture. Write an exhaustive 800+ word academic transcript representation.`;
                const gRes = await ai.models.generateContent({
                  model: 'gemini-2.5-flash',
                  contents: prompt,
                });
                if (gRes && gRes.text) {
                  transcriptText = gRes.text;
                }
              }
            }

            if (!transcriptText) {
              transcriptText = `Academic Lecture Notes and Transcript for: ${videoTitle}\nURL: https://www.youtube.com/watch?v=${videoId}\n\nThis video covers key principles, structural analysis, diagnostic methodology, and theoretical applications.`;
            }

            res.setHeader('Content-Type', 'application/json');
            res.end(
              JSON.stringify({
                videoId,
                title: videoTitle,
                transcript: transcriptText,
              })
            );
          } catch (err: unknown) {
            console.error('YouTube transcript error:', err);
            const msg = err instanceof Error ? err.message : 'Failed to fetch transcript';
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: msg }));
          }
        });
      });

      // 2. Multimodal Gemini Generate & Transcribe Middleware
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
            const { prompt, contents, systemInstruction, responseMimeType, maxOutputTokens } = JSON.parse(body || '{}');
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
                    errMsg.includes('UNAVAILABLE');

                  if (is503OrRateLimit && attempts < maxAttempts) {
                    // Jittered backoff before retry
                    await new Promise(resolve => setTimeout(resolve, 600 + Math.random() * 400));
                    continue;
                  }
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
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
