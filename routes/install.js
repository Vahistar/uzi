const express = require('express');
const router = express.Router();
const db = require('../db');

router.get('/:slug', async (req, res, next) => {
  try {
    const script = await db.get('SELECT * FROM scripts WHERE slug = ?', [req.params.slug]);
    if (!script) return res.status(404).type('text/plain').send('Not found\n');
    await db.run('UPDATE scripts SET downloads = downloads + 1 WHERE id = ?', [script.id]);
    const shell = req.query.shell || 'bash';
    if (shell === 'ps1' && script.script_content_ps1) {
      return res.type('text/plain').send(script.script_content_ps1);
    }
    res.type('text/plain').send(script.script_content);
  } catch (e) {
    next(e);
  }
});

module.exports = router;
