// Envio do formulário de contato.
//
// TODO(backend): conectar a POST /api/contact quando o site estiver hospedado
// (Cloudflare Worker + Turnstile). Chave secreta e validação SÓ no servidor,
// em variável de ambiente — nada disso pode aparecer no código do cliente.
//
// Enquanto o backend não existe, o sucesso só é simulado em desenvolvimento.
// Em produção a função falha de propósito: uma página que finge enviar é uma
// "promessa visual sem função real" (DESIGN.md). Para testar o estado de erro
// no dev, abra a página com ?simular=erro.
export async function submitContact(data) {
  if (import.meta.env.DEV) {
    await new Promise((resolve) => setTimeout(resolve, 900))
    if (new URLSearchParams(window.location.search).get('simular') === 'erro') {
      throw new Error('submitContact: erro simulado (dev)')
    }
    console.info('[submitContact] dev — dados que iriam para POST /api/contact:', data)
    return { ok: true }
  }
  throw new Error('submitContact: backend ainda não conectado (POST /api/contact)')
}
