import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import multer from 'multer';
import QRCode from 'qrcode';
import dotenv from 'dotenv';
import {
  db,
  initDatabase,
  verifyPassword,
  hashPassword,
  signToken,
  verifyToken,
  normalizeBdMobile,
  isValidBdMobile,
  logAudit,
} from './src/server/db.ts';
import type { TokenPayload } from './src/server/db.ts';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT || 3000);
const UPLOADS_DIR = path.resolve(process.cwd(), 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

app.use(express.json({ limit: '4mb' }));
app.use('/uploads', express.static(UPLOADS_DIR));

// Safe file upload validation
const ALLOWED_MIMES = new Set(['image/jpeg', 'image/png', 'image/webp', 'application/pdf']);
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase().replace(/[^a-z0-9.]/g, '');
    const safeExt = ['.jpg', '.jpeg', '.png', '.webp', '.pdf'].includes(ext) ? ext : '.bin';
    cb(null, `hcfb_${Date.now()}_${Math.random().toString(36).slice(2, 8)}${safeExt}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIMES.has(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Allowed: JPG, PNG, WEBP, PDF.'));
    }
  },
});

interface AuthedRequest extends Request {
  user?: TokenPayload;
}

function parseCookies(req: Request): Record<string, string> {
  const header = req.headers.cookie;
  if (!header) return {};
  const result: Record<string, string> = {};
  for (const part of header.split(';')) {
    const idx = part.indexOf('=');
    if (idx > 0) {
      const k = part.slice(0, idx).trim();
      const v = decodeURIComponent(part.slice(idx + 1).trim());
      result[k] = v;
    }
  }
  return result;
}

function extractToken(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7).trim();
  }
  const cookies = parseCookies(req);
  return cookies.hcfb_session || null;
}

function requireAuth(roles?: string[]) {
  return (req: AuthedRequest, res: Response, next: NextFunction) => {
    const token = extractToken(req);
    if (!token) {
      res.status(401).json({ error: 'Authentication required.' });
      return;
    }
    const payload = verifyToken(token);
    if (!payload) {
      res.status(401).json({ error: 'Session expired or invalid.' });
      return;
    }
    if (roles && !roles.includes(payload.role)) {
      res.status(403).json({ error: 'Insufficient permissions for this action.' });
      return;
    }
    req.user = payload;
    next();
  };
}

const ADMIN_ROLES = ['super_admin', 'content_editor', 'registration_manager'];
const STAFF_ROLES = ['super_admin', 'content_editor', 'registration_manager', 'judge'];

// ==================== PUBLIC ROUTES ====================

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/public/bootstrap', (_req, res) => {
  const settingsRows = db.prepare('SELECT key, value_json FROM website_settings').all() as Array<{
    key: string;
    value_json: string;
  }>;
  const settings: Record<string, unknown> = {};
  for (const row of settingsRows) {
    try {
      settings[row.key] = JSON.parse(row.value_json);
    } catch {
      settings[row.key] = row.value_json;
    }
  }

  const totalRegs = (db.prepare('SELECT COUNT(*) as c FROM registrations').get() as { c: number }).c;
  const sampleRegs = (db.prepare('SELECT COUNT(*) as c FROM registrations WHERE is_sample = 1').get() as { c: number }).c;
  const activeComps = (
    db.prepare("SELECT COUNT(*) as c FROM competitions WHERE status = 'published'").get() as { c: number }
  ).c;
  const districtsCount = (
    db.prepare('SELECT COUNT(DISTINCT district) as c FROM registrations').get() as { c: number }
  ).c;
  const hubCount = (db.prepare('SELECT COUNT(*) as c FROM hub_resources').get() as { c: number }).c;
  const noticesCount = (
    db.prepare('SELECT COUNT(*) as c FROM notices WHERE is_published = 1').get() as { c: number }
  ).c;

  const competitions = db
    .prepare(
      `SELECT c.*,
        (SELECT COUNT(*) FROM registrations r WHERE r.competition_id = c.id) as participant_count
       FROM competitions c
       WHERE c.status IN ('published', 'closed')
       ORDER BY c.is_featured DESC, c.registration_deadline ASC`
    )
    .all() as Array<Record<string, unknown>>;

  const catsStmt = db.prepare('SELECT * FROM competition_categories WHERE competition_id = ?');
  for (const comp of competitions) {
    comp.categories = catsStmt.all(comp.id);
  }

  const notices = db
    .prepare('SELECT * FROM notices WHERE is_published = 1 ORDER BY is_important DESC, published_at DESC LIMIT 6')
    .all();

  const gallery = db.prepare('SELECT * FROM gallery_items ORDER BY created_at DESC LIMIT 8').all();
  const team = db
    .prepare('SELECT * FROM team_members WHERE is_published = 1 ORDER BY display_order ASC')
    .all();
  const testimonials = db
    .prepare('SELECT * FROM testimonials WHERE is_verified = 1 ORDER BY created_at DESC')
    .all();
  const hub = db.prepare('SELECT * FROM hub_resources ORDER BY published_at DESC').all();

  // Featured Winners (only from competitions where results_published = 1)
  const winners = db
    .prepare(
      `SELECT r.registration_id, r.name_bn, r.name_en, r.school_name, r.district, r.award_tier, r.rank_position, r.is_sample,
              c.title_bn as competition_title_bn, c.title_en as competition_title_en,
              cat.name_bn as category_name_bn, cat.name_en as category_name_en
       FROM registrations r
       JOIN competitions c ON c.id = r.competition_id
       JOIN competition_categories cat ON cat.id = r.category_id
       WHERE c.results_published = 1 AND r.status = 'winner' AND r.award_tier != 'none'
       ORDER BY r.rank_position ASC, r.total_score DESC
       LIMIT 12`
    )
    .all();

  res.json({
    settings,
    stats: {
      total_registrations: totalRegs,
      sample_registrations: sampleRegs,
      active_competitions: activeComps,
      districts_represented: districtsCount,
      published_resources: hubCount,
      published_notices: noticesCount,
    },
    competitions,
    notices,
    gallery,
    team,
    testimonials,
    hub,
    winners,
  });
});

app.get('/api/public/competitions/:slug', (req, res) => {
  const comp = db
    .prepare(
      `SELECT c.*,
        (SELECT COUNT(*) FROM registrations r WHERE r.competition_id = c.id) as participant_count
       FROM competitions c WHERE c.slug = ? AND c.status IN ('published', 'closed')`
    )
    .get(req.params.slug) as Record<string, unknown> | undefined;

  if (!comp) {
    res.status(404).json({ error: 'Competition not found.' });
    return;
  }

  const categories = db
    .prepare(
      `SELECT cat.*,
        (SELECT COUNT(*) FROM registrations r WHERE r.category_id = cat.id) as participant_count
       FROM competition_categories cat WHERE cat.competition_id = ?`
    )
    .all(comp.id);

  const criteria = db
    .prepare('SELECT * FROM scoring_criteria WHERE competition_id = ?')
    .all(comp.id);

  const districtStats = db
    .prepare(
      `SELECT district, COUNT(*) as count
       FROM registrations WHERE competition_id = ?
       GROUP BY district ORDER BY count DESC LIMIT 12`
    )
    .all(comp.id);

  let meritList: unknown[] = [];
  if (comp.results_published === 1) {
    meritList = db
      .prepare(
        `SELECT r.registration_id, r.name_bn, r.name_en, r.school_name, r.district,
                r.award_tier, r.total_score, r.rank_position, r.is_sample,
                cat.name_bn as category_name_bn, cat.name_en as category_name_en
         FROM registrations r
         JOIN competition_categories cat ON cat.id = r.category_id
         WHERE r.competition_id = ? AND r.status IN ('winner', 'evaluated')
         ORDER BY COALESCE(r.rank_position, 9999) ASC, COALESCE(r.total_score, 0) DESC`
      )
      .all(comp.id);
  }

  res.json({ competition: comp, categories, criteria, districtStats, meritList });
});

app.get('/api/public/notices', (req, res) => {
  const q = String(req.query.q || '').trim().toLowerCase();
  const rows = db
    .prepare('SELECT * FROM notices WHERE is_published = 1 ORDER BY is_important DESC, published_at DESC')
    .all() as Array<Record<string, unknown>>;
  const filtered = q
    ? rows.filter(
        (n) =>
          String(n.title_bn).toLowerCase().includes(q) ||
          String(n.title_en).toLowerCase().includes(q) ||
          String(n.summary_bn).toLowerCase().includes(q) ||
          String(n.summary_en).toLowerCase().includes(q)
      )
    : rows;
  res.json({ notices: filtered });
});

app.get('/api/public/notices/:id', (req, res) => {
  const notice = db
    .prepare('SELECT * FROM notices WHERE id = ? AND is_published = 1')
    .get(Number(req.params.id));
  if (!notice) {
    res.status(404).json({ error: 'Notice not found.' });
    return;
  }
  res.json({ notice });
});

app.get('/api/public/gallery', (req, res) => {
  const category = String(req.query.category || 'All');
  const rows =
    category === 'All'
      ? db.prepare('SELECT * FROM gallery_items ORDER BY created_at DESC').all()
      : db.prepare('SELECT * FROM gallery_items WHERE category = ? ORDER BY created_at DESC').all(category);
  res.json({ items: rows });
});

app.get('/api/public/hub', (req, res) => {
  const type = String(req.query.type || 'All');
  const rows =
    type === 'All'
      ? db.prepare('SELECT * FROM hub_resources ORDER BY published_at DESC').all()
      : db.prepare('SELECT * FROM hub_resources WHERE type = ? ORDER BY published_at DESC').all(type);
  res.json({ resources: rows });
});

function buildMinimalPdfBuffer(title: string, subtitle: string, bodyLines: string[], includePracticeGrid: boolean): Buffer {
  const escPdf = (s: string) =>
    s
      .replace(/[^\x20-\x7E]/g, ' ')
      .replace(/\\/g, '\\\\')
      .replace(/\(/g, '\\(')
      .replace(/\)/g, '\\)');

  const ops: string[] = [];
  ops.push('0.06 0.14 0.26 RG 0.06 0.14 0.26 rg');
  ops.push('BT /F1 16 Tf 50 780 Td (' + escPdf('HANDWRITING & CALLIGRAPHY FOUNDATION OF BANGLADESH (HCFB)') + ') Tj ET');
  ops.push('BT /F1 13 Tf 50 755 Td (' + escPdf(title) + ') Tj ET');
  ops.push('0.07 0.36 0.26 rg');
  ops.push('BT /F1 10 Tf 50 738 Td (' + escPdf(subtitle) + ') Tj ET');
  ops.push('0.06 0.14 0.26 RG 1 w 50 726 m 545 726 l S');

  ops.push('0.15 0.15 0.15 rg');
  let y = 706;
  for (const line of bodyLines.slice(0, 14)) {
    ops.push(`BT /F1 10 Tf 50 ${y} Td (` + escPdf(line.slice(0, 92)) + ') Tj ET');
    y -= 15;
  }

  if (includePracticeGrid) {
    ops.push('0.45 0.45 0.45 RG 0.6 w');
    let gy = Math.min(y - 16, 620);
    while (gy > 80) {
      ops.push(`[3 3] 0 d 50 ${gy} m 545 ${gy} l S`);
      ops.push(`[] 0 d 50 ${gy - 16} m 545 ${gy - 16} l S`);
      ops.push(`[2 4] 0 d 50 ${gy - 28} m 545 ${gy - 28} l S`);
      gy -= 48;
    }
  }

  ops.push('0.4 0.4 0.4 rg BT /F1 8 Tf 50 42 Td (Generated by HCFB Learning & Creativity Hub - https://hcfb.org.bd) Tj ET');
  const streamContent = ops.join('\n');

  const objects: string[] = [
    '1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\n',
    '2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj\n',
    '3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >> endobj\n',
    `4 0 obj << /Length ${Buffer.byteLength(streamContent, 'utf8')} >>\nstream\n${streamContent}\nendstream\nendobj\n`,
    '5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj\n',
  ];

  let pdf = '%PDF-1.4\n';
  const offsets: number[] = [0];
  for (const obj of objects) {
    offsets.push(Buffer.byteLength(pdf, 'utf8'));
    pdf += obj;
  }
  const xrefPos = Buffer.byteLength(pdf, 'utf8');
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i <= objects.length; i++) {
    pdf += String(offsets[i]).padStart(10, '0') + ' 00000 n \n';
  }
  pdf += `trailer << /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefPos}\n%%EOF`;
  return Buffer.from(pdf, 'utf8');
}

app.get('/api/public/hub/:id/pdf', (req, res) => {
  const row = db.prepare('SELECT * FROM hub_resources WHERE id = ?').get(Number(req.params.id)) as
    | Record<string, unknown>
    | undefined;
  if (!row) {
    res.status(404).json({ error: 'Resource not found.' });
    return;
  }
  const title = String(row.title_en || row.title_bn || 'HCFB Resource');
  const subtitle = `Type: ${String(row.type)} | Author: ${String(row.author_or_artist || 'HCFB')} | Date: ${String(row.published_at)}`;
  const rawBody = `${String(row.summary_en || '')}\n\n${String(row.content_en || '')}`;
  const wrappedLines: string[] = [];
  for (const para of rawBody.split('\n')) {
    const words = para.split(/\s+/);
    let current = '';
    for (const w of words) {
      if ((current + ' ' + w).trim().length > 86) {
        wrappedLines.push(current.trim());
        current = w;
      } else {
        current = (current + ' ' + w).trim();
      }
    }
    if (current) wrappedLines.push(current);
  }
  const includeGrid = row.type === 'practice_sheet' || row.type === 'calligraphy_guide';
  const pdfBuf = buildMinimalPdfBuffer(title, subtitle, wrappedLines, includeGrid);
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="hcfb-resource-${row.id}.pdf"`);
  res.send(pdfBuf);
});

