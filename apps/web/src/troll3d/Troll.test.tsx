import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { troll3dEnabled } from './flag';
import { Troll } from './Troll';

afterEach(() => {
  cleanup();
  localStorage.clear();
});

describe('troll3dEnabled', () => {
  it('is off by default, and the address switches it on and off for this device', () => {
    expect(troll3dEnabled('')).toBe(false);
    expect(troll3dEnabled('?troll3d=1')).toBe(true);
    expect(troll3dEnabled('')).toBe(true);
    expect(troll3dEnabled('?troll3d=0')).toBe(false);
    expect(troll3dEnabled('')).toBe(false);
  });
});

describe('Troll', () => {
  it('shows the 2D troll by default', () => {
    const { container } = render(<Troll pose="wave" />);
    expect(container.querySelector('img.tusse-art')).not.toBeNull();
    expect(container.querySelector('canvas')).toBeNull();
  });

  it('stays in 2D when the preview is on but the device has no WebGL', () => {
    localStorage.setItem('tjuvstart.troll3d', '1');
    const { container } = render(<Troll pose="wave" />);
    expect(container.querySelector('img.tusse-art')).not.toBeNull();
  });
});
