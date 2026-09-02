import { useEffect, useState } from "react";

function parseHash(): string {
  return window.location.hash.replace(/^#\/?/, "");
}

export function useHashRoute(): string {
  const [route, setRoute] = useState(parseHash());
  useEffect(() => {
    const onChange = () => setRoute(parseHash());
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);
  return route;
}

export function navigateTo(routeId: string): void {
  window.location.hash = routeId ? `/${routeId}` : "";
}
