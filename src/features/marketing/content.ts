/**
 * Landing copy + FAQ — single source for DOM and JSON-LD (SPEC-17).
 * Keep answer blocks ~40–60 words where marked.
 */

export const LANDING_META = {
  title: "Finance Hub — Centro financiero del hogar",
  description:
    "Cuentas, movimientos, presupuestos y gastos compartidos en un solo lugar. Para individuos, parejas y familias. ARS y USD. Acceso temprano.",
} as const;

export const LANDING_HERO = {
  h1: "El centro financiero del hogar",
  subhead:
    "Cuentas, movimientos, presupuestos y gastos compartidos — en un solo lugar. Pensado para vos, tu pareja o tu familia, en pesos y dólares.",
  ctaPrimary: "Crear cuenta",
  ctaSecondary: "Ver cómo funciona",
  ctaSecondaryHref: "#como-funciona",
  microcopy:
    "Acceso temprano. Sin sync bancario todavía: registrás vos, con precisión.",
} as const;

export const LANDING_TRUST = [
  "Hogar primero",
  "ARS + USD nativos",
  "Splits y balances",
  "Ledger preciso",
  "Mobile-first",
] as const;

export const LANDING_FEATURE_CARDS = [
  {
    title: "Claridad en segundos",
    body: "Saldos por moneda, ritmo del mes y presupuestos visibles — sin reconstruir el panorama en la cabeza.",
    tone: "info" as const,
  },
  {
    title: "Espacio compartido",
    body: "Invitá a tu pareja o familia, repartí gastos y saldá balances sin planillas eternas.",
    tone: "warning" as const,
  },
  {
    title: "Pesos y dólares",
    body: "Cuentas por moneda, canje explícito y consolidado estimado con tu tasa — sin magia opaca.",
    tone: "success" as const,
  },
] as const;

/** ~55 words — extractable definition block */
export const LANDING_DEFINITION =
  "Finance Hub es una app web de finanzas personales y del hogar que concentra cuentas, movimientos, presupuestos, objetivos y gastos compartidos en un solo espacio. Sirve a individuos, parejas y familias hispanohablantes — con foco en Argentina — y trata ARS y USD como monedas de primera clase, con canje explícito y consolidación estimada.";

/** ~48 words */
export const LANDING_PROBLEM_ANSWER =
  "Bancos, billeteras, efectivo y dólares viven en silos distintos. Eso hace difícil saber el saldo real, en qué se va el mes y cómo repartir gastos sin una planilla frágil. Finance Hub propone una verdad financiera compartida, precisa y usable desde el teléfono.";

export const LANDING_VALUES = [
  {
    id: "clarity",
    h2: "Entendé el estado en segundos",
    answer:
      "Mirás saldos por cuenta y por moneda, el ritmo del mes y cómo van presupuestos y objetivos — sin reconstruir el panorama en la cabeza. La idea es entender el estado y actuar: registrar, transferir o ajustar.",
    bullets: [
      "Saldos por cuenta y moneda",
      "Panorama del mes",
      "Presupuestos y objetivos accionables",
    ],
  },
  {
    id: "home",
    h2: "Hecho para el hogar, no solo para un individuo",
    answer:
      "Espacios personales y compartidos de primera clase: invitás a tu pareja o familia, repartís gastos con splits y ves balances entre miembros — sin vivir en una planilla eterna ni en una app que solo hace deudas.",
    bullets: [
      "Espacios personales y compartidos",
      "Invitaciones y roles",
      "Splits y balances entre miembros",
    ],
  },
  {
    id: "fx",
    h2: "Pesos y dólares, sin magia opaca",
    answer:
      "Cada cuenta tiene su moneda. El canje ARS↔USD es explícito; el patrimonio consolidado se estima con una tasa que definís vos y se marca como estimado. No inventamos cotizaciones ni mezclamos monedas a ciegas.",
    bullets: [
      "Cuentas por moneda",
      "Canje explícito",
      "Consolidado estimado con tu tasa",
    ],
  },
] as const;

export const LANDING_STEPS = [
  "Creá tu cuenta",
  "Agregá tus primeras cuentas",
  "Registrá un movimiento (entre tareas del día)",
  "Invitá a tu pareja o familia cuando quieras compartir",
] as const;

