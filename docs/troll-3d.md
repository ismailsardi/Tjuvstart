# The 3D troll

The troll can be shown in 3D on the big spots (Today and the wardrobe page). It is off by default: the illustrated, rigged troll (`Tusse.tsx`) stays the one learners see.

## Previewing

Add `?troll3d=1` to the address to switch the preview on for that device, and `?troll3d=0` to switch it off. With reduced motion, or without WebGL, the illustrated troll is shown either way.

Until `public/troll/tusse.glb` exists, the preview shows a stand-in built from simple shapes (`src/troll3d/placeholder.ts`). It has no outfits.

## Cost

three.js and the scene are a separate chunk (about 155 KB gzipped), downloaded only when the preview is on. The service worker does not precache it or the model. Drawing pauses while the canvas is off screen.

## Model contract

Drop the artist's file at `apps/web/public/troll/tusse.glb`. The app picks it up with no code change if it follows this:

| What            | Contract                                                                                                                                                                              |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Format          | glTF 2.0 binary (`.glb`), under 2 MB with textures                                                                                                                                    |
| Axes and scale  | Y up, about 1 unit tall, origin between the feet, facing +Z                                                                                                                           |
| Animation clips | `idle`, `sleep`, `wave`, `thumbs`, `shrug`, `cheer`, `hop`, `coffee`. A pose without its clip plays `idle`.                                                                           |
| Outfit nodes    | `outfit_scarf`, `outfit_lue`, `outfit_glasses`, `outfit_slippers`, `outfit_anorak`, `outfit_cape`, `outfit_helmet`, `outfit_sweater`. The app shows the worn ones and hides the rest. |
| Props           | `prop_mug` (shown with the coffee pose), `prop_rock`                                                                                                                                  |

Pose to clip mapping lives in `CLIP_FOR_POSE` in `src/troll3d/trollScene.ts`; outfit ids come from `src/components/outfits.ts`.

Once a real model is in and approved, the default can flip to 3D, and the small spots (lesson feedback, end screens) can use stills rendered from the same model.
