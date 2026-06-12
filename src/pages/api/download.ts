// @ts-nocheck
export const POST = async ({ request }) => {
  try {
    const body = await request.json();
    const { url, downloadMode, videoQuality } = body;

    if (!url) {
      return new Response(JSON.stringify({ status: 'error', error: { code: 'missing.url' } }), { status: 400 });
    }

    const isAudio = downloadMode === 'audio';

    // Extract video ID from YouTube URL
    const videoIdMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    if (!videoIdMatch) {
      return new Response(JSON.stringify({ status: 'error', error: { code: 'invalid.url' } }), { status: 400 });
    }
    const videoId = videoIdMatch[1];

    // Use Invidious API (yewtu.be instance)
    // This is a well-known open-source YouTube frontend with an API
    const invidiousInstances = [
      'https://yewtu.be',
      'https://invidious.privacyredirect.com',
      'https://iv.nboeck.de'
    ];
    
    let videoData = null;
    let lastError = null;
    
    for (const instance of invidiousInstances) {
      try {
        const apiUrl = `${instance}/api/v1/videos/${videoId}`;
        const response = await fetch(apiUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; SnapLoad/1.0)',
            'Accept': 'application/json'
          }
        });
        
        if (response.ok) {
          videoData = await response.json();
          break;
        }
        lastError = `HTTP ${response.status}`;
      } catch (e) {
        lastError = e.message;
        continue;
      }
    }

    if (!videoData) {
      console.error('All Invidious instances failed:', lastError);
      return new Response(JSON.stringify({ status: 'error', error: { code: 'error.api.content.video.unavailable' } }), { status: 500 });
    }

    let downloadUrl = '';
    let filename = (videoData.title || 'download').replace(/[/\\?%*:|"<>]/g, '-') + (isAudio ? '.mp3' : '.mp4');

    if (isAudio) {
      // For audio, try to get the audio-only stream
      // Invidious provides adaptiveFormats with audio only
      const audioFormats = videoData.adaptiveFormats?.filter(f => f.type.startsWith('audio/')) || [];
      const bestAudio = audioFormats.sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0))[0];
      if (bestAudio?.url) {
        downloadUrl = bestAudio.url;
      } else {
        // Fallback: try to use the hlsManifestUrl
        if (videoData.hlsManifestUrl) {
          downloadUrl = videoData.hlsManifestUrl;
        }
      }
    } else {
      // For video, get the best video+audio format
      const videoFormats = videoData.formatStreams || videoData.adaptiveFormats?.filter(f => f.type.includes('video')) || [];
      
      // Sort by resolution (height) and prefer mp4
      videoFormats.sort((a, b) => {
        const heightA = a.height || 0;
        const heightB = b.height || 0;
        if (heightB !== heightA) return heightB - heightA;
        // Prefer mp4 over webm
        if (a.type?.includes('mp4') && !b.type?.includes('mp4')) return -1;
        if (!a.type?.includes('mp4') && b.type?.includes('mp4')) return 1;
        return 0;
      });
      
      const bestVideo = videoFormats[0];
      if (bestVideo?.url) {
        downloadUrl = bestVideo.url;
      }
    }

    if (!downloadUrl) {
      console.error('No download URL found in video data');
      return new Response(JSON.stringify({ status: 'error', error: { code: 'error.api.content.video.unavailable' } }), { status: 500 });
    }

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