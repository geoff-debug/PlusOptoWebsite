#!/usr/bin/env node
/**
 * Plus Opto — Static Site Generator
 * ===================================
 * Fetches real data from Supabase, downloads all images, and builds
 * fully-populated Bootstrap 5 static HTML pages into static/
 *
 * Usage:
 *   node static/generate.js
 *
 * Prerequisites:
 *   npm install (project deps already include @supabase/supabase-js)
 *   - OR -  npm install @supabase/supabase-js node-fetch  (standalone)
 *
 * The script reads credentials from .env in the project root, or you
 * can hardcode them in the CONFIG block below.
 */

'use strict';

const fs            = require('fs');
const path          = require('path');
const https         = require('https');
const http          = require('http');
const { execFileSync } = require('child_process');

// curl-based fetch shim (Node's built-in fetch cannot resolve external DNS here)
function curlFetch(url, options = {}) {
  const args = ['-sS', '--max-time', '20', url];
  if (options.headers) {
    for (const [k, v] of Object.entries(options.headers)) {
      args.push('-H', `${k}: ${v}`);
    }
  }
  const body = execFileSync('curl', args, { maxBuffer: 32 * 1024 * 1024 }).toString();
  return { ok: true, json: () => JSON.parse(body), text: () => body };
}

// curl-based file download
function curlDownload(url, dest) {
  execFileSync('curl', ['-sS', '--max-time', '30', '-L', '-o', dest, url], { maxBuffer: 32 * 1024 * 1024 });
}

// ─── CONFIG ─────────────────────────────────────────────────────────────────
// Load from .env if available
function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env');
  if (fs.existsSync(envPath)) {
    fs.readFileSync(envPath, 'utf8').split('\n').forEach(line => {
      const m = line.match(/^([A-Z0-9_]+)\s*=\s*"?(.+?)"?\s*$/);
      if (m) process.env[m[1]] = m[2];
    });
  }
}
loadEnv();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://azydumprzlsyqnoxmmhe.supabase.co';
const SUPABASE_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF6eWR1bXByemxzeXFub3htbWhlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMyMzU3NjMsImV4cCI6MjA4ODgxMTc2M30.Xiyn20geN54QuWz58JJM3_8eXvn1kVlya8wXM1R07UY';

const OUT_DIR    = path.join(__dirname);          // static/
const ASSETS_DIR = path.join(OUT_DIR, 'assets'); // static/assets/
const CSS_PATH   = 'css/plusopto.css';
const JS_PATH    = 'js/main.js';
const BS5_CSS    = 'https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css';
const BS5_JS     = 'https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js';
const BI_CSS     = 'https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css';

