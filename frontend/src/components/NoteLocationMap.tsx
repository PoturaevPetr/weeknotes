"use client";

import { useEffect } from "react";
import { MapContainer, Marker, TileLayer, useMap } from "react-leaflet";
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
        className="note-location-map__canvas"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker position={[latitude, longitude]} icon={markerIcon} />
        <ResizeWhenActive active={active} />
      </MapContainer>
    </div>
  );
}
