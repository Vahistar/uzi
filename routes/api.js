const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const db = require('../db');

router.get('/search', async (req, res, next) => {
  try {
    let query = 'SELECT slug, name, description, distro, downloads, hearts, created_at FROM scripts WHERE 1=1';
    const params = [];
    if (req.query.q) {
      query += ' AND (name LIKE ? OR description LIKE ?)';
      params.push(`%${req.query.q}%`, `%${req.query.q}%`);
    }
    if (req.query.distro && req.query.distro !== 'All') {
      query += ' AND (distro = ? OR distro LIKE ? OR distro LIKE ? OR distro LIKE ?)';
      params.push(req.query.distro, `${req.query.distro},%`, `%,${req.query.distro}`, `%,${req.query.distro},%`);
    }
    const sort = req.query.sort || 'popular';
    if (sort === 'popular') query += ' ORDER BY downloads DESC';
    else if (sort === 'newest') query += ' ORDER BY created_at DESC';
    else if (sort === 'hearts') query += ' ORDER BY hearts DESC';
    const scripts = await db.all(query, params);
    res.json(scripts);
  } catch (e) {
    next(e);
  }
});

router.get('/scripts/:slug', async (req, res, next) => {
  try {
    const script = await db.get('SELECT * FROM scripts WHERE slug = ?', [req.params.slug]);
    if (!script) return res.status(404).json({ error: 'Not found' });
    res.json(script);
  } catch (e) {
    next(e);
  }
});

router.get('/stats', async (req, res, next) => {
  try {
    const totalScripts = await db.get('SELECT COUNT(*) as count FROM scripts');
    const totalDownloads = await db.get('SELECT COALESCE(SUM(downloads),0) as total FROM scripts');
    const totalHearts = await db.get('SELECT COALESCE(SUM(hearts),0) as total FROM scripts');
    const totalVisits = await db.get('SELECT COUNT(*) as total FROM visits');
    res.json({
      total_scripts: totalScripts.count,
      total_downloads: totalDownloads.total,
      total_hearts: totalHearts.total,
      total_visits: totalVisits.total,
    });
  } catch (e) {
    next(e);
  }
});

router.get('/hearts/:slug/status', async (req, res, next) => {
  try {
    const script = await db.get('SELECT id FROM scripts WHERE slug = ?', [req.params.slug]);
    if (!script) return res.status(404).json({ error: 'Not found' });
    const ipHash = req.ip_hash;
    const recent = await db.get(
      'SELECT id FROM heart_logs WHERE script_id = ? AND ip_hash = ? AND created_at > datetime("now", "-1 day")',
      [script.id, ipHash]
    );
    res.json({ liked: !!recent });
  } catch (e) {
    next(e);
  }
});

router.post('/hearts/:slug', async (req, res, next) => {
  try {
    const script = await db.get('SELECT id, hearts FROM scripts WHERE slug = ?', [req.params.slug]);
    if (!script) return res.status(404).json({ error: 'Not found' });
    const token = req.headers['x-heart-token'] || '';
    const ipHash = req.ip_hash;
    const recent = await db.get(
      'SELECT id FROM heart_logs WHERE script_id = ? AND ip_hash = ? AND created_at > datetime("now", "-1 day")',
      [script.id, ipHash]
    );
    if (recent) {
      await db.run('DELETE FROM heart_logs WHERE id = ?', [recent.id]);
      await db.run('UPDATE scripts SET hearts = MAX(0, hearts - 1) WHERE id = ?', [script.id]);
      const updated = await db.get('SELECT hearts FROM scripts WHERE id = ?', [script.id]);
      return res.json({ hearts: updated.hearts, action: 'removed' });
    }
    await db.run('UPDATE scripts SET hearts = hearts + 1 WHERE id = ?', [script.id]);
    await db.run('INSERT INTO heart_logs (script_id, ip_hash, token) VALUES (?, ?, ?)', [script.id, ipHash, token]);
    const updated = await db.get('SELECT hearts FROM scripts WHERE id = ?', [script.id]);
    res.json({ hearts: updated.hearts, action: 'added' });
  } catch (e) {
    next(e);
  }
});

router.post('/reset', async (req, res, next) => {
  try {
    await db.run('DELETE FROM visits');
    await db.run('DELETE FROM heart_logs');
    await db.run('UPDATE scripts SET downloads = 0, hearts = 0');
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

router.get('/distros', async (req, res, next) => {
  try {
    const distros = await db.all('SELECT name, icon FROM distros ORDER BY name ASC');
    res.json(Object.fromEntries(distros.map(d => [d.name, d.icon || 'fa-solid fa-terminal'])));
  } catch (e) {
    next(e);
  }
});

module.exports = router;
