import initSqlJs, { type Database as SqlJsDatabase, type BindParams } from 'sql.js';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const DATA_DIR = path.resolve(process.cwd(), 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DB_PATH = path.join(DATA_DIR, 'hcfb.db');

let rawDb: SqlJsDatabase | null = null;
let txDepth = 0;

function persistDb() {
  if (!rawDb || txDepth > 0) return;
  const data = rawDb.export();
  const tmpPath = `${DB_PATH}.tmp`;
  fs.writeFileSync(tmpPath, Buffer.from(data));
  fs.renameSync(tmpPath, DB_PATH);
}

function getRawDb(): SqlJsDatabase {
  if (!rawDb) {
    throw new Error('Database not initialized. Call await initDatabase() first.');
  }
  return rawDb;
}

function normalizeParams(args: unknown[]): BindParams {
  const flat = args.length === 1 && Array.isArray(args[0]) ? args[0] : args;
  return flat.map((v) => {
    if (v === undefined) return null;
    if (typeof v === 'boolean') return v ? 1 : 0;
    return v as string | number | Uint8Array | null;
  });
}

interface StatementLike {
  run: (...args: unknown[]) => { lastInsertRowid: number; changes: number };
  get: (...args: unknown[]) => unknown;
  all: (...args: unknown[]) => unknown[];
}

export const db = {
  pragma(clause: string) {
    if (clause.toLowerCase().includes('journal_mode')) return;
    getRawDb().exec(`PRAGMA ${clause}`);
  },

  exec(sql: string) {
    getRawDb().exec(sql);
    persistDb();
  },

  prepare(sql: string): StatementLike {
    return {
      run(...args: unknown[]) {
        const instance = getRawDb();
        const stmt = instance.prepare(sql);
        try {
          const params = normalizeParams(args);
          if (Array.isArray(params) && params.length > 0) {
            stmt.bind(params);
          }
          stmt.step();
        } finally {
          stmt.free();
        }
        const changes = instance.getRowsModified();
        const rowidRes = instance.exec('SELECT last_insert_rowid() as id');
        const lastInsertRowid = Number(rowidRes[0]?.values?.[0]?.[0] ?? 0);
        persistDb();
        return { lastInsertRowid, changes };
      },

      get(...args: unknown[]) {
        const instance = getRawDb();
        const stmt = instance.prepare(sql);
        try {
          const params = normalizeParams(args);
          if (Array.isArray(params) && params.length > 0) {
            stmt.bind(params);
          }
          if (!stmt.step()) return undefined;
          return stmt.getAsObject();
        } finally {
          stmt.free();
        }
      },

      all(...args: unknown[]) {
        const instance = getRawDb();
        const stmt = instance.prepare(sql);
        const rows: unknown[] = [];
        try {
          const params = normalizeParams(args);
          if (Array.isArray(params) && params.length > 0) {
            stmt.bind(params);
          }
          while (stmt.step()) {
            rows.push(stmt.getAsObject());
          }
          return rows;
        } finally {
          stmt.free();
        }
      },
    };
  },

  transaction<TArgs extends unknown[], TResult>(fn: (...args: TArgs) => TResult) {
    return (...args: TArgs): TResult => {
      const instance = getRawDb();
      const isOuter = txDepth === 0;
      if (isOuter) {
        instance.exec('BEGIN');
      }
      txDepth += 1;
      try {
        const result = fn(...args);
        txDepth -= 1;
        if (isOuter) {
          instance.exec('COMMIT');
          persistDb();
        }
        return result;
      } catch (err) {
        txDepth -= 1;
        if (isOuter) {
          try {
            instance.exec('ROLLBACK');
          } catch {
            // ignore rollback error
          }
        }
        throw err;
      }
    };
  },
};

const SESSION_SECRET =
  process.env.SESSION_SECRET && process.env.SESSION_SECRET !== 'CHANGE_THIS_TO_A_LONG_RANDOM_SECRET'
    ? process.env.SESSION_SECRET
    : crypto.createHash('sha256').update(DB_PATH + 'hcfb_institutional_key').digest('hex');

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  const parts = storedHash.split(':');
  if (parts.length !== 2) return false;
  const [salt, keyHex] = parts;
  const derived = crypto.scryptSync(password, salt, 64);
  const keyBuf = Buffer.from(keyHex, 'hex');
  if (derived.length !== keyBuf.length) return false;
  return crypto.timingSafeEqual(derived, keyBuf);
}

export interface TokenPayload {
  sub: string;
  role: string;
  email?: string;
  name?: string;
  exp: number;
}

export function signToken(payload: Omit<TokenPayload, 'exp'>, ttlSeconds = 60 * 60 * 12): string {
  const fullPayload: TokenPayload = {
    ...payload,
    exp: Math.floor(Date.now() / 1000) + ttlSeconds,
  };
  const body = Buffer.from(JSON.stringify(fullPayload)).toString('base64url');
  const sig = crypto.createHmac('sha256', SESSION_SECRET).update(body).digest('base64url');
  return `${body}.${sig}`;
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 2) return null;
    const [body, sig] = parts;
    const expected = crypto.createHmac('sha256', SESSION_SECRET).update(body).digest('base64url');
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
    const decoded = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as TokenPayload;
    if (!decoded.exp || decoded.exp < Math.floor(Date.now() / 1000)) return null;
    return decoded;
  } catch {
    return null;
  }
}

export function normalizeBdMobile(raw: string): string {
  const cleaned = raw.replace(/[\s\-()]/g, '');
  if (cleaned.startsWith('+880')) return '0' + cleaned.slice(4);
  if (cleaned.startsWith('880')) return '0' + cleaned.slice(3);
  return cleaned;
}

export function isValidBdMobile(raw: string): boolean {
  const normalized = normalizeBdMobile(raw);
  return /^01[3-9]\d{8}$/.test(normalized);
}

