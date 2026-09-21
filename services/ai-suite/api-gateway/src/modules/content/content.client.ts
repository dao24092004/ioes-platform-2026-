import { HttpService } from '@nestjs/axios';
import {
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { AxiosError } from 'axios';
import { firstValueFrom } from 'rxjs';
import { createLogger } from '@ioes/common-node';
import { contentServiceConfig } from '../../config/app.config';

/**
 * Một khoá học như content-service trả về.
 *
 * Chỉ khai những trường ai-suite thực sự dùng, không chép cả `CourseView`:
 * khai thừa thì mỗi lần bên kia đổi một trường không liên quan lại phải sửa ở
 * đây. Xem services/content-service/.../CourseResponses.java.
 */
export interface ContentCourse {
  id: string;
  title: string;
  shortDescription: string | null;
  thumbnailUrl: string | null;
  categoryId: string | null;
  /** 1–5 bên content-service. Có thể null khi giảng viên chưa đặt. */
  difficultyLevel: number | null;
  durationHours: number | null;
  /** BigDecimal của Java, Jackson serialize thành số JSON. */
  price: number | null;
  currency: string | null;
  /** Do trigger trong database duy trì, khoá `enrollments` là số người ghi danh. */
  stats: Record<string, unknown> | null;
}

interface PageView<T> {
  data: T[];
  meta: { total: number; page: number; perPage: number; totalPages: number };
}

/** Lượt ghi danh của người gọi. */
export interface ContentEnrollment {
  id: string;
  courseId: string;
  userId: string;
  status: string;
  progressPercent: number | null;
  completedAt: string | null;
}

/** Phần tử của `GET /api/v1/courses/enrollments/me`. */
export interface ContentMyEnrollment {
  enrollment: ContentEnrollment;
  course: ContentCourse;
}

/**
 * Đọc catalogue và ghi danh từ content-service (Spring Boot, cổng 9001).
 *
 * content-service tự kiểm bearer token qua `JwtAuthenticationFilter` và lấy
 * danh tính từ `SecurityContext`; nó **không** đọc `X-User-Id`. Nên ở đây phải
 * chuyển tiếp đúng header `Authorization` của người gọi — đặt X-User-Id là vô
 * dụng, và dùng một token kỹ thuật dùng chung thì `enrollments/me` sẽ trả ghi
 * danh của tài khoản kỹ thuật chứ không phải của học viên.
 */
@Injectable()
export class ContentClient {
  private readonly logger = createLogger('ContentClient');

  constructor(private readonly http: HttpService) {}

  /**
   * Toàn bộ khoá đã xuất bản, gộp mọi trang.
   *
   * Lọc `status=published` ngay ở content-service thay vì lọc sau khi tải:
   * bản nháp và bản lưu trữ không được lọt vào catalogue gửi cho mô hình, nếu
   * không mô hình sẽ gợi ý khoá mà người dùng không mở được.
   */
  async listPublishedCourses(authorization: string): Promise<ContentCourse[]> {
    const perPage = contentServiceConfig.catalogPageSize;
    const courses: ContentCourse[] = [];

    for (let page = 1; page <= contentServiceConfig.catalogMaxPages; page += 1) {
      const pageView = await this.get<PageView<ContentCourse>>(
        '/api/v1/courses',
        authorization,
        { status: 'published', page, per_page: perPage },
        'Đọc catalogue khoá học',
      );

      courses.push(...(pageView.data ?? []));

      const totalPages = pageView.meta?.totalPages ?? 1;
      if (page >= totalPages || (pageView.data ?? []).length === 0) {
        break;
      }
    }

    this.logger.log(`Catalogue: ${courses.length} khoá đã xuất bản`);
    return courses;
  }

  /** Các khoá người gọi đã ghi danh, kèm tiến độ. */
  async listMyEnrollments(authorization: string): Promise<ContentMyEnrollment[]> {
    const rows = await this.get<ContentMyEnrollment[]>(
      '/api/v1/courses/enrollments/me',
      authorization,
      {},
      'Đọc danh sách ghi danh',
    );
    return rows ?? [];
  }

  /**
   * Gọi content-service và dịch lỗi sang HttpException của Nest.
   *
   * 401/403 giữ nguyên ý nghĩa "token hỏng hoặc hết hạn" thay vì đổi thành
   * 503: bảo người dùng "dịch vụ đang bận" trong khi thứ cần làm là đăng nhập
   * lại thì họ sẽ chờ mãi. Mọi lỗi còn lại — mạng đứt, 5xx, quá hạn — là
   * content-service không dùng được, và theo hợp đồng thì phải báo lỗi thật
   * chứ không trả catalogue rỗng rồi để mô hình gợi ý trong chân không.
   */
  private async get<T>(
    path: string,
    authorization: string,
    params: Record<string, unknown>,
    action: string,
  ): Promise<T> {
    if (!authorization) {
      throw new UnauthorizedException(
        'Thiếu header Authorization để đọc dữ liệu khoá học.',
      );
    }

    const url = `${contentServiceConfig.baseUrl}${path}`;
    try {
      const response = await firstValueFrom(
        this.http.get<T>(url, {
          params,
          headers: { Authorization: authorization },
          timeout: contentServiceConfig.timeoutMs,
        }),
      );
      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError;
      const status = axiosError.response?.status;

      this.logger.error(
        `${action} thất bại: ${status ?? axiosError.code ?? ''} ${axiosError.message}`,
      );

      if (status === 401 || status === 403) {
        throw new UnauthorizedException(
          'Phiên đăng nhập không còn hiệu lực với dịch vụ khoá học. Vui lòng đăng nhập lại.',
        );
      }

      throw new ServiceUnavailableException(
        'Không lấy được dữ liệu khoá học. Vui lòng thử lại sau.',
      );
    }
  }
}
