import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Redirect, router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { CourseDetail, MyProgress } from '@lms/types';
import { useAuth } from '@/lib/auth';
import { colors, radius, spacing } from '@/lib/theme';
import { Badge, Button, Card, ErrorBanner, Loading, ProgressBar } from '@/components/ui';

export default function CourseScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session, request } = useAuth();
  const [course, setCourse] = useState<CourseDetail | null>(null);
  const [progress, setProgress] = useState<MyProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!session || !id) return;
    try {
      setError(null);
      const [courseData, progressData] = await Promise.all([
        request<CourseDetail>(`/courses/${id}`),
        request<MyProgress>(`/courses/${id}/my-progress`),
      ]);
      setCourse(courseData);
      setProgress(progressData);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Erreur de chargement');
    }
  }, [id, request, session]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  if (!session) return <Redirect href="/login" />;
  if (!course && !error) return <Loading />;
  if (!course) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={{ padding: spacing.lg }}>
          <ErrorBanner message={error} />
          <Button label="Retour" variant="ghost" onPress={() => router.back()} />
        </View>
      </SafeAreaView>
    );
  }

  const enrollment = progress?.enrollment ?? null;
  const completed = new Set(progress?.completedLessonIds ?? []);
  const lessons = course.modules.flatMap((module) => module.lessons);

  async function enroll() {
    setBusy(true);
    try {
      await request(`/courses/${id}/enroll`, { method: 'POST' });
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Inscription impossible');
    } finally {
      setBusy(false);
    }
  }

  async function toggle(lessonId: string, isDone: boolean) {
    setBusy(true);
    try {
      await request(`/lessons/${lessonId}/complete`, { method: isDone ? 'DELETE' : 'POST' });
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Mise à jour impossible');
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Pressable onPress={() => router.back()} style={{ paddingVertical: spacing.md }}>
          <Text style={styles.back}>← Retour</Text>
        </Pressable>

        <ErrorBanner message={error} />

        <View style={styles.hero}>
          <View style={styles.heroBadges}>
            <Badge label={course.status === 'PUBLISHED' ? 'Publié' : course.status} tone="warn" />
            <Badge label={course.level.toLowerCase()} />
          </View>
          <Text style={styles.title}>{course.title}</Text>
          {course.summary ? <Text style={styles.summary}>{course.summary}</Text> : null}
          <Text style={styles.meta}>
            {course.modules.length} modules · {lessons.length} leçons · {course.durationMin} min
          </Text>
        </View>

        {enrollment ? (
          <Card style={{ marginTop: spacing.md }}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressTitle}>Votre progression</Text>
              <Text style={styles.progressValue}>{enrollment.progressPct} %</Text>
            </View>
            <ProgressBar value={enrollment.progressPct} />
          </Card>
        ) : (
          <View style={{ marginTop: spacing.md }}>
            <Button
              label="S’inscrire au cours"
              onPress={() => void enroll()}
              loading={busy}
              disabled={course.status !== 'PUBLISHED'}
            />
            {course.status !== 'PUBLISHED' ? (
              <Text style={styles.hint}>Ce cours n’est pas encore publié.</Text>
            ) : null}
          </View>
        )}

        {course.modules.map((module, index) => (
          <View key={module.id} style={{ marginTop: spacing.lg }}>
            <Text style={styles.moduleTitle}>
              {String(index + 1).padStart(2, '0')} · {module.title}
            </Text>
            {module.lessons.map((lesson) => {
              const isDone = completed.has(lesson.id);
              const pressable = Boolean(enrollment);
              return (
                <Pressable
                  key={lesson.id}
                  disabled={!pressable || busy}
                  onPress={() => void toggle(lesson.id, isDone)}
                  style={({ pressed }) => [
                    styles.lesson,
                    pressed && pressable ? { opacity: 0.6 } : null,
                  ]}
                >
                  <View style={[styles.lessonCheck, isDone && styles.lessonCheckDone]}>
                    {isDone ? (
                      <Text style={styles.lessonCheckLabel}>✓</Text>
                    ) : (
                      <Text style={styles.lessonDot}>•</Text>
                    )}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.lessonTitle, isDone && { color: colors.inkMuted }]}>
                      {lesson.title}
                    </Text>
                    <Text style={styles.lessonMeta}>
                      {lesson.type.toLowerCase()} · {Math.round(lesson.durationSec / 60)} min
                    </Text>
                  </View>
                  {busy ? <ActivityIndicator size="small" color={colors.inkMuted} /> : null}
                </Pressable>
              );
            })}
          </View>
        ))}

        {!enrollment ? (
          <Text style={styles.hint}>
            Inscrivez-vous pour cocher les leçons et suivre votre progression.
          </Text>
        ) : null}

        <View style={{ height: spacing.xxl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.paper },
  content: { padding: spacing.lg },
  back: { fontSize: 13, fontWeight: '700', color: colors.inkMuted },
  hero: {
    backgroundColor: colors.ink,
    borderRadius: radius.xl,
    padding: spacing.xl,
  },
  heroBadges: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  title: { fontSize: 24, fontWeight: '800', color: colors.white, lineHeight: 30 },
  summary: { marginTop: spacing.sm, fontSize: 13, lineHeight: 19, color: colors.whiteMuted },
  meta: { marginTop: spacing.md, fontSize: 11, fontWeight: '600', color: colors.whiteMuted },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  progressTitle: { fontSize: 12, fontWeight: '700', color: colors.ink },
  progressValue: { fontSize: 12, fontWeight: '800', color: colors.ink },
  moduleTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.ink,
    marginBottom: spacing.sm,
  },
  lesson: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  lessonCheck: {
    width: 24,
    height: 24,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(13,18,32,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lessonCheckDone: { backgroundColor: colors.successSoft },
  lessonCheckLabel: { fontSize: 11, fontWeight: '800', color: colors.success },
  lessonDot: { fontSize: 14, color: colors.inkMuted },
  lessonTitle: { fontSize: 14, fontWeight: '600', color: colors.ink },
  lessonMeta: { marginTop: 2, fontSize: 10, color: colors.inkMuted, textTransform: 'capitalize' },
  hint: { marginTop: spacing.md, fontSize: 12, color: colors.inkMuted, textAlign: 'center' },
});
