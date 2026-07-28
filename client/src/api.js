const BASE = '/api';

async function req(method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`${method} ${path} → ${res.status}`);
  return res.json();
}

export const api = {
  metrics: {
    get: () => req('GET', '/metrics'),
  },
  resumes: {
    list: () => req('GET', '/resumes'),
    create: (data) => req('POST', '/resumes', data),
    get: (id) => req('GET', `/resumes/${id}`),
    update: (id, data) => req('PUT', `/resumes/${id}`, data),
    delete: (id) => req('DELETE', `/resumes/${id}`),
    clone:  (id) => req('POST',   `/resumes/${id}/clone`, {}),
  },
  personal: {
    update: (id, data) => req('PUT', `/resumes/${id}/personal`, data),
  },
  experiences: {
    create: (id, data) => req('POST', `/resumes/${id}/experiences`, data),
    update: (id, expId, data) => req('PUT', `/resumes/${id}/experiences/${expId}`, data),
    delete: (id, expId) => req('DELETE', `/resumes/${id}/experiences/${expId}`),
  },
  highlights: {
    create: (id, data) => req('POST', `/resumes/${id}/highlights`, data),
    update: (id, highlightId, data) => req('PUT', `/resumes/${id}/highlights/${highlightId}`, data),
    delete: (id, highlightId) => req('DELETE', `/resumes/${id}/highlights/${highlightId}`),
  },
  education: {
    create: (id, data) => req('POST', `/resumes/${id}/education`, data),
    update: (id, eduId, data) => req('PUT', `/resumes/${id}/education/${eduId}`, data),
    delete: (id, eduId) => req('DELETE', `/resumes/${id}/education/${eduId}`),
  },
  skills: {
    create: (id, data) => req('POST', `/resumes/${id}/skills`, data),
    update: (id, skillId, data) => req('PUT', `/resumes/${id}/skills/${skillId}`, data),
    delete: (id, skillId) => req('DELETE', `/resumes/${id}/skills/${skillId}`),
    reorder: (id, ids) => req('PUT', `/resumes/${id}/skills/reorder`, { ids }),
  },
  projects: {
    create: (id, data) => req('POST', `/resumes/${id}/projects`, data),
    update: (id, projId, data) => req('PUT', `/resumes/${id}/projects/${projId}`, data),
    delete: (id, projId) => req('DELETE', `/resumes/${id}/projects/${projId}`),
    reorder: (id, ids) => req('PUT', `/resumes/${id}/projects/reorder`, { ids }),
  },
  certifications: {
    create: (id, data) => req('POST', `/resumes/${id}/certifications`, data),
    update: (id, certId, data) => req('PUT', `/resumes/${id}/certifications/${certId}`, data),
    delete: (id, certId) => req('DELETE', `/resumes/${id}/certifications/${certId}`),
  },
  profile: {
    get: () => req('GET', '/profile'),
    init: () => req('POST', '/profile/init', {}),
    updatePersonal: (data) => req('PUT', '/profile/personal', data),
    deriveFrom: (resumeId) => req('POST', `/profile/from-resume/${resumeId}`, {}),
    createResume: (title) => req('POST', '/resumes/from-profile', { title }),
    experiences: {
      create: (data) => req('POST', '/profile/experiences', data),
      update: (id, data) => req('PUT', `/profile/experiences/${id}`, data),
      delete: (id) => req('DELETE', `/profile/experiences/${id}`),
    },
    education: {
      create: (data) => req('POST', '/profile/education', data),
      update: (id, data) => req('PUT', `/profile/education/${id}`, data),
      delete: (id) => req('DELETE', `/profile/education/${id}`),
    },
    skills: {
      create: (data) => req('POST', '/profile/skills', data),
      update: (id, data) => req('PUT', `/profile/skills/${id}`, data),
      delete: (id) => req('DELETE', `/profile/skills/${id}`),
    },
    projects: {
      create: (data) => req('POST', '/profile/projects', data),
      update: (id, data) => req('PUT', `/profile/projects/${id}`, data),
      delete: (id) => req('DELETE', `/profile/projects/${id}`),
    },
    certifications: {
      create: (data) => req('POST', '/profile/certifications', data),
      update: (id, data) => req('PUT', `/profile/certifications/${id}`, data),
      delete: (id) => req('DELETE', `/profile/certifications/${id}`),
    },
  },
  questions: {
    list: () => req('GET', '/questions'),
    update: (key, data) => req('PUT', `/questions/${encodeURIComponent(key)}`, data),
    create: (data) => req('POST', '/questions', data),
    updateCustom: (id, data) => req('PUT', `/questions/custom/${id}`, data),
    deleteCustom: (id) => req('DELETE', `/questions/custom/${id}`),
    reset: (scope) => req('POST', '/questions/reset', scope || {}),
  },
  nextRole: {
    get: () => req('GET', '/next-role'),
    update: (data) => req('PUT', '/next-role', data),
    addCriteria: (data) => req('POST', '/next-role/criteria', data),
    updateCriteria: (id, data) => req('PUT', `/next-role/criteria/${id}`, data),
    deleteCriteria: (id) => req('DELETE', `/next-role/criteria/${id}`),
    setCheck: (jobId, data) => req('PUT', `/next-role/jobs/${jobId}/checks`, data),
  },
  ai: {
    status: () => req('GET', '/ai/status'),
    rewriteBullet: (resumeId, data) => req('POST', `/resumes/${resumeId}/ai/rewrite-bullet`, data),
    recordChange: (resumeId, data) => req('POST', `/resumes/${resumeId}/ai/changes`, data),
    getSettings: () => req('GET', '/settings/ai'),
    saveSettings: (data) => req('PUT', '/settings/ai', data),
    testSettings: () => req('POST', '/settings/ai/test', {}),
  },
  jobs: {
    list: () => req('GET', '/jobs'),
    create: (data) => req('POST', '/jobs', data),
    get: (id) => req('GET', `/jobs/${id}`),
    update: (id, data) => req('PUT', `/jobs/${id}`, data),
    delete: (id) => req('DELETE', `/jobs/${id}`),
    attachResume: (id, data) => req('POST', `/jobs/${id}/resumes`, data),
    detachResume: (id, resumeId) => req('DELETE', `/jobs/${id}/resumes/${resumeId}`),
    match: (id) => req('GET', `/jobs/${id}/match`),
    rounds: {
      create: (id, data) => req('POST', `/jobs/${id}/rounds`, data),
      update: (id, roundId, data) => req('PUT', `/jobs/${id}/rounds/${roundId}`, data),
      delete: (id, roundId) => req('DELETE', `/jobs/${id}/rounds/${roundId}`),
    },
  },
  prepPlans: {
    list: () => req('GET', '/prep-plans'),
    get: (id) => req('GET', `/prep-plans/${id}`),
    create: (data) => req('POST', '/prep-plans', data),
    update: (id, data) => req('PUT', `/prep-plans/${id}`, data),
    delete: (id) => req('DELETE', `/prep-plans/${id}`),
    items: {
      create: (id, data) => req('POST', `/prep-plans/${id}/items`, data),
      update: (id, itemId, data) => req('PUT', `/prep-plans/${id}/items/${itemId}`, data),
      delete: (id, itemId) => req('DELETE', `/prep-plans/${id}/items/${itemId}`),
    },
  },
};
