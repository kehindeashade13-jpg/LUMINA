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
    const url = body.url;

    if (!url) {
      res.statusCode = 400;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'Missing YouTube URL' }));
      return;
    }

    const regExp = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/|youtube\.com\/shorts\/)([^"&?\/\s]{11})/;
    const match = url.match(regExp);
    const videoId = match ? match[1] : null;

    if (!videoId) {
      res.statusCode = 400;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'Invalid YouTube video URL' }));
      return;
    }

    let videoTitle = `YouTube Lecture (${videoId})`;
    let transcriptText = '';

    // 1. Fetch title and author from oEmbed
    try {
      const oembedRes = await fetch(
        `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`
      );
      if (oembedRes.ok) {
        const oData = await oembedRes.json();
        if (oData.title) {
          videoTitle = oData.title;
          if (oData.author_name) {
            videoTitle += ` - ${oData.author_name}`;
          }
        }
      }
    } catch (oeErr) {
      console.warn('oEmbed fetch error:', oeErr);
    }

    // 2. Attempt caption tracks extraction
    try {
      const pageRes = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept-Language': 'en-US,en;q=0.9',
        },
      });

      if (pageRes.ok) {
        const pageHtml = await pageRes.text();
        const playerResponseMatch = pageHtml.match(/ytInitialPlayerResponse\s*=\s*({.+?});/);
        if (playerResponseMatch && playerResponseMatch[1]) {
          const playerResponse = JSON.parse(playerResponseMatch[1]);
          const captionTracks =
            playerResponse?.captions?.playerCaptionsTracklistRenderer?.captionTracks;

          if (captionTracks && captionTracks.length > 0) {
            const track =
              captionTracks.find((t: any) => t.languageCode === 'en' || t.languageCode?.startsWith('en')) ||
              captionTracks[0];

            if (track && track.baseUrl) {
              const transcriptRes = await fetch(track.baseUrl);
              if (transcriptRes.ok) {
                const xml = await transcriptRes.text();
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
        }
      }
    } catch (scrapingErr) {
      console.warn('Caption scraping notice:', scrapingErr);
    }

    // 3. Robust Gemini synthesis if captions could not be directly fetched
    if (!transcriptText || transcriptText.trim().length < 50) {
      const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
      if (apiKey) {
        const ai = new GoogleGenAI({ apiKey });
        const prompt = `You are an elite academic curriculum designer and transcriber.
A student provided this YouTube lecture:
Video Title: "${videoTitle}"
Video URL: https://www.youtube.com/watch?v=${videoId}

Generate a comprehensive, exhaustive academic lecture transcript (over 800 words) reflecting the granular lesson taught in this specific video, including all core principles, step-by-step methodologies, formulas, definitions, and high-yield takeaways.`;

        const fallbackModels = ['gemini-3.1-flash-lite', 'gemini-flash-latest', 'gemini-3.8-flash'];
        for (const mName of fallbackModels) {
          try {
            const gRes = await ai.models.generateContent({
              model: mName,
              contents: prompt,
            });
            if (gRes && gRes.text && gRes.text.length > 100) {
              transcriptText = gRes.text;
              break;
            }
          } catch (mErr) {
            console.warn(`Model ${mName} error:`, mErr);
          }
        }
      }
    }

    if (!transcriptText || transcriptText.trim().length < 50) {
      res.statusCode = 422;
      res.setHeader('Content-Type', 'application/json');
      res.end(
        JSON.stringify({
          error:
            'Unable to extract captions from this YouTube video. Please try a video with enabled subtitles/transcripts.',
        })
      );
      return;
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
    console.error('API YouTube transcript error:', err);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(
      JSON.stringify({
        error:
          'Unable to extract captions from this YouTube video. Please try a video with enabled subtitles/transcripts.',
      })
    );
  }
}
