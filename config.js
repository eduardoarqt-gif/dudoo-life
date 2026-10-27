// Configuração do PWA. Nada aqui é segredo — o token do GitHub e o token da IA são digitados em Mais → Dados
// e ficam só no aparelho.
window.DUDOO_CONFIG = {
  versao: "0.6.68",
  // Repositório PRIVADO onde ficam os JSON (a mesma pasta `dados/` que o app desktop sincroniza).
  repo: "eduardoarqt-gif/dudoolife-dados",
  pastaRepo: "dados",
  // Função do Wix que fala com a IA (wix/ia/dudoo_life_ia.js, anexada ao http-functions.js do site).
  // Autenticação: o mesmo token do Dudoo Web, digitado em Mais → Dados. Vazio = assistente desligado.
  proxyIA: "https://www.eduardoschmidt.arq.br/_functions/dudoo_life_ia",
};
