import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Redirect, router, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { Enrollment } from '@lms/types';
import { useAuth } from '@/lib/auth';
import { colors, radius, spacing } from '@/lib/theme';
import { BottomNav } from '@/components/bottom-nav';
import { Badge, Button, Card, ErrorBanner, Loading, ProgressBar } from '@/components/ui';

export default function MyCoursesScreen() {
  const { session, user, request } = useAuth();
  const [enrollments, setEnrollments] = useState<Enrollment[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!session) return;
    try {
      setError(null);
      const data = await request<Enrollment[]>('/me/enrollments');
      setEnrollments(data.filter((item) => item.status !== 'CANCELLED'));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Erreur de chargement');
    }
  }, [request, session]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  if (!session) return <Redirect href="/login" />;
  if (!enrollments && !error) return <Loading />;

  const active = (enrollments ?? []).filter((item) => item.status === 'ACTIVE');
  const completed = (enrollments ?? []).filter((item) => item.status === 'COMPLETED');
  const organizationName = user?.memberships[0]?.organization.name ?? 'Mon organisation';

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => {
              setRefreshing(true);
              await load();
              setRefreshing(false);
            }}
            tintColor={colors.inkMuted}
          />
        }
      >
        <View style={styles.header}>
          <Text style={styles.eyebrow}>{organizationName}</Text>
          <Text style={styles.title}>Bonjour {user?.firstName ?? ''} 👋</Text>
          <Text style={styles.subtitle}>Reprenez votre formation là où vous l’avez laissée.</Text>
        </View>

        <ErrorBanner message={error} />

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>En cours</Text>
          <Text style={styles.sectionCount}>{active.length}</Text>
        </View>

        {active.length === 0 ? (
          <Card>
            <Text style={styles.emptyTitle}>Aucune formation en cours</Text>
            <Text style={styles.emptyText}>
              Parcourez le catalogue et inscrivez-vous à votre premier parcours.
            </Text>
            <View style={{ marginTop: spacing.md }}>
              <Button label="Voir le catalogue" onPress={() => router.push('/courses')} />
            </View>
          </Card>
        ) : (
          active.map((enrollment) => (
            <Card key={enrollment.id} style={styles.courseCard}>
              <Text style={styles.courseTitle}>{enrollment.course.title}</Text>
              {enrollment.course.summary ? (
                <Text style={styles.courseSummary} numberOfLines={2}>
                  {enrollment.course.summary}
                </Text>
              ) : null}
              <View style={styles.metaRow}>
                <Badge label={`${enrollment.course._count.modules} modules`} />
                <Text style={styles.metaText}>{enrollment.course.durationMin} min</Text>
              </View>
              <View style={styles.progressRow}>
                <View style={{ flex: 1 }}>
                  <ProgressBar value={enrollment.progressPct} />
                </View>
                <Text style={styles.progressLabel}>{enrollment.progressPct} %</Text>
              </View>
              <View style={{ marginTop: spacing.md }}>
                <Button
                  label={enrollment.progressPct > 0 ? 'Continuer' : 'Commencer'}
                  variant="dark"
                  onPress={() =>
                    router.push({ pathname: '/course/[id]', params: { id: enrollment.courseId } })
                  }
                />
              </View>
            </Card>
          ))
        )}

        {completed.length > 0 ? (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Terminés</Text>
              <Text style={styles.sectionCount}>{completed.length}</Text>
            </View>
            {completed.map((enrollment) => (
              <Card key={enrollment.id} style={styles.completedCard}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.courseTitle}>{enrollment.course.title}</Text>
                  <Text style={styles.metaText}>Parcours terminé · 100 %</Text>
                </View>
                <Text style={styles.check}>✓</Text>
              </Card>
            ))}
          </>
        ) : null}

        <View style={{ height: spacing.xl }} />
      </ScrollView>
      <BottomNav />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.paper },
  content: { padding: spacing.lg, paddingBottom: spacing.lg },
  header: { paddingVertical: spacing.lg },
  eyebrow: { fontSize: 11, fontWeight: '800', letterSpacing: 0.8, color: colors.inkMuted },
  title: { marginTop: 6, fontSize: 26, fontWeight: '800', color: colors.ink },
  subtitle: { marginTop: 4, fontSize: 13, color: colors.inkMuted },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: colors.ink },
  sectionCount: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.inkMuted,
    backgroundColor: 'rgba(13,18,32,0.06)',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: radius.pill,
    overflow: 'hidden',
  },
  courseCard: { marginBottom: spacing.md },
  courseTitle: { fontSize: 16, fontWeight: '700', color: colors.ink },
  courseSummary: { marginTop: 4, fontSize: 13, lineHeight: 19, color: colors.inkMuted },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: spacing.md },
  metaText: { fontSize: 11, color: colors.inkMuted, fontWeight: '600' },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  progressLabel: { fontSize: 12, fontWeight: '800', color: colors.ink },
  emptyTitle: { fontSize: 15, fontWeight: '700', color: colors.ink },
  emptyText: { marginTop: 4, fontSize: 13, lineHeight: 19, color: colors.inkMuted },
  completedCard: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm },
  check: { fontSize: 18, color: colors.success },
});
