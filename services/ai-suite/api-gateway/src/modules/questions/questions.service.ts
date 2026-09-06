import { Injectable } from '@nestjs/common';
import { Difficulty, QuestionType, createLogger } from '@ioes/common-node';
import { MlWorkerClient } from '../ml-worker/ml-worker.client';
import { GenerateQuestionsDto } from './dto/generate-questions.dto';

/** Đoạn học liệu chống lưng cho một câu hỏi. */
export interface QuestionSource {
  docId: string;
  chunkId: string;
  title: string;
  score: number;
  excerpt: string;
}

export interface GeneratedOption {
  optionText: string;
  isCorrect: boolean;
}

/**
 * Trường đặt trùng tên `CreateQuestionDto` bên exam-suite để giảng viên lưu
 * vào ngân hàng đề là map thẳng, không phải đổi tên qua lại.
 */
export interface GeneratedQuestion {
  questionText: string;
  questionType: QuestionType;
  difficulty: Difficulty;
  options: GeneratedOption[];
  answerText: string | null;
  explanation: string;
  source: QuestionSource;
}

export interface GeneratedQuestionSet {
  questions: GeneratedQuestion[];
  /** Số câu người dùng xin. */
  requested: number;
  /** Số câu thực sự qua được kiểm chứng. */
  returned: number;
  /** Bị loại vì trích nguồn sai hoặc học liệu không chống lưng đáp án. */
  droppedUnverified: number;
  /**
   * False khi học liệu không có nội dung về chủ đề. Khi đó `questions` rỗng
   * và đây KHÔNG phải lỗi — giao diện phải nói rõ là học liệu chưa phủ chủ đề.
   */
  grounded: boolean;
  model: string;
  latencyMs: number;
}

const DEFAULT_COUNT = 5;

/**
 * Điều phối việc sinh câu hỏi.
 *
 * Toàn bộ phần chống bịa nằm bên ml-worker (xem services/questions.py). Ở đây
 * chỉ đổi snake_case sang camelCase và không lưu gì: ngân hàng đề thuộc
 * exam-suite, giảng viên duyệt xong mới gọi sang đó lưu.
 */
@Injectable()
export class QuestionsService {
  private readonly logger = createLogger('QuestionsService');

  constructor(private readonly mlWorker: MlWorkerClient) {}

  async generate(userId: string, dto: GenerateQuestionsDto): Promise<GeneratedQuestionSet> {
    const count = dto.count ?? DEFAULT_COUNT;
    const result = await this.mlWorker.generateQuestions({
      topic: dto.topic,
      question_type: dto.questionType ?? QuestionType.MULTIPLE_CHOICE,
      difficulty: dto.difficulty ?? Difficulty.MEDIUM,
      count,
      language: dto.language ?? 'vi',
      instructions: dto.instructions ?? null,
      top_k: dto.topK ?? null,
    });

    this.logger.log(
      `Sinh câu hỏi userId=${userId} topic="${dto.topic}" ` +
        `xin=${result.requested} nhận=${result.returned} loại=${result.dropped_unverified}`,
    );

    return {
      questions: result.questions.map((q) => ({
        questionText: q.question_text,
        questionType: q.question_type as QuestionType,
        difficulty: q.difficulty as Difficulty,
        options: q.options.map((o) => ({
          optionText: o.option_text,
          isCorrect: o.is_correct,
        })),
        answerText: q.answer_text,
        explanation: q.explanation,
        source: {
          docId: q.source.doc_id,
          chunkId: q.source.chunk_id,
          title: q.source.title,
          score: q.source.score,
          excerpt: q.source.excerpt,
        },
      })),
      requested: result.requested,
      returned: result.returned,
      droppedUnverified: result.dropped_unverified,
      grounded: result.grounded,
      model: result.model,
      latencyMs: result.latency_ms,
    };
  }
}
