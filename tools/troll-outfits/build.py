"""Render the troll's outfit layers for every pose.

Each item is drawn per pose in the pose's 800 x 880 art space, so the app can stack it on the
still or hand it to the rig without any placement of its own. Hats, glasses, the scarf and the
cape are small clay-style models rendered here; clothes that follow the body (sweater, anorak,
slippers, the cape as a blanket) recolour the fur under them and keep the art's own shading.

    python build.py                      # all poses, into apps/web/public/troll/rig/outfit/
    python build.py --poses rest,wave --sheet /tmp/outfits.jpg
"""
import argparse
import os
import sys

import numpy as np
from PIL import Image
from scipy import ndimage as ndi

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from sdf import over, to_image, from_image  # noqa: E402
import items  # noqa: E402
import recolor  # noqa: E402
from poses import FIT, POSES  # noqa: E402
from masks import classes  # noqa: E402
from items import head_frame  # noqa: E402

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
ART = os.path.join(ROOT, 'apps', 'web', 'public', 'troll', 'rig')

SHADOW = np.array([0.05, 0.18, 0.35])


def shadow(layer, base, dy=9, blur=8, strength=0.32):
    """A soft contact shadow under a piece, only where it falls on the troll."""
    a = layer[..., 3]
    sh = ndi.gaussian_filter(np.roll(a, dy, 0), blur) * strength
    sh = sh * base[..., 3] * (1 - a)
    out = np.zeros_like(layer)
    out[..., :3] = SHADOW * sh[..., None]
    out[..., 3] = sh
    return over(layer, out)


def with_pupils(pose, base):
    """The art as the app shows it: the rig art has plain eye whites and draws pupils on top."""
    pupils = os.path.join(ART, f'{pose}-pupils.webp')
    if not os.path.exists(pupils):
        return base
    pu = np.asarray(Image.open(pupils).convert('RGBA').resize(base.shape[1::-1])).astype(float) / 255
    em = np.asarray(Image.open(os.path.join(ART, f'{pose}-eyes.png')).convert('RGB').resize(base.shape[1::-1])).astype(float) / 255
    out = base.copy()
    out[..., :3] += (pu[..., 3] * em[..., 0])[..., None] * (pu[..., :3] - em[..., 1:2]) * base[..., 3:4]
    return np.clip(out, 0, 1)


def hair_of(img):
    """The hair: the highest large navy shape (brows and feet are separate shapes)."""
    skin, navy, h, s, v, al, _ = classes(img)
    lab, n = ndi.label(navy)
    best, best_y = None, 1e9
    for i in range(1, n + 1):
        ys, xs = np.nonzero(lab == i)
        if len(ys) > 3000 and ys.mean() < best_y:
            best, best_y = lab == i, ys.mean()
    if best is None:
        return None
    # Its soft outer edge too, which is too light to count as navy: anything next to it that
    # isn't fur or an orange ear.
    orange = (h < 40) & (s > 0.3)
    return best | (ndi.binary_dilation(best, iterations=8) & ~skin & ~orange & (al > 0.01))


def hair_cut(P, hair, hat):
    """Hair that would stick out above and around a hat: cut from the art while it is worn.
    Hair below the brim stays, peeking out like it would."""
    cx, cy, rx, tilt = P['head']
    H, W = hair.shape
    yy, xx = np.mgrid[0:H, 0:W].astype(float)
    _, v, _ = head_frame(xx, yy, 0, cx, cy, tilt)
    cut = hair & (hat[..., 3] < 0.95) & (v < 20 * rx / 166)
    cut = ndi.binary_dilation(cut, iterations=4) & ndi.binary_dilation(hair, iterations=4)
    return ndi.gaussian_filter(cut.astype(float), 0.7)


def to_still(mask, pose):
    """A mask in the rig art's space, moved to the still's (scaled for rest and wave, 400 x 440)."""
    img = Image.fromarray((mask * 255).astype(np.uint8))
    if pose in FIT:
        sx, sy, cx, tx = FIT[pose]
        K = 2
        img = img.transform(img.size, Image.AFFINE,
                            (1 / sx, 0, cx * K - tx * K / sx, 0, 1 / sy, 425 * K - 425 * K / sy),
                            Image.BICUBIC)
    return np.asarray(img.resize((400, 440), Image.LANCZOS)).astype(float) / 255


