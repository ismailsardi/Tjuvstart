"""Tiny numpy SDF raymarcher for clay-style outfit sprites (orthographic, view along -z).

Image space: x right, y down, z toward the viewer. Units are art pixels (800 x 880 art).
"""
import numpy as np
from PIL import Image

LIGHT = (-0.25, -0.62, 0.74)


def length(*a):
    return np.sqrt(sum(x * x for x in a))


def smin(a, b, k):
    h = np.clip(0.5 + 0.5 * (b - a) / k, 0, 1)
    return b * (1 - h) + a * h - k * h * (1 - h)


def capsule(x, y, z, a, b, r):
    """Distance to a capsule from a to b (3-vectors) with radius r (scalar or per-point)."""
    pa = (x - a[0], y - a[1], z - a[2])
    ba = (b[0] - a[0], b[1] - a[1], b[2] - a[2])
    bb = ba[0] ** 2 + ba[1] ** 2 + ba[2] ** 2
    h = np.clip((pa[0] * ba[0] + pa[1] * ba[1] + pa[2] * ba[2]) / bb, 0, 1)
    rr = r(h) if callable(r) else r
    return length(pa[0] - ba[0] * h, pa[1] - ba[1] * h, pa[2] - ba[2] * h) - rr


def render(sdf, color, box, W=800, H=880, zmax=420, steps=140, ss=2, light=LIGHT,
           ambient=0.66, diffuse=0.30, tex=None):
    """sdf(x,y,z)->(d, mat); color(mat,x,y,z,n)->rgb (N,3) in 0..1.
    box = (x0,y0,x1,y1) region to trace. Returns RGBA float array H x W (premult resolved)."""
    x0, y0, x1, y1 = [int(v) for v in box]
    x0, y0 = max(x0, 0), max(y0, 0)
    x1, y1 = min(x1, W), min(y1, H)
    xs = np.arange(x0 * ss, x1 * ss) / ss + 0.5 / ss
    ys = np.arange(y0 * ss, y1 * ss) / ss + 0.5 / ss
    X, Y = np.meshgrid(xs, ys)
    X = X.ravel()
    Y = Y.ravel()
    Z = np.full(X.shape, float(zmax))
    hit = np.zeros(X.shape, bool)
    alive = np.ones(X.shape, bool)
    for _ in range(steps):
        idx = np.nonzero(alive)[0]
        if idx.size == 0:
            break
        d, _m = sdf(X[idx], Y[idx], Z[idx])
        h = d < 0.12
        hit[idx[h]] = True
        alive[idx[h]] = False
        Z[idx[~h]] -= np.maximum(d[~h] * 0.75, 0.08)
        dead = Z[idx] < -zmax
        alive[idx[dead]] = False
    idx = np.nonzero(hit)[0]
    out = np.zeros((len(X), 4))
    if idx.size:
        px, py, pz = X[idx], Y[idx], Z[idx]
        e = 0.6

        def f(a, b, c):
            return sdf(a, b, c)[0]

        nx = f(px + e, py, pz) - f(px - e, py, pz)
        ny = f(px, py + e, pz) - f(px, py - e, pz)
        nz = f(px, py, pz + e) - f(px, py, pz - e)
        nl = length(nx, ny, nz) + 1e-9
        nx, ny, nz = nx / nl, ny / nl, nz / nl
        _, mat = sdf(px, py, pz)
        base = color(mat, px, py, pz, (nx, ny, nz))
        L = np.array(light)
        L = L / np.linalg.norm(L)
        ndl = nx * L[0] + ny * L[1] + nz * L[2]
        wrap = np.clip((ndl + 0.45) / 1.45, 0, 1)
        ao = np.ones_like(px)
        for i, s in enumerate((4, 9, 16, 26)):
            dd = f(px + nx * s, py + ny * s, pz + nz * s)
            ao -= np.clip((s - dd) / s, 0, 1) * (0.32 / (i + 1))
        ao = np.clip(ao, 0.35, 1)
        sky = 0.5 + 0.5 * (-ny)
        fres = (1 - np.clip(nz, 0, 1)) ** 2
        shade = (ambient + diffuse * wrap + 0.08 * sky) * (0.55 + 0.45 * ao)
        rgb = base * shade[:, None] + 0.06 * fres[:, None] * base
        hx, hy, hz = L[0], L[1], L[2] + 1
        hl = np.sqrt(hx * hx + hy * hy + hz * hz)
        spec = np.clip((nx * hx + ny * hy + nz * hz) / hl, 0, 1) ** 24 * 0.10
        if tex is not None:
            spec = spec * tex(mat)
        rgb = rgb + spec[:, None]
        out[idx, :3] = np.clip(rgb, 0, 1)
        out[idx, 3] = 1
    hh, ww = len(ys), len(xs)
    img = out.reshape(hh, ww, 4)
    pm = img.copy()
    pm[..., :3] *= pm[..., 3:4]
    pm = pm.reshape(hh // ss, ss, ww // ss, ss, 4).mean((1, 3))
    full = np.zeros((H, W, 4))
    full[y0:y1, x0:x1] = pm  # premultiplied
    return full


def hexrgb(h):
    h = h.lstrip('#')
    return np.array([int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)])


def over(top, bottom):
    """Premultiplied 'over'."""
    return top + bottom * (1 - top[..., 3:4])


def to_image(pm):
    a = pm[..., 3:4]
    rgb = np.where(a > 1e-4, pm[..., :3] / np.maximum(a, 1e-4), 0)
    arr = np.concatenate([rgb, a], -1)
    return Image.fromarray((np.clip(arr, 0, 1) * 255).round().astype(np.uint8), 'RGBA')


def from_image(img):
    a = np.asarray(img.convert('RGBA')).astype(float) / 255
    a[..., :3] *= a[..., 3:4]
    return a
