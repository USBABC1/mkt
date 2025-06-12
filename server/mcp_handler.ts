import { storage } from "./storage";
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold, Part } from "@google/generative-ai";
import { GEMINI_API_KEY, UPLOADS_PATH, UPLOADS_DIR_NAME } from './config';
import { InsertCampaign, ChatMessage, ChatSession, InsertCampaignTask } from "../shared/schema";
import fs from 'fs';
import path from 'path';
import mammoth from 'mammoth';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';

let genAI: GoogleGenerativeAI | null = null;
if (GEMINI_API_KEY) {
  try {
    genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    console.log("[MCP_HANDLER_GEMINI] SDK do Gemini inicializado com sucesso.");
  } catch (error) {
    console.error("[MCP_HANDLER_GEMINI] Falha ao inicializar o SDK do Gemini:", error);
    genAI = null;
  }
}

interface MCPResponsePayload {
  reply: string;
  sessionId: number;
  action?: string;
  payload?: any;
}

interface FileProcessResult {
    type: 'text' | 'image' | 'json';
    content: string;
    mimeType?: string;
}

async function processFile(attachmentUrl: string): Promise<FileProcessResult | null> {
    if (!attachmentUrl) return null;
    try {
        const url = new URL(attachmentUrl);
        const relativePath = url.pathname.replace(`/${UPLOADS_DIR_NAME}/`, '');
        const filePath = path.join(UPLOADS_PATH, relativePath);

        if (!fs.existsSync(filePath)) {
            console.error(`[MCP_HANDLER] Arquivo não encontrado: ${filePath}`);
            return null;
        }

        const fileExtension = path.extname(filePath).toLowerCase();
        
        if (['.png', '.jpeg', '.jpg', '.webp'].includes(fileExtension)) {
            const mimeType = `image/${fileExtension.substring(1)}`;
            const imageBuffer = fs.readFileSync(filePath);
            return { type: 'image', content: imageBuffer.toString('base64'), mimeType: mimeType };
        }
        
        let textContent: string | null = null;
        if (fileExtension === '.pdf') {
            const pdf = (await import('pdf-parse')).default;
            const dataBuffer = fs.readFileSync(filePath);
            const data = await pdf(dataBuffer);
            textContent = data.text;
        } else if (fileExtension === '.docx') {
            const { value } = await mammoth.extractRawText({ path: filePath });
            textContent = value;
        } else if (fileExtension === '.txt' || fileExtension === '.md') {
            textContent = fs.readFileSync(filePath, 'utf-8');
        }

        if (textContent !== null) {
            return { type: 'text', content: textContent };
        }

        let jsonData: any = null;
        if (fileExtension === '.csv') {
            const fileString = fs.readFileSync(filePath, 'utf-8');
            jsonData = Papa.parse(fileString, { header: true, skipEmptyLines: true }).data;
        } else if (fileExtension === '.xlsx' || fileExtension === '.xls') {
            const workbook = XLSX.readFile(filePath);
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            jsonData = XLSX.utils.sheet_to_json(worksheet);
        }

        if (jsonData !== null) {
            return { type: 'json', content: JSON.stringify(jsonData, null, 2) };
        }

        console.log(`[MCP_HANDLER] Tipo de arquivo não suportado: ${fileExtension}`);
        return null;

    } catch (error) {
        console.error("[MCP_HANDLER] Erro ao processar o anexo:", error);
        return null;
    }
}

async function getCampaignDetailsFromContext(message: string, fileInfo: FileProcessResult | null): Promise<Partial<InsertCampaign> | null> {
    if (!genAI) return null;
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });
        let fileContextPrompt = "Nenhum arquivo anexado.";
        if (fileInfo) {
            if (fileInfo.type === 'text') {
                fileContextPrompt = `Conteúdo do documento de texto:\n${fileInfo.content.substring(0, 4000)}`;
            } else if (fileInfo.type === 'json') {
                fileContextPrompt = `Conteúdo da planilha (em JSON):\n${fileInfo.content.substring(0, 4000)}`;
            } else if (fileInfo.type === 'image') {
                fileContextPrompt = "Uma imagem foi anexada. Analise-a para extrair o tema e o público-alvo.";
            }
        }
        
        const promptForDetails = `
          Com base na conversa e no arquivo anexado, extraia detalhes para criar uma campanha de marketing.
          Mensagem do usuário: "${message}"
          Contexto do Arquivo: ${fileContextPrompt}
          
          Extraia as seguintes informações: "name", "description", "objectives", "targetAudience".
          Responda APENAS com um objeto JSON. Se uma informação não for encontrada, deixe o campo como nulo.
        `;

        const parts: Part[] = [{ text: promptForDetails }];
        if (fileInfo?.type === 'image') {
            parts.push({ inlineData: { mimeType: fileInfo.mimeType!, data: fileInfo.content } });
        }
        
        const result = await model.generateContent({ contents: [{ role: 'user', parts }] });
        const text = result.response.text().trim();
        const jsonMatch = text.match(/\{.*\}/s);
        if (jsonMatch) {
            return JSON.parse(jsonMatch[0]);
        }
        return null;
    } catch (error) {
        console.error("[MCP_HANDLER_GEMINI] Erro ao extrair detalhes da campanha:", error);
        return null;
    }
}

