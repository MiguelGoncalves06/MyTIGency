// Animações CSS em loop seguem rodando fora da tela — e, a cada passo, recalculam
// estilo (e repintam) no thread principal. Marca com data-offscreen o que saiu da
// tela; App.css pausa os loops dentro dele. O observer vê os transforms (o pin
// lateral do Manifesto anda por transform), então vale também para o que sai de lado.
export function pauseOffscreen(elements, rootMargin = '25%') {
  const els = elements.filter(Boolean)
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => e.target.toggleAttribute('data-offscreen', !e.isIntersecting))
  }, { rootMargin })
  els.forEach((el) => io.observe(el))
  return () => {
    io.disconnect()
    els.forEach((el) => el.removeAttribute('data-offscreen'))
  }
}
