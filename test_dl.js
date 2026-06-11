import fs from 'fs';

fetch('https://cobalt-production-6d38.up.railway.app/')
  .then(res => res.json())
  .catch(console.error);
