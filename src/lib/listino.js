import { validaListino } from './preventivo.js'

export const URL_LISTINO = `${import.meta.env.BASE_URL}listino.json`

/** Scarica e controlla il listino. Restituisce sempre uno stato, mai un'eccezione. */
export async function caricaListino() {
  let risposta
  try {
    risposta = await fetch(URL_LISTINO, { cache: 'no-store' })
  } catch {
    return { fase: 'errore', dettagli: ['Non è stato possibile caricare il listino (rete assente?).'] }
  }
  if (!risposta.ok) {
    return { fase: 'errore', dettagli: [`Il file del listino non è stato trovato (errore ${risposta.status}).`] }
  }
  let dati
  try {
    dati = await risposta.json()
  } catch {
    return { fase: 'errore', dettagli: ['Il file del listino contiene un errore di scrittura (JSON non valido).'] }
  }
  const problemi = validaListino(dati)
  if (problemi.length > 0) return { fase: 'errore', dettagli: problemi }
  return { fase: 'pronto', listino: dati }
}

/**
 * Scrive il listino come JSON leggibile: una riga per voce, così chi lo apre su GitHub
 * lo modifica senza perdersi tra parentesi.
 */
export function serializzaListino(listino) {
  const voce = (o) =>
    `{ ${Object.entries(o)
      .map(([k, v]) => `${JSON.stringify(k)}: ${JSON.stringify(v)}`)
      .join(', ')} }`
  const elenco = (nome, voci) => `  ${JSON.stringify(nome)}: [\n${voci.map((v) => `    ${voce(v)}`).join(',\n')}\n  ]`
  return [
    '{',
    `  "aliquotaIva": ${JSON.stringify(listino.aliquotaIva)},`,
    '  "misure": {',
    `    "minimaCm": ${JSON.stringify(listino.misure.minimaCm)},`,
    `    "massimaCm": ${JSON.stringify(listino.misure.massimaCm)}`,
    '  },',
    `${elenco('legni', listino.legni)},`,
    `${elenco('finiture', listino.finiture)},`,
    elenco('consegne', listino.consegne),
    '}',
    '',
  ].join('\n')
}
