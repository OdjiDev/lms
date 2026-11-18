import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import type { ReactNode } from 'react';
import { colors, radius, spacing } from '@/lib/theme';

export function Screen({ children }: { children: ReactNode }) {
  return <View style={styles.screen}>{children}</View>;
}

export function Card({ children, style }: { children: ReactNode; style?: object }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'dark' | 'ghost';
  loading?: boolean;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.button,
        variant === 'primary' && styles.buttonPrimary,
        variant === 'dark' && styles.buttonDark,
        variant === 'ghost' && styles.buttonGhost,
        (pressed || disabled) && { opacity: 0.65 },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? colors.ink : colors.white} />
      ) : (
        <Text
          style={[
            styles.buttonLabel,
            variant === 'primary' ? { color: colors.ink } : null,
            variant === 'ghost' ? { color: colors.ink } : null,
          ]}
        >
          {label}
        </Text>
      )}
    </Pressable>
  );
}

export function ProgressBar({ value }: { value: number }) {
  const safe = Math.min(100, Math.max(0, value));
  return (
    <View style={styles.progressTrack}>
      <View style={[styles.progressFill, { width: `${safe}%` }]} />
    </View>
  );
}

export function Badge({ label, tone = 'neutral' }: { label: string; tone?: 'neutral' | 'success' | 'warn' }) {
  return (
    <View
      style={[
        styles.badge,
        tone === 'success' && { backgroundColor: colors.successSoft },
        tone === 'warn' && { backgroundColor: colors.brandSoft },
      ]}
    >
      <Text
        style={[
          styles.badgeLabel,
          tone === 'success' && { color: colors.success },
          tone === 'warn' && { color: colors.ink },
        ]}
      >
        {label.toUpperCase()}
      </Text>
    </View>
  );
}

export function Loading() {
  return (
    <View style={styles.loading}>
      <ActivityIndicator size="large" color={colors.ink} />
    </View>
  );
}

export function ErrorBanner({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <View style={styles.error}>
      <Text style={styles.errorText}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  button: {
    borderRadius: radius.md,
    paddingVertical: 13,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 46,
  },
  buttonPrimary: { backgroundColor: colors.brand },
  buttonDark: { backgroundColor: colors.ink },
  buttonGhost: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: 'rgba(13,18,32,0.14)',
  },
  buttonLabel: { fontSize: 15, fontWeight: '700', color: colors.white },
  progressTrack: {
    height: 7,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(13,18,32,0.10)',
    overflow: 'hidden',
  },
  progressFill: { height: '100%', borderRadius: radius.pill, backgroundColor: colors.brand },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(13,18,32,0.07)',
  },
  badgeLabel: { fontSize: 9, fontWeight: '800', letterSpacing: 0.6, color: colors.inkMuted },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.paper },
  error: {
    backgroundColor: colors.dangerSoft,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  errorText: { color: colors.danger, fontSize: 13, fontWeight: '600' },
});