// ─── MOCK DATA (used when Supabase is unreachable) ───────────────────────────
const MOCK_DATA = {
  product_categories: [
    { id: 1, name: 'LED Components', slug: 'led-components', description: 'Discrete LEDs, LED clusters and LED arrays for all applications.', image_url: null, sort_order: 1 },
    { id: 2, name: 'LCD Modules', slug: 'lcd-modules', description: 'Character and graphic LCD modules with a variety of interfaces.', image_url: null, sort_order: 2 },
    { id: 3, name: 'LED Drivers', slug: 'led-drivers', description: 'Constant-current LED driver ICs and modules for reliable illumination.', image_url: null, sort_order: 3 },
    { id: 4, name: 'Displays & Indicators', slug: 'displays-indicators', description: '7-segment displays, dot-matrix panels and industrial indicators.', image_url: null, sort_order: 4 },
    { id: 5, name: 'Fibre Optics', slug: 'fibre-optics', description: 'Plastic and glass fibre optic cables, connectors and transceivers.', image_url: null, sort_order: 5 },
    { id: 6, name: 'Optocouplers', slug: 'optocouplers', description: 'Phototransistors, photodarlingtons and solid-state relays for isolation.', image_url: null, sort_order: 6 },
  ],
  products: [
    // LED Components
    { id: 101, name: 'High-Brightness Red LED 5mm', slug: 'hb-red-led-5mm', category_id: 1, published: true, featured: true, sort_order: 1, image_url: null, short_description: 'High-intensity 5mm through-hole LED, 620–625 nm, 15 000 mcd typical.', description: 'A high-brightness red LED in the classic 5 mm T1¾ package. Suitable for indicators, signage and backlighting.\n\nOperating voltage: 2.0–2.4 V. Maximum forward current: 30 mA.', specifications: { 'Wavelength': '620–625 nm', 'Luminous Intensity': '15 000 mcd', 'Forward Voltage': '2.0–2.4 V', 'Max Forward Current': '30 mA', 'Viewing Angle': '15°', 'Package': '5 mm T1¾', 'Operating Temperature': '-40 °C to +85 °C' }, datasheet_url: null },
    { id: 102, name: 'High-Brightness Green LED 5mm', slug: 'hb-green-led-5mm', category_id: 1, published: true, featured: false, sort_order: 2, image_url: null, short_description: 'High-intensity 5mm through-hole LED, 520–525 nm, 20 000 mcd typical.', description: 'A high-brightness green LED in the classic 5 mm T1¾ package.\n\nOperating voltage: 3.0–3.4 V. Maximum forward current: 30 mA.', specifications: { 'Wavelength': '520–525 nm', 'Luminous Intensity': '20 000 mcd', 'Forward Voltage': '3.0–3.4 V', 'Max Forward Current': '30 mA', 'Viewing Angle': '15°', 'Package': '5 mm T1¾' }, datasheet_url: null },
    { id: 103, name: 'SMD LED 0603 White', slug: 'smd-led-0603-white', category_id: 1, published: true, featured: true, sort_order: 3, image_url: null, short_description: 'Ultra-compact 0603 SMD white LED, 6000 K, ideal for tight PCB layouts.', description: 'A miniature 0603 surface-mount white LED for space-constrained designs.\n\nForward voltage 3.0–3.4 V, max current 20 mA, luminous intensity 200 mcd.', specifications: { 'Colour Temperature': '6000 K', 'Luminous Intensity': '200 mcd', 'Forward Voltage': '3.0–3.4 V', 'Max Forward Current': '20 mA', 'Package': '0603 SMD', 'Viewing Angle': '120°' }, datasheet_url: null },
    // LCD Modules
    { id: 201, name: '16×2 Character LCD Module', slug: '16x2-character-lcd', category_id: 2, published: true, featured: true, sort_order: 1, image_url: null, short_description: 'Alphanumeric 16-character × 2-line display with HD44780-compatible controller.', description: 'Industry-standard 16×2 character LCD with built-in HD44780-compatible controller.\n\nAvailable with white, green or amber backlighting. Parallel or I²C interface.', specifications: { 'Display Format': '16 × 2 characters', 'Controller': 'HD44780 compatible', 'Interface': 'Parallel / I²C', 'Supply Voltage': '5 V', 'Backlight': 'LED (white/green/amber)', 'Operating Temperature': '0 °C to +50 °C', 'Dimensions': '80 × 36 × 12 mm' }, datasheet_url: null },
    { id: 202, name: '20×4 Character LCD Module', slug: '20x4-character-lcd', category_id: 2, published: true, featured: false, sort_order: 2, image_url: null, short_description: '20-character × 4-line display, HD44780 compatible, with LED backlight.', description: 'Large-format 20×4 character LCD ideal for industrial HMI panels.\n\nParallel interface, 5 V supply, wide operating temperature range.', specifications: { 'Display Format': '20 × 4 characters', 'Controller': 'HD44780 compatible', 'Interface': 'Parallel', 'Supply Voltage': '5 V', 'Backlight': 'LED white', 'Operating Temperature': '-20 °C to +70 °C' }, datasheet_url: null },
    // LED Drivers
    { id: 301, name: 'AL8840 Constant-Current LED Driver', slug: 'al8840-led-driver', category_id: 3, published: true, featured: false, sort_order: 1, image_url: null, short_description: 'Buck DC/DC LED driver IC, 4.5–40 V input, up to 1.5 A output current.', description: 'The AL8840 is a hysteretic buck converter for driving LED strings.\n\nInput range 4.5–40 V, adjustable output current up to 1.5 A via external resistor.', specifications: { 'Input Voltage': '4.5–40 V', 'Output Current': 'Up to 1.5 A', 'Topology': 'Hysteretic Buck', 'Dimming': 'PWM or Analog', 'Package': 'SOT-23-5', 'Efficiency': 'Up to 95%' }, datasheet_url: null },
    { id: 302, name: 'CL6807 8-Channel LED Driver', slug: 'cl6807-led-driver', category_id: 3, published: true, featured: false, sort_order: 2, image_url: null, short_description: '8-channel constant-current LED driver, 5–17 V, 60 mA per channel.', description: 'CL6807 provides eight matched constant-current sinks for uniform LED brightness.\n\nOperates from 5–17 V, each channel programmable up to 60 mA.', specifications: { 'Channels': '8', 'Input Voltage': '5–17 V', 'Max Current/Channel': '60 mA', 'Current Accuracy': '±1.5%', 'Interface': 'SPI', 'Package': 'SOP-24' }, datasheet_url: null },
    // Displays & Indicators
    { id: 401, name: '0.56" 7-Segment Red LED Display', slug: '056-7seg-red', category_id: 4, published: true, featured: false, sort_order: 1, image_url: null, short_description: 'Single-digit 0.56-inch 7-segment display, common cathode, red.', description: 'Classic single-digit 7-segment LED display in a 0.56-inch digit height.\n\nCommon cathode configuration, red emission at 635 nm.', specifications: { 'Digit Height': '0.56 inch', 'Colour': 'Red (635 nm)', 'Configuration': 'Common Cathode', 'Forward Voltage': '2.0 V', 'Max Current/Segment': '20 mA', 'Package': 'DIP-10' }, datasheet_url: null },
    // Fibre Optics
    { id: 501, name: 'POF Plastic Optical Fibre Cable 1m', slug: 'pof-cable-1m', category_id: 5, published: true, featured: false, sort_order: 1, image_url: null, short_description: 'Step-index POF cable, 1 mm core, 1 m length, SMA905 connectors.', description: 'Step-index plastic optical fibre cable suitable for short-range data and illumination.\n\n1 mm PMMA core, 1 m length, SMA905 connectors on both ends.', specifications: { 'Core Diameter': '1 mm', 'Material': 'PMMA (Step-index)', 'Length': '1 m', 'Connector': 'SMA905 × 2', 'Attenuation': '<0.2 dB/m @ 650 nm', 'Bandwidth': '10 MHz·km' }, datasheet_url: null },
    // Optocouplers
    { id: 601, name: 'PC817 Optocoupler', slug: 'pc817-optocoupler', category_id: 6, published: true, featured: false, sort_order: 1, image_url: null, short_description: 'General-purpose phototransistor optocoupler, 1-channel, DIP-4, 5 kV isolation.', description: 'The PC817 is a widely-used single-channel optocoupler with phototransistor output.\n\n5 kV isolation voltage, CTR 50–300%, suitable for signal isolation and feedback control.', specifications: { 'Channels': '1', 'Isolation Voltage': '5 kV', 'CTR': '50–300%', 'Output': 'Phototransistor', 'Package': 'DIP-4', 'Max Input Current': '50 mA', 'Operating Temperature': '-30 °C to +100 °C' }, datasheet_url: null },
  ],
  blog_posts: [
    { id: 1, title: 'Choosing the Right LED Driver for Your Application', slug: 'choosing-led-driver', published: true, published_at: '2024-11-15T09:00:00Z', excerpt: 'A practical guide to selecting constant-current LED drivers for industrial and consumer lighting designs.', featured_image: null, content: '<p>Selecting the correct LED driver is critical to achieving reliable, efficient illumination. In this article we walk through the key parameters to consider: input voltage range, output current accuracy, dimming capability and thermal management.</p><h2>Input Voltage Range</h2><p>Always ensure the driver input range comfortably covers your supply rail, including any transients. For automotive applications look for drivers tolerating 40 V or more.</p><h2>Constant Current vs Constant Voltage</h2><p>LEDs are current-controlled devices — a constant-current driver provides the most stable brightness. Constant-voltage supplies require an external current-limiting resistor or a secondary driver stage.</p><h2>Dimming Methods</h2><p>PWM dimming maintains colour consistency at reduced brightness, while analogue dimming can shift the colour point. For colour-critical applications always prefer PWM.</p>', content_blocks: null },
    { id: 2, title: 'Introduction to Plastic Optical Fibre', slug: 'intro-plastic-optical-fibre', published: true, published_at: '2024-10-03T09:00:00Z', excerpt: 'Discover how POF technology provides a low-cost, easy-to-install alternative to glass fibre for short-range links.', featured_image: null, content: '<p>Plastic Optical Fibre (POF) uses a PMMA core to guide visible light over short distances — typically up to 50 m. Unlike glass fibre, POF can be cut and terminated with simple tools, making it ideal for industrial automation and home networking.</p><h2>Advantages of POF</h2><ul><li>No specialist cleaving tools required</li><li>Large core diameter simplifies alignment</li><li>Immune to electromagnetic interference</li><li>Lightweight and flexible</li></ul><h2>Typical Applications</h2><p>Industrial fieldbus (PROFIBUS, CAN), automotive MOST networks, home audio/video (TOSLINK) and decorative lighting are all common POF application areas.</p>', content_blocks: null },
  ],
  pages: [],
};

