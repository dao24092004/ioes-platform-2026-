import {
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import { QuestionType } from '@ioes/common-node';

/**
 * Validate options array phù hợp với questionType.
 *
 * Rules:
 * - MULTIPLE_CHOICE / TRUE_FALSE / MULTIPLE_SELECT: cần 2+ options, ít nhất 1 correct
 * - ESSAY / SHORT_ANSWER: KHÔNG options
 * - CODING: cần 1+ testCases
 */
@ValidatorConstraint({ name: 'QuestionTypeOptionsMatch', async: false })
export class QuestionTypeOptionsMatchConstraint
  implements ValidatorConstraintInterface
{
  validate(_value: unknown, args: ValidationArguments): boolean {
    const obj = args.object as Record<string, unknown>;
    const questionType = obj.questionType as QuestionType;
    const options = obj.options as
      | Array<{ isCorrect?: boolean }>
      | undefined;
    const testCases = obj.testCases as unknown[] | undefined;

    if (!questionType) return true; // skip nếu chưa có questionType (validator khác sẽ check)

    switch (questionType) {
      case QuestionType.MULTIPLE_CHOICE:
      case QuestionType.MULTIPLE_SELECT:
      case QuestionType.TRUE_FALSE: {
        if (!options || options.length < 2) return false;
        const correctCount = options.filter((o) => o.isCorrect).length;
        if (questionType !== QuestionType.MULTIPLE_SELECT && correctCount !== 1) {
          // MCQ/TF chỉ được 1 correct
          return false;
        }
        if (questionType === QuestionType.MULTIPLE_SELECT && correctCount < 1) {
          return false;
        }
        return true;
      }

      case QuestionType.ESSAY:
      case QuestionType.SHORT_ANSWER:
        // KHÔNG có options
        return !options || options.length === 0;

      case QuestionType.CODING:
        // CODING cần testCases
        if (!testCases || testCases.length === 0) return false;
        // CODING KHÔNG có options
        return !options || options.length === 0;

      default:
        return true;
    }
  }

  defaultMessage(args: ValidationArguments): string {
    const obj = args.object as Record<string, unknown>;
    const qt = obj.questionType as QuestionType;
    switch (qt) {
      case QuestionType.MULTIPLE_CHOICE:
        return 'MULTIPLE_CHOICE requires 2+ options with exactly 1 correct answer';
      case QuestionType.MULTIPLE_SELECT:
        return 'MULTIPLE_SELECT requires 2+ options with at least 1 correct answer';
      case QuestionType.TRUE_FALSE:
        return 'TRUE_FALSE requires 2 options (true/false) with exactly 1 correct';
      case QuestionType.CODING:
        return 'CODING requires at least 1 testCase and no options';
      case QuestionType.ESSAY:
      case QuestionType.SHORT_ANSWER:
        return 'ESSAY/SHORT_ANSWER cannot have options';
      default:
        return 'Invalid questionType-options combination';
    }
  }
}

/**
 * Decorator để validate questionType vs options/testCases consistency.
 *
 * @example
 * ```ts
 * class CreateQuestionDto {
 *   @IsEnum(QuestionType)
 *   questionType!: QuestionType;
 *
 *   @QuestionTypeOptionsMatch()
 *   options?: QuestionOptionDto[];
 * }
 * ```
 */
export function QuestionTypeOptionsMatch(
  validationOptions?: ValidationOptions,
): PropertyDecorator {
  return (object: object, propertyName: string | symbol) => {
    registerDecorator({
      name: 'QuestionTypeOptionsMatch',
      target: object.constructor,
      propertyName: propertyName as string,
      options: validationOptions,
      validator: QuestionTypeOptionsMatchConstraint,
    });
  };
}

/**
 * Validate options array: MCQ phải có đúng 1 correct, multi-select ≥ 1 correct.
 */
@ValidatorConstraint({ name: 'HasCorrectAnswer', async: false })
export class HasCorrectAnswerConstraint implements ValidatorConstraintInterface {
  validate(options?: Array<{ isCorrect?: boolean }>): boolean {
    if (!options || options.length === 0) return true;
    return options.some((o) => o.isCorrect === true);
  }

  defaultMessage(): string {
    return 'Options must have at least 1 option with isCorrect=true';
  }
}

export function HasCorrectAnswer(
  validationOptions?: ValidationOptions,
): PropertyDecorator {
  return (object: object, propertyName: string | symbol) => {
    registerDecorator({
      name: 'HasCorrectAnswer',
      target: object.constructor,
      propertyName: propertyName as string,
      options: validationOptions,
      validator: HasCorrectAnswerConstraint,
    });
  };
}