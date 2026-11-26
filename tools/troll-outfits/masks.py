"""Colour classes on the troll art: the blue fur and the navy parts (hair, brows, feet)."""
import numpy as np


def hsv(img):
    """Hue (degrees), saturation, value and alpha of an image, plus its RGBA array (0..1)."""
    a = np.asarray(img.convert('RGBA')).astype(float) / 255
    r, g, b, al = a[..., 0], a[..., 1], a[..., 2], a[..., 3]
    mx = a[..., :3].max(-1)
    mn = a[..., :3].min(-1)
    d = mx - mn
    h = np.zeros_like(mx)
    m = d > 1e-6
    rr = (mx == r) & m
    gg = (mx == g) & m & ~rr
    bb = m & ~rr & ~gg
    h[rr] = ((g - b)[rr] / d[rr]) % 6
    h[gg] = (b - r)[gg] / d[gg] + 2
    h[bb] = (r - g)[bb] / d[bb] + 4
    h *= 60
    s = np.where(mx > 0, d / np.maximum(mx, 1e-6), 0)
    return h, s, mx, al, a


def classes(img):
    """Masks for fur and navy, and the colour channels they were made from."""
    h, s, v, al, a = hsv(img)
    blue = (h > 185) & (h < 222) & (s > 0.18) & (v > 0.3) & (al > 0.02)
    navy = (h > 205) & (h < 240) & (v < 0.55) & (s > 0.3)
    skin = blue & ~navy
    return skin, navy, h, s, v, al, a
