# Cat motion: research and source material

## What real cats do (and what the site does about it)

| Behaviour | Source | On the site |
| --- | --- | --- |
| Walk is a four-beat lateral sequence: left hind, left fore, right hind, right fore, a quarter-cycle apart, with two or three paws on the ground at a time | [Animator Notebook, quadruped gaits](https://www.animatornotebook.com/learn/quadrupeds-gaits); [Veterian Key, feline locomotive behaviour](https://veteriankey.com/feline-locomotive-behavior/) | Meadow walk and walk-in-place use exactly that phasing (September 26) |
| Hind paws land in the front paws' prints ("direct registering") | [PetsCare, feline locomotion](https://www.petscare.com/news/post/cats-walking-feline-locomotion) | Stride geometry keeps planted paws from sliding |
| Tail high with a slight curl means relaxed and friendly; low or tucked means anxious | [PetMD, cat body language](https://www.petmd.com/cat/behavior/cat-body-language) | Purring lifts the tail; tail sways as counterbalance while walking |
| Ears forward is neutral or curious; turned out or flattened is anxious | [PetMD](https://www.petmd.com/cat/behavior/cat-body-language) | Ears swivel toward the pointer, perk when alert, relax sideways while purring |
| Slow blink is a sign of trust | [Humphrey et al. 2020, Scientific Reports](https://www.nature.com/articles/s41598-020-73426-0) | Lingering near a cat's face earns a slow blink |

## Generated frames (pending)

True head turns, jaw movement (yawn, meow) and fur that moves need new
artwork, not the single painting moved around. The plan:

1. `inputs/cat-start.png` is the rigged cat, tail included, on the sidebar's
   own dark green so the background can be keyed out cleanly afterwards.
2. An image-editing model produces the head turned to each side from it.
3. A first-and-last-frame video model paints every frame between the poses.
4. The frames are keyed, cropped and packed into `public/cat/motion`, and the
   site shows the frame that matches the pointer, so the head genuinely turns.

Steps 2 and 3 run on Hugging Face Spaces, which need a signed-in account:
set `HF_TOKEN` (read access) in the environment to unblock them.
