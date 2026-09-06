import {
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

@ValidatorConstraint({ name: 'IsGte', async: false })
export class IsGteConstraint implements ValidatorConstraintInterface {
  validate(value: unknown, args: ValidationArguments): boolean {
    const [relatedFieldName] = args.constraints;
    const relatedValue = (args.object as Record<string, unknown>)[relatedFieldName];
    if (value === undefined || value === null || relatedValue === undefined || relatedValue === null) {
      return true;
    }
    return Number(value) >= Number(relatedValue);
  }

  defaultMessage(args: ValidationArguments): string {
    const [relatedFieldName] = args.constraints;
    return `${args.property} must be greater than or equal to ${relatedFieldName}`;
  }
}

export function IsGte(property: string, validationOptions?: ValidationOptions): PropertyDecorator {
  return (object: object, propertyName: string | symbol) => {
    registerDecorator({
      name: 'IsGte',
      target: object.constructor,
      propertyName: propertyName as string,
      constraints: [property],
      options: validationOptions,
      validator: IsGteConstraint,
    });
  };
}

@ValidatorConstraint({ name: 'MaxLengthEach', async: false })
export class MaxLengthEachConstraint implements ValidatorConstraintInterface {
  validate(arr: unknown, args: ValidationArguments): boolean {
    const [max] = args.constraints;
    if (!Array.isArray(arr)) return true;
    return arr.every((item) => typeof item !== 'string' || item.length <= max);
  }
  defaultMessage(args: ValidationArguments): string {
    const [max] = args.constraints;
    return `Each string element must be <= ${max} characters`;
  }
}

export function MaxLengthEach(max: number, validationOptions?: ValidationOptions): PropertyDecorator {
  return (object: object, propertyName: string | symbol) => {
    registerDecorator({
      name: 'MaxLengthEach',
      target: object.constructor,
      propertyName: propertyName as string,
      constraints: [max],
      options: validationOptions,
      validator: MaxLengthEachConstraint,
    });
  };
}

@ValidatorConstraint({ name: 'IsISODate', async: false })
export class IsISODateConstraint implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    if (typeof value !== 'string') return false;
    const d = new Date(value);
    return !isNaN(d.getTime()) && d.toISOString() === value;
  }
  defaultMessage(): string {
    return 'Must be a valid ISO 8601 date string';
  }
}

export function IsISODate(validationOptions?: ValidationOptions): PropertyDecorator {
  return (object: object, propertyName: string | symbol) => {
    registerDecorator({
      name: 'IsISODate',
      target: object.constructor,
      propertyName: propertyName as string,
      options: validationOptions,
      validator: IsISODateConstraint,
    });
  };
}

@ValidatorConstraint({ name: 'IsOptionalEnum', async: false })
export class IsOptionalEnumConstraint implements ValidatorConstraintInterface {
  validate(value: unknown, args: ValidationArguments): boolean {
    if (value === undefined || value === null) return true;
    const [enumType] = args.constraints;
    return Object.values(enumType).includes(value);
  }
  defaultMessage(args: ValidationArguments): string {
    const [enumType] = args.constraints;
    return `Must be one of: ${Object.values(enumType).join(', ')}`;
  }
}

export function IsOptionalEnum(enumType: object, validationOptions?: ValidationOptions): PropertyDecorator {
  return (object: object, propertyName: string | symbol) => {
    registerDecorator({
      name: 'IsOptionalEnum',
      target: object.constructor,
      propertyName: propertyName as string,
      constraints: [enumType],
      options: validationOptions,
      validator: IsOptionalEnumConstraint,
    });
  };
}
