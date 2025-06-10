// server/flow-executor.ts
import { Flow, FlowElementData } from '../shared/schema';
import { WhatsappConnectionService } from './services/whatsapp-connection.service';
import { storage } from './storage';
import pino from 'pino';
import { WAMessage } from '@whiskeysockets/baileys';

const logger = pino({ level: 'debug' }).child({ module: 'FlowExecutor' });

interface ContactFlowState {
  flowId: number;
  currentNodeId: string | null;
  variables: Record<string, any>;
  waitingForInput: boolean; // Flag para indicar se estamos esperando uma resposta
  variableToSave?: string; // Qual variável salvar
  lastMessageTimestamp: number;
}

const contactStates = new Map<string, ContactFlowState>();

function findStartNodeId(elements: FlowElementData): string | null {
  if (!elements.nodes || elements.nodes.length === 0) return null;
  const targetNodeIds = new Set(elements.edges.map(edge => edge.target));
  const startNode = elements.nodes.find(node => !targetNodeIds.has(node.id));
  return startNode ? startNode.id : null;
}

// ✅ CORREÇÃO: Nova função para encontrar o próximo nó
function findNextNodeId(elements: FlowElementData, sourceNodeId: string, sourceHandleId: string = 'source-bottom'): string | null {
    const edge = elements.edges.find(e => e.source === sourceNodeId && e.sourceHandle === sourceHandleId);
    return edge ? edge.target : null;
}


async function executeNode(
    userId: number, 
    contactJid: string, 
    node: any,
    state: ContactFlowState,
    whatsappService: WhatsappConnectionService,
    flow: Flow
) {
    logger.info({ userId, contactJid, nodeType: node.type, nodeId: node.id }, "Executando nó.");
    state.currentNodeId = node.id;
    state.waitingForInput = false; // Resetamos a flag
    contactStates.set(contactJid, state);

    let nextNodeId: string | null = null;

    switch (node.type) {
        case 'textMessage':
            const textMessageData = node.data;
            if (textMessageData && typeof textMessageData.text === 'string') {
                await whatsappService.sendMessage(contactJid, { text: textMessageData.text });
            }
            nextNodeId = findNextNodeId(flow.elements!, node.id);
            break;
        
        // ✅ CORREÇÃO: Implementação do nó "Aguardar Input"
        case 'waitInput':
            const waitInputData = node.data;
            if(waitInputData.message) {
                 await whatsappService.sendMessage(contactJid, { text: waitInputData.message });
            }
            state.waitingForInput = true;
            state.variableToSave = waitInputData.variableName || 'userInput';
            contactStates.set(contactJid, state);
            // O fluxo para aqui e não define um nextNodeId, aguardando o próximo input do usuário.
            break;
        
        default:
            logger.warn({ nodeType: node.type, nodeId: node.id }, "Tipo de nó não implementado na execução.");
            break;
    }
    
    if (nextNodeId) {
        const nextNode = flow.elements!.nodes.find(n => n.id === nextNodeId);
        if (nextNode) {
            await executeNode(userId, contactJid, nextNode, state, whatsappService, flow);
        } else {
             logger.warn({ flowId: flow.id, nextNodeId }, "Próximo nó não encontrado no fluxo.");
        }
    }
}


export async function processIncomingMessage(
  userId: number,
  contactJid: string,
  message: WAMessage,
  whatsappService: WhatsappConnectionService
) {
  try {
    const messageText = message.message?.conversation || message.message?.extendedTextMessage?.text || '';
    let currentState = contactStates.get(contactJid);
    const activeFlow = await storage.getActiveFlow(userId);

    if (!activeFlow || !activeFlow.elements) {
      logger.warn({ userId, contactJid }, "Nenhum fluxo ativo ou com elementos encontrado.");
      return;
    }

    // Se o estado atual for de um fluxo diferente, reseta.
    if (currentState && currentState.flowId !== activeFlow.id) {
      currentState = undefined;
    }
    
    if (currentState && currentState.waitingForInput) {
        // Estávamos esperando uma resposta, vamos processá-la.
        logger.info({ userId, contactJid, variable: currentState.variableToSave, value: messageText }, "Input do usuário recebido e salvo.");
        currentState.variables[currentState.variableToSave!] = messageText;
        currentState.waitingForInput = false;
        
        const lastNodeId = currentState.currentNodeId;
        const nextNodeId = findNextNodeId(activeFlow.elements, lastNodeId!, 'source-received'); // Saída de sucesso do waitInput
        
        if (nextNodeId) {
            const nextNode = activeFlow.elements.nodes.find(n => n.id === nextNodeId);
            if (nextNode) {
                await executeNode(userId, contactJid, nextNode, currentState, whatsappService, activeFlow);
            }
        } else {
            logger.info({flowId: activeFlow.id}, "Fim do fluxo após input do usuário.")
        }
        
    } else {
        // Inicia um novo fluxo para este contato
        const startNodeId = findStartNodeId(activeFlow.elements);
        if (!startNodeId) {
            logger.error({ flowId: activeFlow.id }, "Fluxo ativo não possui um nó inicial definido.");
            return;
        }
        
        const newState: ContactFlowState = {
            flowId: activeFlow.id,
            currentNodeId: startNodeId,
            variables: {},
            waitingForInput: false,
            lastMessageTimestamp: Date.now(),
        };
        
        const startNode = activeFlow.elements.nodes.find(n => n.id === startNodeId);
        if (startNode) {
            await executeNode(userId, contactJid, startNode, newState, whatsappService, activeFlow);
        }
    }

  } catch (error) {
    logger.error({ userId, contactJid, error }, "Erro geral ao processar mensagem no motor de fluxo.");
  }
}
