import { apiClient, unwrap, type ApiEnvelope } from '@/config/api.config';
import type {
  Question,
  SearchParams,
  SearchResult,
  PracticePathNode,
  CreateQuestionDto,
  UpdateQuestionDto,
  Topic,
} from '@/types/question-bank';

/**
 * Question Bank API client
 * Connects to exam-suite service via API Gateway
 */

const BASE = '/api/v1/question-bank';

/**
 * Search questions với filters
 */
export function searchQuestions(params: SearchParams): Promise<SearchResult> {
  return unwrap(
    apiClient.get<ApiEnvelope<SearchResult>>(`${BASE}/questions/search`, { params })
  );
}

/**
 * Get question detail by ID
 */
export function getQuestion(uid: string): Promise<Question> {
  return unwrap(apiClient.get<ApiEnvelope<Question>>(`${BASE}/questions/${uid}`));
}

/**
 * Get similar questions (based on topic + skills)
 */
export function getSimilarQuestions(uid: string, limit = 5): Promise<Question[]> {
  return unwrap(
    apiClient.get<ApiEnvelope<Question[]>>(`${BASE}/questions/${uid}/similar`, {
      params: { limit },
    })
  );
}

/**
 * Get practice path (knowledge graph)
 * Returns current question + prerequisites + next questions
 */
export function getPracticePath(topicId: string): Promise<PracticePathNode> {
  return unwrap(
    apiClient.get<ApiEnvelope<PracticePathNode>>(`${BASE}/topics/${topicId}/practice`)
  );
}

/**
 * List all topics (tree structure)
 */
export function listTopics(): Promise<Topic[]> {
  return unwrap(apiClient.get<ApiEnvelope<Topic[]>>(`${BASE}/topics`));
}

/**
 * Create new question (Instructor only)
 */
export function createQuestion(data: CreateQuestionDto): Promise<Question> {
  return unwrap(apiClient.post<ApiEnvelope<Question>>(`${BASE}/questions`, data));
}

/**
 * Update existing question (Instructor only)
 */
export function updateQuestion(data: UpdateQuestionDto): Promise<Question> {
  const { uid, ...updateData } = data;
  return unwrap(
    apiClient.patch<ApiEnvelope<Question>>(`${BASE}/questions/${uid}`, updateData)
  );
}

/**
 * Delete question (Instructor only, soft delete)
 */
export function deleteQuestion(uid: string): Promise<void> {
  return unwrap(apiClient.delete<ApiEnvelope<void>>(`${BASE}/questions/${uid}`));
}

export const questionBankApi = {
  searchQuestions,
  getQuestion,
  getSimilarQuestions,
  getPracticePath,
  listTopics,
  createQuestion,
  updateQuestion,
  deleteQuestion,
};
