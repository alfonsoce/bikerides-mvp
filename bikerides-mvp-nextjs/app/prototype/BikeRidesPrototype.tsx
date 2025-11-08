
"use client";
import React, { useEffect, useMemo, useState } from "react";

/**
 * BikeRides – Prototipo funzionante (solo frontend)
 * Portato in Next.js (app router). Salva su localStorage.
 */

const uid = () => Math.random().toString(36).slice(2, 10);
const fmtDateTime = (iso:string) => new Date(iso).toLocaleString();

// distanza approssimata (Haversine, km)
const haversineKm = (a:{lat:number,lng:number}, b:{lat:number,lng:number}) => {
  const toRad = (v:number) => (v * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);
  const h = sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLng * sinDLng;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
};

// ——— Storage ———
const LS_KEY = "bikerides.mvp.v1";
const loadStore = () => {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
};
const saveStore = (data:any) => localStorage.setItem(LS_KEY, JSON.stringify(data));

// ——— Mock user ———
const currentUser = { id: "u_demo", name: "Ciclista Demo", level: "Intermedio" };

// ——— Small UI helpers ———
function Badge({ children }: {children: React.ReactNode}) {
  return (
    <span className="inline-flex items-center rounded-xl px-2 py-0.5 text-xs border border-gray-200 bg-gray-50">
      {children}
    </span>
  );
}
function Button(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const { className = "", children, ...rest } = props;
  return (
    <button
      className={`rounded-2xl px-4 py-2 shadow-sm border border-gray-200 hover:shadow transition active:translate-y-px ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}
function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  const { className = "", ...rest } = props;
  return (
    <input
      className={`w-full rounded-2xl border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${className}`}
      {...rest}
    />
  );
}
function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const { className = "", ...rest } = props;
  return (
    <textarea
      className={`w-full rounded-2xl border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${className}`}
      {...rest}
    />
  );
}

function Modal({
  open, onClose, title, children, footer
}: { open:boolean; onClose:()=>void; title:string; children:React.ReactNode; footer?:React.ReactNode; }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <div className="w-full max-w-2xl rounded-3xl bg-white shadow-2xl">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button onClick={onClose} className="rounded-full p-2 hover:bg-gray-100">✕</button>
        </div>
        <div className="p-4">{children}</div>
        {footer && <div className="p-4 border-t bg-gray-50 rounded-b-3xl">{footer}</div>}
      </div>
    </div>
  );
}

function Section({ title, children, right }:{title:string; children:React.ReactNode; right?:React.ReactNode}) {
  return (
    <section className="mb-6">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-xl font-semibold">{title}</h2>
        {right}
      </div>
      <div>{children}</div>
    </section>
  );
}

// ——— Tiny SVG Map (placeholder) ———
function TinyMap({ center, pins = [], onClick }:{
  center:{lat:number, lng:number};
  pins?: {id:string, lat:number, lng:number, title:string}[];
  onClick?:(pos:{lat:number,lng:number})=>void;
}) {
  const width = 800, height = 380;
  const proj = (lat:number, lng:number) => {
    // bounds approx: lat 35..60, lng -10..25
    const x = ((lng + 10) / 35) * width;
    const y = ((60 - lat) / 25) * height;
    return { x, y };
  };
  const handleClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!onClick) return;
    const rect = (e.currentTarget as any).getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const lng = (x / width) * 35 - 10;
    const lat = 60 - (y / height) * 25;
    onClick({ lat, lng });
  };
  const c = proj(center.lat, center.lng);
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full rounded-3xl border border-gray-200 bg-gradient-to-b from-sky-100 to-emerald-100 cursor-crosshair" onClick={handleClick}>
      {[...Array(10)].map((_, i) => (
        <line key={`v${i}`} x1={(i+1)*(width/11)} y1={0} x2={(i+1)*(width/11)} y2={height} stroke="#000" opacity="0.05" />
      ))}
      {[...Array(5)].map((_, i) => (
        <line key={`h${i}`} x1={0} y1={(i+1)*(height/6)} x2={width} y2={(i+1)*(height/6)} stroke="#000" opacity="0.05" />
      ))}
      <circle cx={c.x} cy={c.y} r={6} fill="black" opacity="0.3" />
      {pins.map((p) => {
        const { x, y } = proj(p.lat, p.lng);
        return (
          <g key={p.id}>
            <circle cx={x} cy={y} r={7} fill="#ef4444" />
            <text x={x + 10} y={y + 4} fontSize={12}>{p.title.slice(0,22)}</text>
          </g>
        );
      })}
    </svg>
  );
}

// ——— Create Form ———
function CreateRideForm({ onSubmit }:{ onSubmit:(r:any)=>void }) {
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [pace, setPace] = useState("Medio");
  const [bikeType, setBikeType] = useState("Strada");
  const [distance, setDistance] = useState(40);
  const [elev, setElev] = useState(500);
  const [maxp, setMaxp] = useState(10);
  const [notes, setNotes] = useState("");
  const [lat, setLat] = useState(45.4642);
  const [lng, setLng] = useState(9.19);

  const dtISO = useMemo(() => {
    if (!date || !time) return "";
    return new Date(`${date}T${time}`).toISOString();
  }, [date, time]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !dtISO) return alert("Titolo e data/ora sono obbligatori.");
    onSubmit({
      id: uid(),
      organizer_id: currentUser.id,
      route_id: null,
      title,
      start_time: dtISO,
      meeting_point: { lat: parseFloat(String(lat)), lng: parseFloat(String(lng)) },
      pace,
      bike_type: bikeType,
      distance_km: Number(distance),
      elevation_m: Number(elev),
      max_participants: Number(maxp),
      notes,
      status: "scheduled",
      participants: [{ user_id: currentUser.id, name: currentUser.name, status: "going" }],
      messages: [],
    });
  };

  return (
    <form className="grid gap-3" onSubmit={submit}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="text-sm font-medium">Titolo</label>
          <Input value={title} onChange={(e)=>setTitle((e.target as any).value)} placeholder="Giro in Brianza" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-medium">Data</label>
            <Input type="date" value={date} onChange={(e)=>setDate((e.target as any).value)} />
          </div>
          <div>
            <label className="text-sm font-medium">Ora</label>
            <Input type="time" value={time} onChange={(e)=>setTime((e.target as any).value)} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div>
          <label className="text-sm font-medium">Ritmo</label>
          <select className="w-full rounded-2xl border border-gray-200 px-3 py-2" value={pace} onChange={(e)=>setPace((e.target as any).value)}>
            {["Lento","Medio","Veloce"].map((p)=> <option key={p}>{p}</option>)}
          </select>
        </div>
        <div>
          <label className="text-sm font-medium">Tipo bici</label>
          <select className="w-full rounded-2xl border border-gray-200 px-3 py-2" value={bikeType} onChange={(e)=>setBikeType((e.target as any).value)}>
            {["Strada","Gravel","MTB","City"].map((p)=> <option key={p}>{p}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-medium">Distanza (km)</label>
            <Input type="number" value={distance} onChange={(e)=>setDistance(Number((e.target as any).value))} />
          </div>
          <div>
            <label className="text-sm font-medium">Dislivello (m)</label>
            <Input type="number" value={elev} onChange={(e)=>setElev(Number((e.target as any).value))} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div>
          <label className="text-sm font-medium">Max partecipanti</label>
          <Input type="number" value={maxp} onChange={(e)=>setMaxp(Number((e.target as any).value))} />
        </div>
        <div>
          <label className="text-sm font-medium">Lat</label>
          <Input type="number" step="0.0001" value={lat} onChange={(e)=>setLat(Number((e.target as any).value))} />
        </div>
        <div>
          <label className="text-sm font-medium">Lng</label>
          <Input type="number" step="0.0001" value={lng} onChange={(e)=>setLng(Number((e.target as any).value))} />
        </div>
      </div>

      <div>
        <label className="text-sm font-medium">Note</label>
        <TextArea rows={3} value={notes} onChange={(e)=>setNotes((e.target as any).value)} placeholder="Ritmo medio 28 km/h, caffè a metà percorso" />
      </div>

      <div className="flex items-center justify-end gap-2">
        <Button type="submit" className="bg-blue-600 text-white hover:bg-blue-700 border-blue-600">Crea uscita</Button>
      </div>
    </form>
  );
}

function RideCard({ ride, onOpen, onJoin, onLeave }:{
  ride:any; onOpen:()=>void; onJoin:()=>void; onLeave:()=>void;
}) {
  const placesLeft = ride.max_participants - ride.participants.length;
  return (
    <div className="rounded-3xl border border-gray-200 p-4 shadow-sm hover:shadow transition bg-white">
      <div className="flex items-start justify-between">
        <h3 className="text-lg font-semibold cursor-pointer" onClick={onOpen}>{ride.title}</h3>
        <div className="flex items-center gap-2">
          <Badge>{ride.bike_type}</Badge>
          <Badge>{ride.pace}</Badge>
        </div>
      </div>
      <div className="text-sm text-gray-600 mt-1">{fmtDateTime(ride.start_time)}</div>
      <div className="mt-2 flex flex-wrap gap-3 text-sm">
        <span>📏 {ride.distance_km} km</span>
        <span>⛰️ {ride.elevation_m} m</span>
        <span>👥 {ride.participants.length}/{ride.max_participants} ({placesLeft >= 0 ? `${placesLeft} posti liberi` : "over"})</span>
      </div>
      <div className="mt-3 flex gap-2">
        {ride.participants.find((p:any) => p.user_id === currentUser.id) ? (
          <Button onClick={onLeave} className="bg-gray-100">Lascia</Button>
        ) : (
          <Button onClick={onJoin} className="bg-emerald-600 text-white hover:bg-emerald-700 border-emerald-600">Partecipa</Button>
        )}
        <Button onClick={onOpen}>Dettagli</Button>
      </div>
    </div>
  );
}

function ModalDetail({ ride, onClose, onJoin, onLeave, onMessage }:{
  ride:any; onClose:()=>void; onJoin:()=>void; onLeave:()=>void; onMessage:(body:string)=>void;
}) {
  const [msg, setMsg] = useState("");
  const joined = !!ride.participants.find((p:any) => p.user_id === currentUser.id);
  return (
    <Modal open={!!ride} onClose={onClose} title={ride.title}
      footer={
        <div className="flex items-center justify-between gap-2">
          <div className="text-sm text-gray-600">{fmtDateTime(ride.start_time)} • {ride.bike_type} • {ride.pace}</div>
          <div className="flex gap-2">
            {joined ? (
              <Button onClick={onLeave} className="bg-gray-100">Lascia</Button>
            ) : (
              <Button onClick={onJoin} className="bg-emerald-600 text-white border-emerald-600">Partecipa</Button>
            )}
          </div>
        </div>
      }
    >
      <div className="grid md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <div className="text-sm text-gray-700">Ritrovo: lat {ride.meeting_point.lat.toFixed(4)}, lng {ride.meeting_point.lng.toFixed(4)}</div>
          <div className="text-sm text-gray-700">Distanza: {ride.distance_km} km • Dislivello: {ride.elevation_m} m</div>
          <div className="text-sm text-gray-700">Partecipanti: {ride.participants.map((p:any)=>p.name).join(", ")}</div>
          {ride.notes && <p className="text-sm text-gray-700">📝 {ride.notes}</p>}
          <div className="rounded-2xl overflow-hidden border">
            <TinyMap center={ride.meeting_point} pins={[{ id: ride.id, ...ride.meeting_point, title: ride.title }]} />
          </div>
        </div>
        <div className="flex flex-col">
          <h4 className="font-semibold mb-2">Chat</h4>
          <div className="flex-1 min-h-[180px] max-h-[220px] overflow-auto bg-gray-50 rounded-2xl p-3 border">
            {ride.messages.length === 0 && (
              <div className="text-sm text-gray-500">Nessun messaggio. Scrivi il primo!</div>
            )}
            {ride.messages.map((m:any) => (
              <div key={m.id} className="mb-2">
                <div className="text-xs text-gray-500">{m.author} • {fmtDateTime(m.created_at)}</div>
                <div className="text-sm">{m.body}</div>
              </div>
            ))}
          </div>
          <form className="mt-2 flex gap-2" onSubmit={(e)=>{e.preventDefault(); if(!msg.trim()) return; onMessage(msg); setMsg("");}}>
            <Input value={msg} onChange={(e)=>setMsg((e.target as any).value)} placeholder="Scrivi un messaggio" />
            <Button type="submit" className="bg-blue-600 text-white border-blue-600">Invia</Button>
          </form>
        </div>
      </div>
    </Modal>
  );
}

export default function BikeRidesPrototype() {
  const [store, setStore] = useState(() => loadStore() ?? {
    rides: [
      {
        id: uid(),
        organizer_id: currentUser.id,
        title: "Giro Lago di Como",
        start_time: new Date(Date.now() + 86400000).toISOString(),
        meeting_point: { lat: 45.809, lng: 9.085 },
        pace: "Medio",
        bike_type: "Strada",
        distance_km: 80,
        elevation_m: 1100,
        max_participants: 12,
        notes: "Caffè a Bellagio. Casco obbligatorio.",
        status: "scheduled",
        participants: [ { user_id: currentUser.id, name: currentUser.name, status: "going" } ],
        messages: [ { id: uid(), author: "Ciclista Demo", body: "Portate mantellina!", created_at: new Date().toISOString() } ],
      },
      {
        id: uid(),
        organizer_id: currentUser.id,
        title: "Gravel Parco Sud",
        start_time: new Date(Date.now() + 2*86400000).toISOString(),
        meeting_point: { lat: 45.43, lng: 9.12 },
        pace: "Lento",
        bike_type: "Gravel",
        distance_km: 55,
        elevation_m: 300,
        max_participants: 8,
        notes: "Terreno facile, adatto a tutti.",
        status: "scheduled",
        participants: [ { user_id: currentUser.id, name: currentUser.name, status: "going" } ],
        messages: [],
      }
    ]
  });

  const [openCreate, setOpenCreate] = useState(false);
  const [detail, setDetail] = useState<any>(null);

  // Filters
  const [center, setCenter] = useState({ lat: 45.4642, lng: 9.19 }); // Milano
  const [radiusKm, setRadiusKm] = useState(60);
  const [text, setText] = useState("");
  const [type, setType] = useState("Tutte");
  const [pace, setPace] = useState("Tutti i ritmi");

  useEffect(() => saveStore(store), [store]);

  const visibleRides = React.useMemo(() => {
    return store.rides.filter((r:any) => {
      const tmatch = !text || r.title.toLowerCase().includes(text.toLowerCase()) || (r.notes ?? "").toLowerCase().includes(text.toLowerCase());
      if (!tmatch) return false;
      const typem = type === "Tutte" || r.bike_type === type;
      if (!typem) return false;
      const pacem = pace === "Tutti i ritmi" || r.pace === pace;
      if (!pacem) return false;
      const d = haversineKm(center, r.meeting_point);
      return d <= radiusKm;
    }).sort((a:any,b:any) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
  }, [store.rides, text, type, pace, center, radiusKm]);

  const pins = visibleRides.map((r:any) => ({ id: r.id, lat: r.meeting_point.lat, lng: r.meeting_point.lng, title: r.title }));

  const createRide = (ride:any) => {
    setStore((s:any) => ({ ...s, rides: [...s.rides, ride] }));
    setOpenCreate(false);
  };
  const joinRide = (id:string) => setStore((s:any) => ({ ...s, rides: s.rides.map((r:any) => r.id===id ? ({ ...r, participants: r.participants.some((p:any)=>p.user_id===currentUser.id) ? r.participants : [...r.participants, { user_id: currentUser.id, name: currentUser.name, status: "going" }] }) : r) }));
  const leaveRide = (id:string) => setStore((s:any) => ({ ...s, rides: s.rides.map((r:any) => r.id===id ? ({ ...r, participants: r.participants.filter((p:any) => p.user_id !== currentUser.id) }) : r) }));
  const addMessage = (id:string, body:string) => setStore((s:any) => ({ ...s, rides: s.rides.map((r:any) => r.id===id ? ({ ...r, messages: [...r.messages, { id: uid(), author: currentUser.name, body, created_at: new Date().toISOString() }] }) : r) }));

  const openRide = (r:any) => setDetail(r);
  const closeDetail = () => setDetail(null);
  const handleMapClick = ({ lat, lng }:{lat:number,lng:number}) => setCenter({ lat, lng });

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 backdrop-blur supports-backdrop-blur:bg-white/60 bg-white/80 border-b">
        <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-emerald-600 text-white grid place-items-center text-lg font-bold">🚴‍♀️</div>
            <div>
              <div className="font-semibold">BikeRides</div>
              <div className="text-xs text-gray-500">Prototipo MVP</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge>{currentUser.name}</Badge>
            <Button onClick={()=>setOpenCreate(true)} className="bg-blue-600 text-white border-blue-600">+ Crea uscita</Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">
        <Section title="Trova uscite" right={<Badge>{visibleRides.length} trovate</Badge>}>
          <Filters
            center={center} setCenter={setCenter}
            radiusKm={radiusKm} setRadiusKm={setRadiusKm}
            text={text} setText={setText}
            type={type} setType={setType}
            pace={pace} setPace={setPace}
            onMapClick={handleMapClick}
          />
        </Section>

        <Section title="Mappa & Uscite">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="rounded-3xl overflow-hidden border bg-white">
              <TinyMap center={center} pins={pins} onClick={handleMapClick} />
            </div>
            <div className="grid gap-3">
              {visibleRides.length === 0 && (
                <div className="rounded-3xl border p-6 text-center text-gray-600 bg-white">Nessuna uscita nei filtri. Prova ad allargare il raggio o cambia parametri.</div>
              )}
              {visibleRides.map((r:any) => (
                <RideCard key={r.id} ride={r}
                  onOpen={()=>openRide(r)}
                  onJoin={()=>joinRide(r.id)}
                  onLeave={()=>leaveRide(r.id)}
                />
              ))}
            </div>
          </div>
        </Section>
      </main>

      <footer className="mx-auto max-w-6xl px-4 py-10 text-center text-xs text-gray-500">
        © {new Date().getFullYear()} BikeRides – Prototipo. Dati salvati in locale nel tuo browser.
      </footer>

      {/* Create modal */}
      <Modal open={openCreate} onClose={()=>setOpenCreate(false)} title="Nuova uscita"
        footer={<div className="text-xs text-gray-500">Suggerimento: clicca la mappa nei filtri per spostare il centro, poi copia le coordinate nel form.</div>}
      >
        <CreateRideForm onSubmit={createRide} />
      </Modal>

      {/* Detail modal */}
      {detail && (
        <ModalDetail
          ride={detail}
          onClose={closeDetail}
          onJoin={()=>{ joinRide(detail.id); setDetail((prev:any) => ({...prev, participants: [...prev.participants, { user_id: currentUser.id, name: currentUser.name, status: "going" }] })); }}
          onLeave={()=>{ leaveRide(detail.id); setDetail((prev:any) => ({...prev, participants: prev.participants.filter((p:any)=>p.user_id!==currentUser.id)})); }}
          onMessage={(body)=>{ addMessage(detail.id, body); setDetail((prev:any) => ({...prev, messages: [...prev.messages, { id: uid(), author: currentUser.name, body, created_at: new Date().toISOString() }] })); }}
        />
      )}
    </div>
  );
}

function Filters({
  center, setCenter, radiusKm, setRadiusKm, text, setText, type, setType, pace, setPace, onMapClick
}:{
  center:{lat:number,lng:number}; setCenter:(v:{lat:number,lng:number})=>void;
  radiusKm:number; setRadiusKm:(n:number)=>void;
  text:string; setText:(s:string)=>void;
  type:string; setType:(s:string)=>void;
  pace:string; setPace:(s:string)=>void;
  onMapClick:(pos:{lat:number,lng:number})=>void;
}) {
  const [lat, setLat] = useState(center.lat);
  const [lng, setLng] = useState(center.lng);
  useEffect(() => { setLat(center.lat); setLng(center.lng); }, [center.lat, center.lng]);

  return (
    <div className="grid gap-3 md:grid-cols-3">
      <div className="rounded-3xl border p-3 bg-white">
        <div className="text-sm font-medium mb-2">Cerca</div>
        <Input value={text} onChange={(e)=>setText((e.target as any).value)} placeholder="es. Brianza, lago, social" />
        <div className="grid grid-cols-2 gap-2 mt-2">
          <select className="rounded-2xl border px-3 py-2" value={type} onChange={(e)=>setType((e.target as any).value)}>
            <option>Tutte</option>
            <option>Strada</option>
            <option>Gravel</option>
            <option>MTB</option>
            <option>City</option>
          </select>
          <select className="rounded-2xl border px-3 py-2" value={pace} onChange={(e)=>setPace((e.target as any).value)}>
            <option>Tutti i ritmi</option>
            <option>Lento</option>
            <option>Medio</option>
            <option>Veloce</option>
          </select>
        </div>
      </div>
      <div className="rounded-3xl border p-3 bg-white">
        <div className="text-sm font-medium mb-2">Posizione & Raggio</div>
        <div className="grid grid-cols-3 gap-2">
          <Input type="number" step="0.0001" value={lat} onChange={(e)=>setLat(Number((e.target as any).value))} />
          <Input type="number" step="0.0001" value={lng} onChange={(e)=>setLng(Number((e.target as any).value))} />
          <Input type="number" value={radiusKm} onChange={(e)=>setRadiusKm(Number((e.target as any).value))} />
        </div>
        <div className="text-xs text-gray-500 mt-1">lat / lng / raggio (km)</div>
        <div className="mt-2 flex gap-2">
          <Button onClick={()=> setCenter({ lat, lng })} className="bg-gray-100">Imposta centro</Button>
          <Button onClick={()=> navigator.geolocation?.getCurrentPosition(pos => setCenter({ lat: pos.coords.latitude, lng: pos.coords.longitude }))} className="bg-gray-100">Usa posizione</Button>
        </div>
      </div>
      <div className="rounded-3xl border p-3 bg-white">
        <div className="text-sm font-medium mb-2">Mappa</div>
        <div className="rounded-2xl overflow-hidden border">
          <TinyMap center={center} onClick={onMapClick} />
        </div>
        <div className="text-xs text-gray-500 mt-1">Clicca per spostare il centro.</div>
      </div>
    </div>
  );
}
