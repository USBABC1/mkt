// server/services/openrouter.service.ts
import axios from 'axios';
import { OPENROUTER_API_KEY, APP_BASE_URL } from '../config';

class OpenRouterService {
  private readonly openRouterApiKey: string;
  private readonly siteUrl: string;

  constructor(apiKey: string, siteUrl: string) {
    this.openRouterApiKey = apiKey;
    this.siteUrl = siteUrl;

    if (!this.openRouterApiKey) {
      console.warn('[OpenRouterService] API Key não configurada. O serviço não funcionará.');
    }
  }

  public async createLandingPageFromPrompt(prompt: string, modelName: string = 'anthropic/claude-3-haiku'): Promise<string> {
    if (!this.openRouterApiKey) {
      throw new Error('A API Key da OpenRouter não está configurada no servidor.');
    }

    const systemPrompt = `
      Você é um desenvolvedor frontend expert e designer de UI/UX, especializado em criar landing pages de altíssima conversão usando Tailwind CSS.
      Sua tarefa é gerar o código para uma landing page completa, moderna e visualmente atraente, baseada na solicitação do usuário.

      PALETA DE CORES SUGERIDA (use como base):
      - Background: #0A0A0A (Quase preto)
      - Foreground/Text: #F1F1F1 (Branco suave)
      - Primary/Accent: #38BDF8 (Azul claro vibrante)
      - Secondary/Muted: #1E1E1E (Cinza muito escuro)
      - Card/Panel: #141414 (Cinza escuro)

      REGRAS DE ESTRUTURA E ESTILO:
      - Responda APENAS com o código HTML. Nenhum texto, explicação ou comentário fora do código.
      - O código deve ser um arquivo HTML completo, começando com <!DOCTYPE html> e terminando com </html>.
      - **Sempre** inclua o script do Tailwind CSS via CDN no <head>: <script src="https://cdn.tailwindcss.com"></script>.
      - Use CSS embarcado em uma tag <style> dentro do <head> APENAS para fontes customizadas ou animações complexas. TODO o resto da estilização deve ser feito com classes do Tailwind CSS diretamente nos elementos HTML.
      - O design deve ser moderno, limpo, responsivo e com bom espaçamento. Use seções distintas para cada parte da página.
      - ESTRUTURA SUGERIDA: Header (com logo), Seção Herói (com título forte e CTA), Seção de Benefícios/Recursos, Seção de Prova Social (Depoimentos), Seção de CTA Final e Footer.
      - Use imagens de placeholder do serviço 'https://placehold.co/' (ex: https://placehold.co/800x400).
      - Utilize ícones (SVG embutido) da biblioteca Lucide Icons (https://lucide.dev/) para enriquecer a UI onde for apropriado.
    `;

    try {
      const response = await axios.post(
        'https://openrouter.ai/api/v1/chat/completions',
        {
          model: modelName,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: prompt }
          ],
        },
        {
          headers: {
            'Authorization': `Bearer ${this.openRouterApiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': this.siteUrl, 
            'X-Title': 'USB MKT PRO', 
          },
        }
      );

      let htmlContent = response.data.choices[0].message.content;

      // Limpa qualquer texto ou markdown que a IA possa ter adicionado antes do HTML
      const htmlMatch = htmlContent.match(/<!DOCTYPE html>.*<\/html>/is);
      if (htmlMatch) {
        htmlContent = htmlMatch[0];
      }

      return htmlContent;
    } catch (error: any) {
      console.error('[OpenRouterService] Erro ao chamar a API da OpenRouter:', error.response?.data || error.message);
      throw new Error('Falha ao gerar landing page com a IA.');
    }
  }
}

export const openRouterService = new OpenRouterService(OPENROUTER_API_KEY, APP_BASE_URL);
