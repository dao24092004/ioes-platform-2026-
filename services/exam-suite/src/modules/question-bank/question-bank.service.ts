import { Injectable } from '@nestjs/common';
import { StructuredLogger } from '@ioes/common-node';
import { DgraphClient } from './dgraph.client';
import { SearchQuestionDto } from './dto/search-question.dto';
import {
  QuestionDto,
  SearchQuestionResponseDto,
  PracticePathDto,
  PracticePathQuestionDto,
  TopicDto,
} from './dto/question.dto';
import {
  SEARCH_QUESTIONS_QUERY,
  GET_QUESTION_QUERY,
  LIST_ROOT_TOPICS_QUERY,
  PRACTICE_PATH_QUERY,
  SIMILAR_QUESTIONS_QUERY,
} from './graphql/queries';
import { Cache } from '@ioes/common-node';

interface DgraphQuestionNode {
  id: string;
  questionText: string;
  hint?: string;
  explanation?: string;
  questionType: string;
  difficulty: string;
  language?: string;
  points: number;
  estimatedTimeSeconds?: number;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
  topic?: { id: string; name: string; slug: string };
  requiresSkills?: Array<{ id: string; name: string; slug: string }>;
  prerequisites?: Array<{ id: string; questionText: string; difficulty: string }>;
  dependents?: Array<{ id: string; questionText: string; difficulty: string }>;
  options?: Array<{
    id: string;
    optionText: string;
    isCorrect: boolean;
    sortOrder: number;
    points?: number;
    explanation?: string;
  }>;
  testCases?: Array<{
    id: string;
    input: string;
    expectedOutput: string;
    isSample: boolean;
    points?: number;
  }>;
  similarQuestions?: Array<DgraphQuestionNode>;
}

interface SearchResponse {
  queryQuestion: DgraphQuestionNode[];
  aggregateQuestion: { count: number };
}

interface GetQuestionResponse {
  getQuestion: DgraphQuestionNode;
}

interface ListTopicsResponse {
  queryTopic: Array<{
    id: string;
    name: string;
    slug: string;
    description?: string;
    parentTopic?: { id: string };
    subTopics?: Array<{
      id: string;
      name: string;
      slug: string;
      description?: string;
      parentTopic?: { id: string };
      subTopics?: Array<{
        id: string;
        name: string;
        slug: string;
        description?: string;
        parentTopic?: { id: string };
      }>;
    }>;
  }>;
}

interface PracticePathResponse {
  getTopic: {
    id: string;
    name: string;
    slug: string;
    questions: Array<{
      id: string;
      questionText: string;
      difficulty: string;
      prerequisites?: Array<{ id: string; questionText: string; difficulty: string }>;
      requiresSkills?: Array<{ name: string }>;
    }>;
    subTopics?: Array<{
      id: string;
      name: string;
      questions: Array<{
        id: string;
        questionText: string;
        difficulty: string;
      }>;
    }>;
  };
}

interface SimilarResponse {
  getQuestion: {
    similarQuestions: DgraphQuestionNode[];
    topic: {
      questions: DgraphQuestionNode[];
    };
  };
}

/**
 * Service: Question Bank business logic.
 *
 * Read-side operations against Dgraph (Graph NoSQL).
 * CQRS: write-side stays in PostgreSQL (separate module), Dgraph is
 * eventually consistent mirror used for full-text search + graph traversal.
 *
 * @see docs/02-architecture/adr/ADR-001-use-dgraph-for-question-bank.md
 */
@Injectable()
export class QuestionBankService {
  private readonly logger = new StructuredLogger(QuestionBankService.name);

  constructor(private readonly dgraph: DgraphClient) {}

  /**
   * Search questions with full-text query and multi-filter.
   */
  async searchQuestions(
    dto: SearchQuestionDto,
  ): Promise<SearchQuestionResponseDto> {
    const page = dto.page ?? 1;
    const limit = dto.limit ?? 20;
    const offset = (page - 1) * limit;
    const filters = this.buildFilter(dto);

    const variables = {
      filters,
      limit,
      offset,
    };

    this.logger.debug(
      `searchQuestions: q="${dto.q ?? ''}", filters=${JSON.stringify(filters)}`,
    );

    const data = await this.dgraph.query<SearchResponse>(
      SEARCH_QUESTIONS_QUERY,
      variables,
    );

    const items: QuestionDto[] = (data.queryQuestion ?? []).map((n) =>
      this.toQuestionDto(n),
    );
    const total = data.aggregateQuestion?.count ?? items.length;

    return {
      items,
      total,
      page,
      limit,
    } as any;
  }

  /**
   * Get single question by ID with all relations expanded.
   *
   * BUG #90 fix: cached 10 minutes - question content stable.
   */
  @Cache({ ttl: 600, keyPrefix: 'question' })
  async getQuestion(id: string): Promise<QuestionDto | null> {
    const data = await this.dgraph.query<GetQuestionResponse>(
      GET_QUESTION_QUERY,
      { id },
    );
    return data.getQuestion ? this.toQuestionDto(data.getQuestion) : null;
  }

