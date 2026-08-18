import { IsStrongPassword } from './validator.util';
import { validate } from 'class-validator';

class TestDto {
  password: string;

  constructor(password: string) {
    this.password = password;
  }
}

// Apply decorator dynamically for testing
function applyPassword(target: any) {
  IsStrongPassword()(target, 'password');
}

describe('IsStrongPassword validator', () => {
  it('should pass with strong password', async () => {
    const dto = new TestDto('StrongP@ss1');
    applyPassword(TestDto.prototype);
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('should fail with weak password (too short)', async () => {
    const dto = new TestDto('Abc1!');
    applyPassword(TestDto.prototype);
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('should fail without uppercase', async () => {
    const dto = new TestDto('weakpass1!');
    applyPassword(TestDto.prototype);
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('should fail without special character', async () => {
    const dto = new TestDto('WeakPass12');
    applyPassword(TestDto.prototype);
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });
});
