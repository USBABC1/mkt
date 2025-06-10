import { create } from 'zustand';
import { useAuthStore } from './auth';
import { useLocation } from 'wouter'; // Para navegação
import { apiRequest } from './api';

// Definir a interface da mensagem de chat que o frontend usa
export interface Message {
  id: string;
  text: string;
  sender: 'user' | 'agent' | 'system';
  timestamp: Date;
  sessionId?: number;
  attachmentUrl?: string; // Para exibir anexos
}

// Para a resposta da API do MCP
interface MCPResponse {
  reply: string;
  action?: 'navigate';
  payload?: string;
  sessionId: number;
}

// Interface para as sessões de chat salvas (do banco)
export interface ChatSession {
  id: number;
  userId: number;
  title: string;
  createdAt: string;
  updatedAt: string;
}

interface MCPState {
  isPanelOpen: boolean;
  messages: Message[];
  currentInput: string;
  isLoading: boolean;
  currentSessionId: number | null;
  chatSessions: ChatSession[];
  isSessionsLoading: boolean;
  
  togglePanel: () => void;
  addMessage: (message: Message) => void;
  setCurrentInput: (input: string) => void;
  clearCurrentInput: () => void;
  setLoading: (loading: boolean) => void;
  
  // Funções para gerenciamento de histórico
  setChatSessions: (sessions: ChatSession[]) => void;
  loadChatSessions: () => Promise<void>;
  startNewChat: (title?: string) => Promise<void>;
  loadSessionHistory: (sessionId: number, sessionTitle?: string) => Promise<void>;
  updateCurrentSessionTitle: (newTitle: string) => Promise<void>;
  deleteChatSession: (sessionId: number) => Promise<void>;

  navigate?: (to: string, options?: { replace?: boolean }) => void; 
  setNavigateFunction: (navigateFunc: (to: string, options?: { replace?: boolean }) => void) => void;
}

export const useMCPStore = create<MCPState>((set, get) => ({
  isPanelOpen: false,
  messages: [
    {
      id: 'initial-agent-message',
      text: 'Olá! Sou ubie, seu assistente de marketing digital. Como posso ajudar você hoje?',
      sender: 'agent',
      timestamp: new Date(),
    },
  ],
  currentInput: '',
  isLoading: false,
  currentSessionId: null,
  chatSessions: [],
  isSessionsLoading: false,
  navigate: undefined,

  setNavigateFunction: (navigateFunc) => set({ navigate: navigateFunc }),
  togglePanel: () => set((state) => ({ isPanelOpen: !state.isPanelOpen })),
  addMessage: (message) =>
    set((state) => ({ messages: [...state.messages, message] })),
  setCurrentInput: (input) => set({ currentInput: input }),
  clearCurrentInput: () => set({ currentInput: '' }),
  setLoading: (loading) => set({ isLoading: loading }),

  // --- Funções de Gerenciamento de Histórico ---
  setChatSessions: (sessions) => set({ chatSessions: sessions }),
  
  loadChatSessions: async () => {
    set({ isSessionsLoading: true });
    try {
      const response = await apiRequest('GET', '/api/chat/sessions');
      if (!response.ok) throw new Error('Falha ao carregar sessões de chat.');
      const sessions: ChatSession[] = await response.json();
      set({ chatSessions: sessions });
    } catch (error) {
      console.error('Erro ao carregar sessões de chat:', error);
    } finally {
      set({ isSessionsLoading: false });
    }
  },

  startNewChat: async (title?: string) => {
    set({ isLoading: true });
    try {
      const response = await apiRequest('POST', '/api/chat/sessions', { title: title || 'Nova Conversa' });
      if (!response.ok) throw new Error('Falha ao iniciar novo chat.');
      const newSession: ChatSession = await response.json();
      set({
        messages: [
            {
              id: 'initial-agent-message-new',
              text: 'Olá! Sou ubie. Uma nova conversa foi iniciada. Como posso ajudar?',
              sender: 'agent',
              timestamp: new Date(),
            },
        ],
        currentSessionId: newSession.id,
      });
      // Recarrega a lista de sessões para refletir a nova adição
      get().loadChatSessions(); 
    } catch (error) {
      console.error('Erro ao iniciar novo chat:', error);
      get().addMessage({ id: `error-new-chat-${Date.now()}`, text: 'Erro ao iniciar uma nova conversa.', sender: 'system', timestamp: new Date() });
    } finally {
      set({ isLoading: false });
    }
  },

  loadSessionHistory: async (sessionId: number, sessionTitle?: string) => {
    set({ isLoading: true });
    try {
      const response = await apiRequest('GET', `/api/chat/sessions/${sessionId}/messages`);
      if (!response.ok) throw new Error('Falha ao carregar histórico da sessão.');
      const messagesFromDb: any[] = await response.json();
      
      const formattedMessages: Message[] = messagesFromDb.map(msg => ({
        id: String(msg.id),
        text: msg.text,
        sender: msg.sender,
        timestamp: new Date(msg.timestamp),
        sessionId: msg.sessionId,
        attachmentUrl: msg.attachmentUrl
      }));

      set({
        messages: formattedMessages.length > 0 ? formattedMessages : [{ id: 'empty-session', text: `Sessão "${sessionTitle || 'Sem Título'}" carregada.`, sender: 'system', timestamp: new Date() }],
        currentSessionId: sessionId,
      });
    } catch (error) {
      console.error('Erro ao carregar histórico da sessão:', error);
      get().addMessage({ id: `error-load-history-${Date.now()}`, text: 'Erro ao carregar histórico da conversa.', sender: 'system', timestamp: new Date() });
    } finally {
      set({ isLoading: false });
    }
  },

  updateCurrentSessionTitle: async (newTitle: string) => {
    const { currentSessionId } = get();
    if (!currentSessionId || !newTitle.trim()) return;
    try {
      const response = await apiRequest('PUT', `/api/chat/sessions/${currentSessionId}/title`, { title: newTitle });
      if (!response.ok) throw new Error('Falha ao atualizar título da sessão.');
      const updatedSession: ChatSession = await response.json();
      set((state) => ({
        chatSessions: state.chatSessions.map((s) => (s.id === updatedSession.id ? updatedSession : s)),
      }));
      get().addMessage({ id: `system-title-update-${Date.now()}`, text: `Título da sessão atualizado para "${newTitle}".`, sender: 'system', timestamp: new Date() });
    } catch (error) {
      console.error('Erro ao atualizar título da sessão:', error);
      get().addMessage({ id: `error-update-title-${Date.now()}`, text: 'Erro ao atualizar o título da conversa.', sender: 'system', timestamp: new Date() });
    }
  },

  deleteChatSession: async (sessionId: number) => {
    try {
      const response = await apiRequest('DELETE', `/api/chat/sessions/${sessionId}`);
      if (!response.ok) throw new Error('Falha ao deletar sessão.');
      set((state) => ({
        chatSessions: state.chatSessions.filter((session) => session.id !== sessionId),
        currentSessionId: state.currentSessionId === sessionId ? null : state.currentSessionId,
      }));
      if (get().currentSessionId === null) {
        await get().startNewChat();
      }
    } catch (error) {
      console.error('Erro ao deletar sessão:', error);
    }
  }
}));


