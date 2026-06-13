import type { APIRoute } from 'astro';

export const POST: APIRoute = async ({ request }) => {
  try {
    const { url, downloadMode } = await request.json();

    if (!url) {
      return new Response(JSON.stringify({ status: 'error', error: 'Missing URL' }), { status: 400 });
    }

    const apiKey = process.env.RAPIDAPI_KEY;
    const apiHost = '://rapidapi.com';

    const options = {
      method: 'GET',
      headers: {
        'x-rapidapi-key': apiKey || '',
        'x-rapidapi-host': apiHost
      }
    };

    // 1. Fetch video details from RapidAPI
    const apiResponse = await fetch(`https://${apiHost}/v2/video/details?url=${url}`, options);
    const data = await apiResponse.json();

    if (!data || !data.videos) {
      throw new Error('Could not fetch download links from API');
    }

    // 2. Select the download link based on mode
    const selectedLink = downloadMode === 'audio' 
      ? data.audios?.items?.[0]?.url 
      : data.videos?.items?.[0]?.url;

    if (!selectedLink) {
      throw new Error('Requested format not available');
    }

    return new Response(JSON.stringify({
      status: 'success',
      downloadUrl: selectedLink,
      title: data.title || 'video'
    }), { 
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('Download Error:', error.message);
    return new Response(JSON.stringify({ status: 'error', error: error.message }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
