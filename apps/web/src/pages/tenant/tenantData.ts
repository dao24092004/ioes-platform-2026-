export type TenantPlan = 'free' | 'professional' | 'enterprise' | 'trial' | 'basic';
export type TenantStatus = 'active' | 'trial' | 'suspended';

export interface TenantCardData {
  id: string;
  name: string;
  domain: string;
  logoText: string;
  logoGradient: string;
  status: TenantStatus;
  plan: TenantPlan;
  planExpire: string;
  users: number;
  courses: number;
  exams: number;
  region: string;
  description: string;
  highlight?: boolean;
}

export const TENANTS: TenantCardData[] = [
  {
    id: 'fpt-university',
    name: 'FPT University',
    domain: 'fpt.edu.vn',
    logoText: 'FU',
    logoGradient: 'from-blue-600 to-cyan-500',
    status: 'active',
    plan: 'enterprise',
    planExpire: '31/12/2026',
    users: 2847,
    courses: 156,
    exams: 18000,
    region: 'TP. Hồ Chí Minh',
    description: 'Đối tác chiến lược từ 2022 — triển khai IOES cho toàn bộ chương trình CNTT và Kinh tế.',
    highlight: true,
  },
  {
    id: 'hcmus',
    name: 'ĐH Khoa học Tự nhiên (HCMUS)',
    domain: 'hcmus.edu.vn',
    logoText: 'HCMUS',
    logoGradient: 'from-emerald-600 to-cyan-600',
    status: 'active',
    plan: 'professional',
    planExpire: '15/06/2026',
    users: 1523,
    courses: 89,
    exams: 8200,
    region: 'TP. Hồ Chí Minh',
    description: 'Khoa Toán – Tin học ứng dụng IOES cho hệ thống luyện thi Olympic và kiểm tra thường xuyên.',
  },
  {
    id: 'neu',
    name: 'ĐH Kinh tế Quốc dân (NEU)',
    domain: 'neu.edu.vn',
    logoText: 'NEU',
    logoGradient: 'from-purple-600 to-pink-500',
    status: 'trial',
    plan: 'trial',
    planExpire: 'Còn lại 14 ngày',
    users: 456,
    courses: 12,
    exams: 234,
    region: 'Hà Nội',
    description: 'Đang trong giai pilot 1 học kỳ — khoa Kinh tế & Quản trị kinh doanh.',
  },
  {
    id: 'vnu',
    name: 'ĐH Quốc gia Hà Nội (VNU)',
    domain: 'vnu.edu.vn',
    logoText: 'VNU',
    logoGradient: 'from-rose-600 to-orange-500',
    status: 'active',
    plan: 'enterprise',
    planExpire: '31/03/2027',
    users: 5234,
    courses: 234,
    exams: 32000,
    region: 'Hà Nội',
    description: 'Triển khai đa campus — đồng bộ dữ liệu giữa 7 trường thành viên trên cùng một tenant.',
  },
  {
    id: 'uit',
    name: 'ĐH Công nghệ Thông tin (UIT)',
    domain: 'uit.edu.vn',
    logoText: 'UIT',
    logoGradient: 'from-cyan-600 to-sky-500',
    status: 'active',
    plan: 'professional',
    planExpire: '20/09/2026',
    users: 3156,
    courses: 178,
    exams: 21000,
    region: 'TP. Hồ Chí Minh',
    description: 'Dùng IOES làm LMS chính cho chương trình IT-Education và các khóa online ngắn hạn.',
  },
  {
    id: 'abc-training',
    name: 'ABC Training Corp',
    domain: 'abc-training.com',
    logoText: 'ABC',
    logoGradient: 'from-slate-500 to-slate-700',
    status: 'suspended',
    plan: 'basic',
    planExpire: 'Đã hết hạn 01/08/2026',
    users: 234,
    courses: 8,
    exams: 1200,
    region: 'Đà Nẵng',
    description: 'Trung tâm đào tạo doanh nghiệp — hiện tạm dừng trong giai đoạn tái cấu trúc.',
  },
];
