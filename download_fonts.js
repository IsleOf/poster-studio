import fs from 'fs';
import path from 'path';
import https from 'https';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const FONTS = [
    'Orbitron:wght@400;700',
    'Cinzel:wght@400;700',
    'Playfair+Display:wght@400;700',
    'Montserrat:wght@300;400;700',
    'Raleway:wght@300;400;700',
    'Great+Vibes',
    'Space+Mono:wght@400;700',
    'Sacramento',
    'Dancing+Script:wght@400;700',
    'Pinyon+Script',
    'Allura',
    'Petit+Formal+Script',
    'Alex+Brush',
    'Tinos:wght@400;700',
    'Didact+Gothic',
    'Parisienne'
];

const OUTPUT_DIR = path.join(__dirname, 'src', 'assets', 'fonts');
const CSS_OUTPUT_FILE = path.join(__dirname, 'src', 'assets', 'fonts', 'fonts.css');

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

const downloadFile = (url, dest) => {
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(dest);
        https.get(url, (response) => {
            response.pipe(file);
            file.on('finish', () => {
                file.close();
                resolve();
            });
        }).on('error', (err) => {
            fs.unlink(dest, () => { });
            reject(err);
        });
    });
};

const fetchCSS = (url) => {
    return new Promise((resolve, reject) => {
        https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36' } }, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => resolve(data));
        }).on('error', reject);
    });
};

async function main() {
    let combinedCSS = '';

    console.log('Starting font download...');

    for (const font of FONTS) {
        const fontName = font.split(':')[0].replace(/\+/g, ' ');
        console.log(`Processing ${fontName}...`);

        const cssUrl = `https://fonts.googleapis.com/css2?family=${font}&display=swap`;
        try {
            const css = await fetchCSS(cssUrl);

            // Parse CSS to find font files
            const fontFaceRegex = /@font-face\s*{([^}]*)}/g;
            let match;

            while ((match = fontFaceRegex.exec(css)) !== null) {
                const fontFaceBlock = match[1];
                const urlMatch = /url\(([^)]+)\)/.exec(fontFaceBlock);
                const weightMatch = /font-weight:\s*(\d+)/.exec(fontFaceBlock);
                const styleMatch = /font-style:\s*(\w+)/.exec(fontFaceBlock);

                if (urlMatch) {
                    const fontUrl = urlMatch[1].replace(/['"]/g, '');
                    const weight = weightMatch ? weightMatch[1] : '400';
                    const style = styleMatch ? styleMatch[1] : 'normal';
                    const filename = `${fontName.replace(/\s+/g, '-')}-${weight}-${style}.woff2`;
                    const localPath = path.join(OUTPUT_DIR, filename);

                    await downloadFile(fontUrl, localPath);
                    console.log(`  Downloaded ${filename}`);

                    // Add to local CSS
                    combinedCSS += `
@font-face {
  font-family: '${fontName}';
  font-style: ${style};
  font-weight: ${weight};
  font-display: swap;
  src: url('./${filename}') format('woff2');
}
`;
                }
            }
        } catch (error) {
            console.error(`Error processing ${fontName}:`, error);
        }
    }

    fs.writeFileSync(CSS_OUTPUT_FILE, combinedCSS);
    console.log(`\nAll fonts downloaded. CSS written to ${CSS_OUTPUT_FILE}`);
}

main();
