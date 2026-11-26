"""Outfit pieces as SDF models, placed per pose."""
import numpy as np
from sdf import length, smin, capsule, hexrgb, render

ORANGE = hexrgb('#ff7a3d')
ORANGE_D = hexrgb('#ee6530')
SNOW = hexrgb('#fbf7f0')
NAVY = hexrgb('#22356b')
STEEL = hexrgb('#c9d3e0')
STEEL_D = hexrgb('#a9b6c8')
HORN = hexrgb('#f6ead6')
GOLD = hexrgb('#ffc36b')
AURORA = hexrgb('#8fd4ff')


def head_frame(x, y, z, cx, cy, tilt):
    t = np.radians(tilt)
    dx, dy = x - cx, y - cy
    c, s = np.cos(t), np.sin(t)
    return dx * c + dy * s, -dx * s + dy * c, z


# ---------------------------------------------------------------- lue (knitted beanie)
def lue(P):
    cx, cy, rx, tilt = P['head']
    k = rx / 166
    ry, rz = 132 * k, 128 * k

    def sdf(x, y, z):
        u, v, w = head_frame(x, y, z, cx, cy, tilt)
        th = np.arctan2(w, u)
        kk = length(u / rx, np.minimum(v, 0) / ry, w / rz)
        dome = (kk - 1) * min(rx, rz)
        dome = dome - 2.6 * k * (0.5 + 0.5 * np.cos(th * 26)) * np.clip((v + ry) / ry, 0, 1)
        dome = np.maximum(dome, v + 4 * k)
        R = length(u / (rx + 6 * k), w / (rz + 6 * k)) * (rz + 6 * k) - (rz + 6 * k)
        q1 = np.abs(R) - 6 * k
        q2 = np.abs(v + 2 * k) - 22 * k
        band = length(np.maximum(q1, 0), np.maximum(q2, 0)) + np.minimum(np.maximum(q1, q2), 0) - 12 * k
        band = band - 2.2 * k * (0.5 + 0.5 * np.cos(th * 40))
        py = -ry + 10 * k  # the pompom sits snug in the crown
        pr = length(u, v - py, w) - 38 * k
        pr = pr - 3.0 * k * (np.sin(u * 0.18 / k + 1) * np.sin(v * 0.18 / k) * np.sin(w * 0.18 / k + 2))
        d = smin(dome, band, 5 * k)
        mat = np.where(band < dome, 1, 0)
        d2 = smin(d, pr, 4 * k)
        mat = np.where(pr < d, 2, mat)
        return d2, mat

    def color(m, *_):
        out = np.where((m == 1)[:, None], ORANGE_D, ORANGE)
        return np.where((m == 2)[:, None], SNOW, out)

    return render(sdf, color, box_around(cx, cy, rx * 1.35, 260 * k, 60 * k))


def box_around(cx, cy, half_w, up, down):
    r = max(half_w, up, down) * 1.1
    return (cx - r, cy - r, cx + r, cy + r)


