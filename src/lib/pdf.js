// Genera il PDF del preventivo interamente nel browser: nessun dato parte dal dispositivo.
// jsPDF viene caricato solo al primo clic su "Scarica PDF".

import { formattaEuro, formattaMq } from './preventivo.js'

const GRAFITE = [35, 39, 43]
const INCHIOSTRO = [35, 39, 43]
const TENUE = [91, 97, 104]
const RIGA = [220, 216, 208]
const BANCO = [236, 230, 218]
const METRO = [243, 195, 25]

// I font standard del PDF non hanno lo spazio "stretto" di Intl né il simbolo ²
const pulisci = (testo) =>
  String(testo)
    .replace(/[\u00a0\u202f]/g, ' ')
    .replace(/m²/g, 'mq')

const formatoData = new Intl.DateTimeFormat('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })

/** Codice leggibile del preventivo, ricavato da data e ora (nessun archivio). */
export function codicePreventivo(data) {
  const due = (n) => String(n).padStart(2, '0')
  return `LC-${data.getFullYear()}${due(data.getMonth() + 1)}${due(data.getDate())}-${due(data.getHours())}${due(data.getMinutes())}`
}

export function nomeFilePdf(data) {
  const due = (n) => String(n).padStart(2, '0')
  return `preventivo-legnoco-${data.getFullYear()}-${due(data.getMonth() + 1)}-${due(data.getDate())}.pdf`
}

/**
 * @param {object} p
 * @param {object} p.preventivo risultato di calcolaPreventivo
 * @param {{larghezza:number, altezza:number, profondita:number}} p.misure in cm
 * @param {{legno:string, finitura:string, consegna:string}} p.scelte
 * @param {{dati:string, larghezza:number, altezza:number} | null} p.immagine istantanea del 3D
 * @param {string} [p.sito] indirizzo del sito, mostrato a piè di pagina
 */
export async function scaricaPdf({ preventivo, misure, scelte, immagine, sito }) {
  const { jsPDF } = await import('jspdf')
  const ora = new Date()
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const W = 210
  const M = 18 // margine
  let y = 0

  doc.setProperties({ title: 'Preventivo Legno & Co.', creator: 'Preventivatore Legno & Co.' })

  // Testata
  doc.setFillColor(...GRAFITE)
  doc.rect(0, 0, W, 38, 'F')
  doc.setFillColor(...METRO)
  doc.rect(0, 38, W, 2.2, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(22)
  doc.text('Legno & Co.', M, 18)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10.5)
  doc.text('Mobili su misura', M, 26)
  doc.setFontSize(10)
  doc.text(pulisci(`Preventivo ${codicePreventivo(ora)}`), W - M, 18, { align: 'right' })
  doc.text(pulisci(formatoData.format(ora)), W - M, 26, { align: 'right' })

  y = 54
  doc.setTextColor(...INCHIOSTRO)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(17)
  doc.text('Il tuo mobile', M, y)

  // Immagine 3D a destra, dati a sinistra
  const colonnaDati = 92
  let fondoImmagine = y
  if (immagine?.dati) {
    const maxW = W - M - (M + colonnaDati + 6)
    const maxH = 70
    const rapporto = immagine.larghezza / immagine.altezza
    let iw = maxW
    let ih = iw / rapporto
    if (ih > maxH) {
      ih = maxH
      iw = ih * rapporto
    }
    const ix = W - M - iw
    doc.setFillColor(...BANCO)
    doc.roundedRect(ix - 2, y - 6, iw + 4, ih + 4, 2, 2, 'F')
    doc.addImage(immagine.dati, 'PNG', ix, y - 4, iw, ih)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(...TENUE)
    doc.text('Anteprima indicativa', ix + iw / 2, y + ih + 4, { align: 'center' })
    fondoImmagine = y + ih + 4
  }

  const righeMobile = [
    ['Misure (L × A × P)', `${formattaNumero(misure.larghezza)} × ${formattaNumero(misure.altezza)} × ${formattaNumero(misure.profondita)} cm`],
    ['Legno', scelte.legno],
    ['Finitura', scelte.finitura],
    ['Consegna', scelte.consegna],
    ['Superficie totale', `${formattaMq(preventivo.superficieMq)} m²`],
  ]
  y += 10
  doc.setFontSize(10.5)
  for (const [etichetta, valore] of righeMobile) {
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...TENUE)
    doc.text(pulisci(etichetta), M, y)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...INCHIOSTRO)
    doc.text(pulisci(valore), M + colonnaDati, y, { align: 'right' })
    doc.setDrawColor(...RIGA)
    doc.setLineWidth(0.2)
    doc.line(M, y + 3, M + colonnaDati, y + 3)
    y += 10
  }

  // Importi
  y = Math.max(y, fondoImmagine) + 12
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(17)
  doc.setTextColor(...INCHIOSTRO)
  doc.text('Importi', M, y)
  y += 10

  const righeImporti = [
    [`Mobile (${formattaMq(preventivo.superficieMq)} m² × ${formattaEuro(preventivo.prezzoMq * 100)}/m²)`, formattaEuro(preventivo.mobileCent), false],
    ['Consegna', formattaEuro(preventivo.consegnaCent), false],
    ['Imponibile (IVA esclusa)', formattaEuro(preventivo.imponibileCent), true],
    [`IVA ${Math.round(preventivo.aliquotaIva * 100)}%`, formattaEuro(preventivo.ivaCent), false],
  ]
  doc.setFontSize(11)
  for (const [etichetta, valore, forte] of righeImporti) {
    doc.setFont('helvetica', forte ? 'bold' : 'normal')
    doc.setTextColor(...(forte ? INCHIOSTRO : TENUE))
    doc.text(pulisci(etichetta), M, y)
    doc.setTextColor(...INCHIOSTRO)
    doc.text(pulisci(valore), W - M, y, { align: 'right' })
    doc.setDrawColor(...RIGA)
    doc.line(M, y + 3.5, W - M, y + 3.5)
    y += 11
  }

  // Totale
  y += 2
  doc.setFillColor(...GRAFITE)
  doc.roundedRect(M, y - 7, W - 2 * M, 18, 2, 2, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(12)
  doc.text('Totale IVA inclusa', M + 6, y + 4)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(19)
  doc.setTextColor(...METRO)
  doc.text(pulisci(formattaEuro(preventivo.totaleCent)), W - M - 6, y + 4.5, { align: 'right' })

  // Note
  y += 26
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor(...TENUE)
  const note = [
    `Calcolato con il listino in vigore il ${formatoData.format(ora)}. Prezzo al m² riferito alla superficie totale del mobile, tutti i lati inclusi.`,
    `L'IVA è calcolata su mobile e consegna. L'anteprima 3D è indicativa.`,
    sito ? `Generato su ${sito}. I dati inseriti non vengono salvati né inviati.` : 'I dati inseriti non vengono salvati né inviati.',
  ]
  for (const nota of note) {
    const righe = doc.splitTextToSize(pulisci(nota), W - 2 * M)
    doc.text(righe, M, y)
    y += righe.length * 4.2
  }

  doc.save(nomeFilePdf(ora))
}

const formatoNumero = new Intl.NumberFormat('it-IT', { maximumFractionDigits: 1 })
function formattaNumero(n) {
  return formatoNumero.format(n)
}
