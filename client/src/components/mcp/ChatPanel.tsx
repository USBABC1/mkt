import React, { useState, useRef, useEffect } from 'react';
import { useMCPStore, sendMessageToMCP, ChatSession } from '@/lib/mcpStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, X, RotateCcw, MoreVertical, Plus, History, Trash, Edit, Mic, StopCircle, Paperclip, Loader2 as SpinnerIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { apiRequest } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import ubiePng from '../../img/ubie.png';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

export const ChatPanel: React.FC = () => {
  const {
    isPanelOpen,
    togglePanel,
    messages,
    currentInput,
    setCurrentInput,
    clearCurrentInput,
    isLoading,
    currentSessionId,
    chatSessions,
    loadChatSessions,
    startNewChat,
    loadSessionHistory,
    updateCurrentSessionTitle,
    deleteChatSession,
    isSessionsLoading,
    addMessage,
  } = useMCPStore();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isEditTitleModalOpen, setIsEditTitleModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  const { toast } = useToast();

  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);
  const speechRecognitionAvailable = typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  useEffect(() => {
    if (isPanelOpen) {
      loadChatSessions();
      setTimeout(scrollToBottom, 100);
    }
  }, [isPanelOpen, loadChatSessions]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCurrentInput(e.target.value);
  };

  const handleSendMessage = async (e?: React.FormEvent<HTMLFormElement>) => {
    e?.preventDefault();
    const messageText = (currentInput || '').trim();
    if (!messageText || isLoading) return;
    
    clearCurrentInput();
    if (isListening && recognitionRef.current) {
        recognitionRef.current.stop();
        setIsListening(false);
    }
    await sendMessageToMCP(messageText);
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    addMessage({
        id: `uploading-${Date.now()}`,
        text: `Enviando anexo: ${file.name}...`,
        sender: 'system',
        timestamp: new Date()
    });

    const formData = new FormData();
    formData.append('attachment', file);

    try {
        const response = await apiRequest('POST', '/api/mcp/upload-attachment', formData, true);
        const result = await response.json();
        
        if (result.url) {
            await sendMessageToMCP(`Anexo enviado: ${file.name}`, result.url);
        } else {
            throw new Error("URL do anexo não retornada pelo servidor.");
        }
    } catch (error) {
        console.error("Erro no upload do anexo:", error);
        toast({ title: "Erro de Upload", description: (error as Error).message, variant: "destructive" });
        addMessage({ id: `error-upload-${Date.now()}`, text: `Falha ao enviar ${file.name}.`, sender: 'system', timestamp: new Date()});
    } finally {
        setIsUploading(false);
        if(fileInputRef.current) fileInputRef.current.value = "";
    }
  };
  
    const handleVoiceInput = () => {
    if (!speechRecognitionAvailable) {
      addMessage({
        id: `speech-error-${Date.now()}`,
        text: 'Seu navegador não suporta reconhecimento de voz. Tente usar Chrome ou Edge.',
        sender: 'system',
        timestamp: new Date(),
      });
      return;
    }

    if (!recognitionRef.current) {
        const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
        recognitionRef.current = new SpeechRecognitionAPI();
        recognitionRef.current.continuous = false;
        recognitionRef.current.lang = 'pt-BR';
        recognitionRef.current.interimResults = true;

        recognitionRef.current.onstart = () => setIsListening(true);
        
        recognitionRef.current.onresult = (event: any) => {
            let interimTranscript = '';
            let finalTranscript = '';
            for (let i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) {
                    finalTranscript += event.results[i][0].transcript;
                } else {
                    interimTranscript += event.results[i][0].transcript;
                }
            }
            if (interimTranscript) {
                setCurrentInput(interimTranscript);
            }
            if (finalTranscript) {
                sendMessageToMCP(finalTranscript.trim());
                clearCurrentInput();
            }
        };

        recognitionRef.current.onerror = (event: any) => {
            console.error('Erro de reconhecimento de voz:', event.error, event.message);
            let errorMessage = 'Ocorreu um erro durante o reconhecimento de voz.';
            if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
                errorMessage = 'Permissão para usar o microfone foi negada. Por favor, habilite o acesso nas configurações do seu navegador.';
            } else if (event.error === 'no-speech') {
                errorMessage = 'Nenhuma fala foi detectada. Tente novamente.';
            }
            addMessage({ id: `speech-error-detail-${Date.now()}`, text: errorMessage, sender: 'system', timestamp: new Date() });
            setIsListening(false);
            setCurrentInput(prev => (prev || '').replace(/Ouvindo\.\.\./, '').trim());
        };

        recognitionRef.current.onend = () => {
            setIsListening(false);
            setCurrentInput(prev => (prev || '').replace(/Ouvindo\.\.\./, '').trim());
        };
    }
    
    if (!isListening) {
      try {
        setCurrentInput('Ouvindo...');
        recognitionRef.current.start();
      } catch (error) {
          console.error("Erro ao iniciar reconhecimento de voz:", error);
          setIsListening(false);
          setCurrentInput('');
           addMessage({ id: `speech-error-start-${Date.now()}`, text: "Não foi possível iniciar a captura de voz.", sender: 'system', timestamp: new Date() });
      }
    } else {
        recognitionRef.current.stop();
    }
  };

  const handleStartNewChat = async () => {
    await startNewChat();
    setIsHistoryModalOpen(false);
  };

  const handleLoadSession = async (session: ChatSession) => {
    await loadSessionHistory(session.id, session.title);
    setIsHistoryModalOpen(false);
  };

  const handleEditTitleClick = () => {
    const currentSession = chatSessions.find(s => s.id === currentSessionId);
    setNewTitle(currentSession?.title || `Sessão #${currentSessionId || new Date().toLocaleDateString('pt-BR')}`);
    setIsEditTitleModalOpen(true);
  };

  const handleSaveTitle = async () => {
    if (newTitle.trim() && currentSessionId) {
      await updateCurrentSessionTitle(newTitle.trim());
      setIsEditTitleModalOpen(false);
    }
  };

  const handleDeleteSession = async (sessionId: number) => {
    if (window.confirm('Tem certeza que deseja excluir esta conversa?')) {
      await deleteChatSession(sessionId);
    }
  };
  
  const CommandSuggestions = () => {
    const suggestions = ["Criar uma campanha", "Criar tarefa para campanha X", "Ver resumo da campanha Y"];
    const handleSuggestionClick = (suggestion: string) => {
        setCurrentInput(suggestion);
        inputRef.current?.focus();
    };
    if (messages.length > 2) return null;

    return (
        <div className="p-2 border-t border-border flex flex-wrap gap-2">
            {suggestions.map(s => (
                <Button key={s} variant="outline" size="sm" className="text-xs h-auto py-1 px-2" onClick={() => handleSuggestionClick(s)}>
                    {s}
                </Button>
            ))}
        </div>
    );
  };

  if (!isPanelOpen) {
    return null;
  }

  const currentChatTitle = currentSessionId 
    ? chatSessions.find(s => s.id === currentSessionId)?.title || `Sessão #${currentSessionId}`
    : 'Nova Conversa';

  return (
    <div
      className={cn( "fixed bottom-20 right-5 z-[100] w-full max-w-md h-[70vh] max-h-[600px] bg-card border border-border shadow-xl rounded-lg flex flex-col transition-all duration-300 ease-in-out", isPanelOpen ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10 pointer-events-none" )}
      role="dialog" aria-modal="true" aria-labelledby="mcp-chat-panel-title"
    >
      <header className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-3">
          <img src={ubiePng} alt="Avatar do ubie" className="w-8 h-8 rounded-full" />
          <h3 id="mcp-chat-panel-title" className="font-semibold text-lg text-foreground truncate max-w-[calc(100%-120px)]">
            ubie: {currentChatTitle}
          </h3>
        </div>
        <div className="flex items-center gap-2">
           <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" title="Opções da Conversa" aria-label="Opções da Conversa">
                <MoreVertical className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="z-[101]"> 
              <DropdownMenuItem onClick={handleStartNewChat}>
                <Plus className="mr-2 h-4 w-4" /> Nova Conversa
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleEditTitleClick} disabled={!currentSessionId}>
                <Edit className="mr-2 h-4 w-4" /> Renomear Conversa
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setIsHistoryModalOpen(true)}>
                <History className="mr-2 h-4 w-4" /> Ver Histórico
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => { if(currentSessionId) handleDeleteSession(currentSessionId); }} disabled={!currentSessionId} className="text-destructive">
                <Trash className="mr-2 h-4 w-4" /> Excluir Conversa
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="ghost" size="icon" onClick={togglePanel} title="Fechar Painel" aria-label="Fechar painel do ubie">
            <X className="h-5 w-5" />
          </Button>
        </div>
      </header>

      <ScrollArea className="flex-grow p-4">
        <div className="space-y-4">
          {messages.map((msg) => (
            <div key={msg.id} className={cn("flex items-end gap-2", msg.sender === 'user' ? 'justify-end' : 'justify-start')}>
              {msg.sender === 'agent' && (
                  <img src={ubiePng} alt="Avatar do ubie" className="w-6 h-6 rounded-full self-start" />
              )}
              <div
                className={cn(
                  "flex flex-col p-3 rounded-lg max-w-[85%]",
                  msg.sender === 'user' ? 'bg-primary text-primary-foreground rounded-br-none' :
                  msg.sender === 'agent' ? 'bg-muted text-muted-foreground rounded-bl-none prose dark:prose-invert prose-sm max-w-full' :
                  'bg-transparent text-xs text-muted-foreground self-center text-center w-full py-1'
                )}
              >
                {msg.sender === 'agent' ? (
                    <ReactMarkdown remarkPlugins={[remarkGfm]} components={{ a: ({node, ...props}) => <a {...props} target="_blank" rel="noopener noreferrer" className="text-primary underline" /> }}>{msg.text}</ReactMarkdown>
                ) : (
                    <p className={cn("text-sm whitespace-pre-wrap", msg.sender === 'system' ? 'italic' : '')}>{msg.text}</p>
                )}
                 {msg.sender !== 'system' && (
                    <span className={cn("text-xs mt-1", msg.sender === 'user' ? 'text-primary-foreground/70 self-end' : 'text-muted-foreground/70 self-start')}>
                      {format(msg.timestamp, 'HH:mm', { locale: ptBR })}
                    </span>
                  )}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex items-end gap-2 justify-start">
               <img src={ubiePng} alt="Avatar do ubie" className="w-6 h-6 rounded-full self-start" />
               <div className="bg-muted text-muted-foreground rounded-lg p-3 inline-flex items-center space-x-2 rounded-bl-none">
                <RotateCcw className="h-4 w-4 animate-spin" />
                <span>Digitando...</span>
              </div>
            </div>
          )}
        </div>
        <div ref={messagesEndRef} />
      </ScrollArea>
      
      <CommandSuggestions />

      <form onSubmit={handleSendMessage} className="p-4 border-t border-border bg-background">
        <div className="flex items-center gap-2">
           <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" />
          <Button type="button" variant="ghost" size="icon" title="Anexar arquivo" aria-label="Anexar arquivo" disabled={isLoading || isUploading} onClick={() => fileInputRef.current?.click()}>
            {isUploading ? <SpinnerIcon className="h-5 w-5 animate-spin" /> : <Paperclip className="h-5 w-5" />}
          </Button>

          <Input
            ref={inputRef}
            id="mcp-message-input"
            name="mcp-message-input"
            type="text"
            placeholder="Digite sua mensagem..."
            value={currentInput}
            onChange={handleInputChange}
            className="flex-grow"
            disabled={isLoading || isUploading} 
          />
          {speechRecognitionAvailable && (
            <Button 
              type="button" 
              variant="ghost" 
              size="icon" 
              onClick={handleVoiceInput} 
              title={isListening ? "Parar de ouvir" : "Ativar entrada de voz"} 
              aria-label={isListening ? "Parar de ouvir" : "Ativar entrada de voz"} 
              disabled={isLoading || isUploading} 
            >
              {isListening ? <StopCircle className="h-5 w-5 text-destructive animate-pulse" /> : <Mic className="h-5 w-5" />}
            </Button>
          )}
          <Button type="submit" size="icon" disabled={isLoading || isUploading || !(currentInput || '').trim()} aria-label="Enviar mensagem">
            <Send className="h-5 w-5" />
          </Button>
        </div>
      </form>

      <Dialog open={isHistoryModalOpen} onOpenChange={setIsHistoryModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Histórico de Conversas</DialogTitle>
            <DialogDescription>
              Selecione uma conversa para carregar o histórico.
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[400px] py-4">
            <div className="grid gap-4">
                {isSessionsLoading ? (
                <div className="text-center text-muted-foreground">Carregando...</div>
                ) : chatSessions.length === 0 ? (
                <div className="text-center text-muted-foreground">Nenhuma conversa salva.</div>
                ) : (
                chatSessions.map((session) => (
                    <div key={session.id} className="flex items-center justify-between p-2 border rounded-md hover:bg-muted">
                    <div onClick={() => handleLoadSession(session)} className="flex-grow cursor-pointer pr-2">
                        <h4 className="font-medium text-sm truncate">{session.title}</h4>
                        <p className="text-xs text-muted-foreground">
                        {format(new Date(session.updatedAt), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                        </p>
                    </div>
                    <Button variant="ghost" size="icon" className="ml-auto flex-shrink-0" onClick={(e) => { e.stopPropagation(); handleDeleteSession(session.id); }} title="Excluir Conversa">
                        <Trash className="h-4 w-4 text-destructive" />
                    </Button>
                    </div>
                ))
                )}
            </div>
          </ScrollArea>
          <DialogFooter>
            <Button onClick={handleStartNewChat}>
              <Plus className="mr-2 h-4 w-4" /> Nova Conversa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditTitleModalOpen} onOpenChange={setIsEditTitleModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Renomear Conversa</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <Label htmlFor="newTitle"> 
              Novo Título
            </Label>
            <Input
              id="newTitle"
              name="newTitle"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              className="col-span-3"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditTitleModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveTitle}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
