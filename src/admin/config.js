// Dove sta il listino da modificare. Nessuna chiave o password qui: il login
// passa da GitHub tramite Netlify, e il segreto OAuth vive nelle impostazioni di Netlify.
export const CONFIG_ADMIN = {
  repository: import.meta.env.VITE_GITHUB_REPO ?? 'Cerions/preventivatore-legnoco',
  ramo: import.meta.env.VITE_GITHUB_BRANCH ?? 'main',
  percorso: 'public/listino.json',
  // "public_repo" basta per un repository pubblico; per uno privato serve "repo"
  scope: import.meta.env.VITE_GITHUB_SCOPE ?? 'public_repo',
  // Usato solo in locale (localhost), dove Netlify non può riconoscere il sito dall'indirizzo
  sitoNetlify: import.meta.env.VITE_NETLIFY_SITE ?? 'legnoco-preventivo.netlify.app',
}
