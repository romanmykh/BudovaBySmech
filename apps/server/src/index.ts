import express, { type NextFunction, type Request, type Response } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { db, type ProjectRow, type UserRow } from './db.js';

const PORT = Number(process.env.PORT ?? 8787);
const SECRET = process.env.JWT_SECRET ?? 'dev-secret-change-me';
const COOKIE = 'budova_token';
const TOKEN_TTL = '30d';

const app = express();
app.use(express.json({ limit: '8mb' }));
app.use(cookieParser());
app.use(
  cors({
    origin: (origin, cb) => cb(null, true),
    credentials: true,
  }),
);

/* ------------------------------------------------------------------ */
/* Auth                                                                */
/* ------------------------------------------------------------------ */

interface AuthedRequest extends Request {
  userId?: string;
}

function sign(userId: string): string {
  return jwt.sign({ sub: userId }, SECRET, { expiresIn: TOKEN_TTL });
}

function readToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) return header.slice(7);
  const c = (req as any).cookies?.[COOKIE];
  return typeof c === 'string' ? c : null;
}

function requireAuth(req: AuthedRequest, res: Response, next: NextFunction): void {
  const token = readToken(req);
  if (!token) {
    res.status(401).json({ error: 'unauthorized' });
    return;
  }
  try {
    const payload = jwt.verify(token, SECRET) as { sub: string };
    req.userId = payload.sub;
    next();
  } catch {
    res.status(401).json({ error: 'unauthorized' });
  }
}

function setCookie(res: Response, token: string): void {
  res.cookie(COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 30 * 24 * 3600 * 1000,
  });
}

const emailOk = (e: unknown): e is string =>
  typeof e === 'string' && e.length <= 200 && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e);

/** Sign up: one form, two fields, instant access. No verification, no captcha. */
app.post('/api/auth/signup', async (req: Request, res: Response) => {
  const { email, password } = req.body ?? {};
  if (!emailOk(email)) {
    res.status(400).json({ error: 'invalidEmail' });
    return;
  }
  if (typeof password !== 'string' || password.length < 6 || password.length > 200) {
    res.status(400).json({ error: 'weakPassword' });
    return;
  }
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email) as { id: string } | undefined;
  if (existing) {
    res.status(409).json({ error: 'emailTaken' });
    return;
  }
  const id = randomUUID();
  const hash = await bcrypt.hash(password, 10);
  db.prepare('INSERT INTO users (id, email, password, created_at) VALUES (?,?,?,?)').run(
    id,
    email,
    hash,
    new Date().toISOString(),
  );
  const token = sign(id);
  setCookie(res, token);
  res.json({ token, user: { id, email } });
});

app.post('/api/auth/login', async (req: Request, res: Response) => {
  const { email, password } = req.body ?? {};
  if (typeof email !== 'string' || typeof password !== 'string') {
    res.status(400).json({ error: 'invalidCredentials' });
    return;
  }
  const row = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as UserRow | undefined;
  if (!row || !(await bcrypt.compare(password, row.password))) {
    res.status(401).json({ error: 'invalidCredentials' });
    return;
  }
  const token = sign(row.id);
  setCookie(res, token);
  res.json({ token, user: { id: row.id, email: row.email } });
});

app.post('/api/auth/logout', (_req: Request, res: Response) => {
  res.clearCookie(COOKIE);
  res.json({ ok: true });
});

app.get('/api/auth/me', requireAuth, (req: AuthedRequest, res: Response) => {
  const row = db.prepare('SELECT id, email FROM users WHERE id = ?').get(req.userId!) as
    | { id: string; email: string }
    | undefined;
  if (!row) {
    res.status(401).json({ error: 'unauthorized' });
    return;
  }
  res.json({ user: row });
});

/* ------------------------------------------------------------------ */
/* Projects                                                            */
/* ------------------------------------------------------------------ */

const listStmt = db.prepare(
  'SELECT id, name, created_at, updated_at FROM projects WHERE user_id = ? ORDER BY updated_at DESC',
);

app.get('/api/projects', requireAuth, (req: AuthedRequest, res: Response) => {
  const rows = listStmt.all(req.userId!) as Array<Omit<ProjectRow, 'data' | 'user_id'>>;
  res.json({
    projects: rows.map((r) => ({ id: r.id, name: r.name, createdAt: r.created_at, updatedAt: r.updated_at })),
  });
});

