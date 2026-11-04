// Anteprima 3D del mobile: un parallelepipedo in scala con le misure vere,
// il colore del legno e la lucidità della finitura presi dal listino.
// Questo file (con three.js) viene caricato solo quando serve: vedi React.lazy in App.jsx.

import { useEffect, useImperativeHandle, useRef, useState } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

function webglDisponibile() {
  try {
    const c = document.createElement('canvas')
    return Boolean(c.getContext('webgl2') || c.getContext('webgl'))
  } catch {
    return false
  }
}

const CM = 0.01 // 1 cm in metri (unità della scena)
const DENSITA_VENATURA = 0.6 // una "piastrella" di venatura ogni 60 cm

/** Disegna su un canvas una venatura del legno partendo dal colore base. */
function creaTextureLegno(colore) {
  const lato = 512
  const canvas = document.createElement('canvas')
  canvas.width = lato
  canvas.height = lato
  const ctx = canvas.getContext('2d')
  const base = new THREE.Color(colore)

  ctx.fillStyle = base.getStyle()
  ctx.fillRect(0, 0, lato, lato)

  // Generatore pseudo-casuale con seme fisso: la venatura è sempre la stessa
  let seme = 7
  const caso = () => {
    seme = (seme * 16807) % 2147483647
    return seme / 2147483647
  }

  const scuro = base.clone().offsetHSL(0, 0.04, -0.12)
  const chiaro = base.clone().offsetHSL(0, -0.02, 0.06)

  for (let i = 0; i < 70; i++) {
    const y0 = caso() * lato
    const ampiezza = 2 + caso() * 7
    const frequenza = 0.004 + caso() * 0.01
    const fase = caso() * Math.PI * 2
    const colVena = caso() < 0.7 ? scuro : chiaro
    ctx.strokeStyle = colVena.getStyle()
    ctx.globalAlpha = 0.08 + caso() * 0.22
    ctx.lineWidth = 0.6 + caso() * 2.4
    ctx.beginPath()
    for (let x = -4; x <= lato + 4; x += 6) {
      const y = y0 + Math.sin(x * frequenza + fase) * ampiezza + Math.sin(x * 0.031 + fase) * 1.2
      if (x === -4) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    }
    ctx.stroke()
  }

  // Un paio di "nodi" del legno
  for (let n = 0; n < 2; n++) {
    const cx = caso() * lato
    const cy = caso() * lato
    for (let r = 3; r < 16; r += 2.5) {
      ctx.strokeStyle = scuro.getStyle()
      ctx.globalAlpha = 0.12
      ctx.lineWidth = 1.2
      ctx.beginPath()
      ctx.ellipse(cx, cy, r * 2.4, r * 0.9, 0, 0, Math.PI * 2)
      ctx.stroke()
    }
  }
  ctx.globalAlpha = 1

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  texture.anisotropy = 4
  return texture
}

/** Una texture per coppia di facce, ripetuta in base alla dimensione reale della faccia. */
function impostaRipetizioni(textures, l, a, p) {
  const r = (lato) => Math.max(lato / DENSITA_VENATURA, 0.35)
  textures.x.repeat.set(r(p), r(a)) // facce laterali: profondità × altezza
  textures.y.repeat.set(r(l), r(p)) // sopra e sotto: larghezza × profondità
  textures.z.repeat.set(r(l), r(a)) // fronte e retro: larghezza × altezza
}

