import { useSyncExternalStore } from 'react'

// Pular o Manifesto: o estado do botão (components/ManifestoSkip.jsx) e o salto.
// Quem sabe onde o Manifesto está é o pin (useManifestoHorizontal): ele atualiza
// o estado (visível, modo) e registra o salto; o botão só lê e chama.
//   mode 'skip' — da seção 1 até a 4: leva ao cartaz (o fim do Manifesto)
//   mode 'back' — nas seções 5, 6 e no cartaz: volta ao início do Manifesto

//   cartaz — no cartaz (e na folha): o header diz "Trabalhos" (Header.jsx)
let state = { visible: false, mode: 'skip', cartaz: false }
const listeners = new Set()

export function setSkip(patch) {
  if (Object.keys(patch).every((k) => state[k] === patch[k])) return
  state = { ...state, ...patch }
  listeners.forEach((fn) => fn())
}

const subscribe = (fn) => { listeners.add(fn); return () => listeners.delete(fn) }
export const useSkipState = () => useSyncExternalStore(subscribe, () => state)

// o salto em si (registrado pelo pin; null sem o Manifesto montado). Além de
// 'skip'/'back' (o botão, com o portal):
//   'work'   — "Work" no menu: longe, o mesmo portal; da seção 6 em diante, só rola
//   'arrive' — chegando com /#trabalhos (recarga, vindo do Contato): pousa no
//              cartaz na hora, por baixo da tela de carregamento ou da cortina
let go = null
export const setSkipGo = (fn) => { go = fn }
export const hasSkipGo = () => !!go
export const skipGo = (mode, origin) => go?.(mode, origin)
/** useAppReady: com #trabalhos na URL, o destino é o cartaz (não o topo de Trabalhos) */
export const landOnHash = () => (go && window.location.hash === '#trabalhos' ? go('arrive') : undefined)

// Quem já chegou ao cartaz uma vez (neste navegador): o botão perde o aviso e
// fica mais visível. Sem storage (aba privada, bloqueio), só não lembra.
const SEEN_KEY = 'myt:manifesto-visto'
let seenNow = (() => { try { return localStorage.getItem(SEEN_KEY) === '1' } catch { return false } })()
export const manifestoSeen = () => seenNow
export function markManifestoSeen() {
  if (seenNow) return
  seenNow = true
  try { localStorage.setItem(SEEN_KEY, '1') } catch { /* sem storage: só não lembra */ }
}
