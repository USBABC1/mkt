// client/src/components/StudioEditorComponent.tsx
import React, { useEffect, useRef } from 'react';
import Studio, { type StudioConfig } from '@grapesjs/studio-sdk';
import { LandingPage } from '../../shared/schema';
import { useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

interface StudioEditorComponentProps {
  initialData: LandingPage | null;
  onBack: () => void;
}

type StudioInstance = any;

export const StudioEditorComponent = ({ initialData, onBack }: StudioEditorComponentProps) => {
  const { toast } = useToast();
  const editorRef = useRef<HTMLDivElement>(null);
  const studioInstanceRef = useRef<StudioInstance | null>(null);
  
  const saveProjectMutation = useMutation({
    mutationFn: async (data: { id?: number, name: string, slug: string, html: string, css: string, components: any, styles: any }) => {
      const { id, ...payload } = data;
      const lpData = {
        name: payload.name,
        slug: payload.slug,
        status: 'draft',
        grapesJsData: {
          html: payload.html,
          css: payload.css,
          components: payload.components,
          styles: payload.styles,
        },
      };

      if (id) {
        return apiRequest('PUT', `/api/landingpages/${id}`, lpData);
      }
      return apiRequest('POST', `/api/landingpages', lpData);
    },
    onSuccess: () => {
      toast({ title: 'Sucesso!', description: 'Landing page salva como rascunho.' });
      onBack(); // Volta para a lista
    },
    onError: (error: any) => {
      toast({ title: 'Erro ao Salvar', description: error.message, variant: 'destructive' });
    }
  });
  
  useEffect(() => {
    if (editorRef.current && !studioInstanceRef.current) {
        
        const config: StudioConfig = {
            // Insira sua chave pública do GrapesJS Studio aqui, se tiver uma.
            // publicKey: 'YOUR_PUBLIC_KEY',
            
            container: editorRef.current,
            
            project: initialData ? {
              id: String(initialData.id),
              name: initialData.name,
              slug: initialData.slug,
              // @ts-ignore
              main: initialData.grapesJsData,
            } : {
              name: 'Nova Landing Page',
              template: '@grapesjs/template-blank',
            },
            
            onSave: (data) => {
              console.log('Salvando dados do Studio:', data);
              saveProjectMutation.mutate({
                id: initialData?.id,
                name: data.project.name,
                slug: data.project.slug || data.project.name.toLowerCase().replace(/\s+/g, '-'),
                html: data.html,
                css: data.css,
                components: data.project.main.components,
                styles: data.project.main.styles,
              });
            },

            getBackLink: () => {
                const backLink = document.createElement('button');
                backLink.className = 'absolute top-3 left-3 z-10';
                backLink.innerHTML = `<button class="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-secondary text-secondary-foreground hover:bg-secondary/80 h-10 px-4 py-2">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-arrow-left mr-2 h-4 w-4"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>
                    Voltar
                </button>`;
                backLink.onclick = onBack;
                return backLink;
            }
        };
        
        // Use a 'new' keyword with the default export
        studioInstanceRef.current = new (Studio as any)(config);

    }

    return () => {
      if (studioInstanceRef.current) {
        studioInstanceRef.current.destroy();
        studioInstanceRef.current = null;
      }
    };
  }, [initialData, onBack, saveProjectMutation]);


  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100%' }}>
      <div ref={editorRef} style={{ height: '100%', width: '100%' }} />
    </div>
  );
};
