"use client";
import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";

type Pin = { id: string; lat: number; lng: number; title: string };

// Icona default Leaflet
const defaultIcon = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

// Imposta l'icona default per tutti i marker
(L.Marker.prototype as any).options.icon = defaultIcon;

function ClickHandler({ onClick }: { onClick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onClick?.(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

function Recenter({ lat, lng, zoom }: { lat: number; lng: number; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lng], zoom, { animate: false });
  }, [lat, lng, zoom, map]);
  return null;
}

export default function MapLeaflet({
  center: centerProp,   // <-- ora è opzionale
  zoom = 12,
  pins = [],
  onClick,
}: {
  center?: { lat: number; lng: number };  // <-- opzionale
  zoom?: number;
  pins?: Pin[];
  onClick?: (lat: number, lng: number) => void;
}) {
  const key = process.env.NEXT_PUBLIC_MAPTILER_KEY!;
  const tiles = `https://api.maptiler.com/maps/streets/{z}/{x}/{y}.png?key=${key}`;

  // Stato interno del centro: usa prop se arriva, altrimenti Milano + GPS
  const [center, setCenter] = useState<{ lat: number; lng: number }>(
    centerProp ?? { lat: 45.4642, lng: 9.19 } // Milano
  );

  // Se la prop `center` cambia, aggiorna lo stato (controllo esterno)
  useEffect(() => {
    if (centerProp) setCenter(centerProp);
  }, [centerProp]);

  // Se NON c'è una prop `center`, prova il GPS e aggiorna il centro
  useEffect(() => {
    if (!centerProp && typeof window !== "undefined" && "geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setCenter({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => {/* fallback: resta Milano */},
        { enableHighAccuracy: true, timeout: 5000 }
      );
    }
  }, [centerProp]);

  return (
    <MapContainer style={{ height: 340, width: "100%" }}>
      <Recenter lat={center.lat} lng={center.lng} zoom={zoom} />
      <TileLayer url={tiles} />
      {onClick && <ClickHandler onClick={onClick} />}
      {pins.map((p) => (
        <Marker key={p.id} position={[p.lat, p.lng]}>
          <Popup>{p.title}</Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