export const LANDING_COMPARISON = {
  h2: "Finance Hub frente a Excel, splits y la app del banco",
  note: "No reemplazamos tu banco. Unimos lo que hoy está disperso — y no prometemos open banking en esta etapa.",
  headers: [
    "",
    "Finance Hub",
    "Excel / planilla",
    "Solo splits",
    "App del banco",
  ] as const,
  rows: [
    {
      feature: "Ledger completo del hogar",
      cells: ["Sí", "Manual / frágil", "No", "Solo su silo"],
    },
    {
      feature: "Gastos compartidos + balances",
      cells: ["Sí", "Improvisado", "Sí", "No"],
    },
    {
      feature: "Presupuestos / objetivos",
      cells: ["Sí", "Manual", "No", "Limitado / silo"],
    },
    {
      feature: "ARS + USD con canje explícito",
      cells: ["Sí (nativo)", "Si lo armás", "No típico", "Por banco"],
    },
    {
      feature: "Invitaciones reales",
      cells: ["Sí", "No", "Sí (splits)", "No"],
    },
    {
      feature: "Sync bancario",
      cells: ["No en v1", "N/A", "N/A", "Propio"],
    },
  ] as const,
} as const;

export const LANDING_AUDIENCE = {
  h2: "Para quién es",
  items: [
    {
      title: "Individuo",
      body: "Claridad entre varias cuentas y metas propias, sin fragmentar el día en cuatro apps.",
    },
    {
      title: "Pareja",
      body: "Espacio compartido, fairness en gastos y menos roce por “quién puso”.",
    },
    {
      title: "Hogar",
      body: "Varios miembros, roles, invitaciones y una verdad financiera del grupo.",
    },
  ],
  anti:
    "No está pensada para trading, contabilidad fiscal de empresa ni para “conectar el banco y olvidarse”.",
} as const;

export const LANDING_EARLY_ACCESS = {
  h2: "Acceso temprano",
  body: "Finance Hub está en desarrollo activo (beta de producto). Todavía no hay pricing público. Crear cuenta te deja usar el producto mientras validamos el centro financiero del hogar. Cuando haya planes, lo comunicaremos con claridad — sin sorpresas de “gratis para siempre”.",
} as const;

export const LANDING_FINAL_CTA = {
  h2: "Empezá por una cuenta. El resto se ordena.",
} as const;

export type LandingFaqItem = {
  question: string;
  answer: string;
};

export const LANDING_FAQ: LandingFaqItem[] = [
  {
    question: "¿Qué es Finance Hub?",
    answer:
      "App web para centralizar cuentas, movimientos, presupuestos, objetivos y gastos compartidos del hogar. Pensada para individuo, pareja o familia, con foco en LatAm y Argentina.",
  },
  {
    question: "¿Para quién es?",
    answer:
      "Quien lleva las cuentas del hogar y necesita claridad entre varias cuentas y, a menudo, pesos y dólares. No está pensada para trading, contabilidad fiscal de empresa ni “conectar el banco y olvidarse”.",
  },
  {
    question: "¿Reemplaza a la app de mi banco?",
    answer:
      "No. Complementa: tu banco ve su silo; Finance Hub une el panorama del hogar con lo que registrás.",
  },
  {
    question: "¿Tiene sync bancario / open banking?",
    answer:
      "No en esta etapa. Priorizamos precisión y modelo de hogar; el registro es manual y mobile-first. Sync queda para fases posteriores.",
  },
  {
    question: "¿En qué se diferencia de Excel o Splitwise?",
    answer:
      "Excel es flexible pero frágil y sin invitaciones reales. Las apps solo-split resuelven “quién debe a quién”, no el ledger ni los presupuestos. Finance Hub une visión de hogar, precisión y lo compartido.",
  },
  {
    question: "¿Soporta pesos y dólares?",
    answer:
      "Sí: cuentas por moneda, canje explícito entre ARS y USD, y consolidación estimada con una tasa que definís vos — sin inventar cotizaciones opacas.",
  },
  {
    question: "¿Cuánto cuesta?",
    answer:
      "Todavía no hay pricing público. El producto está en acceso temprano / beta. Cuando existan planes, se comunicarán con claridad.",
  },
  {
    question: "¿Mis datos están seguros?",
    answer:
      "Usamos autenticación moderna y espacios (workspaces) con roles. No pedimos conexión bancaria en el día uno. Política de privacidad detallada: próximamente.",
  },
];
