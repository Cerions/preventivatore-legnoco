# Preventivatore Legno & Co.

Calcolatore online del prezzo dei mobili su misura, con anteprima 3D del mobile e preventivo scaricabile in PDF. Sito statico in React + Vite, pubblicato su Netlify.

**Sito online:** https://legnoco-preventivo.netlify.app
**Area del titolare:** https://legnoco-preventivo.netlify.app/admin

## Cosa fa

- Il cliente scrive larghezza, altezza e profondità e sceglie legno, finitura e consegna: superficie, imponibile, IVA e totale si aggiornano mentre scrive.
- **Anteprima 3D**: il mobile in scala con le misure vere, il colore del legno e la lucidità della finitura; si gira col dito. È indicativa: il prezzo conta le sei facce esterne.
- **PDF del preventivo** con misure, scelte, immagine 3D e importi, generato nel browser: nessun dato parte dal dispositivo del cliente.
- **Area del titolare** (`/admin`) per cambiare prezzi, finiture, consegne, IVA e limiti delle misure senza toccare file a mano.

## Per il titolare: come cambiare i prezzi

### Dalla pagina `/admin` (consigliato)

1. Apri https://legnoco-preventivo.netlify.app/admin e clicca **Accedi con GitHub**.
2. Cambia i valori: puoi scrivere i decimali con la virgola (`92,50`). Puoi aggiungere o togliere legni, finiture e zone di consegna.
3. In fondo vedi l'elenco delle modifiche; se qualcosa non va (un prezzo vuoto, un nome doppio) la pagina te lo dice e non ti lascia pubblicare.
4. Clicca **Pubblica il listino**. Il sito si aggiorna da solo in circa un minuto.

### In alternativa, direttamente su GitHub

Tutti i prezzi sono nel file **`public/listino.json`**. Aprilo sul repository, clicca la matita (*Edit*), cambia solo i numeri usando il **punto** per i decimali (`92.50`), poi *Commit changes*.

| Voce | Significato |
|---|---|
| `aliquotaIva` | IVA come numero decimale: `0.22` = 22% |
| `misure.minimaCm` / `misure.massimaCm` | misura minima e massima accettata, in cm (inclusi) |
| `legni[].prezzoMq` | prezzo del legno in €/m², IVA esclusa |
| `legni[].colore` | colore del legno nell'anteprima 3D (facoltativo) |
| `finiture[].supplementoMq` | supplemento della finitura in €/m², IVA esclusa |
| `finiture[].lucidita` | lucidità nell'anteprima 3D, da 0 (opaca) a 1 (lucida) (facoltativo) |
| `consegne[].costo` | costo fisso della consegna in €, IVA esclusa |

Se il file contiene un errore, il sito non mostra prezzi sbagliati: mostra un avviso e, sotto "Dettagli per il titolare", cosa correggere.

## Come si calcola

```
superficie (m²) = 2 × (L·H + L·P + H·P) / 10000      misure in cm, tutte e 6 le facce
imponibile      = superficie × (prezzo legno + supplemento finitura) + consegna
IVA             = imponibile × aliquota, arrotondata al centesimo
totale          = imponibile + IVA
```

## Assistente chat (facoltativo)

Sotto il preventivatore c'è il pulsante **Chiedi all'assistente**: una chat con un assistente di intelligenza artificiale che risponde su legni, finiture e consegne usando il listino pubblicato. È chiusa di default e prima del primo messaggio il cliente legge un avviso: i messaggi della chat vengono inviati al server dell'assistente, il preventivo no. Il prezzo ufficiale resta quello del preventivatore.

- Il sito resta statico; la chat parla con un server separato (FastAPI, cartella `blocco2` del progetto AssistenteListino) pubblicato su Render. Istruzioni in `blocco2/DEPLOY.md`.
- L'indirizzo del server si imposta su Netlify con la variabile `VITE_CHAT_URL` (vedi `.env.example`). Senza la variabile la chat non compare.
- La chiave dell'IA sta solo nelle impostazioni di Render, mai nel repository.

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
npm run dev      # http://localhost:5173  ·  admin di prova: http://localhost:5173/admin?prova
npm test         # test di calcolo, validazione e admin, inclusi i casi C1–C5
npm run build    # build in dist/
```

Pubblicazione su Netlify: *Add new site → Import an existing project*, scegli il repository e il ramo `main`. Comando di build, cartella, redirect di `/admin` e intestazioni sono già in `netlify.toml`.

### Attivare il login dell'area del titolare (una volta sola)

L'admin non usa database né server: legge e salva `public/listino.json` con le API di GitHub, e ogni salvataggio è un commit sul ramo `main` (che Netlify ripubblica). Il login passa dal provider OAuth di Netlify; il segreto resta nelle impostazioni di Netlify, mai nel progetto.

1. Su GitHub: *Settings → Developer settings → OAuth Apps → New OAuth App*.
   - Homepage URL: `https://legnoco-preventivo.netlify.app`
   - Authorization callback URL: `https://api.netlify.com/auth/done`
   - Copia il **Client ID** e genera un **Client secret**.
2. Su Netlify: *Project configuration → Security → OAuth → Install provider → GitHub*, incolla Client ID e Client secret.
3. Il titolare deve avere un account GitHub con permesso di scrittura sul repository (*Settings → Collaborators* del repository).

Configurazione (facoltativa, variabili d'ambiente di build su Netlify), con i valori predefiniti in `src/admin/config.js`:

| Variabile | Predefinito | A cosa serve |
|---|---|---|
| `VITE_GITHUB_REPO` | `Cerions/preventivatore-legnoco` | repository che contiene il listino |
| `VITE_GITHUB_BRANCH` | `main` | ramo pubblicato da Netlify |
| `VITE_GITHUB_SCOPE` | `public_repo` | permesso chiesto a GitHub; per un repository privato serve `repo` |
| `VITE_NETLIFY_SITE` | `legnoco-preventivo.netlify.app` | nome del sito, usato solo per provare il login da `localhost` |

Fonti: [Netlify · OAuth provider tokens](https://docs.netlify.com/manage/security/secure-access-to-sites/oauth-provider-tokens/), [GitHub · Contents API](https://docs.github.com/en/rest/repos/contents).
