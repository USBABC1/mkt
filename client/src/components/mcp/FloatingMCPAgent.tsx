import React, { useEffect } from 'react';
import { useMCPStore } from '@/lib/mcpStore';
import { Button } from '@/components/ui/button';
import { ChatPanel } from './ChatPanel';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/lib/auth';
import { useLocation } from 'wouter';
import ubiePng from '../../img/ubie.png'; // ✅ NOVO: Importando a imagem do ubie

export const FloatingMCPAgent: React.FC = () => {
  const { isPanelOpen, togglePanel, setNavigateFunction } = useMCPStore();
  const { isAuthenticated } = useAuthStore();
  const [, navigateWouter] = useLocation();

  useEffect(() => {
    setNavigateFunction(navigateWouter);
  }, [setNavigateFunction, navigateWouter]);

  if (!isAuthenticated) {
    return null;
  }

  return (
    <>
      <Button
        onClick={togglePanel}
        variant="default"
        size="icon"
        className={cn(
          "fixed bottom-5 right-5 z-[99] h-16 w-16 rounded-full shadow-lg transition-all duration-300 ease-in-out transform hover:scale-110 focus:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          "bg-transparent p-0", // ✅ Fundo transparente para a imagem
          isPanelOpen ? "opacity-0 scale-0 pointer-events-none" : "opacity-100 scale-100 animate-float" // ✅ Animação adicionada
        )}
        aria-label="Abrir ubie"
      >
        {/* ✅ Ícone antigo removido e substituído por <img> */}
        <img 
          src={ubiePng} 
          alt="ubie, seu assistente de IA" 
          className="w-full h-full object-contain rounded-full" 
          style={{ filter: 'drop-shadow(0 4px 8px hsl(var(--primary)/0.4))' }}
        />
      </Button>
      <ChatPanel />
    </>
  );
};
