"use client";
import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from "react-leaflet";
import L from "leaflet";

type Pin = { id: string; lat: number; lng: number; title: string };

const markerIcon = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

function ClickHandler({ onClick }: { onClick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export default function MapLeaflet({
  center,
  zoom = 10,
  pins = [],
  onClick,
}: {
  center: { lat: number; lng: number };
  zoom?: number;
  pins?: Pin[];
  onClick?: (lat: number, lng: number) => void;
}) {
  // fix per dimensioni quando il container cambia
  useEffect(() => {
    // niente: react-leaflet gestisce da solo al mount
  }, []);

  const key = process.env.NEXT_PUBLIC_MAPTILER_KEY!;
  const tiles = `https://api.maptiler.com/maps/streets/{z}/{x}/{y}.png?key=${key}`;

  return (
    <MapContainer
      center={[center.lat, center.lng]}
      zoom={zoom}
      style={{ height: 340, width: "100%" }}
      scrollWheelZoom={true}
    >
      <TileLayer url={tiles} attribution='&copy; OpenStreetMap &copy; MapTiler' />
      {onClick && <ClickHandler onClick={onClick} />}
      {pins.map((p) => (
        <Marker key={p.id} position={[p.lat, p.lng]} icon={markerIcon}>
          <Popup>{p.title}</Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}

