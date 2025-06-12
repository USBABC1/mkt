// client/src/components/StudioEditorComponent.tsx
import React, { useEffect, useRef } from 'react';
import grapesjs, { Editor, EditorConfig } from 'grapesjs';
import 'grapesjs/dist/css/grapes.min.css';
import grapesjsPresetWebpage from 'grapesjs-preset-webpage';
import grapesjsTailwind from 'grapesjs-tailwind';
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
    mutationFn: async (data: { grapesJsData: any; html: string; css: string; }) => {
      const isEditing = !!initialData?.id;
      const endpoint = isEditing ? `/api/landingpages/${initialData.id}` : '/api/landingpages';
      const method = isEditing ? 'PUT' : 'POST';

      // ✅ CORREÇÃO: Garante que todos os campos obrigatórios sejam enviados ao criar
      const payload: Partial<InsertLandingPage> = {
        name: initialData?.name || 'Nova Página Salva',
        slug: initialData?.slug || `pagina-${Date.now()}`,
        grapesJsData: data.grapesJsData,
        // O schema no backend não tem html e css, mas se tivesse, seria aqui
      };

      const response = await apiRequest(method, endpoint, payload);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Falha ao salvar a landing page.');
      }
      return response.json();
    },
    onSuccess: (savedLp) => {
      toast({ title: "Sucesso!", description: `Landing page "${savedLp.name}" salva com sucesso.` });
      queryClient.invalidateQueries({ queryKey: ['landingPages'] });
      onBack();
    },
    onError: (error: any) => {
      toast({ title: "Erro ao Salvar", description: error.message, variant: "destructive" });
    }
  });

  // ✅ CORREÇÃO: Efeito para inicializar e destruir o editor, executa apenas uma vez.
  useEffect(() => {
    if (editorRef.current && !editorInstance.current) {
      const editor = grapesjs.init({
        container: editorRef.current,
        fromElement: false,
        height: 'calc(100vh - 70px)',
        width: 'auto',
        storageManager: false,
        assetManager: {
            upload: '/api/assets/lp-upload',
            assets: [],
            uploadName: 'files',
        },
        plugins: [grapesjsPresetWebpage, grapesjsTailwind],
        pluginsOpts: {
          [grapesjsPresetWebpage as any]: {},
          [grapesjsTailwind as any]: {},
        },
      });
      editorInstance.current = editor;
    }

    return () => {
      if (editorInstance.current) {
        editorInstance.current.destroy();
        editorInstance.current = null;
      }
    };
  }, []); // Array de dependências vazio para rodar apenas no mount e unmount.

  // ✅ CORREÇÃO: Efeito separado para carregar os dados, reage a mudanças no `initialData`.
  useEffect(() => {
    const editor = editorInstance.current;
    if (!editor) return;

    // Garante que o editor esteja limpo antes de carregar novos dados
    editor.setComponents('');
    editor.setStyle('');

    if (initialData?.grapesJsData) {
      try {
        // @ts-ignore
        editor.loadProjectData(initialData.grapesJsData);
      } catch (e) {
        console.error("Falha ao carregar dados do projeto GrapesJS.", e);
        toast({ title: "Erro de Dados", description: "O formato dos dados da página é inválido.", variant: "destructive" });
      }
    } else {
      // Conteúdo padrão para uma nova página
      editor.setComponents(`
        <div class="p-5 text-center">
          <h1 class="text-4xl font-bold">Construa sua Landing Page Incrível</h1>
          <p class="text-gray-500 mt-2">Arraste os blocos do painel à direita para começar a criar.</p>
        </div>
      `);
    }
  }, [initialData, toast]);

  const handleSave = () => {
    if (!editorInstance.current) {
      toast({ title: "Erro", description: "O editor não foi inicializado.", variant: "destructive" });
      return;
    }
    const projectData = editorInstance.current.getProjectData();
    const html = editorInstance.current.getHtml();
    const css = editorInstance.current.getCss();
    saveLpMutation.mutate({ grapesJsData: projectData, html, css });
  };

  return (
    <div className="h-screen w-full flex flex-col bg-background">
        <div className="flex items-center justify-between p-2 bg-card border-b z-10 flex-shrink-0">
            <Button variant="ghost" onClick={onBack} disabled={saveLpMutation.isPending}>
                <ArrowLeft className="mr-2 h-4 w-4"/>
                Voltar
            </Button>
            <div className="text-center">
                <h3 className="font-semibold">{initialData?.name || 'Nova Landing Page'}</h3>
                <p className="text-xs text-muted-foreground">/{initialData?.slug || 'novo-slug'}</p>
            </div>
            <Button onClick={handleSave} disabled={saveLpMutation.isPending}>
              {saveLpMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Save className="mr-2 h-4 w-4" />}
              Salvar e Voltar
            </Button>
        </div>
        <div ref={editorRef} style={{ flexGrow: 1 }} className="grapesjs-editor"/>
    </div>
  );
};