function getMockRows(table, params) {
  let rows = (MOCK_DATA[table] || []).slice();

  // Apply simple filters from params string
  const filters = new URLSearchParams(params);

  // published=eq.true
  if (filters.get('published') === 'eq.true') {
    rows = rows.filter(r => r.published === true);
  }
  // slug=eq.<value>
  const slugFilter = filters.get('slug');
  if (slugFilter && slugFilter.startsWith('eq.')) {
    const val = slugFilter.slice(3);
    rows = rows.filter(r => r.slug === val);
  }
  // order (basic)
  const order = filters.get('order');
  if (order) {
    const [field, dir] = order.split('.');
    rows.sort((a, b) => {
      if (a[field] < b[field]) return dir === 'desc' ? 1 : -1;
      if (a[field] > b[field]) return dir === 'desc' ? -1 : 1;
      return 0;
    });
  }
  return rows;
}

// ─── SUPABASE FETCH ──────────────────────────────────────────────────────────
async function sbFetch(table, params = '') {
  const url = `${SUPABASE_URL}/rest/v1/${table}?${params}`;
  try {
    const res = curlFetch(url, {
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        Accept: 'application/json',
      },
    });
    if (!res.ok) throw new Error(`Supabase error on ${table}`);
    return res.json();
  } catch (e) {
    console.warn(`  ⚠ Supabase unreachable (${e.message}), using mock data for "${table}"`);
    return getMockRows(table, params);
  }
}

// ─── IMAGE DOWNLOAD ──────────────────────────────────────────────────────────
/**
 * Download a remote URL to local path. Returns the relative asset path.
 * Skips download if file already exists.
 */
async function downloadImage(remoteUrl, fallback = null) {
  if (!remoteUrl) return fallback;

  // Already a relative local path
  if (!remoteUrl.startsWith('http')) return remoteUrl;

  try {
    const urlObj = new URL(remoteUrl);
    // Derive a clean filename from the URL path
    let filename = path.basename(urlObj.pathname).split('?')[0];
    if (!filename || filename === '/') filename = 'image-' + Date.now() + '.jpg';

    // Avoid duplicates: if the same file was already saved, reuse
    const destPath = path.join(ASSETS_DIR, filename);
    const relPath  = `assets/${filename}`;

    if (fs.existsSync(destPath)) {
      return relPath;
    }

    curlDownload(remoteUrl, destPath);
    console.log(`  ↓ ${filename}`);
    return relPath;
  } catch (e) {
    console.warn(`  ⚠ Could not download ${remoteUrl}: ${e.message}`);
    // Keep the original remote URL so it loads correctly in production
    return remoteUrl || fallback || 'assets/placeholder.jpg';
  }
}

// ─── HTML HELPERS ─────────────────────────────────────────────────────────────
const escape = (s) =>
  String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');

function head(title, desc = '') {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escape(title)} — Plus Opto</title>${desc ? `\n  <meta name="description" content="${escape(desc)}" />` : ''}
  <link rel="stylesheet" href="${BS5_CSS}" />
  <link rel="stylesheet" href="${BI_CSS}" />
  <link rel="stylesheet" href="${CSS_PATH}" />
  <link rel="icon" href="assets/plusopto-logo.jpg" />
