import { ApiProperty } from '../decorators/api-property.decorator';

export class ApiResponse<T> {
  @ApiProperty({ example: true })
  success!: boolean;

  @ApiProperty({ example: 'Success' })
  message!: string;

  @ApiProperty({ required: false })
  data?: T;

  @ApiProperty({ example: '2026-08-16T10:00:00.000Z' })
  timestamp!: string;

  @ApiProperty({ required: false })
  traceId?: string;

  static success<T>(data: T, message: string = 'Success'): ApiResponse<T> {
    const response = new ApiResponse<T>();
    response.success = true;
    response.message = message;
    response.data = data;
    response.timestamp = new Date().toISOString();
    return response;
  }

  static error<T = null>(message: string, data?: T): ApiResponse<T> {
    const response = new ApiResponse<T>();
    response.success = false;
    response.message = message;
    response.data = data;
    response.timestamp = new Date().toISOString();
    return response;
  }
}

export class PaginationMeta {
  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 20 })
  limit!: number;

  @ApiProperty({ example: 100 })
  total!: number;

  @ApiProperty({ example: 5 })
  totalPages!: number;
}

export class PaginatedResponse<T> {
  @ApiProperty({ type: [Object] })
  items!: T[];

  @ApiProperty()
  meta!: PaginationMeta;

  static create<T>(items: T[], page: number, limit: number, total: number): PaginatedResponse<T> {
    const response = new PaginatedResponse<T>();
    response.items = items;
    response.meta = {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    };
    return response;
  }
}
