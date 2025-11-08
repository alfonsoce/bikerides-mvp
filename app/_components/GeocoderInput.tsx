"use client";
import { useEffect, useMemo, useState } from "react";

export default function GeocoderInput({
  onPick,
  placeholder = "Cerca indirizzo o luogo…",
}: {
  onPick: (lat: number, lng: number, label: string) => void;
  placeholder?: string;
}) {
  const [q, setQ] = useState("");
  const [items, setItems] = useState<{label:string, lat:number, lng:number}[]>([]);
  const [open, setOpen] = useState(false);

  // debounce semplice
  const [deb, setDeb] = useState<any>(null);
  useEffect(() => {
    if (!q.trim()) { setItems([]); return; }
    if (deb) clearTimeout(deb);
    const t = setTimeout(async () => {
      const key = process.env.NEXT_PUBLIC_MAPTILER_KEY!;
      const url = `https://api.maptiler.com/geocoding/${encodeURIComponent(q)}.json?key=${key}&language=it&limit=5`;
      const r = await fetch(url);
      const data = await r.json();
      const results = (data.features ?? []).map((f: any) => ({
        label: f.place_name ?? f.text,
        lng: f.center[0],
        lat: f.center[1],
      }));
      setItems(results);
      setOpen(true);
    }, 300);
    setDeb(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  return (
    <div className="relative">
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-2xl border border-gray-200 px-3 py-2"
      />
      {open && items.length > 0 && (
        <div className="absolute z-50 mt-1 w-full rounded-2xl border bg-white shadow">
          {items.map((it, i) => (
            <button
              key={i}
              className="w-full text-left px-3 py-2 hover:bg-gray-50"
              onClick={() => { setQ(it.label); setOpen(false); onPick(it.lat, it.lng, it.label); }}
            >
              {it.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