def save_hat_extras(pose, P, img, hats, out):
    """For each hat, the hair to cut (rig) and the still without that hair."""
    hair = hair_of(img)
    if hair is None:
        return
    still = Image.open(os.path.join(ART, '..', f'tusse-{pose}.webp')).convert('RGBA')
    for name, hat in hats.items():
        cut = hair_cut(P, hair, hat)
        m = np.zeros(cut.shape + (4,), np.uint8)
        m[..., 3] = (cut * 255).round().astype(np.uint8)
        Image.fromarray(m, 'RGBA').save(os.path.join(out, f'{pose}-{name}-cut.png'), optimize=True)
        s = np.asarray(still).astype(float)
        s[..., 3] *= 1 - to_still(cut, pose)
        Image.fromarray(s.round().astype(np.uint8), 'RGBA').save(
            os.path.join(out, f'{pose}-{name}-still.webp'), 'WEBP', quality=90, method=6)


def layers_for(pose):
    P = POSES[pose]
    img = Image.open(os.path.join(ART, f'{pose}.webp'))
    base = from_image(img)
    L = {
        'lue': shadow(items.lue(P), base),
        'helmet': shadow(items.helmet(P), base),
        'glasses': shadow(items.glasses(P, img), base, dy=6, blur=4, strength=0.25),
    }
    if P['scarf']:
        # The back of the scarf only shows where the body doesn't cover it.
        back = items.scarf(P, 'back') * (1 - base[..., 3:4])
        L['scarf'] = shadow(over(items.scarf(P), back), base)
    L['sweater'] = recolor.sweater(img, P)
    L['anorak'] = recolor.anorak(img, P)
    L['slippers'] = recolor.slippers(img, P)
    if P['cape']:
        L['cape-back'] = items.cape_back(P)
        L['cape'] = shadow(items.cape_clasp(P), base, dy=5, blur=4, strength=0.25)
    else:
        L['cape'] = recolor.blanket(img, P)
    return base, L


ORDER = ['slippers', 'sweater', 'anorak', 'scarf', 'cape', 'glasses', 'lue', 'helmet']
LOOKS = [['lue', 'scarf'], ['helmet', 'sweater'], ['glasses', 'anorak', 'slippers'],
         ['cape', 'lue', 'glasses']]


def dress(base, L, outfit):
    out = base
    if 'cape' in outfit and 'cape-back' in L:
        out = over(out, L['cape-back'])
    for k in ORDER:
        if k in outfit and k in L:
            out = over(L[k], out)
    return out


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--out', default=os.path.join(ART, 'outfit'))
    ap.add_argument('--poses', default=','.join(POSES))
    ap.add_argument('--sheet', help='also write a preview sheet (JPEG) of a few looks per pose')
    args = ap.parse_args()
    os.makedirs(args.out, exist_ok=True)
    rows = []
    for pose in args.poses.split(','):
        base, L = layers_for(pose)
        save_hat_extras(pose, POSES[pose], Image.open(os.path.join(ART, f'{pose}.webp')),
                        {k: L[k] for k in ('lue', 'helmet')}, args.out)
        for k, v in L.items():
            to_image(v).save(os.path.join(args.out, f'{pose}-{k}.webp'), 'WEBP',
                             quality=88, alpha_quality=90, method=6)
        if args.sheet:
            row = []
            hair = hair_of(Image.open(os.path.join(ART, f'{pose}.webp')))
            for look in LOOKS:
                b0 = with_pupils(pose, base)
                hat = next((h for h in ('lue', 'helmet') if h in look), None)
                if hat and hair is not None:
                    b0 = b0 * (1 - hair_cut(POSES[pose], hair, L[hat]))[..., None]
                d = over(dress(b0, L, look), np.ones_like(base))
                row.append(to_image(d).convert('RGB').resize((400, 440), Image.LANCZOS))
            rows.append(row)
        print(pose, 'done', flush=True)
    if args.sheet:
        sheet = Image.new('RGB', (400 * len(LOOKS), 440 * len(rows)), 'white')
        for j, row in enumerate(rows):
            for i, im in enumerate(row):
                sheet.paste(im, (400 * i, 440 * j))
        sheet.save(args.sheet, quality=88)


if __name__ == '__main__':
    main()
