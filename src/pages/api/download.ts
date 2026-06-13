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

    let format = isAudio 
      ? 'bestaudio[ext=m4a]/bestaudio/best' 
      : 'bestvideo[vcodec^=avc1][ext=mp4]+bestaudio[ext=m4a]/bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best';
    
    if (isAudio && audioBitrate) {
      format = `bestaudio[abr<=${audioBitrate}][ext=m4a]/bestaudio[ext=m4a]/bestaudio/best`;
    } else if (!isAudio && videoQuality && videoQuality !== 'max') {
      format = `bestvideo[height<=${videoQuality}][vcodec^=avc1][ext=mp4]+bestaudio[ext=m4a]/bestvideo[height<=${videoQuality}][ext=mp4]+bestaudio[ext=m4a]/best[height<=${videoQuality}][ext=mp4]/best`;
    }

    const ytDlpPath = path.join(process.cwd(), 'node_modules', 'youtube-dl-exec', 'bin', 'yt-dlp');
    const downloadsDir = path.join(process.cwd(), 'public', 'downloads');
    
    if (!fs.existsSync(downloadsDir)) {
      fs.mkdirSync(downloadsDir, { recursive: true });
    }

    const uniqueId = crypto.randomBytes(8).toString('hex');
    const extension = isAudio ? 'mp3' : 'mp4';
    const filename = `download-${uniqueId}.${extension}`;
    const outputPath = path.join(downloadsDir, filename);

    let cookiesPath: string | null = null;
    if (process.env.YOUTUBE_COOKIES) {
      cookiesPath = path.join(downloadsDir, `cookies-${uniqueId}.txt`);
      // Ensure the cookies are properly written (replacing literal \n with actual newlines if needed)
      const cookiesContent = process.env.YOUTUBE_COOKIES.replace(/\\n/g, '\n');
      fs.writeFileSync(cookiesPath, cookiesContent);
    }
    
    const args = [
      '--no-warnings',
      '--no-check-certificate',
      '--js-runtimes',
      'node',
      ...(ffmpegStatic ? ['--ffmpeg-location', ffmpegStatic] : []),
      '--format',
      format,
      '-o',
      outputPath,
      url
    ];

    if (cookiesPath) {
      args.push('--cookies', cookiesPath);
    }

    if (isAudio) {
      args.push('--extract-audio', '--audio-format', 'mp3');
      if (audioBitrate) {
        args.push('--audio-quality', `${audioBitrate}K`);
      }
    } else {
      args.push('--merge-output-format', 'mp4');
    }

    // Bypass YouTube bot detection by using ios/android client
    args.push('--extractor-args', 'youtube:player_client=ios,android');
    args.push('--print', 'title', '--no-simulate');

    let title = 'download';
    try {
      const { stdout } = await execFileAsync(ytDlpPath, args);
      title = stdout.trim().split('\n').pop() || 'download';
    } finally {
      if (cookiesPath && fs.existsSync(cookiesPath)) {
        try { fs.unlinkSync(cookiesPath); } catch (e) {}
      }
    }

    const sanitizedTitle = title.replace(/[/\\?%*:|"<>]/g, '-');
    const finalFilename = `${sanitizedTitle}.${extension}`;

    return new Response(JSON.stringify({
      status: 'tunnel',
      url: `/api/serve?file=${encodeURIComponent(filename)}&title=${encodeURIComponent(finalFilename)}`,
      filename: finalFilename
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (error: any) {
    console.error('yt-dlp error:', error);
    return new Response(JSON.stringify({ 
      status: 'error', 
      error: { 
        code: 'error.api.content.video.unavailable', 
        message: error.message,
        stdout: error.stdout,
        stderr: error.stderr
      } 
    }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};
