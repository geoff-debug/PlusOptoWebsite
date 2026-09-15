'use strict';

const fs = require('fs');
const path = require('path');

const SITE_URL = 'https://www.plusopto.com';
const BASE_DIR = __dirname;

// ---------------------------------------------------------------------------
// HTML helpers
// ---------------------------------------------------------------------------

function decodeHtmlEntities(str) {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&nbsp;/g, ' ');
}

function extractTitle(html) {
  const m = html.match(/<title>([\s\S]*?)<\/title>/i);
  if (!m) return '';
  return decodeHtmlEntities(m[1]).replace(/\s*[—–-]\s*Plus Opto\s*$/i, '').trim();
}

function extractDescription(html) {
  const m =
    html.match(/<meta\s+name="description"\s+content="([^"]*)"/i) ||
    html.match(/<meta\s+content="([^"]*)"\s+name="description"/i);
  return m ? decodeHtmlEntities(m[1]) : '';
}

function extractH1InHero(html) {
  const heroStart = html.indexOf('<div class="page-hero"');
  if (heroStart === -1) return '';
  const chunk = html.slice(heroStart, heroStart + 3000);
  const m = chunk.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  return m ? decodeHtmlEntities(m[1].replace(/<[^>]+>/g, '').trim()) : '';
}

function extractProductImage(html) {
  const m = html.match(/<img\b[^>]+class="[^"]*\bimg-fluid\b[^"]*"[^>]*>/i);
  if (!m) return '';
  const src = m[0].match(/\bsrc="([^"]+)"/);
  return src ? src[1] : '';
}

function extractBreadcrumbCategory(html) {
  const nav = html.match(/<nav\b[^>]*aria-label="breadcrumb"[^>]*>([\s\S]*?)<\/nav>/i);
  if (!nav) return null;
  const link = nav[1].match(/href="(category-[^"]+)"[^>]*>([^<]+)</i);
  if (!link) return null;
  return { href: link[1], name: decodeHtmlEntities(link[2].trim()) };
}

function extractBlogDate(html) {
  const m = html.match(/<time\b[^>]*datetime="(\d{4}-\d{2}-\d{2})"/i);
  return m ? m[1] : '';
}

// ---------------------------------------------------------------------------
// Page type classification
// ---------------------------------------------------------------------------

function getPageType(filename) {
  if (filename === 'index.html') return 'home';
  if (/^product-\w/.test(filename) && filename !== 'product.html') return 'product';
  if (/^category-\w/.test(filename) && filename !== 'category.html') return 'category';
  if (/^blog-\w/.test(filename) && filename !== 'blog.html') return 'blog';
  return 'other';
}

// ---------------------------------------------------------------------------
// JSON-LD builders
// ---------------------------------------------------------------------------

function buildHomeLD(description) {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': `${SITE_URL}/#organization`,
        name: 'Plus Opto',
        url: SITE_URL,
        logo: {
          '@type': 'ImageObject',
          url: `${SITE_URL}/assets/plusopto-logo.jpg`,
        },
        contactPoint: {
          '@type': 'ContactPoint',
          telephone: '+44-1942-671122',
          contactType: 'sales',
          email: 'sales@plusopto.co.uk',
        },
        address: {
          '@type': 'PostalAddress',
          addressCountry: 'GB',
        },
      },
      {
        '@type': 'WebSite',
        '@id': `${SITE_URL}/#website`,
        url: SITE_URL,
        name: 'Plus Opto',
        description,
        publisher: { '@id': `${SITE_URL}/#organization` },
        potentialAction: {
          '@type': 'SearchAction',
          target: {
            '@type': 'EntryPoint',
            urlTemplate: `${SITE_URL}/index.html?q={search_term_string}`,
          },
          'query-input': 'required name=search_term_string',
        },
      },
    ],
  };
}

function buildProductLD(filename, name, description, image, breadcrumbCategory) {
  const url = `${SITE_URL}/${filename}`;
  const imageUrl = image
    ? image.startsWith('http') ? image : `${SITE_URL}/${image}`
    : `${SITE_URL}/assets/plusopto-logo.jpg`;

  const breadcrumbItems = [
    { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE_URL}/index.html` },
    { '@type': 'ListItem', position: 2, name: 'Products', item: `${SITE_URL}/products.html` },
  ];

  if (breadcrumbCategory) {
    breadcrumbItems.push({
      '@type': 'ListItem',
      position: 3,
      name: breadcrumbCategory.name,
      item: `${SITE_URL}/${breadcrumbCategory.href}`,
    });
    breadcrumbItems.push({ '@type': 'ListItem', position: 4, name, item: url });
  } else {
    breadcrumbItems.push({ '@type': 'ListItem', position: 3, name, item: url });
  }

  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Product',
        '@id': `${url}#product`,
        name,
        description,
        image: imageUrl,
        brand: { '@type': 'Brand', name: 'Plus Opto' },
      },
      {
        '@type': 'BreadcrumbList',
        '@id': `${url}#breadcrumb`,
        itemListElement: breadcrumbItems,
      },
    ],
  };
}

