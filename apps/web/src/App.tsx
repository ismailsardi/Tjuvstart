import { DEFAULT_RATING } from '@tjuvstart/engine';

const skills = ['Lesing', 'Lytting', 'Skriving', 'Muntlig'] as const;

export function App() {
  return (
    <main className="shell">
      <header>
        <h1>Tjuvstart</h1>
        <p className="tagline">Norwegian from A1 to B2, adapted to your level.</p>
      </header>

      <section aria-labelledby="level-heading">
        <h2 id="level-heading">Your level</h2>
        <ul className="skills">
          {skills.map((skill) => (
            <li key={skill}>
              <span>{skill}</span>
              <span className="muted" data-rating={DEFAULT_RATING}>
                Not assessed yet
              </span>
            </li>
          ))}
        </ul>
      </section>

      <button type="button" disabled>
        Start placement test (coming soon)
      </button>
    </main>
  );
}
