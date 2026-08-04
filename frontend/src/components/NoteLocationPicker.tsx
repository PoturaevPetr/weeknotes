"use client";

import { useEffect } from "react";
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const markerIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

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
        className="note-location-map__canvas"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <ClickPick
          onPick={(latitude, longitude) => onChange({ latitude, longitude })}
        />
        {value && <Marker position={[value.latitude, value.longitude]} icon={markerIcon} />}
        <ResizeWhenActive active={active} center={center} />
      </MapContainer>
    </div>
  );
}
