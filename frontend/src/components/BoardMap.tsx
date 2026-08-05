"use client";

import { useEffect, useMemo } from "react";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

import { pinIcon, type PinKind } from "@/lib/mapPins";
import { avatarPalette, formatDueDate, formatNoteTime, initials } from "@/lib/format";
import type { Note } from "@/lib/types";

const FALLBACK: [number, number] = [55.751244, 37.618423];

type Props = {
  notes: Note[];
  onOpenNote: (note: Note) => void;
};

function FitToPins({ points }: { points: [number, number][] }) {
  const map = useMap();
  const key = points.map((p) => p.join(",")).join(";");
  useEffect(() => {
    if (points.length === 0) return;
    if (points.length === 1) {
      map.setView(points[0], 13);
      return;
    }
    map.fitBounds(L.latLngBounds(points), { padding: [46, 46], maxZoom: 14 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, key]);
  return null;
}

function pinKind(note: Note): PinKind {
  if (note.lifecycle === "proposed") return "idea";
  if (note.status === "done") return "done";
  return "note";
}

export default function BoardMap({ notes, onOpenNote }: Props) {
  const pinned = useMemo(
    () => notes.filter((n) => n.latitude != null && n.longitude != null),
    [notes],
  );
  const points = pinned.map((n) => [n.latitude!, n.longitude!] as [number, number]);

  return (
    <div className="map-wrap">
      <MapContainer
        center={points[0] ?? FALLBACK}
        zoom={11}
        scrollWheelZoom
        attributionControl={false}
        className="map"
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <FitToPins points={points} />
        {pinned.map((n) => {
          const avatar = avatarPalette(n.author.display_name);
          return (
            <Marker key={n.id} position={[n.latitude!, n.longitude!]} icon={pinIcon(pinKind(n))}>
              <Popup className="note-popup" maxWidth={260}>
                <div className="grid gap-2">
                  <div className="flex items-center gap-2">
                    <span
                      className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-[0.65rem] font-bold"
                      style={{ background: avatar.bg, color: avatar.fg }}
                      aria-hidden
                    >
                      {initials(n.author.display_name)}
                    </span>
                    <span className="flex min-w-0 flex-col">
                      <strong className="truncate text-[0.88rem] text-ink">
                        {n.author.display_name}
                      </strong>
                      <span className="text-[0.75rem] text-muted">
                        {formatNoteTime(n.created_at)}
                      </span>
                    </span>
                  </div>
                  <p
                    className="m-0 text-[0.9rem] leading-snug text-ink"
                    style={{
                      display: "-webkit-box",
                      WebkitLineClamp: 3,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                    }}
                  >
                    {n.text}
                  </p>
                  {n.due_at && (
                    <span className="justify-self-start rounded-full bg-accent-soft px-2 py-0.5 text-[0.78rem] font-semibold text-accent-deep">
                      до {formatDueDate(n.due_at)}
                    </span>
                  )}
                  <button
                    type="button"
                    className="btn btn--primary w-full min-h-0 px-3 py-2 text-[0.85rem]"
                    onClick={() => onOpenNote(n)}
                  >
                    Открыть
                  </button>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}
