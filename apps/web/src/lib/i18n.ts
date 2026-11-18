/**
 * i18n minimaliste, sans dépendance.
 *
 * Les textes vivent dans `messages/{locale}.json`. Pour ajouter une langue :
 *   1. copier messages/fr.json -> messages/en.json
 *   2. l'ajouter à `dictionaries` ci-dessous
 *   3. le cookie `lms_locale` (ou la locale de l'organisation) suffit à basculer.
 *
 * Si le produit grossit (routes localisées, pluriels ICU, formats de dates),
 * on remplace ce module par next-intl sans toucher aux composants : `t()` garde
 * la même signature.
 */
import fr from '../../messages/fr.json';
import en from '../../messages/en.json';

export type Locale = 'fr' | 'en';
export type Messages = typeof fr;

const dictionaries: Record<Locale, Messages> = { fr, en: en as Messages };

export function getMessages(locale: Locale = 'fr'): Messages {
  return dictionaries[locale] ?? fr;
}

export function createTranslator(locale: Locale = 'fr') {
  const messages = getMessages(locale);

  return function t(path: string): string {
    const value = path
      .split('.')
      .reduce<unknown>(
        (acc, key) =>
          acc && typeof acc === 'object' ? (acc as Record<string, unknown>)[key] : undefined,
        messages,
      );
    return typeof value === 'string' ? value : path;
  };
}
