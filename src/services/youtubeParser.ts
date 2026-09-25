/**
 * Service to extract transcripts and metadata from YouTube URLs
 */

export interface YouTubeExtractionResult {
  videoId: string;
  title: string;
  transcript: string;
  thumbnailUrl: string;
}

export function extractYouTubeVideoId(url: string): string | null {
  const regExp = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/|youtube\.com\/shorts\/)([^"&?\/\s]{11})/;
  const match = url.trim().match(regExp);
  return match ? match[1] : null;
}

export async function fetchYouTubeTranscript(url: string): Promise<YouTubeExtractionResult> {
  const videoId = extractYouTubeVideoId(url);
  if (!videoId) {
    throw new Error('Please enter a valid YouTube video URL (e.g., https://www.youtube.com/watch?v=...)');
  }

  const thumbnailUrl = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;

  try {
    const res = await fetch('/api/youtube/transcript', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    });

    const data = await res.json().catch(() => null);

    if (!res.ok || !data?.transcript || data.transcript.trim().length < 50) {
      throw new Error(
        'Unable to extract captions from this YouTube video. Please try a video with enabled subtitles/transcripts.'
      );
    }

    return {
      videoId,
      title: data.title || `YouTube Lecture (${videoId})`,
      transcript: data.transcript,
      thumbnailUrl,
    };
  } catch (err: unknown) {
    if (err instanceof Error && err.message.includes('valid YouTube video URL')) {
      throw err;
    }
    throw new Error(
      'Unable to extract captions from this YouTube video. Please try a video with enabled subtitles/transcripts.'
    );
  }
}
