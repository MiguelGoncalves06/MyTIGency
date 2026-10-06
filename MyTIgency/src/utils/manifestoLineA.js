// Traço A do Manifesto (manifest-vetorA-s2.svg) com "caneta": cada pedaço
// visível do traço (metade de cima, cotovelo esticado, metade de baixo) é o
// mesmo SVG inline com uma <mask> cujo path é a linha central do traço. Animar
// o drawSVG desse path (useManifestoIntro) revela o traço seguindo o próprio
// caminho, do "+" até o fim.
//
// LINE_A_GUIDE foi extraído do próprio SVG (rasterizado, afinado até 1px por
// Zhang-Suen, percorrido de ponta a ponta e simplificado). Cobre 100% do
// traço com um pincel de 40 unidades. Se o SVG for reexportado, regerar.
import lineARaw from '../assets/manifest-vetorA-s2.svg?raw'
import lineBRaw from '../assets/manifest-vetor2.svg?raw'

export const LINE_A_GUIDE = 'M1244.0,2.0L1254.0,22.0L1278.0,82.0L1294.9,140.0L1300.0,168.0L1300.0,192.0L1304.0,208.0L1300.6,238.0L1293.7,264.0L1282.6,290.0L1269.7,312.0L1250.0,336.0L1212.0,366.0L1174.0,383.4L1136.0,393.1L1064.0,402.0L1038.0,404.0L984.0,404.0L970.0,406.0L954.0,404.0L908.0,404.0L894.0,402.0L872.0,402.0L802.0,394.0L566.0,358.0L474.0,348.0L388.0,346.0L360.0,343.4L244.0,346.0L144.0,356.0L90.0,365.4L74.0,370.0L28.0,391.4L16.0,400.0L5.1,416.0L4.0,438.0L9.4,454.0L28.0,480.0L62.0,513.1L94.0,537.7L158.0,580.0L220.0,618.0L288.0,656.6L306.0,664.6L322.0,675.7L366.0,700.6L388.0,710.9L430.0,736.6L456.0,749.4L544.0,802.9L588.0,835.1L614.0,856.9L636.0,884.0L640.3,892.0L642.0,900.0L638.9,918.0L624.3,940.0L596.0,968.9L552.0,1000.0L442.0,1053.1L420.0,1066.6L406.9,1078.0L400.9,1088.0L396.9,1100.0L396.0,1108.0L398.3,1120.0L401.7,1128.0L408.0,1136.0L430.0,1152.9L476.0,1168.9L500.0,1174.9L546.0,1182.6L572.0,1184.9L596.0,1190.0L678.0,1198.9L700.0,1198.0L764.0,1204.0L1034.0,1208.0L1074.0,1204.0L1102.0,1204.0L1200.0,1198.0L1248.0,1192.0L1264.0,1192.0L1322.0,1184.0L1340.0,1184.0'

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
  maskedSvg(lineARaw, { id, guide: LINE_A_GUIDE, viewBox, w: 1348, h: 1216, brush: 40 })

/** SVG inline do traço B com a máscara da caneta (path .lb-guide). */
export const lineBPiece = (id) =>
  maskedSvg(lineBRaw, { id, guide: LINE_B_GUIDE, viewBox: '0 0 387 628', w: 387, h: 628, brush: 30 })
    .replace('class="la-guide"', 'class="lb-guide"')