</head>
<body>`;
}

function topbar() {
  return `
  <!-- TOP BAR -->
  <div class="topbar py-2">
    <div class="container d-flex align-items-center justify-content-between">
      <div class="d-flex align-items-center gap-3">
        <a href="tel:+441942671122" class="d-flex align-items-center gap-2">
          <i class="bi bi-telephone-fill" style="font-size:.8rem;"></i>+44 (0) 1942 671122
        </a>
        <a href="mailto:sales@plusopto.co.uk" class="topbar-email d-none d-sm-flex align-items-center gap-2">
          <i class="bi bi-envelope-fill" style="font-size:.8rem;"></i>sales@plusopto.co.uk
        </a>
      </div>
      <a href="contact.html" class="btn btn-teal btn-sm px-3 py-1" style="font-size:.8rem;">Request a Quote</a>
    </div>
  </div>`;
}

function navbar(active = '') {
  const link = (href, label, key) =>
    `<li class="nav-item"><a class="nav-link${active===key?' active':''}" href="${href}">${label}</a></li>`;

  return `
  <!-- NAVBAR -->
  <nav class="navbar navbar-expand-lg site-navbar sticky-top">
    <div class="container">
      <a class="navbar-brand" href="index.html">
        <img src="assets/plusopto-logo.jpg" alt="Plus Opto" height="52" />
      </a>
      <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#mainNav" aria-label="Toggle navigation">
        <i class="bi bi-list fs-4"></i>
      </button>
      <div class="collapse navbar-collapse" id="mainNav">
        <ul class="navbar-nav mx-auto mb-2 mb-lg-0">
          ${link('index.html','Home','home')}
          <li class="nav-item dropdown">
            <a class="nav-link dropdown-toggle${active==='products'?' active':''}" href="products.html" role="button" data-bs-toggle="dropdown">Products</a>
            <ul class="dropdown-menu" id="navCategoryDropdown">
              <!-- populated by generate.js -->
            </ul>
          </li>
          ${link('blog.html','Blog','blog')}
          <li class="nav-item dropdown">
            <a class="nav-link dropdown-toggle${active==='about'?' active':''}" href="about.html" role="button" data-bs-toggle="dropdown">About</a>
            <ul class="dropdown-menu">
              <li><a class="dropdown-item" href="about.html">About Us</a></li>
              <li><a class="dropdown-item" href="contact.html">Contact</a></li>
            </ul>
          </li>
          ${link('contact.html','Contact','contact')}
        </ul>
        <div class="nav-search-wrap d-none d-lg-block">
          <i class="bi bi-search search-icon"></i>
          <input type="search" class="nav-search" placeholder="Search products…" aria-label="Search" />
        </div>
      </div>
    </div>
  </nav>`;
}

function navbarWithCategories(active, categories) {
  const catItems = categories.map(c =>
    `<li><a class="dropdown-item" href="category-${c.slug}.html">${escape(c.name)}</a></li>`
  ).join('\n              ');

  return navbar(active).replace(
    '<!-- populated by generate.js -->',
    catItems
  );
}

function footer() {
  return `
  <!-- FOOTER -->
  <footer class="site-footer pt-5 pb-4">
    <div class="container">
      <div class="row g-5">
        <div class="col-12 col-md-6 col-lg-3 footer-brand">
          <img src="assets/plusopto-logo.jpg" alt="Plus Opto" height="48" class="mb-3" style="filter:brightness(0) invert(1);" />
          <p>Established in 1994 as a specialist supplier of optoelectronic components. Quality, customer service and technical support.</p>
        </div>
        <div class="col-6 col-md-3 col-lg-2">
          <h4>Products</h4>
          <ul class="list-unstyled" id="footerCategoryLinks">
          </ul>
        </div>
        <div class="col-6 col-md-3 col-lg-2">
          <h4>Company</h4>
          <ul class="list-unstyled">
            <li class="mb-2"><a href="about.html">About Us</a></li>
            <li class="mb-2"><a href="blog.html">News &amp; Blog</a></li>
            <li class="mb-2"><a href="contact.html">Contact Us</a></li>
          </ul>
        </div>
        <div class="col-12 col-md-6 col-lg-3">
          <h4>Contact</h4>
          <ul class="list-unstyled">
            <li class="footer-contact-item mb-3"><i class="bi bi-telephone-fill"></i><a href="tel:+441942671122">+44 (0) 1942 671122</a></li>
            <li class="footer-contact-item mb-3"><i class="bi bi-envelope-fill"></i><a href="mailto:sales@plusopto.co.uk">sales@plusopto.co.uk</a></li>
            <li class="footer-contact-item"><i class="bi bi-geo-alt-fill"></i><span>Leigh, Lancashire, UK</span></li>
          </ul>
        </div>
      </div>
      <hr class="footer-divider" />
      <div class="d-flex flex-column flex-md-row justify-content-between align-items-center gap-2 footer-bottom">
        <p class="mb-0">&copy; ${new Date().getFullYear()} Plus Opto. All rights reserved.</p>
        <p class="mb-0">The Optoelectronic Specialists</p>
      </div>
    </div>
  </footer>`;
}

function footerWithCategories(categories) {
  const catLinks = categories.slice(0, 7).map(c =>
    `<li class="mb-2"><a href="category-${c.slug}.html">${escape(c.name)}</a></li>`
  ).join('\n          ');
  return footer().replace('<ul class="list-unstyled" id="footerCategoryLinks">\n          </ul>', `<ul class="list-unstyled">\n          ${catLinks}\n          </ul>`);
}

function scripts() {
  return `
  <script src="${BS5_JS}"></script>
  <script src="${JS_PATH}"></script>
</body>
</html>`;
}

function pageHero(title, subtitle = '') {
  return `
  <div class="page-hero">
    <div class="container">
      <h1>${escape(title)}</h1>${subtitle ? `\n      <p class="subtitle">${escape(subtitle)}</p>` : ''}
    </div>
  </div>`;
}

// ─── PAGE GENERATORS ─────────────────────────────────────────────────────────

async function generateIndex(categories, featuredProducts, page) {
  console.log('→ Generating index.html');

  // Hero slides: use first 3 categories that have images, else fallback
  const heroSlides = [];
  for (let i = 0; i < Math.min(3, categories.length); i++) {
    const c = categories[i];
    const img = await downloadImage(c.image_url, 'assets/hero-banner.jpg');
    heroSlides.push({ title: c.name, desc: c.description || '', href: `category-${c.slug}.html`, img });
  }
  if (heroSlides.length === 0) {
    heroSlides.push({ title: 'LED Components & Systems', desc: 'Complete range of optoelectronic devices', href: 'products.html', img: 'assets/hero-banner.jpg' });
  }

  const carouselItems = heroSlides.map((s, i) => `
      <div class="carousel-item${i===0?' active':''}">
        <img src="${s.img}" class="d-block w-100" alt="${escape(s.title)}" />
        <div class="carousel-overlay"></div>
        <div class="carousel-caption">
          <div class="container">
            <div style="max-width:540px;">
              <h2>${escape(s.title)}</h2>
              <p>${escape(s.desc)}</p>
              <a href="${s.href}" class="btn btn-teal btn-lg mt-3">Explore Products</a>
            </div>
          </div>
        </div>
      </div>`).join('');

  const indicators = heroSlides.map((_, i) =>
    `<button type="button" data-bs-target="#heroCarousel" data-bs-slide-to="${i}"${i===0?' class="active" aria-current="true"':''} aria-label="Slide ${i+1}"></button>`
  ).join('\n      ');

  // Category grid — show all categories
  const catCards = [];
  for (const c of categories) {
    const img = await downloadImage(c.image_url, 'assets/cat-displays.jpg');
    catCards.push(`
        <div class="col-12 col-sm-6 col-lg-4">
          <a href="category-${c.slug}.html" class="category-card category-card-wrap">
            <img src="${img}" alt="${escape(c.name)}" loading="lazy" />
            <div class="card-content">
              <h3>${escape(c.name)}</h3>
              <p>${escape(c.description || '')}</p>
              <span class="card-link">View the Range →</span>
            </div>
          </a>
        </div>`);
  }

  // Featured products (up to 3)
  const featured = featuredProducts.slice(0, 3);
  const featCards = featured.map(p => `
        <div class="col-12 col-md-4">
          <div class="highlight-card">
            <h3>${escape(p.name)}</h3>
            <p>${escape(p.short_description || p.description || '')}</p>
            <a href="product-${p.slug}.html">View Product →</a>
          </div>
        </div>`).join('');

  // About section content from page if available
  const aboutContent = page?.content || [];

  const html = `${head('The Optoelectronic Specialists', 'Plus Opto — specialist supplier of LED components, display solutions, LED drivers and optoelectronic systems since 1994.')}
