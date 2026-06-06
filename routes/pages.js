const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const db = require('../db');

const layout = fs.readFileSync(path.join(__dirname, '..', 'views', 'layout.html'), 'utf-8');

function render(title, content) {
  return layout
    .replace('{{title}}', title)
    .replace('{{content}}', content);
}

function renderFooter(stats, totalVisits, popular) {
  return `
    <footer class="footer fade-up">
      <div class="container">
        <div class="footer-inner">
          <div class="footer-brand">
            <div class="footer-logo">
              <img src="/assets/logo.svg" alt="" width="28" height="28">
              <span>uzi.pm</span>
            </div>
            <p class="footer-desc">uzi.pm is a lightweight package manager for scripts that lets you install anything with a single curl command :3 <br>Fast, minimal, and brutally simple.</p>
            <div class="footer-social">
              <a href="https://discord.4furri.es" class="social-link" aria-label="Discord"><i class="fa-brands fa-discord"></i></a>
              <a href="https://www.youtube.com/@vahistar" class="social-link" aria-label="YouTube"><i class="fa-brands fa-x-youtube"></i></a>
              <a href="https://github.com/Vahistar" class="social-link" aria-label="GitHub"><i class="fa-brands fa-github"></i></a>
            </div>
          </div>
          <div class="footer-links">
            <div class="footer-col">
              <span class="footer-col-title">Links</span>
              <a href="/" class="footer-link">Home</a>
              <a href="/search" class="footer-link">Search</a>
              <a href="#" class="footer-link">Privacy Policy</a>
              <a href="#" class="footer-link">Terms of Service</a>
            </div>
            <div class="footer-col">
              <span class="footer-col-title">Popular</span>
              ${popular.slice(0,4).map(s => `
                <a href="/script/${s.slug}" class="footer-link">${s.name}</a>
              `).join('')}
            </div>
          </div>
        </div>
        <div class="footer-stats-row">
          <div class="footer-stat">
            <i class="fa-solid fa-code"></i>
            <span class="footer-stat-value">${stats.total_scripts}</span>
            <span class="footer-stat-label">Scripts</span>
          </div>
          <div class="footer-stat">
            <i class="fa-solid fa-download"></i>
            <span class="footer-stat-value">${stats.total_downloads}</span>
            <span class="footer-stat-label">Downloads</span>
          </div>
          <div class="footer-stat">
            <i class="fa-solid fa-heart"></i>
            <span class="footer-stat-value">${stats.total_hearts}</span>
            <span class="footer-stat-label">Hearts</span>
          </div>
          <div class="footer-stat">
            <i class="fa-solid fa-eye"></i>
            <span class="footer-stat-value">${totalVisits}</span>
            <span class="footer-stat-label">Visits</span>
          </div>
        </div>
      </div>
    </footer>`;
}

