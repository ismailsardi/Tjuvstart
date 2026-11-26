import { act, cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { Tusse } from './Tusse';

afterEach(cleanup);

describe('Tusse', () => {
  const art = (container: HTMLElement) =>
    container.querySelector('img.tusse-art') as HTMLImageElement;

  it('shows the illustrated pose, sized to the 200 × 220 box and hidden from assistive technology', () => {
    const { container } = render(<Tusse pose="thumbs" size={100} />);
    const img = art(container);
    expect(img.getAttribute('src')).toMatch(/troll\/tusse-thumbs\.webp$/);
    expect(img.getAttribute('width')).toBe('100');
    expect(img.getAttribute('height')).toBe('110');
    expect(img.getAttribute('alt')).toBe('');
    expect(img.getAttribute('aria-hidden')).toBe('true');
  });

  it('has a still for the rest pose, hands on hips', () => {
    const { container } = render(<Tusse pose="rest" />);
    expect(art(container).getAttribute('src')).toMatch(/tusse-rest\.webp$/);
  });

  it('idles, can be kept still, and hops on a tap', () => {
    const { container, rerender } = render(<Tusse />);
    expect(art(container).classList).toContain('tusse-idle');
    fireEvent.pointerDown(art(container));
    expect(art(container).classList).toContain('tusse-hopping');
    rerender(<Tusse idle={false} />);
    expect(art(container).classList).not.toContain('tusse-idle');
  });

  it('settles after a hop ends', () => {
    const { container } = render(<Tusse />);
    fireEvent.pointerDown(art(container));
    // jsdom has no AnimationEvent, so React listens for the prefixed name there.
    const end = new Event('webkitAnimationEnd', { bubbles: true });
    Object.assign(end, { animationName: 'tusse-hop' });
    act(() => {
      art(container).dispatchEvent(end);
    });
    expect(art(container).classList).not.toContain('tusse-hopping');
  });
});

describe('Tusse dressed', () => {
  const dressed = (container: HTMLElement) =>
    container.querySelector('.tusse-dressed') as HTMLElement;
  const layers = (container: HTMLElement) =>
    [...container.querySelectorAll('img.tusse-layer')].map((img) =>
      img.getAttribute('src')!.replace(/^.*\/outfit\//, ''),
    );

  it('stacks the outfit pieces over the illustrated pose instead of switching to a drawing', () => {
    const { container } = render(<Tusse pose="thumbs" outfit={{ neck: 'scarf', head: 'lue' }} />);
    expect(container.querySelector('svg')).toBeNull();
    const box = dressed(container);
    expect(box.classList).toContain('tusse-art');
    expect(box.getAttribute('aria-hidden')).toBe('true');
    expect(box.querySelector('img:not(.tusse-layer)')!.getAttribute('src')).toMatch(
      /tusse-thumbs\.webp$/,
    );
    // Body pieces first, the hat on top.
    expect(layers(container)).toEqual(['thumbs-scarf.webp', 'thumbs-lue.webp']);
  });

  it('hangs the cape behind the body', () => {
    const { container } = render(<Tusse pose="cheer" outfit={{ back: 'cape', eyes: 'glasses' }} />);
    const imgs = [...dressed(container).querySelectorAll('img')].map((img) =>
      img.getAttribute('src')!.replace(/^.*\//, ''),
    );
    expect(imgs).toEqual([
      'cheer-cape-back.webp',
      'tusse-cheer.webp',
      'cheer-cape.webp',
      'cheer-glasses.webp',
    ]);
  });

  it('tucks the scarf away while asleep and uses the cape as a blanket', () => {
    const { container } = render(<Tusse pose="sleep" outfit={{ neck: 'scarf', back: 'cape' }} />);
    expect(layers(container)).toEqual(['sleep-cape.webp']);
  });

  it('scales the pieces like the rig does for the wider rest pose', () => {
    const { container } = render(<Tusse pose="rest" outfit={{ feet: 'slippers' }} />);
    const layer = container.querySelector('img.tusse-layer') as HTMLImageElement;
    expect(layer.style.transform).toMatch(/scale\(0\.86, 1\.035\)/);
    cleanup();
    const thumbs = render(<Tusse pose="thumbs" outfit={{ feet: 'slippers' }} />);
    const plain = thumbs.container.querySelector('img.tusse-layer') as HTMLImageElement;
    expect(plain.style.transform).toBe('');
  });
});
