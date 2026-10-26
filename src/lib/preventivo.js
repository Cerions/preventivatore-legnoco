// Logica pura del preventivatore: nessun prezzo è scritto qui.
// Tutti i valori arrivano dal listino (public/listino.json).

const formatoEuro = new Intl.NumberFormat('it-IT', {
  style: 'currency',
  currency: 'EUR',
  useGrouping: 'always', // senza questo l'italiano scrive "1234,56 €"
})

const formatoMq = new Intl.NumberFormat('it-IT', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
  useGrouping: 'always',
})

/** Formatta un importo espresso in centesimi interi: 186752 → "1.867,52 €" */
export function formattaEuro(centesimi) {
  return formatoEuro.format(centesimi / 100)
}

/** Formatta i metri quadri con due decimali: 5.13 → "5,13" */
export function formattaMq(mq) {
  return formatoMq.format(mq)
}

const NUMERO = /^-?\d+([.,]\d+)?$/

function eNumeroValido(n) {
  return typeof n === 'number' && Number.isFinite(n)
}

/**
 * Controlla che il listino sia completo e sensato.
 * Restituisce un elenco di problemi in italiano (vuoto se è tutto a posto).
 */
export function validaListino(listino) {
  const problemi = []
  if (!listino || typeof listino !== 'object') {
    return ['Il file del listino è vuoto o non leggibile.']
  }

  const { aliquotaIva, misure, legni, finiture, consegne } = listino

  if (!eNumeroValido(aliquotaIva) || aliquotaIva < 0 || aliquotaIva >= 1) {
    problemi.push('"aliquotaIva" deve essere un numero tra 0 e 1 (es. 0.22 per il 22%).')
  }

  if (!misure || !eNumeroValido(misure.minimaCm) || !eNumeroValido(misure.massimaCm)) {
    problemi.push('"misure" deve contenere "minimaCm" e "massimaCm" numerici.')
  } else if (misure.minimaCm <= 0 || misure.minimaCm >= misure.massimaCm) {
    problemi.push('"minimaCm" deve essere maggiore di zero e minore di "massimaCm".')
  }

  const elenchi = [
    ['legni', legni, 'prezzoMq'],
    ['finiture', finiture, 'supplementoMq'],
    ['consegne', consegne, 'costo'],
  ]
  for (const [nomeElenco, elenco, campo] of elenchi) {
    if (!Array.isArray(elenco) || elenco.length === 0) {
      problemi.push(`"${nomeElenco}" deve contenere almeno una voce.`)
      continue
    }
    const nomiVisti = new Set()
    elenco.forEach((voce, i) => {
      const nome = typeof voce?.nome === 'string' ? voce.nome.trim() : ''
      if (!nome) problemi.push(`In "${nomeElenco}" la voce n. ${i + 1} non ha un nome.`)
      else if (nomiVisti.has(nome)) problemi.push(`In "${nomeElenco}" la voce "${nome}" compare due volte.`)
      nomiVisti.add(nome)
      if (!eNumeroValido(voce?.[campo]) || voce[campo] < 0) {
        problemi.push(`In "${nomeElenco}" la voce "${nome || i + 1}" ha "${campo}" non valido (serve un numero ≥ 0).`)
      }
    })
  }

  return problemi
}

/**
 * Valida una misura scritta dal cliente.
 * @returns {{ valore: number } | { errore: string }}
 */
export function validaMisura(testo, etichetta, { minimaCm, massimaCm }) {
  const pulito = String(testo ?? '').trim()
  if (pulito === '') {
    return { errore: `Inserisci la ${etichetta}.` }
  }
  if (!NUMERO.test(pulito)) {
    return { errore: `La ${etichetta} deve essere un numero in centimetri (es. 120 o 120,5).` }
  }
  const valore = Number(pulito.replace(',', '.'))
  if (valore <= 0) {
    return { errore: `La ${etichetta} deve essere maggiore di zero.` }
  }
  if (valore < minimaCm || valore > massimaCm) {
    return {
      errore: `La ${etichetta} deve essere tra ${minimaCm} e ${massimaCm} cm.`,
    }
  }
  return { valore }
}

/** Arrotonda al centesimo eliminando prima il rumore dei numeri in virgola mobile. */
function aCentesimi(euroPerCento) {
  return Math.round(Number(euroPerCento.toFixed(6)))
}

/**
 * Calcola il preventivo. Le misure devono essere già validate.
 * Tutti gli importi restituiti sono in centesimi interi.
 */
export function calcolaPreventivo({ larghezza, altezza, profondita, legno, finitura, consegna }, listino) {
  const voceLegno = listino.legni.find((v) => v.nome === legno)
  const voceFinitura = listino.finiture.find((v) => v.nome === finitura)
  const voceConsegna = listino.consegne.find((v) => v.nome === consegna)
  if (!voceLegno || !voceFinitura || !voceConsegna) {
    throw new Error('Voce non presente nel listino.')
  }

  // Superficie totale del mobile: tutte e 6 le facce, in cm²
  const superficieCm2 = 2 * (larghezza * altezza + larghezza * profondita + altezza * profondita)
  const superficieMq = superficieCm2 / 10000

  const prezzoMq = voceLegno.prezzoMq + voceFinitura.supplementoMq
  // cm² × €/m² / 10000 = €  →  × 100 = centesimi  →  cm² × €/m² / 100
  const mobileCent = aCentesimi((superficieCm2 * prezzoMq) / 100)
  const consegnaCent = aCentesimi(voceConsegna.costo * 100)
  const imponibileCent = mobileCent + consegnaCent

  // Aliquota in punti base (0.22 → 2200) per restare su numeri interi
  const aliquotaBp = Math.round(listino.aliquotaIva * 10000)
  const ivaCent = Math.round((imponibileCent * aliquotaBp) / 10000)
  const totaleCent = imponibileCent + ivaCent

  return {
    superficieMq,
    prezzoMq,
    mobileCent,
    consegnaCent,
    imponibileCent,
    ivaCent,
    totaleCent,
    aliquotaIva: listino.aliquotaIva,
  }
}
