import { shouldUseMockAiProctor } from './exam-session.module';

/**
 * Lựa chọn client giám sát (FR-AI-006).
 *
 * Mặc định phải là HttpProctorClient trỏ vào ml-worker. Mock chỉ bật khi có
 * người gõ tường minh `DEV_MOCK_AI_PROCTOR=true` — mock luôn trả attention=80
 * nên nếu nó lọt vào production thì không thí sinh nào bị phát hiện.
 *
 * Convention: should_X_When_Y
 */
describe('shouldUseMockAiProctor', () => {
  it('should_returnFalse_When_envUnset', () => {
    expect(shouldUseMockAiProctor({} as NodeJS.ProcessEnv)).toBe(false);
  });

  it('should_returnFalse_When_envEmpty', () => {
    expect(shouldUseMockAiProctor({ DEV_MOCK_AI_PROCTOR: '' } as NodeJS.ProcessEnv)).toBe(false);
  });

  it('should_returnFalse_When_envFalse', () => {
    expect(shouldUseMockAiProctor({ DEV_MOCK_AI_PROCTOR: 'false' } as NodeJS.ProcessEnv)).toBe(
      false,
    );
  });

  it('should_returnFalse_When_envIsTruthyButNotExactlyTrue', () => {
    // '1' hay 'TRUE' không được coi là bật: chỉ một cách viết duy nhất.
    expect(shouldUseMockAiProctor({ DEV_MOCK_AI_PROCTOR: '1' } as NodeJS.ProcessEnv)).toBe(false);
    expect(shouldUseMockAiProctor({ DEV_MOCK_AI_PROCTOR: 'TRUE' } as NodeJS.ProcessEnv)).toBe(
      false,
    );
  });

  it('should_returnTrue_When_envExactlyTrue', () => {
    expect(shouldUseMockAiProctor({ DEV_MOCK_AI_PROCTOR: 'true' } as NodeJS.ProcessEnv)).toBe(true);
  });
});
