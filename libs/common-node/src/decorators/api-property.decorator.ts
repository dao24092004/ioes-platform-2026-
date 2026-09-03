// Simulated decorator for documentation purposes (NestJS uses reflect-metadata)
export function ApiProperty(options?: {
  example?: any;
  required?: boolean;
  description?: string;
  type?: any;
  isArray?: boolean;
}): PropertyDecorator {
  return (target: any, propertyKey: string | symbol) => {
    // No-op - just for type hints in DTOs
    // Real OpenAPI integration is handled by @nestjs/swagger at the service level
  };
}