export function logAudit(params: {
  actorId?: string | null;
  actorEmail?: string | null;
  actorRole?: string | null;
  action: string;
  targetType?: string | null;
  targetId?: string | null;
  details?: string | null;
}) {
  db.prepare(
    `INSERT INTO admin_audit_logs (actor_id, actor_email, actor_role, action, target_type, target_id, details)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(
    params.actorId ?? null,
    params.actorEmail ?? null,
    params.actorRole ?? null,
    params.action,
    params.targetType ?? null,
    params.targetId ?? null,
    params.details ?? null
  );
}

export async function initDatabase() {
  if (!rawDb) {
    const SQL = await initSqlJs();
    if (fs.existsSync(DB_PATH)) {
      const buf = fs.readFileSync(DB_PATH);
      if (buf.length >= 20 && (buf[18] === 2 || buf[19] === 2)) {
        buf[18] = 1;
        buf[19] = 1;
      }
      rawDb = new SQL.Database(buf);
    } else {
      rawDb = new SQL.Database();
    }
  }

  db.pragma('foreign_keys = ON');

  txDepth += 1;
  try {
    db.exec(`
    CREATE TABLE IF NOT EXISTS admin_users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('super_admin', 'content_editor', 'registration_manager', 'judge')),
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS competitions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slug TEXT UNIQUE NOT NULL,
      title_bn TEXT NOT NULL,
      title_en TEXT NOT NULL,
      description_bn TEXT NOT NULL,
      description_en TEXT NOT NULL,
      banner_url TEXT NOT NULL DEFAULT '',
      registration_open_date TEXT NOT NULL,
      registration_deadline TEXT NOT NULL,
      competition_date TEXT NOT NULL,
      eligibility_bn TEXT NOT NULL,
      eligibility_en TEXT NOT NULL,
      rules_bn TEXT NOT NULL,
      rules_en TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'published' CHECK(status IN ('draft', 'published', 'closed')),
      is_featured INTEGER NOT NULL DEFAULT 0,
      results_published INTEGER NOT NULL DEFAULT 0,
      is_sample INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS competition_categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      competition_id INTEGER NOT NULL REFERENCES competitions(id) ON DELETE CASCADE,
      name_bn TEXT NOT NULL,
      name_en TEXT NOT NULL,
      age_or_class_range TEXT NOT NULL DEFAULT '',
      max_score INTEGER NOT NULL DEFAULT 100
    );

    CREATE TABLE IF NOT EXISTS scoring_criteria (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      competition_id INTEGER NOT NULL REFERENCES competitions(id) ON DELETE CASCADE,
      name_bn TEXT NOT NULL,
      name_en TEXT NOT NULL,
      weight_percent INTEGER NOT NULL DEFAULT 25,
      max_points INTEGER NOT NULL DEFAULT 25
    );

    CREATE TABLE IF NOT EXISTS registrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      registration_id TEXT UNIQUE NOT NULL,
      competition_id INTEGER NOT NULL REFERENCES competitions(id) ON DELETE RESTRICT,
      category_id INTEGER NOT NULL REFERENCES competition_categories(id) ON DELETE RESTRICT,
      name_bn TEXT NOT NULL,
      name_en TEXT NOT NULL,
      father_name TEXT NOT NULL,
      mother_name TEXT NOT NULL,
      school_name TEXT NOT NULL DEFAULT '',
      class_level TEXT NOT NULL DEFAULT '',
      mobile TEXT NOT NULL,
      alt_mobile TEXT NOT NULL DEFAULT '',
      email TEXT NOT NULL DEFAULT '',
      district TEXT NOT NULL,
      upazila TEXT NOT NULL DEFAULT '',
      participant_type TEXT NOT NULL DEFAULT 'Student' CHECK(participant_type IN ('Student', 'Other')),
      additional_info TEXT NOT NULL DEFAULT '',
      guardian_consent INTEGER NOT NULL DEFAULT 0,
      privacy_consent INTEGER NOT NULL DEFAULT 1,
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'verified', 'evaluated', 'winner', 'rejected')),
      award_tier TEXT NOT NULL DEFAULT 'none' CHECK(award_tier IN ('none', '1st_place', '2nd_place', '3rd_place', 'honorable_mention', 'merit')),
      total_score REAL DEFAULT NULL,
      rank_position INTEGER DEFAULT NULL,
      email_dispatch_status TEXT NOT NULL DEFAULT 'not_requested',
      is_sample INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS judge_evaluations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      registration_pk INTEGER NOT NULL REFERENCES registrations(id) ON DELETE CASCADE,
      judge_id INTEGER NOT NULL REFERENCES admin_users(id) ON DELETE RESTRICT,
      criteria_scores_json TEXT NOT NULL,
      total_score REAL NOT NULL,
      remarks TEXT NOT NULL DEFAULT '',
      evaluated_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(registration_pk, judge_id)
    );

    CREATE TABLE IF NOT EXISTS certificates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      certificate_code TEXT UNIQUE NOT NULL,
      registration_pk INTEGER NOT NULL REFERENCES registrations(id) ON DELETE CASCADE,
      registration_id TEXT NOT NULL,
      participant_name_bn TEXT NOT NULL,
      participant_name_en TEXT NOT NULL,
      competition_title_bn TEXT NOT NULL,
      competition_title_en TEXT NOT NULL,
      category_name_bn TEXT NOT NULL,
      award_tier TEXT NOT NULL DEFAULT 'merit',
      issued_at TEXT NOT NULL DEFAULT (datetime('now')),
      issued_by TEXT NOT NULL,
      revoked INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS notices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title_bn TEXT NOT NULL,
      title_en TEXT NOT NULL,
      summary_bn TEXT NOT NULL,
      summary_en TEXT NOT NULL,
      content_bn TEXT NOT NULL,
      content_en TEXT NOT NULL,
      attachment_url TEXT NOT NULL DEFAULT '',
      attachment_name TEXT NOT NULL DEFAULT '',
      is_important INTEGER NOT NULL DEFAULT 0,
      published_at TEXT NOT NULL DEFAULT (date('now')),
      is_published INTEGER NOT NULL DEFAULT 1,
      is_sample INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS gallery_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title_bn TEXT NOT NULL,
      title_en TEXT NOT NULL,
      description_bn TEXT NOT NULL DEFAULT '',
      description_en TEXT NOT NULL DEFAULT '',
      category TEXT NOT NULL CHECK(category IN ('Handwriting Competition', 'Calligraphy', 'Workshops & Training', 'Award Ceremonies', 'Educational Activities', 'Other Events')),
      image_url TEXT NOT NULL,
      event_name TEXT NOT NULL DEFAULT '',
      is_featured_artwork INTEGER NOT NULL DEFAULT 0,
      is_sample INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS hub_resources (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL CHECK(type IN ('article', 'practice_sheet', 'calligraphy_guide', 'artwork_of_month', 'student_showcase')),
      title_bn TEXT NOT NULL,
      title_en TEXT NOT NULL,
      summary_bn TEXT NOT NULL,
      summary_en TEXT NOT NULL,
      content_bn TEXT NOT NULL,
      content_en TEXT NOT NULL,
      author_or_artist TEXT NOT NULL DEFAULT '',
      image_url TEXT NOT NULL DEFAULT '',
      download_template_key TEXT NOT NULL DEFAULT '',
      is_sample INTEGER NOT NULL DEFAULT 1,
      published_at TEXT NOT NULL DEFAULT (date('now'))
    );

    CREATE TABLE IF NOT EXISTS team_members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name_bn TEXT NOT NULL,
      name_en TEXT NOT NULL,
      designation_bn TEXT NOT NULL,
      designation_en TEXT NOT NULL,
      bio_bn TEXT NOT NULL DEFAULT '',
      bio_en TEXT NOT NULL DEFAULT '',
      photo_url TEXT NOT NULL DEFAULT '',
      social_link TEXT NOT NULL DEFAULT '',
      display_order INTEGER NOT NULL DEFAULT 1,
      is_placeholder INTEGER NOT NULL DEFAULT 1,
      is_published INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS testimonials (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      author_name_bn TEXT NOT NULL,
      author_name_en TEXT NOT NULL,
      role_bn TEXT NOT NULL,
      role_en TEXT NOT NULL,
      organization TEXT NOT NULL DEFAULT '',
      quote_bn TEXT NOT NULL,
      quote_en TEXT NOT NULL,
      is_verified INTEGER NOT NULL DEFAULT 0,
      is_sample INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS contact_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL DEFAULT '',
      mobile TEXT NOT NULL,
      subject TEXT NOT NULL,
      message TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'unread' CHECK(status IN ('unread', 'read', 'resolved')),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS website_settings (
      key TEXT PRIMARY KEY,
      value_json TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS admin_audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      actor_id TEXT,
      actor_email TEXT,
      actor_role TEXT,
      action TEXT NOT NULL,
      target_type TEXT,
      target_id TEXT,
      details TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  seedInitialData();
  } finally {
    txDepth -= 1;
    persistDb();
  }
}

