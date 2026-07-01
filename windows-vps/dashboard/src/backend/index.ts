import express from 'express';
import cors from 'cors';
import { apiRouter } from './routes/api.js';
import path from 'path';
import fs from 'fs';

const PORT = parseInt(process.env.PORT || '9876', 10);
const app = express();

app.use(cors());
app.use(express.json());
app.use('/a', apiRouter);

const baseDir = typeof __dirname !== 'undefined' ? __dirname : process.cwd();
const frontendDirs = [
  path.resolve(baseDir, '../frontend'),
  path.resolve(baseDir, '../../dist/frontend'),
  path.resolve(process.cwd(), 'dist/frontend'),
  path.resolve(path.dirname(process.execPath), 'frontend'),
];
const frontendDist = frontendDirs.find(d => fs.existsSync(path.join(d, 'index.html')));

if (frontendDist) {
  app.use(express.static(frontendDist));
  app.get('/{*splat}', (_req, res) => {
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
}

app.listen(PORT, '127.0.0.1', () => {
  console.log(`Parakram VPS Dashboard running on http://127.0.0.1:${PORT}`);
});
