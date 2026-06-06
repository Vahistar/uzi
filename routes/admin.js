const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const db = require('../db');

const sessions = new Map();
const SESSION_TTL = 24 * 60 * 60 * 1000;

const layout = fs.readFileSync(path.join(__dirname, '..', 'views', 'layout.html'), 'utf-8');

const ADMIN_CSS = `
<style>
.admin-layout { display: flex; min-height: calc(100vh - 60px); }
.admin-sidebar { width: 220px; flex-shrink: 0; padding: 24px 0; display: flex; flex-direction: column; gap: 4px; border-right: 1px solid var(--md-outline-variant); }
.admin-sidebar a { display: flex; align-items: center; gap: 10px; padding: 10px 16px; border-radius: 0 var(--shape-md) var(--shape-md) 0; color: var(--md-on-surface-variant); text-decoration: none; font-size: 14px; font-weight: 500; transition: all 0.15s ease; margin-right: 12px; }
.admin-sidebar a:hover { background: var(--md-surface-container); color: var(--md-on-surface); }
.admin-sidebar a.active { background: var(--md-primary-container); color: var(--md-on-primary-container); }
.admin-sidebar a .fa-solid { width: 18px; text-align: center; font-size: 15px; }
.admin-sidebar .sidebar-label { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; color: var(--md-outline); padding: 16px 16px 8px; }
.admin-main { flex: 1; padding: 24px 32px 24px 24px; min-width: 0; max-width: calc(100% - 220px); }
.admin-header { display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-bottom: 24px; flex-wrap: wrap; }
.admin-header h1 { font-size: 28px; font-weight: 700; }
.admin-card { background: var(--md-surface-container); border-radius: var(--shape-md); padding: 20px; margin-bottom: 16px; }
.admin-card h2 { font-size: 18px; font-weight: 600; margin-bottom: 12px; }
.admin-table { width: 100%; border-collapse: collapse; font-size: 14px; }
.admin-table th { text-align: left; padding: 10px 12px; color: var(--md-on-surface-variant); font-weight: 600; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 1px solid var(--md-outline-variant); }
.admin-table td { padding: 10px 12px; border-bottom: 1px solid var(--md-outline-variant); vertical-align: middle; }
.admin-table tr:hover td { background: var(--md-surface-container-high); }
.admin-table .actions { display: flex; gap: 6px; }
.admin-table .actions form { display: inline; }
.stat-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; margin-bottom: 24px; }
.stat-card { background: var(--md-surface-container); border-radius: var(--shape-md); padding: 18px 20px; display: flex; align-items: center; gap: 14px; border: 1px solid var(--md-outline-variant); }
.stat-card .stat-icon { width: 40px; height: 40px; border-radius: var(--shape-sm); display: flex; align-items: center; justify-content: center; font-size: 18px; flex-shrink: 0; }
.stat-card .stat-icon.green { background: var(--md-primary-container); color: var(--md-on-primary-container); }
.stat-card .stat-icon.orange { background: var(--md-secondary-container); color: var(--md-secondary); }
.stat-card .stat-icon.pink { background: var(--md-tertiary-container); color: var(--md-tertiary); }
.stat-card .stat-info { display: flex; flex-direction: column; }
.stat-card .stat-value { font-family: 'Sora', sans-serif; font-size: 22px; font-weight: 700; line-height: 1.2; }
.stat-card .stat-label { font-size: 12px; color: var(--md-on-surface-variant); }
.form-group { margin-bottom: 16px; }
.form-group label { display: block; font-size: 13px; font-weight: 600; color: var(--md-on-surface-variant); margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.04em; }
.form-group input, .form-group textarea, .form-group select { width: 100%; padding: 10px 14px; background: var(--md-surface-container-high); border: 1px solid var(--md-outline-variant); border-radius: var(--shape-sm); color: var(--md-on-surface); font-family: 'Inter', sans-serif; font-size: 14px; outline: none; transition: border-color 0.2s ease; }
.form-group input:focus, .form-group textarea:focus, .form-group select:focus { border-color: var(--md-primary); }
.form-group textarea { min-height: 120px; font-family: 'JetBrains Mono', monospace; font-size: 13px; resize: vertical; }

.editor-wrap { border: 1px solid var(--md-outline-variant); border-radius: var(--shape-md); overflow: hidden; background: #0D0F12; }
.editor-bar { display: flex; align-items: center; gap: 8px; padding: 8px 14px; background: rgba(255,255,255,0.03); border-bottom: 1px solid rgba(255,255,255,0.06); font-size: 11px; color: rgba(255,255,255,0.3); font-family: 'JetBrains Mono', monospace; }
.editor-bar .dot { width: 8px; height: 8px; border-radius: 50%; }
.editor-bar .dot.red { background: #ff5f56; }
.editor-bar .dot.yellow { background: #ffbd2e; }
.editor-bar .dot.green { background: #27c93f; }
.editor-bar .editor-title { margin-left: auto; }
.editor-body textarea { width: 100%; min-height: 280px; padding: 16px; font-family: 'JetBrains Mono', monospace; font-size: 13px; line-height: 1.65; tab-size: 2; background: #0D0F12; color: #E0E0E0; border: none; outline: none; resize: vertical; overflow: auto; white-space: pre; }
.editor-body textarea:focus { box-shadow: none; outline: none; }
.editor-body .editor-highlight { position: absolute; inset: 0; z-index: 1; pointer-events: none; color: #E0E0E0; overflow: hidden; }
.editor-highlight .sh-comment { color: #6A9955; }
.editor-highlight .sh-string { color: #CE9178; }
.editor-highlight .sh-var { color: #9CDCFE; }
.editor-highlight .sh-keyword { color: #C586C0; }
.editor-highlight .sh-shebang { color: #6A9955; }
.editor-highlight .sh-number { color: #B5CEA8; }
.editor-highlight .sh-command { color: #DCDCAA; }
.form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.btn-row { display: flex; gap: 8px; margin-top: 8px; }

.empty-state-sm { text-align: center; padding: 40px 20px; color: var(--md-on-surface-variant); }
.empty-state-sm .fa-solid { font-size: 28px; margin-bottom: 8px; color: var(--md-outline); }
@media (max-width: 720px) { .admin-layout { flex-direction: column; } .admin-sidebar { width: 100%; padding: 0; flex-direction: row; flex-wrap: wrap; gap: 4px; border-right: none; border-bottom: 1px solid var(--md-outline-variant); } .admin-sidebar a { margin-right: 0; border-radius: var(--shape-md); } .admin-sidebar .sidebar-label { display: none; } .admin-main { padding: 16px; max-width: 100%; } .form-row { grid-template-columns: 1fr; } }
</style>`;

