// Traço A do Manifesto (manifest-vetorA-lua.svg) com "caneta": cada pedaço
// visível do traço (metade de cima, cotovelo esticado, metade de baixo) é o
// mesmo SVG inline com uma <mask> cujo path é a linha central do traço. Animar
// o drawSVG desse path (useManifestoIntro) revela o traço seguindo o próprio
// caminho, do "+" até o fim.
//
// LINE_A_GUIDE foi extraído do próprio SVG (rasterizado, afinado até 1px por
// Zhang-Suen, percorrido de ponta a ponta e simplificado). Cobre 100% do
// traço com um pincel de 40 unidades. Se o SVG for reexportado, regerar.
// manifest-vetorA-lua.svg: o mesmo traço A (mesmas coordenadas até x 1348),
// com o fim estendido para a direita até a lua da seção 3 (2135×1212).
import lineARaw from '../assets/manifest-vetorA-lua.svg?raw'
import lineBRaw from '../assets/manifest-vetor2.svg?raw'

export const LINE_A_GUIDE = 'M1244.0,2.0L1254.0,22.0L1278.0,82.0L1294.9,140.0L1300.0,168.0L1300.0,192.0L1304.0,208.0L1300.6,238.0L1293.7,264.0L1282.6,290.0L1269.7,312.0L1250.0,336.0L1212.0,366.0L1174.0,383.4L1136.0,393.1L1064.0,402.0L1038.0,404.0L984.0,404.0L970.0,406.0L954.0,404.0L908.0,404.0L894.0,402.0L872.0,402.0L802.0,394.0L566.0,358.0L474.0,348.0L388.0,346.0L360.0,343.4L244.0,346.0L144.0,356.0L90.0,365.4L74.0,370.0L28.0,391.4L16.0,400.0L5.1,416.0L4.0,438.0L9.4,454.0L28.0,480.0L62.0,513.1L94.0,537.7L158.0,580.0L220.0,618.0L288.0,656.6L306.0,664.6L322.0,675.7L366.0,700.6L388.0,710.9L430.0,736.6L456.0,749.4L544.0,802.9L588.0,835.1L614.0,856.9L636.0,884.0L640.3,892.0L642.0,900.0L638.9,918.0L624.3,940.0L596.0,968.9L552.0,1000.0L442.0,1053.1L420.0,1066.6L406.9,1078.0L400.9,1088.0L396.9,1100.0L396.0,1108.0L398.3,1120.0L401.7,1128.0L408.0,1136.0L430.0,1152.9L476.0,1168.9L500.0,1174.9L546.0,1182.6L572.0,1184.9L596.0,1190.0L678.0,1198.9L700.0,1198.0L764.0,1204.0L1034.0,1208.0L1074.0,1204.0L1102.0,1204.0L1200.0,1198.0L1248.0,1192.0L1264.0,1192.0L1322.0,1184.0L1340.0,1184.0'

// Extensão do traço A, do fim antigo (1340, 1184) até o fim do SVG. Entra na
// mesma guia (uma caneta só, do "+" até o disco do mapa da seção 3 — o drawSVG
// para na fração lineAPen.frac; o resto fica escondido pela máscara).
export const LINE_A_EXT = [[1428, 1174.7], [1540, 1155.3], [1720, 1114.9], [1810, 1100], [1904, 1092], [1972, 1090], [2098, 1090], [2122, 1095.6], [2134, 1098]]
const LINE_A_FULL_GUIDE = LINE_A_GUIDE + LINE_A_EXT.map((p) => 'L' + p.join(',')).join('')
/** Comprimento da guia até o fim antigo (1340, 1184), em unidades do traço. */
export const LINE_A_LEN = (() => {
  const pts = LINE_A_GUIDE.slice(1).split('L').map((p) => p.split(',').map(Number))
  let len = 0
  for (let i = 1; i < pts.length; i++) len += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1])
  return len
})()
/** Último ponto da guia antiga — de onde a extensão parte. */
export const LINE_A_JOIN = [1340, 1184]

// Traço B (manifest-vetor2.svg, 387×628): da borda esquerda, contornando o
// "Sem", até o botão "continue rolando". Extraído do mesmo jeito; cobre 100%
// com pincel de 30.
export const LINE_B_GUIDE = 'M2.0,5.0L20.0,3.0L51.0,3.0L78.0,6.3L118.0,20.1L141.0,32.3L157.0,43.4L166.0,52.0L178.7,66.0L192.9,85.0L205.0,113.0L211.0,142.0L212.0,165.0L208.3,193.0L204.7,210.0L192.7,239.0L178.4,264.0L160.6,285.0L155.6,295.0L131.4,322.0L113.0,348.0L95.7,376.0L76.0,420.0L66.3,460.0L64.0,493.0L68.4,519.0L76.4,540.0L89.0,559.0L109.0,577.7L120.0,584.9L155.0,601.9L199.0,614.6L240.0,618.0L300.0,619.0L371.0,610.0L376.0,611.1L381.0,615.0'

