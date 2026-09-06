import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useWebcam } from '@/hooks/useWebcam';
import { useWebSocket } from '@/hooks/useWebSocket';
import { logger } from '@/utils/logger';

/** Nhịp gửi khung hình. Server đếm vi phạm theo khung, không theo giây. */
const FRAME_INTERVAL_MS = 5000;

export interface ProctoringViolation {
  type: string;
  attentionScore: number;
  faceDetected: boolean;
  violationCount: number;
  threshold: number;
  occurredAt: string;
}

interface ProctoringPanelProps {
  /** Bỏ trống thì chỉ xem camera tại chỗ, không gửi khung đi đâu cả. */
  attemptId?: string;
  onViolation?: (violation: ProctoringViolation) => void;
  onAutoSubmitted?: (payload: { attemptId: string; submissionId: string }) => void;
}

/**
 * Khung camera giám thị: mở webcam, đẩy khung hình lên `/exam-session` và
 * hiển thị vi phạm mà server trả về.
 *
 * Việc chấm điểm chú ý nằm hoàn toàn ở server (`FrameProcessorService`), phía
 * client chỉ chụp và gửi — đặt logic phát hiện ở trình duyệt thì thí sinh sửa
 * được.
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
  const [framesSent, setFramesSent] = useState(0);

  // Giữ callback trong ref để interval không phải dựng lại mỗi lần cha render.
  const onViolationRef = useRef(onViolation);
  const onAutoSubmittedRef = useRef(onAutoSubmitted);
  useEffect(() => {
    onViolationRef.current = onViolation;
    onAutoSubmittedRef.current = onAutoSubmitted;
  }, [onViolation, onAutoSubmitted]);

  // Vào phòng của attempt trước khi gửi khung, nếu không server không biết
  // khung thuộc lượt thi nào.
  useEffect(() => {
    if (!attemptId || !isConnected) return;
    emit('exam:join', { attemptId });
  }, [attemptId, isConnected, emit]);

  useEffect(() => {
    const offViolation = on<ProctoringViolation>('proctoring:violation', (payload) => {
      setLastViolation(payload);
      onViolationRef.current?.(payload);
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
      offViolation();
      offAutoSubmit();
      offError();
    };
  }, [on]);

  useEffect(() => {
    if (!attemptId || !isConnected || !isStreaming) return;

    const id = window.setInterval(() => {
      const frame = captureFrame();
      if (!frame) return;
      // Bỏ tiền tố `data:image/jpeg;base64,`; server chỉ nhận phần base64.
      const base64 = frame.slice(frame.indexOf(',') + 1);
      const sent = emit('proctoring:frame', {
        attemptId,
        frameBase64: base64,
        capturedAt: new Date().toISOString(),
      });
      if (sent) setFramesSent((n) => n + 1);
    }, FRAME_INTERVAL_MS);

    return () => window.clearInterval(id);
  }, [attemptId, isConnected, isStreaming, captureFrame, emit]);

  const statusLabel = !attemptId
    ? t('student.examTaking.proctoringIdle', 'Chưa vào lượt thi — camera chỉ hiển thị tại chỗ')
    : isConnected
      ? t('student.examTaking.cameraRecording')
      : t('student.examTaking.proctoringOffline', 'Mất kết nối giám thị');

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

      {lastViolation && (
        <div className="mt-3 p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
          <p className="text-xs font-semibold text-amber-800 dark:text-amber-300">
            {t('student.examTaking.violationDetected', 'Phát hiện vi phạm')}: {lastViolation.type}
          </p>
          <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
            {lastViolation.violationCount}/{lastViolation.threshold} —{' '}
            {t('student.examTaking.violationWarning', 'vượt ngưỡng sẽ bị nộp bài tự động')}
          </p>
        </div>
      )}
    </div>
  );
};

export default ProctoringPanel;
