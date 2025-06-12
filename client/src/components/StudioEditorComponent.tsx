// client/src/components/StudioEditorComponent.tsx
import React, { useEffect, useRef } from 'react';
import grapesjs, { Editor } from 'grapesjs';
import 'grapesjs/dist/css/grapes.min.css';
import { LandingPage, InsertLandingPage } from '@shared/schema';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { Button } from './ui/button';
import { ArrowLeft, Loader2 } from 'lucide-react';

interface StudioEditorComponentProps {
  initialData: LandingPage | null;
  onBack: () => void;
}

export const StudioEditorComponent = ({ initialData, onBack }: StudioEditorComponentProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const editorRef = useRef<HTMLDivElement>(null);
  const editorInstance = useRef<Editor | null>(null);

  const saveLpMutation = useMutation({
    mutationFn: async (data: { grapesJsData: any }) => {
      if (!initialData) throw new Error("Dados da landing page não encontrados para salvar.");
      
      const payload: Partial<InsertLandingPage> = {
        name: initialData.name,
        slug: initialData.slug,
        grapesJsData: data.grapesJsData,
      };

      const endpoint = `/api/landingpages/${initialData.id}`;
      const method = 'PUT';
      const response = await apiRequest(method, endpoint, payload);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
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
    if (editorRef.current && !editorInstance.current) {
      const editor = grapesjs.init({
        container: editorRef.current,
        fromElement: false,
        height: 'calc(100vh - 70px)',
        width: 'auto',
        storageManager: false, // Desativamos o storage local para controlar o salvamento manualmente
        assetManager: {
            upload: '/api/assets/lp-upload',
            assets: [], // Inicia sem assets quebrados
        },
        canvas: {
          // Adiciona o script do Tailwind Play CDN para usar classes do Tailwind no editor
          scripts: ['https://cdn.tailwindcss.com'],
          styles: [
            // Você pode adicionar um link para um CSS base se desejar
          ],
        },
        plugins: ['gjs-preset-webpage'],
        pluginsOpts: {
          'gjs-preset-webpage': {
            // opções do preset
          },
        },
      });

      if (initialData?.grapesJsData) {
        try {
          // @ts-ignore
          const projectData = typeof initialData.grapesJsData === 'string' ? JSON.parse(initialData.grapesJsData) : initialData.grapesJsData;
          editor.loadProjectData(projectData);
        } catch (e) {
            console.error("Falha ao carregar dados do projeto, carregando HTML puro.", e);
            // @ts-ignore
            if (initialData.grapesJsData?.html) editor.setComponents(initialData.grapesJsData.html);
        }
      } else {
         editor.setComponents(`
          <div class="p-5 text-center">
            <h1 class="text-3xl font-bold">Construa sua Página</h1>
            <p class="text-gray-500">Arraste os blocos da direita para começar.</p>
          </div>
        `);
      }
      
      editorInstance.current = editor;
    }

    return () => {
      if (editorInstance.current) {
        editorInstance.current.destroy();
        editorInstance.current = null;
      }
    };
  }, []); // Dependência vazia para garantir que rode apenas uma vez.

  const handleSave = () => {
    if (!editorInstance.current) {
        toast({ title: "Erro", description: "Editor não inicializado.", variant: "destructive"});
        return;
    }
    const projectData = editorInstance.current.getProjectData();
    saveLpMutation.mutate({
      grapesJsData: projectData,
    });
  };

  return (
    <div className="h-screen w-full flex flex-col bg-background">
        <div className="flex items-center justify-between p-2 bg-card border-b z-10">
            <div>
                <Button variant="ghost" onClick={onBack}>
                    <ArrowLeft className="mr-2 h-4 w-4"/>
                    Voltar
                </Button>
            </div>
            <div className="text-center">
                <h3 className="font-semibold">{initialData?.name}</h3>
                <p className="text-xs text-muted-foreground">/{initialData?.slug}</p>
            </div>
            <div>
                <Button onClick={handleSave} disabled={saveLpMutation.isPending}>
                  {saveLpMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                  Salvar Alterações
                </Button>
            </div>
        </div>
        <div ref={editorRef} style={{ flexGrow: 1 }} className="grapesjs-editor"/>
    </div>
  );
};
