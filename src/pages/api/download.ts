import type { APIRoute } from 'astro';

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { url, downloadMode } = body;

    if (!url) {
      return new Response(JSON.stringify({ status: 'error', error: { code: 'missing.url' } }), { status: 400 });
    }

    const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([^&?]+)/);
    const videoId = match ? match[1] : url;

    const isAudio = downloadMode === 'audio';

    const rapidApiUrl = `https://youtube-media-downloader.p.rapidapi.com/v2/video/details?videoId=${videoId}`;
    const rapidResponse = await fetch(rapidApiUrl, {
      headers: {
        'X-RapidAPI-Key': 'b539eee9c6mshcd49b074e8f957ep119158jsn101d0b49187c',
        'X-RapidAPI-Host': 'youtube-media-downloader.p.rapidapi.com'
      }
    });

    if (!rapidResponse.ok) {
      if (rapidResponse.status === 403) {
        throw new Error('The API service could not download this video. It is likely blocked, copyright-protected (like VEVO music videos), or age-restricted.');
      }
      throw new Error(`API returned ${rapidResponse.status}`);
    }

    const data = await rapidResponse.json();

    let downloadUrl = '';
    let extension = '';

    if (isAudio) {
      if (!data.audios || !data.audios.items || data.audios.items.length === 0) {
        throw new Error('No audio streams found');
      }
      const audios = data.audios.items;
      audios.sort((a, b) => b.size - a.size);
      downloadUrl = audios[0].url;
      extension = audios[0].extension || 'mp3';
    } else {
      if (!data.videos || !data.videos.items || data.videos.items.length === 0) {
        throw new Error('No video streams found');
      }
      const videos = data.videos.items.filter((v: any) => v.hasAudio);
      if (videos.length === 0) {
         data.videos.items.sort((a: any, b: any) => b.size - a.size);
         downloadUrl = data.videos.items[0].url;
         extension = data.videos.items[0].extension || 'mp4';
      } else {
         videos.sort((a: any, b: any) => b.size - a.size);
         downloadUrl = videos[0].url;
         extension = videos[0].extension || 'mp4';
      }
    }

    const title = data.title || 'download';
    const sanitizedTitle = title.replace(/[\/\\?%*:|"<>]/g, '-');
    const finalFilename = `${sanitizedTitle}.${extension}`;

    return new Response(JSON.stringify({
      status: 'redirect',
      url: downloadUrl,
      filename: finalFilename
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });

  } catch (error: any) {
    console.error('RapidAPI error:', error);
    return new Response(JSON.stringify({ 
      status: 'error', 
      error: { 
        code: 'error.api.content.video.unavailable', 
        message: error.message
      } 
    }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};
