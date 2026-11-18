'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { ApiError, api } from '@/lib/api';
import type { QuizSubmissionResult } from '@/lib/types';

export interface FormState {
  error?: string;
  ok?: boolean;
}

const ORG_COOKIE = 'lms_org';

export async function switchOrganizationAction(formData: FormData): Promise<void> {
  const orgId = String(formData.get('orgId') ?? '');
  if (!orgId) return;

  const jar = await cookies();
  jar.set(ORG_COOKIE, orgId, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  });
  revalidatePath('/', 'layout');
}

export async function createCourseAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const title = String(formData.get('title') ?? '').trim();
  if (title.length < 3) {
    return { error: 'Le titre doit contenir au moins 3 caractères.' };
  }

  try {
    const course = await api<{ id: string }>('/courses', {
      method: 'POST',
      body: {
        title,
        summary: String(formData.get('summary') ?? '').trim() || undefined,
        description: String(formData.get('description') ?? '').trim() || undefined,
        durationMin: Number(formData.get('durationMin') ?? 0) || 0,
      },
    });

    revalidatePath('/courses');
    redirect(`/courses/${course.id}`);
  } catch (error) {
    if (error instanceof ApiError) return { error: error.message };
    throw error;
  }
}

export async function publishCourseAction(formData: FormData): Promise<void> {
  const courseId = String(formData.get('courseId') ?? '');
  try {
    await api(`/courses/${courseId}/publish`, { method: 'POST' });
  } catch (error) {
    if (error instanceof ApiError) {
      redirect(`/courses/${courseId}?error=${encodeURIComponent(error.message)}`);
    }
    throw error;
  }
  revalidatePath(`/courses/${courseId}`);
  revalidatePath('/courses');
  revalidatePath('/dashboard');
}

export async function enrollAction(formData: FormData): Promise<void> {
  const courseId = String(formData.get('courseId') ?? '');
  try {
    await api(`/courses/${courseId}/enroll`, { method: 'POST' });
  } catch (error) {
    if (error instanceof ApiError) {
      redirect(`/courses/${courseId}?error=${encodeURIComponent(error.message)}`);
    }
    throw error;
  }
  revalidatePath(`/courses/${courseId}`);
  redirect(`/learn/${courseId}`);
}

// ── Certificats ────────────────────────────────────────────────────────

export async function verifyCertificateAction(formData: FormData): Promise<void> {
  const serial = String(formData.get('serial') ?? '').trim().toUpperCase();
  if (!serial) return;
  redirect(`/verify/${encodeURIComponent(serial)}`);
}

// ── Édition du cours et de son programme (staff) ───────────────────────

export async function updateCourseAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const courseId = String(formData.get('courseId') ?? '');
  const title = String(formData.get('title') ?? '').trim();
  if (title.length < 3) {
    return { error: 'Le titre doit contenir au moins 3 caractères.' };
  }

  const durationMin = Number(formData.get('durationMin') ?? 0);
  if (!Number.isFinite(durationMin) || durationMin < 0) {
    return { error: 'La durée doit être un nombre positif.' };
  }

  const level = String(formData.get('level') ?? 'BEGINNER');

  try {
    await api(`/courses/${courseId}`, {
      method: 'PATCH',
      body: {
        title,
        summary: String(formData.get('summary') ?? '').trim() || null,
        description: String(formData.get('description') ?? '').trim() || null,
        durationMin,
        level,
      },
    });
  } catch (error) {
    if (error instanceof ApiError) return { error: error.message };
    throw error;
  }

  revalidatePath(`/courses/${courseId}`);
  revalidatePath('/courses');
  revalidatePath('/dashboard');
  return { ok: true };
}

export async function addModuleAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const courseId = String(formData.get('courseId') ?? '');
  const title = String(formData.get('title') ?? '').trim();
  if (title.length < 2) {
    return { error: 'Le titre du module doit contenir au moins 2 caractères.' };
  }

  try {
    await api(`/courses/${courseId}/modules`, { method: 'POST', body: { title } });
  } catch (error) {
    if (error instanceof ApiError) return { error: error.message };
    throw error;
  }

  revalidatePath(`/courses/${courseId}`);
  return { ok: true };
}

