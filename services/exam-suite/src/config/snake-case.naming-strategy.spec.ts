import { SnakeCaseNamingStrategy } from './snake-case.naming-strategy';

/**
 * Regression coverage for the fix in ADR/defect:
 * "column Exam.courseId does not exist" — TypeORM was deriving
 * camelCase column names while the Flyway schema is snake_case.
 */
describe('SnakeCaseNamingStrategy', () => {
  let strategy: SnakeCaseNamingStrategy;

  beforeEach(() => {
    strategy = new SnakeCaseNamingStrategy();
  });

  it('converts a camelCase property name to snake_case', () => {
    expect(strategy.columnName('courseId', undefined, [])).toBe('course_id');
  });

  it('leaves a single-word property name unchanged', () => {
    expect(strategy.columnName('id', undefined, [])).toBe('id');
  });

  it('passes an explicit custom column name through untouched', () => {
    expect(strategy.columnName('courseId', 'course_ref', [])).toBe(
      'course_ref',
    );
  });
});
