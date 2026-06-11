import path from 'path';
import fs from 'fs';
import { Readable } from 'stream';

export const GET = async ({ request }) => {
  const url = new URL(request.url);
  const filename = url.searchParams.get('file');

  if (!filename) {
    return new Response('Missing file parameter', { status: 400 });
  }

  // Prevent directory traversal
  const sanitizedFilename = path.basename(filename);
  const filePath = path.join(process.cwd(), 'public', 'downloads', sanitizedFilename);

  if (!fs.existsSync(filePath)) {
    return new Response('File not found', { status: 404 });
  }

  const stat = fs.statSync(filePath);
  const fileStream = fs.createReadStream(filePath);
  
  // Convert Node.js Readable stream to Web ReadableStream
  const stream = Readable.toWeb(fileStream);

  const title = url.searchParams.get('title');
  const downloadName = title ? encodeURIComponent(title) : sanitizedFilename;
  const contentType = sanitizedFilename.endsWith('.mp3') ? 'audio/mpeg' : 'video/mp4';

  return new Response(stream, {
    status: 200,
    headers: {
      'Content-Type': contentType,
      'Content-Length': stat.size.toString(),
      'Content-Disposition': `attachment; filename="${downloadName}"; filename*=UTF-8''${downloadName}`,
    },
  });
};