${topbar()}
${navbarWithCategories('home', categories)}

  <!-- HERO CAROUSEL -->
  <div id="heroCarousel" class="carousel slide hero-carousel" data-bs-ride="carousel" data-bs-interval="5000">
    <div class="carousel-indicators">${indicators}</div>
    <div class="carousel-inner">${carouselItems}</div>
    <button class="carousel-control-prev" type="button" data-bs-target="#heroCarousel" data-bs-slide="prev" aria-label="Previous">
      <i class="bi bi-chevron-left text-white fs-5"></i>
    </button>
    <button class="carousel-control-next" type="button" data-bs-target="#heroCarousel" data-bs-slide="next" aria-label="Next">
      <i class="bi bi-chevron-right text-white fs-5"></i>
    </button>
  </div>

  <!-- CATEGORY GRID -->
  <section class="py-5 py-lg-6">
    <div class="container">
      <div class="text-center mb-5">
        <h2 class="fw-bold" style="font-family:'Outfit',sans-serif;">Explore Our Products by Category</h2>
        <p class="text-muted mx-auto" style="max-width:580px;">Plus Opto is home to the complete range of optoelectronic devices and systems</p>
      </div>
      <div class="row g-4">${catCards.join('')}
      </div>
      <div class="text-center mt-5">
        <a href="products.html" class="btn btn-navy btn-lg px-5">View All Products</a>
      </div>
    </div>
  </section>

  <!-- FEATURED PRODUCTS -->
  <section class="section-navy py-5 py-lg-6">
    <div class="container">
      <h2 class="fw-bold text-center mb-2" style="font-family:'Outfit',sans-serif;">New Additions to Our Range</h2>
      <p class="text-center mb-5" style="color:rgba(210,228,245,0.7);max-width:560px;margin:0 auto 3rem;">
        Discover the latest products and solutions from our trusted supplier partners
      </p>
      <div class="row g-4">${featCards || `
        <div class="col-12 text-center" style="color:rgba(210,228,245,0.6);">Products coming soon.</div>`}
      </div>
    </div>
  </section>

  <!-- ABOUT SECTION -->
  <section class="py-5 py-lg-6 bg-po-muted">
    <div class="container">
      <div class="row g-5 align-items-center">
        <div class="col-12 col-lg-6">
          <h2 class="fw-bold mb-4" style="font-family:'Outfit',sans-serif;">About Plus Opto</h2>
          <p class="text-muted lh-lg">Established in 1994 as a specialist supplier of optoelectronic components into the electronic manufacturing industry, our continued success is based upon well-maintained traditional values: quality, customer service and technical support.</p>
          <p class="text-muted lh-lg">Plus Opto is home to the complete range of optoelectronic devices and systems: LED based products, LCD Modules, Single Board Computers, LED Drivers, power supplies &amp; Controllers along with custom and semi-custom displays and LED assemblies.</p>
          <div class="d-flex gap-3 mt-4 flex-wrap">
            <a href="about.html" class="btn btn-navy btn-lg">Learn More</a>
            <a href="contact.html" class="btn btn-outline-teal btn-lg">Contact Us</a>
          </div>
        </div>
        <div class="col-12 col-lg-6">
          <div class="row g-4">
            <div class="col-6"><div class="stat-card stat-primary"><div class="stat-value">30+</div><div class="stat-label">Years Experience</div></div></div>
            <div class="col-6"><div class="stat-card stat-teal"><div class="stat-value">1000+</div><div class="stat-label">Products</div></div></div>
            <div class="col-6"><div class="stat-card stat-gold"><div class="stat-value">UK</div><div class="stat-label">Based Support</div></div></div>
            <div class="col-6"><div class="stat-card stat-primary"><div class="stat-value">ISO</div><div class="stat-label">Certified</div></div></div>
          </div>
        </div>
      </div>
    </div>
  </section>

${footerWithCategories(categories)}
${scripts()}`;

  fs.writeFileSync(path.join(OUT_DIR, 'index.html'), html);
}

async function generateProducts(categories) {
  console.log('→ Generating products.html');

  const catCards = [];
  for (const c of categories) {
    const img = await downloadImage(c.image_url, 'assets/cat-displays.jpg');
    catCards.push(`
        <div class="col-12 col-sm-6 col-lg-4">
          <a href="category-${c.slug}.html" class="category-card category-card-wrap">
            <img src="${img}" alt="${escape(c.name)}" loading="lazy" />
            <div class="card-content">
              <h3>${escape(c.name)}</h3>
              <p>${escape(c.description || '')}</p>
              <span class="card-link">View the Range →</span>
            </div>
          </a>
        </div>`);
  }

  const html = `${head('Products', 'Browse the complete Plus Opto range of optoelectronic products.')}
${topbar()}
${navbarWithCategories('products', categories)}
${pageHero('Products', 'Browse our complete range of optoelectronic products')}

  <section class="py-5">
    <div class="container">
      <div class="row g-4">${catCards.join('')}
      </div>
    </div>
  </section>

