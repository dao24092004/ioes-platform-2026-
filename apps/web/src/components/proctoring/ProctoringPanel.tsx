import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useWebcam, CAPTURE_MAX_WIDTH } from '@/hooks/useWebcam';
import { useWebSocket } from '@/hooks/useWebSocket';
import { logger } from '@/utils/logger';

/**
 * Nhịp gửi khung hình — FR-PROC-001 yêu cầu 1 giây.
 *
 * Trước đây là 5000ms vì khung chụp ở độ phân giải gốc của webcam. Ở đó 1 Hz
 * quá đắt: `getUserMedia({width: 640, height: 480})` chỉ là ràng buộc *ideal*,
 * webcam 1080p vẫn trả 1920x1080, và JPEG q0.6 của ảnh đó rơi vào khoảng
 * 120–160 KB → base64 (+33%) ~160–210 KB mỗi khung → ~1,3–1,7 Mbit/s tải lên
 * cho mỗi thí sinh, nhân với cả phòng thi.
 *
 * Nên `useWebcam.captureFrame` thu nhỏ về tối đa 640px ngang (q0.6) trước khi
 * mã hoá: khung 640x480 rơi vào khoảng 18–25 KB → base64 ~24–33 KB → ~0,2–0,27
 * Mbit/s ở 1 Hz. Tức 1 khung/giây sau khi thu nhỏ còn *rẻ hơn* 1 khung/5 giây
 * ở độ phân giải gốc (~0,26–0,34 Mbit/s), trong khi nhịp lấy mẫu nhanh gấp 5.
 * MediaPipe Face Mesh hạ ảnh xuống cỡ ~192px trước khi chạy nên 640px không
 * làm mất độ chính xác nào.
 */
const FRAME_INTERVAL_MS = 1000;

export interface ProctoringViolation {
  type: string;
  attentionScore: number;
  faceDetected: boolean;
  violationCount: number;
  threshold: number;
  occurredAt: string;
  faceCount?: number;
  gazeDirection?: string | null;
  attentionSeverity?: 'OK' | 'WARNING' | 'FLAG';
}

/** `proctoring:status` — gateway gửi mỗi khung, kể cả khung sạch. */
export interface ProctoringStatus {
  attemptId: string;
  /** false khi exam-suite không gọi được ml-worker; các số bên dưới vô nghĩa. */
  available: boolean;
  attentionScore: number;
  attentionSeverity: 'OK' | 'WARNING' | 'FLAG';
  faceDetected: boolean;
  faceCount: number;
  gazeDirection: string | null;
  violationCount: number;
  threshold: number;
  activeViolation: string | null;
  flagged: boolean;
  observedAt: string;
}

interface ProctoringPanelProps {
  /** Bỏ trống thì chỉ xem camera tại chỗ, không gửi khung đi đâu cả. */
  attemptId?: string;
  onViolation?: (violation: ProctoringViolation) => void;
  onAutoSubmitted?: (payload: { attemptId: string; submissionId: string }) => void;
}

/** Hướng nhìn → câu mô tả. Giữ giọng trung tính, không buộc tội. */
/**
 * Nhãn hướng nhìn: khoá i18n + bản tiếng Việt làm fallback, để bản tiếng Anh
 * không hiện tiếng Việt như trước.
 */
const GAZE_LABELS: Record<string, { key: string; fallback: string }> = {
  CENTER: { key: 'student.examTaking.gazeCenter', fallback: 'Nhìn vào màn hình' },
  LEFT: { key: 'student.examTaking.gazeLeft', fallback: 'Đang nhìn sang trái' },
  RIGHT: { key: 'student.examTaking.gazeRight', fallback: 'Đang nhìn sang phải' },
  UP: { key: 'student.examTaking.gazeUp', fallback: 'Đang nhìn lên' },
  DOWN: { key: 'student.examTaking.gazeDown', fallback: 'Đang nhìn xuống' },
  OUT_OF_FRAME: {
    key: 'student.examTaking.gazeOutOfFrame',
    fallback: 'Không xác định được hướng nhìn',
  },
};

/**
 * Khung camera giám thị: mở webcam, đẩy khung hình lên `/exam-session` và
 * hiển thị đúng những gì server thấy.
 *
 * Việc chấm điểm chú ý nằm hoàn toàn ở server (`FrameProcessorService`), phía
 * client chỉ chụp, gửi và hiển thị — đặt logic phát hiện ở trình duyệt thì thí
 * sinh sửa được.
 *
 * Phần trạng thái cố tình nói giảm: điểm chú ý và số vi phạm hiện liên tục để
 * thí sinh tự chỉnh tư thế *trước* khi bị tính lỗi, chứ không phải để doạ.
 */
