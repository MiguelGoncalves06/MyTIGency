const CHARS = '.,-~:;=!*#$@'

export function renderAsciiDonut(screenW, screenH, A, B) {
  const output = new Array(screenW * screenH).fill(' ')
  const zbuffer = new Array(screenW * screenH).fill(0)

  const cosA = Math.cos(A)
  const sinA = Math.sin(A)
  const cosB = Math.cos(B)
  const sinB = Math.sin(B)

  for (let theta = 0; theta < 6.28; theta += 0.07) {
    const costheta = Math.cos(theta)
    const sintheta = Math.sin(theta)
    for (let phi = 0; phi < 6.28; phi += 0.02) {
      const cosphi = Math.cos(phi)
      const sinphi = Math.sin(phi)

      const circleX = 1.6 + costheta
      const circleY = sintheta

      const x = circleX * (cosB * cosphi + sinA * sinB * sinphi) - circleY * cosA * sinB
      const y = circleX * (sinB * cosphi - sinA * cosB * sinphi) + circleY * cosA * cosB
      const z = 5 + cosA * circleX * sinphi + circleY * sinA
      const ooz = 1 / z

      const xp = Math.floor(screenW / 2 + 26 * ooz * x)
      const yp = Math.floor(screenH / 2 - 12 * ooz * y)

      const L =
        cosphi * costheta * sinB -
        cosA * costheta * sinphi -
        sinA * sintheta +
        cosB * (cosA * sintheta - costheta * sinA * sinphi)

      if (xp >= 0 && xp < screenW && yp >= 0 && yp < screenH && ooz > zbuffer[xp + yp * screenW]) {
        zbuffer[xp + yp * screenW] = ooz
        const lum = Math.max(0, Math.floor(L * 8))
        output[xp + yp * screenW] = CHARS[Math.min(lum, CHARS.length - 1)]
      }
    }
  }

  let str = ''
  for (let y = 0; y < screenH; y++) {
    str += output.slice(y * screenW, y * screenW + screenW).join('') + '\n'
  }
  return str
}
