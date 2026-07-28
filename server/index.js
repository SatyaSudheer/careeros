const express = require('express');
const cors = require('cors');
const db = require('./db');
const { buildResumeHtml, generatePdf } = require('./pdf');
const { buildResumeText, buildResumeDocx } = require('./exporters');
const { aiConfigured, rewriteBullet } = require('./ai');
const llm = require('./llm');

const app = express();
app.use(cors());
app.use(express.json());

// ── Resumes ──────────────────────────────────────────────────────────────────

app.get('/api/resumes', (req, res) => {
  const resumes = db.prepare('SELECT * FROM resumes WHERE is_profile = 0 ORDER BY updated_at DESC').all();
  res.json(resumes);
});

app.post('/api/resumes', (req, res) => {
  const { title = 'Untitled Resume', template = 'classic' } = req.body;
  const result = db.prepare('INSERT INTO resumes (title, template) VALUES (?, ?)').run(title, template);
  const id = result.lastInsertRowid;
  db.prepare('INSERT INTO personal_info (resume_id) VALUES (?)').run(id);
  const resume = db.prepare('SELECT * FROM resumes WHERE id = ?').get(id);
  res.status(201).json(resume);
});

app.get('/api/resumes/:id', (req, res) => {
  const resume = db.prepare('SELECT * FROM resumes WHERE id = ?').get(req.params.id);
  if (!resume) return res.status(404).json({ error: 'Not found' });
  res.json(fullResume(req.params.id));
});