export default function Mobile3D({ larghezza, altezza, profondita, colore, lucidita, esempio = false, ref }) {
  const contenitore = useRef(null)
  const scena = useRef(null)
  const quote = useRef({ l: null, a: null, p: null })
  const [nonSupportato] = useState(() => !webglDisponibile())

  // Crea la scena una volta sola
  useEffect(() => {
    const el = contenitore.current
    if (!el) return undefined
    let renderer
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    } catch {
      return undefined
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFShadowMap
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.05
    el.appendChild(renderer.domElement)

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(32, 1, 0.05, 60)

    scene.add(new THREE.HemisphereLight(0xfff4e6, 0x9c8670, 1.5))
    const sole = new THREE.DirectionalLight(0xfff1dc, 2.4)
    sole.position.set(2.5, 4.5, 3.5)
    sole.castShadow = true
    sole.shadow.mapSize.set(1024, 1024)
    Object.assign(sole.shadow.camera, { left: -3, right: 3, top: 3, bottom: -3, near: 0.5, far: 15 })
    sole.shadow.radius = 6
    scene.add(sole)
    const riempimento = new THREE.DirectionalLight(0xe8eeff, 0.5)
    riempimento.position.set(-3, 2, -1)
    scene.add(riempimento)

    const pavimento = new THREE.Mesh(
      new THREE.PlaneGeometry(30, 30),
      new THREE.ShadowMaterial({ opacity: 0.16 }),
    )
    pavimento.rotation.x = -Math.PI / 2
    pavimento.receiveShadow = true
    scene.add(pavimento)

    const textures = { x: null, y: null, z: null }
    const materiali = [0, 1, 2, 3, 4, 5].map(
      () => new THREE.MeshPhysicalMaterial({ roughness: 0.8, metalness: 0 }),
    )
    const mobile = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), materiali)
    mobile.castShadow = true
    scene.add(mobile)

    const spigoli = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.BoxGeometry(1, 1, 1)),
      new THREE.LineBasicMaterial({ color: 0x2b1a10, transparent: true, opacity: 0.28 }),
    )
    scene.add(spigoli)

    const controlli = new OrbitControls(camera, renderer.domElement)
    controlli.enablePan = false
    controlli.enableDamping = false
    controlli.maxPolarAngle = Math.PI / 2 - 0.04

    // Quote (etichette con le misure) agganciate agli spigoli rivolti verso chi guarda
    const v = new THREE.Vector3()
    const posiziona = (etichetta, x, y, z) => {
      if (!etichetta) return
      v.set(x, y, z).project(camera)
      const { clientWidth: w, clientHeight: h } = el
      etichetta.style.transform = `translate(-50%, -50%) translate(${((v.x + 1) / 2) * w}px, ${((1 - v.y) / 2) * h}px)`
    }
    const aggiornaQuote = () => {
      const { x: l, y: a, z: p } = mobile.scale
      const sx = Math.sign(camera.position.x) || 1
      const sz = Math.sign(camera.position.z - controlli.target.z) || 1
      const q = quote.current
      posiziona(q.l, 0, 0, sz * p / 2)
      posiziona(q.a, sx * l / 2, a / 2, sz * p / 2)
      posiziona(q.p, sx * l / 2, 0, 0)
    }

    const disegna = () => {
      renderer.render(scene, camera)
      aggiornaQuote()
    }
    controlli.addEventListener('change', disegna)

    const ridimensiona = () => {
      const { width } = el.getBoundingClientRect()
      const h = el.clientHeight
      if (!width || !h) return
      renderer.setSize(width, h, false)
      camera.aspect = width / h
      camera.updateProjectionMatrix()
      disegna()
    }
    const osservatore = new ResizeObserver(ridimensiona)
    osservatore.observe(el)

    scena.current = { renderer, scene, camera, controlli, mobile, spigoli, materiali, textures, disegna, ridimensiona, coloreAttuale: null }

    return () => {
      osservatore.disconnect()
      controlli.dispose()
      Object.values(textures).forEach((t) => t?.dispose())
      materiali.forEach((m) => m.dispose())
      mobile.geometry.dispose()
      spigoli.geometry.dispose()
      spigoli.material.dispose()
      pavimento.geometry.dispose()
      pavimento.material.dispose()
      renderer.dispose()
      renderer.domElement.remove()
      scena.current = null
    }
  }, [])

  // Colore del legno: rigenera le texture solo quando cambia
  useEffect(() => {
    const s = scena.current
    if (!s || s.coloreAttuale === colore) return
    const base = creaTextureLegno(colore)
    Object.values(s.textures).forEach((t) => t?.dispose())
    s.textures.x = base
    s.textures.y = base.clone()
    s.textures.z = base.clone()
    // ordine delle facce di BoxGeometry: +x, -x, +y, -y, +z, -z
    ;['x', 'x', 'y', 'y', 'z', 'z'].forEach((asse, i) => {
      s.materiali[i].map = s.textures[asse]
      s.materiali[i].needsUpdate = true
    })
    s.coloreAttuale = colore
  }, [colore])

  // Misure e finitura: aggiorna forma, lucidità, inquadratura
  useEffect(() => {
    const s = scena.current
    if (!s) return
    const l = larghezza * CM
    const a = altezza * CM
    const p = profondita * CM

    s.mobile.scale.set(l, a, p)
    s.mobile.position.set(0, a / 2, 0)
    s.spigoli.scale.copy(s.mobile.scale)
    s.spigoli.position.copy(s.mobile.position)
    impostaRipetizioni(s.textures, l, a, p)

    s.materiali.forEach((m) => {
      m.roughness = 0.88 - 0.68 * lucidita
      m.clearcoat = lucidita > 0.5 ? lucidita : lucidita * 0.4
      m.clearcoatRoughness = 0.25 - 0.2 * lucidita
    })

    // Inquadra il mobile intero, da tre quarti, un po' dall'alto
    const raggio = 0.5 * Math.hypot(l, a, p)
    const distanza = (raggio / Math.sin(THREE.MathUtils.degToRad(s.camera.fov / 2))) * 1.08
    const direzione = new THREE.Vector3(1.05, 0.62, 1.55).normalize()
    s.controlli.target.set(0, a / 2, 0)
    s.camera.position.copy(direzione.multiplyScalar(distanza).add(s.controlli.target))
    s.controlli.minDistance = distanza * 0.55
    s.controlli.maxDistance = distanza * 2
    s.controlli.update()
    s.ridimensiona()
    s.disegna()
  }, [larghezza, altezza, profondita, lucidita, colore])

  // Fotografia della vista attuale, usata nel PDF
  useImperativeHandle(ref, () => ({
    istantanea() {
      const s = scena.current
      if (!s) return null
      s.disegna()
      return {
        dati: s.renderer.domElement.toDataURL('image/png'),
        larghezza: s.renderer.domElement.width,
        altezza: s.renderer.domElement.height,
      }
    },
  }))

  if (nonSupportato) {
    return (
      <div className="vista3d vista3d--non-supportata">
        <p>L'anteprima 3D non è disponibile su questo dispositivo. Il preventivo funziona lo stesso.</p>
      </div>
    )
  }

  const cm = (n) => `${String(Math.round(n * 10) / 10).replace('.', ',')} cm`
  return (
    <div
      className={`vista3d${esempio ? ' vista3d--esempio' : ''}`}
      role="img"
      aria-label={`Anteprima 3D del mobile: ${cm(larghezza)} di larghezza, ${cm(altezza)} di altezza, ${cm(profondita)} di profondità`}
    >
      <div className="vista3d__tela" ref={contenitore} />
      <span className="quota" ref={(n) => { quote.current.l = n }} aria-hidden="true">{cm(larghezza)}</span>
      <span className="quota" ref={(n) => { quote.current.a = n }} aria-hidden="true">{cm(altezza)}</span>
      <span className="quota" ref={(n) => { quote.current.p = n }} aria-hidden="true">{cm(profondita)}</span>
    </div>
  )
}