// SVG inline com a máscara da caneta (path .la-guide). viewBox recorta.
function maskedSvg(raw, { id, guide, viewBox, w, h, brush }) {
  return raw
    .replace(/width="\d+" height="\d+" viewBox="[^"]+"/,
      `width="100%" height="100%" viewBox="${viewBox}" preserveAspectRatio="none"`)
    .replace(/(<svg[^>]*>)/, `$1<defs><mask id="${id}" maskUnits="userSpaceOnUse" x="0" y="0" width="${w}" height="${h}">`
      + `<path class="la-guide" d="${guide}" fill="none" stroke="#fff" stroke-width="${brush}" stroke-linecap="round" stroke-linejoin="round"/>`
      + `</mask></defs><g mask="url(#${id})">`)
    .replace('</svg>', '</g></svg>')
}

/**
 * SVG inline de um pedaço do traço A, com a máscara da caneta.
 * @param {string} id       id único da <mask> (um por pedaço)
 * @param {string} viewBox  recorte do traço (padrão: inteiro)
 */
export const lineAPiece = (id, viewBox = '0 0 1348 1216') =>
  maskedSvg(lineARaw, { id, guide: LINE_A_FULL_GUIDE, viewBox, w: 2135, h: 1216, brush: 40 })

/** SVG inline do traço B com a máscara da caneta (path .lb-guide). */
export const lineBPiece = (id) =>
  maskedSvg(lineBRaw, { id, guide: LINE_B_GUIDE, viewBox: '0 0 387 628', w: 387, h: 628, brush: 30 })
    .replace('class="la-guide"', 'class="lb-guide"')

// Inicial do "Sem"/"Without" (Great Vibes) escrita à caneta: SVG <text> com a
// mesma máscara-caneta. Guias extraídos da própria fonte (mesmo processo dos
// traços; S cobre 100%, W com o esporão do meio como ida-e-volta), em
// unidades de 1/1000 em, origem no início da linha de base. Ordem = ordem da
// escrita.
const INITIAL_GUIDES = {
  S: {
    box: [-60, -880, 1120, 1040],
    d: 'M884,-602L924,-616L949,-636L964,-664L969,-684L969,-704L955,-738L932,-765L890,-789L850,-801L790,-806L746,-804L684,-795L620,-777L576,-758L544,-738L504,-700L488,-674L483,-660L475,-624L475,-598L485,-568L504,-542L530,-518L570,-492L736,-416L782,-391L808,-374L840,-344L857,-322L874,-282L880,-250L872,-196L858,-158L834,-116L794,-68L740,-22L674,18L612,45L560,60L502,70L424,78L354,74L280,62L234,47L176,16L140,-12L107,-52L94,-78L84,-106L76,-166L81,-214L92,-258L114,-312L132,-342L150,-368L188,-409L232,-440',
  },
  W: {
    box: [-80, -870, 1530, 1060],
    d: 'M303,-447L342,-454L368,-454L386,-450L404,-439L413,-430L423,-414L430,-392L432,-354L427,-320L418,-292L405,-264L385,-232L364,-204L342,-180L308,-154L284,-139L254,-126L222,-117L174,-114L130,-123L88,-144L51,-180L35,-206L21,-246L13,-320L17,-364L35,-428L59,-486L86,-532L128,-588L190,-652L240,-693L302,-734L350,-759L390,-776L426,-787L460,-795L500,-800L550,-800L606,-787L646,-767L657,-756L671,-736L679,-714L685,-690L690,-648L690,-622L683,-574L665,-506L652,-466L554,-222L507,-88L487,-16L480,24L480,48L488,86L500,103L512,109L554,104L592,81L637,42L686,-14L729,-70L776,-138L821,-210L828,-217L866,-234L870,-239L962,-410L875,-242L873,-234L875,-224L867,-172L852,-106L850,-88L852,-46L855,-22L866,10L880,30L898,44L914,52L942,58L972,58L996,55L1022,47L1058,33L1108,6L1164,-34L1228,-92L1265,-136L1301,-190L1334,-268L1351,-326L1360,-386L1356,-454L1346,-504L1325,-546L1310,-566L1296,-579L1278,-591L1260,-598L1234,-604L1198,-606L1178,-603L1157,-596',
  },
}
const INITIAL_BASELINE = 725 // Great Vibes com line-height 1: base a 72.5% do topo
const initialCache = {}

/**
 * {__html} estável (React 19 compara por identidade) da inicial com a
 * máscara-caneta (path .sem-guide), ou null se a letra não tem guia.
 */
export function initialPiece(letter) {
  const g = INITIAL_GUIDES[letter]
  if (!g) return null
  if (!initialCache[letter]) {
    const [x, y, w, h] = g.box
    const em = (v) => `${v / 1000}em`
    initialCache[letter] = {
      __html: `<svg viewBox="${g.box.join(' ')}" style="position:absolute;left:${em(x)};top:${em(INITIAL_BASELINE + y)};width:${em(w)};height:${em(h)};overflow:visible">`
        + `<defs><mask id="sem-${letter}" maskUnits="userSpaceOnUse" x="${x}" y="${y}" width="${w}" height="${h}">`
        + `<path class="sem-guide" d="${g.d}" fill="none" stroke="#fff" stroke-width="92" stroke-linecap="round" stroke-linejoin="round"/>`
        + `</mask></defs>`
        + `<text mask="url(#sem-${letter})" font-family="Great Vibes" font-size="1000" fill="currentColor">${letter}</text></svg>`,
    }
  }
  return initialCache[letter]
}
