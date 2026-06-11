import type { APIRoute } from 'astro';

export const GET: APIRoute = ({ request, site }) => {
  const url = new URL(request.url);
  // Prefer the configured site from astro.config.mjs, fallback to request host
  const baseUrl = site ? site.toString().replace(/\/$/, '') : `${url.protocol}//${url.host}`;

  const robotsTxt = `User-agent: *
Allow: /

Sitemap: ${baseUrl}/sitemap.xml`;

  return new Response(robotsTxt, {
    headers: {
      'Content-Type': 'text/plain',
    },
  });
};
