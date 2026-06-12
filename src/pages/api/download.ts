import { execFile } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import ffmpegStatic from 'ffmpeg-static';

const execFileAsync = promisify(execFile);

export const POST = async ({ request }) => {
  try {
    const body = await request.json();
    const { url, downloadMode, videoQuality, audioBitrate } = body;

    if (!url) {
      return new Response(JSON.stringify({ status: 'error', error: { code: 'missing.url' } }), { status: 400 });
    }

    const isAudio = downloadMode === 'audio';

    // Use Cobalt API for downloading
    // Cobalt expects video quality as a number (e.g., 1080, 720)
    const cobaltBody: any = {
      url: url,
      isAudioOnly: isAudio,
    };
    
    if (!isAudio && videoQuality && videoQuality !== 'max') {
      // Extract number from quality like "1080" from "1080p Full HD"
      const qualityNum = parseInt(videoQuality.replace(/\D/g, ''));
      if (qualityNum) {
        cobaltBody.vQuality = qualityNum.toString();
      }
    }
    
    const cobaltResponse = await fetch('https://cobalt.tools/api/download', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(cobaltBody),
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
      console.error('No download URL found in Cobalt response');
      return new Response(JSON.stringify({ status: 'error', error: { code: 'error.api.content.video.unavailable' } }), { status: 500 });
    }

    // Return the URL for the frontend to handle directly
    return new Response(JSON.stringify({
      status: 'redirect',
      url: downloadUrl,
      filename: filename
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (error: any) {
    console.error('Download error:', error);
    return new Response(JSON.stringify({ 
      status: 'error', 
      error: { 
        code: 'error.api.content.video.unavailable', 
        message: error.message
      } 
    }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};
