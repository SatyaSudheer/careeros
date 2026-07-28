const zlib = require('zlib');

function clean(value) {
  // Strip inline markdown (**bold**, *italic*, ~~strike~~, `code`) — exports are plain text
  return String(value ?? '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/~~([^~]+)~~/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .trim();
}

function filled(items) {
  return (items || []).map(clean).filter(Boolean);
}

function textDate(start, end, current) {
  return [clean(start), current ? 'Present' : clean(end)].filter(Boolean).join(' - ');
}

function lineJoin(parts, sep = ' | ') {
  return parts.map(clean).filter(Boolean).join(sep);
}

function urlDisplay(value) {
  return clean(value).replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '');
}

function buildResumeText(resume) {
  const p = resume.personal || {};
  const lines = [];

  if (p.full_name) lines.push(clean(p.full_name).toUpperCase());
  if (p.tagline) lines.push(clean(p.tagline));
  lines.push(lineJoin([
    p.email,
    p.phone,
    p.location,
    p.website && urlDisplay(p.website),
    p.linkedin && urlDisplay(p.linkedin),
    p.github && urlDisplay(p.github),
  ]));
  if (lines.at(-1) === '') lines.pop();

  if (p.summary) {
    lines.push('', 'SUMMARY', clean(p.summary));
  }

  if (resume.highlights?.length) {
    const highlights = resume.highlights.map(h => clean(h.text)).filter(Boolean);
    if (highlights.length) {
      lines.push('', 'CAREER HIGHLIGHTS');
      highlights.forEach(h => lines.push(`- ${h}`));
    }
  }

  if (resume.skills?.length) {
    lines.push('', 'SKILLS');
    resume.skills.forEach(s => {
      const items = filled(s.items).join(', ');
      if (items) lines.push(s.category ? `${clean(s.category)}: ${items}` : items);
    });
  }

  if (resume.experiences?.length) {
    lines.push('', 'WORK EXPERIENCE');
    resume.experiences.forEach(e => {
      lines.push(lineJoin([e.title, e.company, e.location], ' - '));
      const dates = textDate(e.start_date, e.end_date, e.current_job);
      if (dates) lines.push(dates);
      filled(e.bullets).forEach(b => lines.push(`- ${b}`));
    });
  }

  if (resume.education?.length) {
    lines.push('', 'EDUCATION');
    resume.education.forEach(e => {
      lines.push(lineJoin([e.school, e.location], ' - '));
      lines.push(lineJoin([[e.degree, e.field].filter(Boolean).join(', '), e.gpa && `GPA ${e.gpa}`, textDate(e.start_date, e.end_date)], ' | '));
      if (e.details) lines.push(clean(e.details));
    });
  }

  if (resume.projects?.length) {
    lines.push('', 'PROJECTS');
    resume.projects.forEach(p => {
      lines.push(lineJoin([p.name, p.url], ' - '));
      const dates = textDate(p.start_date, p.end_date);
      if (dates) lines.push(dates);
      if (p.description) lines.push(clean(p.description));
      const tech = filled(p.technologies).join(', ');
      if (tech) lines.push(`Stack: ${tech}`);
    });
  }

  if (resume.certifications?.length) {
    lines.push('', 'CERTIFICATIONS');
    resume.certifications.forEach(c => {
      const year = (clean(c.issued_date || c.expiry_date).match(/\b(20\d{2}|19\d{2})\b/) || [])[0];
      lines.push(lineJoin([c.name, c.issuer, year], ' - '));
    });
  }

  return `${lines.filter((line, i) => line !== '' || lines[i - 1] !== '').join('\n')}\n`;
}

function xmlEsc(value) {
  return clean(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function para(text, style = '') {
  const styleXml = style ? `<w:pPr><w:pStyle w:val="${style}"/></w:pPr>` : '';
  return `<w:p>${styleXml}<w:r><w:t>${xmlEsc(text)}</w:t></w:r></w:p>`;
}

function docParagraphs(resume) {
  return buildResumeText(resume).split('\n').flatMap(line => {
    if (!line) return [para('')];
    if (/^[A-Z][A-Z ]+$/.test(line) && line.length < 30) return [para(line, 'Heading1')];
    if (line.startsWith('- ')) return [para(line, 'ListParagraph')];
    return [para(line)];
  }).join('');
}

function crc32(buf) {
  let crc = -1;
  for (const byte of buf) {
    crc ^= byte;
    for (let i = 0; i < 8; i += 1) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }
  return (crc ^ -1) >>> 0;
}

function dosTimeDate(date = new Date()) {
  const time = (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2);
  const dosDate = ((date.getFullYear() - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate();
  return { time, date: dosDate };
}

function zip(files) {
  const localParts = [];
  const centralParts = [];
  let offset = 0;
  const stamp = dosTimeDate();

  files.forEach(file => {
    const name = Buffer.from(file.name);
    const data = Buffer.from(file.data);
    const compressed = zlib.deflateRawSync(data);
    const crc = crc32(data);

    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0, 6);
    local.writeUInt16LE(8, 8);
    local.writeUInt16LE(stamp.time, 10);
    local.writeUInt16LE(stamp.date, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(compressed.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(name.length, 26);

    localParts.push(local, name, compressed);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0, 8);
    central.writeUInt16LE(8, 10);
    central.writeUInt16LE(stamp.time, 12);
    central.writeUInt16LE(stamp.date, 14);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(compressed.length, 20);
    central.writeUInt32LE(data.length, 24);
    central.writeUInt16LE(name.length, 28);
    central.writeUInt32LE(offset, 42);
    centralParts.push(central, name);

    offset += local.length + name.length + compressed.length;
  });

  const centralSize = centralParts.reduce((n, part) => n + part.length, 0);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(files.length, 8);
  end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(centralSize, 12);
  end.writeUInt32LE(offset, 16);

  return Buffer.concat([...localParts, ...centralParts, end]);
}

function buildResumeDocx(resume) {
  const document = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    ${docParagraphs(resume)}
    <w:sectPr><w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:top="720" w:right="720" w:bottom="720" w:left="720"/></w:sectPr>
  </w:body>
</w:document>`;

  const styles = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:rPr><w:sz w:val="22"/></w:rPr></w:style>
  <w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:rPr><w:b/><w:sz w:val="24"/></w:rPr></w:style>
  <w:style w:type="paragraph" w:styleId="ListParagraph"><w:name w:val="List Paragraph"/><w:pPr><w:ind w:left="360"/></w:pPr></w:style>
</w:styles>`;

  return zip([
    { name: '[Content_Types].xml', data: '<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/></Types>' },
    { name: '_rels/.rels', data: '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>' },
    { name: 'word/_rels/document.xml.rels', data: '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>' },
    { name: 'word/document.xml', data: document },
    { name: 'word/styles.xml', data: styles },
  ]);
}

module.exports = { buildResumeText, buildResumeDocx };
