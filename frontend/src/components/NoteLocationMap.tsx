"use client";

import { useEffect } from "react";
import { MapContainer, Marker, TileLayer, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";

import { pinIcon } from "@/lib/mapPins";

type Props = {
  latitude: number;
  longitude: number;
  /** Accordion open — triggers invalidateSize after expand. */
  active?: boolean;
};

function ResizeWhenActive({ active }: { active: boolean }) {
  const map = useMap();
  useEffect(() => {
    if (!active) return;
    const id = window.setTimeout(() => {
      map.invalidateSize();
      map.setView(map.getCenter(), map.getZoom(), { animate: false });
    }, 320);
    return () => window.clearTimeout(id);
  }, [active, map]);
  return null;
}

export default function NoteLocationMap({ latitude, longitude, active = true }: Props) {
  return (
    <div className="note-location-map">
      <MapContainer
        center={[latitude, longitude]}
        zoom={14}
        scrollWheelZoom={false}
        dragging
        attributionControl={false}
        className="note-location-map__canvas"
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <Marker position={[latitude, longitude]} icon={pinIcon("note")} />
        <ResizeWhenActive active={active} />
      </MapContainer>
    </div>
  );
}