// ==================== PUBLIC REGISTRATION & TRACKING ====================

app.post('/api/public/registrations', (req, res) => {
  const body = req.body as Record<string, unknown>;

  const name_bn = String(body.name_bn || '').trim();
  const name_en = String(body.name_en || '').trim();
  const father_name = String(body.father_name || '').trim();
  const mother_name = String(body.mother_name || '').trim();
  const school_name = String(body.school_name || '').trim();
  const class_level = String(body.class_level || '').trim();
  const rawMobile = String(body.mobile || '').trim();
  const rawAltMobile = String(body.alt_mobile || '').trim();
  const email = String(body.email || '').trim();
  const district = String(body.district || '').trim();
  const upazila = String(body.upazila || '').trim();
  const competition_id = Number(body.competition_id);
  const category_id = Number(body.category_id);
  const participant_type = body.participant_type === 'Other' ? 'Other' : 'Student';
  const additional_info = String(body.additional_info || '').trim();
  const guardian_consent = Boolean(body.guardian_consent);
  const privacy_consent = Boolean(body.privacy_consent);

  // Load admin-configured required fields
  let fieldConfig: Record<string, boolean> = {
    school_name: true,
    class_level: true,
    email: false,
    alt_mobile: false,
    upazila: false,
    additional_info: false,
  };
  const cfgRow = db.prepare("SELECT value_json FROM website_settings WHERE key = 'registration_field_config'").get() as
    | { value_json: string }
    | undefined;
  if (cfgRow) {
    try {
      fieldConfig = { ...fieldConfig, ...JSON.parse(cfgRow.value_json) };
    } catch {
      // keep defaults
    }
  }

  const errors: Record<string, string> = {};
  if (name_bn.length < 2) errors.name_bn = 'অংশগ্রহণকারীর বাংলা নাম আবশ্যক / Bangla full name is required.';
  if (name_en.length < 2) errors.name_en = 'English full name is required.';
  if (father_name.length < 2) errors.father_name = 'পিতার নাম আবশ্যক / Father name is required.';
  if (mother_name.length < 2) errors.mother_name = 'মাতার নাম আবশ্যক / Mother name is required.';
  if (fieldConfig.school_name && school_name.length < 2) errors.school_name = 'প্রতিষ্ঠানের নাম আবশ্যক / Institution name is required.';
  if (fieldConfig.class_level && class_level.length < 1) errors.class_level = 'শ্রেণি/স্তর আবশ্যক / Class or level is required.';
  if (!isValidBdMobile(rawMobile)) errors.mobile = 'সঠিক ১১ ডিজিটের বাংলাদেশি মোবাইল নম্বর দিন (যেমন 01869970401)।';
  if (rawAltMobile && !isValidBdMobile(rawAltMobile)) errors.alt_mobile = 'বিকল্প মোবাইল নম্বরটি সঠিক নয়।';
  if (fieldConfig.alt_mobile && !rawAltMobile) errors.alt_mobile = 'বিকল্প মোবাইল নম্বর আবশ্যক।';
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = 'সঠিক ইমেইল ঠিকানা দিন।';
  if (fieldConfig.email && !email) errors.email = 'ইমেইল ঠিকানা আবশ্যক।';
  if (!district) errors.district = 'জেলা নির্বাচন করুন / District is required.';
  if (fieldConfig.upazila && !upazila) errors.upazila = 'উপজেলা আবশ্যক / Upazila is required.';
  if (!competition_id) errors.competition_id = 'প্রতিযোগিতা নির্বাচন করুন।';
  if (!category_id) errors.category_id = 'বিভাগ/ক্যাটাগরি নির্বাচন করুন।';
  if (participant_type === 'Student' && !guardian_consent) {
    errors.guardian_consent = 'অপ্রাপ্তবয়স্ক/শিক্ষার্থী অংশগ্রহণকারীর জন্য অভিভাবকের সম্মতি আবশ্যক।';
  }
  if (!privacy_consent) errors.privacy_consent = 'গোপনীয়তা নীতি ও শর্তাবলীতে সম্মতি আবশ্যক।';

  if (Object.keys(errors).length > 0) {
    res.status(400).json({ error: 'Validation failed', fields: errors });
    return;
  }

  const mobile = normalizeBdMobile(rawMobile);
  const alt_mobile = rawAltMobile ? normalizeBdMobile(rawAltMobile) : '';

  // Check competition & category existence and status
  const comp = db.prepare('SELECT * FROM competitions WHERE id = ?').get(competition_id) as
    | { id: number; title_bn: string; title_en: string; status: string; registration_deadline: string }
    | undefined;
  if (!comp || comp.status !== 'published') {
    res.status(400).json({ error: 'Selected competition is not currently open for registration.' });
    return;
  }
  const cat = db
    .prepare('SELECT * FROM competition_categories WHERE id = ? AND competition_id = ?')
    .get(category_id, competition_id) as { id: number; name_bn: string; name_en: string } | undefined;
  if (!cat) {
    res.status(400).json({ error: 'Invalid competition category selected.' });
    return;
  }

  // Duplicate check: same mobile + same competition + same lowercase English name
  const existing = db
    .prepare(
      `SELECT registration_id FROM registrations
       WHERE competition_id = ? AND mobile = ? AND LOWER(TRIM(name_en)) = LOWER(TRIM(?))`
    )
    .get(competition_id, mobile, name_en) as { registration_id: string } | undefined;
  if (existing) {
    res.status(409).json({
      error: `এই মোবাইল নম্বর ও নামে ইতোমধ্যে নিবন্ধন সম্পন্ন হয়েছে (ID: ${existing.registration_id})।`,
      existing_registration_id: existing.registration_id,
    });
    return;
  }

  // Atomic transaction for sequential Registration ID generation
  const createTx = db.transaction(() => {
    const year = new Date().getFullYear();
    const prefix = `HCFB-${year}-`;
    const lastRow = db
      .prepare(
        `SELECT registration_id FROM registrations
         WHERE registration_id LIKE ?
         ORDER BY id DESC LIMIT 1`
      )
      .get(`${prefix}%`) as { registration_id: string } | undefined;

    let nextSeq = 1;
    if (lastRow) {
      const parts = lastRow.registration_id.split('-');
      const parsed = Number(parts[2]);
      if (!Number.isNaN(parsed)) nextSeq = parsed + 1;
    }
    const registration_id = `${prefix}${String(nextSeq).padStart(5, '0')}`;
    const emailDispatchStatus = email ? 'queued_local_log' : 'not_provided';

    const info = db
      .prepare(
        `INSERT INTO registrations (
          registration_id, competition_id, category_id, name_bn, name_en,
          father_name, mother_name, school_name, class_level, mobile, alt_mobile, email,
          district, upazila, participant_type, additional_info,
          guardian_consent, privacy_consent, status, email_dispatch_status, is_sample
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, 0)`
      )
      .run(
        registration_id,
        competition_id,
        category_id,
        name_bn,
        name_en,
        father_name,
        mother_name,
        school_name,
        class_level,
        mobile,
        alt_mobile,
        email,
        district,
        upazila,
        participant_type,
        additional_info,
        guardian_consent ? 1 : 0,
        privacy_consent ? 1 : 0,
        emailDispatchStatus
      );

    return {
      id: info.lastInsertRowid,
      registration_id,
      created_at: new Date().toISOString(),
    };
  });

  const created = createTx();

  res.status(201).json({
    success: true,
    registration: {
      registration_id: created.registration_id,
      name_bn,
      name_en,
      competition_title_bn: comp.title_bn,
      competition_title_en: comp.title_en,
      category_name_bn: cat.name_bn,
      category_name_en: cat.name_en,
      submitted_at: created.created_at,
      email_status: email ? 'Recorded (SMTP optional)' : 'Not provided',
    },
  });
});

