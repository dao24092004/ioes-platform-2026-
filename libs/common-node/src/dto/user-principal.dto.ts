export interface UserPrincipal {
  userId: string;
  email: string;
  role: string;
  fullName?: string;
}

export class UserPrincipalDto implements UserPrincipal {
  userId!: string;
  email!: string;
  role!: string;
  fullName?: string;

  static from(payload: {
    sub: string;
    email: string;
    role: string;
    name?: string;
  }): UserPrincipalDto {
    const dto = new UserPrincipalDto();
    dto.userId = payload.sub;
    dto.email = payload.email;
    dto.role = payload.role;
    dto.fullName = payload.name;
    return dto;
  }
}
