# Preventivatore Legno & Co.

Calcolatore online del prezzo dei mobili su misura. Sito statico in React + Vite, pubblicato su Netlify.

**Sito online:** https://legnoco-preventivo.netlify.app

## Per il titolare: come cambiare i prezzi

Tutti i prezzi sono nel file **`public/listino.json`**. Il codice non contiene prezzi.

1. Apri il file `public/listino.json` sul repository GitHub e clicca sulla matita (✏️ *Edit*).
2. Cambia solo i numeri. Usa il **punto** per i decimali (`92.50`, non `92,50`) e non toccare virgolette, parentesi e virgole.
3. Clicca *Commit changes*. Netlify ripubblica il sito da solo in circa un minuto.

| Voce | Significato |
|---|---|
| `aliquotaIva` | IVA come numero decimale: `0.22` = 22% |
| `misure.minimaCm` / `misure.massimaCm` | misura minima e massima accettata, in cm (inclusi) |
| `legni[].prezzoMq` | prezzo del legno in €/m², IVA esclusa |
| `finiture[].supplementoMq` | supplemento della finitura in €/m², IVA esclusa |
| `consegne[].costo` | costo fisso della consegna in €, IVA esclusa |

Per aggiungere un legno, una finitura o una zona di consegna, copia una riga esistente e cambiane nome e prezzo.
Se il file contiene un errore, il sito non mostra prezzi sbagliati: mostra un avviso e, sotto "Dettagli per il titolare", cosa correggere.

## Come si calcola

```
superficie (m²) = 2 × (L·H + L·P + H·P) / 10000      misure in cm, tutte e 6 le facce
imponibile      = superficie × (prezzo legno + supplemento finitura) + consegna
IVA             = imponibile × aliquota, arrotondata al centesimo
totale          = imponibile + IVA
```

## Documenti di progetto

Nella cartella [`docs/`](docs/) ci sono i documenti di lavoro della commessa: non servono a far funzionare il sito.

| File | Cos'è | Per chi |
|---|---|---|
| [`docs/piano-di-lavoro.md`](docs/piano-di-lavoro.md) | Piano per il titolare: cosa costruiamo, formula verificata a mano, scelte tecniche, fasi fino al 20/11, casi di collaudo, rischi, decisioni da confermare | Il titolare, che approva il lavoro |
| [`docs/analisi-bozza-deepseek.md`](docs/analisi-bozza-deepseek.md) | Errori trovati nel piano scritto da un'altra IA (DeepSeek) sulla stessa commessa, con le verifiche che li dimostrano | Il docente, come prova del controllo critico sull'output di un'IA |

Altri file utili: [`CLAUDE.md`](CLAUDE.md) contiene le regole del progetto per l'agente IA (formula, arrotondamenti, validazione, casi di accettazione).

## Per gli sviluppatori

```bash
npm install
npm run dev      # http://localhost:5173
npm test         # test di calcolo e validazione, inclusi i casi C1–C5
npm run build    # build in dist/
```

Pubblicazione su Netlify: *Add new site → Import an existing project*, scegli il repository. Comando di build e cartella sono già in `netlify.toml`.
Le regole del progetto per l'agente sono in `CLAUDE.md`.