function render(title, content) {
  return layout
    .replace('{{title}}', title)
    .replace('{{content}}', content);
}

function renderLoginPage(title, cardHtml, footerHtml) {
  const css = `
<style>
.login-page-wrap { display: flex; flex-direction: column; min-height: calc(100vh - 60px); }
.login-wrap { flex: 1; display: flex; align-items: center; justify-content: center; padding: 40px 24px; }
.login-card { background: var(--md-surface-container); border-radius: var(--shape-lg); padding: 40px 36px 36px; width: 100%; max-width: 380px; text-align: center; box-shadow: var(--elevation-3); border: 1px solid var(--md-outline-variant); }
.login-card .login-icon { width: 52px; height: 52px; border-radius: var(--shape-full); background: var(--md-primary-container); color: var(--md-primary); display: flex; align-items: center; justify-content: center; margin: 0 auto 16px; font-size: 22px; }
.login-card h1 { font-family: 'Sora', sans-serif; font-size: 23px; font-weight: 700; margin-bottom: 4px; }
.login-card .login-sub { color: var(--md-on-surface-variant); font-size: 14px; margin-bottom: 28px; }
.login-card .field { text-align: left; margin-bottom: 20px; }
.login-card .field label { display: block; font-size: 13px; font-weight: 500; color: var(--md-on-surface-variant); margin-bottom: 6px; }
.login-card .field input { width: 100%; padding: 12px 16px; background: var(--md-surface); border: 1px solid var(--md-outline-variant); border-radius: var(--shape-md); color: var(--md-on-surface); font-family: 'Inter', sans-serif; font-size: 15px; outline: none; transition: border-color 0.2s; }
.login-card .field input:focus { border-color: var(--md-primary); box-shadow: 0 0 0 3px rgba(0, 229, 160, 0.1); }
.login-card .btn-row { display: flex; justify-content: stretch; }
.login-card .btn-row .filled-button { width: 100%; justify-content: center; padding: 13px; font-size: 15px; border-radius: var(--shape-md); }
.login-error { background: var(--md-tertiary-container); color: var(--md-tertiary); padding: 10px 14px; border-radius: var(--shape-sm); font-size: 13px; font-weight: 500; margin-bottom: 16px; display: flex; align-items: center; justify-content: center; gap: 8px; }
</style>`;
  return render(title, css + `<div class="login-page-wrap">${cardHtml}${footerHtml}</div>`);
}

function renderPage(title, sidebar, mainContent) {
  return render(title, `
    ${ADMIN_CSS}
    <div class="admin-layout">
      <nav class="admin-sidebar">
        ${sidebar}
      </nav>
      <div class="admin-main">
        ${mainContent}
      </div>
    </div>
  `);
}

