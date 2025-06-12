// client/src/components/StudioEditorComponent.tsx
import React, { useEffect, useRef } from 'react';
import grapesjs, { Editor, EditorConfig } from 'grapesjs';
import 'grapesjs/dist/css/grapes.min.css';
import grapesjsPresetWebpage from 'grapesjs-preset-webpage';
import { LandingPage, InsertLandingPage } from '@shared/schema';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { Button } from './ui/button';
import { ArrowLeft, Loader2, Save } from 'lucide-react';

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
      // ✅ CORREÇÃO: Garante que estamos criando ou atualizando a LP correta
      const isEditing = !!initialData?.id;
      const endpoint = isEditing ? `/api/landingpages/${initialData.id}` : '/api/landingpages';
      const method = isEditing ? 'PUT' : 'POST';

      const payload: Partial<InsertLandingPage> = {
        name: editorInstance.current?.getProjectData()?.name || initialData?.name || 'Nova Página',
        slug: editorInstance.current?.getProjectData()?.slug || initialData?.slug || `pagina-${Date.now()}`,
        grapesJsData: data.grapesJsData,
      };

      const response = await apiRequest(method, endpoint, payload);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Falha ao salvar a landing page.');
      }
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Sucesso!", description: "Landing page salva." });
      queryClient.invalidateQueries({ queryKey: ['landingPages'] });
      onBack();
    },
    onError: (error: any) => {
      toast({ title: "Erro ao Salvar", description: error.message, variant: "destructive" });
    }
  });

  useEffect(() => {
    if (editorRef.current && !editorInstance.current) {
      const editorConfig: EditorConfig = {
        container: editorRef.current,
        fromElement: false,
        height: 'calc(100vh - 70px)',
        width: 'auto',
        storageManager: false, // Desativa o storage local padrão para controle manual.
        assetManager: {
            upload: '/api/assets/lp-upload',
            assets: [],
            uploadName: 'files',
        },
        canvas: {
          // ✅ CORREÇÃO: Carrega o Tailwind via CDN no canvas do editor
          scripts: ['https://cdn.tailwindcss.com'],
        },
        plugins: [grapesjsPresetWebpage],
        pluginsOpts: {
          [grapesjsPresetWebpage as any]: {},
        },
      };

      const editor = grapesjs.init(editorConfig);
      
      // Carrega dados iniciais, se existirem
      if (initialData?.grapesJsData) {
        try {
          // @ts-ignore
          editor.loadProjectData(initialData.grapesJsData);
        } catch (e) {
            console.error("Falha ao carregar dados do projeto, carregando HTML puro.", e);
            // @ts-ignore
            if (initialData.grapesJsData?.html) editor.setComponents(initialData.grapesJsData.html);
        }
      } else {
        editor.setComponents(`
          <div class="p-5 text-center">
            <h1 class="text-4xl font-bold">Construa sua Landing Page Incrível</h1>
            <p class="text-gray-500 mt-2">Arraste os blocos do painel à direita para começar a criar.</p>
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
  }, []); // A dependência vazia garante que o editor inicialize apenas uma vez.

  const handleSave = () => {
    if (!editorInstance.current) {
        toast({ title: "Erro", description: "O editor não foi inicializado.", variant: "destructive"});
        return;
    }
    const projectData = editorInstance.current.getProjectData();
    saveLpMutation.mutate({ grapesJsData: projectData });
  };

  return (
    <div className="h-screen w-full flex flex-col bg-background">
        <div className="flex items-center justify-between p-2 bg-card border-b z-10 flex-shrink-0">
            <Button variant="ghost" onClick={onBack}>
                <ArrowLeft className="mr-2 h-4 w-4"/>
                Voltar para a Lista
            </Button>
            <div className="text-center">
                <h3 className="font-semibold">{initialData?.name || 'Nova Landing Page'}</h3>
                <p className="text-xs text-muted-foreground">/{initialData?.slug || 'novo-slug'}</p>
            </div>
            <Button onClick={handleSave} disabled={saveLpMutation.isPending}>
              {saveLpMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Save className="mr-2 h-4 w-4" />}
              Salvar
            </Button>
        </div>
        <div ref={editorRef} style={{ flexGrow: 1 }} className="grapesjs-editor"/>
    </div>
  );
};