  /**
   * Get topic tree (root topics with sub-topics nested 2 levels).
   * Dgraph GraphQL doesn't support `isNull: parentTopic` filter, so we
   * filter root topics client-side.
   *
   * BUG #90 fix: cached 5 minutes - topic tree rarely changes.
   */
  @Cache({ ttl: 300, keyPrefix: 'topic-tree' })
  async getTopicTree(): Promise<TopicDto[]> {
    const data = await this.dgraph.query<ListTopicsResponse>(
      LIST_ROOT_TOPICS_QUERY,
    );
    return (data.queryTopic ?? [])
      .filter((t) => !t.parentTopic) // keep only root topics
      .map((t) => this.toTopicDto(t));
  }

  /**
   * Build practice path for a topic.
   * Combines: prerequisites first → main topic questions → sub-topic questions.
   * Result is sorted by difficulty so students can follow natural learning order.
   */
  async getPracticePath(topicId: string): Promise<PracticePathDto | null> {
    const data = await this.dgraph.query<PracticePathResponse>(
      PRACTICE_PATH_QUERY,
      { topicId },
    );

    const topic = data.getTopic;
    if (!topic) {
      return null;
    }

    const order = { 1: 5, 2: 4, 3: 3, 4: 2, 5: 1 } as Record<string, number>; // VERY_EASY→5 ... VERY_HARD→1
    const questionsMap = new Map<string, PracticePathQuestionDto>();

    topic.questions?.forEach((q) => {
      const difficulty = q.difficulty;
      const orderValue = order[difficulty] ?? 3;
      questionsMap.set(q.id, {
        id: q.id,
        questionText: q.questionText,
        difficulty: difficulty,
        order: orderValue,
        rationale: q.requiresSkills?.length
          ? `Cần kiến thức: ${q.requiresSkills.map((s) => s.name).join(', ')}`
          : undefined,
      } as PracticePathQuestionDto);
    });

    // Add sub-topic questions (slightly later in path)
    let subTopicIndex = 1;
    topic.subTopics?.forEach((st) => {
      st.questions.forEach((q) => {
        if (!questionsMap.has(q.id)) {
          questionsMap.set(q.id, {
            id: q.id,
            questionText: q.questionText,
            difficulty: q.difficulty,
            order: 2.5 + subTopicIndex / 100,
            rationale: `Chuyên đề: ${st.name}`,
          });
        }
      });
      subTopicIndex++;
    });

    const sorted = Array.from(questionsMap.values()).sort(
      (a, b) => b.order - a.order,
    );

    return {
      topicId: topic.id,
      topicName: topic.name,
      questions: sorted,
    };
  }

  /**
   * Get up to `limit` questions similar to the given question.
   * Combines: explicit `similarQuestions` edges + same-topic fallback.
   * Excludes the source question itself.
   */
  async getSimilarQuestions(
    questionId: string,
    limit: number = 5,
  ): Promise<QuestionDto[]> {
    const data = await this.dgraph.query<SimilarResponse>(
      SIMILAR_QUESTIONS_QUERY,
      { id: questionId, limit },
    );

    const seen = new Set<string>([questionId]);
    const out: QuestionDto[] = [];

    for (const n of data.getQuestion?.similarQuestions ?? []) {
      if (!seen.has(n.id) && out.length < limit) {
        seen.add(n.id);
        out.push(this.toQuestionDto(n));
      }
    }
    for (const n of data.getQuestion?.topic?.questions ?? []) {
      if (!seen.has(n.id) && out.length < limit) {
        seen.add(n.id);
        out.push(this.toQuestionDto(n));
      }
    }

    return out;
  }

  // ========================================================================
  // mappers: Dgraph → DTO
  // ========================================================================

  private toQuestionDto(n: DgraphQuestionNode): QuestionDto {
    return {
      id: n.id,
      questionText: n.questionText,
      hint: n.hint,
      explanation: n.explanation,
      questionType: n.questionType,
      difficulty: n.difficulty,
      language: n.language,
      points: n.points,
      tags: n.tags,
      topicId: n.topic?.id ?? '',
      skillIds: n.requiresSkills?.map((s) => s.id),
      prerequisites: n.prerequisites?.map((p) => p.id),
      createdAt: n.createdAt,
      updatedAt: n.updatedAt,
    };
  }

  private toTopicDto(t: {
    id: string;
    name: string;
    slug: string;
    description?: string;
    parentTopic?: { id: string };
    subTopics?: Array<{
      id: string;
      name: string;
      slug: string;
      description?: string;
      parentTopic?: { id: string };
      subTopics?: Array<{
        id: string;
        name: string;
        slug: string;
        description?: string;
        parentTopic?: { id: string };
      }>;
    }>;
  }): TopicDto {
    return {
      id: t.id,
      name: t.name,
      slug: t.slug,
      description: t.description,
      parentTopicId: t.parentTopic?.id,
      subTopics: t.subTopics?.map((st) => this.toTopicDto(st)),
    };
  }

  // ========================================================================
  // helpers
  // ========================================================================

  private buildFilter(dto: SearchQuestionDto): Record<string, unknown> {
    const filters: Record<string, unknown> = {
      not: { has: { deletedAt: true } },
    };

    if (dto.q && dto.q.trim()) {
      filters['questionText'] = {
        anyoftext: dto.q.trim(),
      };
    }
    if (dto.questionType) {
      filters['questionType'] = { eq: dto.questionType };
    }
    if (dto.difficulty) {
      filters['difficulty'] = { eq: dto.difficulty };
    }
    if (dto.topicId) {
      filters['topic'] = { id: { eq: dto.topicId } };
    }
    if (dto.language) {
      filters['language'] = { eq: dto.language };
    }

    return filters;
  }
}