// Track registration by unique ID (only safe non-sensitive status fields publicly!)
app.get('/api/public/track/:regId', (req, res) => {
  const regId = String(req.params.regId || '').trim().toUpperCase();
  const row = db
    .prepare(
      `SELECT r.registration_id, r.name_bn, r.name_en, r.school_name, r.district, r.status,
              r.award_tier, r.rank_position, r.created_at, r.is_sample,
              c.title_bn as competition_title_bn, c.title_en as competition_title_en, c.results_published,
              cat.name_bn as category_name_bn, cat.name_en as category_name_en,
              cert.certificate_code
       FROM registrations r
       JOIN competitions c ON c.id = r.competition_id
       JOIN competition_categories cat ON cat.id = r.category_id
       LEFT JOIN certificates cert ON cert.registration_pk = r.id AND cert.revoked = 0
       WHERE UPPER(r.registration_id) = ?`
    )
    .get(regId) as Record<string, unknown> | undefined;

  if (!row) {
    res.status(404).json({ error: 'এই রেজিস্ট্রেশন নম্বরটি পাওয়া যায়নি / Registration ID not found.' });
    return;
  }
  res.json({ record: row });
});

// QR Certificate verification
app.get('/api/public/verify-certificate', async (req, res) => {
  const code = String(req.query.code || '').trim().toUpperCase();
  if (!code) {
    res.status(400).json({ error: 'Certificate verification code is required.' });
    return;
  }

  const cert = db
    .prepare('SELECT * FROM certificates WHERE UPPER(certificate_code) = ?')
    .get(code) as Record<string, unknown> | undefined;

  if (!cert) {
    res.status(404).json({ valid: false, error: 'সনদ নম্বরটি ডাটাবেসে পাওয়া যায়নি / Certificate not found.' });
    return;
  }

  const origin = process.env.APP_URL && process.env.APP_URL !== 'MY_APP_URL'
    ? process.env.APP_URL
    : `${req.protocol}://${req.get('host')}`;
  const verifyUrl = `${origin}/verify?code=${encodeURIComponent(String(cert.certificate_code))}`;
  const qrDataUrl = await QRCode.toDataURL(verifyUrl, {
    width: 180,
    margin: 1,
    color: { dark: '#0F2342', light: '#FFFFFF' },
  });

  res.json({
    valid: cert.revoked === 0,
    revoked: cert.revoked === 1,
    certificate: cert,
    qrDataUrl,
    verifyUrl,
  });
});

// Public contact form submission
app.post('/api/public/contact', (req, res) => {
  const { name, email, mobile, subject, message } = req.body as Record<string, string>;
  const cleanName = String(name || '').trim();
  const cleanEmail = String(email || '').trim();
  const cleanMobile = String(mobile || '').trim();
  const cleanSubject = String(subject || '').trim();
  const cleanMessage = String(message || '').trim();

  if (cleanName.length < 2 || !isValidBdMobile(cleanMobile) || cleanSubject.length < 2 || cleanMessage.length < 5) {
    res.status(400).json({ error: 'অনুগ্রহ করে নাম, সঠিক মোবাইল নম্বর, বিষয় এবং বার্তা পূরণ করুন।' });
    return;
  }

  db.prepare(
    'INSERT INTO contact_messages (name, email, mobile, subject, message) VALUES (?, ?, ?, ?, ?)'
  ).run(cleanName, cleanEmail, normalizeBdMobile(cleanMobile), cleanSubject, cleanMessage);

  res.status(201).json({ success: true, message: 'আপনার বার্তা সফলভাবে প্রেরণ করা হয়েছে।' });
});

// ==================== PARTICIPANT PORTAL ====================

app.post('/api/participant/login', (req, res) => {
  const { registration_id, mobile } = req.body as { registration_id?: string; mobile?: string };
  const cleanId = String(registration_id || '').trim().toUpperCase();
  const cleanMobile = normalizeBdMobile(String(mobile || '').trim());

  if (!cleanId || !cleanMobile) {
    res.status(400).json({ error: 'Registration ID and Mobile Number are required.' });
    return;
  }

  const reg = db
    .prepare('SELECT id, registration_id, name_en, mobile FROM registrations WHERE UPPER(registration_id) = ?')
    .get(cleanId) as { id: number; registration_id: string; name_en: string; mobile: string } | undefined;

  if (!reg || normalizeBdMobile(reg.mobile) !== cleanMobile) {
    res.status(401).json({ error: 'রেজিস্ট্রেশন নম্বর বা মোবাইল নম্বর মিলছে না / Credentials do not match.' });
    return;
  }

  const token = signToken({ sub: String(reg.id), role: 'participant', name: reg.name_en, email: reg.registration_id });
  res.json({ token, registration_id: reg.registration_id });
});

app.get('/api/participant/me', requireAuth(['participant']), async (req: AuthedRequest, res) => {
  const regPk = Number(req.user!.sub);
  const reg = db
    .prepare(
      `SELECT r.*, c.title_bn as competition_title_bn, c.title_en as competition_title_en,
              c.competition_date, c.results_published,
              cat.name_bn as category_name_bn, cat.name_en as category_name_en
       FROM registrations r
       JOIN competitions c ON c.id = r.competition_id
       JOIN competition_categories cat ON cat.id = r.category_id
       WHERE r.id = ?`
    )
    .get(regPk) as Record<string, unknown> | undefined;

  if (!reg) {
    res.status(404).json({ error: 'Registration record not found.' });
    return;
  }

  const cert = db
    .prepare('SELECT * FROM certificates WHERE registration_pk = ? AND revoked = 0')
    .get(regPk) as Record<string, unknown> | undefined;

  let qrDataUrl = '';
  if (cert) {
    const origin = process.env.APP_URL && process.env.APP_URL !== 'MY_APP_URL'
      ? process.env.APP_URL
      : `${req.protocol}://${req.get('host')}`;
    const verifyUrl = `${origin}/verify?code=${encodeURIComponent(String(cert.certificate_code))}`;
    qrDataUrl = await QRCode.toDataURL(verifyUrl, {
      width: 160,
      margin: 1,
      color: { dark: '#0F2342', light: '#FFFFFF' },
    });
  }

  const evaluations =
    reg.results_published === 1
      ? db
          .prepare('SELECT total_score, remarks, evaluated_at FROM judge_evaluations WHERE registration_pk = ?')
          .all(regPk)
      : [];

  res.json({ registration: reg, certificate: cert || null, qrDataUrl, evaluations });
});