// ✅ CORREÇÃO E MELHORIA: A função agora aceita um attachmentUrl opcional.
export const sendMessageToMCP = async (text: string, attachmentUrl?: string | null): Promise<void> => {
  const { addMessage, setLoading, navigate, currentSessionId, startNewChat } = useMCPStore.getState();
  
  if (!text.trim() && !attachmentUrl) return;

  let sessionToUseId = currentSessionId;
  if (sessionToUseId === null) {
    await startNewChat();
    sessionToUseId = useMCPStore.getState().currentSessionId;
    if (sessionToUseId === null) {
      addMessage({ id: `error-session-creation-${Date.now()}`, text: 'Não foi possível iniciar uma nova sessão de chat.', sender: 'system', timestamp: new Date() });
      return;
    }
  }

  const userMessage: Message = {
    id: `user-${Date.now()}`,
    text: text,
    sender: 'user',
    timestamp: new Date(),
    sessionId: sessionToUseId,
    attachmentUrl: attachmentUrl || undefined,
  };
  addMessage(userMessage);
  setLoading(true);

  try {
    const response = await apiRequest('POST', '/api/mcp/converse', {
      message: text,
      sessionId: sessionToUseId,
      attachmentUrl: attachmentUrl
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Erro na API: ${response.statusText}`);
    }
    const data: MCPResponse = await response.json();

    const agentMessage: Message = {
      id: `agent-${Date.now()}`,
      text: data.reply,
      sender: 'agent',
      timestamp: new Date(),
      sessionId: data.sessionId,
    };
    addMessage(agentMessage);

    if (data.action === 'navigate' && data.payload && navigate) {
      setTimeout(() => {
        navigate(data.payload || '/', { replace: false });
        useMCPStore.getState().togglePanel();
      }, 1000); 
    }
  } catch (error: any) {
    addMessage({ id: `error-network-${Date.now()}`, text: `Falha de conexão: ${error.message}`, sender: 'system', timestamp: new Date() });
  } finally {
    setLoading(false);
  }
};
