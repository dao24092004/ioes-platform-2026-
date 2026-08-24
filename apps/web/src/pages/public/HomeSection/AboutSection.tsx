import React from 'react';

const AboutSection: React.FC = () => {
  return (
    <section id="about" className="py-24 bg-slate-50 dark:bg-slate-800">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <span className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-100 dark:bg-cyan-900/50 text-cyan-700 dark:text-cyan-300 rounded-full text-sm font-medium mb-4">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Quy trình hoạt động
          </span>
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-4">
            3 bước đơn giản để bắt đầu
          </h2>
          <p className="text-lg text-slate-600 dark:text-slate-300">
            Từ đăng ký đến hoàn thành kỳ thi, tất cả chỉ trong vài phút
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {/* Step 1 */}
          <div className="text-center">
            <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center text-white text-2xl font-bold mx-auto mb-6">
              1
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">Đăng ký tài khoản</h3>
            <p className="text-slate-600 dark:text-slate-300">
              Tạo tài khoản miễn phí với email hoặc đăng nhập qua Google, GitHub trong vài giây
            </p>
          </div>

          {/* Step 2 */}
          <div className="text-center">
            <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center text-white text-2xl font-bold mx-auto mb-6">
              2
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">Tham gia khóa học</h3>
            <p className="text-slate-600 dark:text-slate-300">
              Chọn khóa học phù hợp, theo dõi bài giảng và làm bài tập theo lộ trình cá nhân hóa
            </p>
          </div>

          {/* Step 3 */}
          <div className="text-center">
            <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center text-white text-2xl font-bold mx-auto mb-6">
              3
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">Hoàn thành kỳ thi</h3>
            <p className="text-slate-600 dark:text-slate-300">
              Làm bài thi với giám sát AI, nhận kết quả ngay và chứng chỉ được xác thực blockchain
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AboutSection;