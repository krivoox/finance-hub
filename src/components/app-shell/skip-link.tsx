/**
 * Keyboard skip link (WCAG 2.4.1) — jumps past the shell chrome into main.
 */
export function SkipLink() {
  return (
    <a
      href="#main-content"
      className="bg-cta text-primary-foreground pointer-events-none fixed top-2 left-2 z-[100] rounded-xl px-4 py-2.5 text-sm font-semibold opacity-0 shadow-card outline-none focus-visible:pointer-events-auto focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-ring"
    >
      Saltar al contenido
    </a>
  );
}
