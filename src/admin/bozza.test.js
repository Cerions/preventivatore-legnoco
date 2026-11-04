import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { serializzaListino } from '../lib/listino.js'
import { bozzaInListino, differenze, listinoInBozza } from './bozza.js'

const testoFile = readFileSync(new URL('../../public/listino.json', import.meta.url), 'utf8')
const listino = JSON.parse(testoFile)

describe('serializzaListino', () => {
  it('riscrive il listino identico al file attuale', () => {
    expect(serializzaListino(listino)).toBe(testoFile)
  })

  it('produce JSON valido', () => {
    expect(JSON.parse(serializzaListino(listino))).toEqual(listino)
  })
})

describe('bozza del modulo admin', () => {
  it('andata e ritorno senza perdite', () => {
    const { listino: ritorno, problemi } = bozzaInListino(listinoInBozza(listino))
    expect(problemi).toEqual([])
    expect(ritorno).toEqual(listino)
  })

  it('accetta la virgola decimale e converte l\'IVA da percentuale', () => {
    const b = listinoInBozza(listino)
    b.iva = '10'
    b.legni[0].prezzoMq = '92,50'
    const { listino: nuovo } = bozzaInListino(b)
    expect(nuovo.aliquotaIva).toBe(0.1)
    expect(nuovo.legni[0].prezzoMq).toBe(92.5)
  })

  it('blocca testi non numerici e prezzi mancanti', () => {
    const b = listinoInBozza(listino)
    b.legni[1].prezzoMq = 'novanta'
    b.consegne.push({ nome: 'Isole', costo: '' })
    const { listino: nuovo, problemi } = bozzaInListino(b)
    expect(nuovo).toBeNull()
    expect(problemi).toHaveLength(2)
  })

  it('blocca nomi doppi e limiti incoerenti', () => {
    const b = listinoInBozza(listino)
    b.legni[1].nome = 'Abete'
    b.minimaCm = '400'
    const { listino: nuovo, problemi } = bozzaInListino(b)
    expect(nuovo).toBeNull()
    expect(problemi.length).toBeGreaterThanOrEqual(2)
  })
})

describe('differenze', () => {
  it('elenca le modifiche in modo leggibile', () => {
    const b = listinoInBozza(listino)
    b.legni[0].prezzoMq = '95'
    b.iva = '10'
    b.consegne = b.consegne.filter((c) => c.nome !== 'Oltre 50 km')
    b.finiture.push({ nome: 'Olio', supplementoMq: '15', lucidita: 0.3 })
    const righe = differenze(listino, bozzaInListino(b).listino)
    expect(righe).toEqual([
      'IVA: 22% → 10%',
      'Legno "Abete": 85,00 € → 95,00 €/m²',
      'Finitura "Olio" aggiunta: 15,00 €/m²',
      'Consegna "Oltre 50 km" tolta',
    ])
  })

  it('nessuna modifica → elenco vuoto', () => {
    expect(differenze(listino, structuredClone(listino))).toEqual([])
  })
})
