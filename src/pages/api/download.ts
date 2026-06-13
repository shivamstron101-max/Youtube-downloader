import { NextRequest } from 'next/server';

export const POST = async (request: NextRequest) => {
  try {
    const { url, downloadMode } = await request.json();

    if (!url) {
      return new Response(JSON.stringify({ status: 'error', error: 'Missing URL' }), { status: 400 });
    }

    const apiKey = process.env.RAPIDAPI_KEY;
    const apiHost = 'youtube-media-downloader.p.rapidapi.com';

    // 1. Get the video details and download links from RapidAPI
    const options = {
      method: 'GET',
      headers: {
        'x-rapidapi-key': apiKey || '',
        'x-rapidapi-host': apiHost
      }
    };

    const apiResponse = await fetch(`https://${apiHost}/v2/video/details?url=${url}`, options);
    const data = await apiResponse.json();

    if (!data || !data.videos) {
      throw new Error('Could not fetch download links from API');
    }

    // 2. Select the best link based on your downloadMode (audio or video)
    // This logic assumes you want the highest quality available
    const selectedLink = downloadMode === 'audio' 
      ? data.audios?.items[0]?.url 
      : data.videos?.items[0]?.url;

    if (!selectedLink) {
      throw new Error('Requested format not available for this video');
    }

    // 3. Return the direct download link to your frontend
    return new Response(JSON.stringify({
      status: 'success',
      downloadUrl: selectedLink,
      title: data.title || 'video'
    }), { status: 200 });

  } catch (error: any) {
    console.error('Download Error:', error.message);
    return new Response(JSON.stringify({ status: 'error', error: error.message }), { status: 500 });
  }
};
