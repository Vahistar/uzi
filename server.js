require('dotenv').config();

const express = require('express');
const path = require('path');
const crypto = require('crypto');
const cookieParser = require('cookie-parser');
const db = require('./db');

const app = express();
const PORT = parseInt(process.env.APP_PORT, 10);
const HOST = process.env.APP_HOST;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use((req, res, next) => {
  const ip_hash = crypto.createHash('sha256').update(req.ip || req.connection.remoteAddress || 'unknown').digest('hex').slice(0, 16);
  req.ip_hash = ip_hash;
  if (req.path === '/' || req.path.startsWith('/script/') || req.path.startsWith('/search')) {
    db.run(
      'INSERT INTO visits (path, ip_hash, user_agent) VALUES (?, ?, ?)',
      [req.path, ip_hash, req.headers['user-agent'] || '']
    ).catch(() => {});
  }
  next();
});

app.use(express.static(path.join(__dirname, 'public')));

const pagesRouter = require('./routes/pages');
const apiRouter = require('./routes/api');
const installRouter = require('./routes/install');
const adminRouter = require('./routes/admin');

app.use('/', pagesRouter);
app.use('/api', apiRouter);
app.use('/install', installRouter);
app.use('/admin', adminRouter);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).send('Internal Server Error');
});

async function start() {
  await db.getDb();
  console.log('DB ready.');
  app.listen(PORT, HOST, () => {
    console.log(`${process.env.APP_NAME || 'App'} running at http://${HOST}:${PORT}`);
  });
}

start().catch(e => { console.error(e); process.exit(1); });
