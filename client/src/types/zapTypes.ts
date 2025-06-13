// Conteúdo para: zapTypes.ts
import { Node, Edge } from '@xyflow/react';

// --- Tipos Gerais ---
export type CampaignSelectItem = { id: string; name: string; };

export interface FlowElementData {
    nodes: Node<AllNodeDataTypes, string | undefined>[];
    edges: Edge[];
}

export type FlowData = {
    id: number;
    name: string;
    status: 'active' | 'inactive' | 'draft';
    user_id?: number | null; // Mantido como no seu manual (user_id)
    campaign_id?: string | null; // Mantido como no seu flow.tsx (campaign_id pode ser string)
    elements?: FlowElementData | null;
    created_at?: string;
    updated_at?: string;
};

export interface AppSettings {
    defaultMessageDelayMs: number;
    unknownMessageResponse: 'ignore' | 'defaultReply' | 'forwardAdmin';
    defaultReplyMessage: string;
    adminForwardNumber: string;
    defaultInputTimeoutSeconds: number;
    enableBusinessHours: boolean;
    businessHoursStart: string; // Formato HH:MM
    businessHoursEnd: string;   // Formato HH:MM
    outsideHoursMessage: string;
}

export interface Contact {
    jid: string;
    name?: string;
    notify?: string;
    imgUrl?: string;
}

// --- Base para todos os Tipos de Dados dos Nós ---
export interface BaseNodeData extends Record<string, unknown> {
    label?: string;
}

// --- Tipos de Dados dos Nós (Node Data) ---
export interface TextMessageNodeData extends BaseNodeData { text: string; }
export interface ButtonOption { id: string; text: string; }
export interface ButtonMessageNodeData extends BaseNodeData { text: string; buttons: ButtonOption[]; footer?: string; }
export interface ImageNodeData extends BaseNodeData { url: string; caption?: string; }
export interface AudioNodeData extends BaseNodeData { url: string; caption?: string; ptt?: boolean; }
export interface FileNodeData extends BaseNodeData { url: string; filename?: string; mimetype?: string; }
export interface LocationNodeData extends BaseNodeData { latitude: string; longitude: string; name?: string; address?: string; }
export interface DelayNodeData extends BaseNodeData { duration: number; unit: 'seconds' | 'minutes'; }

export interface ListItem { id: string; title: string; description?: string; }
export interface ListSection { id: string; title: string; rows: ListItem[]; }
export interface ListMessageNodeData extends BaseNodeData {
    text: string; // Corpo da mensagem de lista
    title: string; // Título da lista em si
    buttonText: string; // Texto do botão que abre a lista
    sections: ListSection[];
    footer?: string;
}

export interface WaitInputNodeData extends BaseNodeData { variableName: string; message?: string; timeoutSeconds?: number; }
export interface SetVariableNodeData extends BaseNodeData { variableName: string; value: string; }
export interface ConditionNodeData extends BaseNodeData {
    variableName: string;
    comparison: 'equals' | 'contains' | 'startsWith' | 'endsWith' | 'isSet' | 'isNotSet' | 'greaterThan' | 'lessThan' | 'greaterOrEquals' | 'lessOrEquals' | 'regex';
    value?: string;
}
export interface TimeConditionNodeData extends BaseNodeData { startTime: string; endTime: string; }

export interface ApiCallNodeData extends BaseNodeData {
    apiUrl: string;
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
    headers?: string; // JSON string
    body?: string;    // JSON string or text
    saveResponseTo?: string;
    timeoutMs?: number;
}
export interface WebhookCallNodeData extends BaseNodeData, Omit<ApiCallNodeData, 'method'|'timeoutMs'> {
    method: 'GET' | 'POST'; // Webhooks geralmente são GET ou POST
}

export interface GPTQueryNodeData extends BaseNodeData {
    prompt: string;
    systemMessage?: string;
    apiKeyVariable: string; // Nome da variável de ambiente que contém a API Key
    saveResponseTo: string;
    model?: string; // Ex: 'gemini-1.5-flash-latest'
    temperature?: number;
    maxTokens?: number;
}

export interface AIAgentNodeData extends BaseNodeData { // Se você tiver um nó de Agente IA genérico
    agentSystemContext: string;
    apiKeyVariableName?: string;
    model?: string;
    temperature?: number;
    maxTokens?: number;
}

export interface AssignAgentNodeData extends BaseNodeData { department?: string; agentId?: string; message?: string; } // agentId pode ser um ID do seu sistema
export interface EndFlowNodeData extends BaseNodeData { text?: string; reason?: string; }
export interface GoToFlowNodeData extends BaseNodeData { targetFlowId: string; } // ID do fluxo no seu DB
export interface TagContactNodeData extends BaseNodeData { tagName: string; action: 'add' | 'remove'; }
export interface LoopNodeData extends BaseNodeData { repetitions: number; }


// --- Outros Tipos ---
export interface NodeContextMenuProps {
    id: string;
    top: number;
    left: number;
    nodeType: string | undefined;
}

// União de todos os tipos de dados possíveis para os nós
export type AllNodeDataTypes =
    | TextMessageNodeData
    | ButtonMessageNodeData
    | ImageNodeData
    | AudioNodeData
    | FileNodeData
    | LocationNodeData
    | ListMessageNodeData
    | DelayNodeData
    | WaitInputNodeData
    | SetVariableNodeData
    | ConditionNodeData
    | TimeConditionNodeData
    | LoopNodeData
    | ApiCallNodeData
    | WebhookCallNodeData
    | GPTQueryNodeData
    | AIAgentNodeData
    | TagContactNodeData
    | GoToFlowNodeData
    | AssignAgentNodeData
    | EndFlowNodeData
    | BaseNodeData; // Inclui BaseNodeData para tipos não explicitamente listados mas que podem estendê-lo

export type ConfigurableNodeDataTypes = GPTQueryNodeData | AIAgentNodeData; // Exemplo
