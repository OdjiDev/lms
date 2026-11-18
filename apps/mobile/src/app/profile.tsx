import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Redirect, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/lib/auth';
import { colors, radius, spacing } from '@/lib/theme';
import { BottomNav } from '@/components/bottom-nav';
import { Badge, Button, Card } from '@/components/ui';

export default function ProfileScreen() {
  const { session, user, logout } = useAuth();
  const [submitting, setSubmitting] = useState(false);

  const onLogout = useCallback(async () => {
    setSubmitting(true);
    try {
      await logout();
      router.replace('/login');
    } finally {
      setSubmitting(false);
    }
  }, [logout]);

  if (!session) return <Redirect href="/login" />;

  const initials = `${user?.firstName?.[0] ?? ''}${user?.lastName?.[0] ?? ''}`.toUpperCase();

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.eyebrow}>Mon compte</Text>
          <Text style={styles.title}>Profil</Text>
        </View>

        <Card style={{ alignItems: 'center' }}>
          <View style={styles.avatar}>
            <Text style={styles.avatarLabel}>{initials || '—'}</Text>
          </View>
          <Text style={styles.name}>
            {user?.firstName} {user?.lastName}
          </Text>
          <Text style={styles.email}>{user?.email}</Text>
        </Card>

        <Text style={styles.sectionTitle}>Mes organisations</Text>
        {user?.memberships?.map((membership) => (
          <Card key={membership.organization.id} style={styles.orgCard}>
            <View style={{ flex: 1 }}>
              <Text style={styles.orgName}>{membership.organization.name}</Text>
              <Text style={styles.orgSlug}>{membership.organization.slug}</Text>
            </View>
            <Badge label={membership.role} tone={membership.role === 'LEARNER' ? 'neutral' : 'warn'} />
          </Card>
        ))}

        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>À propos</Text>
          <Text style={styles.infoText}>
            Yellow LMS · Expo + React Native. La même API NestJS alimente le web et le mobile.
          </Text>
        </View>

        <View style={{ marginTop: spacing.xl }}>
          <Button label="Se déconnecter" variant="ghost" onPress={() => void onLogout()} loading={submitting} />
        </View>
      </ScrollView>
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
  avatar: {
    width: 64,
    height: 64,
    borderRadius: radius.pill,
    backgroundColor: colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLabel: { fontSize: 22, fontWeight: '800', color: colors.ink },
  name: { marginTop: spacing.md, fontSize: 18, fontWeight: '800', color: colors.ink },
  email: { marginTop: 2, fontSize: 13, color: colors.inkMuted },
  sectionTitle: {
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
    fontSize: 13,
    fontWeight: '800',
    color: colors.ink,
  },
  orgCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  orgName: { fontSize: 14, fontWeight: '700', color: colors.ink },
  orgSlug: { marginTop: 2, fontSize: 11, color: colors.inkMuted },
  infoCard: {
    marginTop: spacing.xl,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
  },
  infoTitle: { fontSize: 12, fontWeight: '800', color: colors.ink, marginBottom: 4 },
  infoText: { fontSize: 12, lineHeight: 18, color: colors.inkMuted },
});
