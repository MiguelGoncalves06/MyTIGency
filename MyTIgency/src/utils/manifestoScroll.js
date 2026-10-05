// Duração do pin de entrada da seção 1 do Manifesto (useManifestoIntro): a
// frase fica parada no centro enquanto os efeitos acontecem. Todo gatilho de
// scroll que vem DEPOIS dele no Manifesto (saída da seção 1, caneta do traço
// A, pin lateral da seção 2) precisa somar esta duração — o bloco fica parado
// esse tanto de scroll. Curto de propósito: a página já tem a varredura
// Hero→Marquee e o pin lateral.
export const INTRO_PIN_VH = 0.75
export const INTRO_PIN_QUERY = '(min-width: 701px) and (prefers-reduced-motion: no-preference)'

export const introPinDuration = () =>
  (window.matchMedia(INTRO_PIN_QUERY).matches ? window.innerHeight * INTRO_PIN_VH : 0)
