export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text)
  } catch {
    // Fallback para navegadores/contextos sem a Clipboard API
    const field = document.createElement('textarea')
    field.value = text
    field.style.position = 'fixed'
    field.style.opacity = '0'
    document.body.appendChild(field)
    field.select()
    document.execCommand('copy')
    field.remove()
  }
}
