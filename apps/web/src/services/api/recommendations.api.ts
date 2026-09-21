import { apiClient, unwrap, FAST_READ_TIMEOUT_MS, type ApiEnvelope } from '@/config/api.config';

/**
 * FR-AI-002 — gợi ý khoá học (embedding + luật, không gọi LLM).
 *
 * Gateway khai `Path=/api/ai/**` kèm `StripPrefix=2`, nên
 * `/api/ai/recommendations/courses` ở đây tới ai-gateway thành
 * `/recommendations/courses`. Gateway kiểm JWT rồi chèn `X-User-Id`, vì vậy
 * client không tự gắn user id — cứ gọi là ra gợi ý của người đang đăng nhập.
 *
 * Hợp đồng: `docs/02-architecture/AI_FEATURES_CONTRACT.md` §1.
 */

const BASE = '/api/ai/recommendations';

/** Số gợi ý mặc định, khớp `limit=6` trong hợp đồng. */
export const DEFAULT_RECOMMENDATION_LIMIT = 6;

/**
 * Lý do máy chọn khoá này. Dùng để gắn nhãn ngắn; câu giải thích cho người
 * đọc nằm ở `reason` (do backend sinh, web không tự viết lại).
 */
export type RecommendationReasonCode =
  | 'SAME_CATEGORY'
  | 'SIMILAR_CONTENT'
  | 'NEXT_LEVEL'
  | 'POPULAR'
  | 'NEW';

/**
 * Một khoá được gợi ý. ai-gateway đã ghép sẵn thông tin khoá từ
 * content-service nên web hiển thị được ngay, không phải gọi thêm.
 *
 * `level`, `durationHours`, `price`, `currency` để `null` được vì cột tương
 * ứng bên content-service (`difficulty_level`, `duration_hours`, `price`,
 * `currency`) cho phép null; giao diện bỏ qua trường thiếu chứ không tự điền.
 */
export interface CourseRecommendation {
  courseId: string;
  title: string;
  thumbnailUrl: string | null;
  categoryId: string | null;
  /** 1..5, cùng thang `difficultyLevel` của content-service. */
  level: number | null;
  durationHours: number | null;
  /** 0 hoặc null nghĩa là khoá miễn phí. */
  price: number | null;
  currency: string | null;
  /** Độ phù hợp 0..1 do ml-worker tính. */
  score: number;
  /** Câu giải thích cho người dùng, tiếng Việt, do backend sinh. */
  reason: string;
  reasonCode: RecommendationReasonCode;
}

export interface CourseRecommendations {
  items: CourseRecommendation[];
  /** Ví dụ `embedding+rules`; hiện để đối chiếu khi gỡ lỗi. */
  strategy: string;
  generatedAt: string;
}

/**
 * Gợi ý khoá học cho người đang đăng nhập.
 *
 * Học viên mới chưa ghi danh khoá nào vẫn nhận được khoá phổ biến
 * (`reasonCode: POPULAR`), nên `items` rỗng nghĩa là backend thật sự không có
 * gì để gợi ý — không phải "chưa học nên chưa có".
 *
 * Tự truyền `timeout` thay vì dùng mặc định 120s của apiClient: endpoint này
 * chỉ tra embedding có sẵn rồi ghép thông tin khoá, không gọi LLM. Để 120s thì
 * ai-gateway chết là người dùng phải nhìn vòng quay suốt hai phút mới thấy lỗi.
 */
export function getCourseRecommendations(
  limit: number = DEFAULT_RECOMMENDATION_LIMIT,
): Promise<CourseRecommendations> {
  return unwrap(
    apiClient.get<ApiEnvelope<CourseRecommendations>>(`${BASE}/courses`, {
      params: { limit },
      timeout: FAST_READ_TIMEOUT_MS,
    }),
  );
}

export const recommendationsApi = { getCourseRecommendations };
