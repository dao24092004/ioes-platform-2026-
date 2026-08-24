/**
 * Lightweight CSV/TSV parser cho bulk import.
 *
 * Supports:
 * - Comma (CSV) hoặc Tab (TSV) delimiter (auto-detect)
 * - Quoted fields với double-quotes: "hello, world", "say ""hi"""
 * - Multi-line values (cho explanation field)
 * - Header row tự động parse
 *
 * NOTE: Dùng cho bulk import files nội bộ (instructor upload),
 * không phải parser production-grade. Cho file lớn (> 10MB) nên dùng
 * dedicated lib (csv-parse, papaparse).
 */

export interface ParsedRow {
  rowNumber: number;
  fields: Record<string, string>;
}

export interface ParsedCsv {
  headers: string[];
  rows: ParsedRow[];
  delimiter: ',' | '\t';
}

export class CsvParseError extends Error {
  constructor(
    message: string,
    public readonly rowNumber?: number,
  ) {
    super(message);
    this.name = 'CsvParseError';
  }
}

/**
 * Parse CSV/TSV text thành rows.
 *
 * Auto-detect delimiter:
 * - Nếu tab nhiều hơn comma ở header → TSV
 * - Else comma → CSV
 */
export function parseCsv(content: string): ParsedCsv {
  if (!content || content.trim().length === 0) {
    throw new CsvParseError('Empty content');
  }

  const delimiter = detectDelimiter(content);
  const lines = splitIntoLines(content, delimiter);

  if (lines.length === 0) {
    throw new CsvParseError('No content after parsing');
  }

  const headerLine = lines[0];
  const headers = parseLine(headerLine, delimiter).map((h) => h.trim());

  if (headers.length === 0 || headers.every((h) => h === '')) {
    throw new CsvParseError('Missing header row');
  }

  const rows: ParsedRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue; // skip empty lines

    const fields = parseLine(line, delimiter);
    const fieldMap: Record<string, string> = {};
    for (let j = 0; j < headers.length; j++) {
      fieldMap[headers[j]] = (fields[j] ?? '').trim();
    }
    rows.push({ rowNumber: i + 1, fields: fieldMap });
  }

  return { headers, rows, delimiter };
}

/**
 * Auto-detect delimiter: count tab vs comma ở header line.
 */
function detectDelimiter(content: string): ',' | '\t' {
  const firstLineEnd = content.indexOf('\n');
  const firstLine = firstLineEnd === -1 ? content : content.slice(0, firstLineEnd);
  const tabs = (firstLine.match(/\t/g) ?? []).length;
  const commas = (firstLine.match(/,/g) ?? []).length;
  return tabs > commas ? '\t' : ',';
}

/**
 * Split content thành lines - xử lý multi-line quoted values.
 */
function splitIntoLines(content: string, _delimiter: ',' | '\t'): string[] {
  const lines: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < content.length; i++) {
    const ch = content[i];
    if (ch === '"') {
      // Double-quote escapes: "field""with""quotes" → field"with"quotes
      if (inQuotes && content[i + 1] === '"') {
        current += '""';
        i++;
        continue;
      }
      inQuotes = !inQuotes;
      current += ch;
    } else if (ch === '\n' && !inQuotes) {
      lines.push(current);
      current = '';
    } else if (ch === '\r' && !inQuotes) {
      // Skip \r - handles \r\n line endings
      continue;
    } else {
      current += ch;
    }
  }
  if (current.length > 0) {
    lines.push(current);
  }
  return lines;
}

/**
 * Parse 1 line thành fields, xử lý quoted values.
 */
function parseLine(line: string, delimiter: ',' | '\t'): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
        continue;
      }
      inQuotes = !inQuotes;
    } else if (ch === delimiter && !inQuotes) {
      fields.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  fields.push(current);
  return fields;
}

/**
 * Helper: split comma-separated value into array.
 * VD: "tag1,tag2,tag3" → ["tag1", "tag2", "tag3"]
 */
export function splitCsvField(value: string, sep = ','): string[] {
  if (!value) return [];
  return value
    .split(sep)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

/**
 * Helper: parse option field format.
 * Format: "Option A|false,Option B|true,Option C|false"
 * Mỗi entry: text|isCorrect|sortOrder|points (sortOrder/points optional)
 */
export function parseOptionsField(
  value: string,
): Array<{
  optionText: string;
  isCorrect: boolean;
  sortOrder?: number;
  points?: number;
}> {
  if (!value) return [];
  return value.split(',').map((entry, idx) => {
    const parts = entry.split('|').map((s) => s.trim());
    const optionText = parts[0] ?? '';
    const isCorrect = parts[1]?.toLowerCase() === 'true';
    const sortOrder = parts[2] ? Number(parts[2]) : idx;
    const points = parts[3] ? Number(parts[3]) : undefined;
    const result: {
      optionText: string;
      isCorrect: boolean;
      sortOrder?: number;
      points?: number;
    } = { optionText, isCorrect, sortOrder };
    if (points !== undefined && !Number.isNaN(points)) {
      result.points = points;
    }
    return result;
  });
}

/**
 * Helper: parse test cases field format.
 * Format: "input|expected|sample|points" per case
 */
export function parseTestCasesField(
  value: string,
): Array<{
  input: string;
  expectedOutput: string;
  isSample: boolean;
  points?: number;
}> {
  if (!value) return [];
  return value.split('||').map((entry) => {
    const parts = entry.split('|').map((s) => s.trim());
    const input = parts[0] ?? '';
    const expectedOutput = parts[1] ?? '';
    const isSample = parts[2]?.toLowerCase() === 'true';
    const points = parts[3] ? Number(parts[3]) : undefined;
    const result: {
      input: string;
      expectedOutput: string;
      isSample: boolean;
      points?: number;
    } = { input, expectedOutput, isSample };
    if (points !== undefined && !Number.isNaN(points)) {
      result.points = points;
    }
    return result;
  });
}
