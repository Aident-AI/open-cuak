import { load } from 'cheerio';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';

const basePath = './out';
const filenames = ['/app/popup.html', '/app/side-panel.html', '/app/api.html'] as const;

let scriptCount = 0;
const exec = (filename: string) => {
  const htmlPath = basePath + filename;
  const scriptsUri = '/assets/static/inline-scripts/';
  const scriptsPath = basePath + scriptsUri;

  if (!existsSync(scriptsPath)) mkdirSync(scriptsPath, { recursive: true });
  const htmlContent = readFileSync(htmlPath, 'utf8');
  const $ = load(htmlContent);

  $('script:not([src])').each((index, element) => {
    const scriptContent = $(element).html() || '';
    if (scriptContent.trim() === '') return;

    const filename = `script${scriptCount}.js`;
    writeFileSync(scriptsPath + filename, scriptContent);
    $(element).attr('src', `${scriptsUri}${filename}`).empty();
    scriptCount++;
  });

  writeFileSync(htmlPath, $.html());

  console.info(`Modified HTML saved to: ${htmlPath}`);
};

filenames.forEach(exec);