app.patch('/api/participant/me', requireAuth(['participant']), (req: AuthedRequest, res) => {
  const regPk = Number(req.user!.sub);
  const { school_name, class_level, alt_mobile, email, upazila, additional_info } = req.body as Record<string, string>;

  if (alt_mobile && !isValidBdMobile(alt_mobile)) {
    res.status(400).json({ error: 'Invalid alternative Bangladeshi mobile number.' });
    return;
  }
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    res.status(400).json({ error: 'Invalid email address.' });
    return;
  }

  db.prepare(
    `UPDATE registrations
     SET school_name = COALESCE(?, school_name),
         class_level = COALESCE(?, class_level),
         alt_mobile = ?,
         email = ?,
         upazila = ?,
         additional_info = ?,
         updated_at = datetime('now')
     WHERE id = ?`
  ).run(
    school_name?.trim() || null,
    class_level?.trim() || null,
    alt_mobile ? normalizeBdMobile(alt_mobile) : '',
    email?.trim() || '',
    upazila?.trim() || '',
    additional_info?.trim() || '',
    regPk
  );

  res.json({ success: true });
});

// ==================== STAFF AUTH (ADMIN + JUDGE) ====================

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body as { email?: string; password?: string };
  const cleanEmail = String(email || '').trim().toLowerCase();
  const cleanPass = String(password || '');

  if (!cleanEmail || !cleanPass) {
    res.status(400).json({ error: 'Email and password are required.' });
    return;
  }

  const user = db
    .prepare('SELECT * FROM admin_users WHERE LOWER(email) = ? AND active = 1')
    .get(cleanEmail) as
    | { id: number; name: string; email: string; password_hash: string; role: string }
    | undefined;

  if (!user || !verifyPassword(cleanPass, user.password_hash)) {
    res.status(401).json({ error: 'Invalid credentials.' });
    return;
  }

  const token = signToken({ sub: String(user.id), role: user.role, email: user.email, name: user.name });
  logAudit({
    actorId: String(user.id),
    actorEmail: user.email,
    actorRole: user.role,
    action: 'LOGIN',
    targetType: 'admin_user',
    targetId: String(user.id),
    details: 'Staff portal login',
  });

  res.cookie('hcfb_session', token, {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 1000 * 60 * 60 * 12,
  });

  res.json({
    token,
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
  });
});

app.post('/api/auth/logout', (_req, res) => {
  res.clearCookie('hcfb_session');
  res.json({ success: true });
});

app.get('/api/auth/me', requireAuth(STAFF_ROLES), (req: AuthedRequest, res) => {
  res.json({ user: req.user });
});

// ==================== JUDGE PORTAL ====================

app.get('/api/judge/competitions', requireAuth(['super_admin', 'judge']), (_req, res) => {
  const comps = db
    .prepare("SELECT * FROM competitions WHERE status IN ('published', 'closed') ORDER BY competition_date DESC")
    .all() as Array<Record<string, unknown>>;
  const critStmt = db.prepare('SELECT * FROM scoring_criteria WHERE competition_id = ?');
  for (const c of comps) {
    c.criteria = critStmt.all(c.id);
  }
  res.json({ competitions: comps });
});

app.get('/api/judge/submissions/:competitionId', requireAuth(['super_admin', 'judge']), (req: AuthedRequest, res) => {
  const compId = Number(req.params.competitionId);
  const judgeId = Number(req.user!.sub);
  const rows = db
    .prepare(
      `SELECT r.id, r.registration_id, r.name_bn, r.name_en, r.school_name, r.class_level, r.district,
              r.status, r.total_score, r.award_tier, r.rank_position,
              cat.name_bn as category_name_bn, cat.name_en as category_name_en,
              je.criteria_scores_json, je.total_score as my_score, je.remarks as my_remarks
       FROM registrations r
       JOIN competition_categories cat ON cat.id = r.category_id
       LEFT JOIN judge_evaluations je ON je.registration_pk = r.id AND je.judge_id = ?
       WHERE r.competition_id = ? AND r.status != 'rejected'
       ORDER BY r.registration_id ASC`
    )
    .all(judgeId, compId);
  res.json({ submissions: rows });
});

app.post('/api/judge/evaluate', requireAuth(['super_admin', 'judge']), (req: AuthedRequest, res) => {
  const judgeId = Number(req.user!.sub);
  const { registration_pk, criteria_scores, remarks } = req.body as {
    registration_pk: number;
    criteria_scores: Record<string, number>;
    remarks?: string;
  };

  if (!registration_pk || !criteria_scores || typeof criteria_scores !== 'object') {
    res.status(400).json({ error: 'Invalid evaluation payload.' });
    return;
  }

  const reg = db.prepare('SELECT id, competition_id FROM registrations WHERE id = ?').get(registration_pk) as
    | { id: number; competition_id: number }
    | undefined;
  if (!reg) {
    res.status(404).json({ error: 'Participant registration not found.' });
    return;
  }

  const criteria = db
    .prepare('SELECT id, max_points FROM scoring_criteria WHERE competition_id = ?')
    .all(reg.competition_id) as Array<{ id: number; max_points: number }>;

  let totalScore = 0;
  for (const crit of criteria) {
    const val = Number(criteria_scores[String(crit.id)] ?? 0);
    if (Number.isNaN(val) || val < 0 || val > crit.max_points) {
      res.status(400).json({ error: `Score must be between 0 and ${crit.max_points}.` });
      return;
    }
    totalScore += val;
  }

  db.prepare(
    `INSERT INTO judge_evaluations (registration_pk, judge_id, criteria_scores_json, total_score, remarks)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(registration_pk, judge_id) DO UPDATE SET
       criteria_scores_json = excluded.criteria_scores_json,
       total_score = excluded.total_score,
       remarks = excluded.remarks,
       evaluated_at = datetime('now')`
  ).run(registration_pk, judgeId, JSON.stringify(criteria_scores), totalScore, String(remarks || '').trim());

  const avgRow = db
    .prepare('SELECT AVG(total_score) as avg_score FROM judge_evaluations WHERE registration_pk = ?')
    .get(registration_pk) as { avg_score: number };

  db.prepare(
    `UPDATE registrations
     SET total_score = ?,
         status = CASE WHEN status IN ('pending', 'verified') THEN 'evaluated' ELSE status END,
         updated_at = datetime('now')
     WHERE id = ?`
  ).run(Math.round(avgRow.avg_score * 100) / 100, registration_pk);

  logAudit({
    actorId: req.user!.sub,
    actorEmail: req.user!.email,
    actorRole: req.user!.role,
    action: 'EVALUATE_PARTICIPANT',
    targetType: 'registration',
    targetId: String(registration_pk),
    details: `Score submitted: ${totalScore}`,
  });

  res.json({ success: true, totalScore, averageScore: avgRow.avg_score });
});

// ==================== ADMIN DASHBOARD ROUTES ====================

app.get('/api/admin/overview', requireAuth(ADMIN_ROLES), (_req, res) => {
  const totalRegistrations = (db.prepare('SELECT COUNT(*) as c FROM registrations').get() as { c: number }).c;
  const totalCompetitions = (db.prepare('SELECT COUNT(*) as c FROM competitions').get() as { c: number }).c;
  const activeCompetitions = (
    db.prepare("SELECT COUNT(*) as c FROM competitions WHERE status = 'published'").get() as { c: number }
  ).c;
  const publishedNotices = (
    db.prepare('SELECT COUNT(*) as c FROM notices WHERE is_published = 1').get() as { c: number }
  ).c;
  const totalCertificates = (
    db.prepare('SELECT COUNT(*) as c FROM certificates WHERE revoked = 0').get() as { c: number }
  ).c;
  const unreadMessages = (
    db.prepare("SELECT COUNT(*) as c FROM contact_messages WHERE status = 'unread'").get() as { c: number }
  ).c;

  const recentRegistrations = db
    .prepare(
      `SELECT r.*, c.title_bn as competition_title_bn, cat.name_bn as category_name_bn
       FROM registrations r
       JOIN competitions c ON c.id = r.competition_id
       JOIN competition_categories cat ON cat.id = r.category_id
       ORDER BY r.created_at DESC LIMIT 8`
    )
    .all();

  const districtAnalytics = db
    .prepare('SELECT district, COUNT(*) as count FROM registrations GROUP BY district ORDER BY count DESC LIMIT 12')
    .all();

  const competitionStats = db
    .prepare(
      `SELECT c.id, c.title_bn, c.title_en, c.status, COUNT(r.id) as total,
              SUM(CASE WHEN r.status = 'verified' OR r.status = 'evaluated' OR r.status = 'winner' THEN 1 ELSE 0 END) as verified_count
       FROM competitions c
       LEFT JOIN registrations r ON r.competition_id = c.id
       GROUP BY c.id`
    )
    .all();

  const statusBreakdown = db
    .prepare('SELECT status, COUNT(*) as count FROM registrations GROUP BY status')
    .all();

  res.json({
    metrics: {
      totalRegistrations,
      totalCompetitions,
      activeCompetitions,
      totalParticipants: totalRegistrations,
      publishedNotices,
      totalCertificates,
      unreadMessages,
    },
    recentRegistrations,
    districtAnalytics,
    competitionStats,
    statusBreakdown,
  });
});

