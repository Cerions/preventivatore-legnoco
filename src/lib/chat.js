// Chat con l'assistente (facoltativa). Indirizzo del server in VITE_CHAT_URL:
// se manca, la chat non compare. Non è un segreto, è un indirizzo pubblico.
export const URL_CHAT = (import.meta.env.VITE_CHAT_URL ?? '').trim()
export const chatDisponibile = URL_CHAT !== ''

const ATTESA_MASSIMA_MS = 90_000 // il server gratuito può metterci un minuto a svegliarsi
export const LUNGHEZZA_MASSIMA = 1000

export class ErroreChat extends Error {}

/** Stato della conversazione che il server restituisce a ogni risposta e che noi gli rimandiamo. */
export const CONTESTO_VUOTO = { storia: [], riassunto: '' }

/** Identificativo di una nuova conversazione. Resta solo in memoria: niente localStorage. */
export function nuovaSessione() {
  return crypto.randomUUID()
}

/**
 * Manda un messaggio al server e restituisce { testo, contesto }: la risposta e lo stato
 * aggiornato della conversazione, da rimandare con il messaggio successivo (il server
 * non ricorda nulla tra una richiesta e l'altra).
 * In caso di problemi lancia un ErroreChat con un messaggio da mostrare al cliente.
 */
export async function inviaMessaggio(
  sessione,
  messaggio,
  contesto = CONTESTO_VUOTO,
  { url = URL_CHAT, fetchFn = fetch } = {},
) {
  const controllo = new AbortController()
  const timer = setTimeout(() => controllo.abort(), ATTESA_MASSIMA_MS)

  let risposta
  try {
    risposta = await fetchFn(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: sessione, messaggio, ...contesto }),
      signal: controllo.signal,
    })
  } catch {
    throw new ErroreChat("Non riesco a contattare l'assistente. Controlla la connessione e riprova.")
  } finally {
    clearTimeout(timer)
  }

  if (risposta.status === 429) {
    throw new ErroreChat('Hai scritto troppi messaggi in poco tempo. Riprova fra qualche minuto.')
  }
  if (!risposta.ok) {
    throw new ErroreChat("L'assistente non è disponibile in questo momento. Riprova fra poco.")
  }

  let dati
  try {
    dati = await risposta.json()
  } catch {
    throw new ErroreChat("L'assistente ha dato una risposta che non riesco a leggere. Riprova.")
  }
  const testo = typeof dati?.risposta === 'string' ? dati.risposta.trim() : ''
  if (testo === '') {
    throw new ErroreChat("L'assistente non ha dato nessuna risposta. Riprova.")
  }
  // un server che ricorda da solo (modalità locale) non manda lo stato: teniamo il nostro
  const nuovoContesto = {
    storia: Array.isArray(dati.storia) ? dati.storia : contesto.storia,
    riassunto: typeof dati.riassunto === 'string' ? dati.riassunto : contesto.riassunto,
  }
  return { testo, contesto: nuovoContesto }
}
