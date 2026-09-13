export type QuestionType =
  | 'multiple_choice'
  | 'multiple_select'
  | 'true_false'
  | 'short_answer'
  | 'essay'
  | 'coding';

export type Difficulty = 'very_easy' | 'easy' | 'medium' | 'hard' | 'very_hard';

export interface QuestionOption {
  uid: string;
  optionText: string;
  isCorrect: boolean;
  position: number;
}

export interface TestCase {
  uid: string;
  input: string;
  expectedOutput: string;
  isHidden: boolean;
}

export interface Skill {
  uid: string;
  name: string;
  description?: string;
}

export interface Topic {
  uid: string;
  name: string;
  description?: string;
  parentTopic?: Topic;
  children?: Topic[];
  level: number;
}

export interface Question {
  uid: string;
  questionText: string;
  questionType: QuestionType;
  difficulty: Difficulty;
  points: number;
  topic: Topic;
  skills: Skill[];
  options?: QuestionOption[];
  answerText?: string;
  explanation?: string;
  testCases?: TestCase[];
  imageUrl?: string;
  publishedAt?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface SearchParams {
  query?: string;
  topicId?: string;
  difficulty?: Difficulty;
  questionType?: QuestionType;
  skillIds?: string[];
  limit?: number;
  offset?: number;
}

export interface SearchResult {
  questions: Question[];
  total: number;
  hasMore: boolean;
}

export interface PracticePathNode {
  question: Question;
  prerequisites: Question[];
  nextQuestions: Question[];
}

export interface CreateQuestionDto {
  questionText: string;
  questionType: QuestionType;
  difficulty: Difficulty;
  points: number;
  topicId: string;
  skillIds: string[];
  options?: Omit<QuestionOption, 'uid'>[];
  answerText?: string;
  explanation?: string;
  testCases?: Omit<TestCase, 'uid'>[];
  imageUrl?: string;
}

export interface UpdateQuestionDto extends Partial<CreateQuestionDto> {
  uid: string;
}