app.get('/api/admin/reports/competitions', requireAuth(ADMIN_ROLES), (_req, res) => {
  const rows = db
    .prepare(
      `SELECT c.id, c.title_en, c.status, c.registration_deadline, c.competition_date, c.results_published,
              COUNT(r.id) as total_entries,
              SUM(CASE WHEN r.status = 'verified' THEN 1 ELSE 0 END) as verified_entries,
              SUM(CASE WHEN r.status = 'evaluated' THEN 1 ELSE 0 END) as evaluated_entries,
              SUM(CASE WHEN r.status = 'winner' THEN 1 ELSE 0 END) as winner_entries,
              ROUND(AVG(r.total_score), 2) as avg_score
       FROM competitions c
       LEFT JOIN registrations r ON r.competition_id = c.id
       GROUP BY c.id`
    )
    .all() as Array<Record<string, unknown>>;

  const headers = ['ID', 'Competition', 'Status', 'Deadline', 'Event Date', 'Results Published', 'Total', 'Verified', 'Evaluated', 'Winners', 'Avg Score'];
  const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const lines = [headers.join(',')];
  for (const r of rows) {
    lines.push([r.id, r.title_en, r.status, r.registration_deadline, r.competition_date, r.results_published ? 'Yes' : 'No', r.total_entries, r.verified_entries, r.evaluated_entries, r.winner_entries, r.avg_score ?? ''].map(esc).join(','));
  }
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="hcfb-competition-report-${Date.now()}.csv"`);
  res.send(Buffer.from('\uFEFF' + lines.join('\r\n'), 'utf8'));
});

// Registrations CRUD & Export
app.get('/api/admin/registrations', requireAuth(ADMIN_ROLES), (req, res) => {
  const page = Math.max(1, Number(req.query.page || 1));
  const limit = Math.min(100, Math.max(10, Number(req.query.limit || 20)));
  const offset = (page - 1) * limit;
  const q = String(req.query.q || '').trim().toLowerCase();
  const competitionId = req.query.competition_id ? Number(req.query.competition_id) : null;
  const categoryId = req.query.category_id ? Number(req.query.category_id) : null;
  const district = String(req.query.district || '').trim();
  const classLevel = String(req.query.class_level || '').trim();
  const status = String(req.query.status || '').trim();

  const clauses: string[] = [];
  const params: unknown[] = [];

  if (q) {
    clauses.push(
      '(LOWER(r.name_bn) LIKE ? OR LOWER(r.name_en) LIKE ? OR LOWER(r.registration_id) LIKE ? OR r.mobile LIKE ?)'
    );
    const pat = `%${q}%`;
    params.push(pat, pat, pat, pat);
  }
  if (competitionId) {
    clauses.push('r.competition_id = ?');
    params.push(competitionId);
  }
  if (categoryId) {
    clauses.push('r.category_id = ?');
    params.push(categoryId);
  }
  if (district) {
    clauses.push('r.district = ?');
    params.push(district);
  }
  if (classLevel) {
    clauses.push('LOWER(r.class_level) LIKE ?');
    params.push(`%${classLevel.toLowerCase()}%`);
  }
  if (status) {
    clauses.push('r.status = ?');
    params.push(status);
  }

  const where = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';
  const total = (
    db.prepare(`SELECT COUNT(*) as c FROM registrations r ${where}`).get(...params) as { c: number }
  ).c;

  const rows = db
    .prepare(
      `SELECT r.*, c.title_bn as competition_title_bn, c.title_en as competition_title_en,
              cat.name_bn as category_name_bn, cat.name_en as category_name_en,
              cert.certificate_code
       FROM registrations r
       JOIN competitions c ON c.id = r.competition_id
       JOIN competition_categories cat ON cat.id = r.category_id
       LEFT JOIN certificates cert ON cert.registration_pk = r.id AND cert.revoked = 0
       ${where}
       ORDER BY r.created_at DESC
       LIMIT ? OFFSET ?`
    )
    .all(...params, limit, offset);

  res.json({ registrations: rows, total, page, totalPages: Math.max(1, Math.ceil(total / limit)) });
});

app.patch('/api/admin/registrations/:id', requireAuth(['super_admin', 'registration_manager']), (req: AuthedRequest, res) => {
  const id = Number(req.params.id);
  const b = req.body as Record<string, unknown>;
  db.prepare(
    `UPDATE registrations SET
       name_bn = COALESCE(?, name_bn),
       name_en = COALESCE(?, name_en),
       school_name = COALESCE(?, school_name),
       class_level = COALESCE(?, class_level),
       district = COALESCE(?, district),
       status = COALESCE(?, status),
       award_tier = COALESCE(?, award_tier),
       rank_position = ?,
       updated_at = datetime('now')
     WHERE id = ?`
  ).run(
    b.name_bn ? String(b.name_bn) : null,
    b.name_en ? String(b.name_en) : null,
    b.school_name !== undefined ? String(b.school_name) : null,
    b.class_level !== undefined ? String(b.class_level) : null,
    b.district ? String(b.district) : null,
    b.status ? String(b.status) : null,
    b.award_tier ? String(b.award_tier) : null,
    b.rank_position !== undefined && b.rank_position !== null && b.rank_position !== ''
      ? Number(b.rank_position)
      : null,
    id
  );

  logAudit({
    actorId: req.user!.sub,
    actorEmail: req.user!.email,
    actorRole: req.user!.role,
    action: 'UPDATE_REGISTRATION',
    targetType: 'registration',
    targetId: String(id),
    details: JSON.stringify({ status: b.status, award_tier: b.award_tier }),
  });

  res.json({ success: true });
});

app.delete('/api/admin/registrations/:id', requireAuth(['super_admin', 'registration_manager']), (req: AuthedRequest, res) => {
  const id = Number(req.params.id);
  db.prepare('DELETE FROM registrations WHERE id = ?').run(id);
  logAudit({
    actorId: req.user!.sub,
    actorEmail: req.user!.email,
    actorRole: req.user!.role,
    action: 'DELETE_REGISTRATION',
    targetType: 'registration',
    targetId: String(id),
  });
  res.json({ success: true });
});

app.get('/api/admin/registrations/export/csv', requireAuth(ADMIN_ROLES), (req: AuthedRequest, res) => {
  const rows = db
    .prepare(
      `SELECT r.registration_id, r.name_bn, r.name_en, r.father_name, r.mother_name,
              r.school_name, r.class_level, r.mobile, r.alt_mobile, r.email,
              r.district, r.upazila, r.participant_type, r.status, r.award_tier,
              r.total_score, r.rank_position, r.created_at,
              c.title_en as competition, cat.name_en as category
       FROM registrations r
       JOIN competitions c ON c.id = r.competition_id
       JOIN competition_categories cat ON cat.id = r.category_id
       ORDER BY r.created_at DESC`
    )
    .all() as Array<Record<string, unknown>>;

  const headers = [
    'Registration ID',
    'Name (BN)',
    'Name (EN)',
    'Father Name',
    'Mother Name',
    'School/Institution',
    'Class/Level',
    'Mobile',
    'Alt Mobile',
    'Email',
    'District',
    'Upazila',
    'Type',
    'Competition',
    'Category',
    'Status',
    'Award Tier',
    'Score',
    'Rank',
    'Submitted At',
  ];

  const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const lines = [headers.join(',')];
  for (const r of rows) {
    lines.push(
      [
        r.registration_id,
        r.name_bn,
        r.name_en,
        r.father_name,
        r.mother_name,
        r.school_name,
        r.class_level,
        r.mobile,
        r.alt_mobile,
        r.email,
        r.district,
        r.upazila,
        r.participant_type,
        r.competition,
        r.category,
        r.status,
        r.award_tier,
        r.total_score,
        r.rank_position,
        r.created_at,
      ]
        .map(esc)
        .join(',')
    );
  }

  logAudit({
    actorId: req.user!.sub,
    actorEmail: req.user!.email,
    actorRole: req.user!.role,
    action: 'EXPORT_REGISTRATIONS_CSV',
    targetType: 'registrations',
    details: `Exported ${rows.length} rows`,
  });

  // Prepend UTF-8 BOM so Bangla text renders properly in Microsoft Excel
  const csvBuffer = Buffer.from('\uFEFF' + lines.join('\r\n'), 'utf8');
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="hcfb-registrations-${Date.now()}.csv"`);
  res.send(csvBuffer);
});

// Competitions CRUD
app.get('/api/admin/competitions', requireAuth(ADMIN_ROLES), (_req, res) => {
  const comps = db
    .prepare(
      `SELECT c.*, (SELECT COUNT(*) FROM registrations r WHERE r.competition_id = c.id) as participant_count
       FROM competitions c ORDER BY c.created_at DESC`
    )
    .all() as Array<Record<string, unknown>>;
  const catsStmt = db.prepare('SELECT * FROM competition_categories WHERE competition_id = ?');
  const critStmt = db.prepare('SELECT * FROM scoring_criteria WHERE competition_id = ?');
  for (const c of comps) {
    c.categories = catsStmt.all(c.id);
    c.criteria = critStmt.all(c.id);
  }
  res.json({ competitions: comps });
});

