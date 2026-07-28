const { DatabaseSync } = require('node:sqlite');
const fs = require('fs');
const path = require('path');

// Two-database layout for PII segregation:
//   - Personal DB (main, resumes.db): everything user-generated — resumes,
//     profile, jobs, prep plans, next-role lists, AI audit log, app settings
//     (including the LLM API key), and question practice state. Never share.
//   - Shared DB (attached as `shared`, careeros-shared.db): reference content
//     only — the question bank. Contains zero user data; safe to share.
const DB_PATH = process.env.CV_BUILDER_DB_PATH || path.join(__dirname, '..', 'resumes.db');
const SHARED_DB_PATH = process.env.CV_BUILDER_SHARED_DB_PATH || path.join(__dirname, '..', 'careeros-shared.db');

fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
fs.mkdirSync(path.dirname(SHARED_DB_PATH), { recursive: true });

const db = new DatabaseSync(DB_PATH);
db.prepare('ATTACH DATABASE ? AS shared').run(SHARED_DB_PATH);

db.exec('PRAGMA journal_mode = WAL');
db.exec('PRAGMA shared.journal_mode = WAL');
db.exec('PRAGMA foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS resumes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL DEFAULT 'Untitled Resume',
    template TEXT DEFAULT 'classic',
    font_scale REAL DEFAULT 1,
    accent_color TEXT DEFAULT '',
    is_profile INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS personal_info (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    resume_id INTEGER NOT NULL UNIQUE,
    full_name TEXT DEFAULT '',
    email TEXT DEFAULT '',
    phone TEXT DEFAULT '',
    location TEXT DEFAULT '',
    website TEXT DEFAULT '',
    linkedin TEXT DEFAULT '',
    github TEXT DEFAULT '',
    summary TEXT DEFAULT '',
    tagline TEXT DEFAULT '',
    FOREIGN KEY (resume_id) REFERENCES resumes(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS experiences (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    resume_id INTEGER NOT NULL,
    company TEXT DEFAULT '',
    title TEXT DEFAULT '',
    location TEXT DEFAULT '',
    start_date TEXT DEFAULT '',
    end_date TEXT DEFAULT '',
    current_job INTEGER DEFAULT 0,
    bullets TEXT DEFAULT '[]',
    order_index INTEGER DEFAULT 0,
    FOREIGN KEY (resume_id) REFERENCES resumes(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS career_highlights (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    resume_id INTEGER NOT NULL,
    text TEXT DEFAULT '',
    order_index INTEGER DEFAULT 0,
    FOREIGN KEY (resume_id) REFERENCES resumes(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS education (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    resume_id INTEGER NOT NULL,
    school TEXT DEFAULT '',
    degree TEXT DEFAULT '',
    field TEXT DEFAULT '',
    location TEXT DEFAULT '',
    start_date TEXT DEFAULT '',
    end_date TEXT DEFAULT '',
    gpa TEXT DEFAULT '',
    details TEXT DEFAULT '',
    order_index INTEGER DEFAULT 0,
    FOREIGN KEY (resume_id) REFERENCES resumes(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS skills (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    resume_id INTEGER NOT NULL,
    category TEXT DEFAULT '',
    items TEXT DEFAULT '[]',
    order_index INTEGER DEFAULT 0,
    FOREIGN KEY (resume_id) REFERENCES resumes(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    resume_id INTEGER NOT NULL,
    name TEXT DEFAULT '',
    description TEXT DEFAULT '',
    url TEXT DEFAULT '',
    technologies TEXT DEFAULT '[]',
    start_date TEXT DEFAULT '',
    end_date TEXT DEFAULT '',
    order_index INTEGER DEFAULT 0,
    FOREIGN KEY (resume_id) REFERENCES resumes(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS certifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    resume_id INTEGER NOT NULL,
    name TEXT DEFAULT '',
    issuer TEXT DEFAULT '',
    issued_date TEXT DEFAULT '',
    expiry_date TEXT DEFAULT '',
    credential_id TEXT DEFAULT '',
    order_index INTEGER DEFAULT 0,
    FOREIGN KEY (resume_id) REFERENCES resumes(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS job_applications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company TEXT DEFAULT '',
    title TEXT DEFAULT '',
    location TEXT DEFAULT '',
    source TEXT DEFAULT '',
    job_url TEXT DEFAULT '',
    description TEXT DEFAULT '',
    status TEXT DEFAULT 'saved',
    applied_date TEXT DEFAULT '',
    closing_date TEXT DEFAULT '',
    contact_name TEXT DEFAULT '',
    contact_email TEXT DEFAULT '',
    notes TEXT DEFAULT '',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS job_application_resumes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    job_id INTEGER NOT NULL,
    resume_id INTEGER NOT NULL,
    shared_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    notes TEXT DEFAULT '',
    UNIQUE(job_id, resume_id),
    FOREIGN KEY (job_id) REFERENCES job_applications(id) ON DELETE CASCADE,
    FOREIGN KEY (resume_id) REFERENCES resumes(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS job_rounds (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    job_id INTEGER NOT NULL,
    round_name TEXT DEFAULT '',
    round_type TEXT DEFAULT 'technical',
    scheduled_at TEXT DEFAULT '',
    interviewer TEXT DEFAULT '',
    status TEXT DEFAULT 'planned',
    notes TEXT DEFAULT '',
    outcome TEXT DEFAULT '',
    order_index INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (job_id) REFERENCES job_applications(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS preparation_plans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    job_id INTEGER,
    scope TEXT DEFAULT 'general',
    title TEXT DEFAULT '',
    company TEXT DEFAULT '',
    focus_areas TEXT DEFAULT '',
    plan TEXT DEFAULT '',
    target_date TEXT DEFAULT '',
    status TEXT DEFAULT 'active',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (job_id) REFERENCES job_applications(id) ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS prep_plan_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    plan_id INTEGER NOT NULL,
    title TEXT DEFAULT '',
    category TEXT DEFAULT 'core',
    priority TEXT DEFAULT 'medium',
    status TEXT DEFAULT 'todo',
    due_date TEXT DEFAULT '',
    resource_url TEXT DEFAULT '',
    notes TEXT DEFAULT '',
    order_index INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (plan_id) REFERENCES preparation_plans(id) ON DELETE CASCADE
  );
`);

// ── Dedicated profile tables (singleton — no resume_id FK) ────────────────────

db.exec(`
  CREATE TABLE IF NOT EXISTS profile_personal (
    id INTEGER PRIMARY KEY DEFAULT 1 CHECK(id = 1),
    full_name TEXT DEFAULT '',
    email TEXT DEFAULT '',
    phone TEXT DEFAULT '',
    location TEXT DEFAULT '',
    website TEXT DEFAULT '',
    linkedin TEXT DEFAULT '',
    github TEXT DEFAULT '',
    summary TEXT DEFAULT '',
    tagline TEXT DEFAULT '',
    subtitle TEXT DEFAULT '',
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS profile_highlights (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    text TEXT DEFAULT '',
    order_index INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS profile_experiences (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company TEXT DEFAULT '',
    title TEXT DEFAULT '',
    location TEXT DEFAULT '',
    start_date TEXT DEFAULT '',
    end_date TEXT DEFAULT '',
    current_job INTEGER DEFAULT 0,
    bullets TEXT DEFAULT '[]',
    order_index INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS profile_education (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    school TEXT DEFAULT '',
    degree TEXT DEFAULT '',
    field TEXT DEFAULT '',
    location TEXT DEFAULT '',
    start_date TEXT DEFAULT '',
    end_date TEXT DEFAULT '',
    gpa TEXT DEFAULT '',
    details TEXT DEFAULT '',
    order_index INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS profile_skills (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category TEXT DEFAULT '',
    items TEXT DEFAULT '[]',
    order_index INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS profile_projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT DEFAULT '',
    description TEXT DEFAULT '',
    url TEXT DEFAULT '',
    technologies TEXT DEFAULT '[]',
    start_date TEXT DEFAULT '',
    end_date TEXT DEFAULT '',
    order_index INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS profile_certifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT DEFAULT '',
    issuer TEXT DEFAULT '',
    issued_date TEXT DEFAULT '',
    expiry_date TEXT DEFAULT '',
    credential_id TEXT DEFAULT '',
    order_index INTEGER DEFAULT 0
  );
`);

// Migrations for existing databases
try { db.exec("ALTER TABLE personal_info ADD COLUMN tagline TEXT DEFAULT ''"); } catch {}
try { db.exec("ALTER TABLE personal_info ADD COLUMN subtitle TEXT DEFAULT ''"); } catch {}
try { db.exec("ALTER TABLE resumes ADD COLUMN is_profile INTEGER DEFAULT 0"); } catch {}
try { db.exec("ALTER TABLE resumes ADD COLUMN font_scale REAL DEFAULT 1"); } catch {}
try { db.exec("ALTER TABLE resumes ADD COLUMN accent_color TEXT DEFAULT ''"); } catch {}
try { db.exec("ALTER TABLE resumes ADD COLUMN compact_mode INTEGER DEFAULT 0"); } catch {}
try { db.exec("ALTER TABLE certifications ADD COLUMN cert_group TEXT DEFAULT ''"); } catch {}
try { db.exec("ALTER TABLE profile_certifications ADD COLUMN cert_group TEXT DEFAULT ''"); } catch {}

// App-level settings (LLM provider config, etc.) — simple key/value store
db.exec(`
  CREATE TABLE IF NOT EXISTS app_settings (
    key TEXT PRIMARY KEY,
    value TEXT DEFAULT ''
  );
`);

// Next Role module — Lara Hogan's 4-lists framework: sort criteria into
// must-have / nice-to-have / don't-care buckets, plus one "optimizing for"
// statement (stored in app_settings). Criteria can be checked off per tracked
// job to compute fit.
db.exec(`
  CREATE TABLE IF NOT EXISTS next_role_criteria (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    bucket TEXT DEFAULT 'must',
    text TEXT DEFAULT '',
    order_index INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS job_criteria_checks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    job_id INTEGER NOT NULL,
    criteria_id INTEGER NOT NULL,
    met INTEGER DEFAULT 0,
    UNIQUE(job_id, criteria_id),
    FOREIGN KEY (job_id) REFERENCES job_applications(id) ON DELETE CASCADE,
    FOREIGN KEY (criteria_id) REFERENCES next_role_criteria(id) ON DELETE CASCADE
  );
`);

// Question bank — three-way split:
//   shared.question_bank  : seeded reference content (no user data, shareable)
//   main.custom_questions : questions the user adds (user-generated → personal)
//   main.question_progress: practice state + notes for both sources, keyed by
//                           a composite question_key ('shared:<n>' | 'custom:<id>')
db.exec(`
  CREATE TABLE IF NOT EXISTS shared.question_bank (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    number INTEGER UNIQUE,
    question TEXT DEFAULT '',
    archetype TEXT DEFAULT '',
    probe TEXT DEFAULT '',
    level TEXT DEFAULT '',
    companies TEXT DEFAULT ''
  );

  CREATE TABLE IF NOT EXISTS custom_questions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category TEXT DEFAULT 'General',
    question TEXT DEFAULT '',
    archetype TEXT DEFAULT '',
    level TEXT DEFAULT '',
    companies TEXT DEFAULT '',
    order_index INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);
try { db.exec("ALTER TABLE shared.question_bank ADD COLUMN category TEXT DEFAULT 'System Design'"); } catch {}

// question_progress: migrate the integer-keyed layout to composite text keys
try {
  const progCols = db.prepare('PRAGMA main.table_info(question_progress)').all().map(c => c.name);
  if (progCols.length && !progCols.includes('question_key')) {
    db.exec('ALTER TABLE question_progress RENAME TO question_progress_legacy');
  }
} catch {}
db.exec(`
  CREATE TABLE IF NOT EXISTS question_progress (
    question_key TEXT PRIMARY KEY,
    practiced INTEGER DEFAULT 0,
    practiced_at DATETIME,
    notes TEXT DEFAULT ''
  );
`);
try {
  const legacyProg = db.prepare("SELECT name FROM main.sqlite_master WHERE type='table' AND name='question_progress_legacy'").get();
  if (legacyProg) {
    db.exec(`
      INSERT OR REPLACE INTO question_progress (question_key, practiced, practiced_at, notes)
      SELECT 'shared:' || question_number, practiced, practiced_at, COALESCE(notes, '')
      FROM question_progress_legacy
    `);
    db.exec('DROP TABLE question_progress_legacy');
  }
} catch (e) { console.error('Question progress migration failed:', e.message); }

// Seed shared content on every boot, upserting by number: new curated questions
// are added and existing ones are re-synced (so archetype/level corrections
// propagate to existing installs). Practice state lives in question_progress
// keyed by the same number, so it is never touched. Seeded rows are read-only
// in the UI — user-authored questions live in main.custom_questions.
try {
  const { BANKS } = require('./questionBank');
  const upsert = db.prepare(`
    INSERT INTO shared.question_bank (number, question, level, companies, archetype, probe, category)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(number) DO UPDATE SET
      question = excluded.question, level = excluded.level, companies = excluded.companies,
      archetype = excluded.archetype, probe = excluded.probe, category = excluded.category
  `);
  for (const bank of BANKS) {
    for (const [number, question, level, companies, ai] of bank.questions) {
      upsert.run(number, question, level, companies, bank.archetypes[ai].name, bank.archetypes[ai].probe, bank.category);
    }
  }
} catch (e) { console.error('Question bank seed failed:', e.message); }

// Migrate from the original single-DB layout: question_bank (with practice
// columns) used to live in the personal database — move state over, then drop.
try {
  const legacy = db.prepare("SELECT name FROM main.sqlite_master WHERE type='table' AND name='question_bank'").get();
  if (legacy) {
    const cols = db.prepare('PRAGMA main.table_info(question_bank)').all().map(c => c.name);
    const hasNotes = cols.includes('notes');
    const rows = db.prepare(`SELECT number, practiced, practiced_at${hasNotes ? ', notes' : ''} FROM main.question_bank`).all();
    const upsert = db.prepare(`
      INSERT INTO question_progress (question_key, practiced, practiced_at, notes) VALUES (?, ?, ?, ?)
      ON CONFLICT(question_key) DO UPDATE SET practiced = excluded.practiced, practiced_at = excluded.practiced_at, notes = excluded.notes
    `);
    for (const r of rows) {
      if (r.practiced || (r.notes || '').trim()) upsert.run(`shared:${r.number}`, r.practiced || 0, r.practiced_at || null, r.notes || '');
    }
    db.exec('DROP TABLE main.question_bank');
  }
} catch (e) { console.error('Question bank migration failed:', e.message); }

// Audit trail for AI-proposed changes the user accepted
db.exec(`
  CREATE TABLE IF NOT EXISTS ai_changes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    resume_id INTEGER,
    workflow TEXT DEFAULT '',
    field TEXT DEFAULT '',
    before_text TEXT DEFAULT '',
    after_text TEXT DEFAULT '',
    accepted INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (resume_id) REFERENCES resumes(id) ON DELETE CASCADE
  );
`);
try { db.exec("ALTER TABLE experiences ADD COLUMN note TEXT DEFAULT ''"); } catch {}
try { db.exec("ALTER TABLE profile_experiences ADD COLUMN note TEXT DEFAULT ''"); } catch {}
try { db.exec("ALTER TABLE job_applications ADD COLUMN closing_date TEXT DEFAULT ''"); } catch {}
try { db.exec("ALTER TABLE job_applications ADD COLUMN source TEXT DEFAULT ''"); } catch {}

// One-time migration: copy existing is_profile resume data into dedicated profile tables
try {
  const hasData = db.prepare('SELECT COUNT(*) as cnt FROM profile_personal').get().cnt;
  const profileResume = db.prepare('SELECT * FROM resumes WHERE is_profile = 1').get();
  if (!hasData && profileResume) {
    const pid = profileResume.id;
    const p = db.prepare('SELECT * FROM personal_info WHERE resume_id = ?').get(pid);
    if (p) {
      db.prepare(`INSERT OR REPLACE INTO profile_personal
        (id, full_name, email, phone, location, website, linkedin, github, summary, tagline, subtitle)
        VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
        .run(p.full_name||'', p.email||'', p.phone||'', p.location||'', p.website||'', p.linkedin||'', p.github||'', p.summary||'', p.tagline||'', p.subtitle||'');
    }
    const hi = db.prepare('SELECT * FROM career_highlights WHERE resume_id = ? ORDER BY order_index').all(pid);
    hi.forEach((h, i) => db.prepare('INSERT INTO profile_highlights (text, order_index) VALUES (?, ?)').run(h.text, i));
    const ex = db.prepare('SELECT * FROM experiences WHERE resume_id = ? ORDER BY order_index').all(pid);
    ex.forEach((e, i) => db.prepare('INSERT INTO profile_experiences (company, title, location, start_date, end_date, current_job, bullets, order_index) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(e.company, e.title, e.location, e.start_date, e.end_date, e.current_job, e.bullets, i));
    const ed = db.prepare('SELECT * FROM education WHERE resume_id = ? ORDER BY order_index').all(pid);
    ed.forEach((e, i) => db.prepare('INSERT INTO profile_education (school, degree, field, location, start_date, end_date, gpa, details, order_index) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)').run(e.school, e.degree, e.field, e.location, e.start_date, e.end_date, e.gpa, e.details, i));
    const sk = db.prepare('SELECT * FROM skills WHERE resume_id = ? ORDER BY order_index').all(pid);
    sk.forEach((s, i) => db.prepare('INSERT INTO profile_skills (category, items, order_index) VALUES (?, ?, ?)').run(s.category, s.items, i));
    const pr = db.prepare('SELECT * FROM projects WHERE resume_id = ? ORDER BY order_index').all(pid);
    pr.forEach((pj, i) => db.prepare('INSERT INTO profile_projects (name, description, url, technologies, start_date, end_date, order_index) VALUES (?, ?, ?, ?, ?, ?, ?)').run(pj.name, pj.description, pj.url, pj.technologies, pj.start_date, pj.end_date, i));
    const ce = db.prepare('SELECT * FROM certifications WHERE resume_id = ? ORDER BY order_index').all(pid);
    ce.forEach((c, i) => db.prepare('INSERT INTO profile_certifications (name, issuer, issued_date, expiry_date, credential_id, order_index) VALUES (?, ?, ?, ?, ?, ?)').run(c.name, c.issuer, c.issued_date, c.expiry_date, c.credential_id, i));
  }
} catch (e) { /* already migrated or no profile yet */ }

module.exports = db;
