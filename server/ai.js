// AI workflows for CareerOS — provider-agnostic via ./llm (bring your own key).
//
// Design principles (non-negotiable):
//   1. The agent proposes, the user disposes — nothing here writes to the DB.
//   2. Zero fabrication — prompts forbid invented facts, and verifyNumbers()
//      double-checks every number in the output against the source material
//      in code, not just in the prompt.
//   3. Keys live in app settings or the environment, never in resume data,
//      and never leave the server.

const { aiConfigured, completeJSON } = require('./llm');

// ── Truthfulness guardrail ────────────────────────────────────────────────────
// Extract number-like tokens (40%, $2.1M, 12B+, 1,000, p99…) and flag any in
// the candidate text that don't appear in the source material the model was
// given. Flagged numbers are surfaced in the UI as "verify before using".

function numberTokens(text) {
  return String(text || '').match(/\$?\d[\d,.]*\s?[%kKmMbB+]*/g) || [];
}

function normalizeNumber(token) {
  return token.replace(/[^0-9.]/g, '');
}

function verifyNumbers(candidateText, sourceText) {
  const sourceNumbers = new Set(numberTokens(sourceText).map(normalizeNumber));
  return [...new Set(
    numberTokens(candidateText)
      .filter(t => normalizeNumber(t) && !sourceNumbers.has(normalizeNumber(t)))
  )];
}

// ── Bullet rewriter ───────────────────────────────────────────────────────────

const REWRITER_SYSTEM = `You are a FAANG-calibre resume coach. You rewrite a single resume bullet to be impact-driven, following the XYZ formula: "Accomplished [X] as measured by [Y] by doing [Z]".

Hard rules — violating any of these makes your output worthless:
- NEVER invent facts: no numbers, percentages, team sizes, technologies, employers, or outcomes that are not present in the material provided. A resume with a fabricated claim ends a candidacy.
- If a strong rewrite needs a metric the candidate has not provided, write the bullet with the literal placeholder [ADD METRIC] where the number belongs, and set needs_metric to true.
- Start with a strong past-tense action verb (Led, Built, Reduced, Shipped, Architected…). Never "Responsible for", "Helped", "Worked on".
- No first-person pronouns. One idea per bullet, 12–28 words.
- Keep the candidate's actual technologies and scope; sharpen the language, don't inflate the claim.

Produce 2–3 distinct candidates. In facts_used, quote the exact source phrases each candidate is grounded in. Add one short coaching_note explaining what would make this bullet stronger (e.g. which metric to dig up).`;

const REWRITE_SCHEMA = {
  type: 'object',
  properties: {
    candidates: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          text: { type: 'string', description: 'The rewritten bullet' },
          facts_used: { type: 'array', items: { type: 'string' }, description: 'Exact phrases from the source material this rewrite is grounded in' },
          needs_metric: { type: 'boolean', description: 'True when the bullet contains an [ADD METRIC] placeholder the candidate must fill' },
        },
        required: ['text', 'facts_used', 'needs_metric'],
        additionalProperties: false,
      },
    },
    coaching_note: { type: 'string', description: 'One sentence: what would make this bullet stronger' },
  },
  required: ['candidates', 'coaching_note'],
  additionalProperties: false,
};

async function rewriteBullet({ bullet, issue, role = {}, extraFacts = '' }) {
  const roleContext = [
    role.title && `Title: ${role.title}`,
    role.company && `Company: ${role.company}`,
    role.note && `Role note: ${role.note}`,
    role.otherBullets?.length && `Other bullets in this role (for context, do not duplicate):\n${role.otherBullets.map(b => `- ${b}`).join('\n')}`,
  ].filter(Boolean).join('\n');

  const sourceMaterial = [bullet, roleContext, extraFacts].filter(Boolean).join('\n');

  const result = await completeJSON({
    system: REWRITER_SYSTEM,
    user: [
      `Bullet to rewrite:\n"${bullet}"`,
      issue && `Flagged issue: ${issue}`,
      roleContext && `Role context:\n${roleContext}`,
      extraFacts && `Additional facts from the candidate:\n${extraFacts}`,
    ].filter(Boolean).join('\n\n'),
    schema: REWRITE_SCHEMA,
    maxTokens: 2048,
  });

  // Code-level guardrail: flag any number not present in the source material
  for (const candidate of (result.candidates || [])) {
    candidate.unverified_numbers = verifyNumbers(candidate.text, sourceMaterial);
  }
  return result;
}

module.exports = { aiConfigured, rewriteBullet, verifyNumbers };
