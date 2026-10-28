import { gsap } from "gsap";

// Left-to-right "wipe" for headings. The clip box is padded vertically so
// descenders (j, y, g, p, q) are never cut, and the clip is removed once the
// animation ends — a leftover inset(0) would crop them on tight line-heights.
const HIDDEN = "inset(-0.4em 100% -0.4em -0.1em)";
const SHOWN = "inset(-0.4em 0% -0.4em -0.1em)";

export function revealText(target, vars = {}) {
  return gsap.fromTo(
    target,
    { clipPath: HIDDEN, opacity: 0 },
    {
      clipPath: SHOWN,
      opacity: 1,
      duration: 1.2,
      ease: "power3.inOut",
      ...vars,
      onComplete() {
        gsap.set(this.targets(), { clearProps: "clipPath" });
        vars.onComplete?.call(this);
      },
    },
  );
}
