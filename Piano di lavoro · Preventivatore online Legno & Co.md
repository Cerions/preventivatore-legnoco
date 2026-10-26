# Piano di lavoro · Preventivatore online Legno & Co.

Oct 26, 2026 · @Luca

## Cosa costruiamo

Una sola pagina web dove il cliente calcola da solo il prezzo del mobile, dal telefono o dal computer, in pochi secondi. Online entro venerdì 20 novembre 2026, su un servizio gratuito che non richiede manutenzione.

**Il cliente inserisce:** larghezza, altezza e profondità in centimetri; tipo di legno, finitura e consegna scelti da un elenco.

**Il cliente vede:** la superficie totale in m², l'importo IVA esclusa (imponibile), l'IVA a parte e il totale IVA inclusa, in formato italiano (es. 1.234,56 €). Se una misura non va bene vede un messaggio chiaro e nessun prezzo.

**Fuori da questo lavoro:** account e password, pagamento online, carrello e ordini, magazzino, invio di email. I dati inseriti dal cliente non vengono salvati né inviati a nessuno.

## Come calcoliamo il prezzo

Il prezzo al m² si applica alla superficie di tutte e sei le facce del mobile; poi si aggiunge la consegna e sul totale si calcola l'IVA. Misure in centimetri, prezzi di listino IVA esclusa.

```latex
\begin{aligned}
\text{superficie (m}^2) &= \frac{2 \times (L \cdot H + L \cdot P + H \cdot P)}{10000} \\
\text{imponibile} &= \text{superficie} \times (\text{prezzo legno} + \text{supplemento finitura}) + \text{consegna} \\
\text{IVA} &= \text{imponibile} \times \text{aliquota} \\
\text{totale} &= \text{imponibile} + \text{IVA}
\end{aligned}
```

**Verifica a mano sul caso C1** (Rossi: 120 × 80 × 40 cm, Rovere, Cera naturale, entro 50 km):

1. Superficie: 2 × (9.600 + 4.800 + 3.200) = 35.200 cm² = 3,52 m²
2. Prezzo al m²: 180 (Rovere) + 12 (Cera naturale) = 192 €/m²
3. Mobile: 3,52 × 192 = 675,84 €
4. Imponibile: 675,84 + 60 (consegna) = 735,84 €
5. IVA 22%: 161,88 €
6. Totale: 897,72 €

**Due regole che rendono i conti sempre uguali a quelli fatti a mano:**

- L'IVA si arrotonda al centesimo con il mezzo centesimo per eccesso, e il totale è imponibile + IVA già arrotondata. Così i tre importi mostrati tornano sempre.
- L'IVA si calcola anche sulla consegna, perché la commessa la applica "sull'importo così ottenuto" (punto 3.3).

## Scelte tecniche

Ogni scelta risponde a una richiesta precisa della commessa; la colonna a destra dice quale e in quale file del progetto si può controllare.

| Scelta | Perché | Commessa | Dove si controlla |
| --- | --- | --- | --- |
| Una pagina sola, fatta in React | "Una pagina, massimo due", niente account | §1, §4 Tecnologia | `src/App.jsx` |
| Prezzi, IVA e limiti in un file di dati separato | Il titolare cambia i prezzi senza toccare il codice | §3.5 | `public/listino.json` |
| Sito statico su Netlify, piano gratuito | Niente server né database, costo zero, resta online da solo | §1, §4 Dove vive | `netlify.toml` |
| Calcolo fatto nel browser del cliente | I dati del cliente non si salvano e non partono verso nessuno | §4 Dati dei clienti | `src/lib/preventivo.js` |
| Misure tra 30 e 300 cm, solo numeri maggiori di zero | Nessun prezzo strano per misure assurde | §3.4 | `src/lib/preventivo.js` |
| Calcoli in centesimi interi | Evita errori di un centesimo (vedi Rischi) | §3.2, §6.1 | `src/lib/preventivo.js` |
| Test automatici con i 5 casi di prova | Il collaudo del titolare deve tornare al centesimo | §6.1 | `src/lib/preventivo.test.js` |
| Pagina pensata prima per il telefono | La maggior parte dei clienti scrive dal telefono | §1, §4 Telefono | `src/index.css` |
| Lavoro su un ramo separato, commit a ogni passo | Mai modifiche dirette alla versione principale | §4 Git | ramo `feature/preventivatore` |
| Nessuna chiave o password nel progetto | Il sito non ne ha bisogno | §4 Chiavi | tutto il repository |

## Fasi di lavoro

Un prototipo funzionante esiste già e dà i risultati attesi sui cinque casi di prova; da qui al 20 novembre lo adattiamo alle tue decisioni, lo pubblichiamo e lo collaudiamo con te.

&#91;embedded content: fasi di lavoro · dal 26 ottobre al 20 novembre 2026\]

Il passaggio chiave è il 30 ottobre: senza il tuo sì sulle decisioni qui sotto non pubblichiamo nulla.

## Come accetti il lavoro

Questi sono i risultati che devi trovare sul sito per i cinque casi del foglio Casi\_di\_prova; li abbiamo ricalcolati a mano. C5 è volutamente sbagliato: deve comparire un messaggio, non un prezzo.

