import fs from 'fs';
import path from 'path';

console.log('=== STARTING CLEAN 01 CITUMANG SEO VALIDATION SUITE ===\n');

const ROOT_DIR = process.cwd();

const pages = [
  { file: 'index.html', path: '/', is404: false, titleKeyword: 'Clean 01 Citumang Pangandaran' },
  { file: 'harga/index.html', path: '/harga', is404: false, titleKeyword: 'Paket & Harga' },
  { file: 'lokasi/index.html', path: '/lokasi', is404: false, titleKeyword: 'Lokasi & Rute' },
  { file: 'galeri/index.html', path: '/galeri', is404: false, titleKeyword: 'Galeri Foto' },
  { file: 'faq/index.html', path: '/faq', is404: false, titleKeyword: 'FAQ' },
  { file: 'kebijakan-privasi/index.html', path: '/kebijakan-privasi', is404: false, titleKeyword: 'Kebijakan Privasi' },
  { file: 'syarat-ketentuan/index.html', path: '/syarat-ketentuan', is404: false, titleKeyword: 'Syarat & Ketentuan' },
  { file: '404.html', path: '/404', is404: true, titleKeyword: '404' }
];

let totalChecks = 0;
let passedChecks = 0;
let errors = [];

function check(desc, condition) {
  totalChecks++;
  if (condition) {
    passedChecks++;
    console.log(`  ✓ ${desc}`);
  } else {
    errors.push(desc);
    console.log(`  ✗ FAIL: ${desc}`);
  }
}

