import { act, cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { Tusse } from './Tusse';

afterEach(cleanup);

function svg(container: HTMLElement) {
  return container.querySelector('svg.tusse') as SVGSVGElement;
}

describe('Tusse idle movements', () => {
  it('idles by default and can be kept still', () => {
    const { container, rerender } = render(<Tusse />);
    expect(svg(container).classList).toContain('tusse-idle');
    rerender(<Tusse idle={false} />);
    expect(svg(container).classList).not.toContain('tusse-idle');
  });

  it('stays hidden from assistive technology', () => {
    const { container } = render(<Tusse pose="coffee" />);
    expect(svg(container).getAttribute('aria-hidden')).toBe('true');
  });

  it('hops on a tap and settles when the hop ends', () => {
    const { container } = render(<Tusse />);
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
    const coffee = render(<Tusse pose="coffee" />);
    expect(coffee.container.querySelector('.tusse-sip-happy')).not.toBeNull();
    expect(coffee.container.querySelector('.tusse-cup')).not.toBeNull();
    cleanup();
    const rest = render(<Tusse pose="rest" />);
    expect(rest.container.querySelector('.tusse-sip-happy')).toBeNull();
    expect(rest.container.querySelector('.tusse-eyes')).not.toBeNull();
  });
});
