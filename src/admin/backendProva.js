// Solo in sviluppo (npm run dev, indirizzo /admin?prova): simula GitHub in memoria
// per provare la pagina admin senza account. Non finisce mai nella build di produzione.

let memoria = null
let versione = 1

export async function accedi() {
  return 'token-di-prova'
}

export async function utente() {
  return { login: 'prova-locale' }
}

export async function leggi() {
  if (memoria === null) {
    memoria = await (await fetch('/listino.json', { cache: 'no-store' })).text()
  }
  return { testo: memoria, sha: `prova-${versione}` }
}

export async function salva(_token, testo, sha, messaggio) {
  if (sha !== `prova-${versione}`) {
    throw new Error('Il listino è stato modificato da qualcun altro nel frattempo. Ricarica la pagina e rifai le modifiche.')
  }
  memoria = testo
  versione += 1
  console.info('[admin di prova] commit:', messaggio)
  return { sha: `prova-${versione}` }
}