export async function addLessonAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const courseId = String(formData.get('courseId') ?? '');
  const moduleId = String(formData.get('moduleId') ?? '');
  const title = String(formData.get('title') ?? '').trim();
  if (title.length < 2) {
    return { error: 'Le titre de la leçon doit contenir au moins 2 caractères.' };
  }

  const type = String(formData.get('type') ?? 'TEXT');
  const durationMin = Number(formData.get('durationMin') ?? 0);
  if (!Number.isFinite(durationMin) || durationMin < 0) {
    return { error: 'La durée doit être un nombre positif.' };
  }

  const text = String(formData.get('content') ?? '').trim();

  try {
    await api(`/courses/modules/${moduleId}/lessons`, {
      method: 'POST',
      body: {
        title,
        type,
        durationSec: Math.round(durationMin * 60),
        ...(text ? { content: { blocks: [{ type: 'paragraph', text }] } } : {}),
      },
    });
  } catch (error) {
    if (error instanceof ApiError) return { error: error.message };
    throw error;
  }

  revalidatePath(`/courses/${courseId}`);
  revalidatePath(`/learn/${courseId}`);
  return { ok: true };
}

export async function deleteModuleAction(formData: FormData): Promise<void> {
  const courseId = String(formData.get('courseId') ?? '');
  const moduleId = String(formData.get('moduleId') ?? '');

  try {
    await api(`/courses/modules/${moduleId}`, { method: 'DELETE' });
  } catch (error) {
    if (error instanceof ApiError) {
      redirect(`/courses/${courseId}?error=${encodeURIComponent(error.message)}`);
    }
    throw error;
  }

  revalidatePath(`/courses/${courseId}`);
  revalidatePath(`/learn/${courseId}`);
}

export async function deleteLessonAction(formData: FormData): Promise<void> {
  const courseId = String(formData.get('courseId') ?? '');
  const lessonId = String(formData.get('lessonId') ?? '');

  try {
    await api(`/lessons/${lessonId}`, { method: 'DELETE' });
  } catch (error) {
    if (error instanceof ApiError) {
      redirect(`/courses/${courseId}?error=${encodeURIComponent(error.message)}`);
    }
    throw error;
  }

  revalidatePath(`/courses/${courseId}`);
  revalidatePath(`/learn/${courseId}`);
}

export async function archiveCourseAction(formData: FormData): Promise<void> {
  const courseId = String(formData.get('courseId') ?? '');

  try {
    await api(`/courses/${courseId}/archive`, { method: 'POST' });
  } catch (error) {
    if (error instanceof ApiError) {
      redirect(`/courses/${courseId}?error=${encodeURIComponent(error.message)}`);
    }
    throw error;
  }

  revalidatePath(`/courses/${courseId}`);
  revalidatePath('/courses');
  revalidatePath('/dashboard');
}

export async function deleteCourseAction(formData: FormData): Promise<void> {
  const courseId = String(formData.get('courseId') ?? '');

  try {
    await api(`/courses/${courseId}`, { method: 'DELETE' });
  } catch (error) {
    if (error instanceof ApiError) {
      redirect(`/courses/${courseId}?error=${encodeURIComponent(error.message)}`);
    }
    throw error;
  }

  revalidatePath('/courses');
  revalidatePath('/dashboard');
  redirect('/courses');
}

// ── Quiz ───────────────────────────────────────────────────────────────

export async function saveQuizAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const courseId = String(formData.get('courseId') ?? '');
  const lessonId = String(formData.get('lessonId') ?? '');
  const passingScore = Number(formData.get('passingScore') ?? 70);

  if (!Number.isFinite(passingScore) || passingScore < 0 || passingScore > 100) {
    return { error: 'Le score de réussite doit être compris entre 0 et 100.' };
  }

  try {
    await api(`/lessons/${lessonId}/quiz`, {
      method: 'PUT',
      body: { passingScore: Math.round(passingScore) },
    });
  } catch (error) {
    if (error instanceof ApiError) return { error: error.message };
    throw error;
  }

  revalidatePath(`/courses/${courseId}/lessons/${lessonId}/quiz`);
  revalidatePath(`/learn/${courseId}`);
  return { ok: true };
}