app.post('/api/admin/competitions', requireAuth(['super_admin', 'content_editor']), (req: AuthedRequest, res) => {
  const b = req.body as Record<string, unknown>;
  const slug =
    String(b.slug || '')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, '-') || `competition-${Date.now()}`;

  const tx = db.transaction(() => {
    if (b.is_featured) {
      db.prepare('UPDATE competitions SET is_featured = 0').run();
    }
    const info = db
      .prepare(
        `INSERT INTO competitions (
          slug, title_bn, title_en, description_bn, description_en, banner_url,
          registration_open_date, registration_deadline, competition_date,
          eligibility_bn, eligibility_en, rules_bn, rules_en,
          status, is_featured, results_published, is_sample
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`
      )
      .run(
        slug,
        String(b.title_bn || ''),
        String(b.title_en || ''),
        String(b.description_bn || ''),
        String(b.description_en || ''),
        String(b.banner_url || ''),
        String(b.registration_open_date || ''),
        String(b.registration_deadline || ''),
        String(b.competition_date || ''),
        String(b.eligibility_bn || ''),
        String(b.eligibility_en || ''),
        String(b.rules_bn || ''),
        String(b.rules_en || ''),
        String(b.status || 'published'),
        b.is_featured ? 1 : 0,
        b.results_published ? 1 : 0
      );

    const compId = info.lastInsertRowid;
    const cats = Array.isArray(b.categories) ? b.categories : [];
    const insertCat = db.prepare(
      'INSERT INTO competition_categories (competition_id, name_bn, name_en, age_or_class_range, max_score) VALUES (?, ?, ?, ?, ?)'
    );
    for (const cat of cats as Array<Record<string, unknown>>) {
      if (cat.name_bn || cat.name_en) {
        insertCat.run(
          compId,
          String(cat.name_bn || cat.name_en),
          String(cat.name_en || cat.name_bn),
          String(cat.age_or_class_range || ''),
          Number(cat.max_score || 100)
        );
      }
    }

    const crits = Array.isArray(b.criteria) ? b.criteria : [];
    const insertCrit = db.prepare(
      'INSERT INTO scoring_criteria (competition_id, name_bn, name_en, weight_percent, max_points) VALUES (?, ?, ?, ?, ?)'
    );
    if (crits.length > 0) {
      for (const cr of crits as Array<Record<string, unknown>>) {
        insertCrit.run(
          compId,
          String(cr.name_bn || cr.name_en),
          String(cr.name_en || cr.name_bn),
          Number(cr.weight_percent || 25),
          Number(cr.max_points || 25)
        );
      }
    } else {
      insertCrit.run(compId, 'বর্ণের গঠন ও সামঞ্জস্য', 'Letterform & Proportion', 30, 30);
      insertCrit.run(compId, 'পরিচ্ছন্নতা ও মার্জিন শৃঙ্খলা', 'Neatness & Margin Balance', 25, 25);
      insertCrit.run(compId, 'লেখার ছন্দ ও প্রবাহ', 'Stroke Rhythm & Flow', 25, 25);
      insertCrit.run(compId, 'সামগ্রিক নান্দনিক উপস্থাপনা', 'Overall Aesthetic Presentation', 20, 20);
    }

    return compId;
  });

  const compId = tx();
  logAudit({
    actorId: req.user!.sub,
    actorEmail: req.user!.email,
    actorRole: req.user!.role,
    action: 'CREATE_COMPETITION',
    targetType: 'competition',
    targetId: String(compId),
  });
  res.status(201).json({ id: compId, success: true });
});

app.patch('/api/admin/competitions/:id', requireAuth(['super_admin', 'content_editor']), (req: AuthedRequest, res) => {
  const id = Number(req.params.id);
  const b = req.body as Record<string, unknown>;

  db.transaction(() => {
    if (b.is_featured) {
      db.prepare('UPDATE competitions SET is_featured = 0').run();
    }
    db.prepare(
      `UPDATE competitions SET
         title_bn = COALESCE(?, title_bn),
         title_en = COALESCE(?, title_en),
         description_bn = COALESCE(?, description_bn),
         description_en = COALESCE(?, description_en),
         banner_url = COALESCE(?, banner_url),
         registration_open_date = COALESCE(?, registration_open_date),
         registration_deadline = COALESCE(?, registration_deadline),
         competition_date = COALESCE(?, competition_date),
         eligibility_bn = COALESCE(?, eligibility_bn),
         eligibility_en = COALESCE(?, eligibility_en),
         rules_bn = COALESCE(?, rules_bn),
         rules_en = COALESCE(?, rules_en),
         status = COALESCE(?, status),
         is_featured = COALESCE(?, is_featured),
         results_published = COALESCE(?, results_published),
         is_sample = 0,
         updated_at = datetime('now')
       WHERE id = ?`
    ).run(
      b.title_bn ?? null,
      b.title_en ?? null,
      b.description_bn ?? null,
      b.description_en ?? null,
      b.banner_url ?? null,
      b.registration_open_date ?? null,
      b.registration_deadline ?? null,
      b.competition_date ?? null,
      b.eligibility_bn ?? null,
      b.eligibility_en ?? null,
      b.rules_bn ?? null,
      b.rules_en ?? null,
      b.status ?? null,
      b.is_featured !== undefined ? (b.is_featured ? 1 : 0) : null,
      b.results_published !== undefined ? (b.results_published ? 1 : 0) : null,
      id
    );

    if (Array.isArray(b.categories)) {
      const insertCat = db.prepare(
        'INSERT INTO competition_categories (competition_id, name_bn, name_en, age_or_class_range, max_score) VALUES (?, ?, ?, ?, ?)'
      );
      for (const cat of b.categories as Array<Record<string, unknown>>) {
        if (!cat.id && (cat.name_bn || cat.name_en)) {
          insertCat.run(
            id,
            String(cat.name_bn || cat.name_en),
            String(cat.name_en || cat.name_bn),
            String(cat.age_or_class_range || ''),
            Number(cat.max_score || 100)
          );
        }
      }
    }
  })();

  logAudit({
    actorId: req.user!.sub,
    actorEmail: req.user!.email,
    actorRole: req.user!.role,
    action: 'UPDATE_COMPETITION',
    targetType: 'competition',
    targetId: String(id),
  });
  res.json({ success: true });
});

app.put('/api/admin/competitions/:id/criteria', requireAuth(['super_admin', 'content_editor']), (req: AuthedRequest, res) => {
  const compId = Number(req.params.id);
  const { criteria } = req.body as {
    criteria: Array<{ name_bn: string; name_en: string; weight_percent: number; max_points: number }>;
  };
  if (!Array.isArray(criteria) || criteria.length === 0) {
    res.status(400).json({ error: 'At least one scoring criterion is required.' });
    return;
  }

  db.transaction(() => {
    db.prepare('DELETE FROM scoring_criteria WHERE competition_id = ?').run(compId);
    const ins = db.prepare(
      'INSERT INTO scoring_criteria (competition_id, name_bn, name_en, weight_percent, max_points) VALUES (?, ?, ?, ?, ?)'
    );
    for (const c of criteria) {
      ins.run(
        compId,
        String(c.name_bn || c.name_en),
        String(c.name_en || c.name_bn),
        Number(c.weight_percent || 25),
        Number(c.max_points || 25)
      );
    }
  })();

  logAudit({
    actorId: req.user!.sub,
    actorEmail: req.user!.email,
    actorRole: req.user!.role,
    action: 'UPDATE_SCORING_CRITERIA',
    targetType: 'competition',
    targetId: String(compId),
    details: `${criteria.length} criteria saved`,
  });
  res.json({ success: true });
});

// Certificates Management
app.get('/api/admin/certificates', requireAuth(ADMIN_ROLES), (_req, res) => {
  const rows = db.prepare('SELECT * FROM certificates ORDER BY issued_at DESC').all();
  res.json({ certificates: rows });
});

