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

  public async createLandingPageFromPrompt(prompt: string, modelName: string = 'meta-llama/llama-3-8b-instruct'): Promise<string> {
    if (!this.openRouterApiKey) {
      throw new Error('A API Key da OpenRouter não está configurada no servidor.');
    }

    const systemPrompt = `
      Você é um desenvolvedor frontend expert, especializado em criar landing pages de alta conversão.
      Sua tarefa é gerar o código para uma landing page completa baseada na solicitação do usuário.

      REGRAS DE SAÍDA:
      - Responda APENAS com o código HTML. Nenhum texto, explicação ou comentário fora do código.
      - O código deve ser um arquivo HTML completo, começando com <!DOCTYPE html> e terminando com </html>.
      - Utilize CSS embarcado em uma tag <style> dentro do <head>. NÃO use CSS inline nos elementos.
      - Use o framework Tailwind CSS para estilização SIEMPRE QUE POSSÍVEL, importando-o via CDN no <head>.
      - O design deve ser moderno, limpo e responsivo.
      - Inclua placeholders de imagem (ex: https://via.placeholder.com/800x400) se o usuário não fornecer imagens.
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