function seedInitialData() {
  const adminCount = (db.prepare('SELECT COUNT(*) as c FROM admin_users').get() as { c: number }).c;
  if (adminCount === 0) {
    const adminPass =
      process.env.ADMIN_SEED_PASSWORD &&
      process.env.ADMIN_SEED_PASSWORD !== 'CHANGE_THIS_INITIAL_ADMIN_PASSWORD'
        ? process.env.ADMIN_SEED_PASSWORD
        : 'HcfbAdmin#2026';
    const judgePass =
      process.env.JUDGE_SEED_PASSWORD &&
      process.env.JUDGE_SEED_PASSWORD !== 'CHANGE_THIS_INITIAL_JUDGE_PASSWORD'
        ? process.env.JUDGE_SEED_PASSWORD
        : 'HcfbJudge#2026';

    const insertUser = db.prepare(
      'INSERT INTO admin_users (name, email, password_hash, role) VALUES (?, ?, ?, ?)'
    );
    insertUser.run('HCFB Super Administrator', 'admin@hcfb.org.bd', hashPassword(adminPass), 'super_admin');
    insertUser.run('HCFB Content Editor', 'editor@hcfb.org.bd', hashPassword(adminPass), 'content_editor');
    insertUser.run('HCFB Registration Desk', 'registrar@hcfb.org.bd', hashPassword(adminPass), 'registration_manager');
    insertUser.run('Senior Calligraphy Jury', 'judge@hcfb.org.bd', hashPassword(judgePass), 'judge');
  }

  const settingsCount = (db.prepare('SELECT COUNT(*) as c FROM website_settings').get() as { c: number }).c;
  if (settingsCount === 0) {
    const defaultSettings: Record<string, unknown> = {
      site_identity: {
        org_name_bn: 'হ্যান্ডরাইটিং এন্ড ক্যালিগ্রাফি ফাউন্ডেশন অব বাংলাদেশ',
        org_name_en: 'HANDWRITING & CALLIGRAPHY FOUNDATION OF BANGLADESH',
        short_name: 'HCFB',
        logo_url: '',
        primary_mobile: '+880 1869-970401',
        secondary_mobile: '01605278615',
        whatsapp_number: '8801869970401',
        email: 'hcfb2026@gmail.com',
        address_bn: 'অফিসিয়াল ঠিকানা: পরবর্তীতে সংযুক্ত করা হবে',
        address_en: 'Official Address: To be updated later',
        facebook_url: 'https://www.facebook.com',
        facebook_page_configured: false,
      },
      homepage_content: {
        hero_headline_bn: 'সুন্দর হাতের লেখা ও ক্যালিগ্রাফির চর্চা ছড়িয়ে পড়ুক সারাদেশে',
        hero_headline_en: 'Promoting the Art of Beautiful Handwriting & Calligraphy Across Bangladesh',
        hero_subtext_bn:
          'শিক্ষার্থী, শিক্ষক ও শিল্পপ্রেমীদের মধ্যে সুন্দর হাতের লেখা এবং ক্যালিগ্রাফির চর্চা, দক্ষতা ও সৃজনশীলতা বিকাশে আমরা কাজ করছি।',
        hero_subtext_en:
          'Dedicated to nurturing beautiful penmanship, artistic calligraphy, and creative discipline among students, educators, and enthusiasts across Bangladesh.',
        about_title_bn: 'আমাদের সম্পর্কে',
        about_title_en: 'About the Foundation',
        about_summary_bn:
          'হ্যান্ডরাইটিং এন্ড ক্যালিগ্রাফি ফাউন্ডেশন অব বাংলাদেশ একটি অলাভজনক শিক্ষামূলক প্রতিষ্ঠান। সুন্দর হাতের লেখা ও ক্যালিগ্রাফির চর্চা সারাদেশে ছড়িয়ে দেওয়া এবং এ বিষয়ে শিক্ষার্থী ও আগ্রহীদের দক্ষতা বিকাশে কাজ করাই আমাদের মূল লক্ষ্য।',
        about_summary_en:
          'Handwriting & Calligraphy Foundation of Bangladesh (HCFB) is a non-profit educational foundation dedicated to cultivating neat handwriting and expressive calligraphy nationwide. (Official constitutional introduction to be finalized.)',
        about_full_bn:
          'হ্যান্ডরাইটিং এন্ড ক্যালিগ্রাফি ফাউন্ডেশন অব বাংলাদেশ (HCFB) একটি অলাভজনক শিক্ষামূলক ও সৃজনশীল চর্চাভিত্তিক উদ্যোগ। ডিজিটাল যুগেও হাতে লেখার সৌন্দর্য, বর্ণের শৃঙ্খলা, মনোযোগ ও নান্দনিক বোধ ধরে রাখা অত্যন্ত জরুরি। ফাউন্ডেশনের গঠনতন্ত্র চূড়ান্ত হওয়ার পর এই পরিচিতি অংশটি আনুষ্ঠানিকভাবে হালনাগাদ করা হবে।',
        about_full_en:
          'Handwriting & Calligraphy Foundation of Bangladesh (HCFB) promotes disciplined handwriting, traditional reed-pen calligraphy, educator training workshops, and nationwide student competitions. This institutional overview will be updated once the foundation constitution is formally ratified.',
        cta_headline_bn: 'আপনার সৃজনশীলতাকে প্রকাশ করুন',
        cta_headline_en: 'Express Your Creativity Through Ink & Form',
        cta_subtext_bn: 'হাতের লেখা ও ক্যালিগ্রাফির প্রতিযোগিতায় অংশগ্রহণ করুন এবং নিজের প্রতিভা বিকশিত করুন।',
        cta_subtext_en: 'Participate in handwriting and calligraphy competitions and refine your craft.',
      },
      registration_field_config: {
        school_name: true,
        class_level: true,
        email: false,
        alt_mobile: false,
        upazila: false,
        additional_info: false,
      },
      annual_timeline: [
        {
          phase_bn: 'জানুয়ারি – মার্চ',
          phase_en: 'January – March',
          title_bn: 'প্রতিযোগিতা ঘোষণা ও অনলাইন নিবন্ধন (নমুনা)',
          title_en: 'Competition Announcement & Open Registration (Sample)',
          desc_bn: 'সারাদেশের শিক্ষা প্রতিষ্ঠানে নিবন্ধন ও অনুশীলন শিট বিতরণ।',
          desc_en: 'Nationwide registration and release of guided handwriting practice sheets.',
        },
        {
          phase_bn: 'এপ্রিল – জুন',
          phase_en: 'April – June',
          title_bn: 'আঞ্চলিক কর্মশালা ও শিক্ষক প্রশিক্ষণ (নমুনা)',
          title_en: 'Regional Workshops & Educator Orientation (Sample)',
          desc_bn: 'শিশু ও মাধ্যমিক শিক্ষার্থীদের জন্য সুন্দর হাতের লেখা ও কলম-ধরা প্রশিক্ষণ।',
          desc_en: 'Guided posture, stroke proportion, and reed-pen calligraphy clinics.',
        },
        {
          phase_bn: 'জুলাই – সেপ্টেম্বর',
          phase_en: 'July – September',
          title_bn: 'বিভাগীয় ও জাতীয় পর্যায়ের মূল্যায়ন (নমুনা)',
          title_en: 'Jury Evaluation & Merit Compilation (Sample)',
          desc_bn: 'নির্ধারিত মূল্যায়ন মানদণ্ড অনুযায়ী বিচারকমণ্ডলী কর্তৃক খাতা নিরীক্ষণ।',
          desc_en: 'Structured scoring across legibility, proportion, rhythm, and presentation.',
        },
        {
          phase_bn: 'অক্টোবর – ডিসেম্বর',
          phase_en: 'October – December',
          title_bn: 'ফলাফল প্রকাশ, প্রদর্শনী ও সনদ প্রদান (নমুনা)',
          title_en: 'Annual Exhibition, Merit List & Certification (Sample)',
          desc_bn: 'নির্বাচিত ক্যালিগ্রাফি প্রদর্শনী ও কিউআর-যাচাইকৃত সনদপত্র বিতরণ।',
          desc_en: 'Curated exhibition of winning works and QR-verified certificate issuance.',
        },
      ],
    };

    const insertSetting = db.prepare('INSERT INTO website_settings (key, value_json) VALUES (?, ?)');
    for (const [key, val] of Object.entries(defaultSettings)) {
      insertSetting.run(key, JSON.stringify(val));
    }
  }

  // Safely ensure hero_settings and footer_settings exist even on pre-existing databases
  const insertIgnoreSetting = db.prepare('INSERT OR IGNORE INTO website_settings (key, value_json) VALUES (?, ?)');
  insertIgnoreSetting.run(
    'hero_settings',
    JSON.stringify({
      badge_bn: 'জাতীয় হাতের লেখা ও ক্যালিগ্রাফি চর্চা প্ল্যাটফর্ম',
      badge_en: 'National Handwriting & Calligraphy Platform',
      headline_bn: 'সুন্দর হাতের লেখা ও ক্যালিগ্রাফির শিল্প চর্চায় উৎকর্ষ অর্জন করুন',
      headline_en: 'Master the Art of Beautiful Handwriting',
      subheadline_bn: 'হ্যান্ডরাইটিং এন্ড ক্যালিগ্রাফি ফাউন্ডেশন অব বাংলাদেশ (HCFB)',
      subheadline_en: 'Handwriting & Calligraphy Foundation of Bangladesh (HCFB)',
      description_bn:
        'শিক্ষার্থী, শিক্ষক ও শিল্পপ্রেমীদের মাঝে সুন্দর হাতের লেখা, ক্যালিগ্রাফি এবং নান্দনিক বর্ণশিল্পের চর্চা ছড়িয়ে দিতে আমরা কাজ করছি সারাদেশে।',
      description_en:
        'A non-profit educational foundation dedicated to nurturing beautiful handwriting, disciplined calligraphy, and creative learning across Bangladesh.',
      cta1_text_bn: 'এখনই এনরোল করুন',
      cta1_text_en: 'Register Now',
      cta1_url: '/register',
      cta2_text_bn: 'অনুশীলন ও হাব দেখুন',
      cta2_text_en: 'Explore Practice Hub',
      cta2_url: '/hub',
      hero_bg_image_url: '/src/assets/images/hero_calligraphy_desk_1795055013122.jpg',
      featured_competition_id: 0,
      phone_title_bn: '',
      phone_title_en: '',
      phone_thumbnail_url: '',
      phone_offer_bn: 'নিবন্ধন চলছে',
      phone_offer_en: 'Registration Open',
      phone_fee: '',
      phone_previous_fee: '',
      phone_discount: '',
      phone_rating: '',
      phone_review_count: '',
      phone_video_url: '',
      show_badge: true,
      show_phone_mockup: true,
      show_video_preview: true,
      show_enrollments: true,
      show_cta2: true,
    })
  );

  insertIgnoreSetting.run(
    'footer_settings',
    JSON.stringify({
      tagline_bn: 'সুন্দর হাতের লেখা ও ক্যালিগ্রাফি চর্চায় অলাভজনক জাতীয় শিক্ষামূলক ফাউন্ডেশন',
      tagline_en: 'Non-Profit National Educational Foundation for Handwriting & Calligraphy',
      intro_bn:
        'বাংলাদেশের শিক্ষার্থী, শিক্ষক ও শিল্পানুরাগীদের মাঝে পরিচ্ছন্ন হস্তলিপি, ঐতিহ্যবাহী ক্যালিগ্রাফি এবং সৃজনশীল দক্ষতা বিকাশে নিবেদিত একটি অলাভজনক শিক্ষামূলক ফাউন্ডেশন।',
      intro_en:
        'A non-profit educational foundation dedicated to nurturing neat handwriting, traditional calligraphy, and creative learning across Bangladesh.',
      registration_number: '',
      google_maps_url: '',
      youtube_url: '',
      instagram_url: '',
      verified_credentials_bn: '',
      verified_credentials_en: '',
      important_links: [
        { label_bn: 'আমাদের সম্পর্কে', label_en: 'About Foundation', url: '/about', enabled: true },
        { label_bn: 'প্রতিযোগিতা ও ইভেন্ট', label_en: 'Competitions & Events', url: '/competitions', enabled: true },
        { label_bn: 'অনলাইন রেজিস্ট্রেশন', label_en: 'Online Registration', url: '/register', enabled: true },
        { label_bn: 'শিক্ষার্থী ও অংশগ্রহণকারী পোর্টাল', label_en: 'Student Portal', url: '/portal', enabled: true },
        { label_bn: 'বিচারক ও শিক্ষক পোর্টাল', label_en: 'Teacher / Judge Portal', url: '/judge', enabled: true },
        { label_bn: 'লার্নিং ও সৃজনশীলতা হাব', label_en: 'Learning & Creativity Hub', url: '/hub', enabled: true },
        { label_bn: 'গ্যালারি ও শিল্পকর্ম', label_en: 'Art Gallery', url: '/gallery', enabled: true },
        { label_bn: 'নোটিশ বোর্ড', label_en: 'Notice Board', url: '/notices', enabled: true },
        { label_bn: 'সনদ যাচাই (QR)', label_en: 'Verify Certificate', url: '/verify', enabled: true },
        { label_bn: 'যোগাযোগ ও হেল্পলাইন', label_en: 'Contact & Helpline', url: '/contact', enabled: true },
      ],
      payment_methods: [
        { id: 'bkash', name: 'bKash', enabled: false },
        { id: 'nagad', name: 'Nagad', enabled: false },
        { id: 'rocket', name: 'Rocket', enabled: false },
        { id: 'upay', name: 'Upay', enabled: false },
        { id: 'cellfin', name: 'CellFin', enabled: false },
        { id: 'islami_bank', name: 'Islami Bank', enabled: false },
      ],
      payment_number: '',
      payment_account_type: '',
      payment_instructions_bn: '',
      payment_instructions_en: '',
    })
  );

  const compCount = (db.prepare('SELECT COUNT(*) as c FROM competitions').get() as { c: number }).c;
  if (compCount === 0) {
    const insertComp = db.prepare(`
      INSERT INTO competitions (
        slug, title_bn, title_en, description_bn, description_en, banner_url,
        registration_open_date, registration_deadline, competition_date,
        eligibility_bn, eligibility_en, rules_bn, rules_en,
        status, is_featured, results_published, is_sample
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const comp1 = insertComp.run(
      'national-handwriting-2026',
      'জাতীয় সুন্দর হাতের লেখা প্রতিযোগিতা ২০২৬ (নমুনা)',
      'National Beautiful Handwriting Competition 2026 (Sample)',
      'বাংলা ও ইংরেজি হাতের লেখায় শৃঙ্খলা, স্পষ্টতা ও নান্দনিকতা চর্চায় উৎসাহিত করতে আয়োজিত নমুনা প্রতিযোগিতা। অফিসিয়াল তারিখ ও বিস্তারিত নিয়মাবলী অ্যাডমিন প্যানেল থেকে হালনাগাদযোগ্য।',
      'A sample competition record demonstrating HCFB national handwriting registration, category segmentation, and evaluation workflows. Official dates and guidelines will be updated via the admin dashboard.',
      '/src/assets/images/comp_handwriting_banner_1795055013781.jpg',
      '2026-11-01',
      '2026-12-25',
      '2027-01-15',
      'প্রাথমিক, মাধ্যমিক ও উচ্চমাধ্যমিক পর্যায়ের সকল শিক্ষার্থী (শ্রেণি ১–১২) এবং সাধারণ অংশগ্রহণকারী।',
      'Open to primary, secondary, and higher-secondary students (Classes 1–12) as well as open-category enthusiasts.',
      '১. সাদা A4 কাগজে কালো বা নীল কালির ফাউন্টেন/জেল কলম ব্যবহার করতে হবে।\n২. বাংলা ও ইংরেজি নির্ধারিত অনুচ্ছেদ পরিচ্ছন্নভাবে লিখতে হবে।\n৩. অপ্রাপ্তবয়স্ক অংশগ্রহণকারীর ক্ষেত্রে অভিভাবকের সম্মতি আবশ্যক।',
      '1. Use black or navy fountain/gel ink on clean A4 archival or ruled paper.\n2. Transcribe the assigned Bangla or English passage without correction fluid.\n3. Guardian consent is mandatory for minor participants.',
      'published',
      1,
      1,
      1
    );

    const comp2 = insertComp.run(
      'bangladesh-calligraphy-showcase-2026',
      'জাতীয় ক্যালিগ্রাফি ও বর্ণশিল্প প্রতিযোগিতা ২০২৬ (নমুনা)',
      'National Calligraphy & Lettering Competition 2026 (Sample)',
      'ঐতিহ্যবাহী বাঁশের কলম, ব্রাশ ক্যালিগ্রাফি ও সমসাময়িক বাংলা ও আরবি বর্ণশিল্পের সৃজনশীল প্রকাশের জন্য নমুনা প্রতিযোগিতা।',
      'Sample competition showcasing traditional reed pen (qalam), brush lettering, and contemporary Bengali & Arabic calligraphic composition.',
      '/src/assets/images/comp_calligraphy_banner_1795055013518.jpg',
      '2026-11-10',
      '2027-01-20',
      '2027-02-05',
      'সকল বয়সের শিক্ষার্থী ও স্বাধীন ক্যালিগ্রাফি শিল্পী।',
      'Open to school/university students and independent calligraphy practitioners across Bangladesh.',
      '১. মূল শিল্পকর্মটি নিজ হাতে অঙ্কিত হতে হবে।\n২. কাগজের মাপ ন্যূনতম A3 বা ১৮×২৪ ইঞ্চি হতে হবে।\n৩. ডিজিটাল প্রিন্ট গ্রহণযোগ্য নয়।',
      '1. All submissions must be original hand-lettered ink/pigment works.\n2. Recommended archival paper size: A3 or 18×24 inches.\n3. Digital prints or traced reproductions are not permitted.',
      'published',
      0,
      0,
      1
    );

    const insertCat = db.prepare(
      'INSERT INTO competition_categories (competition_id, name_bn, name_en, age_or_class_range, max_score) VALUES (?, ?, ?, ?, ?)'
    );
    const cat1a = insertCat.run(comp1.lastInsertRowid, 'ক বিভাগ — প্রাথমিক (১ম–৫ম শ্রেণি)', 'Group A — Primary (Class 1–5)', 'Class 1–5', 100);
    const cat1b = insertCat.run(comp1.lastInsertRowid, 'খ বিভাগ — জুনিয়র (৬ষ্ঠ–৮ম শ্রেণি)', 'Group B — Junior (Class 6–8)', 'Class 6–8', 100);
    const cat1c = insertCat.run(comp1.lastInsertRowid, 'গ বিভাগ — মাধ্যমিক ও উচ্চমাধ্যমিক (৯ম–১২শ)', 'Group C — Senior (Class 9–12)', 'Class 9–12', 100);

    insertCat.run(comp2.lastInsertRowid, 'বাংলা ক্যালিগ্রাফি (শিক্ষার্থী)', 'Bangla Calligraphy (Students)', 'Age 10–22', 100);
    insertCat.run(comp2.lastInsertRowid, 'ঐতিহ্যবাহী ক্যালিগ্রাফি (উন্মুক্ত)', 'Traditional Calligraphy (Open)', 'Open', 100);

    const insertCrit = db.prepare(
      'INSERT INTO scoring_criteria (competition_id, name_bn, name_en, weight_percent, max_points) VALUES (?, ?, ?, ?, ?)'
    );
    for (const cid of [comp1.lastInsertRowid, comp2.lastInsertRowid]) {
      insertCrit.run(cid, 'বর্ণের গঠন ও সামঞ্জস্য', 'Letterform & Proportion', 30, 30);
      insertCrit.run(cid, 'পরিচ্ছন্নতা ও মার্জিন শৃঙ্খলা', 'Neatness & Margin Balance', 25, 25);
      insertCrit.run(cid, 'লেখার ছন্দ ও প্রবাহ', 'Stroke Rhythm & Flow', 25, 25);
      insertCrit.run(cid, 'সামগ্রিক নান্দনিক উপস্থাপনা', 'Overall Aesthetic Presentation', 20, 20);
    }

    // Seed 3 clearly labeled sample registrations so public tracking, portal, merit list, and QR certificate verification work out of the box
    const insertReg = db.prepare(`
      INSERT INTO registrations (
        registration_id, competition_id, category_id, name_bn, name_en,
        father_name, mother_name, school_name, class_level, mobile, alt_mobile, email,
        district, upazila, participant_type, additional_info,
        guardian_consent, privacy_consent, status, award_tier, total_score, rank_position, is_sample
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
    `);

    const r1 = insertReg.run(
      'HCFB-2026-00001',
      comp1.lastInsertRowid,
      cat1b.lastInsertRowid,
      'নমুনা শিক্ষার্থী ০১',
      'Sample Participant 01',
      'নমুনা অভিভাবক (পিতা)',
      'নমুনা অভিভাবক (মাতা)',
      'নমুনা মাধ্যমিক বিদ্যালয়, ঢাকা',
      'Class 7',
      '01700000001',
      '',
      '',
      'Dhaka',
      'Dhanmondi',
      'Student',
      'Sample record for system demonstration — replace with official entries.',
      1,
      1,
      'winner',
      '1st_place',
      94.5,
      1
    );

    insertReg.run(
      'HCFB-2026-00002',
      comp1.lastInsertRowid,
      cat1c.lastInsertRowid,
      'নমুনা শিক্ষার্থী ০২',
      'Sample Participant 02',
      'নমুনা অভিভাবক (পিতা)',
      'নমুনা অভিভাবক (মাতা)',
      'নমুনা সরকারি কলেজ, চট্টগ্রাম',
      'Class 10',
      '01700000002',
      '',
      '',
      'Chattogram',
      'Kotwali',
      'Student',
      'Sample record for system demonstration.',
      1,
      1,
      'winner',
      '2nd_place',
      91.0,
      2
    );

    insertReg.run(
      'HCFB-2026-00003',
      comp1.lastInsertRowid,
      cat1a.lastInsertRowid,
      'নমুনা শিক্ষার্থী ০৩',
      'Sample Participant 03',
      'নমুনা অভিভাবক (পিতা)',
      'নমুনা অভিভাবক (মাতা)',
      'নমুনা মডেল স্কুল, রাজশাহী',
      'Class 5',
      '01700000003',
      '',
      '',
      'Rajshahi',
      'Boalia',
      'Student',
      'Sample pending record awaiting jury evaluation.',
      1,
      1,
      'verified',
      'none',
      null,
      null
    );

    // Seed 1 sample certificate so QR verification (/verify?code=HCFB-CERT-2026-00001) can be tested immediately
    db.prepare(`
      INSERT INTO certificates (
        certificate_code, registration_pk, registration_id, participant_name_bn, participant_name_en,
        competition_title_bn, competition_title_en, category_name_bn, award_tier, issued_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      'HCFB-CERT-2026-00001',
      r1.lastInsertRowid,
      'HCFB-2026-00001',
      'নমুনা শিক্ষার্থী ০১',
      'Sample Participant 01',
      'জাতীয় সুন্দর হাতের লেখা প্রতিযোগিতা ২০২৬ (নমুনা)',
      'National Beautiful Handwriting Competition 2026 (Sample)',
      'খ বিভাগ — জুনিয়র (৬ষ্ঠ–৮ম শ্রেণি)',
      '1st_place',
      'HCFB Examination & Jury Board'
    );
  }

  const noticeCount = (db.prepare('SELECT COUNT(*) as c FROM notices').get() as { c: number }).c;
  if (noticeCount === 0) {
    const insertNotice = db.prepare(`
      INSERT INTO notices (title_bn, title_en, summary_bn, summary_en, content_bn, content_en, is_important, published_at, is_sample)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
    `);
    insertNotice.run(
      'অনলাইন নিবন্ধন ও নমুনা পোর্টাল চালু সংক্রান্ত বিজ্ঞপ্তি (নমুনা)',
      'Notice on Launching Online Registration & Verification Portal (Sample)',
      'হ্যান্ডরাইটিং এন্ড ক্যালিগ্রাফি ফাউন্ডেশন অব বাংলাদেশ (HCFB)-এর ডিজিটাল প্ল্যাটফর্মে অনলাইন নিবন্ধন, ট্র্যাকিং এবং সনদ যাচাই সেবা যুক্ত করা হয়েছে।',
      'The digital platform of HCFB now supports online competition registration, unique ID tracking, and QR-verified certificates.',
      'সকল শিক্ষার্থী, অভিভাবক ও শিক্ষকদের জানানো যাচ্ছে যে, HCFB-এর আসন্ন প্রতিযোগিতাগুলোর জন্য অনলাইন রেজিস্ট্রেশন প্রক্রিয়া চালু রয়েছে। নিবন্ধন শেষে প্রাপ্ত রেজিস্ট্রেশন নম্বর (যেমন: HCFB-2026-00001) সংরক্ষণ করুন। অফিসিয়াল সময়সূচি ও চূড়ান্ত নির্দেশনা এখানে প্রকাশ করা হবে।',
      'Students, parents, and educators are informed that online registration is active on the HCFB portal. Please preserve your unique Registration ID upon submission. Official competition schedules will be published here once confirmed.',
      1,
      '2026-11-15'
    );
    insertNotice.run(
      'সুন্দর হাতের লেখা অনুশীলন শিট প্রকাশনা (নমুনা)',
      'Release of Printable Handwriting Practice Sheets (Sample)',
      'লার্নিং ও সৃজনশীলতা হাব থেকে বিনামূল্যে বাংলা ও ইংরেজি হাতের লেখা অনুশীলন গাইডলাইন ডাউনলোড করা যাচ্ছে।',
      'Free printable Bangla and English penmanship grid sheets are available in the Learning & Creativity Hub.',
      'প্রাথমিক ও মাধ্যমিক পর্যায়ের শিক্ষার্থীদের হাতের লেখার ছন্দ ও মাত্রা ঠিক রাখার জন্য HCFB লার্নিং হাব বিভাগে অনুশীলন শিট সংযুক্ত করা হয়েছে। শিক্ষক ও অভিভাবকগণ এগুলো প্রিন্ট করে শিক্ষার্থীদের অনুশীলনে ব্যবহার করতে পারবেন।',
      'Printable practice grids covering letter height, slant consistency, and spacing are available under the Learning & Creativity Hub for classroom and home practice.',
      0,
      '2026-11-12'
    );
  }

  const galleryCount = (db.prepare('SELECT COUNT(*) as c FROM gallery_items').get() as { c: number }).c;
  if (galleryCount === 0) {
    const insertGal = db.prepare(`
      INSERT INTO gallery_items (title_bn, title_en, description_bn, description_en, category, image_url, event_name, is_featured_artwork, is_sample)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
    `);
    insertGal.run(
      'বাঁশের কলম ও হস্তনির্মিত কাগজে ক্যালিগ্রাফি (নমুনা)',
      'Traditional Reed Pen & Handmade Paper Study (Sample)',
      'নান্দনিক ক্যালিগ্রাফি চর্চার উপকরণ ও প্রদর্শনী নমুনা।',
      'Sample archival calligraphy composition featuring bamboo reed pens and cotton rag paper.',
      'Calligraphy',
      '/src/assets/images/hero_calligraphy_desk_1795055013122.jpg',
      'Sample Archive 2026',
      1
    );
    insertGal.run(
      'সৃজনশীল হাতের লেখা কর্মশালা দৃশ্য (নমুনা)',
      'Guided Handwriting Workshop Session (Sample)',
      'শিক্ষার্থীদের হাতে-কলমে বর্ণগঠন ও কলম ধরার কৌশল অনুশীলন।',
      'Illustrative sample photograph of a structured student handwriting workshop.',
      'Workshops & Training',
      '/src/assets/images/gallery_workshop_scene_1795055013544.jpg',
      'Workshop Series (Sample)',
      0
    );
    insertGal.run(
      'ফাউন্টেন পেন অনুশীলন শিট প্রদর্শনী (নমুনা)',
      'Ruled Fountain Pen Practice Specimen (Sample)',
      'পরিচ্ছন্ন লাইন, মার্জিন ও অক্ষর-সামঞ্জস্য অনুশীলন নমুনা।',
      'Sample ruled specimen highlighting steady slant and ink flow.',
      'Handwriting Competition',
      '/src/assets/images/comp_handwriting_banner_1795055013781.jpg',
      'National Handwriting (Sample)',
      0
    );
    insertGal.run(
      'মাসিক নির্বাচিত ক্যালিগ্রাফি শিল্পকর্ম (নমুনা)',
      'Curated Ink & Gold Border Composition (Sample)',
      'নেভি, পান্না সবুজ ও সোনালি কালিতে ফ্রেমবন্দী ক্যালিগ্রাফি নমুনা।',
      'Sample framed composition demonstrating navy, emerald, and gold ink layering.',
      'Calligraphy',
      '/src/assets/images/artwork_featured_month_1795055013431.jpg',
      'Monthly Exhibition (Sample)',
      1
    );
    insertGal.run(
      'প্রদর্শনী স্ক্রল ক্যালিগ্রাফি (নমুনা)',
      'Exhibition Scroll Calligraphy Display (Sample)',
      'হস্তনির্মিত ভেলুম কাগজে প্রদর্শনী-মানের ক্যালিগ্রাফি স্ক্রল।',
      'Sample exhibition scroll displayed on a wooden gallery easel.',
      'Educational Activities',
      '/src/assets/images/comp_calligraphy_banner_1795055013518.jpg',
      'Cultural Showcase (Sample)',
      0
    );
  }

  // Ensure the 14 Executive Committee Inauguration & Oath Ceremony photos exist in gallery_items
  const ceremonyPhotos: Array<{ url: string; bn: string; en: string }> = [
    { url: '/assets/aistudio/d06d1923-af1b-4a97-98cf-a6ff4279ab84_77d3dec6.jfif', bn: 'অভিষেক ও শপথ অনুষ্ঠানে বক্তব্য প্রদান', en: 'Keynote Address at the Inauguration & Oath Ceremony' },
    { url: '/assets/aistudio/71d5957e-bc97-41ac-b0ea-27ff7097d58c_328a840e.jfif', bn: 'কার্যকরী পরিষদের সম্মিলিত সভা', en: 'Executive Committee Joint Session at Dhaka University' },
    { url: '/assets/aistudio/9d831d73-aaa9-4f00-b8e0-9e7f1b90c680_e02cdff8.jfif', bn: 'নবগঠিত কমিটির ফুলেল শুভেচ্ছা বিনিময়', en: 'Floral Reception for Newly Inducted Committee Leaders' },
    { url: '/assets/aistudio/23f16514-4112-4c78-8b47-cdc82e83e658_92bc6c8a.jfif', bn: 'নেতৃবৃন্দের অভিনন্দন ও শুভেচ্ছা পর্ব', en: 'Committee Leaders Greeting & Bouquet Presentation' },
    { url: '/assets/aistudio/99aa5cb4-7658-402b-8a76-182a9b27c0a0_d5f9645e.jfif', bn: 'নবগঠিত কার্যকরী পরিষদের সনদ প্রদান', en: 'Executive Appointment Certificate Presentation' },
    { url: '/assets/aistudio/20a4e1dc-aebb-4c11-94ad-e24b75b8e283_08eedfef.jfif', bn: 'অভিষেক অনুষ্ঠানে ফুলেল সংবর্ধনা', en: 'Inauguration Ceremony Floral Reception' },
    { url: '/assets/aistudio/17ef6091-033c-4687-b025-9e00830ac13f_7d9d74d1.jfif', bn: 'কেন্দ্রীয় নেতৃবৃন্দের শুভেচ্ছা বিনিময়', en: 'Central Committee Welcome & Bouquet Exchange' },
    { url: '/assets/aistudio/eebed8ae-2413-480f-978b-120f874e0bee_5eafd922.jfif', bn: 'কার্যকরী সদস্যদের ফুলেল বরণ', en: 'Welcoming Executive Committee Members' },
    { url: '/assets/aistudio/49caa75c-b2a9-45ef-9116-da861c11b760_e72be33a.jfif', bn: 'শপথ অনুষ্ঠানের সম্মাননা ও শুভেচ্ছা', en: 'Oath Ceremony Greeting & Recognition' },
    { url: '/assets/aistudio/4d9c82be-4b1a-4279-933b-c1c7288701e2_66176432.jfif', bn: 'অতিথি ও সদস্যদের সংবর্ধনা মুহূর্ত', en: 'Guests & Committee Members Celebration Moment' },
    { url: '/assets/aistudio/74894efc-e286-4d4a-9468-1e82445d8d2d_b3c02445.jfif', bn: 'অভিষেক পর্বের শুভেচ্ছা বিনিময়', en: 'Committee Induction Bouquet Presentation' },
    { url: '/assets/aistudio/3d6b490a-c057-44b1-a23a-9d21e98a029a_4aa19bde.jfif', bn: 'কার্যকরী পরিষদের একত্রিত শুভেচ্ছা ছবি', en: 'Joint Celebration with Committee Leaders' },
    { url: '/assets/aistudio/3c21ac66-7454-4354-87c3-04a32c67e27d_5d0acb50.jfif', bn: 'সহ-সাংগঠনিক সম্পাদক সনদ হস্তান্তর', en: 'Co-Organizing Secretary Certificate Handover' },
    { url: '/assets/aistudio/cced5b96-18a0-41cc-b41a-b8df4c1ede39_8b9d8afc.jfif', bn: 'ঢাকা বিশ্ববিদ্যালয় অফিসার্স অ্যাসোসিয়েশনে দলীয় ছবি', en: 'Executive Team Group Photo at Dhaka University' },
  ];
  const existsGalStmt = db.prepare('SELECT id FROM gallery_items WHERE image_url = ? LIMIT 1');
  const insertRealGalStmt = db.prepare(`
    INSERT INTO gallery_items (title_bn, title_en, description_bn, description_en, category, image_url, event_name, is_featured_artwork, is_sample)
    VALUES (?, ?, ?, ?, 'Other Events', ?, 'অভিষেক ও শপথ অনুষ্ঠান ২০২৬', 0, 0)
  `);
  for (const cp of ceremonyPhotos) {
    if (!existsGalStmt.get(cp.url)) {
      insertRealGalStmt.run(
        cp.bn,
        cp.en,
        'নবগঠিত কার্যকরী পরিষদের অভিষেক ও শপথ অনুষ্ঠান — ২৯ আগস্ট ২০২৬, প্রশাসনিক ভবন, ঢাকা বিশ্ববিদ্যালয়।',
        'Executive Committee Inauguration & Oath Ceremony — 29 August 2026, Administrative Building, University of Dhaka.',
        cp.url
      );
    }
  }

  const hubCount = (db.prepare('SELECT COUNT(*) as c FROM hub_resources').get() as { c: number }).c;
  if (hubCount === 0) {
    const insertHub = db.prepare(`
      INSERT INTO hub_resources (type, title_bn, title_en, summary_bn, summary_en, content_bn, content_en, author_or_artist, image_url, download_template_key, is_sample)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
    `);
    insertHub.run(
      'article',
      'সুন্দর হাতের লেখার ৫টি মৌলিক শৃঙ্খলা (নমুনা প্রবন্ধ)',
      'Five Core Disciplines of Legible Handwriting (Sample Article)',
      'সঠিক ভঙ্গিমা, কলম ধরার কোণ, বর্ণের সমান উচ্চতা ও শব্দের মধ্যবর্তী দূরত্ব বজায় রাখার ব্যবহারিক নির্দেশনা।',
      'Practical principles covering writing posture, nib angle, consistent x-height, and balanced word spacing.',
      '১. বসার ভঙ্গি ও কাগজের কোণ: টেবিলের ওপর দুই হাত স্বাভাবিকভাবে রেখে কাগজকে প্রায় ১৫–২০ ডিগ্রি কোণে রাখলে হাতের কব্জি অনায়াসে নড়াচড়া করতে পারে।\n২. কলম ধরার নিয়ম: তর্জনী ও বৃদ্ধাঙ্গুলির মাঝে হালকা চাপে কলম ধরুন; অতিরিক্ত শক্ত করে ধরলে হাত দ্রুত ক্লান্ত হয়।\n৩. মাত্রা ও প্রবাহ: বাংলা বর্ণমালায় পূর্ণমাত্রা, অর্ধমাত্রা ও মাত্রাহীন বর্ণের পার্থক্য সচেতনভাবে বজায় রাখুন।\n৪. সমান দূরত্ব: প্রতিটি শব্দের মাঝে একটি ছোট বর্ণ সমপরিমাণ ফাঁকা জায়গা রাখলে পৃষ্ঠাটি পাঠযোগ্য ও দৃষ্টিনন্দন হয়।\n৫. নিয়মিত ১৫ মিনিট অনুশীলন: দ্রুত লেখার আগে ধীর ও নির্ভুল ছন্দ আয়ত্ত করুন।',
      '1. Posture & Paper Angle: Tilting your sheet 15–20 degrees allows natural wrist and forearm movement.\n2. Relaxed Grip: Hold the pen lightly between thumb and index finger to avoid tension.\n3. Matra & Structural Balance: Maintain clear distinction between full-matra, half-matra, and matra-less Bengali characters.\n4. Consistent Spacing: Leave roughly one character-width between words.\n5. Daily 15-Minute Rhythm: Build accuracy slowly before increasing speed.',
      'HCFB Editorial Desk (Sample)',
      '/src/assets/images/comp_handwriting_banner_1795055013781.jpg',
      '',
    );
    insertHub.run(
      'practice_sheet',
      'বাংলা ও ইংরেজি রুলড প্র্যাকটিস গ্রিড শিট (নমুনা PDF/প্রিন্ট)',
      'Bangla & English Ruled Penmanship Grid (Printable Sheet)',
      'মাত্রা ও লাইনের সামঞ্জস্য অনুশীলনের জন্য প্রিন্ট-উপযোগী গ্রিড শিট।',
      'Downloadable practice sheet with baseline, ascender, and slant guide lines.',
      'এই অনুশীলন শিটটি সরাসরি ব্রাউজার থেকে প্রিন্ট বা PDF হিসেবে সংরক্ষণ করে প্রাথমিক ও মাধ্যমিক শিক্ষার্থীদের হাতে-কলমে অনুশীলনের জন্য ব্যবহার করা যাবে।',
      'Print or save this guided sheet as PDF for daily penmanship drills.',
      'HCFB Curriculum Team (Sample)',
      '/src/assets/images/comp_handwriting_banner_1795055013781.jpg',
      'bangla-english-grid-v1',
    );
    insertHub.run(
      'calligraphy_guide',
      'বাঁশের কলম (কলম/নিব) প্রস্তুতি ও কালি ব্যবহারের প্রাথমিক পাঠ (নমুনা)',
      'Preparing Reed Pens & Natural Inks: Introductory Guide (Sample)',
      'ঐতিহ্যবাহী ক্যালিগ্রাফির জন্য কলম কাটার কোণ এবং কাগজ নির্বাচন নির্দেশিকা।',
      'Introduction to nib bevel angles, ink viscosity, and archival paper grain.',
      'ক্যালিগ্রাফি চর্চায় কলমের নিবের কাটা কোণ (সাধারণত ৩৫°–৪৫°) প্রতিটি স্ট্রোকের চিকন ও মোটা অংশ নির্ধারণ করে। তুলনামূলক মসৃণ কিন্তু হালকা টেক্সচারযুক্ত কাগজে কালি ছড়িয়ে না গিয়ে ধারালো প্রান্ত তৈরি হয়।',
      'A 35°–45° nib bevel produces crisp thick-and-thin stroke contrast on lightly sized archival paper.',
      'HCFB Calligraphy Guild (Sample)',
      '/src/assets/images/hero_calligraphy_desk_1795055013122.jpg',
      'qalam-angle-guide-v1',
    );
    insertHub.run(
      'artwork_of_month',
      'মাসের নির্বাচিত শিল্পকর্ম: "নবজাগরণের ছন্দ" (নমুনা প্রদর্শনী)',
      'Featured Artwork of the Month: Rhythm of Renewal (Sample)',
      'হস্তনির্মিত তুলা কাগজে নেভি, পান্না সবুজ ও সোনালি কালির সমন্বয়ে রচিত নমুনা ক্যালিগ্রাফি।',
      'Sample monthly curated calligraphy composition on handmade deckle-edge paper.',
      'অফিসিয়াল প্রদর্শনী শুরু হলে নির্বাচিত শিল্পীর নাম, মাধ্যম, কাগজের মাপ এবং বিচারকদের মন্তব্যসহ মাসিক শিল্পকর্ম এখানে প্রকাশ করা হবে।',
      'Once official exhibitions open, selected works with artist biography and curatorial notes will appear here.',
      'নমুনা সংকলন (Official Artist Pending)',
      '/src/assets/images/artwork_featured_month_1795055013431.jpg',
      '',
    );
    insertHub.run(
      'student_showcase',
      'শিক্ষার্থী সৃজনশীলতা প্রদর্শনী — নমুনা সংগ্রহ',
      'Student Creativity Showcase — Sample Curation',
      'প্রতিযোগিতা ও কর্মশালা থেকে প্রাপ্ত শিক্ষার্থীদের সেরা কাজ প্রদর্শনের জন্য নির্ধারিত স্থান।',
      'Dedicated showcase slot for verified student handwriting and calligraphy submissions.',
      'প্রতিযোগিতার মূল্যায়ন সম্পন্ন হলে দেশের বিভিন্ন জেলার শিক্ষার্থীদের নির্বাচিত হাতের লেখা ও ক্যালিগ্রাফি নমুনা এখানে প্রদর্শিত হবে।',
      'Verified student works from district and national rounds will be archived here.',
      'HCFB Student Archive (Sample)',
      '/src/assets/images/gallery_workshop_scene_1795055013544.jpg',
      '',
    );
  }

  const teamCount = (db.prepare('SELECT COUNT(*) as c FROM team_members').get() as { c: number }).c;
  if (teamCount === 0) {
    const insertTeam = db.prepare(`
      INSERT INTO team_members (name_bn, name_en, designation_bn, designation_en, bio_bn, bio_en, display_order, is_placeholder)
      VALUES (?, ?, ?, ?, ?, ?, ?, 1)
    `);
    insertTeam.run(
      'সভাপতি (তথ্য যুক্ত করা হবে)',
      'President (To Be Announced)',
      'প্রতিষ্ঠাতা ও সভাপতি — নমুনা পদবী',
      'Founder & President — Placeholder Designation',
      'ফাউন্ডেশনের আনুষ্ঠানিক কমিটি অনুমোদনের পর অফিসিয়াল নাম, ছবি ও পরিচিতি অ্যাডমিন প্যানেল থেকে যুক্ত করা হবে।',
      'Official profile, photograph, and biography will be updated via the admin panel once the executive committee is formally announced.',
      1
    );
    insertTeam.run(
      'সাধারণ সম্পাদক (তথ্য যুক্ত করা হবে)',
      'General Secretary (To Be Announced)',
      'সাধারণ সম্পাদক — নমুনা পদবী',
      'General Secretary — Placeholder Designation',
      'জাতীয় প্রতিযোগিতা, কর্মশালা ও সাংগঠনিক সমন্বয়ের দায়িত্বপ্রাপ্ত অফিসিয়াল তথ্য পরবর্তীতে যুক্ত হবে।',
      'Placeholder entry for General Secretary coordinating nationwide competitions and academic partnerships.',
      2
    );
    insertTeam.run(
      'প্রধান বিচারক ও প্রশিক্ষণ সমন্বয়ক (তথ্য যুক্ত করা হবে)',
      'Lead Jury & Training Coordinator (To Be Announced)',
      'ক্যালিগ্রাফি ও প্রশিক্ষণ সমন্বয়ক — নমুনা পদবী',
      'Calligraphy & Training Coordinator — Placeholder Designation',
      'মূল্যায়ন মানদণ্ড প্রণয়ন এবং শিক্ষক প্রশিক্ষণ কর্মসূচি পরিচালনার দায়িত্বপ্রাপ্ত।',
      'Placeholder entry overseeing scoring rubrics, workshops, and educator orientation.',
      3
    );
  }

  const testCount = (db.prepare('SELECT COUNT(*) as c FROM testimonials').get() as { c: number }).c;
  if (testCount === 0) {
    db.prepare(`
      INSERT INTO testimonials (author_name_bn, author_name_en, role_bn, role_en, organization, quote_bn, quote_en, is_verified, is_sample)
      VALUES (?, ?, ?, ?, ?, ?, ?, 1, 1)
    `).run(
      'নমুনা শিক্ষক মতামত (তথ্য যাচাই সাপেক্ষ)',
      'Sample Educator Feedback (Placeholder)',
      'বাংলা ভাষা ও হস্তলিপি প্রশিক্ষক (নমুনা)',
      'Educator & Penmanship Mentor (Sample)',
      'Sample Educational Institution',
      'নিয়মিত হাতের লেখার অনুশীলন শিক্ষার্থীদের মনোযোগ, লেখার পরিচ্ছন্নতা এবং আত্মবিশ্বাস বাড়াতে সরাসরি সাহায্য করে। (অফিসিয়াল যাচাইকৃত মতামত পরবর্তীতে যুক্ত করা হবে)',
      'Structured handwriting practice measurably strengthens student focus, legibility, and confidence. (Official verified educator testimonials will replace this sample.)'
    );
  }
}
