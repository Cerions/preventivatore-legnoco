// Login con GitHub (tramite il provider OAuth di Netlify) e lettura/scrittura
// di listino.json con le API di GitHub. Il token resta solo in memoria.

import { CONFIG_ADMIN } from './config.js'

const NETLIFY_API = 'https://api.netlify.com'
const GITHUB_API = 'https://api.github.com'

function idSito() {
  const host = window.location.hostname
  return host === 'localhost' || host === '127.0.0.1' ? CONFIG_ADMIN.sitoNetlify : window.location.host
}

/**
 * Apre la finestra di accesso GitHub gestita da Netlify e restituisce il token.
 * Protocollo: Netlify invia "authorizing:github", noi rispondiamo con lo stesso messaggio,
 * poi arriva "authorization:github:success:{json}" oppure ":error:{json}".
 */
export function accedi() {
  return new Promise((resolve, reject) => {
    const url = `${NETLIFY_API}/auth?provider=github&site_id=${encodeURIComponent(idSito())}&scope=${encodeURIComponent(CONFIG_ADMIN.scope)}`
    const w = 960
    const h = 640
    const finestra = window.open(
      url,
      'accesso-github',
      `width=${w},height=${h},left=${(window.screen.width - w) / 2},top=${(window.screen.height - h) / 2}`,
    )
    if (!finestra) {
      reject(new Error('Il browser ha bloccato la finestra di accesso. Consenti le finestre popup per questo sito e riprova.'))
      return
    }

    const OK = 'authorization:github:success:'
    const KO = 'authorization:github:error:'
    let finito = false
    const chiudi = () => {
      finito = true
      window.removeEventListener('message', suMessaggio)
      clearInterval(controllo)
    }
    function suMessaggio(e) {
      if (e.origin !== NETLIFY_API || typeof e.data !== 'string') return
      if (e.data === 'authorizing:github') {
        finestra.postMessage(e.data, e.origin)
      } else if (e.data.startsWith(OK)) {
        chiudi()
        finestra.close()
        resolve(JSON.parse(e.data.slice(OK.length)).token)
      } else if (e.data.startsWith(KO)) {
        chiudi()
        finestra.close()
        reject(new Error('GitHub ha rifiutato l\'accesso. Riprova, oppure controlla la configurazione OAuth su Netlify.'))
      }
    }
    const controllo = setInterval(() => {
      if (!finito && finestra.closed) {
        chiudi()
        reject(new Error('Accesso annullato: la finestra è stata chiusa.'))
      }
    }, 600)
    window.addEventListener('message', suMessaggio)
  })
}

async function chiamaGitHub(token, percorso, opzioni = {}) {
  let risposta
  try {
    risposta = await fetch(`${GITHUB_API}${percorso}`, {
      ...opzioni,
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${token}`,
        'X-GitHub-Api-Version': '2022-11-28',
        ...(opzioni.body ? { 'Content-Type': 'application/json' } : {}),
      },
      cache: 'no-store',
    })
  } catch {
    throw new Error('GitHub non risponde. Controlla la connessione e riprova.')
  }
  if (risposta.ok) return risposta.json()

  const messaggi = {
    401: 'Sessione scaduta: esci e accedi di nuovo.',
    403: 'Questo account GitHub non ha il permesso di modificare il listino.',
    404: 'Listino non trovato, oppure questo account GitHub non ha accesso al repository.',
    409: 'Il listino è stato modificato da qualcun altro nel frattempo. Ricarica la pagina e rifai le modifiche.',
    422: 'Il listino è stato modificato da qualcun altro nel frattempo. Ricarica la pagina e rifai le modifiche.',
  }
  throw new Error(messaggi[risposta.status] ?? `GitHub ha risposto con un errore (${risposta.status}).`)
}

const daBase64 = (b64) =>
  new TextDecoder().decode(Uint8Array.from(atob(b64.replace(/\s/g, '')), (c) => c.charCodeAt(0)))

function inBase64(testo) {
  let binario = ''
  new TextEncoder().encode(testo).forEach((b) => {
    binario += String.fromCharCode(b)
  })
  return btoa(binario)
}

export async function utente(token) {
  const dati = await chiamaGitHub(token, '/user')
  return { login: dati.login }
}

const percorsoFile = () =>
  `/repos/${CONFIG_ADMIN.repository}/contents/${CONFIG_ADMIN.percorso}`

/** @returns {Promise<{ testo: string, sha: string }>} */
export async function leggi(token) {
  const dati = await chiamaGitHub(token, `${percorsoFile()}?ref=${encodeURIComponent(CONFIG_ADMIN.ramo)}`)
  return { testo: daBase64(dati.content), sha: dati.sha }
}

/** Salva il file con un commit sul ramo pubblicato. @returns {Promise<{ sha: string }>} */
export async function salva(token, testo, sha, messaggio) {
  const dati = await chiamaGitHub(token, percorsoFile(), {
    method: 'PUT',
    body: JSON.stringify({ message: messaggio, content: inBase64(testo), sha, branch: CONFIG_ADMIN.ramo }),
  })
  return { sha: dati.content.sha }
}
