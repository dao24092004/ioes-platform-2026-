import { ApiProperty, PaginatedResponse } from '@ioes/common-node';

/**
 * DTO representing a Question node returned from Dgraph.
 */
export class QuestionDto {
  @ApiProperty({ example: '0x1234' })
  id!: string;

  @ApiProperty({ example: 'What is polymorphism in OOP?' })
  questionText!: string;

  @ApiProperty({ required: false })
  explanation?: string;

  @ApiProperty({ required: false })
  hint?: string;

  @ApiProperty({ example: 'MULTIPLE_CHOICE' })
  questionType!: string;

  @ApiProperty({ example: 'MEDIUM' })
  difficulty!: string;

  @ApiProperty({ required: false, example: 'java' })
  language?: string;

  @ApiProperty({ example: 1 })
  points!: number;

  @ApiProperty({ required: false, example: ['oop', 'polymorphism'] })
  tags?: string[];

  @ApiProperty({ example: 'topic-uuid' })
  topicId!: string;

  @ApiProperty({ required: false, type: [String], example: ['skill-uuid-1'] })
  skillIds?: string[];

  @ApiProperty({ required: false, type: [String] })
  prerequisites?: string[];

  @ApiProperty({ example: '2026-08-23T10:00:00Z' })
  createdAt!: string;

  @ApiProperty({ example: '2026-08-23T10:00:00Z' })
  updatedAt!: string;
}

/**
 * DTO for the paginated search response.
 * Reuses `PaginatedResponse<T>` from @ioes/common-node for consistency.
 */
export class SearchQuestionResponseDto extends PaginatedResponse<QuestionDto> {}

/**
 * DTO for topic tree.
 */
export class TopicDto {
  @ApiProperty({ example: 'topic-uuid' })
  id!: string;

  @ApiProperty({ example: 'Object-Oriented Programming' })
  name!: string;

  @ApiProperty({ example: 'oop' })
  slug!: string;

  @ApiProperty({ required: false })
  description?: string;

  @ApiProperty({ required: false, example: 'parent-topic-uuid' })
  parentTopicId?: string;

  @ApiProperty({ type: [TopicDto], required: false })
  subTopics?: TopicDto[];
}

/**
 * DTO for practice path response (graph traversal result).
 */
export class PracticePathQuestionDto {
  @ApiProperty({ example: 'question-uuid' })
  id!: string;

  @ApiProperty({ example: 'What is inheritance?' })
  questionText!: string;

  @ApiProperty({ example: 'MEDIUM' })
  difficulty!: string;

  @ApiProperty({ example: 5 })
  order!: number;

  @ApiProperty({ required: false })
  rationale?: string;
}

export class PracticePathDto {
  @ApiProperty({ example: 'topic-uuid' })
  topicId!: string;

  @ApiProperty({ example: 'Object-Oriented Programming' })
  topicName!: string;

  @ApiProperty({ type: [PracticePathQuestionDto] })
  questions!: PracticePathQuestionDto[];
}
