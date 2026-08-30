import { apiClient, unwrap, type ApiEnvelope } from '@/config/api.config';

/**
 * Gửi thông báo qua notification-service.
 *
 * Gateway khai `Path=/api/notifications/**` kèm `StripPrefix=1`, nên chỉ đoạn
 * `/api` bị cắt và service nhận đúng `/notifications/...` như
 * `@RequestMapping` của `NotificationController` mong đợi.
 *
 * Chỉ hai endpoint gửi là chạy thật. `GET /notifications/user/{userId}` và
 * `GET /notifications/{id}` phía Java vẫn là chỗ để tạm — cái đầu trả
 * `List.of()`, cái sau trả `null` — nên hộp thư ở trang quản trị vẫn phải
 * dùng dữ liệu giả cho tới khi backend nối vào use case.
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

export const notificationApi = { send, sendTemplated };