async function getTaskDetailsFromContext(message: string, history: ChatMessage[]): Promise<Partial<InsertCampaignTask> & { campaignName?: string, phaseName?: string } | null> {
    if (!genAI) return null;
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });
        const historyText = history.map(h => `${h.sender}: ${h.text}`).join('\n');
        
        const prompt = `
            Baseado na última mensagem do usuário e no histórico da conversa, extraia os detalhes para CRIAR UMA TAREFA.
            Histórico:
            ${historyText}
            
            Mensagem do usuário: "${message}"

            Extraia as seguintes informações:
            - "name": O nome da tarefa.
            - "campaignName": O nome da campanha onde a tarefa deve ser criada. Use o contexto do histórico se o usuário disser "nesta campanha" ou algo similar.
            - "phaseName": O nome da fase (ex: 'Planejamento', 'Aquisição').
            - "description": Uma descrição opcional para a tarefa.

            Responda APENAS com um objeto JSON. Se uma informação não for encontrada, deixe o campo como nulo.
        `;
        const result = await model.generateContent(prompt);
        const text = result.response.text().trim();
        const jsonMatch = text.match(/\{.*\}/s);
        if (jsonMatch) {
            return JSON.parse(jsonMatch[0]);
        }
        return null;
    } catch (error) {
        console.error("[MCP_HANDLER_GEMINI] Erro ao extrair detalhes da tarefa:", error);
        return null;
    }
}

export async function handleMCPConversation(
  userId: number,
  message: string,
  currentSessionId: number | null | undefined,
  attachmentUrl?: string | null
): Promise<MCPResponsePayload> {
    console.log(`[MCP_HANDLER] User ${userId} disse: "${message || '[Anexo]'}" (Session: ${currentSessionId || 'Nova'})`);
  
    const fileInfo = attachmentUrl ? await processFile(attachmentUrl) : null;

    let activeSession: ChatSession;
    if (currentSessionId) {
        activeSession = await storage.getChatSession(currentSessionId, userId) ?? await storage.createChatSession(userId, 'Nova Conversa');
    } else {
        activeSession = await storage.createChatSession(userId, 'Nova Conversa');
    }

    const history = await storage.getChatMessages(activeSession.id, userId);

    await storage.addChatMessage({
        sessionId: activeSession.id,
        sender: 'user',
        text: message || (attachmentUrl ? `Anexo: ${path.basename(attachmentUrl)}` : 'Mensagem vazia.'),
        attachmentUrl: attachmentUrl || null,
    });

    let agentReplyText: string;
    const responsePayload: Partial<MCPResponsePayload> = { sessionId: activeSession.id };

    if (genAI && (message || fileInfo)) {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });

        let fileContextForIntent = "";
        if (fileInfo) {
            fileContextForIntent = `O usuário enviou um anexo do tipo '${fileInfo.type}'.`;
            if (fileInfo.type === 'text' || fileInfo.type === 'json') {
                fileContextForIntent += ` Primeiras linhas do conteúdo: "${fileInfo.content.substring(0, 500)}"`;
            }
        }

        const intentPrompt = `
            Analisando a mensagem do usuário, o anexo e o histórico, qual é a intenção principal?
            MENSAGEM: "${message}".
            ANEXO: ${fileContextForIntent}
            HISTÓRICO RECENTE: ${history.slice(-4).map(h => h.text).join('; ')}
            
            Responda com uma das seguintes intenções: NAVEGAR, CRIAR_CAMPANHA, CRIAR_TAREFA, EXPORTAR_RELATORIO, ou CONVERSA_GERAL.
        `;
        const intentParts: Part[] = [{ text: intentPrompt }];
        if (fileInfo?.type === 'image') {
            intentParts.push({ inlineData: { mimeType: fileInfo.mimeType!, data: fileInfo.content } });
        }
        
        const intentResult = await model.generateContent({ contents: [{ role: 'user', parts: intentParts }] });
        const intentResponse = intentResult.response.text().trim();

        if (intentResponse.includes('CRIAR_TAREFA')) {
            agentReplyText = await handleCreateTask(userId, message, history);
        } else if (intentResponse.includes('CRIAR_CAMPANHA')) {
            const campaignDetails = await getCampaignDetailsFromContext(message, fileInfo);
            if (campaignDetails && campaignDetails.name) {
                const newCampaignData: InsertCampaign = { userId: userId, name: campaignDetails.name, description: campaignDetails.description || null, status: 'draft', platforms: [], objectives: campaignDetails.objectives || [], targetAudience: campaignDetails.targetAudience || null, };
                const createdCampaign = await storage.createCampaign(newCampaignData);
                agentReplyText = `Campanha **"${createdCampaign.name}"** criada com sucesso a partir do arquivo! Você pode editá-la na página de campanhas.`;
                responsePayload.action = "navigate"; responsePayload.payload = "/campaigns";
            } else {
                agentReplyText = "Entendi que você quer criar uma campanha, mas não consegui extrair informações suficientes. Poderia me dar um nome para a campanha?";
            }
        } else {
            const historyForGemini = history.map(msg => ({ role: msg.sender === 'user' ? 'user' : 'model', parts: [{ text: msg.text }] }));

            const systemPrompt = "Você é ubie, um assistente de IA. Seja conciso e útil. Use Markdown para formatar suas respostas.";
            const userParts: Part[] = [{ text: `${systemPrompt}\n${message}` }];
            
            if (fileInfo?.type === 'image') {
                userParts.push({ inlineData: { mimeType: fileInfo.mimeType!, data: fileInfo.content } });
            } else if (fileInfo?.type === 'text' || fileInfo?.type === 'json') {
                userParts[0].text += `\n\n--- CONTEÚDO DO ANEXO ---\n${fileInfo.content.substring(0, 6000)}`;
            }

            const chat = model.startChat({ history: historyForGemini });
            const result = await chat.sendMessage(userParts);
            agentReplyText = result.response.text();
        }
    } else {
        agentReplyText = `Recebido. ${!genAI ? 'O serviço de IA não está configurado.' : 'Por favor, envie uma mensagem de texto ou anexo válido.'}`;
    }

    await storage.addChatMessage({
        sessionId: activeSession.id,
        sender: 'agent',
        text: agentReplyText,
    });

    responsePayload.reply = agentReplyText;
    return responsePayload as MCPResponsePayload;
}