# ---------------------------------------------------------------- viking helmet
def helmet(P):
    cx, cy, rx, tilt = P['head']
    k = rx / 166
    ry, rz = 172 * k, 130 * k

    def horn(u, v, w, side):
        # A curved horn: chain of capsules along an arc, tapering.
        pts = []
        n = 7
        for i in range(n + 1):
            t = i / n
            ang = np.radians(-10 + 95 * t)
            px = side * (rx * 0.80 + 70 * k * np.sin(ang * 0.9) + 26 * k * t)
            py = -60 * k - 95 * k * t + 30 * k * t * t
            pz = 20 * k - 30 * k * t
            pts.append((px, py, pz))
        d = None
        for i in range(n):
            r0 = 30 * k * (1 - i / n) ** 0.8 + 3 * k
            r1 = 30 * k * (1 - (i + 1) / n) ** 0.8 + 3 * k
            di = capsule(u, v, w, pts[i], pts[i + 1], lambda h, r0=r0, r1=r1: r0 + (r1 - r0) * h)
            d = di if d is None else smin(d, di, 6 * k)
        return d

    def sdf(x, y, z):
        u, v, w = head_frame(x, y, z, cx, cy, tilt)
        th = np.arctan2(w, u)
        kk = length(u / rx, np.minimum(v, 0) / ry, w / rz)
        dome = (kk - 1) * min(rx, rz)
        dome = np.maximum(dome, v + 2 * k)
        # rim band
        R = length(u / (rx + 8 * k), w / (rz + 8 * k)) * (rz + 8 * k) - (rz + 8 * k)
        q1 = np.abs(R) - 4 * k
        q2 = np.abs(v + 12 * k) - 14 * k
        band = length(np.maximum(q1, 0), np.maximum(q2, 0)) + np.minimum(np.maximum(q1, q2), 0) - 8 * k
        # centre ridge
        ridge = np.maximum(np.abs(u) - 12 * k, (length(u / (rx + 7 * k), np.minimum(v, 0) / (ry + 7 * k), w / (rz + 7 * k)) - 1) * rz)
        ridge = np.maximum(ridge, v + 20 * k)
        ridge = np.maximum(ridge, -w)  # front half only
        # rivets on band
        ang = np.round(th / (np.pi / 9)) * (np.pi / 9)
        rv = length(u - np.cos(ang) * (rx + 14 * k), v + 12 * k, w - np.sin(ang) * (rz + 14 * k)) - 6.5 * k
        hl = horn(u, v, w, -1)
        hr = horn(u, v, w, 1)
        hn = np.minimum(hl, hr)
        d = smin(dome, band, 3 * k)
        d = smin(d, ridge, 4 * k)
        d = np.minimum(d, rv)
        mat = np.where(band < dome, 1, 0)
        mat = np.where(rv <= d + 0.01, 1, mat)
        d2 = smin(d, hn, 5 * k)
        mat = np.where(hn < d, 2, mat)
        return d2, mat

    def color(m, *_):
        out = np.where((m == 1)[:, None], STEEL_D, STEEL)
        return np.where((m == 2)[:, None], HORN, out)

    return render(sdf, color, box_around(cx, cy, rx * 1.9, 300 * k, 60 * k))


# ---------------------------------------------------------------- round glasses
def nose_of(img, eyes):
    """The nose between and below the eyes: a soft mask and the top centre point."""
    from masks import hsv
    from scipy import ndimage as ndi
    h, s, v, al, _ = hsv(img)
    (lx, ly, lrx, lry), (rx_, ry_, rrx, rry) = eyes
    H, W = h.shape
    yy, xx = np.mgrid[0:H, 0:W]
    region = (xx > min(lx, rx_) - 40) & (xx < max(lx, rx_) + 40) \
        & (yy > min(ly - lry, ry_ - rry)) & (yy < max(ly + lry, ry_ + rry) + 50)
    orange = ((h < 32) | (h > 350)) & (s > 0.45) & (v > 0.55) & (al > 0.5) & region
    lab, n = ndi.label(orange)
    if not n:
        return np.zeros((H, W)), None
    sizes = ndi.sum(orange, lab, range(1, n + 1))
    m = lab == 1 + int(np.argmax(sizes))
    m = ndi.binary_closing(m, iterations=3)
    m = ndi.binary_fill_holes(m)
    ys, xs = np.nonzero(m)
    top = ys.min()
    cx = xs[ys < top + 12].mean()
    return ndi.gaussian_filter(m.astype(float), 0.8), (cx, top)


