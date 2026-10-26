import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import {
  calcolaPreventivo,
  formattaEuro,
  formattaMq,
  validaListino,
  validaMisura,
} from './preventivo.js'

// I test usano lo stesso listino dell'app: nessun prezzo duplicato qui.
const listino = JSON.parse(readFileSync(new URL('../../public/listino.json', import.meta.url), 'utf8'))
const limiti = listino.misure

// "1.234,56 €" con lo spazio non separabile che usa Intl
const euro = (s) => s.replace(' ', ' ')

function preventivo(caso) {
  const misure = {}
  for (const [campo, etichetta] of [
    ['larghezza', 'la larghezza'],
    ['altezza', "l'altezza"],
    ['profondita', 'la profondità'],
  ]) {
    const esito = validaMisura(caso[campo], etichetta, limiti)
    if (esito.errore) return { errore: esito.errore }
    misure[campo] = esito.valore
  }
  return calcolaPreventivo({ ...caso, ...misure }, listino)
}

describe('listino.json', () => {
  it('è valido', () => {
    expect(validaListino(listino)).toEqual([])
  })

  it('segnala un prezzo negativo o mancante', () => {
    const rotto = structuredClone(listino)
    rotto.legni[0].prezzoMq = -5
    delete rotto.consegne[0].costo
    expect(validaListino(rotto)).toHaveLength(2)
  })
})

describe('casi di accettazione (foglio Casi_di_prova)', () => {
  const casi = [
    ['C1', { larghezza: '120', altezza: '80', profondita: '40', legno: 'Rovere', finitura: 'Cera naturale', consegna: 'Entro 50 km' }, '3,52', '735,84 €', '161,88 €', '897,72 €'],
    ['C2', { larghezza: '200', altezza: '100', profondita: '50', legno: 'Abete', finitura: 'Grezzo', consegna: 'Ritiro in sede' }, '7,00', '595,00 €', '130,90 €', '725,90 €'],
    ['C3', { larghezza: '90', altezza: '180', profondita: '35', legno: 'Noce', finitura: 'Laccato', consegna: 'Oltre 50 km' }, '5,13', '1.530,75 €', '336,77 €', '1.867,52 €'],
    ['C4', { larghezza: '150', altezza: '75', profondita: '60', legno: 'Castagno', finitura: 'Verniciato opaco', consegna: 'Entro 50 km' }, '4,95', '941,10 €', '207,04 €', '1.148,14 €'],
  ]

  it.each(casi)('%s', (_id, caso, mq, imponibile, iva, totale) => {
    const r = preventivo(caso)
    expect(formattaMq(r.superficieMq)).toBe(mq)
    expect(formattaEuro(r.imponibileCent)).toBe(euro(imponibile))
    expect(formattaEuro(r.ivaCent)).toBe(euro(iva))
    expect(formattaEuro(r.totaleCent)).toBe(euro(totale))
    expect(r.imponibileCent + r.ivaCent).toBe(r.totaleCent)
  })

  it('C5: larghezza 20 cm → errore, nessun prezzo', () => {
    const r = preventivo({ larghezza: '20', altezza: '80', profondita: '40', legno: 'Pino', finitura: 'Cera naturale', consegna: 'Ritiro in sede' })
    expect(r.errore).toBe('La larghezza deve essere tra 30 e 300 cm.')
    expect(r.totaleCent).toBeUndefined()
  })
})

describe('validaMisura', () => {
  it.each([
    ['', 'Inserisci la larghezza.'],
    ['   ', 'Inserisci la larghezza.'],
    ['abc', 'La larghezza deve essere un numero in centimetri (es. 120 o 120,5).'],
    ['12cm', 'La larghezza deve essere un numero in centimetri (es. 120 o 120,5).'],
    ['-50', 'La larghezza deve essere maggiore di zero.'],
    ['0', 'La larghezza deve essere maggiore di zero.'],
    ['2000', 'La larghezza deve essere tra 30 e 300 cm.'],
    ['29,9', 'La larghezza deve essere tra 30 e 300 cm.'],
  ])('"%s" → errore', (testo, errore) => {
    expect(validaMisura(testo, 'la larghezza', limiti)).toEqual({ errore })
  })

  it("usa l'articolo giusto: L'altezza", () => {
    expect(validaMisura('500', "l'altezza", limiti)).toEqual({ errore: "L'altezza deve essere tra 30 e 300 cm." })
  })

  it.each([
    ['30', 30],
    ['300', 300],
    ['120,5', 120.5],
    ['120.5', 120.5],
    [' 80 ', 80],
  ])('"%s" → %s', (testo, valore) => {
    expect(validaMisura(testo, 'la larghezza', limiti)).toEqual({ valore })
  })
})

describe('formattazione', () => {
  it('usa il separatore delle migliaia anche a 4 cifre', () => {
    expect(formattaEuro(123456)).toBe(euro('1.234,56 €'))
  })
})

describe('prezzi dal file di dati', () => {
  it('se cambia il prezzo nel listino cambia il preventivo', () => {
    const aumentato = structuredClone(listino)
    aumentato.legni.find((l) => l.nome === 'Abete').prezzoMq += 10
    const caso = { larghezza: 200, altezza: 100, profondita: 50, legno: 'Abete', finitura: 'Grezzo', consegna: 'Ritiro in sede' }
    const prima = calcolaPreventivo(caso, listino)
    const dopo = calcolaPreventivo(caso, aumentato)
    expect(dopo.imponibileCent - prima.imponibileCent).toBe(7 * 10 * 100) // 7 m² × 10 €
  })
})
