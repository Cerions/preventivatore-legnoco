# CLAUDE.md · Preventivatore Legno & Co.

Preventivatore online per mobili su misura della falegnameria Legno & Co.
Il cliente inserisce le misure, sceglie legno, finitura e consegna, e vede subito il prezzo.
Commessa di riferimento: `01_COMMESSA_Legno_e_Co_Preventivatore.docx` · listino originale: `listino_preventivatore_LegnoCo.xlsx`.

## Stack
- React 19 + Vite, JavaScript (niente TypeScript)
- Test: Vitest (`npm test`)
- Hosting: Netlify, sito statico (`npm run build` → `dist/`), configurato in `netlify.toml`
- Nessun server, nessun database, nessuna libreria UI esterna

## Comandi
- `npm run dev` — server locale (serve anche `public/listino.json`)
- `npm test` — test di calcolo e validazione, inclusi i 5 casi di accettazione
- `npm run build` — build di produzione

## Struttura
- `public/listino.json` — **unico posto dei prezzi**: legni, finiture, consegne, aliquota IVA, misure min/max
- `src/lib/preventivo.js` — logica pura: validazione listino, validazione misure, calcolo, formattazione
- `src/lib/preventivo.test.js` — test
- `src/App.jsx` — interfaccia (carica il listino, form, risultato)

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
7. **Privacy**: i dati inseriti non si salvano e non si inviano (niente localStorage, niente analytics, niente form verso server).
8. Niente chiavi, token o password nel progetto.
9. Fuori perimetro: login, pagamenti, carrello, ordini, magazzino, email.

## Casi di accettazione (dal foglio Casi_di_prova)
| Caso | Misure L×H×P | Legno / Finitura / Consegna | m² | Imponibile | IVA | Totale |
|---|---|---|---|---|---|---|
| C1 | 120×80×40 | Rovere / Cera naturale / Entro 50 km | 3,52 | 735,84 € | 161,88 € | 897,72 € |
| C2 | 200×100×50 | Abete / Grezzo / Ritiro in sede | 7,00 | 595,00 € | 130,90 € | 725,90 € |
| C3 | 90×180×35 | Noce / Laccato / Oltre 50 km | 5,13 | 1.530,75 € | 336,77 € | 1.867,52 € |
| C4 | 150×75×60 | Castagno / Verniciato opaco / Entro 50 km | 4,95 | 941,10 € | 207,04 € | 1.148,14 € |
| C5 | 20×80×40 | Pino / Cera naturale / Ritiro in sede | — | errore: larghezza sotto 30 cm | — | — |

## Git
- Non lavorare mai su `main`: si lavora sul ramo `feature/preventivatore`.
- Commit prima di ogni modifica importante. Messaggi in italiano, brevi.

## Stile
- Interfaccia e messaggi in italiano, mobile-first (deve funzionare bene a 360 px di larghezza).
- Input numerici con `inputMode="decimal"` per avere il tastierino sul telefono.
