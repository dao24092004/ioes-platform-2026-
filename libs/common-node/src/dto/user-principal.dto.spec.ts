import { UserPrincipalDto } from './user-principal.dto';

describe('UserPrincipalDto - BUG #115 fix', () => {
  describe('from()', () => {
    it('should_create_When_validPayload', () => {
      const dto = UserPrincipalDto.from({
        sub: 'u1',
        email: 'user@example.com',
        role: 'INSTRUCTOR',
        tenantId: 't1',
      });
      expect(dto).toMatchObject({
        userId: 'u1',
        email: 'user@example.com',
        role: 'INSTRUCTOR',
        tenantId: 't1',
      });
    });
  });

  describe('hasPermission()', () => {
    it('should_returnTrue_When_admin', () => {
      const dto = UserPrincipalDto.from({ sub: 'u1', email: 'a@b.c', role: 'ADMIN' });
      expect(dto.hasPermission('anything')).toBe(true);
    });

    it('should_checkPermissions_When_hasPermissions', () => {
      const dto = UserPrincipalDto.from({
        sub: 'u1',
        email: 'a@b.c',
        role: 'INSTRUCTOR',
        permissions: ['edit_question',],
      });
      expect(dto.hasPermission('edit_question')).toBe(true);
      expect(dto.hasPermission('delete_question')).toBe(false);
    });

    it('should_returnFalse_When_noPermissions', () => {
      const dto = UserPrincipalDto.from({ sub: 'u1', email: 'a@b.c', role: 'STUDENT' });
      expect(dto.hasPermission('edit_question')).toBe(false);
    });
  });

  describe('belongsToTenant()', () => {
    it('should_returnTrue_When_admin', () => {
      const dto = UserPrincipalDto.from({ sub: 'u1', email: 'a@b.c', role: 'ADMIN' });
      expect(dto.belongsToTenant('any-tenant')).toBe(true);
    });

    it('should_returnTrue_When_sameTenant', () => {
      const dto = UserPrincipalDto.from({
        sub: 'u1',
        email: 'a@b.c',
        role: 'STUDENT',
        tenantId: 't1',
      });
      expect(dto.belongsToTenant('t1')).toBe(true);
    });

    it('should_returnFalse_When_differentTenant', () => {
      const dto = UserPrincipalDto.from({
        sub: 'u1',
        email: 'a@b.c',
        role: 'STUDENT',
        tenantId: 't1',
      });
      expect(dto.belongsToTenant('t2')).toBe(false);
    });
  });
});