router.get('/', async (req, res, next) => {
  try {
    const appName = process.env.APP_NAME;
    const popular = await db.all('SELECT slug, name, description, distro, downloads, hearts FROM scripts ORDER BY downloads DESC LIMIT 10');
    const stats = await db.get('SELECT COUNT(*) as total_scripts, COALESCE(SUM(downloads),0) as total_downloads, COALESCE(SUM(hearts),0) as total_hearts FROM scripts');
    const totalVisits = await db.get('SELECT COUNT(*) as total FROM visits');
    const url = process.env.APP_URL;
    const distroIcons = Object.fromEntries((await db.all('SELECT name, icon FROM distros')).map(r => [r.name, r.icon || 'fa-solid fa-terminal']));

    const scriptsList = popular.map((s, i) => `
      <a href="/script/${s.slug}" class="list-item" style="--i:${i}">
        <span class="list-leading">
          <span class="avatar">${s.name.charAt(0).toUpperCase()}</span>
        </span>
        <span class="list-content">
          <span class="list-title">${s.name}</span>
          <span class="list-supporting">${s.description}</span>
        </span>
        <span class="list-trailing">
          ${function(){
            var parts = s.distro.split(',').filter(Boolean);
            var first = parts[0].trim();
            var icon = distroIcons[first] || 'fa-solid fa-terminal';
            return '<span class="chip"><i class="' + icon + '" style="margin-right:4px"></i> ' + first + (parts.length > 1 ? ' +' + (parts.length - 1) : '') + '</span>';
          }()}
          <span class="list-meta">
            <span class="stat"><i class="fa-solid fa-heart"></i>${s.hearts}</span>
            <span class="stat"><i class="fa-solid fa-download"></i>${s.downloads}</span>
          </span>
        </span>
      </a>
    `).join('');

    const content = `
      <section class="hero">
        <div class="hero-content">
          <h1 class="hero-title"><span class="gradient-text">uzi.pm</span></h1>
          <p class="hero-subtitle">Search. Copy. Curl. Done :3</p>
          <div class="terminal-mockup">
            <div class="terminal-header">
              <span class="dot red"></span><span class="dot yellow"></span><span class="dot green"></span>
              <span class="terminal-title">bash</span>
            </div>
            <div class="terminal-body">
              <div class="term-line"><span class="term-dot">●</span> <span class="term-dim">uzi.pm</span> engine <span class="term-green">active</span></div>
              <div class="term-line"><span class="term-dot">●</span> <span class="term-dim">scripts indexed:</span> ${stats.total_scripts} <span class="term-dim">· distros:</span> Ubuntu, Windows </div>
              <div class="term-line cmd-line">
                <span class="prompt">$</span>
                <span class="cmd-static">curl -fsSL ${url}/install/</span><span class="cmd-cycle" id="cycle-text">pterodactyl</span> <span class="cmd-bar">&nbsp;| bash</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section class="section fade-up">
        <div class="container">
          <h2 class="section-title">Popular scripts</h2>
          <div class="list-container">
            ${scriptsList}
          </div>
        </div>
      </section>

      <section class="section fade-up">
        <div class="container">
          <h2 class="section-title">How it works</h2>
          <div class="steps">
            <div class="step">
              <div class="step-circle">
                <i class="fa-solid fa-magnifying-glass"></i>
              </div>
              <div class="step-body">
                <div class="step-label">Step 1</div>
                <h3 class="step-title">Find a script</h3>
                <p class="step-desc">Search or browse our collection of tested bash scripts</p>
              </div>
            </div>
            <div class="step">
              <div class="step-circle">
                <i class="fa-solid fa-copy"></i>
              </div>
              <div class="step-body">
                <div class="step-label">Step 2</div>
                <h3 class="step-title">Copy the command</h3>
                <p class="step-desc">One curl, wget or PowerShell line, toggle between them ^^</p>
              </div>
            </div>
            <div class="step">
              <div class="step-circle">
                <i class="fa-solid fa-terminal"></i>
              </div>
              <div class="step-body">
                <div class="step-label">Step 3</div>
                <h3 class="step-title">Run in terminal</h3>
                <p class="step-desc">Paste and execute! Your software is ready :3</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      ${renderFooter(stats, totalVisits.total, popular)}
    `;

    res.send(render(`${appName} — package manager for scripts`, content));
  } catch (e) {
    next(e);
  }
});

