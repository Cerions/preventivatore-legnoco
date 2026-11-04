// Conversione tra il listino (numeri) e la bozza del modulo admin (testi, così si può
// scrivere "85,50" con la virgola), più il riepilogo delle modifiche da pubblicare.

import { formattaEuro, validaListino } from '../lib/preventivo.js'

const NUMERO = /^\d+([.,]\d+)?$/
const testo = (n) => String(n).replace('.', ',')

export function listinoInBozza(listino) {
  return {
    iva: testo(Math.round(listino.aliquotaIva * 10000) / 100),
    minimaCm: testo(listino.misure.minimaCm),
    massimaCm: testo(listino.misure.massimaCm),
    legni: listino.legni.map((l) => ({ nome: l.nome, prezzoMq: testo(l.prezzoMq), colore: l.colore ?? '#B98A5C' })),
    finiture: listino.finiture.map((f) => ({ nome: f.nome, supplementoMq: testo(f.supplementoMq), lucidita: f.lucidita ?? 0.2 })),
    consegne: listino.consegne.map((c) => ({ nome: c.nome, costo: testo(c.costo) })),
  }
}

/**
 * @returns {{ listino: object | null, problemi: string[] }}
 *   problemi = errori di scrittura nei campi + errori di validazione del listino
 */
export function bozzaInListino(bozza) {
  const problemi = []
  const numero = (valore, descrizione) => {
    const pulito = String(valore ?? '').trim()
    if (!NUMERO.test(pulito)) {
      problemi.push(`${descrizione}: scrivi un numero (es. 85 oppure 85,50).`)
      return NaN
    }
    return Number(pulito.replace(',', '.'))
  }

  const iva = numero(bozza.iva, 'IVA')
  const listino = {
    aliquotaIva: Number((iva / 100).toFixed(4)),
    misure: {
      minimaCm: numero(bozza.minimaCm, 'Misura minima'),
      massimaCm: numero(bozza.massimaCm, 'Misura massima'),
    },
    legni: bozza.legni.map((l, i) => ({
      nome: l.nome.trim(),
      prezzoMq: numero(l.prezzoMq, `Prezzo del legno "${l.nome.trim() || i + 1}"`),
      colore: l.colore,
    })),
    finiture: bozza.finiture.map((f, i) => ({
      nome: f.nome.trim(),
      supplementoMq: numero(f.supplementoMq, `Supplemento della finitura "${f.nome.trim() || i + 1}"`),
      lucidita: Number(f.lucidita),
    })),
    consegne: bozza.consegne.map((c, i) => ({
      nome: c.nome.trim(),
      costo: numero(c.costo, `Costo della consegna "${c.nome.trim() || i + 1}"`),
    })),
  }

  if (problemi.length > 0) return { listino: null, problemi }
  const errori = validaListino(listino)
  return { listino: errori.length > 0 ? null : listino, problemi: errori }
}

const euro = (n) => formattaEuro(Math.round(n * 100))

/** Elenco leggibile delle differenze, usato sia a schermo sia come messaggio del commit. */
export function differenze(prima, dopo) {
  const righe = []
  if (prima.aliquotaIva !== dopo.aliquotaIva) {
    const pct = (a) => `${String(Math.round(a * 10000) / 100).replace('.', ',')}%`
    righe.push(`IVA: ${pct(prima.aliquotaIva)} → ${pct(dopo.aliquotaIva)}`)
  }
  if (prima.misure.minimaCm !== dopo.misure.minimaCm) {
    righe.push(`Misura minima: ${prima.misure.minimaCm} → ${dopo.misure.minimaCm} cm`)
  }
  if (prima.misure.massimaCm !== dopo.misure.massimaCm) {
    righe.push(`Misura massima: ${prima.misure.massimaCm} → ${dopo.misure.massimaCm} cm`)
  }

  const confronta = (nomeElenco, campo, unita, a, b, extra = [], f = false) => {
    const agg = f ? 'aggiunta' : 'aggiunto'
    const tolto = f ? 'tolta' : 'tolto'
    const perNome = (voci) => new Map(voci.map((v) => [v.nome, v]))
    const ma = perNome(a)
    const mb = perNome(b)
    for (const [nome, v] of mb) {
      const vecchia = ma.get(nome)
      if (!vecchia) {
        righe.push(`${nomeElenco} "${nome}" ${agg}: ${euro(v[campo])}${unita}`)
        continue
      }
      if (vecchia[campo] !== v[campo]) {
        righe.push(`${nomeElenco} "${nome}": ${euro(vecchia[campo])} → ${euro(v[campo])}${unita}`)
      }
      for (const [k, etichetta] of extra) {
        if (vecchia[k] !== v[k]) righe.push(`${nomeElenco} "${nome}": ${etichetta} modificat${etichetta === 'lucidità' ? 'a' : 'o'}`)
      }
    }
    for (const nome of ma.keys()) {
      if (!mb.has(nome)) righe.push(`${nomeElenco} "${nome}" ${tolto}`)
    }
    const ordineA = a.map((v) => v.nome).filter((n) => mb.has(n)).join('|')
    const ordineB = b.map((v) => v.nome).filter((n) => ma.has(n)).join('|')
    if (ordineA !== ordineB) righe.push(`${nomeElenco}: cambiato l'ordine`)
  }

  confronta('Legno', 'prezzoMq', '/m²', prima.legni, dopo.legni, [['colore', 'colore']])
  confronta('Finitura', 'supplementoMq', '/m²', prima.finiture, dopo.finiture, [['lucidita', 'lucidità']], true)
  confronta('Consegna', 'costo', '', prima.consegne, dopo.consegne, [], true)
  return righe.map((r) => r.replace(/[  ]/g, ' '))
}
