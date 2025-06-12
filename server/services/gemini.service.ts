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

    // ✅ CORREÇÃO: Instrução explícita para NÃO incluir o script do Tailwind.
    const systemPrompt = `
      Você é um desenvolvedor frontend expert e designer de UI/UX, especializado em criar landing pages de altíssima conversão usando Tailwind CSS.
      Sua tarefa é gerar o código para uma landing page completa, moderna e visualmente atraente, baseada na solicitação do usuário.

      REGRAS CRÍTICAS:
      - Responda APENAS com o código HTML. Nenhum texto, explicação ou comentário fora do código.
      - O código deve ser um arquivo HTML completo, começando com <!DOCTYPE html> e terminando com </html>.
      - **NÃO** inclua o script do Tailwind CSS via CDN (ex: <script src="https://cdn.tailwindcss.com"></script>). O ambiente onde este código será usado já possui o Tailwind CSS configurado. Apenas use as classes do Tailwind diretamente nos elementos HTML.
      
      ESTILO E ESTRUTURA:
      - O design deve ser moderno, limpo, responsivo e com excelente espaçamento. Use seções distintas.
      - ESTRUTURA SUGERIDA: Header (com logo), Seção Herói (com título forte e CTA), Seção de Benefícios/Recursos, Seção de Prova Social (Depoimentos), Seção de CTA Final e Footer.
      - Use imagens de placeholder do serviço 'https://placehold.co/' (ex: https://placehold.co/800x400). As imagens devem ser relevantes ao contexto do prompt.
      - Utilize ícones (SVG embutido) da biblioteca Lucide Icons (https://lucide.dev/) para enriquecer a UI.
      - O conteúdo gerado DEVE ser em Português do Brasil.
    `;

    const userPrompt = `
      PROMPT DO USUÁRIO:
      ${prompt}
      ---
      ${reference ? `MATERIAL DE REFERÊNCIA (use como inspiração para estilo ou conteúdo):
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
            htmlContent = htmlContent.replace(/```html\n/g, '').replace(/```/g, '');
        }

        return htmlContent;
    } catch (error: any) {
      console.error('[GeminiService] Erro ao chamar a API do Gemini:', error.response?.data || error.message);
      throw new Error('Falha ao gerar landing page com a IA.');
    }
  }
}

export const geminiService = new GeminiService(GEMINI_API_KEY);