${footerWithCategories(categories)}
${scripts()}`;

  fs.writeFileSync(path.join(OUT_DIR, 'products.html'), html);
}

async function generateCategory(cat, products, allCategories) {
  const filename = `category-${cat.slug}.html`;
  console.log(`→ Generating ${filename} (${products.length} products)`);

  const bannerImg = await downloadImage(cat.image_url, 'assets/cat-displays.jpg');

  const productCards = [];
  for (const p of products) {
    const img = await downloadImage(p.image_url, bannerImg);
    productCards.push(`
        <div class="col-12 col-sm-6 col-lg-4">
          <a href="product-${p.slug}.html" class="product-card">
            <div class="img-wrap">
              <img src="${img}" alt="${escape(p.name)}" loading="lazy" />
            </div>
            <div class="card-body">
              <h3>${escape(p.name)}</h3>
              <p class="excerpt">${escape(p.short_description || p.description || '')}</p>
              <span class="view-link">View Details →</span>
            </div>
          </a>
        </div>`);
  }

  const html = `${head(cat.name, cat.description || '')}
${topbar()}
${navbarWithCategories('products', allCategories)}

  <!-- CATEGORY HERO -->
  <div style="position:relative;height:300px;">
    <img src="${bannerImg}" alt="${escape(cat.name)}" style="width:100%;height:100%;object-fit:cover;" />
    <div style="position:absolute;inset:0;background:linear-gradient(to right,rgba(17,38,56,.92) 0%,rgba(17,38,56,.7) 50%,rgba(17,38,56,.35) 100%);"></div>
    <div style="position:absolute;inset:0;display:flex;align-items:center;">
      <div class="container">
        <nav aria-label="breadcrumb" class="breadcrumb-dark mb-3">
          <ol class="breadcrumb mb-0">
            <li class="breadcrumb-item"><a href="products.html">← All Products</a></li>
          </ol>
        </nav>
        <h1 style="font-family:'Outfit',sans-serif;font-size:clamp(1.75rem,4vw,2.5rem);font-weight:700;color:#fff;margin-bottom:.5rem;">${escape(cat.name)}</h1>
        <p style="color:rgba(210,228,245,.8);max-width:600px;margin:0;">${escape(cat.description || '')}</p>
      </div>
    </div>
  </div>

  <section class="py-5">
    <div class="container">
      ${products.length === 0
        ? '<p class="text-muted">No products in this category yet.</p>'
        : `<div class="row g-4">${productCards.join('')}</div>`}
    </div>
  </section>

  <section class="section-navy py-5 mt-2">
    <div class="container text-center">
      <h2 class="fw-bold mb-3" style="font-family:'Outfit',sans-serif;">Need a Custom Solution?</h2>
      <p style="color:rgba(210,228,245,.75);max-width:560px;margin:0 auto 1.75rem;">
        Our engineering team can help specify or develop a custom solution for your exact requirements.
      </p>
      <a href="contact.html" class="btn btn-teal btn-lg px-5">Talk to Our Engineers</a>
    </div>
  </section>

${footerWithCategories(allCategories)}
${scripts()}`;

  fs.writeFileSync(path.join(OUT_DIR, filename), html);
}

async function generateProduct(product, category, allCategories, relatedProducts) {
  const filename = `product-${product.slug}.html`;
  console.log(`→ Generating ${filename}`);

  const catImg = await downloadImage(category?.image_url, 'assets/cat-displays.jpg');
  const prodImg = await downloadImage(product.image_url, catImg);

  const breadcrumb = `
        <nav aria-label="breadcrumb" class="breadcrumb-dark mb-3">
          <ol class="breadcrumb mb-0">
            <li class="breadcrumb-item"><a href="products.html">Products</a></li>
            ${category ? `<li class="breadcrumb-item"><a href="category-${category.slug}.html">${escape(category.name)}</a></li>` : ''}
            <li class="breadcrumb-item active">${escape(product.name)}</li>
          </ol>
        </nav>`;

  // Specifications table
  let specsHtml = '';
  const specs = product.specifications && typeof product.specifications === 'object'
    ? Object.entries(product.specifications)
    : [];
  if (specs.length > 0) {
    const rows = specs.map(([k, v], i) =>
      `<tr${i % 2 === 0 ? ' class="table-light"' : ''}><td>${escape(k)}</td><td>${escape(String(v))}</td></tr>`
    ).join('\n                ');
    specsHtml = `
          <h2 class="fw-bold mb-3" style="font-family:'Outfit',sans-serif;color:#112638;">Technical Specifications</h2>
          <div class="border rounded-3 overflow-hidden mb-5" style="box-shadow:0 4px 20px -4px rgba(17,38,56,.06);">
            <table class="table table-sm mb-0 product-spec-table">
              <tbody>
                ${rows}
              </tbody>
            </table>
          </div>`;
  }

  // Sidebar key specs (top 8)
  let sidebarSpecs = '';
  if (specs.length > 0) {
    const items = specs.slice(0, 8).map(([k, v]) =>
      `<li class="d-flex justify-content-between"><span class="text-muted">${escape(k)}</span> <span>${escape(String(v))}</span></li>`
    ).join('\n              ');
    sidebarSpecs = `
            <div class="sidebar-card">
              <h3 class="fw-semibold mb-3" style="font-family:'Outfit',sans-serif;font-size:1.05rem;color:#1a2b3c;">Key Specifications</h3>
              <ul class="list-unstyled spec-mini-list mb-0">
                ${items}
              </ul>
            </div>`;
  }

  // Description paragraphs
  const descHtml = (product.description || '')
    .split('\n').filter(Boolean)
    .map(p => `<p>${escape(p)}</p>`).join('\n            ');

  // Related product cards
  const relCards = [];
  for (const rp of relatedProducts.slice(0, 4)) {
    const rImg = await downloadImage(rp.image_url, catImg);
    relCards.push(`
          <div class="col-12 col-sm-6 col-lg-3">
            <a href="product-${rp.slug}.html" class="card-product">
              <div class="card-img-wrap"><img src="${rImg}" alt="${escape(rp.name)}" loading="lazy" /></div>
              <div class="card-body"><h3>${escape(rp.name)}</h3><span class="read-more">View Details →</span></div>
            </a>
          </div>`);
  }

  // Datasheet
  const datasheetHtml = product.datasheet_url ? `
              <a href="${escape(product.datasheet_url)}" target="_blank" rel="noopener noreferrer"
                 class="d-flex align-items-center gap-3 p-3 rounded-3 border mb-3 text-decoration-none"
                 style="transition:background .2s;" onmouseenter="this.style.background='#f0f5fa'" onmouseleave="this.style.background='transparent'">
                <div class="p-2 rounded-3" style="background:rgba(26,72,112,0.08);">
                  <i class="bi bi-file-earmark-arrow-down fs-5" style="color:#1a4870;"></i>
                </div>
                <div>
                  <div class="fw-medium" style="font-size:.875rem;color:#1a2b3c;">Download Datasheet</div>
                  <div style="font-size:.78rem;color:#8096a8;">PDF Technical Document</div>
                </div>
              </a>` : '';

  const html = `${head(product.name, product.short_description || product.description || '')}
