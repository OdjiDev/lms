'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { ApiError, api } from '@/lib/api';

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
