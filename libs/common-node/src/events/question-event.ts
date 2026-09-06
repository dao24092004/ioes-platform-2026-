import { QuestionType, Difficulty } from './question-types';

/**
 * Payload schema for Question events (Kafka).
 * Phải stable - đổi field nào thì bump eventVersion.
 */
export interface QuestionEventPayload {
  id: string;
  questionText: string;
  questionType: QuestionType | string;
  difficulty: Difficulty | string;
  points: number;
  language?: string;
  hint?: string;
  explanation?: string;
  estimatedTimeSeconds?: number;
  tags?: string[];
  topicId?: string;
  skillIds?: string[];
  prerequisites?: string[];
  publishedAt?: string;
  createdBy: string;
  updatedBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface QuestionDeletedPayload {
  id: string;
  deletedAt: string;
  deletedBy: string;
}