| Caso | Misure (cm) | Legno · finitura · consegna | Superficie | Imponibile | IVA 22% | Totale |
| --- | --- | --- | --- | --- | --- | --- |
| C1 Rossi | 120 × 80 × 40 | Rovere · Cera naturale · Entro 50 km | 3,52 m² | 735,84 € | 161,88 € | 897,72 € |
| C2 Bianchi | 200 × 100 × 50 | Abete · Grezzo · Ritiro in sede | 7,00 m² | 595,00 € | 130,90 € | 725,90 € |
| C3 Verdi | 90 × 180 × 35 | Noce · Laccato · Oltre 50 km | 5,13 m² | 1.530,75 € | 336,77 € | 1.867,52 € |
| C4 Neri | 150 × 75 × 60 | Castagno · Verniciato opaco · Entro 50 km | 4,95 m² | 941,10 € | 207,04 € | 1.148,14 € |
| C5 Gallo | 20 × 80 × 40 | Pino · Cera naturale · Ritiro in sede | — | — | — | "La larghezza deve essere tra 30 e 300 cm." |

**Gli altri tre controlli:**

- [ ] Scrivi una misura non valida (es. altezza 2000 o -5): vedi un messaggio in italiano e nessun prezzo
- [ ] Cambia un prezzo nel file del listino: dopo circa un minuto il preventivo sul sito è cambiato, senza toccare il codice
- [ ] Apri la pagina dal tuo telefono: si legge bene e si compila senza ingrandire

## Rischi e come li gestiamo

Il rischio più probabile è un errore nel file dei prezzi quando lo modifichi; il sito è costruito per accorgersene e non mostrare mai un prezzo sbagliato.

| Rischio | Cosa succederebbe | Come lo gestiamo |
| --- | --- | --- |
| Errore di scrittura nel file del listino (virgola al posto del punto, virgolette tolte) | Prezzi sbagliati o pagina vuota | Il sito controlla il file a ogni apertura: se c'è un errore mostra un avviso e nessun prezzo, e ti dice cosa correggere. Istruzioni passo passo nel README |
| Arrotondamento dell'IVA | Un centesimo di differenza dai conti a mano (es. C3: IVA esatta 336,765 €) | Calcoli in centesimi interi, mezzo centesimo per eccesso; test automatico su C3 |
| Formato degli importi | "1234,56 €" invece di "1.234,56 €" sopra i mille euro | Separatore delle migliaia forzato; test automatico su C3 e C4 |
| Il cliente scrive "120,5" o "120 cm" | Misura non riconosciuta | La virgola decimale è accettata; per il resto compare un messaggio con un esempio |
| Prezzo cambiato ma il cliente vede ancora quello vecchio | Preventivo non aggiornato | Il sito chiede sempre al server il listino aggiornato, senza usare copie vecchie |
| Mobili con ripiani, ante o cassetti | Il calcolo conta solo le sei facce esterne | Da confermare con te (vedi Decisioni) |
| Modifica dei prezzi richiede un account GitHub | Non riesci a cambiare i prezzi da solo | Account a nome tuo e una prova guidata di 15 minuti alla consegna |

## Come cambi i prezzi

Tutti i prezzi stanno in un unico file, `listino.json`, che modifichi dal browser: il sito si aggiorna da solo in circa un minuto.

1. Apri il file `public/listino.json` su GitHub e clicca sulla matita (Edit).
2. Cambia solo i numeri. Per i decimali usa il punto: `92.50`, non `92,50`.
3. Clicca "Commit changes". Netlify ripubblica il sito da solo.
4. Apri il sito e controlla un preventivo.

Cosa c'è nel file: `aliquotaIva` (0.22 = 22%), `minimaCm` e `massimaCm` (limiti delle misure), il prezzo al m² di ogni legno, il supplemento al m² di ogni finitura e il costo fisso di ogni consegna. Per aggiungere un legno, una finitura o una zona si copia una riga esistente e si cambiano nome e prezzo.

## Decisioni da confermare

Sei punti che la commessa non chiarisce; abbiamo scelto la soluzione indicata, ma ci serve il tuo sì o la tua correzione entro venerdì 30 ottobre.

- [ ] **Superficie:** contiamo le sei facce esterne; ripiani interni, ante e cassetti non sono inclusi. Va bene così?
- [ ] **Limiti delle misure:** 30 cm e 300 cm sono accettati (limiti inclusi), e valgono uguali per larghezza, altezza e profondità.
- [ ] **IVA:** mostriamo a tutti sia l'importo IVA esclusa sia il totale IVA inclusa, senza far scegliere "privato" o "azienda".
- [ ] **Dettaglio del prezzo:** sotto la superficie mostriamo anche il costo del mobile, il prezzo al m² e la consegna. Preferisci nasconderli?
- [ ] **Account GitHub** a tuo nome per modificare i prezzi, con una prova guidata alla consegna.
- [ ] **Indirizzo del sito:** quello gratuito di Netlify (nome-scelto.netlify.app) oppure un collegamento dal tuo sito attuale?