function renderFooter(stats, totalVisits, popular) {
  return `
    <footer class="footer fade-up">
      <div class="container">
        <div class="footer-inner">
          <div class="footer-brand">
            <div class="footer-logo">
              <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg" style="flex-shrink:0"><rect width="28" height="28" rx="8" fill="#4FC3F7"/><path d="M7 10l7 4-7 4V10zM14 10l7 4-7 4V10z" fill="#003548"/></svg>
              <span>uzi.pm</span>
            </div>
            <p class="footer-desc">uzi.pm — package manager for scripts. Install anything with one curl command.</p>
            <div class="footer-social">
              <a href="#" class="social-link" aria-label="GitHub"><i class="fa-brands fa-github"></i></a>
              <a href="#" class="social-link" aria-label="Twitter"><i class="fa-brands fa-x-twitter"></i></a>
              <a href="#" class="social-link" aria-label="Discord"><i class="fa-brands fa-discord"></i></a>
            </div>
          </div>
          <div class="footer-links">
            <div class="footer-col">
              <span class="footer-col-title">Links</span>
              <a href="/" class="footer-link">Home</a>
              <a href="/search" class="footer-link">Search</a>
              <a href="#" class="footer-link">Privacy Policy</a>
              <a href="#" class="footer-link">Terms of Service</a>
              <a href="/admin" class="footer-link"><i class="fa-solid fa-shield-halved"></i> Admin</a>
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

function sidebar(current) {
  const links = [
    { href: '/admin', label: 'Dashboard', icon: 'fa-solid fa-gauge-high', id: 'dashboard' },
    { href: '/admin/scripts', label: 'Scripts', icon: 'fa-solid fa-code', id: 'scripts' },
    { href: '/admin/distros', label: 'Distros', icon: 'fa-solid fa-server', id: 'distros' },
  ];
  return `<span class="sidebar-label">Menu</span>` +
  links.map(l =>
    `<a href="${l.href}" class="${current === l.id ? 'active' : ''}"><i class="${l.icon}"></i> ${l.label}</a>`
  ).join('') +
  `<a href="/admin/logout" style="color:var(--md-tertiary);margin-top:4px"><i class="fa-solid fa-right-from-bracket"></i> Logout</a>`;
}

function generateToken() {
  return crypto.randomBytes(24).toString('hex');
}

function auth(req, res, next) {
  const token = req.cookies?.admin_token;
  if (!token || !sessions.has(token) || sessions.get(token) < Date.now()) {
    if (token) sessions.delete(token);
    return res.redirect('/admin/login');
  }
  sessions.set(token, Date.now() + SESSION_TTL);
  next();
}

router.get('/login', async (req, res, next) => {
  const token = req.cookies?.admin_token;
  if (token && sessions.has(token) && sessions.get(token) >= Date.now()) {
    return res.redirect('/admin');
  }
  try {
    const [stats, totalVisits, popular] = await Promise.all([
      db.get('SELECT COUNT(*) as total_scripts, COALESCE(SUM(downloads),0) as total_downloads, COALESCE(SUM(hearts),0) as total_hearts FROM scripts'),
      db.get('SELECT COUNT(*) as total FROM visits'),
      db.all('SELECT slug, name FROM scripts ORDER BY downloads DESC LIMIT 10'),
    ]);
    const card = `
      <div class="login-wrap fade-up">
        <div class="login-card">
          <div class="login-icon"><i class="fa-solid fa-shield-halved"></i></div>
          <h1>Admin Panel</h1>
          <p class="login-sub">uzi.pm management</p>
          <form method="POST" action="/admin/login">
            <div class="field">
              <label>Password</label>
              <input type="password" name="password" placeholder="Enter admin password" autofocus required>
            </div>
            <div class="btn-row">
              <button type="submit" class="filled-button"><i class="fa-solid fa-key"></i> Sign in</button>
            </div>
          </form>
        </div>
      </div>
    `;
    res.send(renderLoginPage(`Admin Login — ${process.env.APP_NAME}`, card, renderFooter(stats, totalVisits.total, popular)));
  } catch (e) {
    next(e);
  }
});

router.post('/login', async (req, res, next) => {
  const { password } = req.body;
  if (!password || password !== process.env.ADMIN_PASSWORD) {
    try {
      const [stats, totalVisits, popular] = await Promise.all([
        db.get('SELECT COUNT(*) as total_scripts, COALESCE(SUM(downloads),0) as total_downloads, COALESCE(SUM(hearts),0) as total_hearts FROM scripts'),
        db.get('SELECT COUNT(*) as total FROM visits'),
        db.all('SELECT slug, name FROM scripts ORDER BY downloads DESC LIMIT 10'),
      ]);
      return res.send(renderLoginPage(`Admin Login — ${process.env.APP_NAME}`, `
        <div class="login-wrap fade-up">
          <div class="login-card">
            <div class="login-icon"><i class="fa-solid fa-shield-halved"></i></div>
            <h1>Admin Panel</h1>
          <p class="login-sub">uzi.pm management</p>
            <div class="login-error"><i class="fa-solid fa-circle-exclamation"></i> Invalid password</div>
            <form method="POST" action="/admin/login">
              <div class="field">
                <label>Password</label>
                <input type="password" name="password" placeholder="Enter admin password" autofocus required>
              </div>
              <div class="btn-row">
                <button type="submit" class="filled-button"><i class="fa-solid fa-key"></i> Sign in</button>
              </div>
            </form>
          </div>
        </div>
      `, renderFooter(stats, totalVisits.total, popular)));
    } catch (e) {
      return next(e);
    }
  }
  const token = generateToken();
  sessions.set(token, Date.now() + SESSION_TTL);
  res.cookie('admin_token', token, {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: SESSION_TTL,
  });
  res.redirect('/admin');
});

router.get('/logout', (req, res) => {
  const token = req.cookies?.admin_token;
  if (token) sessions.delete(token);
  res.clearCookie('admin_token');
  res.redirect('/admin/login');
});

router.use(auth);

router.get('/', async (req, res, next) => {
  try {
    const [totalScripts, totalDownloads, totalHearts, totalVisits, totalHeartLogs, recentScripts] = await Promise.all([
      db.get('SELECT COUNT(*) as count FROM scripts'),
      db.get('SELECT COALESCE(SUM(downloads),0) as total FROM scripts'),
      db.get('SELECT COALESCE(SUM(hearts),0) as total FROM scripts'),
      db.get('SELECT COUNT(*) as total FROM visits'),
      db.get('SELECT COUNT(*) as total FROM heart_logs'),
      db.all('SELECT slug, name, downloads, hearts, created_at FROM scripts ORDER BY created_at DESC LIMIT 5'),
    ]);

    const main = `
      <div class="admin-header">
        <h1>Dashboard</h1>
      </div>
      <div class="stat-grid">
        <div class="stat-card">
          <div class="stat-icon green"><i class="fa-solid fa-code"></i></div>
          <div class="stat-info">
            <span class="stat-value">${totalScripts.count}</span>
            <span class="stat-label">Scripts</span>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon green"><i class="fa-solid fa-download"></i></div>
          <div class="stat-info">
            <span class="stat-value">${totalDownloads.total}</span>
            <span class="stat-label">Downloads</span>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon pink"><i class="fa-solid fa-heart"></i></div>
          <div class="stat-info">
            <span class="stat-value">${totalHearts.total}</span>
            <span class="stat-label">Hearts</span>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon orange"><i class="fa-solid fa-eye"></i></div>
          <div class="stat-info">
            <span class="stat-value">${totalVisits.total}</span>
            <span class="stat-label">Visits</span>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon orange"><i class="fa-solid fa-heart-circle-plus"></i></div>
          <div class="stat-info">
            <span class="stat-value">${totalHeartLogs.total}</span>
            <span class="stat-label">Heart Actions</span>
          </div>
        </div>
      </div>
      <div class="admin-card">
        <h2>Recent Scripts</h2>
        ${recentScripts.length === 0 ? '<div class="empty-state-sm"><i class="fa-solid fa-code"></i><p>No scripts yet</p></div>' : `
        <table class="admin-table">
          <thead><tr><th>Name</th><th>Downloads</th><th>Hearts</th><th>Created</th></tr></thead>
          <tbody>
            ${recentScripts.map(s => `
              <tr>
                <td><strong>${s.name}</strong></td>
                <td>${s.downloads}</td>
                <td>${s.hearts}</td>
                <td>${new Date(s.created_at).toLocaleDateString()}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        `}
      </div>
    `;
    res.send(renderPage(`Admin Dashboard — ${process.env.APP_NAME}`, sidebar('dashboard'), main));
  } catch (e) {
    next(e);
  }
});