async function handleCreateTask(userId: number, message: string, history: ChatMessage[]): Promise<string> {
    const taskDetails = await getTaskDetailsFromContext(message, history);

    if (!taskDetails || !taskDetails.name) {
        return "Entendi que você quer criar uma tarefa, mas não consegui identificar o nome dela. Poderia repetir, por favor?";
    }

    if (!taskDetails.campaignName) {
        return "Para qual campanha você gostaria de adicionar esta tarefa?";
    }
    
    if (!taskDetails.phaseName) {
        return `Ok, entendi. Tarefa: **"${taskDetails.name}"**. \n\nEm qual fase da campanha **"${taskDetails.campaignName}"** ela se encaixa?`;
    }

    const foundCampaigns = await storage.searchCampaignsByName(userId, taskDetails.campaignName);
    if (foundCampaigns.length === 0) {
        return `Não encontrei nenhuma campanha chamada **"${taskDetails.campaignName}"**.`;
    }
    if (foundCampaigns.length > 1) {
        return `Encontrei várias campanhas com o nome **"${taskDetails.campaignName}"**. Poderia ser mais específico?`;
    }
    const campaign = foundCampaigns[0];

    const phase = await storage.getPhaseByName(campaign.id, taskDetails.phaseName);
    if (!phase) {
        const campaignDetails = await storage.getCampaignWithDetails(campaign.id, userId);
        const availablePhases = campaignDetails?.phases.map(p => p.name).join(', ') || 'Nenhuma fase encontrada';
        return `Não encontrei a fase **"${taskDetails.phaseName}"** na campanha **"${campaign.name}"**.\n\nAs fases disponíveis são: ${availablePhases}.`;
    }
    
    try {
        await storage.createTask({
            phaseId: phase.id,
            name: taskDetails.name,
            description: taskDetails.description || null,
            status: 'pending',
            assigneeId: userId
        });
        return `Tarefa **"${taskDetails.name}"** criada com sucesso na fase **"${phase.name}"** da campanha **"${campaign.name}"**!`;
    } catch (error) {
        console.error("Erro ao salvar tarefa:", error);
        return "Ocorreu um erro ao tentar salvar a tarefa no banco de dados.";
    }
}