def glasses(P, img=None):
    """Round glasses: the lenses frame the eyes, and the nose stays in front of the rims and the
    bridge, so the frame seems to rest behind its tip."""
    (lx, ly, lrx, lry), (rx_, ry_, rrx, rry) = P['eyes']
    tilt = P['head'][3]
    t = np.radians(tilt)
    c, s = np.cos(t), np.sin(t)
    pad = 14
    th = 7.5
    nose, top = nose_of(img, P['eyes']) if img is not None else (None, None)

    def ring(x, y, z, cx, cy, ax, ay):
        dx, dy = x - cx, y - cy
        u, v = dx * c + dy * s, -dx * s + dy * c
        a, b = ax + pad, ay + pad
        q = length(u / a, v / b)
        dr = (q - 1) * min(a, b)
        return length(dr, z) - th

    zc = 60
    # inner and outer rim points
    ax_, ay_ = lx + (lrx + pad) * c, ly + (lrx + pad) * s
    bx_, by_ = rx_ - (rrx + pad) * c, ry_ - (rrx + pad) * s
    ox1, oy1 = lx - (lrx + pad) * c, ly - (lrx + pad) * s
    ox2, oy2 = rx_ + (rrx + pad) * c, ry_ + (rrx + pad) * s

    def rims(x, y, z):
        zz = z - zc
        d1 = ring(x, y, zz, lx, ly, lrx, lry)
        d2 = ring(x, y, zz, rx_, ry_, rrx, rry)
        a1 = capsule(x, y, zz, (ox1, oy1 - 6, 0), (ox1 - 26, oy1 - 10, -60), th * 0.7)
        a2 = capsule(x, y, zz, (ox2, oy2 - 6, 0), (ox2 + 26, oy2 - 10, -60), th * 0.7)
        d = smin(np.minimum(d1, d2), np.minimum(a1, a2), 3)
        return d, np.zeros_like(d)

    if top is not None:
        mx, my = top[0], top[1] + 6
    else:
        mx, my = (ax_ + bx_) / 2, (ay_ + by_) / 2 - 20

    def bridge(x, y, z):
        zz = z - zc
        # a low arch from rim to rim, passing behind the nose
        d = np.minimum(capsule(x, y, zz, (ax_, ay_ - 4, 0), (mx, my, 30), th * 0.85),
                       capsule(x, y, zz, (mx, my, 30), (bx_, by_ - 4, 0), th * 0.85))
        return d, np.zeros_like(d)

    def color(m, *_):
        return np.tile(NAVY, (len(m), 1))

    x0 = min(lx - lrx, rx_ - rrx) - 90
    x1 = max(lx + lrx, rx_ + rrx) + 90
    y0 = min(ly - lry, ry_ - rry) - 80
    y1 = max(ly + lry, ry_ + rry) + 50
    def frame(x, y, z):
        d1, _ = rims(x, y, z)
        d2, _ = bridge(x, y, z)
        d = smin(d1, d2, 3)
        return d, np.zeros_like(d)

    out = render(frame, color, (x0, y0, x1, y1), zmax=200)
    if nose is not None:
        out = out * (1 - nose[..., None])
    return out


# ---------------------------------------------------------------- knitted scarf
def scarf(P, part='front'):
    cx, cy, rx, tilt, tail = P['scarf']
    k = rx / 200
    rz = rx * 0.55
    sag = 16 * k
    tube_h, tube_t = 40 * k, 27 * k

    def sdf(x, y, z):
        u, v, w = head_frame(x, y, z, cx, cy, tilt)
        th = np.arctan2(w / rz, u / rx)
        px, pz = rx * np.cos(th), rz * np.sin(th)
        py = sag * np.sin(th)  # lower in front
        du, dv, dw = u - px, v - py, w - pz
        radial = length(du, dw)
        # flattened tube profile
        d = length(radial / tube_t, dv / tube_h) * min(tube_t, tube_h) - min(tube_t, tube_h)
        d = d - 1.6 * k * (0.5 + 0.5 * np.cos(dv / k * 0.42)) - 2.5 * k * np.sin(th * 5) ** 2
        mat = np.zeros_like(d)
        if part == 'back':
            return np.maximum(d, w + rz * 0.1), mat
        d = np.maximum(d, -(w + rz * 0.1))
        if tail:
            side = tail  # -1 left, +1 right of the troll's front
            ax = side * rx * 0.42
            a = (ax, sag + 10 * k, rz + 16 * k)
            b = (ax + side * 26 * k, sag + 170 * k, rz + 16 * k)
            # flat knitted strip: rounded box along a -> b
            ex, ey = b[0] - a[0], b[1] - a[1]
            L = np.hypot(ex, ey); ex, ey = ex / L, ey / L
            qx, qy, qz = u - (a[0] + b[0]) / 2, v - (a[1] + b[1]) / 2, w - (a[2] + b[2]) / 2
            along = qx * ex + qy * ey
            across = -qx * ey + qy * ex
            along_c = np.clip(along / (L / 2), -1, 1)
            thick = qz + 6 * k * along_c  # leans out at the bottom
            bx, by, bz = np.abs(across) - 28 * k, np.abs(along) - L / 2, np.abs(thick) - 4 * k
            dd = length(np.maximum(bx, 0), np.maximum(by, 0), np.maximum(bz, 0)) + np.minimum(np.maximum(bx, np.maximum(by, bz)), 0) - 9 * k
            dd = dd - 1.4 * k * (0.5 + 0.5 * np.cos(across / k * 0.6))
            # fringe
            fr = None
            for i in range(6):
                o = -28 * k + i * 11.2 * k
                fx, fy = b[0] - ey * o, b[1] + ex * o
                f = capsule(u, v, w, (fx + ex * 8 * k, fy + ey * 8 * k, b[2] + 6 * k), (fx + ex * 34 * k, fy + ey * 34 * k, b[2] + 8 * k), 5 * k)
                fr = f if fr is None else np.minimum(fr, f)
            kn = length(u - ax, (v - sag - 12 * k) * 1.25, w - rz - 4 * k) - 30 * k
            d0 = smin(d, kn, 8 * k)
            d = smin(d0, dd, 6 * k)
            d = np.minimum(d, fr)
            mat = np.where(dd < d0, 1, mat)
            mat = np.where(fr <= d + 0.01, 2, mat)
            mat = np.where((mat == 1) & (np.abs(((along + L / 2) / k) % 56 - 28) > 19) & (along > -L / 2 + 30 * k), 3, mat)
        return d, mat

    def color(m, *_):
        out = np.tile(ORANGE, (len(m), 1))
        out = np.where((m == 2)[:, None], ORANGE_D, out)
        out = np.where((m == 3)[:, None], SNOW, out)
        return out

    return render(sdf, color, box_around(cx, cy, rx + 50 * k, 80 * k, 230 * k))