router.get('/scripts', async (req, res, next) => {
  try {
    const scripts = await db.all('SELECT * FROM scripts ORDER BY created_at DESC');
    const main = `
      <div class="admin-header">
        <h1>Scripts</h1>
        <a href="/admin/scripts/new" class="filled-button"><i class="fa-solid fa-plus"></i> New Script</a>
      </div>
      <div class="admin-card">
        ${scripts.length === 0 ? '<div class="empty-state-sm"><i class="fa-solid fa-code"></i><p>No scripts yet</p></div>' : `
        <table class="admin-table">
          <thead><tr><th>Name</th><th>Slug</th><th>Distro</th><th>Downloads</th><th>Hearts</th><th>Actions</th></tr></thead>
          <tbody>
            ${scripts.map(s => `
              <tr>
                <td><strong>${s.name}</strong></td>
                <td><code style="font-size:12px;color:var(--md-on-surface-variant)">${s.slug}</code></td>
                <td><span class="chip">${s.distro.split(',')[0]}${s.distro.indexOf(',') > -1 ? ' +' + s.distro.split(',').length : ''}</span></td>
                <td>${s.downloads}</td>
                <td>${s.hearts}</td>
                <td class="actions">
                  <a href="/admin/scripts/${s.id}/edit" class="tonal-button icon-only" style="padding:6px;min-width:32px;min-height:32px;font-size:13px" title="Edit"><i class="fa-solid fa-pen-to-square"></i></a>
                  <form method="POST" action="/admin/scripts/${s.id}/delete" onsubmit="return confirm('Delete script \\'${s.name}\\'? This cannot be undone.')">
                    <button type="submit" class="tonal-button icon-only" style="padding:6px;min-width:32px;min-height:32px;font-size:13px;background:var(--md-tertiary-container);color:var(--md-tertiary)" title="Delete"><i class="fa-solid fa-trash-can"></i></button>
                  </form>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        `}
      </div>
    `;
    res.send(renderPage(`Admin Scripts — ${process.env.APP_NAME}`, sidebar('scripts'), main));
  } catch (e) {
    next(e);
  }
});

router.get('/scripts/new', async (req, res, next) => {
  try {
    const distros = await db.all('SELECT name FROM distros ORDER BY name ASC');
    const distroOpts = distros.map(d => `<option value="${escAttr(d.name)}">${escHtml(d.name)}</option>`).join('');
    const main = `
    <div class="admin-header">
      <h1>New Script</h1>
    </div>
    <div class="admin-card" style="padding:28px">
      <form method="POST" action="/admin/scripts" id="script-form">
        <div class="form-row">
          <div class="form-group">
            <label><i class="fa-solid fa-tag" style="margin-right:4px"></i> Name</label>
            <input type="text" name="name" placeholder="e.g. Nginx" required>
          </div>
          <div class="form-group">
            <label><i class="fa-solid fa-link" style="margin-right:4px"></i> Slug</label>
            <input type="text" name="slug" placeholder="e.g. nginx" required>
          </div>
        </div>
        <div class="form-group">
          <label>Description</label>
          <input type="text" name="description" placeholder="Short description" required>
        </div>
        <div class="form-group">
          <label>Long Description</label>
          <textarea name="long_desc" placeholder="Detailed description (optional)" style="min-height:60px;font-family:'Inter',sans-serif"></textarea>
        </div>
        <div class="form-group">
          <label>Distros</label>
          <div id="distro-list">
            <div class="distro-row" style="display:flex;gap:8px;margin-bottom:8px;align-items:flex-end">
              <div style="flex:1">
                <select name="distro_name" required style="width:100%;padding:10px 14px;background:var(--md-surface-container-high);border:1px solid var(--md-outline-variant);border-radius:var(--shape-sm);color:var(--md-on-surface);font-family:'Inter',sans-serif;font-size:14px;outline:none">
                  ${distroOpts}
                </select>
              </div>
              <div style="flex:1">
                <input type="text" name="distro_tested" placeholder="Tested on (e.g. 22.04)" style="width:100%;padding:10px 14px;background:var(--md-surface-container-high);border:1px solid var(--md-outline-variant);border-radius:var(--shape-sm);color:var(--md-on-surface);font-family:'Inter',sans-serif;font-size:14px;outline:none">
              </div>
              <button type="button" onclick="this.parentElement.remove()" style="padding:10px 14px;background:none;border:1px solid var(--md-tertiary);color:var(--md-tertiary);border-radius:var(--shape-sm);cursor:pointer;font-size:14px;white-space:nowrap"><i class="fa-solid fa-xmark"></i></button>
            </div>
          </div>
          <button type="button" onclick="addDistroRow()" style="padding:8px 16px;background:none;border:1px dashed var(--md-outline-variant);color:var(--md-on-surface-variant);border-radius:var(--shape-sm);cursor:pointer;font-size:13px;transition:all .2s" onmouseover="this.style.borderColor='var(--md-primary)';this.style.color='var(--md-primary)'" onmouseout="this.style.borderColor='var(--md-outline-variant)';this.style.color='var(--md-on-surface-variant)'"><i class="fa-solid fa-plus"></i> Add distro</button>
          <input type="hidden" name="distro" id="distro-hidden">
          <input type="hidden" name="tested_on" id="tested-hidden">
        </div>
        <div class="form-group">
          <label>Script Content</label>
          <div style="display:flex;gap:8px;margin-bottom:8px">
            <div class="shell-tab active" data-shell="bash" onclick="switchShell('bash')" style="padding:6px 16px;border-radius:20px;font-size:13px;font-weight:500;cursor:pointer;background:var(--md-primary-container);color:var(--md-on-primary-container);border:none;transition:all .2s"><i class="fa-brands fa-linux"></i> Bash</div>
            <div class="shell-tab" data-shell="ps1" onclick="switchShell('ps1')" style="padding:6px 16px;border-radius:20px;font-size:13px;font-weight:500;cursor:pointer;background:var(--md-surface-container-high);color:var(--md-on-surface-variant);border:none;transition:all .2s"><i class="fa-brands fa-windows"></i> PowerShell</div>
          </div>
          <div class="editor-wrap" id="editor-bash">
            <div class="editor-bar">
              <span class="dot red"></span><span class="dot yellow"></span><span class="dot green"></span>
              <span class="editor-title">script.sh</span>
            </div>
            <div class="editor-body">
              <textarea name="script_content" id="script-editor" placeholder="#!/bin/bash&#10;..." required spellcheck="false"></textarea>
            </div>
          </div>
          <div class="editor-wrap" id="editor-ps1" style="display:none">
            <div class="editor-bar">
              <span class="dot red"></span><span class="dot yellow"></span><span class="dot green"></span>
              <span class="editor-title">script.ps1</span>
            </div>
            <div class="editor-body">
              <textarea name="script_content_ps1" id="script-editor-ps1" placeholder="# PowerShell script&#10;..." spellcheck="false"></textarea>
            </div>
          </div>
        </div>
        <div class="btn-row">
          <button type="submit" class="filled-button"><i class="fa-solid fa-floppy-disk"></i> Save</button>
          <a href="/admin/scripts" class="text-button">Cancel</a>
        </div>
      </form>
    </div>
    <script>
    function switchShell(shell) {
      document.querySelectorAll('.shell-tab').forEach(function(t) {
        t.style.background = t.dataset.shell === shell ? 'var(--md-primary-container)' : 'var(--md-surface-container-high)';
        t.style.color = t.dataset.shell === shell ? 'var(--md-on-primary-container)' : 'var(--md-on-surface-variant)';
      });
      document.getElementById('editor-bash').style.display = shell === 'bash' ? '' : 'none';
      document.getElementById('editor-ps1').style.display = shell === 'ps1' ? '' : 'none';
    }
    function addDistroRow(name, tested) {
      var list = document.getElementById('distro-list');
      var row = document.createElement('div');
      row.className = 'distro-row';
      row.style.cssText = 'display:flex;gap:8px;margin-bottom:8px;align-items:flex-end';
      var sel = document.createElement('select');
      sel.name = 'distro_name';
      sel.required = true;
      sel.style.cssText = 'width:100%;padding:10px 14px;background:var(--md-surface-container-high);border:1px solid var(--md-outline-variant);border-radius:var(--shape-sm);color:var(--md-on-surface);font-size:14px;outline:none';
      sel.innerHTML = '${distroOpts}';
      if (name) sel.value = name;
      var inp = document.createElement('input');
      inp.type = 'text';
      inp.name = 'distro_tested';
      inp.placeholder = 'Tested on (e.g. 22.04)';
      inp.value = tested || '';
      inp.style.cssText = 'width:100%;padding:10px 14px;background:var(--md-surface-container-high);border:1px solid var(--md-outline-variant);border-radius:var(--shape-sm);color:var(--md-on-surface);font-size:14px;outline:none';
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.innerHTML = '<i class="fa-solid fa-xmark"></i>';
      btn.onclick = function(){ row.remove(); };
      btn.style.cssText = 'padding:10px 14px;background:none;border:1px solid var(--md-tertiary);color:var(--md-tertiary);border-radius:var(--shape-sm);cursor:pointer;font-size:14px;white-space:nowrap';
      var d1 = document.createElement('div');
      d1.style.flex = '1';
      d1.appendChild(sel);
      var d2 = document.createElement('div');
      d2.style.flex = '1';
      d2.appendChild(inp);
      row.appendChild(d1);
      row.appendChild(d2);
      row.appendChild(btn);
      list.appendChild(row);
    }
    function collectDistros() {
      var names = [], testeds = [];
      document.querySelectorAll('#distro-list .distro-row').forEach(function(row) {
        var n = row.querySelector('select').value;
        var t = row.querySelector('input').value;
        if (n) { names.push(n); testeds.push(t); }
      });
      document.getElementById('distro-hidden').value = names.join(',');
      document.getElementById('tested-hidden').value = testeds.join(';;');
      return names.length > 0;
    }
    document.addEventListener('DOMContentLoaded', function() {
      var form = document.getElementById('script-form');
      if (form) form.addEventListener('submit', collectDistros);
      var editor = document.getElementById('script-editor');
      if (editor) {
        editor.addEventListener('keydown', function(e) {
          if (e.key === 'Tab') {
            e.preventDefault();
            var s = this.selectionStart;
            this.value = this.value.substring(0, s) + '  ' + this.value.substring(this.selectionEnd);
            this.selectionStart = this.selectionEnd = s + 2;
          }
        });
      }
      var editorPs1 = document.getElementById('script-editor-ps1');
      if (editorPs1) {
        editorPs1.addEventListener('keydown', function(e) {
          if (e.key === 'Tab') {
            e.preventDefault();
            var s = this.selectionStart;
            this.value = this.value.substring(0, s) + '  ' + this.value.substring(this.selectionEnd);
            this.selectionStart = this.selectionEnd = s + 2;
          }
        });
      }
    });
    </script>
  `;
  res.send(renderPage('New Script — Admin', sidebar('scripts'), main));
  } catch (e) { next(e); }
});

router.post('/scripts', async (req, res, next) => {
  try {
    const { slug, name, description, long_desc, distro, tested_on, script_content } = req.body;
    if (!slug || !name || !description || !distro || !script_content) {
      return res.status(400).send(renderPage('Error — Admin', sidebar('scripts'), '<p style="color:var(--md-tertiary)">Missing required fields</p><a href="/admin/scripts/new" class="text-button">Go back</a>'));
    }
    await db.run(
      'INSERT INTO scripts (slug, name, description, long_desc, distro, tested_on, script_content, script_content_ps1) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [slug, name, description, long_desc || '', distro, tested_on || '', script_content, req.body.script_content_ps1 || '']
    );
    res.redirect('/admin/scripts');
  } catch (e) {
    if (e.message && e.message.includes('UNIQUE constraint')) {
      return res.status(400).send(renderPage('Error — Admin', sidebar('scripts'), `<p style="color:var(--md-tertiary)">Slug "${req.body.slug}" already exists</p><a href="/admin/scripts/new" class="text-button">Go back</a>`));
    }
    next(e);
  }
});

router.get('/scripts/:id/edit', async (req, res, next) => {
  try {
    const script = await db.get('SELECT * FROM scripts WHERE id = ?', [req.params.id]);
    if (!script) return res.status(404).send(renderPage('Not Found', sidebar('scripts'), '<p>Script not found</p><a href="/admin/scripts" class="text-button">Back</a>'));

    const distros = await db.all('SELECT name FROM distros ORDER BY name ASC');
    const distroOpts = distros.map(d => `<option value="${escAttr(d.name)}">${escHtml(d.name)}</option>`).join('');
    const distroNames = (script.distro || '').split(',').filter(Boolean);
    const distroTesteds = (script.tested_on || '').split(';;').filter(Boolean);

    const main = `
      <div class="admin-header">
        <h1>Edit: ${script.name}</h1>
      </div>
      <div class="admin-card" style="padding:28px">
        <form method="POST" action="/admin/scripts/${script.id}/update" id="script-form">
          <div class="form-row">
            <div class="form-group">
              <label><i class="fa-solid fa-tag" style="margin-right:4px"></i> Name</label>
              <input type="text" name="name" value="${escAttr(script.name)}" required>
            </div>
            <div class="form-group">
              <label><i class="fa-solid fa-link" style="margin-right:4px"></i> Slug</label>
              <input type="text" name="slug" value="${escAttr(script.slug)}" required>
            </div>
          </div>
          <div class="form-group">
            <label>Description</label>
            <input type="text" name="description" value="${escAttr(script.description)}" required>
          </div>
          <div class="form-group">
            <label>Long Description</label>
            <textarea name="long_desc" style="min-height:60px;font-family:'Inter',sans-serif">${escHtml(script.long_desc || '')}</textarea>
          </div>
          <div class="form-group">
            <label>Distros</label>
            <div id="distro-list">
              ${(function(){
                var rows = [];
                for (var i = 0; i < Math.max(1, distroNames.length); i++) {
                  var n = distroNames[i] || '';
                  var t = distroTesteds[i] || '';
                  var opts = distros.map(function(d) {
                    return '<option value="' + escAttr(d.name) + '"' + (d.name === n ? ' selected' : '') + '>' + escHtml(d.name) + '</option>';
                  }).join('');
                  var displayT = (t.indexOf(n) === 0) ? t.substring(n.length).trim() : t;
                  rows.push('<div class="distro-row" style="display:flex;gap:8px;margin-bottom:8px;align-items:flex-end"><div style="flex:1"><select name="distro_name" required style="width:100%;padding:10px 14px;background:var(--md-surface-container-high);border:1px solid var(--md-outline-variant);border-radius:var(--shape-sm);color:var(--md-on-surface);font-family:\'Inter\',sans-serif;font-size:14px;outline:none">' + opts + '</select></div><div style="flex:1"><input type="text" name="distro_tested" placeholder="Tested on" value="' + escAttr(displayT) + '" style="width:100%;padding:10px 14px;background:var(--md-surface-container-high);border:1px solid var(--md-outline-variant);border-radius:var(--shape-sm);color:var(--md-on-surface);font-family:\'Inter\',sans-serif;font-size:14px;outline:none"></div><button type="button" onclick="this.parentElement.remove()" style="padding:10px 14px;background:none;border:1px solid var(--md-tertiary);color:var(--md-tertiary);border-radius:var(--shape-sm);cursor:pointer;font-size:14px;white-space:nowrap"><i class="fa-solid fa-xmark"></i></button></div>');
                }
                return rows.join('');
              })()}
            </div>
            <button type="button" onclick="addDistroRow()" style="padding:8px 16px;background:none;border:1px dashed var(--md-outline-variant);color:var(--md-on-surface-variant);border-radius:var(--shape-sm);cursor:pointer;font-size:13px;transition:all .2s" onmouseover="this.style.borderColor='var(--md-primary)';this.style.color='var(--md-primary)'" onmouseout="this.style.borderColor='var(--md-outline-variant)';this.style.color='var(--md-on-surface-variant)'"><i class="fa-solid fa-plus"></i> Add distro</button>
            <input type="hidden" name="distro" id="distro-hidden">
            <input type="hidden" name="tested_on" id="tested-hidden">
          </div>
          <div class="form-group">
            <label>Script Content</label>
            <div style="display:flex;gap:8px;margin-bottom:8px">
              <div class="shell-tab active" data-shell="bash" onclick="switchShell('bash')" style="padding:6px 16px;border-radius:20px;font-size:13px;font-weight:500;cursor:pointer;background:var(--md-primary-container);color:var(--md-on-primary-container);border:none;transition:all .2s"><i class="fa-brands fa-linux"></i> Bash</div>
              <div class="shell-tab" data-shell="ps1" onclick="switchShell('ps1')" style="padding:6px 16px;border-radius:20px;font-size:13px;font-weight:500;cursor:pointer;background:var(--md-surface-container-high);color:var(--md-on-surface-variant);border:none;transition:all .2s"><i class="fa-brands fa-windows"></i> PowerShell</div>
            </div>
            <div class="editor-wrap" id="editor-bash">
              <div class="editor-bar">
                <span class="dot red"></span><span class="dot yellow"></span><span class="dot green"></span>
                <span class="editor-title">script.sh</span>
              </div>
              <div class="editor-body">
                <textarea name="script_content" id="script-editor" required spellcheck="false">${escHtml(script.script_content)}</textarea>
              </div>
            </div>
            <div class="editor-wrap" id="editor-ps1" style="display:none">
              <div class="editor-bar">
                <span class="dot red"></span><span class="dot yellow"></span><span class="dot green"></span>
                <span class="editor-title">script.ps1</span>
              </div>
              <div class="editor-body">
                <textarea name="script_content_ps1" id="script-editor-ps1" placeholder="# PowerShell script&#10;..." spellcheck="false">${escHtml(script.script_content_ps1 || '')}</textarea>
              </div>
            </div>
          </div>
          <div class="btn-row">
            <button type="submit" class="filled-button"><i class="fa-solid fa-floppy-disk"></i> Update</button>
            <a href="/admin/scripts" class="text-button">Cancel</a>
          </div>
        </form>
      </div>
      <script>
      function switchShell(shell) {
        document.querySelectorAll('.shell-tab').forEach(function(t) {
          t.style.background = t.dataset.shell === shell ? 'var(--md-primary-container)' : 'var(--md-surface-container-high)';
          t.style.color = t.dataset.shell === shell ? 'var(--md-on-primary-container)' : 'var(--md-on-surface-variant)';
        });
        document.getElementById('editor-bash').style.display = shell === 'bash' ? '' : 'none';
        document.getElementById('editor-ps1').style.display = shell === 'ps1' ? '' : 'none';
      }
      function addDistroRow(name, tested) {
        var list = document.getElementById('distro-list');
        var row = document.createElement('div');
        row.className = 'distro-row';
        row.style.cssText = 'display:flex;gap:8px;margin-bottom:8px;align-items:flex-end';
        var sel = document.createElement('select');
        sel.name = 'distro_name';
        sel.required = true;
        sel.style.cssText = 'width:100%;padding:10px 14px;background:var(--md-surface-container-high);border:1px solid var(--md-outline-variant);border-radius:var(--shape-sm);color:var(--md-on-surface);font-size:14px;outline:none';
        sel.innerHTML = '${distroOpts}';
        if (name) sel.value = name;
        var inp = document.createElement('input');
        inp.type = 'text';
        inp.name = 'distro_tested';
        inp.placeholder = 'Tested on (e.g. 22.04)';
        inp.value = tested || '';
        inp.style.cssText = 'width:100%;padding:10px 14px;background:var(--md-surface-container-high);border:1px solid var(--md-outline-variant);border-radius:var(--shape-sm);color:var(--md-on-surface);font-size:14px;outline:none';
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.innerHTML = '<i class="fa-solid fa-xmark"></i>';
        btn.onclick = function(){ row.remove(); };
        btn.style.cssText = 'padding:10px 14px;background:none;border:1px solid var(--md-tertiary);color:var(--md-tertiary);border-radius:var(--shape-sm);cursor:pointer;font-size:14px;white-space:nowrap';
        var d1 = document.createElement('div');
        d1.style.flex = '1';
        d1.appendChild(sel);
        var d2 = document.createElement('div');
        d2.style.flex = '1';
        d2.appendChild(inp);
        row.appendChild(d1);
        row.appendChild(d2);
        row.appendChild(btn);
        list.appendChild(row);
      }
      function collectDistros() {
        var names = [], testeds = [];
        document.querySelectorAll('#distro-list .distro-row').forEach(function(row) {
          var n = row.querySelector('select').value;
          var t = row.querySelector('input').value;
          if (n) { names.push(n); testeds.push(t ? n + ' ' + t : n); }
        });
        document.getElementById('distro-hidden').value = names.join(',');
        document.getElementById('tested-hidden').value = testeds.join(';;');
        return names.length > 0;
      }
      document.addEventListener('DOMContentLoaded', function() {
        var form = document.getElementById('script-form');
        if (form) form.addEventListener('submit', collectDistros);
        var editor = document.getElementById('script-editor');
        if (editor) {
          editor.addEventListener('keydown', function(e) {
            if (e.key === 'Tab') {
              e.preventDefault();
              var s = this.selectionStart;
              this.value = this.value.substring(0, s) + '  ' + this.value.substring(this.selectionEnd);
              this.selectionStart = this.selectionEnd = s + 2;
            }
          });
        }
        var editorPs1 = document.getElementById('script-editor-ps1');
        if (editorPs1) {
          editorPs1.addEventListener('keydown', function(e) {
            if (e.key === 'Tab') {
              e.preventDefault();
              var s = this.selectionStart;
              this.value = this.value.substring(0, s) + '  ' + this.value.substring(this.selectionEnd);
              this.selectionStart = this.selectionEnd = s + 2;
            }
          });
        }
      });
      </script>
    `;
    res.send(renderPage(`Edit ${script.name} — Admin`, sidebar('scripts'), main));
  } catch (e) {
    next(e);
  }
});

router.post('/scripts/:id/update', async (req, res, next) => {
  try {
    const { slug, name, description, long_desc, distro, tested_on, script_content } = req.body;
    if (!slug || !name || !description || !distro || !script_content) {
      return res.status(400).send(renderPage('Error — Admin', sidebar('scripts'), '<p style="color:var(--md-tertiary)">Missing required fields</p>'));
    }
    await db.run(
      'UPDATE scripts SET slug=?, name=?, description=?, long_desc=?, distro=?, tested_on=?, script_content=?, script_content_ps1=? WHERE id=?',
      [slug, name, description, long_desc || '', distro, tested_on || '', script_content, req.body.script_content_ps1 || '', req.params.id]
    );
    res.redirect('/admin/scripts');
  } catch (e) {
    if (e.message && e.message.includes('UNIQUE constraint')) {
      return res.status(400).send(renderPage('Error — Admin', sidebar('scripts'), `<p style="color:var(--md-tertiary)">Slug "${req.body.slug}" already exists</p>`));
    }
    next(e);
  }
});

router.post('/scripts/:id/delete', async (req, res, next) => {
  try {
    await db.run('DELETE FROM heart_logs WHERE script_id = ?', [req.params.id]);
    await db.run('DELETE FROM scripts WHERE id = ?', [req.params.id]);
    res.redirect('/admin/scripts');
  } catch (e) {
    next(e);
  }
});

router.get('/distros', async (req, res, next) => {
  try {
    const distros = await db.all('SELECT * FROM distros ORDER BY name ASC');
    const ICONS = ['fa-brands fa-ubuntu','fa-brands fa-debian','fa-brands fa-archlinux','fa-brands fa-fedora','fa-brands fa-centos','fa-brands fa-redhat','fa-brands fa-suse','fa-brands fa-linux','fa-brands fa-windows','fa-brands fa-apple','fa-solid fa-terminal','fa-solid fa-cloud','fa-solid fa-server','fa-solid fa-microchip'];
    const main = `
      <div class="admin-header">
        <h1>Distros</h1>
      </div>
      <div class="admin-card">
        <div style="margin-bottom:16px;padding-bottom:16px;border-bottom:1px solid var(--md-outline-variant)">
          <form method="POST" action="/admin/distros" style="display:flex;gap:8px;align-items:flex-end;flex-wrap:wrap">
            <div class="form-group" style="margin:0;flex:1;min-width:140px">
              <label>Name</label>
              <input type="text" name="name" placeholder="e.g. OpenSUSE" required style="border-radius:var(--shape-md)">
            </div>
            <div class="form-group" style="margin:0;flex:1;min-width:140px">
              <label>Icon</label>
              <select name="icon" style="width:100%;padding:10px 14px;background:var(--md-surface-container-high);border:1px solid var(--md-outline-variant);border-radius:var(--shape-md);color:var(--md-on-surface);font-family:'Inter',sans-serif;font-size:14px;outline:none">
                ${ICONS.map(ic => `<option value="${ic}" ${ic === 'fa-solid fa-terminal' ? 'selected' : ''}><i class="${ic}"></i> ${ic.replace('fa-brands fa-','').replace('fa-solid fa-','')}</option>`).join('')}
              </select>
            </div>
            <button type="submit" class="filled-button" style="white-space:nowrap;padding:10px 20px"><i class="fa-solid fa-plus"></i> Add</button>
          </form>
        </div>
        ${distros.length === 0 ? '<div class="empty-state-sm"><i class="fa-solid fa-server"></i><p>No distros yet</p></div>' : `
        <table class="admin-table">
          <thead><tr><th>Icon</th><th>Name</th><th style="width:80px">Actions</th></tr></thead>
          <tbody>
            ${distros.map(d => `
              <tr>
                <td><i class="${escAttr(d.icon || 'fa-solid fa-terminal')}" style="font-size:18px;color:var(--md-primary)"></i></td>
                <td><strong>${escHtml(d.name)}</strong></td>
                <td class="actions">
                  <form method="POST" action="/admin/distros/${d.id}/delete" onsubmit="return confirm('Delete distro \\'${escAttr(d.name)}\\'?')">
                    <button type="submit" class="tonal-button icon-only" style="padding:6px;min-width:32px;min-height:32px;font-size:13px;background:var(--md-tertiary-container);color:var(--md-tertiary)" title="Delete"><i class="fa-solid fa-trash-can"></i></button>
                  </form>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        `}
      </div>
    `;
    res.send(renderPage(`Admin Distros — ${process.env.APP_NAME}`, sidebar('distros'), main));
  } catch (e) {
    next(e);
  }
});

router.post('/distros', async (req, res, next) => {
  try {
    const name = (req.body.name || '').trim();
    if (!name) return res.redirect('/admin/distros');
    await db.run('INSERT OR IGNORE INTO distros (name, icon) VALUES (?, ?)', [name, req.body.icon || 'fa-solid fa-terminal']);
    res.redirect('/admin/distros');
  } catch (e) {
    next(e);
  }
});

router.post('/distros/:id/delete', async (req, res, next) => {
  try {
    await db.run('DELETE FROM distros WHERE id = ?', [req.params.id]);
    res.redirect('/admin/distros');
  } catch (e) {
    next(e);
  }
});

function escHtml(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function escAttr(str) {
  return String(str).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

module.exports = router;