function buildCategoryLD(filename, name) {
  const url = `${SITE_URL}/${filename}`;
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE_URL}/index.html` },
      { '@type': 'ListItem', position: 2, name: 'Products', item: `${SITE_URL}/products.html` },
      { '@type': 'ListItem', position: 3, name, item: url },
    ],
  };
}

function buildBlogLD(filename, title, description, datePublished) {
  const url = `${SITE_URL}/${filename}`;
  const org = {
    '@type': 'Organization',
    name: 'Plus Opto',
    url: SITE_URL,
    logo: { '@type': 'ImageObject', url: `${SITE_URL}/assets/plusopto-logo.jpg` },
  };
  const ld = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: title,
    description,
    author: org,
    publisher: org,
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
  };
  if (datePublished) ld.datePublished = datePublished;
  return ld;
}

// ---------------------------------------------------------------------------
// HTML injection helpers
// ---------------------------------------------------------------------------

function removeExistingLdJson(html) {
  return html.replace(/<script\s+type="application\/ld\+json"[\s\S]*?<\/script>\n?/gi, '');
}

function removeExistingCanonical(html) {
  return html.replace(/<link\s[^>]*rel="canonical"[^>]*\/?>\n?/gi, '');
}

function injectBeforeHeadClose(html, injection) {
  return html.replace(/<\/head>/i, `${injection}\n</head>`);
}

// ---------------------------------------------------------------------------
// Process a single file
// ---------------------------------------------------------------------------

function processFile(filename) {
  const filePath = path.join(BASE_DIR, filename);
  const stat = fs.statSync(filePath);
  let html = fs.readFileSync(filePath, 'utf8');

  const pageType = getPageType(filename);
  const url = `${SITE_URL}/${filename}`;
  const title = extractTitle(html);
  const description = extractDescription(html);

  html = removeExistingLdJson(html);
  html = removeExistingCanonical(html);

  let ldJson = null;

  if (pageType === 'home') {
    ldJson = buildHomeLD(description);
  } else if (pageType === 'product') {
    const name = extractH1InHero(html) || title;
    const image = extractProductImage(html);
    const breadcrumbCategory = extractBreadcrumbCategory(html);
    ldJson = buildProductLD(filename, name, description, image, breadcrumbCategory);
  } else if (pageType === 'category') {
    const name = extractH1InHero(html) || title;
    ldJson = buildCategoryLD(filename, name);
  } else if (pageType === 'blog') {
    const datePublished = extractBlogDate(html);
    ldJson = buildBlogLD(filename, title, description, datePublished);
  }

  const canonicalTag = `  <link rel="canonical" href="${url}" />`;
  let injection = canonicalTag;

  if (ldJson) {
    const ldScript = `  <script type="application/ld+json">\n${JSON.stringify(ldJson, null, 2)}\n  </script>`;
    injection = `${canonicalTag}\n${ldScript}`;
  }

  html = injectBeforeHeadClose(html, injection);
  fs.writeFileSync(filePath, html, 'utf8');

  return { filename, pageType, mtime: stat.mtime };
}

// ---------------------------------------------------------------------------
// Sitemap
// ---------------------------------------------------------------------------

function getSitemapMeta(filename) {
  if (filename === 'index.html') return { priority: '1.0', changefreq: 'weekly' };
  if (filename === 'products.html') return { priority: '0.9', changefreq: 'weekly' };
  if (filename.startsWith('category-')) return { priority: '0.7', changefreq: 'weekly' };
  if (filename.startsWith('product-')) return { priority: '0.8', changefreq: 'monthly' };
  if (filename.startsWith('blog-')) return { priority: '0.6', changefreq: 'monthly' };
  if (filename === 'about.html' || filename === 'contact.html') return { priority: '0.5', changefreq: 'yearly' };
  return { priority: '0.5', changefreq: 'monthly' };
}

function buildSitemap(pages) {
  const urls = pages
    .filter(p => p.filename !== '404.html')
    .map(p => {
      const { priority, changefreq } = getSitemapMeta(p.filename);
      const lastmod = p.mtime.toISOString().split('T')[0];
      return [
        '  <url>',
        `    <loc>${SITE_URL}/${p.filename}</loc>`,
        `    <lastmod>${lastmod}</lastmod>`,
        `    <changefreq>${changefreq}</changefreq>`,
        `    <priority>${priority}</priority>`,
        '  </url>',
      ].join('\n');
    });

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...urls,
    '</urlset>',
    '',
  ].join('\n');
}

function buildRobotsTxt() {
  return `User-agent: *
Allow: /

Sitemap: ${SITE_URL}/sitemap.xml
`;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main() {
  const htmlFiles = fs.readdirSync(BASE_DIR)
    .filter(f => f.endsWith('.html'))
    .sort();

  console.log(`Processing ${htmlFiles.length} HTML files…\n`);

  const pages = [];
  let errors = 0;

  for (const filename of htmlFiles) {
    try {
      const result = processFile(filename);
      pages.push(result);
      console.log(`  ✓  ${filename.padEnd(60)} [${result.pageType}]`);
    } catch (err) {
      console.error(`  ✗  ${filename}: ${err.message}`);
      errors++;
    }
  }

  fs.writeFileSync(path.join(BASE_DIR, 'sitemap.xml'), buildSitemap(pages), 'utf8');
  console.log('\n✓ sitemap.xml written');

  fs.writeFileSync(path.join(BASE_DIR, 'robots.txt'), buildRobotsTxt(), 'utf8');
  console.log('✓ robots.txt written');

  if (errors) {
    console.error(`\n${errors} file(s) had errors.`);
    process.exitCode = 1;
  } else {
    console.log(`\nAll ${pages.length} files processed successfully.`);
  }
}

main();
