// server/mcp_handler.ts
import { GoogleGenerativeAI } from "@google/generative-ai";
import { GEMINI_API_KEY } from "./config";
import * as storage from './storage';
import * as schemaShared from '../../shared/schema';

if (!GEMINI_API_KEY) {
  console.warn("Chave da API do Gemini não configurada. O serviço MCP não funcionará.");
}

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY!);

const tools = [
  // Ferramentas existentes...
  {
    functionDeclarations: [
      {
        name: "navigate_to_page",
        description: "Navega para uma página específica dentro do aplicativo. Use somente se o usuário pedir explicitamente para ir para uma tela/página/seção.",
        parameters: {
          type: "OBJECT",
          properties: {
            page: {
              type: "STRING",
              description: "O caminho da página para navegar, por exemplo, '/campaigns', '/creatives', '/dashboard'."
            }
          },
          required: ["page"]
        }
      },
      {
        name: "answer_user_question",
        description: "Responde diretamente a uma pergunta do usuário quando nenhuma outra ferramenta é apropriada.",
        parameters: {
          type: "OBJECT",
          properties: {
            answer: {
              type: "STRING",
              description: "A resposta em texto para a pergunta do usuário."
            }
          },
          required: ["answer"]
        }
      },
      {
        name: "get_campaign_data",
        description: "Busca dados sobre todas as campanhas do usuário.",
        parameters: {
          type: "OBJECT",
          properties: {}
        }
      },
      {
        name: "get_copy_data",
        description: "Busca dados sobre todas as copies salvas pelo usuário.",
        parameters: {
          type: "OBJECT",
          properties: {}
        }
      },
      {
        name: "get_creative_data",
        description: "Busca dados sobre todos os criativos salvos pelo usuário.",
        parameters: {
          type: "OBJECT",
          properties: {}
        }
      },
      {
        name: "get_current_date_and_time",
        description: "Obtém a data e hora atuais, útil para criar agendamentos ou campanhas com datas.",
        parameters: {
            type: "OBJECT",
            properties: {}
        }
      },
      // ✅ CORREÇÃO: Novas ferramentas para criar e editar campanhas
      {
        name: "create_campaign",
        description: "Cria uma nova campanha de marketing com os detalhes fornecidos.",
        parameters: {
          type: "OBJECT",
          properties: {
            name: { type: "STRING", description: "O nome da nova campanha." },
            description: { type: "STRING", description: "Uma breve descrição da campanha." },
            startDate: { type: "STRING", description: "A data de início da campanha (formato ISO 8601, ex: YYYY-MM-DDTHH:mm:ss.sssZ)." },
            endDate: { type: "STRING", description: "A data de término da campanha (formato ISO 8601, ex: YYYY-MM-DDTHH:mm:ss.sssZ)." },
            budget: { type: "NUMBER", description: "O orçamento total da campanha." },
            targetAudience: { type: "STRING", description: "O público-alvo da campanha." },
          },
          required: ["name"]
        }
      },
      {
        name: "update_campaign",
        description: "Atualiza os detalhes de uma campanha de marketing existente.",
        parameters: {
          type: "OBJECT",
          properties: {
            campaignId: { type: "NUMBER", description: "O ID da campanha a ser atualizada." },
            name: { type: "STRING", description: "O novo nome da campanha." },
            description: { type: "STRING", description: "A nova descrição da campanha." },
            status: { type: "STRING", description: "O novo status da campanha (ex: 'active', 'paused', 'completed')." },
            startDate: { type: "STRING", description: "A nova data de início da campanha (formato ISO 8601)." },
            endDate: { type: "STRING", description: "A nova data de término da campanha (formato ISO 8601)." },
          },
          required: ["campaignId"]
        }
      }
    ]
  }
];

export async function handleMCPRequest(prompt: string, appState: any, userId: number) {
  if (!GEMINI_API_KEY) {
    return { command: 'error', payload: { message: "MCP não configurado no servidor." } };
  }
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro", tools });

  const chat = model.startChat({
    history: [
      {
        role: "user",
        parts: [{
          text: `Você é o MCP (Marketing Co-Pilot), um assistente de IA proativo e inteligente integrado a um sistema de gerenciamento de marketing.
          Sua função é ajudar os usuários a gerenciar suas campanhas, criativos, copies e outras tarefas de marketing.
          Seja conciso e direto. Aja como um co-piloto, não como um chatbot.
          Execute ações sempre que possível. Use as ferramentas disponíveis para interagir com o sistema.
          Contexto atual do aplicativo: ${JSON.stringify(appState)}`
        }],
      },
      { role: "model", parts: [{ text: "Entendido. Estou pronto para ajudar." }] }
    ]
  });

  const result = await chat.sendMessage(prompt);
  const call = result.response.functionCalls()?.[0];

  if (call) {
    const { name, args } = call;
    console.log(`[MCP] Chamando ferramenta: ${name}`, args);

    try {
      switch (name) {
        case 'navigate_to_page':
          return { command: 'navigate', payload: { page: args.page } };
        case 'answer_user_question':
          return { command: 'answer', payload: { message: args.answer } };
        case 'get_campaign_data': {
          const campaigns = await storage.getCampaigns(userId);
          return { command: 'answer', payload: { message: `Aqui estão os dados das campanhas: ${JSON.stringify(campaigns)}` } };
        }
        case 'get_copy_data': {
            const copies = await storage.getCopies(userId);
            return { command: 'answer', payload: { message: `Aqui estão os dados das copies: ${JSON.stringify(copies)}` } };
        }
        case 'get_creative_data': {
            const creatives = await storage.getCreatives(userId);
            return { command: 'answer', payload: { message: `Aqui estão os dados dos criativos: ${JSON.stringify(creatives)}` } };
        }
        case 'get_current_date_and_time': {
            return { command: 'answer', payload: { message: `A data e hora atuais são: ${new Date().toISOString()}` } };
        }
        
        // ✅ CORREÇÃO: Lógica para as novas ferramentas
        case 'create_campaign': {
            const validatedData = schemaShared.insertCampaignSchema.parse(args);
            const newCampaign = await storage.createCampaign(validatedData, userId);
            return { 
                command: 'action_completed', 
                payload: { 
                    message: `Campanha "${newCampaign.name}" criada com sucesso!`,
                    queryToInvalidate: 'campaigns'
                } 
            };
        }
        case 'update_campaign': {
            const { campaignId, ...updateData } = args;
            if (typeof campaignId !== 'number') throw new Error("campaignId deve ser um número");

            const validatedData = schemaShared.insertCampaignSchema.partial().parse(updateData);
            const updatedCampaign = await storage.updateCampaign(campaignId, userId, validatedData);
            return {
                command: 'action_completed',
                payload: {
                    message: `Campanha "${updatedCampaign.name}" atualizada com sucesso!`,
                    queryToInvalidate: 'campaigns'
                }
            };
        }

        default:
          return { command: 'error', payload: { message: `Ferramenta '${name}' não reconhecida.` } };
      }
    } catch (error: any) {
        console.error(`[MCP] Erro ao executar ferramenta '${name}':`, error);
        const errorMessage = error instanceof Error ? error.message : JSON.stringify(error);
        return { command: 'error', payload: { message: `Houve um problema ao executar a ação: ${errorMessage}` } };
    }
  }

  // Se nenhuma ferramenta foi chamada, apenas retorne a resposta de texto do modelo.
  const textResponse = result.response.text();
  return { command: 'answer', payload: { message: textResponse } };
}
