"""Clothes that follow the body: recolour the fur under a garment and keep the art's own shading."""
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage as ndi
from masks import classes
from sdf import hexrgb, render, length

NAVY_K = hexrgb('#24386f')
CREAM = hexrgb('#f7efe0')
ORANGE = hexrgb('#ff7a3d')
ORANGE_D = hexrgb('#e85f2c')
AURORA = hexrgb('#8fd4ff')
# The brand's deep orange stands in for the classic Marius red.
MARIUS_RED = hexrgb('#e4532c')


def poly_mask(shape, polys):
    m = Image.new('L', (shape[1], shape[0]), 0)
    d = ImageDraw.Draw(m)
    for p in polys:
        d.polygon([tuple(q) for q in p], fill=255)
    return np.asarray(m) > 0


def garment_mask(img, G):
    skin, navy, h, s, v, al, a = classes(img)
    H, W = skin.shape
    yy, xx = np.mgrid[0:H, 0:W].astype(float)
    ny, cx, w, aa = G['neck']
    neck = ny - aa * ((xx - cx) / w) ** 2
    m = skin & (yy > neck)
    if G.get('extra'):
        ex = poly_mask(skin.shape, G['extra'])
        m |= skin & ex
        neck = np.where(ex, -1e4, neck)
    for (hx, hy, r) in G.get('hands', []):
        m &= (xx - hx) ** 2 + (yy - hy) ** 2 > r * r
    if G.get('excl'):
        m &= ~poly_mask(skin.shape, G['excl'])
    if G.get('incl'):
        m &= poly_mask(skin.shape, G['incl'])
    # close tiny holes, drop specks
    m = ndi.binary_closing(m, iterations=2) & (al > 0.02)
    lab, n = ndi.label(m)
    if n:
        sizes = ndi.sum(m, lab, range(1, n + 1))
        keep = np.isin(lab, 1 + np.nonzero(sizes > 800)[0])
        m = keep
    soft = ndi.gaussian_filter(m.astype(float), 0.8)
    soft = np.minimum(soft, al)
    return m, soft, v, s, xx, yy, neck


def shade_of(v, s, m=None):
    # The fur is drawn at near-full value; shadows lower it. Smooth away the thin lines (belly edge).
    sh = np.clip(v / 0.965, 0.25, 1.08)
    if m is not None:
        w = ndi.gaussian_filter(m.astype(float), 2.5)
        sm = ndi.gaussian_filter(sh * m, 2.5) / np.maximum(w, 1e-3)
        sh = np.where(m, np.minimum(sh, sm) * 0.5 + sm * 0.5, sh)
    return sh


def wrap_x(xx, cx, R):
    # Pattern wraps around a cylinder, so it bunches up toward the sides.
    return cx + R * np.arcsin(np.clip((xx - cx) / R, -0.999, 0.999))


def knit(xx, yy, k=1.0):
    col = 0.5 + 0.5 * np.cos(2 * np.pi * xx / (10 * k))
    row = 0.5 + 0.5 * np.cos(2 * np.pi * (yy + 3 * np.abs(((xx / (5 * k)) % 2) - 1)) / (9 * k))
    return 1 - 0.05 * col - 0.035 * row


def bands(m, xx, yy, G, neck):
    """Distances used for hem, cuffs and neckline ribbing."""
    H, W = m.shape
    # hem: distance from the bottom edge of the garment in each column
    bottom = np.full(W, -1.0)
    cols = np.nonzero(m.any(0))[0]
    for c in cols:
        bottom[c] = np.nonzero(m[:, c])[0].max()
    hem = np.where(bottom[None, :] > G.get('hem_y', 0), bottom[None, :] - yy, 1e9)
    cuff = np.full(m.shape, 1e9)
    for (hx, hy, r) in G.get('hands', []):
        cuff = np.minimum(cuff, np.sqrt((xx - hx) ** 2 + (yy - hy) ** 2) - r)
    collar = yy - neck
    return hem, cuff, collar


STAR = [
    '......#......',
    '.....###.....',
    '..#..###..#..',
    '..##.###.##..',
    '..#########..',
    '.##.#####.##.',
    '######.######',
    '.##.#####.##.',
    '..#########..',
    '..##.###.##..',
    '..#..###..#..',
    '.....###.....',
    '......#......',
]
STAR_GRID = np.array([[ch == '#' for ch in row] for row in STAR])


