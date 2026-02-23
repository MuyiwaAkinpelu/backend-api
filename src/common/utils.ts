import { removeStopwords, eng } from 'stopword';

export function getDayWindow(date = new Date()) {
  const start = new Date(date);
  start.setUTCHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setUTCHours(23, 59, 59, 999);

  return { start, end };
}

export function extractDescription(content: string): string {
  if (!content) return '';
  const words = content.split(/\s+/);
  if (words.length <= 80) {
    return words.join(' ');
  }

  let splitIndex = 110;
  let found = false;
  for (let i = Math.min(words.length - 1, 110); i >= 80; i--) {
    if (words[i].endsWith('.')) {
      splitIndex = i + 1;
      found = true;
      break;
    }
  }

  if (!found) {
    splitIndex = 100; // fallback to 100 if no full stop in range
  }

  return words.slice(0, splitIndex).join(' ');
}

// Additional file naming conventions to filter (not covered by standard stop words)
const FILE_NOISE_WORDS = new Set([
  'vf',
  'v1',
  'v2',
  'v3',
  'v4',
  'v5',
  'draft',
  'final',
  'copy',
  'new',
  'old',
  'rev',
  'version',
  'ver',
  'update',
  'updated',
  'edit',
  'edited',
]);

export function extractKeywords(filename: string): string[] {
  const words = filename
    .replace(/\.[^/.]+$/, '') // remove file extension
    .split(/[\s-_]+/) // split on spaces, dashes, underscores
    .filter((word) => {
      if (!word) return false;

      // Filter out date patterns like 20230731, 20250603
      if (/^\d{8}$/.test(word)) return false;

      // Filter out parenthetical numbers like (1), (2), (3)
      if (/^\(\d+\)$/.test(word)) return false;

      // Filter out pure numbers and very short tokens
      if (/^\d+$/.test(word)) return false;
      if (word.length < 2) return false;

      // Filter out timestamp patterns like 07.32.19
      if (/^\d{2}\.\d{2}\.\d{2}$/.test(word)) return false;

      // Filter out file naming noise words
      if (FILE_NOISE_WORDS.has(word.toLowerCase())) return false;

      return true;
    });

  // Use stopword package to remove standard English stop words
  return removeStopwords(words, eng);
}

export function cleanFilename(filename: string): string {
  return extractKeywords(filename).join(' ');
}

export function normalizeIp(ip?: string): string | undefined {
  if (!ip) return ip;

  // Handle IPv4-mapped IPv6
  if (ip.startsWith('::ffff:')) {
    return ip.replace('::ffff:', '');
  }

  return ip;
}
