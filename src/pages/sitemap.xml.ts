import type { APIRoute } from 'astro';

const pages = [
  '',
  'about',
  'contact',
  'privacy',
  'terms'
];

export const GET: APIRoute = ({ request, site }) => {
  const url = new URL(request.url);
  // Prefer the configured site from astro.config.mjs, fallback to request host
  const baseUrl = site ? site.toString().replace(/\/$/, '') : `${url.protocol}//${url.host}`;

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pages.map((page) => `  <url>
    <loc>${baseUrl}/${page}</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>${page === '' ? 'weekly' : 'monthly'}</changefreq>
    <priority>${page === '' ? '1.0' : '0.8'}</priority>
  </url>`).join('\n')}
</urlset>`;

  return new Response(sitemap, {
    headers: {
      'Content-Type': 'application/xml',
    },
  });
};
