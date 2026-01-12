export function applyTheme({ isWidget }) {
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  if (isWidget && prefersDark) {
    document.documentElement.setAttribute("data-theme", "dark");
  } else {
    document.documentElement.removeAttribute("data-theme");
  }
}
