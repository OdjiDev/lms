/**
 * Contrats partagés entre le web (Next.js) et le mobile (Expo).
 * Source de vérité : les DTO NestJS. Ces types décrivent le JSON renvoyé.
 */

export type Role = 'OWNER' | 'ADMIN' | 'INSTRUCTOR' | 'LEARNER';
export type CourseStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
export type LessonType = 'VIDEO' | 'TEXT' | 'QUIZ' | 'FILE';

export interface SessionUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
}

export interface MeResponse extends SessionUser {
  locale: string;
  createdAt: string;
  memberships: Array<{
    role: Role;
    organization: { id: string; name: string; slug: string };
  }>;
}

export interface OrganizationSummary {
  id: string;
  name: string;
  slug: string;
  role: Role;
}

export interface CourseCard {
  id: string;
  title: string;
  slug: string;
  summary: string | null;
  coverUrl: string | null;
  status: CourseStatus;
  level: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
  language: string;
  durationMin: number;
  publishedAt: string | null;
  updatedAt: string;
  _count: { modules: number; enrollments: number };
}

export interface Lesson {
  id: string;
  moduleId: string;
  title: string;
  type: LessonType;
  content: unknown;
  videoUrl: string | null;
  durationSec: number;
  position: number;
  isPreview: boolean;
}

export interface Module {
  id: string;
  courseId: string;
  title: string;
  position: number;
  lessons: Lesson[];
}

export interface CourseDetail {
  id: string;
  title: string;
  slug: string;
  summary: string | null;
  coverUrl: string | null;
  status: CourseStatus;
  level: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
  language: string;
  durationMin: number;
  publishedAt: string | null;
  updatedAt: string;
  description: string | null;
  modules: Module[];
  _count: { enrollments: number };
}

export interface Enrollment {
  id: string;
  courseId: string;
  userId: string;
  status: 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
  progressPct: number;
  enrolledAt: string;
  lastAccessAt: string | null;
  completedAt: string | null;
  course: {
    id: string;
    title: string;
    slug: string;
    summary: string | null;
    coverUrl: string | null;
    durationMin: number;
    _count: { modules: number };
  };
}

export interface OrgStats {
  courses: number;
  publishedCourses: number;
  learners: number;
  enrollments: number;
  completedEnrollments: number;
  completionRate: number;
}

export interface MyProgress {
  enrollment: Enrollment | null;
  completedLessonIds: string[];
  watchedSecByLesson: Record<string, number>;
  certificate: { id: string; serial: string; issuedAt: string } | null;
}

// ──────────────────────────── Certificats ─────────────────────────────

export interface Certificate {
  id: string;
  serial: string;
  issuedAt: string;
  course: {
    id: string;
    title: string;
    slug: string;
    durationMin: number;
    level: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
  };
  user: { id: string; firstName: string; lastName: string; email: string };
  organization: { id: string; name: string; slug: string };
}

/** Réponse publique de vérification — aucune donnée sensible. */
export interface PublicCertificate {
  valid: true;
  serial: string;
  issuedAt: string;
  learnerName: string;
  courseTitle: string;
  courseDurationMin: number;
  organizationName: string;
}

// ─────────────────────────────── Quiz ─────────────────────────────────

export interface QuizOption {
  id: string;
  text: string;
}

export interface QuizQuestion {
  id: string;
  prompt: string;
  position: number;
  options: QuizOption[];
}

/** Quiz tel que renvoyé au formateur (avec corrections). */
export interface StaffQuiz {
  id: string;
  lessonId: string;
  passingScore: number;
  questions: Array<QuizQuestion & { correctOptionId: string; explanation: string | null }>;
}

export interface QuizAttemptSummary {
  id: string;
  score: number;
  passed: boolean;
  submittedAt: string;
}

/** Quiz tel que renvoyé à l'apprenant : sans les bonnes réponses. */
export interface LearnerQuiz {
  quiz: {
    id: string;
    lessonId: string;
    passingScore: number;
    questions: QuizQuestion[];
  } | null;
  canAttempt: boolean;
  bestScore: number | null;
  passed: boolean;
  attempts: QuizAttemptSummary[];
}

export interface QuizCorrection {
  questionId: string;
  given: string | null;
  correctOptionId: string;
  isCorrect: boolean;
  explanation: string | null;
}

export interface QuizSubmissionResult {
  attempt: QuizAttemptSummary;
  score: number;
  passed: boolean;
  passingScore: number;
  correct: number;
  total: number;
  details: QuizCorrection[];
}

export interface Paginated<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
}

export interface AuthSession {
  accessToken: string;
  refreshToken: string;
  tokenType: 'Bearer';
  expiresIn: number;
  user: SessionUser;
  organizations: OrganizationSummary[];
  activeOrganizationId: string;
}
