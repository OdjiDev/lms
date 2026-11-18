import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Redirect, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/lib/auth';
import { colors, radius, spacing } from '@/lib/theme';
import { Button, ErrorBanner } from '@/components/ui';

export default function LoginScreen() {
  const { session, login, loading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = useCallback(async () => {
    setSubmitting(true);
    setError(null);
    try {
      await login(email, password);
      router.replace('/');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Connexion impossible');
    } finally {
      setSubmitting(false);
    }
  }, [email, login, password]);

  if (!loading && session) return <Redirect href="/" />;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.logo}>
          <Text style={styles.logoMark}>◐</Text>
        </View>
        <Text style={styles.title}>Yellow LMS</Text>
        <Text style={styles.subtitle}>Connectez-vous à votre espace de formation.</Text>

        <View style={{ marginTop: spacing.xxl }}>
          <ErrorBanner message={error} />

          <Text style={styles.label}>Adresse email</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            placeholder="vous@organisation.com"
            placeholderTextColor={colors.inkMuted}
          />

          <Text style={[styles.label, { marginTop: spacing.lg }]}>Mot de passe</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholder="••••••••"
            placeholderTextColor={colors.inkMuted}
          />

          <View style={{ marginTop: spacing.xl }}>
            <Button
              label="Se connecter"
              onPress={() => void onSubmit()}
              loading={submitting}
              disabled={!email || !password}
            />
          </View>

          <Pressable onPress={() => router.push('/courses')} style={{ marginTop: spacing.lg }}>
            <Text style={styles.hint}>
              Démo : owner@yellow.academy · Yellow1234
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.paper },
  content: { padding: spacing.xl, paddingTop: spacing.xxl * 2, flexGrow: 1 },
  logo: {
    width: 52,
    height: 52,
    borderRadius: radius.lg,
    backgroundColor: colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  logoMark: { fontSize: 26, color: colors.ink },
  title: { fontSize: 28, fontWeight: '800', color: colors.ink },
  subtitle: { marginTop: 6, fontSize: 14, color: colors.inkMuted },
  label: { fontSize: 12, fontWeight: '700', color: colors.ink, marginBottom: 6 },
  input: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: 'rgba(13,18,32,0.14)',
    paddingHorizontal: spacing.md,
    paddingVertical: 13,
    fontSize: 15,
    color: colors.ink,
  },
  hint: { fontSize: 12, color: colors.inkMuted, textAlign: 'center' },
});
