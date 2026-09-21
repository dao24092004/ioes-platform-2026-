import { apiClient, unwrap, FAST_READ_TIMEOUT_MS, type ApiEnvelope } from '@/config/api.config';

/**
 * FR-AI-005 — lộ trình học cá nhân hoá (Agentic RAG, 5 tác tử, Gemini).
 *
 * Gateway khai `Path=/api/ai/**` kèm `StripPrefix=2`, nên `/api/ai/learning-path`
 * ở đây tới ai-gateway thành `/learning-path`. Gateway kiểm JWT rồi chèn header
 * `X-User-Id`, client không tự gắn user id.
 *
 * Hợp đồng: `docs/02-architecture/AI_FEATURES_CONTRACT.md` mục 2.
 */

const BASE = '/api/ai/learning-path';

/**
 * Ngân sách riêng cho `POST /generate`, phải cao hơn ngân sách của máy chủ.
 *
 * ai-gateway cho ml-worker `ML_WORKER_LEARNING_PATH_TIMEOUT_MS` = 180s cho lời
 * gọi này. Dùng mặc định 120s của apiClient thì một lượt sinh mất 120–180s sẽ
 * bị client cắt trong khi máy chủ vẫn chạy tiếp và vẫn lưu lộ trình xuống
 * Postgres — người dùng thấy "thất bại" rồi tải lại trang thì lộ trình hiện ra,
 * tệ hơn nữa là bấm sinh lại và đốt thêm một lượt quota LLM.
 *
 * 200s = 180s của máy chủ + 20s dự phòng cho chặng gateway và truyền JSON, để
 * khi client bỏ cuộc thì chắc chắn máy chủ cũng đã bỏ cuộc trước đó.
 */
export const LEARNING_PATH_GENERATE_TIMEOUT_MS = 200_000;

/** Học liệu do tác tử `resource_retriever` truy xuất từ Milvus cho một bước. */
export interface LearningPathResource {
  title: string;
  docId: string;
}

/** Một bước trong lộ trình, đã được tác tử `validator` kiểm thứ tự và courseId. */
export interface LearningPathStep {
  order: number;
  title: string;
  objective: string;
  /** Khoá học có thật trong catalog, hoặc null nếu bước này không gắn khoá nào. */
  courseId: string | null;
  estimatedHours: number;
  skills: string[];
  resources: LearningPathResource[];
}

/** Một dòng nhật ký của một tác tử trong chuỗi 5 tác tử. */
export interface AgentTraceEntry {
  agent: string;
  summary: string;
  elapsedMs: number;
}

/** Nội dung lộ trình do ml-worker sinh ra (cột `payload` jsonb ở ai-gateway). */
export interface LearningPathPlan {
  goal: string;
  summary: string;
  totalEstimatedHours: number;
  weeks: number;
  steps: LearningPathStep[];
  agentTrace: AgentTraceEntry[];
  model: string;
  generatedAt: string;
}

/** Bản ghi `learning_paths` mà ai-gateway lưu xuống Postgres và trả về. */
export interface SavedLearningPath {
  id: string;
  userId: string;
  goal: string;
  model: string;
  createdAt: string;
  payload: LearningPathPlan;
}

/** Một mục trong danh sách rút gọn `/me/history`. */
export interface LearningPathHistoryItem {
  id: string;
  goal: string;
  createdAt: string;
  stepCount: number;
}

export interface GenerateLearningPathParams {
  goal: string;
  hoursPerWeek: number;
  currentSkills: string[];
}

/** Dạng thô: ai-gateway có thể trả bản ghi lồng `payload`, hoặc trải phẳng. */
type RawSavedPath = Record<string, unknown>;

const asString = (value: unknown, fallback = ''): string =>
  typeof value === 'string' ? value : fallback;

const asNumber = (value: unknown, fallback = 0): number =>
  typeof value === 'number' && Number.isFinite(value) ? value : fallback;

const asStringArray = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];

function normalizeStep(raw: unknown, index: number): LearningPathStep {
  const step = (raw ?? {}) as Record<string, unknown>;
  const resources = Array.isArray(step.resources) ? step.resources : [];
  return {
    order: asNumber(step.order, index + 1),
    title: asString(step.title),
    objective: asString(step.objective),
    courseId: typeof step.courseId === 'string' && step.courseId ? step.courseId : null,
    estimatedHours: asNumber(step.estimatedHours),
    skills: asStringArray(step.skills),
    resources: resources.map((item) => {
      const resource = (item ?? {}) as Record<string, unknown>;
      return { title: asString(resource.title), docId: asString(resource.docId) };
    }),
  };
}

