import { useState } from 'react';
import type { Response } from '../content/answers';
import type { GapFillItem, Item, MultipleChoiceItem, WordOrderItem } from '../content/types';

interface Props<T extends Item> {
  item: T;
  disabled: boolean;
  onSubmit: (response: Response) => void;
}

export function ItemView({ item, ...rest }: Props<Item>) {
  switch (item.type) {
    case 'multiple-choice':
      return <MultipleChoice key={item.id} item={item} {...rest} />;
    case 'gap-fill':
      return <GapFill key={item.id} item={item} {...rest} />;
    case 'word-order':
      return <WordOrder key={item.id} item={item} {...rest} />;
  }
}

function MultipleChoice({ item, disabled, onSubmit }: Props<MultipleChoiceItem>) {
  const [chosen, setChosen] = useState<number | null>(null);
  return (
    <div className="options" role="group" aria-label="Answer options">
      {item.options.map((option, index) => (
        <button
          key={option}
          type="button"
          className={chosen === index ? 'option chosen' : 'option'}
          aria-pressed={chosen === index}
          disabled={disabled}
          onClick={() => {
            setChosen(index);
            onSubmit({ kind: 'choice', index });
          }}
        >
          {option}
        </button>
      ))}
    </div>
  );
}

function GapFill({ item, disabled, onSubmit }: Props<GapFillItem>) {
  const [value, setValue] = useState('');
  return (
    <form
      className="answer-row"
      onSubmit={(event) => {
        event.preventDefault();
        if (value.trim()) onSubmit({ kind: 'text', value });
      }}
    >
      <label className="visually-hidden" htmlFor={`gap-${item.id}`}>
        Missing word
      </label>
      <input
        id={`gap-${item.id}`}
        value={value}
        onChange={(event) => setValue(event.target.value)}
        disabled={disabled}
        autoComplete="off"
        autoCapitalize="off"
        spellCheck={false}
        lang="nb"
      />
      <button type="submit" disabled={disabled || !value.trim()}>
        Check
      </button>
    </form>
  );
}

function WordOrder({ item, disabled, onSubmit }: Props<WordOrderItem>) {
  // Positions into item.tokens, in the order the learner picked them.
  const [picked, setPicked] = useState<number[]>([]);
  const remaining = item.tokens.map((_, index) => index).filter((index) => !picked.includes(index));

  return (
    <div className="word-order">
      <p className="sentence" aria-live="polite" data-testid="sentence">
        {picked.length === 0 ? (
          <span className="muted">Tap the words in the right order.</span>
        ) : (
          picked.map((index) => (
            <button
              key={index}
              type="button"
              className="token picked"
              disabled={disabled}
              onClick={() => setPicked(picked.filter((p) => p !== index))}
            >
              {item.tokens[index]}
            </button>
          ))
        )}
      </p>
      <div className="tokens" role="group" aria-label="Words">
        {remaining.map((index) => (
          <button
            key={index}
            type="button"
            className="token"
            disabled={disabled}
            onClick={() => setPicked([...picked, index])}
          >
            {item.tokens[index]}
          </button>
        ))}
      </div>
      <button
        type="button"
        disabled={disabled || remaining.length > 0}
        onClick={() =>
          onSubmit({ kind: 'text', value: picked.map((index) => item.tokens[index]).join(' ') })
        }
      >
        Check
      </button>
    </div>
  );
}
