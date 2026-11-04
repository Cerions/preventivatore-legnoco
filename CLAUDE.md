# CLAUDE.md · Preventivatore Legno & Co.

Preventivatore online per mobili su misura della falegnameria Legno & Co.
Il cliente inserisce le misure, sceglie legno, finitura e consegna, e vede subito il prezzo.
Commessa di riferimento: `01_COMMESSA_Legno_e_Co_Preventivatore.docx` · listino originale: `listino_preventivatore_LegnoCo.xlsx`.

## Stack
- React 19 + Vite, JavaScript (niente TypeScript)
- Test: Vitest (`npm test`)
- Hosting: Netlify, sito statico (`npm run build` → `dist/`), configurato in `netlify.toml`
- three.js (anteprima 3D), jsPDF (PDF), font Archivo self-hosted (@fontsource): tutti caricati dal progetto, nessun CDN
- Nessun database, nessuna libreria UI esterna. Il sito è statico; l'unico server è quello **facoltativo** della chat (FastAPI su Vercel, cartella `AssistenteListino/blocco2`, fuori da questo repository), indirizzo in `VITE_CHAT_URL`: se manca, la chat non compare

## Comandi
- `npm run dev` — server locale (serve anche `public/listino.json`); `/admin?prova` = admin con finto GitHub in memoria (solo sviluppo)
- `npm test` — test di calcolo, validazione e admin, inclusi i 5 casi di accettazione
- `npm run build` — build di produzione
- Chat in locale: avvia il server (`uvicorn server:app`) e metti `VITE_CHAT_URL=http://127.0.0.1:8000/chat` in `.env.local` (vedi `.env.example`)

## Struttura
- `public/listino.json` — **unico posto dei prezzi**: legni (+ `colore` facoltativo), finiture (+ `lucidita` 0–1 facoltativa), consegne, aliquota IVA, misure min/max
- `src/lib/preventivo.js` — logica pura: validazione listino, validazione misure, calcolo, formattazione
- `src/lib/listino.js` — caricamento del listino (`cache: 'no-store'`) e `serializzaListino` (formato del file, una riga per voce)
- `src/lib/pdf.js` — PDF del preventivo con jsPDF, caricato al clic
- `src/components/Preventivatore.jsx` — pagina cliente: metro con le misure, scelte, riepilogo, barra del totale su telefono
- `src/components/Mobile3D.jsx` — anteprima 3D (three.js, caricata con `React.lazy`), quote sugli spigoli, `istantanea()` per il PDF
- `src/admin/` — pagina `/admin`: login GitHub via provider OAuth di Netlify (`github.js`), modulo e differenze (`bozza.js`), finto backend per lo sviluppo (`backendProva.js`)
- `src/lib/chat.js` — client della chat: `VITE_CHAT_URL`, sessione in memoria, errori in italiano
- `src/components/Chat.jsx` + `chat.css` — chat facoltativa, chiusa di default, caricata con `React.lazy`, avviso privacy prima del primo messaggio
- `src/Radice.jsx` — sceglie tra pagina cliente e `/admin` (redirect in `netlify.toml`)

## Regole non negoziabili
1. **Nessun prezzo nel codice.** Prezzi, aliquota e limiti si leggono solo da `public/listino.json`. I test lo leggono dallo stesso file.
2. **Formula** (verificata a mano sul caso C1):
   - superficie m² = 2 × (L·H + L·P + H·P) / 10000 — tutte e 6 le facce, misure in cm
   - imponibile = superficie × (prezzo legno + supplemento finitura) + costo consegna
   - IVA = imponibile × aliquota, arrotondata al centesimo
   - totale = imponibile + IVA arrotondata
3. **Calcoli in centesimi interi**, arrotondamento al centesimo con mezzo in su. Mai `toFixed` sui float: il caso C3 (IVA 336,765) deve dare 336,77, non 336,76.
4. **Formato importi**: `Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', useGrouping: 'always' })` → `1.234,56 €`. Senza `useGrouping: 'always'` l'italiano scrive `1234,56 €`.
5. **Validazione misure**: obbligatorie, numeriche (accettata la virgola decimale: `120,5`), maggiori di zero, tra min e max **inclusi**. Se una misura non è valida: messaggio in italiano sotto il campo e **nessun prezzo mostrato**.
6. **Listino rotto** (file mancante, JSON non valido, prezzo negativo o non numerico): messaggio chiaro, nessun prezzo. Mai pagina bianca.
7. **Privacy**: i dati del preventivatore (misure e scelte) non si salvano e non si inviano (niente localStorage, niente analytics, niente form verso server, niente font o script da CDN). Il PDF si genera nel browser. **Unica eccezione**: la chat facoltativa invia al server solo i messaggi che il cliente scrive, dopo l'avviso e il suo consenso; la conversazione resta solo in memoria. Il preventivo non viene mai mandato alla chat.
8. Niente chiavi, token o password nel progetto. Il segreto OAuth sta nelle impostazioni di Netlify; il token GitHub dell'admin resta solo in memoria.
9. **Admin senza database**: legge e salva `public/listino.json` con le API Contents di GitHub (commit su `main`). Prima di salvare passa sempre da `validaListino` e scrive con `serializzaListino`.
10. **3D e PDF solo su richiesta**: three.js e jsPDF restano in file separati caricati con import dinamico; la pagina iniziale non deve importarli.
11. Fuori perimetro: login dei clienti, pagamenti, carrello, ordini, magazzino, email.

## Casi di accettazione (dal foglio Casi_di_prova)
| Caso | Misure L×H×P | Legno / Finitura / Consegna | m² | Imponibile | IVA | Totale |
|---|---|---|---|---|---|---|
| C1 | 120×80×40 | Rovere / Cera naturale / Entro 50 km | 3,52 | 735,84 € | 161,88 € | 897,72 € |
| C2 | 200×100×50 | Abete / Grezzo / Ritiro in sede | 7,00 | 595,00 € | 130,90 € | 725,90 € |
| C3 | 90×180×35 | Noce / Laccato / Oltre 50 km | 5,13 | 1.530,75 € | 336,77 € | 1.867,52 € |
| C4 | 150×75×60 | Castagno / Verniciato opaco / Entro 50 km | 4,95 | 941,10 € | 207,04 € | 1.148,14 € |
| C5 | 20×80×40 | Pino / Cera naturale / Ritiro in sede | — | errore: larghezza sotto 30 cm | — | — |

## Git
- Non lavorare mai su `main`: si lavora su rami `feature/...` (oggi `feature/extra`) e si unisce con pull request.
- Unica eccezione: i commit del listino fatti dall'admin o dal titolare su GitHub vanno su `main`.
- Commit prima di ogni modifica importante. Messaggi in italiano, brevi.

## Stile
- Interfaccia e messaggi in italiano, mobile-first (deve funzionare bene a 360 px di larghezza).
- Input numerici con `inputMode="decimal"` per avere il tastierino sul telefono.
- Grafica: carta `#fbfaf7`, grafite `#23272b`, giallo metro `#f3c319`, font Archivo (larghezze variabili). I colori dei legni vengono dal listino. Niente MAIUSCOLETTO nelle etichette, niente frecce nei bottoni.
