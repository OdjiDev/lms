export interface InvitationCsvRow {
  /** Numéro de ligne dans le fichier (1-based, en-tête incluse). */
  line: number;
  email: string;
  firstName?: string;
  lastName?: string;
  role?: string;
}

const EMAIL_HEADERS = new Set(['email', 'e-mail', 'mail', 'courriel', 'adresse email', 'adresse']);
const FIRST_NAME_HEADERS = new Set(['prenom', 'prénom', 'firstname', 'first name', 'first_name']);
const LAST_NAME_HEADERS = new Set(['nom', 'lastname', 'last name', 'last_name', 'nom de famille']);
const ROLE_HEADERS = new Set(['role', 'rôle']);

/**
 * Parseur CSV minimaliste mais tolérant : séparateur virgule ou point-virgule,
 * champs entre guillemets, retours à la ligne Windows, BOM Excel et en-têtes
 * français accentués.
 */
export function parseInvitationCsv(text: string): InvitationCsvRow[] {
  const clean = text.replace(/^\uFEFF/, '').trim();
  if (!clean) return [];

  const delimiter = detectDelimiter(clean);
  const records = splitRecords(clean, delimiter).filter((record) =>
    record.some((cell) => cell.trim() !== ''),
  );
  if (records.length === 0) return [];

  const first = records[0].map(normalizeHeader);
  const hasHeader =
    first.some((header) => EMAIL_HEADERS.has(header)) ||
    first.some((header) => FIRST_NAME_HEADERS.has(header)) ||
    first.some((header) => LAST_NAME_HEADERS.has(header)) ||
    first.some((header) => ROLE_HEADERS.has(header));

  const columns = hasHeader
    ? {
        email: first.findIndex((header) => EMAIL_HEADERS.has(header)),
        firstName: first.findIndex((header) => FIRST_NAME_HEADERS.has(header)),
        lastName: first.findIndex((header) => LAST_NAME_HEADERS.has(header)),
        role: first.findIndex((header) => ROLE_HEADERS.has(header)),
      }
    : { email: 0, firstName: 1, lastName: 2, role: 3 };

  const rows: InvitationCsvRow[] = [];
  const start = hasHeader ? 1 : 0;

  for (let index = start; index < records.length; index += 1) {
    const cells = records[index];
    const email = (columns.email >= 0 ? cells[columns.email] : '')?.trim() ?? '';
    const firstName = (columns.firstName >= 0 ? cells[columns.firstName] : '')?.trim();
    const lastName = (columns.lastName >= 0 ? cells[columns.lastName] : '')?.trim();
    const role = (columns.role >= 0 ? cells[columns.role] : '')?.trim();

    rows.push({
      line: index + 1,
      email,
      firstName: firstName || undefined,
      lastName: lastName || undefined,
      role: role || undefined,
    });
  }

  return rows;
}

function detectDelimiter(text: string): string {
  const firstLine = text.split(/\r?\n/, 1)[0] ?? '';
  let commas = 0;
  let semicolons = 0;
  let quoted = false;

  for (const char of firstLine) {
    if (char === '"') quoted = !quoted;
    else if (!quoted && char === ',') commas += 1;
    else if (!quoted && char === ';') semicolons += 1;
  }

  return semicolons > commas ? ';' : ',';
}

function splitRecords(text: string, delimiter: string): string[][] {
  const records: string[][] = [];
  let record: string[] = [];
  let cell = '';
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];

    if (quoted) {
      if (char === '"') {
        if (text[index + 1] === '"') {
          cell += '"';
          index += 1;
        } else {
          quoted = false;
        }
      } else {
        cell += char;
      }
      continue;
    }

    if (char === '"') {
      quoted = true;
    } else if (char === delimiter) {
      record.push(cell);
      cell = '';
    } else if (char === '\n') {
      record.push(cell);
      records.push(record);
      record = [];
      cell = '';
    } else if (char !== '\r') {
      cell += char;
    }
  }

  record.push(cell);
  records.push(record);
  return records;
}

function normalizeHeader(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Convertit un rôle lisible (français ou anglais) en rôle Prisma. */
export function parseCsvRole(value: string | undefined): 'ADMIN' | 'INSTRUCTOR' | 'LEARNER' | undefined {
  if (!value) return undefined;
  const normalized = normalizeHeader(value);

  if (['admin', 'administrateur', 'administrator'].includes(normalized)) return 'ADMIN';
  if (['formateur', 'instructeur', 'instructor', 'teacher'].includes(normalized)) return 'INSTRUCTOR';
  if (['apprenant', 'apprenante', 'learner', 'student', 'eleve', 'élève'].includes(normalized)) {
    return 'LEARNER';
  }
  return undefined;
}