app.put('/api/resumes/:id', (req, res) => {
  const { title, template, font_scale, accent_color, compact_mode } = req.body;
  const parsedScale = Number(font_scale);
  const safeScale = Number.isFinite(parsedScale) ? Math.min(1.18, Math.max(0.88, parsedScale)) : null;
  const safeAccent = typeof accent_color === 'string' ? accent_color : null;
  const safeCompact = compact_mode === undefined ? null : (compact_mode ? 1 : 0);
  db.prepare(`
    UPDATE resumes SET
      title = COALESCE(?, title),
      template = COALESCE(?, template),
      font_scale = COALESCE(?, font_scale),
      accent_color = COALESCE(?, accent_color),
      compact_mode = COALESCE(?, compact_mode),
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(title ?? null, template ?? null, safeScale, safeAccent, safeCompact, req.params.id);
  res.json(db.prepare('SELECT * FROM resumes WHERE id = ?').get(req.params.id));
});

app.delete('/api/resumes/:id', (req, res) => {
  db.prepare('DELETE FROM resumes WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

app.post('/api/resumes/:id/clone', (req, res) => {
  const src = db.prepare('SELECT * FROM resumes WHERE id = ?').get(req.params.id);
  if (!src) return res.status(404).json({ error: 'Not found' });

  const full = fullResume(req.params.id);
  const newId = db.prepare('INSERT INTO resumes (title, template, font_scale, accent_color, compact_mode) VALUES (?,?,?,?,?)')
    .run(`Copy of ${src.title}`, src.template, src.font_scale, src.accent_color, src.compact_mode ?? 0).lastInsertRowid;

  const p = full.personal;
  db.prepare(`INSERT INTO personal_info (resume_id,full_name,email,phone,location,website,linkedin,github,summary,tagline,subtitle)
    VALUES (?,?,?,?,?,?,?,?,?,?,?)`)
    .run(newId, p.full_name||'', p.email||'', p.phone||'', p.location||'', p.website||'', p.linkedin||'', p.github||'', p.summary||'', p.tagline||'', p.subtitle||'');

  full.highlights.forEach((h, i) =>
    db.prepare('INSERT INTO career_highlights (resume_id,text,order_index) VALUES (?,?,?)').run(newId, h.text, i));
  full.experiences.forEach((e, i) =>
    db.prepare('INSERT INTO experiences (resume_id,company,title,location,start_date,end_date,current_job,bullets,note,order_index) VALUES (?,?,?,?,?,?,?,?,?,?)')
      .run(newId, e.company, e.title, e.location, e.start_date, e.end_date, e.current_job ? 1 : 0, JSON.stringify(e.bullets), e.note||'', i));
  full.education.forEach((e, i) =>
    db.prepare('INSERT INTO education (resume_id,school,degree,field,location,start_date,end_date,gpa,details,order_index) VALUES (?,?,?,?,?,?,?,?,?,?)')
      .run(newId, e.school, e.degree, e.field, e.location, e.start_date, e.end_date, e.gpa, e.details, i));
  full.skills.forEach((s, i) =>
    db.prepare('INSERT INTO skills (resume_id,category,items,order_index) VALUES (?,?,?,?)').run(newId, s.category, JSON.stringify(s.items), i));
  full.projects.forEach((p, i) =>
    db.prepare('INSERT INTO projects (resume_id,name,description,url,technologies,start_date,end_date,order_index) VALUES (?,?,?,?,?,?,?,?)')
      .run(newId, p.name, p.description, p.url, JSON.stringify(p.technologies), p.start_date, p.end_date, i));
  full.certifications.forEach((c, i) =>
    db.prepare('INSERT INTO certifications (resume_id,name,issuer,issued_date,expiry_date,credential_id,cert_group,order_index) VALUES (?,?,?,?,?,?,?,?)')
      .run(newId, c.name, c.issuer, c.issued_date, c.expiry_date, c.credential_id, c.cert_group||'', i));

  res.status(201).json(db.prepare('SELECT * FROM resumes WHERE id = ?').get(newId));
});

// ── Personal Info ─────────────────────────────────────────────────────────────

app.put('/api/resumes/:id/personal', (req, res) => {
  const { full_name, email, phone, location, website, linkedin, github, summary, tagline, subtitle } = req.body;
  db.prepare(`
    INSERT INTO personal_info (resume_id, full_name, email, phone, location, website, linkedin, github, summary, tagline, subtitle)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(resume_id) DO UPDATE SET
      full_name = excluded.full_name,
      email = excluded.email,
      phone = excluded.phone,
      location = excluded.location,
      website = excluded.website,
      linkedin = excluded.linkedin,
      github = excluded.github,
      summary = excluded.summary,
      tagline = excluded.tagline,
      subtitle = excluded.subtitle
  `).run(req.params.id, full_name, email, phone, location, website, linkedin, github, summary, tagline ?? '', subtitle ?? '');
  db.prepare('UPDATE resumes SET updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// ── Career Highlights ────────────────────────────────────────────────────────

app.post('/api/resumes/:id/highlights', (req, res) => {
  const { text = '' } = req.body;
  const maxOrder = db.prepare('SELECT COALESCE(MAX(order_index), -1) as m FROM career_highlights WHERE resume_id = ?').get(req.params.id).m;
  const result = db.prepare('INSERT INTO career_highlights (resume_id, text, order_index) VALUES (?, ?, ?)')
    .run(req.params.id, text, maxOrder + 1);
  db.prepare('UPDATE resumes SET updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(req.params.id);
  res.status(201).json(db.prepare('SELECT * FROM career_highlights WHERE id = ?').get(result.lastInsertRowid));
});

app.put('/api/resumes/:id/highlights/:highlightId', (req, res) => {
  const { text = '' } = req.body;
  db.prepare('UPDATE career_highlights SET text=? WHERE id=? AND resume_id=?')
    .run(text, req.params.highlightId, req.params.id);
  db.prepare('UPDATE resumes SET updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

app.delete('/api/resumes/:id/highlights/:highlightId', (req, res) => {
  db.prepare('DELETE FROM career_highlights WHERE id = ? AND resume_id = ?').run(req.params.highlightId, req.params.id);
  db.prepare('UPDATE resumes SET updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// ── Experiences ───────────────────────────────────────────────────────────────

app.post('/api/resumes/:id/experiences', (req, res) => {
  const { company = '', title = '', location = '', start_date = '', end_date = '', current_job = false, bullets = [], note = '' } = req.body;
  const maxOrder = db.prepare('SELECT COALESCE(MAX(order_index), -1) as m FROM experiences WHERE resume_id = ?').get(req.params.id).m;
  const result = db.prepare('INSERT INTO experiences (resume_id, company, title, location, start_date, end_date, current_job, bullets, note, order_index) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
    .run(req.params.id, company, title, location, start_date, end_date, current_job ? 1 : 0, JSON.stringify(bullets), note, maxOrder + 1);
  db.prepare('UPDATE resumes SET updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(req.params.id);
  const exp = db.prepare('SELECT * FROM experiences WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json({ ...exp, bullets: JSON.parse(exp.bullets), current_job: Boolean(exp.current_job) });
});

app.put('/api/resumes/:id/experiences/:expId', (req, res) => {
  const { company, title, location, start_date, end_date, current_job, bullets, note = '' } = req.body;
  db.prepare('UPDATE experiences SET company=?, title=?, location=?, start_date=?, end_date=?, current_job=?, bullets=?, note=? WHERE id=? AND resume_id=?')
    .run(company, title, location, start_date, end_date, current_job ? 1 : 0, JSON.stringify(bullets), note, req.params.expId, req.params.id);
  db.prepare('UPDATE resumes SET updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

app.delete('/api/resumes/:id/experiences/:expId', (req, res) => {
  db.prepare('DELETE FROM experiences WHERE id = ? AND resume_id = ?').run(req.params.expId, req.params.id);
  db.prepare('UPDATE resumes SET updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// ── Education ─────────────────────────────────────────────────────────────────

app.post('/api/resumes/:id/education', (req, res) => {
  const { school = '', degree = '', field = '', location = '', start_date = '', end_date = '', gpa = '', details = '' } = req.body;
  const maxOrder = db.prepare('SELECT COALESCE(MAX(order_index), -1) as m FROM education WHERE resume_id = ?').get(req.params.id).m;
  const result = db.prepare('INSERT INTO education (resume_id, school, degree, field, location, start_date, end_date, gpa, details, order_index) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
    .run(req.params.id, school, degree, field, location, start_date, end_date, gpa, details, maxOrder + 1);
  db.prepare('UPDATE resumes SET updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(req.params.id);
  res.status(201).json(db.prepare('SELECT * FROM education WHERE id = ?').get(result.lastInsertRowid));
});

app.put('/api/resumes/:id/education/:eduId', (req, res) => {
  const { school, degree, field, location, start_date, end_date, gpa, details } = req.body;
  db.prepare('UPDATE education SET school=?, degree=?, field=?, location=?, start_date=?, end_date=?, gpa=?, details=? WHERE id=? AND resume_id=?')
    .run(school, degree, field, location, start_date, end_date, gpa, details, req.params.eduId, req.params.id);
  db.prepare('UPDATE resumes SET updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

app.delete('/api/resumes/:id/education/:eduId', (req, res) => {
  db.prepare('DELETE FROM education WHERE id = ? AND resume_id = ?').run(req.params.eduId, req.params.id);
  db.prepare('UPDATE resumes SET updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// ── Skills ────────────────────────────────────────────────────────────────────

app.post('/api/resumes/:id/skills', (req, res) => {
  const { category = '', items = [] } = req.body;
  const maxOrder = db.prepare('SELECT COALESCE(MAX(order_index), -1) as m FROM skills WHERE resume_id = ?').get(req.params.id).m;
  const result = db.prepare('INSERT INTO skills (resume_id, category, items, order_index) VALUES (?, ?, ?, ?)')
    .run(req.params.id, category, JSON.stringify(items), maxOrder + 1);
  db.prepare('UPDATE resumes SET updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(req.params.id);
  const s = db.prepare('SELECT * FROM skills WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json({ ...s, items: JSON.parse(s.items) });
});

app.put('/api/resumes/:id/skills/reorder', (req, res) => {
  const { ids } = req.body; // array of skill ids in desired order
  if (!Array.isArray(ids)) return res.status(400).json({ error: 'ids must be an array' });
  const stmt = db.prepare('UPDATE skills SET order_index=? WHERE id=? AND resume_id=?');
  ids.forEach((skillId, index) => stmt.run(index, skillId, req.params.id));
  db.prepare('UPDATE resumes SET updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

app.put('/api/resumes/:id/skills/:skillId', (req, res) => {
  const { category, items } = req.body;
  db.prepare('UPDATE skills SET category=?, items=? WHERE id=? AND resume_id=?')
    .run(category, JSON.stringify(items), req.params.skillId, req.params.id);
  db.prepare('UPDATE resumes SET updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

app.delete('/api/resumes/:id/skills/:skillId', (req, res) => {
  db.prepare('DELETE FROM skills WHERE id = ? AND resume_id = ?').run(req.params.skillId, req.params.id);
  db.prepare('UPDATE resumes SET updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// ── Projects ──────────────────────────────────────────────────────────────────

app.post('/api/resumes/:id/projects', (req, res) => {
  const { name = '', description = '', url = '', technologies = [], start_date = '', end_date = '' } = req.body;
  const maxOrder = db.prepare('SELECT COALESCE(MAX(order_index), -1) as m FROM projects WHERE resume_id = ?').get(req.params.id).m;
  const result = db.prepare('INSERT INTO projects (resume_id, name, description, url, technologies, start_date, end_date, order_index) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
    .run(req.params.id, name, description, url, JSON.stringify(technologies), start_date, end_date, maxOrder + 1);
  db.prepare('UPDATE resumes SET updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(req.params.id);
  const p = db.prepare('SELECT * FROM projects WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json({ ...p, technologies: JSON.parse(p.technologies) });
});

app.put('/api/resumes/:id/projects/reorder', (req, res) => {
  const { ids } = req.body;
  if (!Array.isArray(ids)) return res.status(400).json({ error: 'ids must be an array' });
  const stmt = db.prepare('UPDATE projects SET order_index=? WHERE id=? AND resume_id=?');
  ids.forEach((projId, index) => stmt.run(index, projId, req.params.id));
  db.prepare('UPDATE resumes SET updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

app.put('/api/resumes/:id/projects/:projId', (req, res) => {
  const { name, description, url, technologies, start_date, end_date } = req.body;
  db.prepare('UPDATE projects SET name=?, description=?, url=?, technologies=?, start_date=?, end_date=? WHERE id=? AND resume_id=?')
    .run(name, description, url, JSON.stringify(technologies), start_date, end_date, req.params.projId, req.params.id);
  db.prepare('UPDATE resumes SET updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

app.delete('/api/resumes/:id/projects/:projId', (req, res) => {
  db.prepare('DELETE FROM projects WHERE id = ? AND resume_id = ?').run(req.params.projId, req.params.id);
  db.prepare('UPDATE resumes SET updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// ── Certifications ────────────────────────────────────────────────────────────

app.post('/api/resumes/:id/certifications', (req, res) => {
  const { name = '', issuer = '', issued_date = '', expiry_date = '', credential_id = '', cert_group = '' } = req.body;
  const maxOrder = db.prepare('SELECT COALESCE(MAX(order_index), -1) as m FROM certifications WHERE resume_id = ?').get(req.params.id).m;
  const result = db.prepare('INSERT INTO certifications (resume_id, name, issuer, issued_date, expiry_date, credential_id, cert_group, order_index) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
    .run(req.params.id, name, issuer, issued_date, expiry_date, credential_id, cert_group, maxOrder + 1);
  db.prepare('UPDATE resumes SET updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(req.params.id);
  res.status(201).json(db.prepare('SELECT * FROM certifications WHERE id = ?').get(result.lastInsertRowid));
});

app.put('/api/resumes/:id/certifications/:certId', (req, res) => {
  const { name, issuer, issued_date, expiry_date, credential_id, cert_group = '' } = req.body;
  db.prepare('UPDATE certifications SET name=?, issuer=?, issued_date=?, expiry_date=?, credential_id=?, cert_group=? WHERE id=? AND resume_id=?')
    .run(name, issuer, issued_date, expiry_date, credential_id, cert_group, req.params.certId, req.params.id);
  db.prepare('UPDATE resumes SET updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

app.delete('/api/resumes/:id/certifications/:certId', (req, res) => {
  db.prepare('DELETE FROM certifications WHERE id = ? AND resume_id = ?').run(req.params.certId, req.params.id);
  db.prepare('UPDATE resumes SET updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// ── Profile (dedicated tables) ────────────────────────────────────────────────

function fullProfileData() {
  const personal = db.prepare('SELECT * FROM profile_personal WHERE id = 1').get() || {};
  const highlights = db.prepare('SELECT * FROM profile_highlights ORDER BY order_index').all();
  const experiences = db.prepare('SELECT * FROM profile_experiences ORDER BY order_index').all()
    .map(e => ({ ...e, bullets: JSON.parse(e.bullets || '[]'), current_job: Boolean(e.current_job) }));
  const education = db.prepare('SELECT * FROM profile_education ORDER BY order_index').all();
  const skills = db.prepare('SELECT * FROM profile_skills ORDER BY order_index').all()
    .map(s => ({ ...s, items: JSON.parse(s.items || '[]') }));
  const projects = db.prepare('SELECT * FROM profile_projects ORDER BY order_index').all()
    .map(p => ({ ...p, technologies: JSON.parse(p.technologies || '[]') }));
  const certifications = db.prepare('SELECT * FROM profile_certifications ORDER BY order_index').all();
  return { personal, highlights, experiences, education, skills, projects, certifications };
}

// ── Resumes (internal helper) ─────────────────────────────────────────────────

function fullResume(id) {
  const resume      = db.prepare('SELECT * FROM resumes WHERE id = ?').get(id);
  const personal    = db.prepare('SELECT * FROM personal_info WHERE resume_id = ?').get(id);
  const experiences = db.prepare('SELECT * FROM experiences WHERE resume_id = ? ORDER BY order_index').all(id);
  const highlights  = db.prepare('SELECT * FROM career_highlights WHERE resume_id = ? ORDER BY order_index').all(id);
  const education   = db.prepare('SELECT * FROM education WHERE resume_id = ? ORDER BY order_index').all(id);
  const skills           = db.prepare('SELECT * FROM skills WHERE resume_id = ? ORDER BY order_index').all(id);
  const projects         = db.prepare('SELECT * FROM projects WHERE resume_id = ? ORDER BY order_index').all(id);
  const certifications   = db.prepare('SELECT * FROM certifications WHERE resume_id = ? ORDER BY order_index').all(id);
  return {
    ...resume,
    personal: personal || {},
    highlights,
    experiences: experiences.map(e => ({ ...e, bullets: JSON.parse(e.bullets || '[]'), current_job: Boolean(e.current_job) })),
    education,
    skills: skills.map(s => ({ ...s, items: JSON.parse(s.items || '[]') })),
    projects: projects.map(p => ({ ...p, technologies: JSON.parse(p.technologies || '[]') })),
    certifications,
  };
}

function jobWithResumes(job) {
  const resumes = db.prepare(`
    SELECT r.id, r.title, r.template, jr.shared_at, jr.notes
    FROM job_application_resumes jr
    JOIN resumes r ON r.id = jr.resume_id
    WHERE jr.job_id = ?
    ORDER BY jr.shared_at DESC
  `).all(job.id);
  const rounds = db.prepare('SELECT * FROM job_rounds WHERE job_id = ? ORDER BY order_index, id').all(job.id);
  const preparation_plans = db.prepare('SELECT * FROM preparation_plans WHERE job_id = ? ORDER BY updated_at DESC, id DESC').all(job.id);
  return { ...job, resumes, rounds, preparation_plans };
}

function jobMetrics() {
  const statusRows = db.prepare('SELECT status, COUNT(*) as count FROM job_applications GROUP BY status').all();
  const byStatus = statusRows.reduce((acc, row) => {
    acc[row.status || 'saved'] = row.count;
    return acc;
  }, {});
  const resumeCount = db.prepare('SELECT COUNT(*) as count FROM resumes WHERE is_profile = 0').get().count;
  const jobCount = db.prepare('SELECT COUNT(*) as count FROM job_applications').get().count;
  const resumeShareCount = db.prepare('SELECT COUNT(*) as count FROM job_application_resumes').get().count;
  const roundCount = db.prepare('SELECT COUNT(*) as count FROM job_rounds').get().count;
  const prepPlanCount = db.prepare('SELECT COUNT(*) as count FROM preparation_plans').get().count;
  const prepItemStats = db.prepare('SELECT COUNT(*) as total, SUM(CASE WHEN status = \'done\' THEN 1 ELSE 0 END) as done FROM prep_plan_items').get();
  return {
    resumes: resumeCount,
    jobs: jobCount,
    resumeShares: resumeShareCount,
    rounds: roundCount,
    prepPlans: prepPlanCount,
    prepItemsTotal: prepItemStats.total || 0,
    prepItemsDone: prepItemStats.done || 0,
    saved: byStatus.saved || 0,
    applied: byStatus.applied || 0,
    screening: byStatus.screening || 0,
    interview: byStatus.interview || 0,
    offer: byStatus.offer || 0,
    rejected: byStatus.rejected || 0,
    closed: byStatus.closed || 0,
    active: (byStatus.saved || 0) + (byStatus.applied || 0) + (byStatus.screening || 0) + (byStatus.interview || 0),
    byStatus,
  };
}

function prepPlanWithItems(plan) {
  const items = db.prepare('SELECT * FROM prep_plan_items WHERE plan_id = ? ORDER BY order_index, id').all(plan.id);
  const job = plan.job_id
    ? db.prepare('SELECT id, company, title, job_url FROM job_applications WHERE id = ?').get(plan.job_id)
    : null;
  return { ...plan, items, job: job || null };
}

// ── Metrics ──────────────────────────────────────────────────────────────────

app.get('/api/metrics', (req, res) => {
  res.json(jobMetrics());
});

// ── Job Tracker ──────────────────────────────────────────────────────────────

app.get('/api/jobs', (req, res) => {
  const jobs = db.prepare('SELECT * FROM job_applications ORDER BY updated_at DESC, created_at DESC').all();
  res.json(jobs.map(jobWithResumes));
});

app.post('/api/jobs', (req, res) => {
  const {
    company = '',
    title = '',
    location = '',
    source = '',
    job_url = '',
    description = '',
    status = 'saved',
    applied_date = '',
    closing_date = '',
    contact_name = '',
    contact_email = '',
    notes = '',
  } = req.body;
  const result = db.prepare(`
    INSERT INTO job_applications
      (company, title, location, source, job_url, description, status, applied_date, closing_date, contact_name, contact_email, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(company, title, location, source, job_url, description, status, applied_date, closing_date, contact_name, contact_email, notes);
  const job = db.prepare('SELECT * FROM job_applications WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(jobWithResumes(job));
});

app.get('/api/jobs/:id', (req, res) => {
  const job = db.prepare('SELECT * FROM job_applications WHERE id = ?').get(req.params.id);
  if (!job) return res.status(404).json({ error: 'Not found' });
  res.json(jobWithResumes(job));
});

app.put('/api/jobs/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM job_applications WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Not found' });
  const next = { ...existing, ...req.body };
  db.prepare(`
    UPDATE job_applications SET
      company = ?,
      title = ?,
      location = ?,
      source = ?,
      job_url = ?,
      description = ?,
      status = ?,
      applied_date = ?,
      closing_date = ?,
      contact_name = ?,
      contact_email = ?,
      notes = ?,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(
    next.company || '',
    next.title || '',
    next.location || '',
    next.source || '',
    next.job_url || '',
    next.description || '',
    next.status || 'saved',
    next.applied_date || '',
    next.closing_date || '',
    next.contact_name || '',
    next.contact_email || '',
    next.notes || '',
    req.params.id,
  );
  const job = db.prepare('SELECT * FROM job_applications WHERE id = ?').get(req.params.id);
  res.json(jobWithResumes(job));
});

app.delete('/api/jobs/:id', (req, res) => {
  db.prepare('DELETE FROM job_applications WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

app.post('/api/jobs/:id/resumes', (req, res) => {
  const { resume_id, notes = '' } = req.body;
  const job = db.prepare('SELECT * FROM job_applications WHERE id = ?').get(req.params.id);
  const resume = db.prepare('SELECT * FROM resumes WHERE id = ? AND is_profile = 0').get(resume_id);
  if (!job || !resume) return res.status(404).json({ error: 'Job or resume not found' });
  db.prepare(`
    INSERT INTO job_application_resumes (job_id, resume_id, notes)
    VALUES (?, ?, ?)
    ON CONFLICT(job_id, resume_id) DO UPDATE SET
      notes = excluded.notes,
      shared_at = CURRENT_TIMESTAMP
  `).run(req.params.id, resume_id, notes);
  db.prepare('UPDATE job_applications SET updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(req.params.id);
  res.status(201).json(jobWithResumes(db.prepare('SELECT * FROM job_applications WHERE id = ?').get(req.params.id)));
});

app.delete('/api/jobs/:id/resumes/:resumeId', (req, res) => {
  db.prepare('DELETE FROM job_application_resumes WHERE job_id = ? AND resume_id = ?')
    .run(req.params.id, req.params.resumeId);
  db.prepare('UPDATE job_applications SET updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// ── JD match scores ───────────────────────────────────────────────────────────
// shared/jdMatch.js is ESM (also imported by the client); CJS must dynamic-import it.
let jdMatchModule;
function loadJdMatch() {
  jdMatchModule ||= import('../shared/jdMatch.js');
  return jdMatchModule;
}

app.get('/api/jobs/:id/match', async (req, res) => {
  try {
    const job = db.prepare('SELECT * FROM job_applications WHERE id = ?').get(req.params.id);
    if (!job) return res.status(404).json({ error: 'Not found' });
    const jd = String(job.description || '').trim();
    if (!jd) return res.json({ keywords: [], matches: [] });

    const { extractKeywords, matchResume } = await loadJdMatch();
    const keywords = extractKeywords(jd).map(k => k.label);
    const linked = new Set(
      db.prepare('SELECT resume_id FROM job_application_resumes WHERE job_id = ?')
        .all(req.params.id).map(r => r.resume_id)
    );
    const matches = db.prepare('SELECT id, title FROM resumes WHERE is_profile = 0').all()
      .map(r => {
        const m = matchResume(jd, fullResume(r.id));
        return {
          resume_id: r.id,
          title: r.title,
          linked: linked.has(r.id),
          coverage: m ? m.coverage : 0,
          matched: m ? m.matched.map(k => k.label) : [],
          missing: m ? m.missing.map(k => k.label) : [],
        };
      })
      .sort((a, b) => b.coverage - a.coverage);
    res.json({ keywords, matches });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/jobs/:id/rounds', (req, res) => {
  const job = db.prepare('SELECT * FROM job_applications WHERE id = ?').get(req.params.id);
  if (!job) return res.status(404).json({ error: 'Job not found' });
  const {
    round_name = '',
    round_type = 'technical',
    scheduled_at = '',
    interviewer = '',
    status = 'planned',
    notes = '',
    outcome = '',
  } = req.body;
  const maxOrder = db.prepare('SELECT COALESCE(MAX(order_index), -1) as m FROM job_rounds WHERE job_id = ?').get(req.params.id).m;
  const result = db.prepare(`
    INSERT INTO job_rounds (job_id, round_name, round_type, scheduled_at, interviewer, status, notes, outcome, order_index)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(req.params.id, round_name, round_type, scheduled_at, interviewer, status, notes, outcome, maxOrder + 1);
  db.prepare('UPDATE job_applications SET updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(req.params.id);
  res.status(201).json(db.prepare('SELECT * FROM job_rounds WHERE id = ?').get(result.lastInsertRowid));
});

app.put('/api/jobs/:id/rounds/:roundId', (req, res) => {
  const existing = db.prepare('SELECT * FROM job_rounds WHERE id = ? AND job_id = ?').get(req.params.roundId, req.params.id);
  if (!existing) return res.status(404).json({ error: 'Round not found' });
  const next = { ...existing, ...req.body };
  db.prepare(`
    UPDATE job_rounds SET
      round_name = ?,
      round_type = ?,
      scheduled_at = ?,
      interviewer = ?,
      status = ?,
      notes = ?,
      outcome = ?,
      order_index = ?,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ? AND job_id = ?
  `).run(
    next.round_name || '',
    next.round_type || 'technical',
    next.scheduled_at || '',
    next.interviewer || '',
    next.status || 'planned',
    next.notes || '',
    next.outcome || '',
    Number.isFinite(Number(next.order_index)) ? Number(next.order_index) : existing.order_index,
    req.params.roundId,
    req.params.id,
  );
  db.prepare('UPDATE job_applications SET updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(req.params.id);
  res.json(db.prepare('SELECT * FROM job_rounds WHERE id = ?').get(req.params.roundId));
});

app.delete('/api/jobs/:id/rounds/:roundId', (req, res) => {
  db.prepare('DELETE FROM job_rounds WHERE id = ? AND job_id = ?').run(req.params.roundId, req.params.id);
  db.prepare('UPDATE job_applications SET updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

app.get('/api/prep-plans', (req, res) => {
  const plans = db.prepare(`
    SELECT p.*, j.company as job_company, j.title as job_title,
           (SELECT COUNT(*) FROM prep_plan_items WHERE plan_id = p.id) as total_items,
           (SELECT COUNT(*) FROM prep_plan_items WHERE plan_id = p.id AND status = 'done') as done_items
    FROM preparation_plans p
    LEFT JOIN job_applications j ON j.id = p.job_id
    ORDER BY p.updated_at DESC, p.id DESC
  `).all();
  res.json(plans);
});

app.get('/api/prep-plans/:id', (req, res) => {
  const plan = db.prepare('SELECT * FROM preparation_plans WHERE id = ?').get(req.params.id);
  if (!plan) return res.status(404).json({ error: 'Plan not found' });
  res.json(prepPlanWithItems(plan));
});

app.post('/api/prep-plans', (req, res) => {
  const {
    job_id = null,
    scope = 'general',
    title = '',
    company = '',
    focus_areas = '',
    plan = '',
    target_date = '',
    status = 'active',
  } = req.body;
  const safeJobId = job_id ? Number(job_id) : null;
  const result = db.prepare(`
    INSERT INTO preparation_plans (job_id, scope, title, company, focus_areas, plan, target_date, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(safeJobId, scope, title, company, focus_areas, plan, target_date, status);
  res.status(201).json(prepPlanWithItems(db.prepare('SELECT * FROM preparation_plans WHERE id = ?').get(result.lastInsertRowid)));
});

app.put('/api/prep-plans/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM preparation_plans WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Plan not found' });
  const next = { ...existing, ...req.body };
  const safeJobId = next.job_id ? Number(next.job_id) : null;
  db.prepare(`
    UPDATE preparation_plans SET
      job_id = ?,
      scope = ?,
      title = ?,
      company = ?,
      focus_areas = ?,
      plan = ?,
      target_date = ?,
      status = ?,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(
    safeJobId,
    next.scope || 'general',
    next.title || '',
    next.company || '',
    next.focus_areas || '',
    next.plan || '',
    next.target_date || '',
    next.status || 'active',
    req.params.id,
  );
  res.json(prepPlanWithItems(db.prepare('SELECT * FROM preparation_plans WHERE id = ?').get(req.params.id)));
});

app.delete('/api/prep-plans/:id', (req, res) => {
  db.prepare('DELETE FROM preparation_plans WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

app.post('/api/prep-plans/:id/items', (req, res) => {
  const plan = db.prepare('SELECT * FROM preparation_plans WHERE id = ?').get(req.params.id);
  if (!plan) return res.status(404).json({ error: 'Plan not found' });
  const {
    title = '',
    category = 'core',
    priority = 'medium',
    status = 'todo',
    due_date = '',
    resource_url = '',
    notes = '',
  } = req.body;
  const maxOrder = db.prepare('SELECT COALESCE(MAX(order_index), -1) as m FROM prep_plan_items WHERE plan_id = ?').get(req.params.id).m;
  const result = db.prepare(`
    INSERT INTO prep_plan_items (plan_id, title, category, priority, status, due_date, resource_url, notes, order_index)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(req.params.id, title, category, priority, status, due_date, resource_url, notes, maxOrder + 1);
  db.prepare('UPDATE preparation_plans SET updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(req.params.id);
  res.status(201).json(db.prepare('SELECT * FROM prep_plan_items WHERE id = ?').get(result.lastInsertRowid));
});

app.put('/api/prep-plans/:id/items/:itemId', (req, res) => {
  const existing = db.prepare('SELECT * FROM prep_plan_items WHERE id = ? AND plan_id = ?').get(req.params.itemId, req.params.id);
  if (!existing) return res.status(404).json({ error: 'Item not found' });
  const next = { ...existing, ...req.body };
  db.prepare(`
    UPDATE prep_plan_items SET
      title = ?,
      category = ?,
      priority = ?,
      status = ?,
      due_date = ?,
      resource_url = ?,
      notes = ?,
      order_index = ?,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ? AND plan_id = ?
  `).run(
    next.title || '',
    next.category || 'core',
    next.priority || 'medium',
    next.status || 'todo',
    next.due_date || '',
    next.resource_url || '',
    next.notes || '',
    Number.isFinite(Number(next.order_index)) ? Number(next.order_index) : existing.order_index,
    req.params.itemId,
    req.params.id,
  );
  db.prepare('UPDATE preparation_plans SET updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(req.params.id);
  res.json(db.prepare('SELECT * FROM prep_plan_items WHERE id = ?').get(req.params.itemId));
});

app.delete('/api/prep-plans/:id/items/:itemId', (req, res) => {
  db.prepare('DELETE FROM prep_plan_items WHERE id = ? AND plan_id = ?').run(req.params.itemId, req.params.id);
  db.prepare('UPDATE preparation_plans SET updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

app.get('/api/profile', (req, res) => {
  res.json(fullProfileData());
});

// Get-or-create the profile (initialises profile_personal if empty)
app.post('/api/profile/init', (req, res) => {
  const row = db.prepare('SELECT * FROM profile_personal WHERE id = 1').get();
  if (!row) db.prepare("INSERT OR IGNORE INTO profile_personal (id) VALUES (1)").run();
  res.json(fullProfileData());
});

// Update profile personal info
app.put('/api/profile/personal', (req, res) => {
  const { full_name, email, phone, location, website, linkedin, github, summary, tagline, subtitle } = req.body;
  db.prepare(`INSERT OR REPLACE INTO profile_personal
    (id, full_name, email, phone, location, website, linkedin, github, summary, tagline, subtitle, updated_at)
    VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`)
    .run(full_name||'', email||'', phone||'', location||'', website||'', linkedin||'', github||'', summary||'', tagline||'', subtitle||'');
  res.json({ success: true });
});

// Profile experiences
app.post('/api/profile/experiences', (req, res) => {
  const { company='', title='', location='', start_date='', end_date='', current_job=false, bullets=[], note='' } = req.body;
  const maxOrder = db.prepare('SELECT COALESCE(MAX(order_index),-1) as m FROM profile_experiences').get().m;
  const result = db.prepare('INSERT INTO profile_experiences (company,title,location,start_date,end_date,current_job,bullets,note,order_index) VALUES (?,?,?,?,?,?,?,?,?)')
    .run(company, title, location, start_date, end_date, current_job?1:0, JSON.stringify(bullets), note, maxOrder+1);
  const exp = db.prepare('SELECT * FROM profile_experiences WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json({ ...exp, bullets: JSON.parse(exp.bullets), current_job: Boolean(exp.current_job) });
});
app.put('/api/profile/experiences/:id', (req, res) => {
  const { company, title, location, start_date, end_date, current_job, bullets, note='' } = req.body;
  db.prepare('UPDATE profile_experiences SET company=?,title=?,location=?,start_date=?,end_date=?,current_job=?,bullets=?,note=? WHERE id=?')
    .run(company, title, location, start_date, end_date, current_job?1:0, JSON.stringify(bullets), note, req.params.id);
  res.json({ success: true });
});
app.delete('/api/profile/experiences/:id', (req, res) => {
  db.prepare('DELETE FROM profile_experiences WHERE id=?').run(req.params.id);
  res.json({ success: true });
});

// Profile education
app.post('/api/profile/education', (req, res) => {
  const { school='', degree='', field='', location='', start_date='', end_date='', gpa='', details='' } = req.body;
  const maxOrder = db.prepare('SELECT COALESCE(MAX(order_index),-1) as m FROM profile_education').get().m;
  const result = db.prepare('INSERT INTO profile_education (school,degree,field,location,start_date,end_date,gpa,details,order_index) VALUES (?,?,?,?,?,?,?,?,?)')
    .run(school, degree, field, location, start_date, end_date, gpa, details, maxOrder+1);
  res.status(201).json(db.prepare('SELECT * FROM profile_education WHERE id=?').get(result.lastInsertRowid));
});
app.put('/api/profile/education/:id', (req, res) => {
  const { school, degree, field, location, start_date, end_date, gpa, details } = req.body;
  db.prepare('UPDATE profile_education SET school=?,degree=?,field=?,location=?,start_date=?,end_date=?,gpa=?,details=? WHERE id=?')
    .run(school, degree, field, location, start_date, end_date, gpa, details, req.params.id);
  res.json({ success: true });
});
app.delete('/api/profile/education/:id', (req, res) => {
  db.prepare('DELETE FROM profile_education WHERE id=?').run(req.params.id);
  res.json({ success: true });
});

// Profile skills
app.post('/api/profile/skills', (req, res) => {
  const { category='', items=[] } = req.body;
  const maxOrder = db.prepare('SELECT COALESCE(MAX(order_index),-1) as m FROM profile_skills').get().m;
  const result = db.prepare('INSERT INTO profile_skills (category,items,order_index) VALUES (?,?,?)')
    .run(category, JSON.stringify(items), maxOrder+1);
  const row = db.prepare('SELECT * FROM profile_skills WHERE id=?').get(result.lastInsertRowid);
  res.status(201).json({ ...row, items: JSON.parse(row.items) });
});
app.put('/api/profile/skills/:id', (req, res) => {
  const { category, items } = req.body;
  db.prepare('UPDATE profile_skills SET category=?,items=? WHERE id=?').run(category, JSON.stringify(items), req.params.id);
  res.json({ success: true });
});
app.delete('/api/profile/skills/:id', (req, res) => {
  db.prepare('DELETE FROM profile_skills WHERE id=?').run(req.params.id);
  res.json({ success: true });
});

// Profile projects
app.post('/api/profile/projects', (req, res) => {
  const { name='', description='', url='', technologies=[], start_date='', end_date='' } = req.body;
  const maxOrder = db.prepare('SELECT COALESCE(MAX(order_index),-1) as m FROM profile_projects').get().m;
  const result = db.prepare('INSERT INTO profile_projects (name,description,url,technologies,start_date,end_date,order_index) VALUES (?,?,?,?,?,?,?)')
    .run(name, description, url, JSON.stringify(technologies), start_date, end_date, maxOrder+1);
  const row = db.prepare('SELECT * FROM profile_projects WHERE id=?').get(result.lastInsertRowid);
  res.status(201).json({ ...row, technologies: JSON.parse(row.technologies) });
});
app.put('/api/profile/projects/:id', (req, res) => {
  const { name, description, url, technologies, start_date, end_date } = req.body;
  db.prepare('UPDATE profile_projects SET name=?,description=?,url=?,technologies=?,start_date=?,end_date=? WHERE id=?')
    .run(name, description, url, JSON.stringify(technologies), start_date, end_date, req.params.id);
  res.json({ success: true });
});
app.delete('/api/profile/projects/:id', (req, res) => {
  db.prepare('DELETE FROM profile_projects WHERE id=?').run(req.params.id);
  res.json({ success: true });
});

// Profile certifications
app.post('/api/profile/certifications', (req, res) => {
  const { name='', issuer='', issued_date='', expiry_date='', credential_id='', cert_group='' } = req.body;
  const maxOrder = db.prepare('SELECT COALESCE(MAX(order_index),-1) as m FROM profile_certifications').get().m;
  const result = db.prepare('INSERT INTO profile_certifications (name,issuer,issued_date,expiry_date,credential_id,cert_group,order_index) VALUES (?,?,?,?,?,?,?)')
    .run(name, issuer, issued_date, expiry_date, credential_id, cert_group, maxOrder+1);
  res.status(201).json(db.prepare('SELECT * FROM profile_certifications WHERE id=?').get(result.lastInsertRowid));
});
app.put('/api/profile/certifications/:id', (req, res) => {
  const { name, issuer, issued_date, expiry_date, credential_id, cert_group = '' } = req.body;
  db.prepare('UPDATE profile_certifications SET name=?,issuer=?,issued_date=?,expiry_date=?,credential_id=?,cert_group=? WHERE id=?')
    .run(name, issuer, issued_date, expiry_date, credential_id, cert_group, req.params.id);
  res.json({ success: true });
});
app.delete('/api/profile/certifications/:id', (req, res) => {
  db.prepare('DELETE FROM profile_certifications WHERE id=?').run(req.params.id);
  res.json({ success: true });
});

// Derive (overwrite) profile from an existing resume
app.post('/api/profile/from-resume/:id', (req, res) => {
  const src = db.prepare('SELECT * FROM resumes WHERE id = ?').get(req.params.id);
  if (!src) return res.status(404).json({ error: 'Resume not found' });

  const p  = db.prepare('SELECT * FROM personal_info WHERE resume_id = ?').get(req.params.id);
  const hi = db.prepare('SELECT * FROM career_highlights WHERE resume_id = ? ORDER BY order_index').all(req.params.id);
  const ex = db.prepare('SELECT * FROM experiences WHERE resume_id = ? ORDER BY order_index').all(req.params.id);
  const ed = db.prepare('SELECT * FROM education WHERE resume_id = ? ORDER BY order_index').all(req.params.id);
  const sk = db.prepare('SELECT * FROM skills WHERE resume_id = ? ORDER BY order_index').all(req.params.id);
  const pr = db.prepare('SELECT * FROM projects WHERE resume_id = ? ORDER BY order_index').all(req.params.id);
  const ce = db.prepare('SELECT * FROM certifications WHERE resume_id = ? ORDER BY order_index').all(req.params.id);

  if (p) {
    db.prepare(`INSERT OR REPLACE INTO profile_personal
      (id, full_name, email, phone, location, website, linkedin, github, summary, tagline, subtitle, updated_at)
      VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`)
      .run(p.full_name||'', p.email||'', p.phone||'', p.location||'', p.website||'', p.linkedin||'', p.github||'', p.summary||'', p.tagline||'', p.subtitle||'');
  }
  db.prepare('DELETE FROM profile_highlights').run();
  hi.forEach((h, i) => db.prepare('INSERT INTO profile_highlights (text,order_index) VALUES (?,?)').run(h.text, i));
  db.prepare('DELETE FROM profile_experiences').run();
  ex.forEach((e, i) => db.prepare('INSERT INTO profile_experiences (company,title,location,start_date,end_date,current_job,bullets,note,order_index) VALUES (?,?,?,?,?,?,?,?,?)').run(e.company, e.title, e.location, e.start_date, e.end_date, e.current_job, e.bullets, e.note||'', i));
  db.prepare('DELETE FROM profile_education').run();
  ed.forEach((e, i) => db.prepare('INSERT INTO profile_education (school,degree,field,location,start_date,end_date,gpa,details,order_index) VALUES (?,?,?,?,?,?,?,?,?)').run(e.school, e.degree, e.field, e.location, e.start_date, e.end_date, e.gpa, e.details, i));
  db.prepare('DELETE FROM profile_skills').run();
  sk.forEach((s, i) => db.prepare('INSERT INTO profile_skills (category,items,order_index) VALUES (?,?,?)').run(s.category, s.items, i));
  db.prepare('DELETE FROM profile_projects').run();
  pr.forEach((pj, i) => db.prepare('INSERT INTO profile_projects (name,description,url,technologies,start_date,end_date,order_index) VALUES (?,?,?,?,?,?,?)').run(pj.name, pj.description, pj.url, pj.technologies, pj.start_date, pj.end_date, i));
  db.prepare('DELETE FROM profile_certifications').run();
  ce.forEach((c, i) => db.prepare('INSERT INTO profile_certifications (name,issuer,issued_date,expiry_date,credential_id,cert_group,order_index) VALUES (?,?,?,?,?,?,?)').run(c.name, c.issuer, c.issued_date, c.expiry_date, c.credential_id, c.cert_group||'', i));

  res.json({ success: true });
});

// Create a new resume pre-populated from the profile
app.post('/api/resumes/from-profile', (req, res) => {
  const { title = 'Untitled Resume' } = req.body;
  const p  = db.prepare('SELECT * FROM profile_personal WHERE id = 1').get();
  const hi = db.prepare('SELECT * FROM profile_highlights ORDER BY order_index').all();
  const ex = db.prepare('SELECT * FROM profile_experiences ORDER BY order_index').all();
  const ed = db.prepare('SELECT * FROM profile_education ORDER BY order_index').all();
  const sk = db.prepare('SELECT * FROM profile_skills ORDER BY order_index').all();
  const pr = db.prepare('SELECT * FROM profile_projects ORDER BY order_index').all();
  const ce = db.prepare('SELECT * FROM profile_certifications ORDER BY order_index').all();

  const newId = db.prepare("INSERT INTO resumes (title, template) VALUES (?, 'classic')")
    .run(title).lastInsertRowid;
  db.prepare('INSERT INTO personal_info (resume_id,full_name,email,phone,location,website,linkedin,github,summary,tagline,subtitle) VALUES (?,?,?,?,?,?,?,?,?,?,?)')
    .run(newId, p?.full_name||'', p?.email||'', p?.phone||'', p?.location||'', p?.website||'', p?.linkedin||'', p?.github||'', p?.summary||'', p?.tagline||'', p?.subtitle||'');
  hi.forEach((h, i) => db.prepare('INSERT INTO career_highlights (resume_id,text,order_index) VALUES (?,?,?)').run(newId, h.text, i));
  ex.forEach((e, i) => db.prepare('INSERT INTO experiences (resume_id,company,title,location,start_date,end_date,current_job,bullets,note,order_index) VALUES (?,?,?,?,?,?,?,?,?,?)').run(newId, e.company, e.title, e.location, e.start_date, e.end_date, e.current_job, e.bullets, e.note||'', i));
  ed.forEach((e, i) => db.prepare('INSERT INTO education (resume_id,school,degree,field,location,start_date,end_date,gpa,details,order_index) VALUES (?,?,?,?,?,?,?,?,?,?)').run(newId, e.school, e.degree, e.field, e.location, e.start_date, e.end_date, e.gpa, e.details, i));
  sk.forEach((s, i) => db.prepare('INSERT INTO skills (resume_id,category,items,order_index) VALUES (?,?,?,?)').run(newId, s.category, s.items, i));
  pr.forEach((pj, i) => db.prepare('INSERT INTO projects (resume_id,name,description,url,technologies,start_date,end_date,order_index) VALUES (?,?,?,?,?,?,?,?)').run(newId, pj.name, pj.description, pj.url, pj.technologies, pj.start_date, pj.end_date, i));
  ce.forEach((c, i) => db.prepare('INSERT INTO certifications (resume_id,name,issuer,issued_date,expiry_date,credential_id,cert_group,order_index) VALUES (?,?,?,?,?,?,?,?)').run(newId, c.name, c.issuer, c.issued_date, c.expiry_date, c.credential_id, c.cert_group||'', i));

  res.status(201).json(db.prepare('SELECT * FROM resumes WHERE id = ?').get(newId));
});

// ── Question Bank ─────────────────────────────────────────────────────────────

// Questions come from two sources — seeded content in the shared DB and
// user-added questions in the personal DB — unioned under a composite
// question_key ('shared:<number>' | 'custom:<id>'), with practice state and
// notes joined in from the personal question_progress table.
const QUESTION_SELECT = `
  SELECT * FROM (
    SELECT 'shared:' || q.number AS key, 'shared' AS source, q.id AS source_id,
           q.number, q.question, q.category, q.archetype, q.probe, q.level, q.companies,
           COALESCE(p.practiced, 0) AS practiced, p.practiced_at, COALESCE(p.notes, '') AS notes
    FROM shared.question_bank q
    LEFT JOIN question_progress p ON p.question_key = 'shared:' || q.number
    UNION ALL
    SELECT 'custom:' || c.id AS key, 'custom' AS source, c.id AS source_id,
           NULL AS number, c.question, c.category, c.archetype, '' AS probe, c.level, c.companies,
           COALESCE(p.practiced, 0) AS practiced, p.practiced_at, COALESCE(p.notes, '') AS notes
    FROM custom_questions c
    LEFT JOIN question_progress p ON p.question_key = 'custom:' || c.id
  )
`;

function getQuestion(key) {
  return db.prepare(`${QUESTION_SELECT} WHERE key = ?`).get(key);
}

app.get('/api/questions', (req, res) => {
  const { CATEGORIES } = require('./questionBank');
  res.json({
    categories: CATEGORIES,
    questions: db.prepare(`${QUESTION_SELECT} ORDER BY source DESC, number, source_id`).all(),
  });
});

// Add a custom question (stored in the personal DB — user-generated content)
app.post('/api/questions', (req, res) => {
  const { question = '', category = 'General', archetype = '', level = '', companies = '' } = req.body || {};
  if (!String(question).trim()) return res.status(400).json({ error: 'question is required' });
  const maxOrder = db.prepare('SELECT COALESCE(MAX(order_index), -1) as m FROM custom_questions').get().m;
  const result = db.prepare(
    'INSERT INTO custom_questions (question, category, archetype, level, companies, order_index) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(String(question).trim(), String(category).trim() || 'General', String(archetype).trim(), String(level).trim(), String(companies).trim(), maxOrder + 1);
  res.status(201).json(getQuestion(`custom:${result.lastInsertRowid}`));
});

// Edit a custom question's content (seeded questions are read-only)
app.put('/api/questions/custom/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM custom_questions WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Not found' });
  const {
    question = existing.question, category = existing.category,
    archetype = existing.archetype, level = existing.level, companies = existing.companies,
  } = req.body || {};
  db.prepare('UPDATE custom_questions SET question = ?, category = ?, archetype = ?, level = ?, companies = ? WHERE id = ?')
    .run(String(question).trim(), String(category).trim() || 'General', String(archetype).trim(), String(level).trim(), String(companies).trim(), req.params.id);
  res.json(getQuestion(`custom:${req.params.id}`));
});

app.delete('/api/questions/custom/:id', (req, res) => {
  db.prepare('DELETE FROM custom_questions WHERE id = ?').run(req.params.id);
  db.prepare('DELETE FROM question_progress WHERE question_key = ?').run(`custom:${req.params.id}`);
  res.json({ success: true });
});

// Reset practice progress, optionally scoped to a category and/or archetype.
// Notes are always kept.
app.post('/api/questions/reset', (req, res) => {
  const { archetype = null, category = null } = req.body || {};
  if (archetype || category) {
    const keys = db.prepare(`${QUESTION_SELECT} WHERE (? IS NULL OR archetype = ?) AND (? IS NULL OR category = ?)`)
      .all(archetype, archetype, category, category).map(q => q.key);
    const clear = db.prepare('UPDATE question_progress SET practiced = 0, practiced_at = NULL WHERE question_key = ?');
    for (const key of keys) clear.run(key);
  } else {
    db.prepare('UPDATE question_progress SET practiced = 0, practiced_at = NULL').run();
  }
  db.prepare("DELETE FROM question_progress WHERE practiced = 0 AND TRIM(COALESCE(notes,'')) = ''").run();
  res.json({ success: true });
});

// Practice state / notes — works for both sources via the composite key
app.put('/api/questions/:key', (req, res) => {
  const q = getQuestion(req.params.key);
  if (!q) return res.status(404).json({ error: 'Not found' });
  let { practiced, practiced_at } = q;
  if (req.body.practiced !== undefined) {
    practiced = req.body.practiced ? 1 : 0;
    practiced_at = practiced ? new Date().toISOString() : null;
  }
  const notes = req.body.notes !== undefined ? String(req.body.notes) : q.notes;
  if (!practiced && !notes.trim()) {
    db.prepare('DELETE FROM question_progress WHERE question_key = ?').run(q.key);
  } else {
    db.prepare(`
      INSERT INTO question_progress (question_key, practiced, practiced_at, notes) VALUES (?, ?, ?, ?)
      ON CONFLICT(question_key) DO UPDATE SET practiced = excluded.practiced, practiced_at = excluded.practiced_at, notes = excluded.notes
    `).run(q.key, practiced, practiced_at, notes);
  }
  res.json(getQuestion(req.params.key));
});

// ── Next Role (Lara Hogan's 4-lists framework) ────────────────────────────────

const NEXT_ROLE_BUCKETS = new Set(['must', 'nice', 'dont']);

function readAppSetting(key) {
  const row = db.prepare('SELECT value FROM app_settings WHERE key = ?').get(key);
  return row ? row.value : '';
}

app.get('/api/next-role', (req, res) => {
  res.json({
    optimizing_for: readAppSetting('next_role_optimizing_for'),
    criteria: db.prepare('SELECT * FROM next_role_criteria ORDER BY order_index, id').all(),
    checks: db.prepare('SELECT job_id, criteria_id, met FROM job_criteria_checks').all(),
  });
});

app.put('/api/next-role', (req, res) => {
  const { optimizing_for = '' } = req.body;
  db.prepare('INSERT INTO app_settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value')
    .run('next_role_optimizing_for', String(optimizing_for));
  res.json({ success: true });
});

app.post('/api/next-role/criteria', (req, res) => {
  const { bucket = 'must', text = '' } = req.body;
  if (!NEXT_ROLE_BUCKETS.has(bucket)) return res.status(400).json({ error: 'Invalid bucket' });
  const maxOrder = db.prepare('SELECT COALESCE(MAX(order_index), -1) as m FROM next_role_criteria WHERE bucket = ?').get(bucket).m;
  const result = db.prepare('INSERT INTO next_role_criteria (bucket, text, order_index) VALUES (?, ?, ?)')
    .run(bucket, String(text), maxOrder + 1);
  res.status(201).json(db.prepare('SELECT * FROM next_role_criteria WHERE id = ?').get(result.lastInsertRowid));
});

app.put('/api/next-role/criteria/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM next_role_criteria WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Not found' });
  const { text = existing.text, bucket = existing.bucket } = req.body;
  if (!NEXT_ROLE_BUCKETS.has(bucket)) return res.status(400).json({ error: 'Invalid bucket' });
  db.prepare('UPDATE next_role_criteria SET text = ?, bucket = ? WHERE id = ?')
    .run(String(text), bucket, req.params.id);
  res.json(db.prepare('SELECT * FROM next_role_criteria WHERE id = ?').get(req.params.id));
});

app.delete('/api/next-role/criteria/:id', (req, res) => {
  db.prepare('DELETE FROM next_role_criteria WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// Tri-state per-job check: met = 1 (yes) | -1 (no) | 0 (clear / unknown)
app.put('/api/next-role/jobs/:jobId/checks', (req, res) => {
  const { criteria_id, met = 0 } = req.body;
  const job = db.prepare('SELECT id FROM job_applications WHERE id = ?').get(req.params.jobId);
  const criteria = db.prepare('SELECT id FROM next_role_criteria WHERE id = ?').get(criteria_id);
  if (!job || !criteria) return res.status(404).json({ error: 'Job or criteria not found' });
  if (met === 0) {
    db.prepare('DELETE FROM job_criteria_checks WHERE job_id = ? AND criteria_id = ?').run(job.id, criteria_id);
  } else {
    db.prepare(`
      INSERT INTO job_criteria_checks (job_id, criteria_id, met) VALUES (?, ?, ?)
      ON CONFLICT(job_id, criteria_id) DO UPDATE SET met = excluded.met
    `).run(job.id, criteria_id, met > 0 ? 1 : -1);
  }
  res.json({ success: true });
});

// ── AI workflows ──────────────────────────────────────────────────────────────

app.get('/api/ai/status', (req, res) => {
  const s = llm.publicSettings();
  res.json({ configured: s.configured, provider: s.provider, model: s.model });
});

// AI provider settings — the key itself is never returned, only has_key + hint
app.get('/api/settings/ai', (req, res) => {
  res.json(llm.publicSettings());
});

app.put('/api/settings/ai', (req, res) => {
  llm.saveAiSettings(req.body || {});
  res.json(llm.publicSettings());
});

app.post('/api/settings/ai/test', async (req, res) => {
  try {
    res.json(await llm.testConnection());
  } catch (err) {
    if (err.code === 'AI_NOT_CONFIGURED') return res.status(503).json({ ok: false, error: err.message });
    res.status(502).json({ ok: false, error: err.message });
  }
});

app.post('/api/resumes/:id/ai/rewrite-bullet', async (req, res) => {
  const resume = db.prepare('SELECT * FROM resumes WHERE id = ?').get(req.params.id);
  if (!resume) return res.status(404).json({ error: 'Not found' });

  const { bullet, issue = '', exp_id = null, extra_facts = '' } = req.body;
  if (!bullet || !String(bullet).trim()) return res.status(400).json({ error: 'bullet is required' });

  let role = {};
  if (exp_id) {
    const exp = db.prepare('SELECT * FROM experiences WHERE id = ? AND resume_id = ?').get(exp_id, req.params.id);
    if (exp) {
      role = {
        title: exp.title,
        company: exp.company,
        note: exp.note,
        otherBullets: JSON.parse(exp.bullets || '[]').filter(b => b && b !== bullet),
      };
    }
  }

  try {
    const result = await rewriteBullet({ bullet, issue, role, extraFacts: extra_facts });
    res.json(result);
  } catch (err) {
    if (err.code === 'AI_NOT_CONFIGURED') return res.status(503).json({ error: err.message });
    console.error('AI rewrite error:', err.message);
    res.status(500).json({ error: 'Rewrite failed. Check the server logs and your API key.' });
  }
});

// Audit trail — recorded when the user accepts an AI proposal
app.post('/api/resumes/:id/ai/changes', (req, res) => {
  const { workflow = '', field = '', before_text = '', after_text = '', accepted = true } = req.body;
  const result = db.prepare(
    'INSERT INTO ai_changes (resume_id, workflow, field, before_text, after_text, accepted) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(req.params.id, workflow, field, before_text, after_text, accepted ? 1 : 0);
  res.status(201).json({ id: result.lastInsertRowid });
});

// ── PDF Export ────────────────────────────────────────────────────────────────

app.get('/api/resumes/:id/pdf', async (req, res) => {
  const resume = db.prepare('SELECT * FROM resumes WHERE id = ?').get(req.params.id);
  if (!resume) return res.status(404).json({ error: 'Not found' });

  const full = fullResume(req.params.id);

  // Optional section filter: ?sections=summary,experiences,education,...
  if (req.query.sections) {
    const include = new Set(req.query.sections.split(',').map(s => s.trim()).filter(Boolean));
    for (const key of ['highlights', 'experiences', 'education', 'skills', 'projects', 'certifications']) {
      if (!include.has(key)) full[key] = [];
    }
    if (!include.has('summary') && full.personal) {
      full.personal = { ...full.personal, summary: '' };
    }
  }

  try {
    const html = buildResumeHtml(full);
    const pdf  = await generatePdf(html);

    const filename = `${resume.title.replace(/[^a-z0-9\s-]/gi, '').trim().replace(/\s+/g, '_') || 'resume'}.pdf`;
    const buf = Buffer.isBuffer(pdf) ? pdf : Buffer.from(pdf);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': buf.length,
    });
    res.send(buf);
  } catch (err) {
    if (err.code === 'CHROME_NOT_FOUND') {
      return res.status(503).json({ error: err.message });
    }
    console.error('PDF error:', err.message);
    res.status(500).json({ error: 'PDF generation failed' });
  }
});

app.get('/api/resumes/:id/txt', (req, res) => {
  const resume = db.prepare('SELECT * FROM resumes WHERE id = ?').get(req.params.id);
  if (!resume) return res.status(404).json({ error: 'Not found' });

  const text = buildResumeText(fullResume(req.params.id));
  const filename = `${resume.title.replace(/[^a-z0-9\s-]/gi, '').trim().replace(/\s+/g, '_') || 'resume'}.txt`;
  res.set({
    'Content-Type': 'text/plain; charset=utf-8',
    'Content-Disposition': `attachment; filename="${filename}"`,
  });
  res.send(text);
});

app.get('/api/resumes/:id/docx', (req, res) => {
  const resume = db.prepare('SELECT * FROM resumes WHERE id = ?').get(req.params.id);
  if (!resume) return res.status(404).json({ error: 'Not found' });

  const docx = buildResumeDocx(fullResume(req.params.id));
  const filename = `${resume.title.replace(/[^a-z0-9\s-]/gi, '').trim().replace(/\s+/g, '_') || 'resume'}.docx`;
  res.set({
    'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'Content-Disposition': `attachment; filename="${filename}"`,
    'Content-Length': docx.length,
  });
  res.send(docx);
});

// ─────────────────────────────────────────────────────────────────────────────

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
