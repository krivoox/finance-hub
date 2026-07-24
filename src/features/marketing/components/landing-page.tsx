import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  LANDING_COMPARISON,
  LANDING_DEFINITION,
  LANDING_EARLY_ACCESS,
  LANDING_FAQ,
  LANDING_FEATURE_CARDS,
  LANDING_FINAL_CTA,
  LANDING_HERO,
  LANDING_STEPS,
  LANDING_TRUST,
  LANDING_VALUES,
} from "@/features/marketing/content";

import { HeroDeviceMock } from "./hero-device-mock";
import { LandingNav } from "./landing-nav";
import {
  ClarityChartsMock,
  FeatureCheckList,
  PastelFeatureCard,
  SharedHomeMock,
  SpiralMark,
} from "./landing-visuals";

export function LandingPage() {
  return (
    <div className="flex min-h-svh flex-col bg-background text-foreground">
      <LandingNav />

      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_50%_at_0%_0%,var(--warning-muted),transparent_55%),radial-gradient(ellipse_60%_45%_at_100%_20%,var(--info-muted),transparent_50%),radial-gradient(ellipse_40%_35%_at_60%_100%,var(--success-muted),transparent_55%)] opacity-70 dark:opacity-30"
          />
          <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 py-14 sm:px-6 sm:py-20 lg:grid-cols-2 lg:gap-10 lg:py-24">
            <div className="fh-fade-up space-y-7">
              <h1 className="fh-display text-4xl leading-[1.05] font-semibold tracking-tight text-balance sm:text-5xl lg:text-[3.25rem]">
                {LANDING_HERO.h1}
              </h1>
              <p className="max-w-md text-base leading-relaxed text-muted-foreground text-pretty sm:text-lg">
                {LANDING_HERO.subhead}
              </p>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <Button
                  size="lg"
                  className="h-11 rounded-full px-6 text-sm"
                  asChild
                >
                  <Link href="/registro">{LANDING_HERO.ctaPrimary}</Link>
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  className="h-11 rounded-full px-6 text-sm"
                  asChild
                >
                  <a href={LANDING_HERO.ctaSecondaryHref}>
                    {LANDING_HERO.ctaSecondary}
                  </a>
                </Button>
              </div>
              <p className="max-w-sm text-xs leading-relaxed text-muted-foreground">
                {LANDING_HERO.microcopy}
              </p>
            </div>
            <div className="fh-fade-up fh-fade-up-delay-2">
              <HeroDeviceMock />
            </div>
          </div>
        </section>

        {/* Trust strip — no fake partner logos */}
        <section
          aria-label="Pilares del producto"
          className="border-y border-border bg-card/40"
        >
          <ul className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-8 gap-y-3 px-4 py-8 sm:px-6 md:justify-between">
            {LANDING_TRUST.map((item) => (
              <li
                key={item}
                className="text-sm font-medium tracking-tight text-muted-foreground"
              >
                {item}
              </li>
            ))}
          </ul>
        </section>

        <div className="mx-auto max-w-6xl space-y-24 px-4 py-20 sm:space-y-28 sm:px-6 sm:py-28">
          {/* Definition (SEO extractable) */}
          <section aria-labelledby="que-es" className="mx-auto max-w-3xl text-center">
            <h2
              id="que-es"
              className="fh-display text-2xl font-semibold tracking-tight sm:text-3xl"
            >
              ¿Qué es Finance Hub?
            </h2>
            <p className="mt-4 text-base leading-relaxed text-muted-foreground text-pretty">
              {LANDING_DEFINITION}
            </p>
          </section>

          {/* Alternating feature 1 — hogar */}
          <section className="grid items-center gap-10 lg:grid-cols-2 lg:gap-14">
            <SharedHomeMock />
            <div className="space-y-5">
              <h2 className="fh-display text-2xl font-semibold tracking-tight text-balance sm:text-3xl">
                {LANDING_VALUES[1].h2}
              </h2>
              <p className="text-base leading-relaxed text-muted-foreground text-pretty">
                {LANDING_VALUES[1].answer}
              </p>
              <FeatureCheckList items={LANDING_VALUES[1].bullets} />
              <Button className="mt-2 h-10 rounded-full px-5" asChild>
                <Link href="/registro">Crear cuenta</Link>
              </Button>
            </div>
          </section>

          {/* Alternating feature 2 — claridad */}
          <section className="grid items-center gap-10 lg:grid-cols-2 lg:gap-14">
            <div className="order-2 space-y-5 lg:order-1">
              <h2 className="fh-display text-2xl font-semibold tracking-tight text-balance sm:text-3xl">
                {LANDING_VALUES[0].h2}
              </h2>
              <p className="text-base leading-relaxed text-muted-foreground text-pretty">
                {LANDING_VALUES[0].answer}
              </p>
              <FeatureCheckList items={LANDING_VALUES[0].bullets} />
              <Button className="mt-2 h-10 rounded-full px-5" asChild>
                <Link href="/registro">Crear cuenta</Link>
              </Button>
            </div>
            <div className="order-1 lg:order-2">
              <ClarityChartsMock />
            </div>
          </section>

          {/* Pastel feature cards */}
          <section id="funciones" aria-labelledby="funciones-title">
            <div className="mb-10 max-w-xl">
              <h2
                id="funciones-title"
                className="fh-display text-2xl font-semibold tracking-tight sm:text-3xl"
              >
                Tres pilares del hogar
              </h2>
              <p className="mt-3 text-muted-foreground">
                {LANDING_VALUES[2].answer}
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-3 sm:gap-5">
              {LANDING_FEATURE_CARDS.map((card) => (
                <PastelFeatureCard
                  key={card.title}
                  title={card.title}
                  body={card.body}
                  tone={card.tone}
                />
              ))}
            </div>
          </section>

          {/* How it works */}
          <section id="como-funciona" aria-labelledby="como-funciona-title">
            <h2
              id="como-funciona-title"
              className="fh-display text-2xl font-semibold tracking-tight sm:text-3xl"
            >
              Cómo funciona
            </h2>
            <ol className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {LANDING_STEPS.map((step, index) => (
                <li
                  key={step}
                  className="rounded-3xl border border-border bg-card/60 p-5"
                >
                  <span className="font-mono text-xs font-medium text-info-muted-foreground tabular-nums">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <p className="mt-3 text-sm leading-snug font-medium text-foreground">
                    {step}
                  </p>
                </li>
              ))}
            </ol>
          </section>

          {/* Comparison */}
          <section aria-labelledby="comparacion">
            <h2
              id="comparacion"
              className="fh-display text-2xl font-semibold tracking-tight text-balance sm:text-3xl"
            >
              {LANDING_COMPARISON.h2}
            </h2>
            <div className="mt-8 overflow-x-auto rounded-3xl border border-border">
              <table className="w-full min-w-[36rem] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    {LANDING_COMPARISON.headers.map((header) => (
                      <th
                        key={header || "feature"}
                        scope="col"
                        className="px-3 py-3.5 font-medium text-muted-foreground first:sticky first:left-0 first:bg-muted/50 sm:px-4"
                      >
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {LANDING_COMPARISON.rows.map((row) => (
                    <tr
                      key={row.feature}
                      className="border-b border-border last:border-0"
                    >
                      <th
                        scope="row"
                        className="sticky left-0 bg-background px-3 py-3.5 font-medium text-foreground sm:px-4"
                      >
                        {row.feature}
                      </th>
                      {row.cells.map((cell, i) => (
                        <td
                          key={`${row.feature}-${i}`}
                          className="px-3 py-3.5 text-muted-foreground sm:px-4"
                        >
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-4 max-w-3xl text-sm leading-relaxed text-muted-foreground">
              {LANDING_COMPARISON.note}
            </p>
          </section>

          {/* Early access */}
          <section
            aria-labelledby="acceso-temprano"
            className="rounded-3xl border border-border bg-muted/40 px-6 py-8 sm:px-10 sm:py-10"
          >
            <h2
              id="acceso-temprano"
              className="fh-display text-xl font-semibold tracking-tight sm:text-2xl"
            >
              {LANDING_EARLY_ACCESS.h2}
            </h2>
            <p className="mt-3 max-w-3xl text-base leading-relaxed text-muted-foreground text-pretty">
              {LANDING_EARLY_ACCESS.body}
            </p>
          </section>

          {/* FAQ + side CTA */}
          <section
            id="faq"
            aria-labelledby="faq-title"
            className="grid gap-10 lg:grid-cols-[1.2fr_0.8fr] lg:gap-12"
          >
            <div>
              <h2
                id="faq-title"
                className="fh-display text-2xl font-semibold tracking-tight sm:text-3xl"
              >
                Preguntas frecuentes
              </h2>
              <div className="mt-8 divide-y divide-border border-y border-border">
                {LANDING_FAQ.map((item) => (
                  <details key={item.question} className="group py-4">
                    <summary className="cursor-pointer list-none text-sm font-medium text-foreground marker:content-none [&::-webkit-details-marker]:hidden">
                      <span className="flex items-start justify-between gap-4">
                        {item.question}
                        <span
                          aria-hidden
                          className="mt-0.5 shrink-0 text-muted-foreground transition-transform duration-200 group-open:rotate-45"
                        >
                          +
                        </span>
                      </span>
                    </summary>
                    <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground text-pretty">
                      {item.answer}
                    </p>
                  </details>
                ))}
              </div>
            </div>

            <aside className="flex flex-col justify-between rounded-3xl border border-border bg-muted/50 p-6 sm:p-8">
              <div>
                <h3 className="fh-display text-lg font-semibold tracking-tight">
                  ¿No encontrás la respuesta?
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                  Creá tu cuenta y explorá el producto en acceso temprano. Si
                  necesitás ayuda, escribinos cuando publiquemos el canal de
                  soporte.
                </p>
              </div>
              <Button className="mt-8 h-10 w-full rounded-full sm:w-auto" asChild>
                <Link href="/registro">Crear cuenta</Link>
              </Button>
            </aside>
          </section>

          {/* Dark final CTA */}
          <section
            aria-labelledby="cta-final"
            className="relative overflow-hidden rounded-[1.75rem] bg-primary px-6 py-14 text-primary-foreground sm:rounded-[2rem] sm:px-12 sm:py-16"
          >
            <SpiralMark className="pointer-events-none absolute top-1/2 left-0 size-48 -translate-y-1/2 opacity-80 sm:size-64 md:left-6" />
            <div className="relative mx-auto flex max-w-xl flex-col items-center gap-6 text-center">
              <h2
                id="cta-final"
                className="fh-display text-2xl font-semibold tracking-tight text-balance sm:text-3xl"
              >
                {LANDING_FINAL_CTA.h2}
              </h2>
              <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
                <Button
                  size="lg"
                  className="h-11 rounded-full border-0 bg-primary-foreground px-6 text-sm text-primary hover:bg-primary-foreground/90"
                  asChild
                >
                  <Link href="/registro">Crear cuenta</Link>
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  className="h-11 rounded-full border-primary-foreground/30 bg-transparent px-6 text-sm text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
                  asChild
                >
                  <Link href="/login">Iniciar sesión</Link>
                </Button>
              </div>
            </div>
          </section>
        </div>
      </main>

      <footer className="border-t border-border bg-muted/30 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:grid-cols-2 sm:px-6 lg:grid-cols-4">
          <div className="space-y-3 sm:col-span-2 lg:col-span-1">
            <p className="text-sm font-semibold text-foreground">Finance Hub</p>
            <p className="max-w-xs text-sm leading-relaxed text-muted-foreground">
              Centro de administración financiera del hogar.
            </p>
          </div>
          <div>
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Producto
            </p>
            <ul className="mt-3 space-y-2 text-sm">
              <li>
                <a
                  href="#funciones"
                  className="text-foreground/80 hover:text-foreground"
                >
                  Funciones
                </a>
              </li>
              <li>
                <a
                  href="#como-funciona"
                  className="text-foreground/80 hover:text-foreground"
                >
                  Cómo funciona
                </a>
              </li>
              <li>
                <a
                  href="#faq"
                  className="text-foreground/80 hover:text-foreground"
                >
                  FAQ
                </a>
              </li>
            </ul>
          </div>
          <div>
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Cuenta
            </p>
            <ul className="mt-3 space-y-2 text-sm">
              <li>
                <Link
                  href="/registro"
                  className="text-foreground/80 hover:text-foreground"
                >
                  Crear cuenta
                </Link>
              </li>
              <li>
                <Link
                  href="/login"
                  className="text-foreground/80 hover:text-foreground"
                >
                  Iniciar sesión
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Legal
            </p>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li>Privacidad · próximamente</li>
              <li>Términos · próximamente</li>
            </ul>
          </div>
        </div>
        <div className="border-t border-border">
          <p className="mx-auto max-w-6xl px-4 py-4 text-xs text-muted-foreground sm:px-6">
            © {new Date().getFullYear()} Finance Hub
          </p>
        </div>
      </footer>
    </div>
  );
}