def marius_star(x, y, stitch):
    """The eight-point star of a Marius sweater, knitted on a 13 x 13 grid of `stitch` px."""
    i = np.floor(y / stitch + 6.5).astype(int)
    j = np.floor(x / stitch + 6.5).astype(int)
    inside = (i >= 0) & (i < 13) & (j >= 0) & (j < 13)
    out = np.zeros(x.shape, bool)
    out[inside] = STAR_GRID[i[inside], j[inside]]
    return out


def sweater(img, P):
    """A classic Marius sweater: navy body, a wide white chest band of stars between red borders."""
    G = P['garment']
    m, soft, v, s, xx, yy, neck = garment_mask(img, G)
    hem, cuff, collar = bands(m, xx, yy, G, neck)
    sh = shade_of(v, s, m)
    col = np.broadcast_to(NAVY_K, m.shape + (3,)).copy()
    cx = G['neck'][1]
    xx = wrap_x(xx, cx, G.get('R', 260))
    k = G.get('yoke', 62) / 62  # pattern scale per pose
    c = collar / k
    # Bands from the collar down (in stitches of 3 px at full scale).
    red_top = (c > 18) & (c < 34)
    white_line1 = (c >= 34) & (c < 39)
    star_band = (c >= 39) & (c < 99)
    white_line2 = (c >= 99) & (c < 104)
    red_bot = (c >= 104) & (c < 120)
    # Small white crosses in the red borders.
    step = 18 * k
    gx = ((xx - cx) % step) - step / 2

    def crosses(y0):
        gy = c - y0
        return ((np.abs(gx) < 1.6 * k) & (np.abs(gy) < 4.8)) | ((np.abs(gx) < 4.8 * k) & (np.abs(gy) < 1.6))
    col[red_top | red_bot] = MARIUS_RED
    col[(red_top & crosses(26)) | (red_bot & crosses(112))] = CREAM
    col[white_line1 | white_line2] = CREAM
    # The star band: white ground, navy stars, small navy crosses between them.
    col[star_band] = CREAM
    sstep = 74 * k
    sx = ((xx - cx) % sstep) - sstep / 2
    sy = (c - 69) * k
    stars = marius_star(sx, sy, 4.3 * k) & star_band
    bx = ((xx - cx + sstep / 2) % sstep) - sstep / 2
    small = (((np.abs(bx) < 2.2 * k) & (np.abs(sy) < 6.5 * k)) | ((np.abs(bx) < 6.5 * k) & (np.abs(sy) < 2.2 * k))) & star_band
    col[stars | small] = NAVY_K
    # Below the band: navy with a scatter of small white checks.
    lx = ((xx - cx) % (24 * k)) - 12 * k
    ly = ((c * k) % (24 * k)) - 12 * k
    col[(np.abs(lx) < 1.8 * k) & (np.abs(ly) < 1.8 * k) & (c > 128)] = CREAM
    # Ribbing: navy collar, red and white stripes at the cuffs and hem.
    def stripes(d):
        return np.where(((d // 6) % 2) == 0, 1, 0)

    rib = c <= 18
    col[rib] = NAVY_K
    cuffs = cuff < 22
    hems = hem < 24
    col[cuffs & (stripes(cuff) == 1)] = MARIUS_RED
    col[cuffs & (stripes(cuff) == 0)] = CREAM
    col[hems & (hem < 8)] = NAVY_K
    col[hems & (hem >= 8) & (stripes(hem - 8) == 1)] = MARIUS_RED
    col[hems & (hem >= 8) & (stripes(hem - 8) == 0)] = CREAM
    kn = knit(xx, yy)
    rgb = col * (sh * kn)[..., None]
    ribbed = rib | cuffs | (hems & (hem < 8))
    rgb = np.where(ribbed[..., None], rgb * (0.94 + 0.06 * np.cos(xx * 2 * np.pi / 7))[..., None], rgb)
    return pack(rgb, soft)


def anorak(img, P):
    G = P['garment']
    m, soft, v, s, xx, yy, neck = garment_mask(img, G)
    hem, cuff, collar = bands(m, xx, yy, G, neck)
    sh = shade_of(v, s, m)
    col = np.broadcast_to(ORANGE, m.shape + (3,)).copy()
    cx = G.get('zip', G['neck'][1])
    if cx is None:
        cx = -1e4
    # quilting seams (light horizontal channels)
    seam = np.abs(((collar - 10) % 70) - 35) > 33
    # zip line and teeth
    zipm = (np.abs(xx - cx) < 4) & (collar > 0)
    col[seam] = ORANGE_D
    col[zipm] = NAVY_K
    # cuffs, collar band, hem in navy
    band = (collar < 24) | (cuff < 18) | (hem < 18)
    col[band] = NAVY_K
    # toggles at the neck
    tog = np.zeros_like(m)
    for dx in (-26, 26):
        tog |= ((xx - cx - dx) ** 2 / 25 + (yy - (neck + 30)) ** 2 / 110) < 1
    col[tog & m] = CREAM
    shade = sh
    # soft puff between seams
    puff = 1 - 0.08 * (np.abs(((collar - 10) % 70) - 35) / 35) ** 2
    rgb = col * (shade * np.where(band, 1, puff))[..., None]
    return pack(rgb, soft)


def slippers(img, P):
    F = P['feet']
    skin, navy, h, s, v, al, a = classes(img)
    H, W = navy.shape
    yy, xx = np.mgrid[0:H, 0:W].astype(float)
    m = navy & poly_mask(navy.shape, F['area'])
    m = ndi.binary_closing(m, iterations=2) & (al > 0.02)
    soft = np.minimum(ndi.gaussian_filter(m.astype(float), 0.8), al)
    sh = np.clip(v / 0.40, 0.3, 1.3) ** 0.8  # navy feet are drawn around v 0.40
    top = np.full(W, 1e9)
    for c in np.nonzero(m.any(0))[0]:
        top[c] = np.nonzero(m[:, c])[0].min()
    depth = yy - top[None, :]
    col = np.broadcast_to(ORANGE, m.shape + (3,)).copy()
    fluff = (depth < F.get('cuff', 16)) & (depth >= 0)
    col[fluff] = CREAM
    grain = 1 - 0.05 * (np.sin(xx * 0.9) * np.sin(yy * 0.8))
    rgb = col * (sh * np.where(fluff, grain, 1))[..., None]
    layer = pack(rgb, soft)
    # a little pompom on each foot
    lab, n = ndi.label(m)
    for i in range(1, n + 1):
        ys, xs = np.nonzero(lab == i)
        if len(xs) < 600:
            continue
        fx = xs.mean() + F.get('pom_dx', 0)
        fy = ys.min() + (ys.max() - ys.min()) * 0.42
        r = F.get('pom_r', 17)
        if not r:
            continue

        def sdf(x, y, z, fx=fx, fy=fy, r=r):
            d = length(x - fx, y - fy, z) - r
            d = d - 2.2 * np.sin(x * 0.4) * np.sin(y * 0.4) * np.sin(z * 0.4 + 1)
            return d, np.zeros_like(d)

        pom = render(sdf, lambda m_, *_: np.tile(CREAM, (len(m_), 1)), (fx - 40, fy - 40, fx + 40, fy + 40), zmax=60)
        layer = pom + layer * (1 - pom[..., 3:4])
    return layer


def pack(rgb, alpha):
    out = np.zeros(alpha.shape + (4,))
    out[..., :3] = np.clip(rgb, 0, 1) * alpha[..., None]
    out[..., 3] = alpha
    return out


def blanket(img, P):
    """The cape as a blanket, for the sleeping pose."""
    G = P['garment']
    m, soft, v, s, xx, yy, neck = garment_mask(img, G)
    sh = shade_of(v, s, m)
    # soft folds
    folds = 1 - 0.07 * (0.5 + 0.5 * np.sin((xx * 0.8 + yy * 0.6) / 22))
    # navy with ripples of northern light, like the standing cape
    band = 0.5 + 0.5 * np.sin(xx / 38 + yy / 70 + 0.8 * np.sin(yy / 30))
    glow = np.clip((band - 0.55) / 0.45, 0, 1) ** 1.5 * 0.8
    col = NAVY_K * (1 - glow[..., None]) + AURORA * glow[..., None]
    # an orange trim along the top edge
    top = np.full(m.shape[1], 1e9)
    for c in np.nonzero(m.any(0))[0]:
        top[c] = np.nonzero(m[:, c])[0].min()
    edge = (yy - top[None, :]) < 14
    col[edge] = ORANGE
    return pack(col * (sh * folds)[..., None], soft)
