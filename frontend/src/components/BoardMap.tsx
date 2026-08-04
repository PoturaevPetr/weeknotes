"use client";

import { useEffect } from "react";
import { MapContainer, Marker, Popup, TileLayer, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

import type { Note } from "@/lib/types";

const markerIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

type Props = {
  notes: Note[];
  selected: { latitude: number; longitude: number } | null;
  onPick: (latitude: number, longitude: number) => void;
};

function ClickPicker({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onPick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export default function BoardMap({ notes, selected, onPick }: Props) {
  const pinned = notes.filter((n) => n.latitude != null && n.longitude != null);
  const center: [number, number] = selected
    ? [selected.latitude, selected.longitude]
    : pinned.length
      ? [pinned[0].latitude!, pinned[0].longitude!]
      : [55.751244, 37.618423];

  useEffect(() => {
    // Fix default icon paths in bundlers
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (L.Icon.Default.prototype as any)._getIconUrl;
  }, []);

  return (
    <div className="map-wrap">
      <MapContainer center={center} zoom={11} scrollWheelZoom className="map">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <ClickPicker onPick={onPick} />
        {pinned.map((n) => (
          <Marker key={n.id} position={[n.latitude!, n.longitude!]} icon={markerIcon}>
            <Popup>
              <strong>{n.author.display_name}</strong>
              <br />
              {n.text}
            </Popup>
          </Marker>
        ))}
        {selected && (
          <Marker position={[selected.latitude, selected.longitude]} icon={markerIcon}>
            <Popup>New note location</Popup>
          </Marker>
        )}
      </MapContainer>
    </div>
  );
}
