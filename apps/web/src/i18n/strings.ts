export type UiLanguage = 'en' | 'fr';

const en = {
  tagline: 'Norwegian from A1 to B2, adapted to your level.',
  yourLevel: 'Your level',
  notAssessed: 'Not assessed yet ({answers}/{min} answers)',
  estimated: '{level} (estimated)',
  lessons: 'Lessons',
  languages: 'Your languages: {languages}',
  change: 'Change',
  onboardingTitle: 'Velkommen!',
  onboardingIntro:
    'Tell us which languages you already know. Tjuvstart uses them to point out words you probably know, words that only look familiar, and grammar that works differently in Norwegian.',
  nativeQuestion: 'What is your native language?',
  knownQuestion: 'Other languages you know well (optional)',
  comingSoon: 'coming soon',
  otherLanguage: 'Another language',
  save: 'Continue',
  home: '← Home',
  question: 'Question {n} of {total}',
  check: 'Check',
  continue: 'Continue',
  correct: 'Correct!',
  notQuite: 'Not quite. The answer is',
  doneBody: 'You got {score} of {total} right. Your level estimate has been updated.',
  backHome: 'Back to home',
  tapWords: 'Tap the words in the right order.',
  missingWord: 'Missing word',
  lessonNotFound: 'Lesson not found.',
  tip: 'Tip',
  knownWords: 'Words you probably know',
  falseFriends: 'Look-alikes to watch',
  looksLike: 'looks like «{word}», but means',
  answerOptions: 'Answer options',
  words: 'Words',
  progress: 'Lesson progress',
  updateAvailable: 'A new version of Tjuvstart is available.',
  reload: 'Update',
} as const;

export type StringKey = keyof typeof en;

const fr: Record<StringKey, string> = {
  tagline: 'Le norvégien de A1 à B2, adapté à votre niveau.',
  yourLevel: 'Votre niveau',
  notAssessed: 'Pas encore évalué ({answers}/{min} réponses)',
  estimated: '{level} (estimation)',
  lessons: 'Leçons',
  languages: 'Vos langues : {languages}',
  change: 'Modifier',
  onboardingTitle: 'Velkommen !',
  onboardingIntro:
    'Dites-nous quelles langues vous connaissez déjà. Tjuvstart s’en sert pour repérer les mots que vous connaissez probablement, les faux amis et la grammaire qui fonctionne autrement en norvégien.',
  nativeQuestion: 'Quelle est votre langue maternelle ?',
  knownQuestion: 'Autres langues que vous maîtrisez (facultatif)',
  comingSoon: 'bientôt disponible',
  otherLanguage: 'Une autre langue',
  save: 'Continuer',
  home: '← Accueil',
  question: 'Question {n} sur {total}',
  check: 'Vérifier',
  continue: 'Continuer',
  correct: 'Correct !',
  notQuite: 'Pas tout à fait. La réponse est',
  doneBody: 'Vous avez {score} bonnes réponses sur {total}. Votre niveau estimé a été mis à jour.',
  backHome: 'Retour à l’accueil',
  tapWords: 'Touchez les mots dans le bon ordre.',
  missingWord: 'Mot manquant',
  lessonNotFound: 'Leçon introuvable.',
  tip: 'Astuce',
  knownWords: 'Mots que vous connaissez probablement',
  falseFriends: 'Faux amis',
  looksLike: 'ressemble à « {word} », mais veut dire',
  answerOptions: 'Réponses possibles',
  words: 'Mots',
  progress: 'Progression de la leçon',
  updateAvailable: 'Une nouvelle version de Tjuvstart est disponible.',
  reload: 'Mettre à jour',
};

const dictionaries: Record<UiLanguage, Record<StringKey, string>> = { en, fr };

export function uiLanguageFor(nativeLanguage: string | undefined): UiLanguage {
  return nativeLanguage === 'fr' ? 'fr' : 'en';
}

export function translate(
  language: UiLanguage,
  key: StringKey,
  vars: Record<string, string | number> = {},
): string {
  return dictionaries[language][key].replace(/\{(\w+)\}/g, (_, name: string) =>
    String(vars[name] ?? `{${name}}`),
  );
}
