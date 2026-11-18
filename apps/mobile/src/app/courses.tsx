import { useCallback, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { Redirect, router, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { CourseCard, Paginated } from '@lms/types';
import { useAuth } from '@/lib/auth';
import { colors, radius, spacing } from '@/lib/theme';
import { BottomNav } from '@/components/bottom-nav';
import { Badge, Card, ErrorBanner, Loading } from '@/components/ui';

export default function CatalogScreen() {
  const { session, request } = useAuth();
  const [courses, setCourses] = useState<CourseCard[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!session) return;
    try {
      setError(null);
      const data = await request<Paginated<CourseCard>>('/courses?limit=50');
      setCourses(data.items);
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
  if (!courses && !error) return <Loading />;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <FlatList
        data={courses ?? []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => {
              setRefreshing(true);
              await load();
              setRefreshing(false);
            }}
          />
        }
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.eyebrow}>Catalogue</Text>
            <Text style={styles.title}>Tous les parcours</Text>
            <Text style={styles.subtitle}>Disponibles dans votre organisation.</Text>
            <View style={{ marginTop: spacing.md }}>
              <ErrorBanner message={error} />
            </View>
          </View>
        }
        ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
        ListEmptyComponent={
          <Card>
            <Text style={styles.empty}>Aucun cours publié pour le moment.</Text>
          </Card>
        }
        renderItem={({ item }) => (
          <Card style={styles.card}>
            <Badge label={item.level.toLowerCase()} tone="warn" />
            <Text style={styles.courseTitle}>{item.title}</Text>
            {item.summary ? (
              <Text style={styles.summary} numberOfLines={2}>
                {item.summary}
              </Text>
            ) : null}
            <Text style={styles.meta}>
              {item._count.modules} modules · {item.durationMin} min · {item._count.enrollments}{' '}
              inscrits
            </Text>
            <Text
              style={styles.link}
              onPress={() => router.push({ pathname: '/course/[id]', params: { id: item.id } })}
            >
              Voir le cours →
            </Text>
          </Card>
        )}
        ListFooterComponent={<View style={{ height: spacing.xl }} />}
      />
      <BottomNav />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.paper },
  content: { padding: spacing.lg },
  header: { paddingVertical: spacing.lg },
  eyebrow: { fontSize: 11, fontWeight: '800', letterSpacing: 0.8, color: colors.inkMuted },
  title: { marginTop: 6, fontSize: 26, fontWeight: '800', color: colors.ink },
  subtitle: { marginTop: 4, fontSize: 13, color: colors.inkMuted },
  card: { padding: spacing.lg },
  courseTitle: { marginTop: spacing.sm, fontSize: 16, fontWeight: '700', color: colors.ink },
  summary: { marginTop: 4, fontSize: 13, lineHeight: 19, color: colors.inkMuted },
  meta: { marginTop: spacing.md, fontSize: 11, fontWeight: '600', color: colors.inkMuted },
  link: { marginTop: spacing.md, fontSize: 13, fontWeight: '800', color: colors.ink },
  empty: { fontSize: 13, color: colors.inkMuted, textAlign: 'center' },
});