router.get('/script/:slug', async (req, res, next) => {
  try {
    const script = await db.get('SELECT * FROM scripts WHERE slug = ?', [req.params.slug]);
    if (!script) return res.status(404).send(render('Not Found', `
      <div class="container" style="padding:100px 24px;text-align:center">
        <div style="width:80px;height:80px;border-radius:50%;background:var(--md-surface-container);display:flex;align-items:center;justify-content:center;margin:0 auto 20px;border:1px solid var(--md-outline-variant)">
          <i class="fa-solid fa-terminal" style="font-size:32px;color:var(--md-outline)"></i>
        </div>
        <div style="font-size:72px;font-weight:800;font-family:'Sora',sans-serif;line-height:1;margin-bottom:4px;background:linear-gradient(135deg,var(--md-primary),var(--md-secondary));-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text">404</div>
        <h1 style="font-size:22px;font-weight:700;margin-bottom:6px">Script not found</h1>
        <p style="color:var(--md-on-surface-variant);font-size:14px;margin-bottom:28px;max-width:320px;margin-left:auto;margin-right:auto">No script with the slug "<strong style="color:var(--md-on-surface)">${req.params.slug.replace(/</g,'&lt;').replace(/>/g,'&gt;')}</strong>" exists</p>
        <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap">
          <a href="/" class="filled-button"><i class="fa-solid fa-arrow-left"></i> Home</a>
          <a href="/search" class="tonal-button"><i class="fa-solid fa-magnifying-glass"></i> Search</a>
        </div>
      </div>
    `));

    const [stats, totalVisits, popular, dbDistroIcons] = await Promise.all([
      db.get('SELECT COUNT(*) as total_scripts, COALESCE(SUM(downloads),0) as total_downloads, COALESCE(SUM(hearts),0) as total_hearts FROM scripts'),
      db.get('SELECT COUNT(*) as total FROM visits'),
      db.all('SELECT slug, name FROM scripts ORDER BY downloads DESC LIMIT 10'),
      db.all('SELECT name, icon FROM distros'),
    ]);
    const distroIcons = Object.fromEntries(dbDistroIcons.map(r => [r.name, r.icon || 'fa-solid fa-terminal']));

    const appName = process.env.APP_NAME;
    const installUrl = process.env.APP_URL;
    const curlCmd = `curl -fsSL ${installUrl}/install/${script.slug} | bash`;
    const wgetCmd = `wget -qO- ${installUrl}/install/${script.slug} | bash`;
    const psCmd = `iex ((New-Object System.Net.WebClient).DownloadString('${installUrl}/install/${script.slug}?shell=ps1'))`;
    const hasPs = !!script.script_content_ps1;

    const content = `
      <style>
        .mini-fab.liked{background:var(--md-tertiary-container)!important;color:var(--md-tertiary)!important}
        #heart-count.bump{animation:countBump .3s ease}
        @keyframes countBump{0%{transform:scale(1)}50%{transform:scale(1.25);color:var(--md-tertiary)}100%{transform:scale(1)}}
        .heart-icon.pulse{animation:pulse .3s ease}
        @keyframes pulse{0%{transform:scale(1)}50%{transform:scale(1.3)}100%{transform:scale(1)}}
        .script-page-wrap{display:flex;flex-direction:column;min-height:calc(100vh - 60px)}.script-page-wrap .footer{margin-top:auto}
      </style>
      <div class="script-page-wrap">
      <div class="container script-page fade-up">
        <a href="/" class="text-button" style="margin-bottom:16px">
          <i class="fa-solid fa-arrow-left"></i> Back
        </a>
        <div class="script-split">
          <div>
            <div class="tonal-container" style="margin-bottom:16px">
              <div style="display:flex;align-items:flex-start;gap:16px;margin-bottom:16px">
                <span class="avatar" style="width:52px;height:52px;font-size:22px;flex-shrink:0">${script.name.charAt(0).toUpperCase()}</span>
                <div style="min-width:0">
                  <h1 style="font-size:24px;font-weight:700;margin:0 0 2px">${script.name}</h1>
                  <p style="color:var(--md-on-surface-variant);font-size:14px;margin:0">${script.description}</p>
                </div>
              </div>
              <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
                ${script.distro.split(',').filter(Boolean).map(function(d) {
                  var dd = d.trim();
                  var tested = ((script.tested_on || '').split(';;').filter(Boolean).filter(function(t) { return t.trim().indexOf(dd) === 0; }).map(function(t) { return t.trim().substring(dd.length).trim(); }).join(', ') || '');
                  var icon = distroIcons[dd] || 'fa-solid fa-terminal';
                  return '<span class="chip"><i class="' + icon + '" style="margin-right:4px"></i> ' + dd + '</span>' + (tested ? '<span style="font-size:13px;color:var(--md-on-surface-variant)">' + tested + '</span>' : '');
                }).join('')}
              </div>
            </div>
            ${script.long_desc ? `<div class="tonal-container" style="margin-bottom:16px"><p style="color:var(--md-on-surface-variant);font-size:14px;line-height:1.7;margin:0">${script.long_desc}</p></div>` : ''}
            <div class="tonal-container" style="margin-bottom:16px">
              <div style="display:flex;gap:24px;flex-wrap:wrap">
                <div>
                  <div style="font-size:11px;text-transform:uppercase;letter-spacing:0.06em;color:var(--md-on-surface-variant);margin-bottom:2px">Downloads</div>
                  <div style="font-size:20px;font-weight:700;font-family:'Sora',sans-serif">${script.downloads}</div>
                </div>
                <div>
                  <div style="font-size:11px;text-transform:uppercase;letter-spacing:0.06em;color:var(--md-on-surface-variant);margin-bottom:2px">Hearts</div>
                  <div style="font-size:20px;font-weight:700;font-family:'Sora',sans-serif">${script.hearts}</div>
                </div>
                <div>
                  <div style="font-size:11px;text-transform:uppercase;letter-spacing:0.06em;color:var(--md-on-surface-variant);margin-bottom:2px">Added</div>
                  <div style="font-size:20px;font-weight:700;font-family:'Sora',sans-serif">${new Date(script.created_at).toLocaleDateString()}</div>
                </div>
              </div>
            </div>
          </div>
          <div>
            <div class="tonal-container" style="margin-bottom:16px">
              <h3 style="font-size:18px;font-weight:600;margin:0 0 12px">Install</h3>
              <div class="segmented-button" id="install-toggle" style="margin-bottom:12px">
                <button class="segment active" data-tool="curl">curl</button>
                <button class="segment" data-tool="wget">wget</button>
                ${hasPs ? '<button class="segment" data-tool="ps1">PS</button>' : ''}
              </div>
              <div class="outlined-container code-block" style="padding:12px;display:flex;align-items:center;gap:8px;background:#0D0F12;border-color:rgba(255,255,255,0.06)">
                <code id="install-cmd" data-curl="${curlCmd}" data-wget="${wgetCmd}" ${hasPs ? `data-ps1="${psCmd}"` : ''} style="flex:1;font-size:12px;word-break:break-all;color:#E0E0E0">${curlCmd}</code>
                <button class="tonal-button icon-only copy-btn" data-copy="${curlCmd}" id="copy-btn" style="flex-shrink:0;background:var(--md-primary-container);color:var(--md-on-primary-container)">
                  <i class="fa-solid fa-copy"></i>
                </button>
              </div>
              <div style="display:flex;align-items:center;gap:10px;margin-top:14px">
                <button class="mini-fab" id="heart-btn" data-slug="${script.slug}" style="width:40px;height:40px;border-radius:50%;background:var(--md-primary-container);color:var(--md-on-primary-container);border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:var(--elevation-2)">
                  <i class="fa-regular fa-heart heart-icon" style="font-size:18px"></i>
                </button>
                <span id="heart-count" style="font-size:20px;font-weight:700;font-family:'Sora',sans-serif">${script.hearts}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      ${renderFooter(stats, totalVisits.total, popular)}
      </div>
    `;

    res.send(render(`${script.name} — ${appName}`, content));
  } catch (e) {
    next(e);
  }
});

