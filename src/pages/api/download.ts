// @ts-nocheck
export const POST = async ({ request }) => {
  try {
    const body = await request.json();
    const { url, downloadMode, videoQuality } = body;

    if (!url) {
      return new Response(JSON.stringify({ status: 'error', error: { code: 'missing.url' } }), { status: 400 });
    }

    const isAudio = downloadMode === 'audio';

    // Use Cobalt API for downloading
    const cobaltResponse = await fetch('https://cobalt.tools/api/download', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: url,
        isAudioOnly: isAudio,
      }),
    });

    const data = await cobaltResponse.json();

    if (data.error) {
      console.error('Cobalt error:', data.error);
      return new Response(JSON.stringify({ status: 'error', error: { code: 'error.api.content.video.unavailable' } }), { status: 500 });
    }

    // Cobalt returns different response structures depending on the media type
    let downloadUrl = data.url;
    let filename = data.filename || 'download';

    // Handle nested response structures
    if (!downloadUrl && data.data) {
      downloadUrl = data.data.url || data.data[0]?.url;
      filename = data.data.filename || filename;
    }

    if (!downloadUrl) {
      return new Response(JSON.stringify({ status: 'error', error: { code: 'error.api.content.video.unavailable' } }), { status: 500 });
    }

    // Return the URL for the frontend to handle (works for both audio and video)
    return new Response(JSON.stringify({
      status: 'redirect',
      url: downloadUrl,
      filename: filename
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });

  } catch (error) {
    console.error('Download error:', error);
    return new Response(JSON.stringify({ status: 'error', error: { code: 'error.api.content.video.unavailable' } }), { status: 500 });
  }
};