function normalizePlan(raw: RawSavedPath): LearningPathPlan {
  const steps = Array.isArray(raw.steps) ? raw.steps : [];
  const trace = Array.isArray(raw.agentTrace) ? raw.agentTrace : [];
  return {
    goal: asString(raw.goal),
    summary: asString(raw.summary),
    totalEstimatedHours: asNumber(raw.totalEstimatedHours),
    weeks: asNumber(raw.weeks),
    steps: steps.map(normalizeStep).sort((a, b) => a.order - b.order),
    agentTrace: trace.map((item) => {
      const entry = (item ?? {}) as Record<string, unknown>;
      return {
        agent: asString(entry.agent),
        summary: asString(entry.summary),
        elapsedMs: asNumber(entry.elapsedMs),
      };
    }),
    model: asString(raw.model),
    generatedAt: asString(raw.generatedAt),
  };
}

/**
 * Chuẩn hoá bản ghi đã lưu.
 *
 * `steps`/`skills`/`resources` thiếu thì trả mảng rỗng — giao diện sẽ hiện
 * "không có", tuyệt đối không dựng dữ liệu thay backend.
 */
export function normalizeSavedPath(raw: unknown): SavedLearningPath | null {
  if (!raw || typeof raw !== 'object') return null;
  const record = raw as RawSavedPath;
  const planSource =
    record.payload && typeof record.payload === 'object'
      ? (record.payload as RawSavedPath)
      : record;
  const plan = normalizePlan(planSource);
  return {
    id: asString(record.id),
    userId: asString(record.userId),
    goal: asString(record.goal) || plan.goal,
    model: asString(record.model) || plan.model,
    createdAt: asString(record.createdAt) || plan.generatedAt,
    payload: plan,
  };
}

function normalizeHistoryItem(raw: unknown): LearningPathHistoryItem {
  const item = (raw ?? {}) as Record<string, unknown>;
  const stepCount =
    typeof item.stepCount === 'number'
      ? item.stepCount
      : typeof item.stepsCount === 'number'
        ? item.stepsCount
        : Array.isArray(item.steps)
          ? item.steps.length
          : 0;
  return {
    id: asString(item.id),
    goal: asString(item.goal),
    createdAt: asString(item.createdAt),
    stepCount,
  };
}

/**
 * Sinh lộ trình mới. Chạy tuần tự 5 tác tử nên mất hàng chục giây.
 *
 * LLM hỏng hoặc hết quota → backend trả 503, `unwrap` ném `ApiError` với
 * `status` 503; phía giao diện phải hiện lỗi thật, không dựng lộ trình giả.
 */
export function generate(params: GenerateLearningPathParams): Promise<SavedLearningPath | null> {
  return unwrap(
    apiClient.post<ApiEnvelope<unknown>>(`${BASE}/generate`, params, {
      timeout: LEARNING_PATH_GENERATE_TIMEOUT_MS,
    }),
  ).then(normalizeSavedPath);
}

/**
 * Lộ trình mới nhất của người đang đăng nhập, hoặc null nếu chưa có.
 *
 * Chỉ đọc một dòng `learning_paths` nên dùng ngân sách đọc nhanh, không dính
 * 120s vốn dành cho lời gọi LLM.
 */
export function getMine(): Promise<SavedLearningPath | null> {
  return unwrap(
    apiClient.get<ApiEnvelope<unknown>>(`${BASE}/me`, { timeout: FAST_READ_TIMEOUT_MS }),
  ).then(normalizeSavedPath);
}

/** Danh sách rút gọn các lộ trình cũ, mới nhất trước. Cũng là lượt đọc nhanh. */
export function getHistory(limit = 10): Promise<LearningPathHistoryItem[]> {
  return unwrap(
    apiClient.get<ApiEnvelope<unknown[]>>(`${BASE}/me/history`, {
      params: { limit },
      timeout: FAST_READ_TIMEOUT_MS,
    }),
  ).then((items) => (Array.isArray(items) ? items.map(normalizeHistoryItem) : []));
}

/**
 * Mở lại một lộ trình cũ theo id.
 *
 * `/me/history` chỉ trả bản rút gọn (id, goal, createdAt, số bước), nên muốn
 * xem lại đầy đủ phải gọi thêm endpoint này. Hợp đồng chưa liệt kê nó; nếu
 * ai-gateway chưa làm, giao diện hiện lỗi mở lại thất bại chứ không đoán nội dung.
 */
export function getById(id: string): Promise<SavedLearningPath | null> {
  return unwrap(
    apiClient.get<ApiEnvelope<unknown>>(`${BASE}/${id}`, { timeout: FAST_READ_TIMEOUT_MS }),
  ).then(normalizeSavedPath);
}

export const learningPathApi = { generate, getMine, getHistory, getById, normalizeSavedPath };
