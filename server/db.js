const { DatabaseSync } = require('node:sqlite');
const fs = require('fs');
const path = require('path');

const DB_PATH = process.env.CV_BUILDER_DB_PATH || path.join(__dirname, '..', 'resumes.db');

fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

const db = new DatabaseSync(DB_PATH);

db.exec('PRAGMA journal_mode = WAL');
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
try { db.exec("ALTER TABLE certifications ADD COLUMN cert_group TEXT DEFAULT ''"); } catch {}
try { db.exec("ALTER TABLE profile_certifications ADD COLUMN cert_group TEXT DEFAULT ''"); } catch {}
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
