import { DefaultNamingStrategy, NamingStrategyInterface } from 'typeorm';

/**
 * Converts a camelCase (or PascalCase) identifier to snake_case.
 * e.g. "courseId" -> "course_id", "id" -> "id", "URLPath" -> "url_path".
 */
function toSnakeCase(str: string): string {
  return str
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1_$2')
    .toLowerCase();
}

/**
 * Naming strategy that converts camelCase entity property paths to
 * snake_case database identifiers.
 *
 * Why this exists: the Flyway migrations under
 * `database/migrations/exam-service/` create snake_case columns
 * (e.g. `course_id`, `exam_id`), but TypeORM's DefaultNamingStrategy
 * derives column/relation names verbatim from entity property names,
 * which are camelCase (e.g. `courseId`). Without this strategy wired
 * into `TypeOrmModule.forRootAsync` (see app.module.ts), queries built
 * from entity metadata reference columns that do not exist
 * ("column Exam.courseId does not exist").
 *
 * Deliberately NOT the `typeorm-naming-strategies` package — this is a
 * small local implementation to avoid adding a new dependency.
 *
 * An explicitly provided `customName` (i.e. `@Column({ name: '...' })`)
 * always wins and is returned untouched, matching TypeORM's own
 * contract for `NamingStrategyInterface.columnName`.
 */
export class SnakeCaseNamingStrategy
  extends DefaultNamingStrategy
  implements NamingStrategyInterface
{
  columnName(
    propertyName: string,
    customName: string | undefined,
    embeddedPrefixes: string[],
  ): string {
    const prefix = embeddedPrefixes.map((p) => toSnakeCase(p)).join('_');
    if (customName) {
      return prefix ? `${prefix}_${customName}` : customName;
    }
    const base = toSnakeCase(propertyName);
    return prefix ? `${prefix}_${base}` : base;
  }

  relationName(propertyName: string): string {
    return toSnakeCase(propertyName);
  }

  joinColumnName(relationName: string, referencedColumnName: string): string {
    return toSnakeCase(`${relationName}_${referencedColumnName}`);
  }

  joinTableColumnName(
    tableName: string,
    propertyName: string,
    columnName?: string,
  ): string {
    return toSnakeCase(`${tableName}_${columnName || propertyName}`);
  }
}
