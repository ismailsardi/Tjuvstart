import { useLiveQuery } from 'dexie-react-hooks';
import { useState, type FormEvent } from 'react';
import { getProfile, saveOutfitSlot, saveTrollName } from '../data/progress';
import { useI18n } from '../i18n/useI18n';
import { meHref } from '../routing/useHashRoute';
import { Tusse } from './Tusse';
import { useTroll } from './useTroll';
import {
  cleanTrollName,
  DEFAULT_TROLL_NAME,
  ITEMS,
  MAX_TROLL_NAME,
  SLOTS,
  nextStreakItem,
  trollName,
  type ItemId,
  type Slot,
} from './outfits';

/**
 * The troll's page: its name and what it wears. The troll itself is the one focal point; the
 * name and the clothes sit below it as plain sections. Every change saves at once and shows on
 * the troll above.
 */
export function Wardrobe() {
  const { t } = useI18n();
  const troll = useTroll();
  const profile = useLiveQuery(() => getProfile());
  // Wait for the profile, so the name field starts with the saved name.
  if (!profile) return null;
  const next = nextStreakItem(troll.earned);
  return (
    <>
      <h1>{troll.name}</h1>
      <div className="wardrobe-stage">
        <Tusse pose="wave" outfit={troll.outfit} size={168} />
      </div>
      <NameForm initial={trollName(profile)} />
      <section className="panel" aria-labelledby="wardrobe-heading">
        <h2 id="wardrobe-heading">{t('changeOutfit')}</h2>
        <p className="muted small">{t('wardrobeIntro')}</p>
        {next && (
          <p className="small" data-testid="next-item">
            {t('nextItem', { item: t(`item_${next.id}`), n: next.unlock.streak })}
          </p>
        )}
        {SLOTS.map((slot) => (
          <SlotPicker key={slot} slot={slot} worn={troll.outfit[slot]} earned={troll.earned} />
        ))}
      </section>
      <p>
        <a href={meHref}>{t('back')}</a>
      </p>
    </>
  );
}

function NameForm({ initial }: { initial: string }) {
  const { t } = useI18n();
  const [value, setValue] = useState(initial);
  const [saved, setSaved] = useState(false);
  async function submit(event: FormEvent) {
    event.preventDefault();
    await saveTrollName(value);
    // Show the name as it was saved: tidied up, or back to the default when left blank.
    setValue(cleanTrollName(value) || DEFAULT_TROLL_NAME);
    setSaved(true);
  }
  return (
    <form className="panel troll-name" onSubmit={submit}>
      <label htmlFor="troll-name">{t('trollNameLabel')}</label>
      <div className="troll-name-row">
        <input
          id="troll-name"
          type="text"
          value={value}
          maxLength={MAX_TROLL_NAME}
          autoComplete="off"
          spellCheck={false}
          onChange={(event) => {
            setValue(event.target.value);
            setSaved(false);
          }}
        />
        <button type="submit" className="secondary">
          {t('aiSave')}
        </button>
      </div>
      <p className="muted small" role="status">
        {saved ? t('nameSaved') : ''}
      </p>
    </form>
  );
}

function SlotPicker({
  slot,
  worn,
  earned,
}: {
  slot: Slot;
  worn: ItemId | undefined;
  earned: Set<ItemId>;
}) {
  const { t } = useI18n();
  const items = ITEMS.filter((item) => item.slot === slot);
  const current = worn ?? 'none';
  return (
    <fieldset className="slot-picker" data-testid={`slot-${slot}`}>
      <legend>{t(`slot_${slot}`)}</legend>
      <label className="choice">
        <input
          type="radio"
          name={`slot-${slot}`}
          value="none"
          checked={current === 'none'}
          onChange={() => void saveOutfitSlot(slot, 'none')}
        />
        <span>{t('slotNothing')}</span>
      </label>
      {items.map((item) => {
        const locked = !earned.has(item.id);
        return (
          <label key={item.id} className={locked ? 'choice locked' : 'choice'}>
            <input
              type="radio"
              name={`slot-${slot}`}
              value={item.id}
              checked={current === item.id}
              disabled={locked}
              onChange={() => void saveOutfitSlot(slot, item.id)}
            />
            <span>
              {t(`item_${item.id}`)}
              {locked && (
                <span className="choice-hint muted small">
                  {' '}
                  {'level' in item.unlock
                    ? t('lockedLevel', { level: item.unlock.level })
                    : t('lockedStreak', { n: item.unlock.streak })}
                </span>
              )}
            </span>
          </label>
        );
      })}
    </fieldset>
  );
}