app.post('/api/admin/certificates/issue', requireAuth(['super_admin', 'registration_manager']), (req: AuthedRequest, res) => {
  const { registration_pk, award_tier } = req.body as { registration_pk: number; award_tier?: string };
  const reg = db
    .prepare(
      `SELECT r.*, c.title_bn as comp_bn, c.title_en as comp_en, cat.name_bn as cat_bn
       FROM registrations r
       JOIN competitions c ON c.id = r.competition_id
       JOIN competition_categories cat ON cat.id = r.category_id
       WHERE r.id = ?`
    )
    .get(registration_pk) as Record<string, unknown> | undefined;

  if (!reg) {
    res.status(404).json({ error: 'Registration not found.' });
    return;
  }

  const existing = db
    .prepare('SELECT * FROM certificates WHERE registration_pk = ? AND revoked = 0')
    .get(registration_pk);
  if (existing) {
    res.json({ certificate: existing, alreadyIssued: true });
    return;
  }

  const year = new Date().getFullYear();
  const count = (db.prepare('SELECT COUNT(*) as c FROM certificates').get() as { c: number }).c + 1;
  const code = `HCFB-CERT-${year}-${String(count).padStart(5, '0')}`;
  const finalTier = award_tier || (reg.award_tier !== 'none' ? String(reg.award_tier) : 'merit');

  db.prepare(
    `INSERT INTO certificates (
      certificate_code, registration_pk, registration_id, participant_name_bn, participant_name_en,
      competition_title_bn, competition_title_en, category_name_bn, award_tier, issued_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    code,
    registration_pk,
    reg.registration_id,
    reg.name_bn,
    reg.name_en,
    reg.comp_bn,
    reg.comp_en,
    reg.cat_bn,
    finalTier,
    req.user!.name || req.user!.email || 'HCFB Admin'
  );

  logAudit({
    actorId: req.user!.sub,
    actorEmail: req.user!.email,
    actorRole: req.user!.role,
    action: 'ISSUE_CERTIFICATE',
    targetType: 'certificate',
    targetId: code,
    details: `Issued to ${reg.registration_id}`,
  });

  const created = db.prepare('SELECT * FROM certificates WHERE certificate_code = ?').get(code);
  res.status(201).json({ certificate: created });
});

app.patch('/api/admin/certificates/:id/revoke', requireAuth(['super_admin']), (req: AuthedRequest, res) => {
  const id = Number(req.params.id);
  const { revoked } = req.body as { revoked: boolean };
  db.prepare('UPDATE certificates SET revoked = ? WHERE id = ?').run(revoked ? 1 : 0, id);
  logAudit({
    actorId: req.user!.sub,
    actorEmail: req.user!.email,
    actorRole: req.user!.role,
    action: revoked ? 'REVOKE_CERTIFICATE' : 'RESTORE_CERTIFICATE',
    targetType: 'certificate',
    targetId: String(id),
  });
  res.json({ success: true });
});

app.post('/api/admin/certificates/bulk-issue', requireAuth(['super_admin', 'registration_manager']), (req: AuthedRequest, res) => {
  const { competition_id } = req.body as { competition_id: number };
  if (!competition_id) {
    res.status(400).json({ error: 'competition_id is required.' });
    return;
  }

  const eligible = db
    .prepare(
      `SELECT r.*, c.title_bn as comp_bn, c.title_en as comp_en, cat.name_bn as cat_bn
       FROM registrations r
       JOIN competitions c ON c.id = r.competition_id
       JOIN competition_categories cat ON cat.id = r.category_id
       LEFT JOIN certificates cert ON cert.registration_pk = r.id AND cert.revoked = 0
       WHERE r.competition_id = ? AND r.status IN ('verified', 'evaluated', 'winner') AND cert.id IS NULL`
    )
    .all(Number(competition_id)) as Array<Record<string, unknown>>;

  let issuedCount = 0;
  const year = new Date().getFullYear();
  let seq = (db.prepare('SELECT COUNT(*) as c FROM certificates').get() as { c: number }).c;

  db.transaction(() => {
    const ins = db.prepare(
      `INSERT INTO certificates (
        certificate_code, registration_pk, registration_id, participant_name_bn, participant_name_en,
        competition_title_bn, competition_title_en, category_name_bn, award_tier, issued_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );
    for (const reg of eligible) {
      seq += 1;
      const code = `HCFB-CERT-${year}-${String(seq).padStart(5, '0')}`;
      const tier = reg.award_tier !== 'none' ? String(reg.award_tier) : 'merit';
      ins.run(
        code,
        reg.id,
        reg.registration_id,
        reg.name_bn,
        reg.name_en,
        reg.comp_bn,
        reg.comp_en,
        reg.cat_bn,
        tier,
        req.user!.name || req.user!.email || 'HCFB Admin'
      );
      issuedCount += 1;
    }
  })();

  logAudit({
    actorId: req.user!.sub,
    actorEmail: req.user!.email,
    actorRole: req.user!.role,
    action: 'BULK_ISSUE_CERTIFICATES',
    targetType: 'competition',
    targetId: String(competition_id),
    details: `Issued ${issuedCount} certificates`,
  });

  res.json({ success: true, issuedCount });
});

// Testimonials Management
app.get('/api/admin/testimonials', requireAuth(ADMIN_ROLES), (_req, res) => {
  res.json({ testimonials: db.prepare('SELECT * FROM testimonials ORDER BY created_at DESC').all() });
});

app.post('/api/admin/testimonials', requireAuth(['super_admin', 'content_editor']), (req: AuthedRequest, res) => {
  const b = req.body as Record<string, unknown>;
  const info = db
    .prepare(
      `INSERT INTO testimonials (author_name_bn, author_name_en, role_bn, role_en, organization, quote_bn, quote_en, is_verified, is_sample)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)`
    )
    .run(
      String(b.author_name_bn || ''),
      String(b.author_name_en || ''),
      String(b.role_bn || ''),
      String(b.role_en || ''),
      String(b.organization || ''),
      String(b.quote_bn || ''),
      String(b.quote_en || ''),
      b.is_verified ? 1 : 0
    );
  logAudit({
    actorId: req.user!.sub,
    actorEmail: req.user!.email,
    actorRole: req.user!.role,
    action: 'ADD_TESTIMONIAL',
    targetType: 'testimonial',
    targetId: String(info.lastInsertRowid),
  });
  res.status(201).json({ id: info.lastInsertRowid, success: true });
});

app.patch('/api/admin/testimonials/:id', requireAuth(['super_admin', 'content_editor']), (req, res) => {
  const { is_verified } = req.body as { is_verified: boolean };
  db.prepare('UPDATE testimonials SET is_verified = ? WHERE id = ?').run(is_verified ? 1 : 0, Number(req.params.id));
  res.json({ success: true });
});

app.delete('/api/admin/testimonials/:id', requireAuth(['super_admin', 'content_editor']), (req, res) => {
  db.prepare('DELETE FROM testimonials WHERE id = ?').run(Number(req.params.id));
  res.json({ success: true });
});

// Notices CRUD
app.get('/api/admin/notices', requireAuth(ADMIN_ROLES), (_req, res) => {
  res.json({ notices: db.prepare('SELECT * FROM notices ORDER BY published_at DESC, id DESC').all() });
});

app.post('/api/admin/notices', requireAuth(['super_admin', 'content_editor']), (req: AuthedRequest, res) => {
  const b = req.body as Record<string, unknown>;
  const info = db
    .prepare(
      `INSERT INTO notices (title_bn, title_en, summary_bn, summary_en, content_bn, content_en, attachment_url, attachment_name, is_important, published_at, is_published, is_sample)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`
    )
    .run(
      String(b.title_bn || ''),
      String(b.title_en || ''),
      String(b.summary_bn || ''),
      String(b.summary_en || ''),
      String(b.content_bn || ''),
      String(b.content_en || ''),
      String(b.attachment_url || ''),
      String(b.attachment_name || ''),
      b.is_important ? 1 : 0,
      String(b.published_at || new Date().toISOString().slice(0, 10)),
      b.is_published !== false ? 1 : 0
    );
  logAudit({
    actorId: req.user!.sub,
    actorEmail: req.user!.email,
    actorRole: req.user!.role,
    action: 'CREATE_NOTICE',
    targetType: 'notice',
    targetId: String(info.lastInsertRowid),
  });
  res.status(201).json({ id: info.lastInsertRowid, success: true });
});

app.delete('/api/admin/notices/:id', requireAuth(['super_admin', 'content_editor']), (req: AuthedRequest, res) => {
  const id = Number(req.params.id);
  db.prepare('DELETE FROM notices WHERE id = ?').run(id);
  logAudit({
    actorId: req.user!.sub,
    actorEmail: req.user!.email,
    actorRole: req.user!.role,
    action: 'DELETE_NOTICE',
    targetType: 'notice',
    targetId: String(id),
  });
  res.json({ success: true });
});

// Gallery CRUD
app.post('/api/admin/gallery', requireAuth(['super_admin', 'content_editor']), (req: AuthedRequest, res) => {
  const b = req.body as Record<string, unknown>;
  const info = db
    .prepare(
      `INSERT INTO gallery_items (title_bn, title_en, description_bn, description_en, category, image_url, event_name, is_featured_artwork, is_sample)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)`
    )
    .run(
      String(b.title_bn || ''),
      String(b.title_en || ''),
      String(b.description_bn || ''),
      String(b.description_en || ''),
      String(b.category || 'Other Events'),
      String(b.image_url || ''),
      String(b.event_name || ''),
      b.is_featured_artwork ? 1 : 0
    );
  logAudit({
    actorId: req.user!.sub,
    actorEmail: req.user!.email,
    actorRole: req.user!.role,
    action: 'ADD_GALLERY_ITEM',
    targetType: 'gallery',
    targetId: String(info.lastInsertRowid),
  });
  res.status(201).json({ id: info.lastInsertRowid, success: true });
});

app.delete('/api/admin/gallery/:id', requireAuth(['super_admin', 'content_editor']), (req: AuthedRequest, res) => {
  const id = Number(req.params.id);
  db.prepare('DELETE FROM gallery_items WHERE id = ?').run(id);
  res.json({ success: true });
});

