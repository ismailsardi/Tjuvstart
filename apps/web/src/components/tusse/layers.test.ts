import { describe, expect, it } from 'vitest';
import { hairCutFile, hatStillFile, layerFiles } from './layers';

describe('outfit layers', () => {
  it('cuts the hair only under a hat', () => {
    expect(hairCutFile({ head: 'lue' }, 'wave')).toBe('wave-lue-cut.png');
    expect(hatStillFile({ head: 'helmet' }, 'shrug')).toBe('shrug-helmet-still.webp');
    expect(hairCutFile({ eyes: 'glasses', neck: 'scarf' }, 'wave')).toBeUndefined();
    expect(hatStillFile({}, 'rest')).toBeUndefined();
  });

  it('draws glasses under the hat', () => {
    expect(layerFiles({ head: 'lue', eyes: 'glasses' }, 'rest', 'head')).toEqual([
      'rest-glasses.webp',
      'rest-lue.webp',
    ]);
  });
});
