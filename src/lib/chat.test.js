import { describe, expect, it, vi } from 'vitest'
import { CONTESTO_VUOTO, ErroreChat, inviaMessaggio, nuovaSessione } from './chat.js'

const URL_PROVA = 'http://localhost:8000/chat'

const rispostaFinta = (stato, corpo) => ({
  ok: stato >= 200 && stato < 300,
  status: stato,
  json: async () => {
    if (corpo === undefined) throw new Error('JSON non valido')
    return corpo
  },
})

describe('inviaMessaggio', () => {
  it('manda sessione e messaggio e restituisce la risposta', async () => {
    const fetchFn = vi.fn().mockResolvedValue(rispostaFinta(200, { risposta: ' Il rovere costa 180,00 €. ' }))
    const { testo } = await inviaMessaggio('sessione-123', 'Quanto costa il rovere?', CONTESTO_VUOTO, { url: URL_PROVA, fetchFn })

    expect(testo).toBe('Il rovere costa 180,00 €.')
    expect(fetchFn).toHaveBeenCalledTimes(1)
    const [url, opzioni] = fetchFn.mock.calls[0]
    expect(url).toBe(URL_PROVA)
    expect(opzioni.method).toBe('POST')
    expect(JSON.parse(opzioni.body)).toEqual({
      session_id: 'sessione-123',
      messaggio: 'Quanto costa il rovere?',
      storia: [],
      riassunto: '',
    })
  })

  it('con troppi messaggi (429) spiega di riprovare più tardi', async () => {
    const fetchFn = vi.fn().mockResolvedValue(rispostaFinta(429, { detail: 'x' }))
    await expect(inviaMessaggio('s', 'ciao', CONTESTO_VUOTO, { url: URL_PROVA, fetchFn })).rejects.toThrow(/troppi messaggi/)
  })

  it('con un errore del server (502) lancia un ErroreChat', async () => {
    const fetchFn = vi.fn().mockResolvedValue(rispostaFinta(502, { detail: 'x' }))
    const prova = inviaMessaggio('s', 'ciao', CONTESTO_VUOTO, { url: URL_PROVA, fetchFn })
    await expect(prova).rejects.toBeInstanceOf(ErroreChat)
    await expect(prova).rejects.toThrow(/non è disponibile/)
  })

  it('senza rete lancia un ErroreChat', async () => {
    const fetchFn = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'))
    await expect(inviaMessaggio('s', 'ciao', CONTESTO_VUOTO, { url: URL_PROVA, fetchFn })).rejects.toThrow(/contattare/)
  })

  it('con una risposta vuota o non leggibile lancia un ErroreChat', async () => {
    const vuota = vi.fn().mockResolvedValue(rispostaFinta(200, { risposta: '   ' }))
    await expect(inviaMessaggio('s', 'ciao', CONTESTO_VUOTO, { url: URL_PROVA, fetchFn: vuota })).rejects.toBeInstanceOf(ErroreChat)

    const rotta = vi.fn().mockResolvedValue(rispostaFinta(200, undefined))
    await expect(inviaMessaggio('s', 'ciao', CONTESTO_VUOTO, { url: URL_PROVA, fetchFn: rotta })).rejects.toThrow(/leggere/)
  })
})

describe('stato della conversazione', () => {
  const storia = [
    { role: 'user', content: 'Ciao' },
    { role: 'assistant', content: 'Buongiorno' },
  ]

  it('rimanda al server la storia e il riassunto ricevuti', async () => {
    const fetchFn = vi.fn().mockResolvedValue(
      rispostaFinta(200, { risposta: 'Ok', storia, riassunto: 'Cliente Giulia.' }),
    )
    const primo = await inviaMessaggio('s', 'Ciao', CONTESTO_VUOTO, { url: URL_PROVA, fetchFn })
    expect(primo.contesto).toEqual({ storia, riassunto: 'Cliente Giulia.' })

    await inviaMessaggio('s', 'E l\u2019abete?', primo.contesto, { url: URL_PROVA, fetchFn })
    const corpo = JSON.parse(fetchFn.mock.calls[1][1].body)
    expect(corpo.storia).toEqual(storia)
    expect(corpo.riassunto).toBe('Cliente Giulia.')
  })

  it('se il server non manda lo stato (modalità locale) tiene quello che aveva', async () => {
    const fetchFn = vi.fn().mockResolvedValue(rispostaFinta(200, { risposta: 'Ok' }))
    const { contesto } = await inviaMessaggio('s', 'Ciao', { storia, riassunto: 'x' }, { url: URL_PROVA, fetchFn })
    expect(contesto).toEqual({ storia, riassunto: 'x' })
  })
})

describe('nuovaSessione', () => {
  it('dà identificativi diversi e abbastanza lunghi per il server', () => {
    const a = nuovaSessione()
    const b = nuovaSessione()
    expect(a).not.toBe(b)
    expect(a.length).toBeGreaterThanOrEqual(8)
    expect(a.length).toBeLessThanOrEqual(64)
  })
})
