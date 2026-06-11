const fs = require('fs');
let content = fs.readFileSync('src/pages/index.astro', 'utf8');

content = content.replace(/text-caption-mono/g, 'text-xs font-mono');
content = content.replace(/text-display-xl/g, 'text-4xl md:text-5xl');
content = content.replace(/text-display-lg/g, 'text-3xl md:text-4xl');
content = content.replace(/text-body-md-strong/g, 'text-base font-semibold');
content = content.replace(/text-body-md/g, 'text-base');
content = content.replace(/text-body-sm/g, 'text-sm');

fs.writeFileSync('src/pages/index.astro', content);
console.log('Done');