app.post('/api/projects', requireAuth, (req: AuthedRequest, res: Response) => {
  const { name, data } = req.body ?? {};
  if (typeof name !== 'string' || !name.trim() || typeof data !== 'object' || !data) {
    res.status(400).json({ error: 'invalidProject' });
    return;
  }
  const id = randomUUID();
  const now = new Date().toISOString();
  db.prepare(
    'INSERT INTO projects (id, user_id, name, data, created_at, updated_at) VALUES (?,?,?,?,?,?)',
  ).run(id, req.userId!, name.slice(0, 200), JSON.stringify(data), now, now);
  res.json({ project: { id, name, createdAt: now, updatedAt: now } });
});

app.get('/api/projects/:id', requireAuth, (req: AuthedRequest, res: Response) => {
  const row = db.prepare('SELECT * FROM projects WHERE id = ? AND user_id = ?').get(req.params.id, req.userId!) as
    | ProjectRow
    | undefined;
  if (!row) {
    res.status(404).json({ error: 'notFound' });
    return;
  }
  res.json({
    project: {
      id: row.id,
      name: row.name,
      data: JSON.parse(row.data),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    },
  });
});

app.put('/api/projects/:id', requireAuth, (req: AuthedRequest, res: Response) => {
  const { name, data } = req.body ?? {};
  const row = db.prepare('SELECT id FROM projects WHERE id = ? AND user_id = ?').get(req.params.id, req.userId!) as
    | { id: string }
    | undefined;
  if (!row) {
    res.status(404).json({ error: 'notFound' });
    return;
  }
  const now = new Date().toISOString();
  if (typeof name === 'string' && typeof data === 'object' && data) {
    db.prepare('UPDATE projects SET name = ?, data = ?, updated_at = ? WHERE id = ?').run(
      name.slice(0, 200),
      JSON.stringify(data),
      now,
      req.params.id,
    );
  } else if (typeof name === 'string') {
    db.prepare('UPDATE projects SET name = ?, updated_at = ? WHERE id = ?').run(name.slice(0, 200), now, req.params.id);
  } else if (typeof data === 'object' && data) {
    db.prepare('UPDATE projects SET data = ?, updated_at = ? WHERE id = ?').run(JSON.stringify(data), now, req.params.id);
  } else {
    res.status(400).json({ error: 'nothingToUpdate' });
    return;
  }
  res.json({ ok: true, updatedAt: now });
});

app.delete('/api/projects/:id', requireAuth, (req: AuthedRequest, res: Response) => {
  db.prepare('DELETE FROM projects WHERE id = ? AND user_id = ?').run(req.params.id, req.userId!);
  res.json({ ok: true });
});

/** Move the projects a guest kept in localStorage into the account. */
app.post('/api/projects/import', requireAuth, (req: AuthedRequest, res: Response) => {
  const { projects } = req.body ?? {};
  if (!Array.isArray(projects)) {
    res.status(400).json({ error: 'invalidPayload' });
    return;
  }
  const now = new Date().toISOString();
  const insert = db.prepare(
    'INSERT INTO projects (id, user_id, name, data, created_at, updated_at) VALUES (?,?,?,?,?,?)',
  );
  const imported: Array<{ id: string; name: string }> = [];
  const tx = db.transaction((items: Array<{ name?: string; data?: unknown }>) => {
    for (const p of items.slice(0, 200)) {
      if (!p || typeof p.data !== 'object' || !p.data) continue;
      const id = randomUUID();
      const name = typeof p.name === 'string' && p.name.trim() ? p.name.slice(0, 200) : 'Untitled';
      insert.run(id, req.userId!, name, JSON.stringify(p.data), now, now);
      imported.push({ id, name });
    }
  });
  tx(projects);
  res.json({ imported });
});

/* ------------------------------------------------------------------ */

app.get('/api/health', (_req: Request, res: Response) => res.json({ ok: true }));

// Serve the built front end when it is present, so the whole thing runs from
// one process on a single small host. The path is resolved against this file
// rather than the working directory, so `npm start` works from anywhere.
const here = dirname(fileURLToPath(import.meta.url));
const webDist = [
  resolve(here, '../../web/dist'),
  resolve(here, '../web/dist'),
  resolve(process.cwd(), 'apps/web/dist'),
].find((p) => existsSync(p));
if (webDist) {
  app.use(express.static(webDist));
  app.get(/^(?!\/api\/).*/, (_req: Request, res: Response) => {
    res.sendFile(resolve(webDist, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`budova server listening on http://localhost:${PORT}`);
});
