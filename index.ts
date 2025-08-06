import express from 'express';
import cors from 'cors';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';

const app = express();
app.use(cors());
app.use(express.json());

let db: any;

(async () => {
  db = await open({
    filename: './db/database.sqlite',
    driver: sqlite3.Database,
  });

  await db.exec(`
    CREATE TABLE IF NOT EXISTS proyectos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      url TEXT NOT NULL,
      resumen TEXT,
      fecha TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);
})();

app.post('/api/analyze', async (req, res) => {
  const { url } = req.body;
  const resumen = `Análisis simulado de ${url}`;
  const result = await db.run('INSERT INTO proyectos (url, resumen) VALUES (?, ?)', url, resumen);
  res.json({ success: true, id: result.lastID });
});

app.get('/api/proyectos', async (_, res) => {
  const rows = await db.all('SELECT * FROM proyectos ORDER BY fecha DESC');
  res.json(rows);
});

app.use(express.static('public'));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

app.listen(3000, () => {
  console.log('Backend corriendo en http://localhost:3000');
});