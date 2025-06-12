// client/src/components/StudioEditorComponent.tsx
import React, { useEffect, useRef, useCallback, useState } from 'react';
import { LandingPage, InsertLandingPage } from '@shared/schema';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

interface StudioEditorComponentProps {
  initialData: LandingPage | null;
  onBack: () => void;
}

export const StudioEditorComponent = ({ initialData, onBack }: StudioEditorComponentProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const editorRef = useRef<HTMLDivElement>(null);
  const studioInstanceRef = useRef<any>(null);
  const [isInitializing, setIsInitializing] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);

  const saveLpMutation = useMutation({
    mutationFn: async (data: { grapesJsData: any }) => {
        const isEditing = !!initialData?.id;
        const endpoint = isEditing ? `/api/landingpages/${initialData.id}` : '/api/landingpages';
        const method = isEditing ? 'PUT' : 'POST';

        const name = studioInstanceRef.current?.getProject()?.get('name') || initialData?.name || 'Nova Página';
        const slug = studioInstanceRef.current?.getProject()?.get('slug') || initialData?.slug || `pagina-${Date.now()}`;
        
        const payload: Partial<InsertLandingPage> = { name, slug, grapesJsData: data.grapesJsData, status: 'draft' };

        const response = await apiRequest(method, endpoint, payload);
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Falha ao salvar a landing page.');
        }
        return response.json();
    },
    onSuccess: () => {
      toast({ title: "Sucesso!", description: "Landing page salva com sucesso." });
      queryClient.invalidateQueries({ queryKey: ['landingPages'] });
      onBack();
    },
    onError: (error: any) => {
      toast({ title: "Erro ao Salvar", description: error.message, variant: "destructive" });
    }
  });

  const initializeEditor = useCallback(async () => {
    if (!editorRef.current || studioInstanceRef.current || isInitializing) {
      return;
    }

    setIsInitializing(true);
    setInitError(null);

    try {
      console.log('Starting GrapesJS Studio initialization...');

      // Test the import first
      const testModule = await import('@grapesjs/studio-sdk');
      console.log('Module imported successfully:', {
        hasDefault: !!testModule.default,
        hasStudioSDK: !!(testModule as any).StudioSDK,
        moduleKeys: Object.keys(testModule),
        defaultType: typeof testModule.default,
        moduleType: typeof testModule
      });

      // Import CSS
      await import('@grapesjs/studio-sdk/dist/style.css');

      // Try different approaches to get the constructor
      let StudioSDK: any = null;
      
      if (testModule.default && typeof testModule.default === 'function') {
        StudioSDK = testModule.default;
        console.log('Using default export as constructor');
      } else if ((testModule as any).StudioSDK && typeof (testModule as any).StudioSDK === 'function') {
        StudioSDK = (testModule as any).StudioSDK;
        console.log('Using named StudioSDK export');
      } else if (typeof testModule === 'function') {
        StudioSDK = testModule;
        console.log('Using module itself as constructor');
      } else {
        // Check for other possible export names
        const possibleNames = ['Studio', 'GrapesJSStudio', 'SDK', 'StudioEditor'];
        for (const name of possibleNames) {
          if ((testModule as any)[name] && typeof (testModule as any)[name] === 'function') {
            StudioSDK = (testModule as any)[name];
            console.log(`Using ${name} export as constructor`);
            break;
          }
        }
      }

      if (!StudioSDK || typeof StudioSDK !== 'function') {
        throw new Error(`Could not find a valid constructor. Available exports: ${Object.keys(testModule).join(', ')}`);
      }

      // Load plugins with error handling
      let plugins: any[] = [];
      try {
        const studioPlugins = await import('@grapesjs/studio-sdk-plugins');
        console.log('Plugins loaded:', Object.keys(studioPlugins));
        
        const pluginList = [
          studioPlugins.pluginForms,
          studioPlugins.pluginCustomCode,
          studioPlugins.pluginExport,
          studioPlugins.pluginTooltip,
          studioPlugins.pluginAvatars
        ];
        
        plugins = pluginList.filter(plugin => plugin && typeof plugin === 'function');
        console.log(`Loaded ${plugins.length} plugins`);
      } catch (pluginError) {
        console.warn('Could not load studio plugins:', pluginError);
      }

      const config = {
        container: editorRef.current,
        plugins: plugins,
        project: initialData?.id ? {
          id: String(initialData.id),
          main: initialData.grapesJsData,
        } : {
          name: 'Nova Landing Page',
          template: '@grapesjs/template-blank',
        },
        onSave: (data: any) => {
          console.log('Save triggered with data:', data);
          saveLpMutation.mutate({ grapesJsData: data.project.main });
        },
        getBackLink: () => {
          const backLink = document.createElement('button');
          backLink.className = 'absolute top-3 left-3 z-10 inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-secondary text-secondary-foreground hover:bg-secondary/80 h-10 px-4 py-2';
          backLink.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-arrow-left mr-2 h-4 w-4"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg> Voltar`;
          backLink.onclick = onBack;
          return backLink;
        }
      };
      
      console.log('Initializing with config:', config);
      
      // Create the instance
      studioInstanceRef.current = new StudioSDK(config);
      console.log('GrapesJS Studio initialized successfully');
      
    } catch (error) {
      console.error('Failed to initialize GrapesJS Studio:', error);
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
  }, [initialData, onBack, saveLpMutation, toast, isInitializing]);

  useEffect(() => {
    // Add a small delay to avoid initialization issues with React StrictMode
    const timer = setTimeout(() => {
      initializeEditor();
    }, 100);

    return () => {
      clearTimeout(timer);
      if (studioInstanceRef.current) {
        try {
          if (typeof studioInstanceRef.current.destroy === 'function') {
            studioInstanceRef.current.destroy();
          }
        } catch (error) {
          console.warn('Error destroying studio instance:', error);
        }
        studioInstanceRef.current = null;
      }
    };
  }, []); // Empty dependency array to run only once

  // Show loading or error state
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
                initializeEditor();
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
      <div ref={editorRef} style={{ flexGrow: 1 }} />
    </div>
  );
};
