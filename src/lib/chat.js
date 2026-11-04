// Chat con l'assistente (facoltativa). Indirizzo del server in VITE_CHAT_URL:
// se manca, la chat non compare. Non è un segreto, è un indirizzo pubblico.
export const URL_CHAT = (import.meta.env.VITE_CHAT_URL ?? '').trim()
export const chatDisponibile = URL_CHAT !== ''

const ATTESA_MASSIMA_MS = 90_000 // il server gratuito può metterci un minuto a svegliarsi
export const LUNGHEZZA_MASSIMA = 1000

export class ErroreChat extends Error {}

/** Identificativo di una nuova conversazione. Resta solo in memoria: niente localStorage. */
export function nuovaSessione() {
  return crypto.randomUUID()
}

/**
 * Manda un messaggio al server e restituisce il testo della risposta.
 * In caso di problemi lancia un ErroreChat con un messaggio da mostrare al cliente.
 */
export async function inviaMessaggio(sessione, messaggio, { url = URL_CHAT, fetchFn = fetch } = {}) {
  const controllo = new AbortController()
  const timer = setTimeout(() => controllo.abort(), ATTESA_MASSIMA_MS)

  let risposta
  try {
    risposta = await fetchFn(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: sessione, messaggio }),
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
  return testo
}
