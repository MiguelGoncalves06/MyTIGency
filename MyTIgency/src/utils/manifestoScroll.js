// Duração do pin de entrada da seção 1 do Manifesto (useManifestoIntro): a
// frase fica parada no centro enquanto os efeitos acontecem. Todo gatilho de
// scroll que vem DEPOIS dele no Manifesto (saída da seção 1, caneta do traço
// A, pin lateral da seção 2) precisa somar esta duração — o bloco fica parado
// esse tanto de scroll. Curto de propósito: a página já tem a varredura
// Hero→Marquee e o pin lateral.
// DESLIGADO (decisão do usuário): a seção 1 não trava mais — a frase pinta
// enquanto sobe com o scroll, em todas as telas (o caminho "sem pin" do
// useManifestoIntro). 'not all' nunca casa, então a duração vale 0 e todo
// gatilho seguinte se ajusta sozinho. Para religar, volte a query original:
// '(min-width: 701px) and (prefers-reduced-motion: no-preference)'.
export const INTRO_PIN_VH = 0.75
export const INTRO_PIN_QUERY = 'not all'

// Caneta do traço A: um drawSVG só, do "+" (seção 1) até o disco do mapa da
// seção 3, dirigido pelo scroll (useManifestoIntro). Onde ele termina — scroll
// absoluto e fração da guia — é medido pelo pin lateral
// (useManifestoHorizontal.layout), que sabe onde a seção 3 fica.
export const lineAPen = { end: 0, frac: 1 }

export const introPinDuration = () =>
  (window.matchMedia(INTRO_PIN_QUERY).matches ? window.innerHeight * INTRO_PIN_VH : 0)
