"use client";

import { useEffect, useState } from "react";

/**
 * Keyboard overlap in CSS pixels via Visual Viewport.
 *
 * When `interactive-widget=resizes-content` works, layout height already
 * shrinks and this returns ~0. On iOS overlays-content, it is the occluded
 * strip so sheets can lift (`bottom`) instead of hiding focused fields.
 */
export function useKeyboardInset(): number {
  const [inset, setInset] = useState(0);

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;

    const update = () => {
      const obscured = Math.max(
        0,
        Math.round(window.innerHeight - vv.height - vv.offsetTop),
      );
      setInset(obscured);
    };

    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    window.addEventListener("resize", update);
    update();

    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  return inset;
}
