import { apiClient, unwrap, type ApiEnvelope } from '@/config/api.config';

/**
 * Gửi thông báo qua notification-service.
 *
 * Gateway khai `Path=/api/notifications/**` kèm `StripPrefix=1`, nên chỉ đoạn
 * `/api` bị cắt và service nhận đúng `/notifications/...` như
 * `@RequestMapping` của `NotificationController` mong đợi.
 *
 * `GET /notifications/user/{userId}` giờ trả danh sách thật, mới nhất trước,
 * tối đa 50 bản ghi — chỉ chủ sở hữu hoặc admin/super_admin mới đọc được,
 * người khác nhận 403. `GET /notifications/{id}` phía Java vẫn trả `null`
 * nên chưa có phía gọi nào dùng tới.
 */

const BASE = '/api/notifications';

/** Khớp enum `NotificationType` phía Java; sai chữ là backend trả 400. */
export type NotificationType = 'email' | 'push' | 'sms' | 'in_app';

/** Khớp enum `NotificationStatus` phía Java. */
export type NotificationStatus = 'pending' | 'sent' | 'failed' | 'retrying';

/** Ánh xạ 1-1 với record `NotificationResponse` phía Java. */
export interface NotificationRecord {
  id: string;
  userId: string | null;
  type: NotificationType;
  recipient: string;
  subject: string;
  status: NotificationStatus;
  sentAt: string | null;
  createdAt: string;
}

/**
 * Khớp record `SendNotificationRequest`.
 *
 * `type`, `recipient`, `subject` là bắt buộc (`@NotNull`/`@NotBlank`).
 * `content` dùng cho `send`, còn `template` + `data` dùng cho `sendTemplated`.
 */
export interface SendNotificationRequest {
  type: NotificationType;
  recipient: string;
  subject: string;
  content?: string;
  template?: string;
  data?: Record<string, unknown>;
}

/**
 * Gửi một thông báo tới đúng một người nhận.
 *
 * Backend không có khái niệm phát theo nhóm: `recipient` là một địa chỉ (email
 * hoặc token thiết bị), không phải danh sách. Muốn gửi cho nhiều người thì
 * phía gọi phải tự lặp.
 */
export function send(body: SendNotificationRequest): Promise<NotificationRecord> {
  return unwrap(apiClient.post<ApiEnvelope<NotificationRecord>>(`${BASE}/send`, body));
}

/** Gửi theo mẫu dựng sẵn; `template` là tên file trong `classpath:/templates/`. */
export function sendTemplated(body: SendNotificationRequest): Promise<NotificationRecord> {
  return unwrap(apiClient.post<ApiEnvelope<NotificationRecord>>(`${BASE}/send-templated`, body));
}

/**
 * Hộp thư thật của một người dùng, mới nhất trước, tối đa 50 bản ghi.
 *
 * Backend chỉ cho đọc hộp thư của chính mình; admin/super_admin đọc được của
 * bất kỳ ai. Gọi với id của người khác mà không phải admin thì `apiClient`
 * ném `ApiError` với `status` 403.
 */
export function getUserInbox(userId: string): Promise<NotificationRecord[]> {
  return unwrap(apiClient.get<ApiEnvelope<NotificationRecord[]>>(`${BASE}/user/${userId}`));
}

/** Ánh xạ 1-1 với record `NotificationStatsResponse`. Nhóm trạng thái và nhóm kênh đều cộng lại bằng `total`. */
export interface NotificationStats {
  total: number;
  pending: number;
  sent: number;
  failed: number;
  retrying: number;
  email: number;
  push: number;
  sms: number;
  inApp: number;
}

/**
 * Khớp record `NotificationTemplateResponse`: chỉ có tên — không có trigger,
 * kênh hay cờ bật/tắt. `name` là giá trị đưa vào `template` khi `sendTemplated`.
 */
export interface NotificationTemplate {
  name: string;
}

/** Đếm trên toàn bảng nên chỉ admin/super_admin gọi được, người khác nhận 403. */
export function getStats(): Promise<NotificationStats> {
  return unwrap(apiClient.get<ApiEnvelope<NotificationStats>>(`${BASE}/stats`));
}

/** Chỉ admin/super_admin gọi được. */
export function getTemplates(): Promise<NotificationTemplate[]> {
  return unwrap(apiClient.get<ApiEnvelope<NotificationTemplate[]>>(`${BASE}/templates`));
}

export const notificationApi = { send, sendTemplated, getUserInbox, getStats, getTemplates };
