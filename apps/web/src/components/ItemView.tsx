import { useState } from 'react';
import type { Response } from '../content/answers';
import { useI18n } from '../i18n/useI18n';
import type {
  DictationItem,
  GapFillItem,
  Item,
  MultipleChoiceItem,
  WordOrderItem,
} from '../content/types';
import { AudioPrompt } from './AudioPrompt';

interface Props<T extends Item> {
  item: T;
  disabled: boolean;
  onSubmit: (response: Response) => void;
}

export function ItemView(props: Props<Item>) {
  return (
    <>
      {props.item.audio && <AudioPrompt key={props.item.id} text={props.item.audio} />}
      <Answer {...props} />
    </>
  );
}

function Answer({ item, ...rest }: Props<Item>) {
  switch (item.type) {
    case 'multiple-choice':
      return <MultipleChoice key={item.id} item={item} {...rest} />;
    case 'gap-fill':
      return <GapFill key={item.id} item={item} {...rest} />;
    case 'word-order':
      return <WordOrder key={item.id} item={item} {...rest} />;
    case 'dictation':
      return <Dictation key={item.id} item={item} {...rest} />;
  }
}

function Dictation({ item, disabled, onSubmit }: Props<DictationItem>) {
  const { t } = useI18n();
  const [value, setValue] = useState('');
  return (
    <form
      className="dictation"
      onSubmit={(event) => {
        event.preventDefault();
        if (value.trim()) onSubmit({ kind: 'text', value });
      }}
    >
      <label className="visually-hidden" htmlFor={`dictation-${item.id}`}>
        {t('whatYouHear')}
      </label>
      <textarea
        id={`dictation-${item.id}`}
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={(event) => {
          // Enter checks the answer; a dictation is one line.
          if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            event.currentTarget.form?.requestSubmit();
          }
        }}
        disabled={disabled}
        rows={2}
        autoComplete="off"
        autoCapitalize="sentences"
        spellCheck={false}
        lang="nb"
      />
      <button type="submit" disabled={disabled || !value.trim()}>
        {t('check')}
      </button>
    </form>
  );
}

function MultipleChoice({ item, disabled, onSubmit }: Props<MultipleChoiceItem>) {
  const { t } = useI18n();
  const [chosen, setChosen] = useState<number | null>(null);
  return (
    <div className="options" role="group" aria-label={t('answerOptions')}>
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
  const { t } = useI18n();
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
        {t('missingWord')}
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
        {t('check')}
      </button>
    </form>
  );
}

function WordOrder({ item, disabled, onSubmit }: Props<WordOrderItem>) {
  const { t } = useI18n();
  // Positions into item.tokens, in the order the learner picked them.
  const [picked, setPicked] = useState<number[]>([]);
  const remaining = item.tokens.map((_, index) => index).filter((index) => !picked.includes(index));

  return (
    <div className="word-order">
      <p className="sentence" aria-live="polite" data-testid="sentence">
        {picked.length === 0 ? (
          <span className="muted">{t('tapWords')}</span>
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
      <div className="tokens" role="group" aria-label={t('words')}>
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
        {t('check')}
      </button>
    </div>
  );
}