# ---------------------------------------------------------------- cape (behind the body) + clasp
def cape_back(P):
    C = P['cape']
    (cx, ty), rt, by, rb = C['top'], C['r_top'], C['bottom'], C['r_bot']
    H = by - ty

    def sdf(x, y, z):
        t = np.clip((y - ty) / H, 0, 1)
        r = rt + (rb - rt) * t ** 0.85
        th = np.arctan2(z, x - cx)
        r = r + 22 * t * np.sin(th * 8)
        rr = length((x - cx), z * 1.0)
        shell = np.abs(rr - r) - 7
        hem = by - 16 * np.cos(th * 4) ** 2
        d = np.maximum(shell, np.maximum(ty - y, y - hem))
        d = np.maximum(d, z + 10)  # back half only
        return d * 0.8, np.zeros_like(d)

    def color(m, x, y, z, n):
        # A northern lights cape: navy, with soft bands of light rippling down it.
        th = np.arctan2(z, x - cx)
        t = np.clip((y - ty) / H, 0, 1)
        band = 0.5 + 0.5 * np.sin(th * 2.6 + t * 5.0 + 0.8 * np.sin(th * 5 + t * 3))
        glow = np.clip((band - 0.55) / 0.45, 0, 1) ** 1.5 * (0.35 + 0.65 * t)
        return NAVY[None, :] * (1 - glow[:, None]) + AURORA[None, :] * glow[:, None]

    return render(sdf, color, (cx - rb - 40, ty - 30, cx + rb + 40, by + 30), zmax=420)


def cape_clasp(P):
    C = P['cape']
    (cx, ty), rt = C['top'], C['r_top']

    def sdf(x, y, z):
        zz = z - 150
        button = length(x - cx, y - ty - 14, (zz) * 1.8) - 22
        c1 = capsule(x, y, zz, (cx - rt * 0.8, ty - 8, -40), (cx - 14, ty + 10, 0), 10)
        c2 = capsule(x, y, zz, (cx + rt * 0.8, ty - 8, -40), (cx + 14, ty + 10, 0), 10)
        cord = np.minimum(c1, c2)
        d = np.minimum(button, cord)
        return d, np.where(button < cord, 1, 0)

    def color(m, *_):
        return np.where((m == 1)[:, None], GOLD, NAVY)

    return render(sdf, color, (cx - rt - 30, ty - 60, cx + rt + 30, ty + 60), zmax=260)
