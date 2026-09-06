import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ExamSessionService } from '../exam-session.service';
import { ExamSessionRepository } from '../exam-session.repository';

/**
 * Auto-submit scheduler.
 *
 * Cron mỗi 5 giây quét DB tìm attempt `IN_PROGRESS` đã quá `deadlineAt`
 * → gọi `ExamSessionService.autoSubmit(attemptId, 'TIMEOUT')`.
 *
 * ## Lý do cần scheduler này
 * - BR-012: nếu user không tự submit, hệ thống phải chốt bài sau deadline
 *   (tránh gian lận / mất dữ liệu khi client crash).
 * - `findExpiredInProgressAttempts()` đã sẵn trong repository.
 *
 * ## Idempotency / race condition
 * - `autoSubmit()` → `SubmitExamUseCase.execute('', id, 'TIMEOUT')`
 *   đã có distributed lock (Redis) + double-check status.
 * - Nếu manual submit xảy ra trong lúc cron tới: manual lock thắng → auto-submit
 *   thấy status=SUBMITTED → skip, không tạo submission thứ 2.
 *
 * ## Phase giới hạn
 * Phase 1: xử lý TUẦN TỰ (không `Promise.all`). Đơn giản, đủ verify logic.
 * Phase 2 (sau): batch song song với concurrency limit.
 * Phase 3 (sau): multi-instance dùng Redis lock `auto-submit:tick` để tránh
 *                 2 instance cùng cron.
 *
 * ## Rủi ro đã biết
 * - DB down: try/catch quanh query → log + skip tick, không crash app.
 * - 100+ attempt expire cùng lúc: hiện tuần tự, có thể chậm. Phase 2 sẽ fix.
 */
@Injectable()
export class AutoSubmitScheduler {
  private readonly logger = new Logger(AutoSubmitScheduler.name);

  constructor(
    private readonly repository: ExamSessionRepository,
    private readonly service: ExamSessionService,
  ) {}

  /**
   * Cron mỗi 5s (giây thứ 0, 5, 10, 15, ...).
   * NestJS @Cron format: 'second minute hour day month weekday' (6 fields = NestJS extension).
   * 'star-slash-5 star star star star star' = chạy mỗi 5 giây.
   */
  @Cron('*/5 * * * * *')
  async tick(): Promise<void> {
    const start = Date.now();
    let expired: Awaited<
      ReturnType<ExamSessionRepository['findExpiredInProgressAttempts']>
    >;

    // 1. Query DB — wrap try/catch để DB down không crash app
    try {
      expired = await this.repository.findExpiredInProgressAttempts(new Date());
    } catch (err) {
      this.logger.error(
        `[cron] DB query failed, skip tick: ${err instanceof Error ? err.message : String(err)}`,
      );
      return;
    }

    if (expired.length === 0) {
      return;
    }

    this.logger.warn(
      `[cron] tick start — found ${expired.length} expired attempt(s)`,
    );

    // 2. Xử lý tuần tự (Phase 1) — chờ từng attempt xong mới sang cái tiếp theo
    let success = 0;
    let failure = 0;
    for (const attempt of expired) {
      try {
        const result = await this.service.autoSubmit(attempt.id, 'TIMEOUT');
        this.logger.log(
          `[cron] autoSubmit attempt=${attempt.id} kind=TIMEOUT submission=${result.submissionId}`,
        );
        success += 1;
      } catch (err) {
        this.logger.error(
          `[cron] autoSubmit attempt=${attempt.id} failed: ${err instanceof Error ? err.message : String(err)}`,
        );
        failure += 1;
        // Tiếp tục với attempt tiếp theo (không đứt chuỗi).
      }
    }

    this.logger.log(
      `[cron] tick done in ${Date.now() - start}ms — success=${success} failure=${failure}`,
    );
  }
}