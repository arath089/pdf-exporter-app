export function getRoute({ isWidget }) {
  if (isWidget) return { name: "editor" }; // widget only needs editor
  const path = window.location.pathname || "/";
  if (path === "/upgrade") return { name: "upgrade" };
  return { name: "editor" };
}
