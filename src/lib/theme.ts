/**
 * Shared theme options — keep in sync between layout script and ThemeProvider.
 * `disableTransitionOnChange` is provider-only (script config expects string | null).
 */
export const themeScriptOptions = {
  attribute: "class" as const,
  defaultTheme: "system" as const,
  enableSystem: true,
  storage: "hybrid" as const,
};

export const themeProviderOptions = {
  ...themeScriptOptions,
  disableTransitionOnChange: true,
};
