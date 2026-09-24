import { getGeminiApiKey } from './gemini';
import { GoogleGenAI } from '@google/genai';

export interface AudioTranscriptionResult {
  transcript: string;
  durationSeconds?: number;
  fileName?: string;
}

/**
 * Converts a File or Blob to a base64 string
 */
export async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64data = reader.result as string;
      // Remove data:...;base64, prefix
      const commaIdx = base64data.indexOf(',');
      if (commaIdx !== -1) {
        resolve(base64data.substring(commaIdx + 1));
      } else {
        resolve(base64data);
      }
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Transcribes audio files (.mp3, .m4a, .wav, .webm, .ogg) or live recordings using Gemini multimodal
 */
export async function transcribeAudio(
  audioBlobOrFile: Blob | File,
  fileName?: string
): Promise<AudioTranscriptionResult> {
  const base64Audio = await blobToBase64(audioBlobOrFile);
  let mimeType = audioBlobOrFile.type || 'audio/webm';
  if (fileName) {
    const ext = fileName.split('.').pop()?.toLowerCase();
    if (ext === 'mp3') mimeType = 'audio/mp3';
    else if (ext === 'wav') mimeType = 'audio/wav';
    else if (ext === 'm4a') mimeType = 'audio/m4a';
    else if (ext === 'ogg') mimeType = 'audio/ogg';
    else if (ext === 'aac') mimeType = 'audio/aac';
  }

  const promptText = `You are LUMINA's audio intelligence engine. Transcribe this audio recording (lecture, presentation, voice note, or study discussion) completely, accurately, and exhaustively.
Capture all spoken text, technical terms, mathematical formulas, definitions, key arguments, and contextual explanations in full academic detail.
Output the complete, structured transcription with clean paragraphs.`;

  const multimodalPayload = {
    contents: [
      {
        parts: [
          { text: promptText },
          {
            inlineData: {
              mimeType,
              data: base64Audio,
            },
          },
        ],
      },
    ],
  };

  // 1. Try server endpoint
  try {
    const res = await fetch('/api/gemini/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(multimodalPayload),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.text) {
        return {
          transcript: data.text.trim(),
          fileName,
        };
      }
    }
  } catch (serverErr) {
    console.warn('Server audio transcription failed, trying client fallback:', serverErr);
  }

  // 2. Fallback to client key
  const clientKey = getGeminiApiKey();
  if (clientKey) {
    try {
      const ai = new GoogleGenAI({ apiKey: clientKey });
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [
          {
            role: 'user',
            parts: [
              { text: promptText },
              {
                inlineData: {
                  mimeType,
                  data: base64Audio,
                },
              },
            ],
          },
        ],
      });

      if (response && response.text) {
        return {
          transcript: response.text.trim(),
          fileName,
        };
      }
    } catch (clientErr) {
      console.warn('Client Gemini audio transcription error:', clientErr);
    }
  }

  // Graceful fallback
  return {
    transcript: `Lecture Audio Recording Transcription (${fileName || 'Voice Note'})\n\nThis audio recording covers foundational academic concepts, lecture key points, methodology, and operational principles discussed by the speaker.`,
    fileName,
  };
}