// 1. Audit Pages
for (const p of pages) {
  console.log(`\n--- Auditing ${p.file} ---`);
  const fullPath = path.join(ROOT_DIR, p.file);
  check(`File exists: ${p.file}`, fs.existsSync(fullPath));
  if (!fs.existsSync(fullPath)) continue;

  const html = fs.readFileSync(fullPath, 'utf-8');

  // Title tag
  const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
  check(`Title tag present`, !!titleMatch);
  if (titleMatch) {
    const title = titleMatch[1].replace(/&amp;/g, '&');
    check(`Title contains '${p.titleKeyword}'`, title.includes(p.titleKeyword));
    check(`Title length acceptable (${title.length} chars)`, title.length >= 25 && title.length <= 80);
  }

  // Meta Description
  const descMatch = html.match(/<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i);
  check(`Meta description present`, !!descMatch);
  if (descMatch) {
    const desc = descMatch[1];
    check(`Meta description length (${desc.length} chars)`, desc.length >= 70 && desc.length <= 180);
  }

  // Robots meta
  const robotsMatch = html.match(/<meta\s+name=["']robots["']\s+content=["']([^"']+)["']/i);
  check(`Robots meta tag present`, !!robotsMatch);
  if (robotsMatch) {
    if (p.is404) {
      check(`404 has noindex`, robotsMatch[1].includes('noindex'));
    } else {
      check(`Robots directive includes max-image-preview:large`, robotsMatch[1].includes('max-image-preview:large'));
      check(`Robots directive includes index, follow`, robotsMatch[1].includes('index') && robotsMatch[1].includes('follow'));
    }
  }

  // Canonical tag (for indexed pages)
  if (!p.is404) {
    const canonicalMatch = html.match(/<link\s+rel=["']canonical["']\s+href=["']([^"']+)["']/i);
    check(`Canonical tag present`, !!canonicalMatch);
    if (canonicalMatch) {
      check(`Canonical is absolute URL`, canonicalMatch[1].startsWith('https://citumangpangandaran.web.id'));
    }
  }

  // Heading H1 check (Exactly 1 H1 per page)
  const h1Matches = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/gi) || [];
  check(`Exactly 1 H1 tag (found ${h1Matches.length})`, h1Matches.length === 1);

  // Open Graph
  if (!p.is404) {
    check(`og:title present`, html.includes('property="og:title"'));
    check(`og:description present`, html.includes('property="og:description"'));
    check(`og:image present`, html.includes('property="og:image"'));
    check(`og:url present`, html.includes('property="og:url"'));
    check(`og:site_name present`, html.includes('property="og:site_name"'));
    check(`og:site_name has Clean 01 Citumang`, html.includes('content="Clean 01 Citumang Pangandaran"'));

    // Twitter
    check(`twitter:card present`, html.includes('name="twitter:card"'));
    check(`twitter:title present`, html.includes('name="twitter:title"'));
  }

  // JSON-LD Structured Data
  const jsonLdMatches = html.match(/<script\s+type=["']application\/ld\+json["']>([\s\S]*?)<\/script>/gi);
  if (!p.is404) {
    check(`JSON-LD script present`, !!jsonLdMatches && jsonLdMatches.length > 0);
    if (jsonLdMatches) {
      for (const tag of jsonLdMatches) {
        const rawJson = tag.replace(/<script[^>]*>/i, '').replace(/<\/script>/i, '').trim();
        try {
          const parsed = JSON.parse(rawJson);
          check(`JSON-LD parses cleanly`, !!parsed);
        } catch (e) {
          check(`JSON-LD valid JSON (${e.message})`, false);
        }
      }
    }
  }

  // Image alt attribute check (no empty alts)
  const imgMatches = html.match(/<img[^>]+>/gi) || [];
  let allImgsHaveAlt = true;
  for (const img of imgMatches) {
    if (!img.includes('alt=') || img.includes('alt=""') || img.includes("alt=''")) {
      allImgsHaveAlt = false;
      break;
    }
  }
  check(`All <img> tags have non-empty alt (scanned ${imgMatches.length} imgs)`, allImgsHaveAlt);
}

// 2. Specific checks for index.html
console.log('\n--- Auditing Homepage Identity & Provider Details ---');
const indexHtml = fs.readFileSync(path.join(ROOT_DIR, 'index.html'), 'utf-8');
check('index.html mentions Pinggih Priatna in text', indexHtml.includes('Pinggih Priatna'));
check('index.html contains data-bind="provider-name"', indexHtml.includes('data-bind="provider-name"'));
check('index.html contains data-bind="provider-role"', indexHtml.includes('data-bind="provider-role"'));
check('index.html contains data-bind="provider-desc"', indexHtml.includes('data-bind="provider-desc"'));
check('index.html JSON-LD includes Organization schema', indexHtml.includes('"@type": "Organization"'));
check('index.html JSON-LD includes Person schema', indexHtml.includes('"@type": "Person"'));
check('index.html JSON-LD includes TouristAttraction schema', indexHtml.includes('"@type": "TouristAttraction"'));
check('index.html JSON-LD includes LocalBusiness schema', indexHtml.includes('"@type": "LocalBusiness"'));
check('Official WhatsApp number (0812-2132-5957) present', indexHtml.includes('0812-2132-5957'));

// 3. Audit Sitemaps & Robots.txt
console.log('\n--- Auditing Sitemap & Robots.txt ---');
const sitemapPath = path.join(ROOT_DIR, 'public', 'sitemap.xml');
check('public/sitemap.xml exists', fs.existsSync(sitemapPath));
if (fs.existsSync(sitemapPath)) {
  const sm = fs.readFileSync(sitemapPath, 'utf-8');
  check('Sitemap has XML declaration', sm.startsWith('<?xml'));
  check('Sitemap has image namespace', sm.includes('xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"'));
  check('Sitemap maps homepage', sm.includes('<loc>https://citumangpangandaran.web.id/</loc>'));
  check('Sitemap maps /harga', sm.includes('<loc>https://citumangpangandaran.web.id/harga</loc>'));
  check('Sitemap maps /lokasi', sm.includes('<loc>https://citumangpangandaran.web.id/lokasi</loc>'));
  check('Sitemap maps /galeri', sm.includes('<loc>https://citumangpangandaran.web.id/galeri</loc>'));
  check('Sitemap maps /faq', sm.includes('<loc>https://citumangpangandaran.web.id/faq</loc>'));
  check('Sitemap has <image:image> tags', sm.includes('<image:image>') && sm.includes('<image:loc>'));
  check('Sitemap includes hero image', sm.includes('/images/citumang/hero.jpg'));
  check('Sitemap includes provider photo', sm.includes('/images/provider/provider.png'));
  check('Sitemap includes citumang-01 to citumang-10', sm.includes('citumang-01.jpg') && sm.includes('citumang-10.jpg'));
}

const robotsPath = path.join(ROOT_DIR, 'public', 'robots.txt');
check('public/robots.txt exists', fs.existsSync(robotsPath));
if (fs.existsSync(robotsPath)) {
  const rb = fs.readFileSync(robotsPath, 'utf-8');
  check('robots.txt allows all crawlers', rb.includes('User-agent: *') && rb.includes('Allow: /'));
  check('robots.txt disallows /admin', rb.includes('Disallow: /admin'));
  check('robots.txt points to sitemap', rb.includes('Sitemap: https://citumangpangandaran.web.id/sitemap.xml'));
}

console.log(`\n==============================================`);
console.log(`TOTAL CHECKS: ${totalChecks}`);
console.log(`PASSED: ${passedChecks}`);
console.log(`FAILED: ${errors.length}`);
console.log(`SCORE: ${((passedChecks / totalChecks) * 100).toFixed(1)}%`);
console.log(`==============================================\n`);

if (errors.length > 0) {
  console.error('FAILURES:');
  errors.forEach(e => console.error(`  - ${e}`));
  process.exit(1);
} else {
  console.log('ALL SEO AUDIT CRITERIA PASSED 100%!');
  process.exit(0);
}
