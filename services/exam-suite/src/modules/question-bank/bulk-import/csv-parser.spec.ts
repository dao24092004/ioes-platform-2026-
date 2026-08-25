import {
  parseCsv,
  splitCsvField,
  parseOptionsField,
  parseTestCasesField,
  CsvParseError,
} from './csv-parser';

describe('csv-parser', () => {
  describe('parseCsv - basic', () => {
    it('should parse simple CSV with header', () => {
      const csv = 'name,age\nAlice,30\nBob,25';
      const result = parseCsv(csv);

      expect(result.headers).toEqual(['name', 'age']);
      expect(result.rows).toHaveLength(2);
      expect(result.rows[0]).toEqual({
        rowNumber: 2,
        fields: { name: 'Alice', age: '30' },
      });
      expect(result.rows[1]).toEqual({
        rowNumber: 3,
        fields: { name: 'Bob', age: '25' },
      });
      expect(result.delimiter).toBe(',');
    });

    it('should detect TSV delimiter when tabs present', () => {
      const tsv = 'name\tage\nAlice\t30';
      const result = parseCsv(tsv);

      expect(result.delimiter).toBe('\t');
      expect(result.headers).toEqual(['name', 'age']);
      expect(result.rows[0].fields).toEqual({ name: 'Alice', age: '30' });
    });

    it('should throw on empty content', () => {
      expect(() => parseCsv('')).toThrow(CsvParseError);
      expect(() => parseCsv('   ')).toThrow(CsvParseError);
    });

    it('should throw on missing header', () => {
      expect(() => parseCsv('1,2,3')).toThrow(/Missing header/);
    });

    it('should skip empty lines', () => {
      const csv = 'a,b\n1,2\n\n3,4\n';
      const result = parseCsv(csv);
      expect(result.rows).toHaveLength(2);
    });

    it('should handle CRLF line endings', () => {
      const csv = 'a,b\r\n1,2\r\n3,4';
      const result = parseCsv(csv);
      expect(result.rows).toHaveLength(2);
      expect(result.rows[0].fields).toEqual({ a: '1', b: '2' });
    });
  });

  describe('parseCsv - quoted fields', () => {
    it('should handle quoted fields with commas', () => {
      const csv = 'name,desc\n"Smith, John","Hello, world"';
      const result = parseCsv(csv);

      expect(result.rows[0].fields).toEqual({
        name: 'Smith, John',
        desc: 'Hello, world',
      });
    });

    it('should handle escaped quotes (double-double-quote)', () => {
      const csv = 'msg\n"He said ""hi"" to me"';
      const result = parseCsv(csv);

      expect(result.rows[0].fields.msg).toBe('He said "hi" to me');
    });

    it('should handle multi-line quoted values', () => {
      const csv = 'a,b\n1,"line1\nline2"\n3,4';
      const result = parseCsv(csv);

      expect(result.rows).toHaveLength(2);
      expect(result.rows[0].fields.b).toBe('line1\nline2');
    });
  });

  describe('splitCsvField', () => {
    it('should split comma-separated values', () => {
      expect(splitCsvField('a,b,c')).toEqual(['a', 'b', 'c']);
    });

    it('should trim whitespace', () => {
      expect(splitCsvField('  a , b ,  c  ')).toEqual(['a', 'b', 'c']);
    });

    it('should filter empty entries', () => {
      expect(splitCsvField('a,,b,')).toEqual(['a', 'b']);
    });

    it('should return empty array for empty/null', () => {
      expect(splitCsvField('')).toEqual([]);
    });
  });

  describe('parseOptionsField', () => {
    it('should parse standard format', () => {
      const field = 'Paris|true,London|false,Tokyo|false';
      const result = parseOptionsField(field);

      expect(result).toHaveLength(3);
      expect(result[0]).toMatchObject({
        optionText: 'Paris',
        isCorrect: true,
        sortOrder: 0,
      });
      expect(result[1]).toMatchObject({
        optionText: 'London',
        isCorrect: false,
        sortOrder: 1,
      });
    });

    it('should parse with explicit sortOrder and points', () => {
      const field = 'A|true|0|5,B|false|1|5';
      const result = parseOptionsField(field);

      expect(result[0]).toEqual({
        optionText: 'A',
        isCorrect: true,
        sortOrder: 0,
        points: 5,
      });
    });

    it('should handle empty value', () => {
      expect(parseOptionsField('')).toEqual([]);
    });

    it('should be case-insensitive on isCorrect', () => {
      const field = 'A|TRUE,B|False';
      const result = parseOptionsField(field);
      expect(result[0].isCorrect).toBe(true);
      expect(result[1].isCorrect).toBe(false);
    });
  });

  describe('parseTestCasesField', () => {
    it('should parse single test case', () => {
      const field = '1+1|2|true|5';
      const result = parseTestCasesField(field);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        input: '1+1',
        expectedOutput: '2',
        isSample: true,
        points: 5,
      });
    });

    it('should parse multiple cases (|| separator)', () => {
      const field = '1|1|true|5||2|4|false|10';
      const result = parseTestCasesField(field);

      expect(result).toHaveLength(2);
      expect(result[0].input).toBe('1');
      expect(result[1].expectedOutput).toBe('4');
    });

    it('should handle missing points gracefully', () => {
      const field = 'a|b|true';
      const result = parseTestCasesField(field);

      expect(result[0].points).toBeUndefined();
    });
  });
});
