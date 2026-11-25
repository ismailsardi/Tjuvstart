import { act, cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { DrawnTusse, Tusse } from './Tusse';

afterEach(cleanup);

function svg(container: HTMLElement) {
  return container.querySelector('svg.tusse') as SVGSVGElement;
}

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

  it('uses the wave for the rest pose', () => {
    const { container } = render(<Tusse pose="rest" />);
    expect(art(container).getAttribute('src')).toMatch(/tusse-wave\.webp$/);
  });

  it('idles, can be kept still, and hops on a tap', () => {
    const { container, rerender } = render(<Tusse />);
    expect(art(container).classList).toContain('tusse-idle');
    fireEvent.pointerDown(art(container));
    expect(art(container).classList).toContain('tusse-hopping');
    rerender(<Tusse idle={false} />);
    expect(art(container).classList).not.toContain('tusse-idle');
  });

  it('switches to the drawn troll while the learner wears an outfit item', () => {
    const { container } = render(<Tusse pose="wave" outfit={{ neck: 'scarf' }} />);
    expect(art(container)).toBeNull();
    expect(container.querySelector('svg.tusse')).not.toBeNull();
  });
});

describe('DrawnTusse idle movements', () => {
  it('idles by default and can be kept still', () => {
    const { container, rerender } = render(<DrawnTusse />);
    expect(svg(container).classList).toContain('tusse-idle');
    rerender(<DrawnTusse idle={false} />);
    expect(svg(container).classList).not.toContain('tusse-idle');
  });

  it('stays hidden from assistive technology', () => {
    const { container } = render(<DrawnTusse pose="coffee" />);
    expect(svg(container).getAttribute('aria-hidden')).toBe('true');
  });

  it('hops on a tap and settles when the hop ends', () => {
    const { container } = render(<DrawnTusse />);
    fireEvent.pointerDown(svg(container));
    expect(svg(container).classList).toContain('tusse-hopping');

    // jsdom has no AnimationEvent, so React listens for the prefixed name there.
    const end = new Event('webkitAnimationEnd', { bubbles: true });
    Object.assign(end, { animationName: 'tusse-hop' });
    act(() => {
      svg(container).dispatchEvent(end);
    });
    expect(svg(container).classList).not.toContain('tusse-hopping');
  });

  it('closes its eyes happily on a coffee sip, and only with coffee', () => {
    const coffee = render(<DrawnTusse pose="coffee" />);
    expect(coffee.container.querySelector('.tusse-sip-happy')).not.toBeNull();
    expect(coffee.container.querySelector('.tusse-cup')).not.toBeNull();
    cleanup();
    const rest = render(<DrawnTusse pose="rest" />);
    expect(rest.container.querySelector('.tusse-sip-happy')).toBeNull();
    expect(rest.container.querySelector('.tusse-eyes')).not.toBeNull();
  });
});
