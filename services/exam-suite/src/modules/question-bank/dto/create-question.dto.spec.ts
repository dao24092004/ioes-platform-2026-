import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { QuestionType, Difficulty } from '@ioes/common-node';
import { CreateQuestionDto, QuestionOptionDto } from '../create-question.dto';

describe('CreateQuestionDto - MCQ Validation (BUG #73 fix)', () => {
  const validDto = () => ({
    questionText: 'What is polymorphism in OOP?',
    questionType: QuestionType.MULTIPLE_CHOICE,
    difficulty: Difficulty.MEDIUM,
    points: 5,
    topicId: '550e8400-e29b-41d4-a716-446655440000',
    options: [
      { optionText: 'Ability to take many forms', isCorrect: true, sortOrder: 0 },
      { optionText: 'Single form only', isCorrect: false, sortOrder: 1 },
      { optionText: 'Compile-time error', isCorrect: false, sortOrder: 2 },
    ],
  });

  it('should_pass_When_validMCQ', async () => {
    const dto = plainToInstance(CreateQuestionDto, validDto());
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('should_fail_When_mcqNoCorrectAnswer', async () => {
    const dto = plainToInstance(CreateQuestionDto, {
      ...validDto(),
      options: [
        { optionText: 'Wrong', isCorrect: false },
        { optionText: 'Also wrong', isCorrect: false },
      ],
    });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    const messages = errors.map((e) => Object.values(e.constraints ?? {}).join(' '));
    expect(messages.join(' ')).toMatch(/at least 1.*isCorrect/);
  });

  it('should_fail_When_mcqMultipleCorrect', async () => {
    const dto = plainToInstance(CreateQuestionDto, {
      ...validDto(),
      options: [
        { optionText: 'A', isCorrect: true },
        { optionText: 'B', isCorrect: true }, // ← multiple correct
      ],
    });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('should_fail_When_mcqTooFewOptions', async () => {
    const dto = plainToInstance(CreateQuestionDto, {
      ...validDto(),
      options: [{ optionText: 'Only one', isCorrect: true }],
    });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('should_fail_When_codingMissingTestCases', async () => {
    const dto = plainToInstance(CreateQuestionDto, {
      ...validDto(),
      questionType: QuestionType.CODING,
      options: undefined,
      testCases: undefined,
    });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('should_pass_When_codingHasTestCases', async () => {
    const dto = plainToInstance(CreateQuestionDto, {
      ...validDto(),
      questionType: QuestionType.CODING,
      options: undefined,
      testCases: [
        { input: '1 2', expectedOutput: '3', isSample: true },
        { input: '5 7', expectedOutput: '12' },
      ],
    });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('should_fail_When_essayHasOptions', async () => {
    const dto = plainToInstance(CreateQuestionDto, {
      ...validDto(),
      questionType: QuestionType.ESSAY,
      options: undefined,
    });
    // ESSAY without options → OK
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('should_fail_When_essayWithOptions', async () => {
    const dto = plainToInstance(CreateQuestionDto, {
      ...validDto(),
      questionType: QuestionType.ESSAY,
      options: [
        { optionText: 'Essay option?', isCorrect: true }, // ← should fail
      ],
    });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('should_fail_When_tagsDuplicate', async () => {
    const dto = plainToInstance(CreateQuestionDto, {
      ...validDto(),
      tags: ['oop', 'oop', 'java'],
    });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('should_fail_When_tagsExceedMax', async () => {
    const dto = plainToInstance(CreateQuestionDto, {
      ...validDto(),
      tags: Array.from({ length: 25 }, (_, i) => `tag${i}`), // > 20
    });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('should_fail_When_skillIdsExceedMax', async () => {
    const dto = plainToInstance(CreateQuestionDto, {
      ...validDto(),
      skillIds: Array.from({ length: 60 }, () => '550e8400-e29b-41d4-a716-446655440000'),
    });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('should_fail_When_topicIdNotUUID', async () => {
    const dto = plainToInstance(CreateQuestionDto, {
      ...validDto(),
      topicId: 'not-a-uuid',
    });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('should_fail_When_invalidQuestionType', async () => {
    const dto = plainToInstance(CreateQuestionDto, {
      ...validDto(),
      questionType: 'INVALID_TYPE' as any,
    });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('should_fail_When_invalidDifficulty', async () => {
    const dto = plainToInstance(CreateQuestionDto, {
      ...validDto(),
      difficulty: 'SUPER_HARD' as any,
    });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('should_pass_When_multiSelectMultipleCorrect', async () => {
    const dto = plainToInstance(CreateQuestionDto, {
      ...validDto(),
      questionType: QuestionType.MULTIPLE_SELECT,
      options: [
        { optionText: 'A', isCorrect: true },
        { optionText: 'B', isCorrect: true },
        { optionText: 'C', isCorrect: false },
      ],
    });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });
});