${topbar()}
${navbarWithCategories('products', allCategories)}

  <div class="page-hero">
    <div class="container">
      ${breadcrumb}
      <h1>${escape(product.name)}</h1>
      ${product.short_description ? `<p class="subtitle">${escape(product.short_description)}</p>` : ''}
    </div>
  </div>

  <section class="py-5">
    <div class="container">
      <div class="row g-5">
        <div class="col-12 col-lg-8">
          ${prodImg ? `
          <div class="border rounded-3 p-4 bg-white mb-5 text-center" style="box-shadow:0 4px 20px -4px rgba(17,38,56,.08);">
            <img src="${prodImg}" alt="${escape(product.name)}" class="img-fluid" style="max-height:360px;object-fit:contain;" />
          </div>` : ''}

          ${descHtml ? `
          <h2 class="fw-bold mb-3" style="font-family:'Outfit',sans-serif;color:#112638;">Overview</h2>
          <div class="text-muted lh-lg mb-5">
            ${descHtml}
          </div>` : ''}

          ${specsHtml}
        </div>

        <div class="col-12 col-lg-4 product-sidebar">
          <div class="sticky-top">
            <div class="sidebar-card mb-4">
              <h3 class="fw-semibold mb-4" style="font-family:'Outfit',sans-serif;font-size:1.05rem;color:#1a2b3c;">Product Resources</h3>
              ${datasheetHtml}
              <a href="contact.html" class="btn btn-teal w-100 mb-2">Request a Quote</a>
              <a href="contact.html" class="btn btn-outline-teal w-100">Technical Enquiry</a>
            </div>
            ${sidebarSpecs}
          </div>
        </div>
      </div>
    </div>
  </section>

  ${relCards.length > 0 ? `
  <section class="py-5 bg-po-muted">
    <div class="container">
      <h2 class="fw-bold mb-4" style="font-family:'Outfit',sans-serif;color:#112638;">Related Products</h2>
      <div class="row g-4">${relCards.join('')}
      </div>
    </div>
  </section>` : ''}

${footerWithCategories(allCategories)}
${scripts()}`;

  fs.writeFileSync(path.join(OUT_DIR, filename), html);
}

async function generateBlog(posts, allCategories) {
  console.log('→ Generating blog.html');

  const cards = [];
  for (const p of posts) {
    const img = await downloadImage(p.featured_image, 'assets/hero-banner.jpg');
    const date = p.published_at ? new Date(p.published_at).toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' }) : '';
    cards.push(`
        <div class="col-12 col-sm-6 col-lg-4">
          <a href="blog-${p.slug}.html" class="card-product">
            <div class="card-img-wrap">
              <img src="${img}" alt="${escape(p.title)}" loading="lazy" />
            </div>
            <div class="card-body">
              ${date ? `<div class="post-date"><i class="bi bi-calendar3"></i>${escape(date)}</div>` : ''}
              <h3>${escape(p.title)}</h3>
              <p class="excerpt">${escape(p.excerpt || '')}</p>
              <span class="read-more">Read More →</span>
            </div>
          </a>
        </div>`);
  }

  const html = `${head('News & Blog', 'Latest news, product updates and industry insights from Plus Opto.')}
${topbar()}
${navbarWithCategories('blog', allCategories)}
${pageHero('News & Blog', 'Latest updates from Plus Opto')}

  <section class="py-5">
    <div class="container">
      ${posts.length === 0
        ? '<p class="text-muted text-center py-5">No posts published yet.</p>'
        : `<div class="row g-4">${cards.join('')}</div>`}
    </div>
  </section>

${footerWithCategories(allCategories)}
${scripts()}`;

  fs.writeFileSync(path.join(OUT_DIR, 'blog.html'), html);
}

async function generateBlogPost(post, allPosts, allCategories) {
  const filename = `blog-${post.slug}.html`;
  console.log(`→ Generating ${filename}`);

  const featImg = await downloadImage(post.featured_image, null);
  const date = post.published_at
    ? new Date(post.published_at).toLocaleDateString('en-GB', { day:'numeric', month:'long', year:'numeric' })
    : '';
  const dateAttr = post.published_at
    ? new Date(post.published_at).toISOString().split('T')[0]
    : '';

  // Content: prefer content_blocks if present, else raw HTML
  let contentHtml = '';
  const blocks = post.content_blocks;
  if (Array.isArray(blocks) && blocks.length > 0) {
    contentHtml = renderBlocks(blocks);
  } else {
    contentHtml = post.content || '';
  }

  // Related posts (other 3 most recent)
  const related = allPosts.filter(p => p.id !== post.id).slice(0, 3);
  const relCards = [];
  for (const rp of related) {
    const rImg = await downloadImage(rp.featured_image, 'assets/hero-banner.jpg');
    const rDate = rp.published_at ? new Date(rp.published_at).toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' }) : '';
    relCards.push(`
          <div class="col-12 col-sm-6 col-lg-4">
            <a href="blog-${rp.slug}.html" class="card-product">
              <div class="card-img-wrap"><img src="${rImg}" alt="${escape(rp.title)}" loading="lazy" /></div>
              <div class="card-body">
                ${rDate ? `<div class="post-date"><i class="bi bi-calendar3"></i>${escape(rDate)}</div>` : ''}
                <h3>${escape(rp.title)}</h3>
                <span class="read-more">Read More →</span>
              </div>
            </a>
          </div>`);
  }

  const html = `${head(post.title, post.excerpt || '')}
