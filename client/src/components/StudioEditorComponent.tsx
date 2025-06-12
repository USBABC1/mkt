// client/src/components/StudioEditorComponent.tsx
import React, { useEffect, useRef } from 'react';
import grapesjs, { Editor } from 'grapesjs';
import 'grapesjs/dist/css/grapes.min.css';
import { LandingPage } from '@shared/schema';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { Button } from './ui/button';

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
    mutationFn: async (data: { name: string; slug: string; grapesJsData: any }) => {
      const endpoint = initialData?.id ? `/api/landingpages/${initialData.id}` : '/api/landingpages';
      const method = initialData?.id ? 'PUT' : 'POST';
      const response = await apiRequest(method, endpoint, data);
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
    if (editorRef.current && !editorInstance.current) {
      const editor = grapesjs.init({
        container: editorRef.current,
        fromElement: false,
        height: 'calc(100vh - 70px)',
        width: 'auto',
        storageManager: { type: undefined }, // Desativa o storage local padrão
        assetManager: {
            upload: '/api/assets/lp-upload',
            uploadName: 'files',
            multiUpload: false,
        },
        canvas: {
            styles: ['https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css'],
            scripts: ['https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js'],
        },
      });

      // Carregar conteúdo existente
      if (initialData?.grapesJsData) {
        // @ts-ignore
        editor.loadProjectData(initialData.grapesJsData);
      } else {
         editor.setComponents(`
          <div class="container text-center py-5">
            <h1>Sua Landing Page Começa Aqui</h1>
            <p>Arraste e solte os blocos para construir.</p>
          </div>
        `);
      }

      // Adicionar botões ao painel
      editor.Panels.addPanel({
        id: 'panel-top',
        el: '.panel__top',
      });
      editor.Panels.addPanel({
        id: 'basic-actions',
        el: '.panel__basic-actions',
        buttons: [
          { id: 'visibility', active: true, label: '<span><i class="fa fa-square-o"></i></span>', command: 'core:component-outline' },
          { id: 'preview', className: 'btn-toggle-preview', label: '<span><i class="fa fa-eye"></i></span>', command: 'core:preview' },
        ],
      });
      
      editorInstance.current = editor;
    }

    return () => {
      if (editorInstance.current) {
        editorInstance.current.destroy();
        editorInstance.current = null;
      }
    };
  }, []); // Executa apenas uma vez

  const handleSave = () => {
    if (!editorInstance.current || !initialData) {
        toast({ title: "Erro", description: "Editor não inicializado ou dados da LP não encontrados.", variant: "destructive"});
        return;
    }
    const projectData = editorInstance.current.getProjectData();
    saveLpMutation.mutate({
      name: initialData.name,
      slug: initialData.slug,
      grapesJsData: projectData,
    });
  };

  return (
    <div style={{ height: '100vh', width: '100%', display: 'flex', flexDirection: 'column' }}>
        <div className="flex items-center justify-between p-2 bg-card border-b">
            <div>
                <Button variant="ghost" onClick={onBack}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-arrow-left mr-2 h-4 w-4"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>
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
                  Salvar
                </Button>
            </div>
        </div>
        <div ref={editorRef} style={{ flexGrow: 1 }}/>
    </div>
  );
};
