// client/src/components/StudioEditorComponent.tsx
import React, { useEffect, useRef } from 'react';
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

  useEffect(() => {
    const initializeEditor = async () => {
      if (editorRef.current && !studioInstanceRef.current) {
        try {
          // Import CSS first
          await import('@grapesjs/studio-sdk/dist/style.css');

          // Dynamic import with better error handling
          const GrapesJSStudioModule = await import('@grapesjs/studio-sdk');
          
          // Try multiple ways to access the constructor
          let StudioSDK: any;
          if (GrapesJSStudioModule.default) {
            StudioSDK = GrapesJSStudioModule.default;
          } else if (GrapesJSStudioModule.StudioSDK) {
            StudioSDK = GrapesJSStudioModule.StudioSDK;
          } else {
            // Fallback: use the module itself if it's a constructor
            StudioSDK = GrapesJSStudioModule;
          }

          // Verify it's a constructor
          if (typeof StudioSDK !== 'function') {
            throw new Error('StudioSDK is not a constructor function');
          }

          // Import plugins with better error handling
          let plugins: any[] = [];
          try {
            const studioPlugins = await import('@grapesjs/studio-sdk-plugins');
            plugins = [
              studioPlugins.pluginForms,
              studioPlugins.pluginCustomCode,
              studioPlugins.pluginExport,
              studioPlugins.pluginTooltip,
              studioPlugins.pluginAvatars
            ].filter(Boolean);
          } catch (pluginError) {
            console.warn('Could not load studio plugins:', pluginError);
            // Continue without plugins
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
          
          console.log('Initializing StudioSDK with config:', config);
          studioInstanceRef.current = new StudioSDK(config);
          
        } catch (error) {
          console.error('Failed to initialize GrapesJS Studio:', error);
          toast({ 
            title: "Erro", 
            description: `Falha ao carregar o editor: ${error.message}`, 
            variant: "destructive" 
          });
        }
      }
    };

    initializeEditor();

    return () => {
      if (studioInstanceRef.current) {
        try {
          studioInstanceRef.current.destroy?.();
        } catch (error) {
          console.warn('Error destroying studio instance:', error);
        }
        studioInstanceRef.current = null;
      }
    };
  }, [initialData, onBack, saveLpMutation, toast]);

  return (
    <div className="h-screen w-full flex flex-col bg-background">
      <div ref={editorRef} style={{ flexGrow: 1 }} />
    </div>
  );
};
