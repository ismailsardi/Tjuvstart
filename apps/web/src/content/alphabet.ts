/** Types mirror content/schema/alphabet.schema.json. */
export interface AlphabetLetter {
  /** The capital letter. */
  letter: string;
  /** How the letter is said, written in Norwegian. */
  name: string;
  /** A common word that uses the letter. */
  example: string;
}

const files = import.meta.glob<{ letters: AlphabetLetter[] }>('../../../../content/alphabet.json', {
  eager: true,
  import: 'default',
});

export const alphabet: readonly AlphabetLetter[] = Object.values(files).flatMap(
  (file) => file.letters,
);
