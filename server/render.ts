import fs from 'fs';
import path from 'path';
import type { Response } from 'express';
import { redact } from './upstream.js';

const TEMPLATE_PATH = path.join(process.cwd(), 'index.html');
let templateCache: string | null = null;

function loadTemplate(): string {
  if (templateCache && process.env.NODE_ENV === 'production') return templateCache;
  templateCache = fs.readFileSync(TEMPLATE_PATH, 'utf8');
  return templateCache;
}

const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));

/** JSON aman untuk ditanam di dalam <script type="application/json"> */
const safeJson = (value: unknown) =>
  JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');

export interface PageOptions {
  status?: number;
  title?: string;
  data: Record<string, unknown>;
}

/** Kirim halaman HTML lengkap. Data ditanam di dalam HTML, bukan lewat endpoint JSON. */
export function renderPage(res: Response, { status = 200, title, data }: PageOptions) {
  const fullTitle = title ? `${title} - HenVeronime` : 'HenVeronime - Anime Streaming';
  const html = loadTemplate()
    .replace('%%TITLE%%', () => escapeHtml(fullTitle))
    .replace('%%PAGE_DATA%%', () => safeJson(redact(data)));

  res.status(status).type('html').set('X-Content-Type-Options', 'nosniff').send(html);
}
