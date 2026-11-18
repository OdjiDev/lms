import { Link, usePathname } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing } from '@/lib/theme';

const ITEMS = [
  { href: '/', label: 'Mes cours', icon: '◧' },
  { href: '/courses', label: 'Catalogue', icon: '▤' },
  { href: '/profile', label: 'Profil', icon: '◍' },
] as const;

export function BottomNav() {
  const pathname = usePathname();

  return (
    <View style={styles.container}>
      {ITEMS.map((item) => {
        const active = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
        return (
          <Link key={item.href} href={item.href} style={styles.item}>
            <Text style={[styles.icon, active && styles.activeIcon]}>{item.icon}</Text>
            <Text style={[styles.label, active && styles.activeLabel]}>{item.label}</Text>
          </Link>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    backgroundColor: colors.card,
    paddingBottom: spacing.lg,
    paddingTop: spacing.sm,
  },
  item: { flex: 1, alignItems: 'center', gap: 2, paddingVertical: spacing.xs },
  icon: { fontSize: 18, color: colors.inkMuted },
  activeIcon: { color: colors.ink },
  label: { fontSize: 10, fontWeight: '700', color: colors.inkMuted },
  activeLabel: { color: colors.ink },
  pill: { backgroundColor: colors.brand, borderRadius: radius.pill },
});
