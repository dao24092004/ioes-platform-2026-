const fs = require('fs');
const path = require('path');

const files = [
  'src/pages/student/CertificatesPage.tsx',
  'src/pages/student/CourseDetailPage.tsx',
  'src/pages/student/CourseLearnPage.tsx',
  'src/pages/student/CoursesPage.tsx',
  'src/pages/student/DashboardPage.tsx',
  'src/pages/student/EnrollmentPage.tsx',
  'src/pages/student/ExamResultsPage.tsx',
  'src/pages/student/ExamsPage.tsx',
  'src/pages/student/ExamTakingPage.tsx',
  'src/pages/student/LeaderboardPage.tsx',
  'src/pages/student/LearningPathPage.tsx',
  'src/pages/student/PracticeQuizPage.tsx',
  'src/pages/student/ProfilePage.tsx',
  'src/pages/student/ReportsPage.tsx',
];

const baseDir = 'c:/Users/Admin/AiProject/ioes-platform-2026-/apps/web';

const fixes = {
  'src/pages/student/CertificatesPage.tsx': [
    { find: '.map(c => (', replace: '.map((c: StudentCertificate) => (' },
  ],
  'src/pages/student/CourseDetailPage.tsx': [
    { find: 'course.what_you_learn.map((item: string, i: number) => (', replace: 'course.what_you_learn.map((item: string, i: number) => (' }, // already typed
    { find: 'reviews.map(r => (', replace: 'reviews.map((r: StudentCourseReview) => (' },
    { find: 'course.requirements.map((req: string, i: number) => (', replace: 'course.requirements.map((req: string, i: number) => (' }, // ok
    { find: 'course.curriculum.map((section: any, idx: number) => (', replace: 'course.curriculum.map((section: any, idx: number) => (' }, // ok
    { find: 'section.lessons.map((l: any, li: number) => (', replace: 'section.lessons.map((l: any, li: number) => (' }, // ok
    { find: 'posts.slice(0, 5).map(p => (', replace: 'posts.slice(0, 5).map((p: DiscussionPost) => (' },
    { find: 'p.author_name.split(\' \').slice(0, 2).map(s => s.charAt(0))', replace: "p.author_name.split(' ').slice(0, 2).map((s: string) => s.charAt(0))" },
  ],
  'src/pages/student/CourseLearnPage.tsx': [
    { find: 'onClick={() => lesson && markComplete(lesson.id) && setActiveIdx(Math.min(totalLessons - 1, activeIdx + 1))}',
      replace: 'onClick={() => { if (lesson) { markComplete(lesson.id); setActiveIdx(Math.min(totalLessons - 1, activeIdx + 1)); } }}' },
  ],
  'src/pages/student/CoursesPage.tsx': [
    { find: "let arr = courses;", replace: 'let arr: StudentEnrolledCourse[] = courses;' },
    { find: 'if (status !== \'all\') arr = arr.filter(c => c.status === status);',
      replace: "if (status !== 'all') arr = arr.filter((c: StudentEnrolledCourse) => c.status === status);" },
    { find: 'if (search.trim()) {\n      const q = search.toLowerCase();\n      arr = arr.filter(c => c.title.toLowerCase().includes(q) || c.instructor.toLowerCase().includes(q));\n    }',
      replace: 'if (search.trim()) {\n      const q = search.toLowerCase();\n      arr = arr.filter((c: StudentEnrolledCourse) => c.title.toLowerCase().includes(q) || c.instructor.toLowerCase().includes(q));\n    }' },
    { find: 'if (sort === \'progress\') arr = [...arr].sort((a, b) => b.progress - a.progress);\n    else if (sort === \'title\') arr = [...arr].sort((a, b) => a.title.localeCompare(b.title));',
      replace: "if (sort === 'progress') arr = [...arr].sort((a: StudentEnrolledCourse, b: StudentEnrolledCourse) => b.progress - a.progress);\n    else if (sort === 'title') arr = [...arr].sort((a: StudentEnrolledCourse, b: StudentEnrolledCourse) => a.title.localeCompare(b.title));" },
    { find: '<CourseCard key={course.id} course={course} />', replace: '<CourseCard key={course.id} course={course as StudentEnrolledCourse} />' },
  ],
  'src/pages/student/DashboardPage.tsx': [
    // Already fixed in prior edits; keep noop
  ],
  'src/pages/student/EnrollmentPage.tsx': [
    { find: "import { Link } from 'react-router-dom';\nimport { useTranslation } from 'react-i18next';",
      replace: "import { useTranslation } from 'react-i18next';" },
  ],
  'src/pages/student/ExamResultsPage.tsx': [
    { find: 'r.breakdown.map((b, i) => {', replace: 'r.breakdown.map((b: { section: string; score: number; max: number }, i: number) => {' },
    { find: 'results.map(res => (', replace: 'results.map((res: StudentExamResult) => (' },
  ],
  'src/pages/student/ExamTakingPage.tsx': [
    { find: "import React, { useEffect, useMemo, useState } from 'react';",
      replace: "import React, { useEffect, useState } from 'react';" },
    { find: "import { Link, useNavigate, useParams } from 'react-router-dom';",
      replace: "import { useNavigate, useParams } from 'react-router-dom';" },
  ],
  'src/pages/student/LeaderboardPage.tsx': [
    { find: 'entries.find(e => e.rank === 42);', replace: 'entries.find((e: LeaderboardEntry) => e.rank === 42);' },
    { find: 'top3[1], top3[0], top3[2]).map((entry, idx) => {',
      replace: '[top3[1], top3[0], top3[2]].map((entry: LeaderboardEntry | undefined, idx: number) => {' },
    { find: 'entry.full_name.split(\' \').slice(0, 2).map(s => s.charAt(0))',
      replace: "entry.full_name.split(' ').slice(0, 2).map((s: string) => s.charAt(0))" },
    { find: 'rest.map(entry => {', replace: 'rest.map((entry: LeaderboardEntry) => {' },
  ],
  'src/pages/student/LearningPathPage.tsx': [
    { find: "import { Card, CardTitleWithIcon } from '@/components/common/Card';\nimport { studentApi, type StudentLearningPath } from '@/services/api';",
      replace: "import { Card } from '@/components/common/Card';\nimport { studentApi } from '@/services/api';" },
    { find: '{paths.map((p, i) => (', replace: '{paths.map((p: StudentLearningPath, i: number) => (' },
    { find: 'path.steps.reduce((s, st) => s + st.estimated_hours, 0)',
      replace: 'path.steps.reduce((s: number, st: StudentLearningPath[\'steps\'][number]) => s + st.estimated_hours, 0)' },
    { find: 'path.steps.filter(s => s.status === \'done\').length',
      replace: "path.steps.filter((s: StudentLearningPath['steps'][number]) => s.status === 'done').length" },
    { find: 'path.steps.map((step, i) => {', replace: 'path.steps.map((step: StudentLearningPath[\'steps\'][number]) => {' },
  ],
  'src/pages/student/PracticeQuizPage.tsx': [
    { find: 'const [topic, setTopic] = useState<string>(\'\');', replace: "const [topic] = useState<string>('');" },
    { find: 'q.options.map((opt, i) => {', replace: 'q.options.map((opt: string, i: number) => {' },
  ],
  'src/pages/student/ProfilePage.tsx': [
    { find: "import { Card, CardTitleWithIcon } from '@/components/common/Card';",
      replace: "import { Card } from '@/components/common/Card';" },
  ],
  'src/pages/student/ReportsPage.tsx': [
    { find: "  const { t } = useTranslation();", replace: '  ' },
  ],
};

for (const rel of files) {
  const fp = path.join(baseDir, rel);
  if (!fs.existsSync(fp)) { console.log('SKIP missing', rel); continue; }
  let content = fs.readFileSync(fp, 'utf8');
  const list = fixes[rel] || [];
  let changed = false;
  for (const f of list) {
    if (content.includes(f.find)) {
      content = content.replace(f.find, f.replace);
      changed = true;
    }
  }
  if (changed) {
    fs.writeFileSync(fp, content, 'utf8');
    console.log('FIXED', rel);
  } else {
    console.log('NOCHG', rel);
  }
}