"use client";

import { useEffect } from "react";
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";

import { pinIcon } from "@/lib/mapPins";

const FALLBACK: [number, number] = [55.751244, 37.618423];

type Coords = { latitude: number; longitude: number };

type Props = {
  value: Coords | null;
  onChange: (coords: Coords) => void;
  active?: boolean;
};

function ClickPick({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onPick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

function ResizeWhenActive({ active, center }: { active: boolean; center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    if (!active) return;
    const id = window.setTimeout(() => {
      map.invalidateSize();
      map.setView(center, map.getZoom(), { animate: false });
    }, 320);
    return () => window.clearTimeout(id);
  }, [active, map, center]);
  return null;
}

export default function NoteLocationPicker({ value, onChange, active = true }: Props) {
  const center: [number, number] = value
    ? [value.latitude, value.longitude]
    : FALLBACK;

  return (
    <div className="note-location-map note-location-map--pick">
      <MapContainer
        center={center}
        zoom={value ? 14 : 11}
        scrollWheelZoom={false}
        attributionControl={false}
        className="note-location-map__canvas"
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <ClickPick
          onPick={(latitude, longitude) => onChange({ latitude, longitude })}
        />
        {value && (
          <Marker position={[value.latitude, value.longitude]} icon={pinIcon("pick")} />
        )}
        <ResizeWhenActive active={active} center={center} />
      </MapContainer>
    </div>
  );
}
