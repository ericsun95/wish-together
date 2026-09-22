const GOOGLE_MAP_HOSTS = ["google.com", "maps.google.com", "maps.app.goo.gl"];

function isGoogleHost(hostname: string) {
  return GOOGLE_MAP_HOSTS.some((host) => hostname === host || hostname.endsWith(`.${host}`));
}

export function isGoogleMapsUrl(value: string) {
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) && isGoogleHost(url.hostname);
  } catch {
    return false;
  }
}

export function getMapQuery(value: string, fallback = "") {
  const trimmed = value.trim();
  if (!trimmed) return fallback.trim();

  try {
    const url = new URL(trimmed);
    if (!isGoogleHost(url.hostname)) return trimmed;

    for (const key of ["query", "q", "destination", "daddr"]) {
      const query = url.searchParams.get(key)?.trim();
      if (query) return query;
    }

    const coordinates = url.pathname.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);
    if (coordinates) return `${coordinates[1]},${coordinates[2]}`;

    const place = url.pathname.match(/\/maps\/(?:place|search)\/([^/@]+)/);
    if (place) return decodeURIComponent(place[1]).replace(/\+/g, " ");

    return fallback.trim() || trimmed;
  } catch {
    return trimmed;
  }
}

export function getMapSource(address: string, url: string) {
  return address.trim() || (isGoogleMapsUrl(url) ? url.trim() : "");
}

export function getGoogleMapsUrl(value: string, fallback = "") {
  const trimmed = value.trim();
  if (isGoogleMapsUrl(trimmed)) return trimmed;
  const query = getMapQuery(trimmed, fallback);
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}
