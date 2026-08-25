import { maskEmail, maskPhone, maskJwt, maskBearer, maskPIIInString, maskPIIInValue } from './pii-mask.util';

describe('PII Masking - BUG #100 fix', () => {
  describe('maskEmail', () => {
    it('should_mask_When_validEmail', () => {
      expect(maskEmail('alice@example.com')).toBe('ali***@example.com');
    });

    it('should_return_When_invalidEmail', () => {
      expect(maskEmail('notanemail')).toBe('notanemail');
    });

    it('should_mask_When_shortLocal', () => {
      expect(maskEmail('ab@example.com')).toBe('***@example.com');
    });
  });

  describe('maskPhone', () => {
    it('should_keepCountryAndLast3_When_phone', () => {
      expect(maskPhone('+1-555-123-4567')).toBe('1***567');
    });
  });

  describe('maskJwt', () => {
    it('should_replace_When_jwtFormat', () => {
      expect(maskJwt('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.abc.def')).toBe('[REDACTED-JWT]');
    });
  });

  describe('maskBearer', () => {
    it('should_mask_When_bearerToken', () => {
      expect(maskBearer('Bearer abc123.def456')).toBe('Bearer [REDACTED]');
    });
  });

  describe('maskPIIInString', () => {
    it('should_maskAll_When_multiplePII', () => {
      const input = 'User alice@example.com with card 4111-1111-1111-1111 and token eyJabc.def.ghi';
      const masked = maskPIIInString(input);
      expect(masked).toContain('ali***@example.com');
      expect(masked).toContain('[REDACTED-CC');
      expect(masked).toContain('[REDACTED-JWT]');
      expect(masked).not.toContain('alice@');
      expect(masked).not.toContain('4111-1111');
    });
  });

  describe('maskPIIInValue', () => {
    it('should_recursivelyMask_When_object', () => {
      const input = {
        user: {
          email: 'user@example.com',
          name: 'Alice',
        },
        token: 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.signature',
      };
      const masked = maskPIIInValue(input);
      expect(masked).toEqual({
        user: {
          email: 'use***@example.com',
          name: 'Alice',
        },
        token: '[REDACTED-JWT]',
      });
    });

    it('should_maskByFieldName_When_password', () => {
      const input = { password: 'supersecret123', username: 'alice' };
      const masked = maskPIIInValue(input);
      expect((masked as any).password).toBe('[REDACTED]');
      expect((masked as any).username).toBe('alice');
    });

    it('should_return_When_null', () => {
      expect(maskPIIInValue(null)).toBe(null);
      expect(maskPIIInValue(undefined)).toBe(undefined);
    });
  });
});