router.get('/search', async (req, res, next) => {
  try {
    const q = req.query.q || '';
    const distro = req.query.distro || 'All';
    const sort = req.query.sort || 'popular';
    const appName = process.env.APP_NAME;

    const [stats, totalVisits, popular, dbDistros] = await Promise.all([
      db.get('SELECT COUNT(*) as total_scripts, COALESCE(SUM(downloads),0) as total_downloads, COALESCE(SUM(hearts),0) as total_hearts FROM scripts'),
      db.get('SELECT COUNT(*) as total FROM visits'),
      db.all('SELECT slug, name FROM scripts ORDER BY downloads DESC LIMIT 10'),
      db.all('SELECT name, icon FROM distros ORDER BY name ASC'),
    ]);

    const distroIconMap = Object.fromEntries(dbDistros.map(r => [r.name, r.icon || 'fa-solid fa-terminal']));
    const distroList = ['All', ...dbDistros.map(d => d.name)];

    const content = `
      <style>.search-page-wrap{display:flex;flex-direction:column;min-height:calc(100vh - 60px)}.search-page-wrap > .footer{margin-top:auto}</style>
      <div class="search-page-wrap">
      <div class="container search-page fade-up">
        <h1 class="search-title">Search scripts</h1>
        <div class="search-bar" id="search-bar">
          <i class="fa-solid fa-magnifying-glass leading-icon"></i>
          <input type="text" placeholder="Search scripts..." id="search-input" value="${q}" autofocus>
          ${q ? '<button class="clear-btn" id="clear-btn"><i class="fa-solid fa-xmark"></i></button>' : ''}
        </div>
        <div class="search-controls">
          <div class="chip-group" id="distro-chips">
            ${distroList.map(d => {
              var icon = d === 'All' ? '' : (distroIconMap[d] || 'fa-solid fa-terminal');
              return '<button class="chip ' + (distro === d ? 'active' : '') + '" data-distro="' + d + '">' + (icon ? '<i class="' + icon + '" style="margin-right:4px"></i> ' : '') + d + '</button>';
            }).join('')}
          </div>
          <div class="dropdown" id="sort-dropdown">
            <button class="dropdown-trigger">
              <span id="sort-label">${sort === 'popular' ? 'Most popular' : sort === 'newest' ? 'Newest' : 'Most hearts'}</span>
              <i class="fa-solid fa-chevron-down"></i>
            </button>
            <div class="dropdown-menu">
              <button class="dropdown-item ${sort === 'popular' ? 'active' : ''}" data-sort="popular">Most popular</button>
              <button class="dropdown-item ${sort === 'newest' ? 'active' : ''}" data-sort="newest">Newest</button>
              <button class="dropdown-item ${sort === 'hearts' ? 'active' : ''}" data-sort="hearts">Most hearts</button>
            </div>
          </div>
        </div>
        <div id="search-results">
          <div class="list-container" id="results-list"></div>
          <div class="empty-state" id="empty-state" style="display:none">
            <i class="fa-solid fa-ban empty-icon"></i>
            <p>No scripts found</p>
            <button class="text-button" id="clear-filters">Clear filters</button>
          </div>
        </div>
      </div>
      ${renderFooter(stats, totalVisits.total, popular)}
      </div>
    `;

    res.send(render(`Search — ${appName}`, content));
  } catch (e) {
    next(e);
  }
});

module.exports = router;