// Hub Resources CRUD
app.post('/api/admin/hub', requireAuth(['super_admin', 'content_editor']), (req: AuthedRequest, res) => {
  const b = req.body as Record<string, unknown>;
  const info = db
    .prepare(
      `INSERT INTO hub_resources (type, title_bn, title_en, summary_bn, summary_en, content_bn, content_en, author_or_artist, image_url, is_sample)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`
    )
    .run(
      String(b.type || 'article'),
      String(b.title_bn || ''),
      String(b.title_en || ''),
      String(b.summary_bn || ''),
      String(b.summary_en || ''),
      String(b.content_bn || ''),
      String(b.content_en || ''),
      String(b.author_or_artist || 'HCFB Editorial'),
      String(b.image_url || '')
    );
  res.status(201).json({ id: info.lastInsertRowid, success: true });
});

app.delete('/api/admin/hub/:id', requireAuth(['super_admin', 'content_editor']), (req, res) => {
  db.prepare('DELETE FROM hub_resources WHERE id = ?').run(Number(req.params.id));
  res.json({ success: true });
});

// Team CRUD
app.post('/api/admin/team', requireAuth(['super_admin', 'content_editor']), (req: AuthedRequest, res) => {
  const b = req.body as Record<string, unknown>;
  const info = db
    .prepare(
      `INSERT INTO team_members (name_bn, name_en, designation_bn, designation_en, bio_bn, bio_en, photo_url, social_link, display_order, is_placeholder, is_published)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 1)`
    )
    .run(
      String(b.name_bn || ''),
      String(b.name_en || ''),
      String(b.designation_bn || ''),
      String(b.designation_en || ''),
      String(b.bio_bn || ''),
      String(b.bio_en || ''),
      String(b.photo_url || ''),
      String(b.social_link || ''),
      Number(b.display_order || 1)
    );
  logAudit({
    actorId: req.user!.sub,
    actorEmail: req.user!.email,
    actorRole: req.user!.role,
    action: 'ADD_TEAM_MEMBER',
    targetType: 'team',
    targetId: String(info.lastInsertRowid),
  });
  res.status(201).json({ id: info.lastInsertRowid, success: true });
});

app.delete('/api/admin/team/:id', requireAuth(['super_admin', 'content_editor']), (req, res) => {
  db.prepare('DELETE FROM team_members WHERE id = ?').run(Number(req.params.id));
  res.json({ success: true });
});

// Messages Inbox
app.get('/api/admin/messages', requireAuth(ADMIN_ROLES), (_req, res) => {
  res.json({ messages: db.prepare('SELECT * FROM contact_messages ORDER BY created_at DESC').all() });
});

app.patch('/api/admin/messages/:id', requireAuth(ADMIN_ROLES), (req, res) => {
  const { status } = req.body as { status: string };
  db.prepare('UPDATE contact_messages SET status = ? WHERE id = ?').run(status, Number(req.params.id));
  res.json({ success: true });
});

// Website Settings & Content Management
app.put('/api/admin/settings/:key', requireAuth(['super_admin', 'content_editor']), (req: AuthedRequest, res) => {
  const key = String(req.params.key);
  db.prepare(
    `INSERT INTO website_settings (key, value_json, updated_at) VALUES (?, ?, datetime('now'))
     ON CONFLICT(key) DO UPDATE SET value_json = excluded.value_json, updated_at = datetime('now')`
  ).run(key, JSON.stringify(req.body));

  logAudit({
    actorId: req.user!.sub,
    actorEmail: req.user!.email,
    actorRole: req.user!.role,
    action: 'UPDATE_SETTINGS',
    targetType: 'website_settings',
    targetId: key,
  });
  res.json({ success: true });
});

// File Upload Endpoint
app.post('/api/admin/upload', requireAuth(ADMIN_ROLES), upload.single('file'), (req: AuthedRequest, res) => {
  if (!req.file) {
    res.status(400).json({ error: 'No valid file uploaded.' });
    return;
  }
  const fileUrl = `/uploads/${req.file.filename}`;
  logAudit({
    actorId: req.user!.sub,
    actorEmail: req.user!.email,
    actorRole: req.user!.role,
    action: 'UPLOAD_FILE',
    targetType: 'upload',
    targetId: req.file.filename,
  });
  res.json({ url: fileUrl, filename: req.file.originalname });
});

// Admin Users & Role Management (Super Admin only)
app.get('/api/admin/users', requireAuth(['super_admin']), (_req, res) => {
  const users = db.prepare('SELECT id, name, email, role, active, created_at FROM admin_users ORDER BY id ASC').all();
  res.json({ users });
});

app.post('/api/admin/users', requireAuth(['super_admin']), (req: AuthedRequest, res) => {
  const { name, email, password, role } = req.body as Record<string, string>;
  if (!name || !email || !password || password.length < 8) {
    res.status(400).json({ error: 'Name, email, and password (min 8 chars) are required.' });
    return;
  }
  try {
    const info = db
      .prepare('INSERT INTO admin_users (name, email, password_hash, role) VALUES (?, ?, ?, ?)')
      .run(name.trim(), email.trim().toLowerCase(), hashPassword(password), role || 'content_editor');
    logAudit({
      actorId: req.user!.sub,
      actorEmail: req.user!.email,
      actorRole: req.user!.role,
      action: 'CREATE_ADMIN_USER',
      targetType: 'admin_user',
      targetId: String(info.lastInsertRowid),
      details: `${email} (${role})`,
    });
    res.status(201).json({ success: true });
  } catch {
    res.status(409).json({ error: 'An account with this email already exists.' });
  }
});

// Activity Logs & Database Backup (Super Admin only)
app.get('/api/admin/audit-logs', requireAuth(['super_admin']), (_req, res) => {
  const logs = db.prepare('SELECT * FROM admin_audit_logs ORDER BY id DESC LIMIT 150').all();
  res.json({ logs });
});

app.get('/api/admin/backup', requireAuth(['super_admin']), (req: AuthedRequest, res) => {
  const tables = [
    'competitions',
    'competition_categories',
    'scoring_criteria',
    'registrations',
    'judge_evaluations',
    'certificates',
    'notices',
    'gallery_items',
    'hub_resources',
    'team_members',
    'testimonials',
    'contact_messages',
    'website_settings',
  ];
  const snapshot: Record<string, unknown> = {
    exported_at: new Date().toISOString(),
    exported_by: req.user!.email,
    organization: 'Handwriting & Calligraphy Foundation of Bangladesh (HCFB)',
    data: {},
  };
  for (const t of tables) {
    (snapshot.data as Record<string, unknown>)[t] = db.prepare(`SELECT * FROM ${t}`).all();
  }
  logAudit({
    actorId: req.user!.sub,
    actorEmail: req.user!.email,
    actorRole: req.user!.role,
    action: 'DATABASE_BACKUP',
    targetType: 'database',
    details: 'Full JSON snapshot exported',
  });
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename="hcfb-backup-${new Date().toISOString().slice(0, 10)}.json"`);
  res.send(JSON.stringify(snapshot, null, 2));
});

app.post('/api/admin/clear-samples', requireAuth(['super_admin']), (req: AuthedRequest, res) => {
  db.transaction(() => {
    db.prepare('DELETE FROM certificates WHERE registration_pk IN (SELECT id FROM registrations WHERE is_sample = 1)').run();
    db.prepare('DELETE FROM registrations WHERE is_sample = 1').run();
    db.prepare('DELETE FROM competitions WHERE is_sample = 1').run();
    db.prepare('DELETE FROM notices WHERE is_sample = 1').run();
    db.prepare('DELETE FROM gallery_items WHERE is_sample = 1').run();
    db.prepare('DELETE FROM hub_resources WHERE is_sample = 1').run();
    db.prepare('DELETE FROM team_members WHERE is_placeholder = 1').run();
    db.prepare('DELETE FROM testimonials WHERE is_sample = 1').run();
  })();
  logAudit({
    actorId: req.user!.sub,
    actorEmail: req.user!.email,
    actorRole: req.user!.role,
    action: 'CLEAR_SAMPLE_DATA',
    targetType: 'database',
    details: 'Removed all sample/placeholder records',
  });
  res.json({ success: true });
});

// SEO: robots.txt & sitemap.xml
app.get('/robots.txt', (_req, res) => {
  res.type('text/plain').send('User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /judge\nDisallow: /api/\n');
});

app.get('/sitemap.xml', (req, res) => {
  const origin = `${req.protocol}://${req.get('host')}`;
  const routes = ['', '/about', '/competitions', '/register', '/track', '/verify', '/portal', '/hub', '/gallery', '/notices', '/team', '/contact', '/privacy', '/terms'];
  const comps = db.prepare("SELECT slug FROM competitions WHERE status IN ('published','closed')").all() as Array<{ slug: string }>;
  for (const c of comps) routes.push(`/competitions/${c.slug}`);

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${routes.map((r) => `  <url><loc>${origin}${r}</loc></url>`).join('\n')}
</urlset>`;
  res.type('application/xml').send(xml);
});

// Error handler for upload or JSON issues
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  res.status(400).json({ error: err.message || 'Bad request' });
});

// ==================== VITE / STATIC SPA SERVING ====================

async function startServer() {
  await initDatabase();

  if (process.env.NODE_ENV !== 'production') {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`HCFB Server listening on http://localhost:${PORT}`);
  });
}

startServer();
