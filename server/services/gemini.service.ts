// server/services/gemini.service.ts
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";
import { GEMINI_API_KEY } from '../config';

class GeminiService {
  private genAI: GoogleGenerativeAI | null = null;

  constructor(apiKey: string) {
    if (!apiKey) {
      console.warn('[GeminiService] API Key não configurada. O serviço não funcionará.');
      return;
    }
    this.genAI = new GoogleGenerativeAI(apiKey);
  }

  public async createLandingPageFromPrompt(
    prompt: string,
    reference?: string
  ): Promise<string> {
    if (!this.genAI) {
      throw new Error('A API Key do Gemini não está configurada no servidor.');
    }

    const model = this.genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });

    // ✅ CORREÇÃO: Prompt do sistema significativamente aprimorado para resultados mais ricos.
    const systemPrompt = `
      Você é um desenvolvedor frontend Sênior e UI/UX Designer especialista na criação de landing pages de altíssima conversão, visualmente impressionantes e completas, utilizando Tailwind CSS.

      REGRAS DE OURO (OBRIGATÓRIO SEGUIR):
      1.  **HTML COMPLETO E ÚNICO**: Sua resposta deve conter APENAS o código HTML, de "<!DOCTYPE html>" a "</html>". Não adicione NENHUM texto, explicação, ou markdown como \`\`\`html.
      2.  **SEM SCRIPT TAILWIND**: NÃO inclua o script do Tailwind CDN (<script src="...tailwindcss..."></script>). O ambiente de renderização já possui Tailwind. Apenas utilize as classes.
      3.  **VISUALMENTE RICO**: A página deve ser visualmente rica e profissional. Use cores, espaçamentos e tipografia de forma inteligente. O resultado NUNCA deve ser simples ou com fundo branco. Use um tema escuro como base.
      4.  **SEÇÕES COMPLETAS**: A página DEVE conter múltiplas seções relevantes, como:
          - Header: Com um logo de placeholder e links de navegação simples.
          - Seção Herói (Hero): Título forte (h1), subtítulo, um botão de CTA (Call to Action) e OBRIGATORIAMENTE uma imagem de fundo ou uma imagem grande de destaque.
          - Seção de Benefícios/Recursos: Use cards, ícones e textos curtos para listar pelo menos 3 benefícios.
          - Seção de Prova Social: Inclua uma área para depoimentos (testimonials) com placeholders para fotos e textos.
          - Seção de CTA Final: Um chamado final claro e forte para a ação.
          - Footer: Com links básicos e informações de copyright.
      5.  **IMAGENS E ÍCONES SÃO OBRIGATÓRIOS**:
          - **Imagens**: Use SEMPRE imagens de placeholder do serviço 'https://placehold.co/'. Ex: 'https://placehold.co/1200x600/1E1E1E/F1F1F1?text=Produto+Incrível'. Adapte o tamanho e o texto para o contexto.
          - **Ícones**: Use OBRIGATORIAMENTE ícones em formato SVG da biblioteca Lucide Icons (https://lucide.dev/) para ilustrar benefícios e recursos. O SVG deve ser embutido diretamente no HTML.
      6.  **CONTEÚDO EM PORTUGUÊS-BR**: Todo o texto gerado (títulos, parágrafos, botões) deve ser em Português do Brasil e ser persuasivo (copywriting).
    `;

    const userPrompt = `
      PROMPT DO USUÁRIO:
      ${prompt}
      ---
      ${reference ? `URL DE REFERÊNCIA (use como inspiração para ESTRUTURA e ESTILO VISUAL, mas o CONTEÚDO DE TEXTO deve vir do prompt acima):
      ${reference}` : ''}
    `;

    try {
        const result = await model.generateContent([systemPrompt, userPrompt]);
        const response = result.response;
        let htmlContent = response.text();

        const htmlMatch = htmlContent.match(/<!DOCTYPE html>.*<\/html>/is);
        if (htmlMatch) {
            htmlContent = htmlMatch[0];
        } else {
            htmlContent = htmlContent.replace(/```html\n?/g, '').replace(/```/g, '');
        }

        return htmlContent;
    } catch (error: any) {
      console.error('[GeminiService] Erro ao chamar a API do Gemini:', error.response?.data || error.message);
      throw new Error('Falha ao gerar landing page com a IA.');
    }
  }
}

export const geminiService = new GeminiService(GEMINI_API_KEY);
