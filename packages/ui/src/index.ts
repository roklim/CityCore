export const platformTheme = {
  colors: {
    canvas: "#071018",
    canvasAlt: "#0b1622",
    panel: "#101a26",
    panelStrong: "#13202f",
    panelMuted: "#18283a",
    line: "rgba(148, 163, 184, 0.18)",
    lineStrong: "rgba(148, 163, 184, 0.28)",
    text: "#f5f7fb",
    textMuted: "#9fafc3",
    textSoft: "#7a899d",
    accent: "#45d38b",
    accentAlt: "#82a6ff",
    accentWarm: "#f3c46f",
    danger: "#ff7c7c",
  },
  radius: {
    sm: "6px",
    md: "8px",
  },
  spacing: {
    xs: "8px",
    sm: "12px",
    md: "16px",
    lg: "24px",
    xl: "32px",
    xxl: "48px",
  },
  layout: {
    shellWidth: "1360px",
    contentWidth: "1040px",
    railWidth: "260px",
    topbarHeight: "72px",
  },
  shadow: {
    panel: "0 18px 60px rgba(3, 8, 14, 0.32)",
  },
} as const;

export type ShellSectionId =
  | "platform_home"
  | "global_admin"
  | "city_marketplace"
  | "business_page"
  | "customer_area"
  | "local_admin";

export const platformShellNavigation = [
  {
    id: "platform_home",
    href: "/",
    label: "Platform Home",
    meta: "Ingresso city-first",
  },
  {
    id: "global_admin",
    href: "/admin",
    label: "Platform Admin",
    meta: "Governance e accessi",
  },
  {
    id: "city_marketplace",
    href: "/demo-city",
    label: "City Surface",
    meta: "Discovery locale",
  },
  {
    id: "business_page",
    href: "/demo-city/demo-business",
    label: "Business Page",
    meta: "Sito pubblico modulare",
  },
  {
    id: "customer_area",
    href: "/account",
    label: "Account Area",
    meta: "Profilo e preferenze",
  },
  {
    id: "local_admin",
    href: "/demo-city/demo-business/admin",
    label: "Business Admin",
    meta: "Console business",
  },
] as const satisfies ReadonlyArray<{
  id: ShellSectionId;
  href: string;
  label: string;
  meta: string;
}>;

export function createCssVariables() {
  return {
    "--platform-canvas": platformTheme.colors.canvas,
    "--platform-canvas-alt": platformTheme.colors.canvasAlt,
    "--platform-panel": platformTheme.colors.panel,
    "--platform-panel-strong": platformTheme.colors.panelStrong,
    "--platform-panel-muted": platformTheme.colors.panelMuted,
    "--platform-line": platformTheme.colors.line,
    "--platform-line-strong": platformTheme.colors.lineStrong,
    "--platform-text": platformTheme.colors.text,
    "--platform-text-muted": platformTheme.colors.textMuted,
    "--platform-text-soft": platformTheme.colors.textSoft,
    "--platform-accent": platformTheme.colors.accent,
    "--platform-accent-alt": platformTheme.colors.accentAlt,
    "--platform-accent-warm": platformTheme.colors.accentWarm,
    "--platform-danger": platformTheme.colors.danger,
    "--platform-radius-sm": platformTheme.radius.sm,
    "--platform-radius-md": platformTheme.radius.md,
    "--platform-space-xs": platformTheme.spacing.xs,
    "--platform-space-sm": platformTheme.spacing.sm,
    "--platform-space-md": platformTheme.spacing.md,
    "--platform-space-lg": platformTheme.spacing.lg,
    "--platform-space-xl": platformTheme.spacing.xl,
    "--platform-space-xxl": platformTheme.spacing.xxl,
    "--platform-shell-width": platformTheme.layout.shellWidth,
    "--platform-content-width": platformTheme.layout.contentWidth,
    "--platform-rail-width": platformTheme.layout.railWidth,
    "--platform-topbar-height": platformTheme.layout.topbarHeight,
    "--platform-panel-shadow": platformTheme.shadow.panel,
  } as Record<`--${string}`, string>;
}
