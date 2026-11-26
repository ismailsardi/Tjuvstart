# Troll outfits

Renders the clothes Tusse can wear as transparent layers, one image per item per pose, into `apps/web/public/troll/rig/outfit/`. The app stacks them on the pose still or hands them to the rig (see `apps/web/src/components/tusse/layers.ts`).

Every layer is drawn in its pose's own 800 × 880 art space, so it lines up with the body pixel for pixel and needs no placement in the app. Two techniques, depending on the piece:

| Pieces | How | File |
| --- | --- | --- |
| Lue, helmet, glasses, scarf, cape | Small models made of signed distance functions, ray-marched with soft clay shading (wrap lighting, ambient occlusion, a faint sheen) to match the illustrated style. A soft contact shadow is added where a piece sits on the troll. | `items.py`, `sdf.py` |
| Sweater, anorak, slippers, the cape as a blanket when asleep | The fur (or navy feet) under the garment is recoloured, and the art's own shading is kept, so folds and roundness come from the illustration. Patterns wrap around the body. | `recolor.py`, `masks.py` |

Where each piece goes is measured per pose in `poses.py`: the head (centre, width, tilt), the eyes, the neck line, the wrists, the tail to leave out, the feet, and the top and hem of the cape.

The cape has two files per pose: `<pose>-cape-back.webp` hangs behind the body, `<pose>-cape.webp` is the clasp in front. Asleep, the scarf is hidden and the cape becomes a blanket.

## Run

```bash
pip install -r tools/troll-outfits/requirements.txt
python3 tools/troll-outfits/build.py --sheet /tmp/outfits.jpg   # all poses, about two minutes
python3 tools/troll-outfits/build.py --poses rest,wave           # just some
```

`--sheet` writes a preview of a few looks per pose, which is the quickest way to check a change.

## Adding an item

1. Add it to `ITEMS` in `apps/web/src/components/outfits.ts`, with its name and "got" line in the interface languages.
2. Draw it here, in `items.py` (a model) or `recolor.py` (a garment), and add it to `layers_for` and `ORDER` in `build.py`.
3. Add it to the drawing order in `tusse/layers.ts`, in the group that should move it (back, body or head).
