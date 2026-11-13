/* Customisable theme, saved in this browser. Ported from the original MindEase app. */
export const THEME_KEY = "mindease_theme";
export type Theme = { mode: "system" | "light" | "dark"; accent: string; bg: string; size: number; font: string; round: string };
export const DEF_T: Theme = { mode: "system", accent: "#2f7d6b", bg: "sage", size: 15, font: "inter", round: "soft" };

export const ACCENTS: [string, string][] = [
  ["Teal", "#2f7d6b"],
  ["Indigo", "#4f5fd1"],
  ["Sky", "#1f78b4"],
  ["Violet", "#7c4dbd"],
  ["Rose", "#c2456b"],
  ["Amber", "#b7791f"],
  ["Slate", "#475569"],
];
/* each background: [page, surface, surface-2, line] for light and dark */
export const BGS: Record<string, { name: string; l?: string[]; d?: string[] }> = {
  sage: { name: "Sage" },
  mist: { name: "Mist", l: ["#f1f4f8", "#ffffff", "#e6ecf3", "#d8e0ea"], d: ["#0f141a", "#161d25", "#1d2731", "#28333f"] },
  lavender: { name: "Lavender", l: ["#f5f3fa", "#ffffff", "#ece8f5", "#ddd8ea"], d: ["#14121b", "#1b1824", "#241f30", "#302a40"] },
  warm: { name: "Warm", l: ["#f7f3ef", "#ffffff", "#efe8e1", "#e3d9cf"], d: ["#17130f", "#201a15", "#2a221b", "#3a3027"] },
  plain: { name: "Plain", l: ["#f4f4f5", "#ffffff", "#e8e8ea", "#dcdce0"], d: ["#121213", "#1b1b1d", "#242427", "#303034"] },
};
export const FONTS: Record<string, [string, string]> = {
  inter: ["Default", '"Inter", system-ui, sans-serif'],
  atkinson: ["Easy to read", '"Atkinson Hyperlegible", "Inter", system-ui, sans-serif'],
  lora: ["Serif", '"Lora", Georgia, serif'],
};
export const ROUND: Record<string, [number, number, number]> = { sharp: [6, 6, 8], soft: [16, 10, 12], round: [24, 16, 18] };

type RGB = number[];
const h2r = (h: string): RGB => {
  h = String(h).replace("#", "");
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) || 0);
};
const r2h = (a: RGB) => "#" + a.map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, "0")).join("");
const lum = (a: RGB) => {
  const f = (v: number) => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * f(a[0]) + 0.7152 * f(a[1]) + 0.0722 * f(a[2]);
};
export const contrast = (a: RGB, b: RGB) => {
  const x = lum(a);
  const y = lum(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
};
function toward(rgb: RGB, target: RGB, bg: RGB, min: number) {
  let c = rgb.slice();
  for (let i = 0; i < 24 && contrast(c, bg) < min; i++) c = c.map((v, k) => v + (target[k] - v) * 0.12);
  return c;
}
/** Accent colours are nudged until they reach 4.5:1 contrast against the page. */
export function readableAccent(accent: string, bg: string, dark: boolean) {
  const base = h2r(accent);
  const bgRgb = h2r(bg);
  return r2h(dark ? toward(base, [255, 255, 255], bgRgb, 4.5) : toward(base, [0, 0, 0], bgRgb, 4.5));
}
export const hexContrast = (a: string, b: string) => contrast(h2r(a), h2r(b));

export function loadTheme(): Theme {
  const t = { ...DEF_T };
  try {
    Object.assign(t, JSON.parse(localStorage.getItem(THEME_KEY) || "{}"));
  } catch {
    /* ignore */
  }
  return t;
}
export const saveTheme = (t: Theme) => {
  try {
    localStorage.setItem(THEME_KEY, JSON.stringify(t));
  } catch {
    /* ignore */
  }
};

const isDark = () => {
  const a = document.documentElement.getAttribute("data-theme");
  return a === "dark" ? true : a === "light" ? false : window.matchMedia("(prefers-color-scheme: dark)").matches;
};

function applyVars(T: Theme) {
  const root = document.documentElement;
  const st = root.style;
  const dark = isDark();
  const b = BGS[T.bg] || BGS.sage;
  ["--bg", "--surface", "--surface-2", "--line"].forEach((n, i) => (b.l && b.d ? st.setProperty(n, (dark ? b.d : b.l)[i]) : st.removeProperty(n)));
  const accNames = ["--accent", "--accent-fg", "--user", "--user-fg"];
  if (String(T.accent).toLowerCase() === DEF_T.accent) accNames.forEach((n) => st.removeProperty(n));
  else {
    const bgHex = b.l && b.d ? (dark ? b.d : b.l)[0] : dark ? "#101715" : "#f2f6f4";
    const acc = readableAccent(T.accent, bgHex, dark);
    const user = readableAccent(T.accent, "#ffffff", false);
    st.setProperty("--accent", acc);
    st.setProperty("--accent-fg", hexContrast(acc, "#ffffff") > hexContrast(acc, "#000000") ? "#ffffff" : "#000000");
    st.setProperty("--user", user);
    st.setProperty("--user-fg", "#ffffff");
  }
  st.setProperty("--font-body", (FONTS[T.font] || FONTS.inter)[1]);
  const r = ROUND[T.round] || ROUND.soft;
  st.setProperty("--r-bubble", r[0] + "px");
  st.setProperty("--r-ctl", r[1] + "px");
  st.setProperty("--r-card", r[2] + "px");
  st.setProperty("--fs-base", (Number(T.size) || 15) + "px");
}

export function applyTheme(T: Theme) {
  const root = document.documentElement;
  if (T.mode === "system") root.removeAttribute("data-theme");
  else root.setAttribute("data-theme", T.mode);
  applyVars(T);
}
