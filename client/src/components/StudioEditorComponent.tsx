// client/src/components/StudioEditorComponent.tsx
import React, { useEffect, useRef, useCallback, useState } from 'react';
import { LandingPage, InsertLandingPage } from '@shared/schema';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

// ✅ CORREÇÃO: Importações estáticas em vez de dinâmicas
import StudioSDK from '@grapesjs/studio-sdk';
import * as studioPlugins from '@grapesjs/studio-sdk-plugins';
import '@grapesjs/studio-sdk/dist/style.css';


interface StudioEditorComponentProps {
  initialData: LandingPage | null;
  onBack: () => void;
}

export const StudioEditorComponent = ({ initialData, onBack }: StudioEditorComponentProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const editorRef = useRef<HTMLDivElement>(null);
  const studioInstanceRef = useRef<any>(null);
  const [isInitializing, setIsInitializing] = useState(true); // Inicia como true
  const [initError, setInitError] = useState<string | null>(null);

  const saveLpMutation = useMutation({
    mutationFn: async (data: { grapesJsData: any }) => {
      const isEditing = !!initialData?.id;
      // ✅ CORREÇÃO: Usa o ID do `initialData` para PUT, senão é POST
      const endpoint = isEditing ? `/api/landingpages/${initialData.id}` : '/api/landingpages';
      const method = isEditing ? 'PUT' : 'POST';

      const name = studioInstanceRef.current?.getProject()?.name || initialData?.name || 'Nova Página';
      // No modo de edição, não geramos um novo slug
      const slug = isEditing ? initialData.slug : (name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || `pagina-${Date.now()}`);
      
      const payload: Partial<InsertLandingPage> = { 
        name, 
        slug, 
        grapesJsData: data.grapesJsData, 
        status: initialData?.status || 'draft',
      };

      const response = await apiRequest(method, endpoint, payload);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Falha ao salvar a landing page.');
      }
      return response.json();
    },
    onSuccess: (data) => {
      toast({ title: "Sucesso!", description: "Landing page salva com sucesso." });
      queryClient.invalidateQueries({ queryKey: ['landingPages'] });
      // Não é mais necessário, o onBack vai fechar o editor
      // onBack();
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao Salvar", description: error.message, variant: "destructive" });
    }
  });

  // ✅ CORREÇÃO: Simplificado o useEffect para usar as importações estáticas
  useEffect(() => {
    if (!editorRef.current || studioInstanceRef.current) return;

    let studio: any;

    try {
      const plugins = [
        studioPlugins.pluginForms,
        studioPlugins.pluginCustomCode,
        studioPlugins.pluginExport,
        studioPlugins.pluginTooltip,
        studioPlugins.pluginAvatars,
      ].filter(plugin => typeof plugin === 'function');

      const config: any = {
        container: editorRef.current,
        plugins,
        project: initialData?.grapesJsData ? {
          id: String(initialData.id),
          main: initialData.grapesJsData,
        } : {
          name: initialData?.name || 'Nova Landing Page',
          template: '@grapesjs/template-blank',
        },
        onSave: (data: any) => saveLpMutation.mutate({ grapesJsData: data.project.main }),
        getBackLink: () => {
          const backLink = document.createElement('button');
          backLink.className = 'absolute top-3 left-3 z-10 inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-secondary text-secondary-foreground hover:bg-secondary/80 h-10 px-4 py-2';
          backLink.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-arrow-left mr-2 h-4 w-4"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg> Voltar`;
          backLink.onclick = onBack;
          return backLink;
        },
        autoSave: true,
        autosaveInterval: 300000,
      };

      // `new StudioSDK(config)` é a forma correta de usar a classe importada
      studio = new StudioSDK(config);
      studioInstanceRef.current = studio;
      setInitError(null);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setInitError(errorMessage);
      toast({ 
        title: "Erro de Inicialização", 
        description: `Falha ao carregar o editor: ${errorMessage}`, 
        variant: "destructive" 
      });
    } finally {
      setIsInitializing(false);
    }

    return () => {
      if (studio) {
        studio.destroy();
        studioInstanceRef.current = null;
      }
    };
  }, [initialData, onBack, saveLpMutation, toast]);

  if (isInitializing) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Carregando editor...</p>
        </div>
      </div>
    );
  }

  if (initError) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-background">
        <div className="text-center max-w-md">
          <div className="text-red-500 mb-4">
            <svg className="h-12 w-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold mb-2">Erro ao Carregar Editor</h3>
          <p className="text-sm text-muted-foreground mb-4">{initError}</p>
          <div className="space-x-2">
            <button 
              onClick={() => {
                setInitError(null);
                setIsInitializing(true);
                // A re-inicialização será acionada pelo useEffect
              }}
              className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
            >
              Tentar Novamente
            </button>
            <button 
              onClick={onBack}
              className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2"
            >
              Voltar
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-full flex flex-col bg-background">
      <div ref={editorRef} className="flex-grow" />
    </div>
  );
};
