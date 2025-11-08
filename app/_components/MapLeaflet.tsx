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
  center: centerProp,
  zoom = 12,
  pins = [],
  onClick,
}: {
  center?: { lat: number; lng: number };
  zoom?: number;
  pins?: Pin[];
  onClick?: (lat: number, lng: number) => void;
}) {
  const key = process.env.NEXT_PUBLIC_MAPTILER_KEY!;
  const tiles = `https://api.maptiler.com/maps