${topbar()}
${navbarWithCategories('blog', allCategories)}

  <div class="page-hero">
    <div class="container" style="max-width:760px;">
      <a href="blog.html" class="d-inline-flex align-items-center gap-1 mb-4 text-decoration-none" style="color:var(--po-teal-glow);font-size:.875rem;">
        <i class="bi bi-arrow-left"></i> Back to Blog
      </a>
      <h1>${escape(post.title)}</h1>
      ${date ? `<div class="d-flex align-items-center gap-2 mt-3" style="color:rgba(210,228,245,.65);font-size:.875rem;">
        <i class="bi bi-calendar3"></i><time datetime="${dateAttr}">${escape(date)}</time>
      </div>` : ''}
    </div>
  </div>

  ${featImg ? `
  <div class="container py-5" style="max-width:760px;">
    <img src="${featImg}" alt="${escape(post.title)}" class="img-fluid rounded-3 w-100" loading="eager" />
  </div>` : ''}

  <article class="pb-5">
    <div class="container" style="max-width:760px;">
      <div class="blog-content">
        ${contentHtml}
      </div>
    </div>
  </article>

  ${relCards.length > 0 ? `
  <section class="py-5 bg-po-muted">
    <div class="container">
      <h2 class="fw-bold mb-4" style="font-family:'Outfit',sans-serif;color:#112638;">Related Articles</h2>
      <div class="row g-4">${relCards.join('')}</div>
    </div>
  </section>` : ''}

${footerWithCategories(allCategories)}
${scripts()}`;

  fs.writeFileSync(path.join(OUT_DIR, filename), html);
}

/** Very basic block renderer for Supabase content_blocks JSON */
function renderBlocks(blocks) {
  return blocks.map(block => {
    const type = block.type || '';
    switch (type) {
      case 'hero':
        return `<div class="mb-4"><h2>${escape(block.heading || '')}</h2><p>${escape(block.subheading || '')}</p></div>`;
      case 'text':
        return `<div class="mb-4">${block.html || escape(block.text || '')}</div>`;
      case 'image':
        return `<img src="${escape(block.url || block.src || '')}" alt="${escape(block.alt || '')}" class="img-fluid rounded-3 my-3" />`;
      case 'heading':
        return `<h${block.level||2} class="mt-4 mb-2">${escape(block.text||'')}</h${block.level||2}>`;
      case 'paragraph':
        return `<p>${escape(block.text || '')}</p>`;
      case 'cta':
        return `<div class="my-4"><a href="${escape(block.href||'#')}" class="btn btn-teal btn-lg">${escape(block.label||'Learn More')}</a></div>`;
      default:
        if (block.text) return `<p>${escape(block.text)}</p>`;
        if (block.html) return block.html;
        return '';
    }
  }).join('\n        ');
}

// Static pages (about, contact, 404) – these don't need DB data but do need dynamic nav/footer
async function generateAbout(allCategories) {
  console.log('→ Generating about.html');
  const html = fs.readFileSync(path.join(OUT_DIR, 'about.html'), 'utf8')
    .replace(
      /<li><a class="dropdown-item" href="category\.html">[\s\S]*?<\/ul>\s*<\/li>/,
      allCategories.map(c => `<li><a class="dropdown-item" href="category-${c.slug}.html">${escape(c.name)}</a></li>`).join('\n              ')
    );
  fs.writeFileSync(path.join(OUT_DIR, 'about.html'), html);
}

async function generateContact(allCategories) {
  console.log('→ Generating contact.html');
  const html = fs.readFileSync(path.join(OUT_DIR, 'contact.html'), 'utf8')
    .replace(
      /<li><a class="dropdown-item" href="category\.html">[\s\S]*?<\/ul>\s*<\/li>/,
      allCategories.map(c => `<li><a class="dropdown-item" href="category-${c.slug}.html">${escape(c.name)}</a></li>`).join('\n              ')
    );
  fs.writeFileSync(path.join(OUT_DIR, 'contact.html'), html);
}

// ─── MAIN ────────────────────────────────────────────────────────────────────
async function main() {
  console.log('\n╔══════════════════════════════════════════╗');
  console.log('║   Plus Opto — Static Site Generator      ║');
  console.log('╚══════════════════════════════════════════╝\n');

  // Ensure assets dir exists
  fs.mkdirSync(ASSETS_DIR, { recursive: true });

  console.log('📡 Fetching data from Supabase…\n');

  // Fetch all data in parallel
  const [categories, allProducts, blogPosts, homePage] = await Promise.all([
    sbFetch('product_categories', 'select=*&order=sort_order.asc'),
    sbFetch('products', 'select=*&published=eq.true&order=sort_order.asc'),
    sbFetch('blog_posts', 'select=*&published=eq.true&order=published_at.desc'),
    sbFetch('pages', 'select=*&slug=eq.home&published=eq.true').then(r => r[0] || null),
  ]);

  console.log(`✓ ${categories.length} categories, ${allProducts.length} products, ${blogPosts.length} blog posts\n`);
  console.log('📥 Downloading images…\n');

  // Featured products
  const featured = allProducts.filter(p => p.featured);

  // Build category lookup
  const categoryById = {};
  for (const c of categories) categoryById[c.id] = c;

  // ── Generate pages ──
  await generateIndex(categories, featured, homePage);
  await generateProducts(categories);

  for (const cat of categories) {
    const catProducts = allProducts.filter(p => p.category_id === cat.id);
    await generateCategory(cat, catProducts, categories);

    for (const prod of catProducts) {
      const related = catProducts.filter(p => p.id !== prod.id);
      await generateProduct(prod, cat, categories, related);
    }
  }

  await generateBlog(blogPosts, categories);
  for (const post of blogPosts) {
    await generateBlogPost(post, blogPosts, categories);
  }

  console.log('\n✅ Done! All pages generated in static/\n');
  console.log('Files written:');
  fs.readdirSync(OUT_DIR)
    .filter(f => f.endsWith('.html'))
    .sort()
    .forEach(f => console.log(`  static/${f}`));
  console.log();
}

main().catch(err => {
  console.error('\n❌ Generator failed:', err.message);
  process.exit(1);
});