export async function addQuestionAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const courseId = String(formData.get('courseId') ?? '');
  const lessonId = String(formData.get('lessonId') ?? '');
  const prompt = String(formData.get('prompt') ?? '').trim();

  if (prompt.length < 3) {
    return { error: 'L’énoncé doit contenir au moins 3 caractères.' };
  }

  const correctRaw = Number(formData.get('correctIndex') ?? 0);
  const options = [0, 1, 2, 3, 4, 5]
    .map((index) => ({
      index,
      text: String(formData.get(`option${index}`) ?? '').trim(),
    }))
    .filter((option) => option.text.length > 0);

  if (options.length < 2) {
    return { error: 'Renseignez au moins deux propositions.' };
  }

  const correctPosition = options.findIndex((option) => option.index === correctRaw);
  if (correctPosition < 0) {
    return { error: 'La bonne réponse ne peut pas être une proposition vide.' };
  }

  try {
    await api(`/lessons/${lessonId}/quiz/questions`, {
      method: 'POST',
      body: {
        prompt,
        options: options.map((option) => option.text),
        correctIndex: correctPosition,
        explanation: String(formData.get('explanation') ?? '').trim() || undefined,
      },
    });
  } catch (error) {
    if (error instanceof ApiError) return { error: error.message };
    throw error;
  }

  revalidatePath(`/courses/${courseId}/lessons/${lessonId}/quiz`);
  revalidatePath(`/learn/${courseId}`);
  return { ok: true };
}

export async function deleteQuestionAction(formData: FormData): Promise<void> {
  const courseId = String(formData.get('courseId') ?? '');
  const lessonId = String(formData.get('lessonId') ?? '');
  const questionId = String(formData.get('questionId') ?? '');

  try {
    await api(`/quiz-questions/${questionId}`, { method: 'DELETE' });
  } catch (error) {
    if (error instanceof ApiError) {
      redirect(
        `/courses/${courseId}/lessons/${lessonId}/quiz?error=${encodeURIComponent(error.message)}`,
      );
    }
    throw error;
  }

  revalidatePath(`/courses/${courseId}/lessons/${lessonId}/quiz`);
  revalidatePath(`/learn/${courseId}`);
}

export async function deleteQuizAction(formData: FormData): Promise<void> {
  const courseId = String(formData.get('courseId') ?? '');
  const lessonId = String(formData.get('lessonId') ?? '');

  try {
    await api(`/lessons/${lessonId}/quiz`, { method: 'DELETE' });
  } catch (error) {
    if (error instanceof ApiError) {
      redirect(
        `/courses/${courseId}/lessons/${lessonId}/quiz?error=${encodeURIComponent(error.message)}`,
      );
    }
    throw error;
  }

  revalidatePath(`/courses/${courseId}`);
  revalidatePath(`/learn/${courseId}`);
  redirect(`/courses/${courseId}`);
}

export interface QuizSubmitState {
  error?: string;
  result?: QuizSubmissionResult;
}

export async function submitQuizAction(
  _prev: QuizSubmitState,
  formData: FormData,
): Promise<QuizSubmitState> {
  const courseId = String(formData.get('courseId') ?? '');
  const lessonId = String(formData.get('lessonId') ?? '');

  const answers: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    if (key.startsWith('answer_') && typeof value === 'string' && value) {
      answers[key.slice('answer_'.length)] = value;
    }
  }

  try {
    const result = await api<QuizSubmissionResult>(`/lessons/${lessonId}/quiz/attempts`, {
      method: 'POST',
      body: { answers },
    });

    revalidatePath(`/learn/${courseId}`);
    revalidatePath(`/courses/${courseId}`);
    revalidatePath('/dashboard');
    return { result };
  } catch (error) {
    if (error instanceof ApiError) return { error: error.message };
    throw error;
  }
}

export async function toggleLessonAction(formData: FormData): Promise<void> {
  const lessonId = String(formData.get('lessonId') ?? '');
  const courseId = String(formData.get('courseId') ?? '');
  const completed = String(formData.get('completed') ?? 'true') === 'true';

  await api(`/lessons/${lessonId}/complete`, {
    method: completed ? 'POST' : 'DELETE',
  });

  revalidatePath(`/learn/${courseId}`);
  revalidatePath(`/courses/${courseId}`);
  revalidatePath('/dashboard');
}
