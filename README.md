# BikeRides – MVP (Next.js)

Prototipo frontend per organizzare uscite in bici: creazione uscite, filtri, mappa placeholder, chat per uscita e persistenza su localStorage.

## Sviluppo locale
```bash
npm install
npm run dev
```
Apri http://localhost:3000

## Deploy rapido su Vercel
1. Crea un nuovo repository GitHub e pusha questo progetto.
2. Su https://vercel.com importa il repo e accetta i default (Next.js).
3. Al termine, avrai un URL pubblico del tipo `https://bikerides-xxxxx.vercel.app`.

## Note
- Nessun backend: i dati restano nel browser dell'utente (localStorage).
- Per sostituire la mappa placeholder con Mapbox/Leaflet servirà un token e poche modifiche.
