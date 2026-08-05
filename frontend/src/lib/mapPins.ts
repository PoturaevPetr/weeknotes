import L from "leaflet";

export type PinKind = "note" | "done" | "idea" | "pick";

const PIN_COLORS: Record<PinKind, string> = {
  note: "#e8663f",
  done: "#4d8a6d",
  idea: "#d99a2b",
  pick: "#bf4a27",
};

const GLYPHS: Record<PinKind, string> = {
  note: '<path d="M16 19l-3.6-3.4c-1.2-1.1-1.2-2.9 0-3.9 1.1-1 2.7-.9 3.6.2.9-1.1 2.5-1.2 3.6-.2 1.2 1 1.2 2.8 0 3.9L16 19z" fill="#fff"/>',
  done: '<path d="M12 14.4l2.6 2.6 5.2-5.3" stroke="#fff" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
  idea: '<path d="M16 8.4l1.8 4.4 4.4 1.7-4.4 1.8-1.8 4.4-1.8-4.4-4.4-1.8 4.4-1.7L16 8.4z" fill="#fff"/>',
  pick: '<path d="M16 10.3v7.8M12.1 14.2h7.8" stroke="#fff" stroke-width="2.5" stroke-linecap="round"/>',
};

/** Warm teardrop pin with a white glyph, matching the app palette. */
export function pinIcon(kind: PinKind): L.DivIcon {
  return L.divIcon({
    className: `map-pin map-pin--${kind}`,
    html: `<svg width="34" height="42" viewBox="0 0 32 40" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <path d="M16 1.5C8.8 1.5 3 7.2 3 14.3 3 23.7 16 38.5 16 38.5S29 23.7 29 14.3C29 7.2 23.2 1.5 16 1.5z" fill="${PIN_COLORS[kind]}" stroke="#fff" stroke-width="2"/>
  ${GLYPHS[kind]}
</svg>`,
    iconSize: [34, 42],
    iconAnchor: [17, 40],
    popupAnchor: [0, -36],
  });
}