const ProctoringPanel: React.FC<ProctoringPanelProps> = ({
  attemptId,
  onViolation,
  onAutoSubmitted,
}) => {
  const { t } = useTranslation();
  const { videoRef, status, error, isStreaming, captureFrame } = useWebcam();
  const { isConnected, on, emit } = useWebSocket({
    namespace: '/exam-session',
    enabled: Boolean(attemptId),
  });

  const [lastViolation, setLastViolation] = useState<ProctoringViolation | null>(null);
  const [proctorStatus, setProctorStatus] = useState<ProctoringStatus | null>(null);
  const [flaggedNote, setFlaggedNote] = useState<string | null>(null);
  const [framesSent, setFramesSent] = useState(0);

  // Giữ callback trong ref để interval không phải dựng lại mỗi lần cha render.
  const onViolationRef = useRef(onViolation);
  const onAutoSubmittedRef = useRef(onAutoSubmitted);
  useEffect(() => {
    onViolationRef.current = onViolation;
    onAutoSubmittedRef.current = onAutoSubmitted;
  }, [onViolation, onAutoSubmitted]);

  // Số thứ tự khung, gửi kèm để ml-worker ghép được chuỗi thời gian.
  const sequenceRef = useRef(0);

  // Vào phòng của attempt trước khi gửi khung, nếu không server không biết
  // khung thuộc lượt thi nào.
  useEffect(() => {
    if (!attemptId || !isConnected) return;
    emit('exam:join', { attemptId });
  }, [attemptId, isConnected, emit]);

  useEffect(() => {
    const offStatus = on<ProctoringStatus>('proctoring:status', (payload) => {
      setProctorStatus(payload);
    });

    const offViolation = on<ProctoringViolation>('proctoring:violation', (payload) => {
      setLastViolation(payload);
      onViolationRef.current?.(payload);
    });

    // BR-011 mức nặng: server đã gắn cờ lượt thi. Gắn cờ không huỷ bài, nên
    // nói đúng hệ quả — giảng viên sẽ xem lại — thay vì báo động đỏ.
    const offFlagged = on<{ message?: string }>('proctoring:flagged', (payload) => {
      setFlaggedNote(
        payload?.message ??
          t(
            'student.examTaking.proctoringFlagged',
            'Mức tập trung xuống thấp — lượt thi được đánh dấu để giảng viên xem lại',
          ),
      );
    });

    const offAutoSubmit = on<{ attemptId: string; submissionId: string }>(
      'proctoring:auto-submitted',
      (payload) => {
        logger.warn('ProctoringPanel', 'Bài thi bị nộp tự động do vi phạm', payload);
        onAutoSubmittedRef.current?.(payload);
      },
    );

    const offError = on<{ code: string; message: string }>('proctoring:error', (payload) => {
      logger.warn('ProctoringPanel', 'Lỗi giám thị từ server', payload);
    });

    return () => {
      offStatus();
      offViolation();
      offFlagged();
      offAutoSubmit();
      offError();
    };
  }, [on]);

  useEffect(() => {
    if (!attemptId || !isConnected || !isStreaming) return;

    const id = window.setInterval(() => {
      const frame = captureFrame({ maxWidth: CAPTURE_MAX_WIDTH, quality: 0.6 });
      if (!frame) return;
      // Bỏ tiền tố `data:image/jpeg;base64,`; server chỉ nhận phần base64.
      const base64 = frame.slice(frame.indexOf(',') + 1);
      const sent = emit('proctoring:frame', {
        attemptId,
        frameBase64: base64,
        capturedAt: new Date().toISOString(),
        sequenceId: sequenceRef.current + 1,
      });
      if (sent) {
        sequenceRef.current += 1;
        setFramesSent((n) => n + 1);
      }
    }, FRAME_INTERVAL_MS);

    return () => window.clearInterval(id);
  }, [attemptId, isConnected, isStreaming, captureFrame, emit]);

  const statusLabel = !attemptId
    ? t('student.examTaking.proctoringIdle', 'Chưa vào lượt thi — camera chỉ hiển thị tại chỗ')
    : isConnected
      ? t('student.examTaking.cameraRecording')
      : t('student.examTaking.proctoringOffline', 'Mất kết nối giám thị');

  // Chỉ tin các con số khi ml-worker thực sự trả lời. Mất kết nối bộ phân
  // tích mà vẫn vẽ "0% — không thấy mặt" là doạ nhầm thí sinh.
  const live = attemptId && proctorStatus?.available ? proctorStatus : null;

  // BR-011: < 60 nhắc nhở, < 40 gắn cờ. Màu bám đúng hai mốc đó.
  const severity = live?.attentionSeverity ?? 'OK';
  const scoreTone =
    severity === 'FLAG'
      ? 'text-rose-600 dark:text-rose-400'
      : severity === 'WARNING'
        ? 'text-amber-600 dark:text-amber-400'
        : 'text-emerald-600 dark:text-emerald-400';
  const scoreBar =
    severity === 'FLAG' ? 'bg-rose-500' : severity === 'WARNING' ? 'bg-amber-500' : 'bg-emerald-500';

  // Một câu duy nhất mô tả camera đang thấy gì. Trường hợp nhiều người trong
  // khung nói thẳng vì đó là điều thí sinh phải sửa ngay; còn lại giữ giọng
  // bình thường.
  const faceMessage = !live
    ? t('student.examTaking.proctorWaiting', 'Đang chờ bộ phân tích giám thị...')
    : live.faceCount > 1
      ? t(
          'student.examTaking.multipleFaces',
          'Có nhiều hơn một người trong khung hình — chỉ thí sinh được ngồi trước camera',
        )
      : !live.faceDetected
        ? t(
            'student.examTaking.faceNotDetected',
            'Chưa thấy khuôn mặt — mời bạn ngồi vào giữa khung hình',
          )
        : t('student.examTaking.faceDetected', 'Đã nhận diện khuôn mặt');

  // Chỉ tô hổ phách khi thí sinh thật sự cần chỉnh lại gì đó. Lúc đang chờ bộ
  // phân tích thì không có gì để sửa, nên giữ màu trung tính.
  const faceNeedsAttention = Boolean(live && (!live.faceDetected || live.faceCount > 1));
  const faceTone = faceNeedsAttention
    ? 'text-amber-700 dark:text-amber-400'
    : 'text-slate-500 dark:text-slate-400';

  const violationCount = live?.violationCount ?? lastViolation?.violationCount ?? 0;
  const threshold = live?.threshold ?? lastViolation?.threshold ?? 0;

  return (
    <div className="p-5">
      <div className="aspect-[4/3] bg-[#1a1a2e] rounded-xl relative overflow-hidden">
        <video
          ref={videoRef}
          muted
          playsInline
          className={`w-full h-full object-cover ${isStreaming ? '' : 'opacity-0'}`}
        />

        {!isStreaming && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-white/70 px-4 text-center">
            <svg className="w-12 h-12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            <span className="text-[13px]">
              {status === 'requesting'
                ? t('student.examTaking.cameraRequesting', 'Đang xin quyền camera...')
                : (error ?? t('student.examTaking.cameraLive'))}
            </span>
          </div>
        )}

        <div className="absolute bottom-3 left-3 flex items-center gap-2 px-3 py-1.5 bg-black/70 rounded-lg">
          <span
            className={`w-2 h-2 rounded-full ${
              isConnected && isStreaming ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
            }`}
          />
          <span className="text-xs text-white">{statusLabel}</span>
        </div>

        {framesSent > 0 && (
          <div className="absolute bottom-3 right-3 px-2 py-1 bg-black/70 rounded text-[11px] text-white/70">
            {framesSent}
          </div>
        )}
      </div>

      {attemptId && (
        <div
          className="mt-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700"
          data-testid="proctoring-status"
        >
          <div className="flex items-baseline justify-between">
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {t('student.examTaking.attentionScore', 'Mức tập trung')}
            </span>
            <span className={`text-sm font-semibold tabular-nums ${scoreTone}`}>
              {live ? `${Math.round(live.attentionScore)}%` : '—'}
            </span>
          </div>

          <div className="mt-1.5 h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${scoreBar}`}
              style={{ width: live ? `${Math.min(100, Math.max(0, live.attentionScore))}%` : '0%' }}
            />
          </div>

          <p className={`mt-2 text-[11px] ${faceTone}`}>{faceMessage}</p>

          {live?.faceDetected && live.gazeDirection && (
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              {GAZE_LABELS[live.gazeDirection]
                ? t(GAZE_LABELS[live.gazeDirection].key, GAZE_LABELS[live.gazeDirection].fallback)
                : live.gazeDirection}
            </p>
          )}

          {threshold > 0 && (
            <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
              {t('student.examTaking.violationCount', 'Ghi nhận')}{' '}
              <span className="font-semibold tabular-nums">
                {violationCount}/{threshold}
              </span>{' '}
              {t('student.examTaking.violationAutoSubmit', 'lần; vượt ngưỡng sẽ tự động nộp bài')}
            </p>
          )}

          {flaggedNote && (
            <p className="mt-2 text-[11px] text-rose-700 dark:text-rose-400" data-testid="proctoring-flagged">
              {flaggedNote}
            </p>
          )}
        </div>
      )}

      {lastViolation && (
        <div
          className={`mt-3 p-3 rounded-xl border ${
            lastViolation.attentionSeverity === 'FLAG'
              ? 'bg-rose-50 dark:bg-rose-900/20 border-rose-200 dark:border-rose-800'
              : 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800'
          }`}
          role="status"
        >
          <p
            className={`text-xs font-semibold ${
              lastViolation.attentionSeverity === 'FLAG'
                ? 'text-rose-800 dark:text-rose-300'
                : 'text-amber-800 dark:text-amber-300'
            }`}
          >
            {t('student.examTaking.violationDetected', 'Phát hiện vi phạm')}: {lastViolation.type}
          </p>
          <p
            className={`text-xs mt-0.5 ${
              lastViolation.attentionSeverity === 'FLAG'
                ? 'text-rose-700 dark:text-rose-400'
                : 'text-amber-700 dark:text-amber-400'
            }`}
          >
            {lastViolation.violationCount}/{lastViolation.threshold} —{' '}
            {t('student.examTaking.violationWarning', 'vượt ngưỡng sẽ bị nộp bài tự động')}
          </p>
        </div>
      )}
    </div>
  );
};

export default ProctoringPanel;
