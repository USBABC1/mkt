// client/src/components/grapesjs-editor.tsx
import React, { useEffect, useRef } from 'react';
import grapesjs, { Editor } from 'grapesjs';
import 'grapesjs/dist/css/grapes.min.css';
import grapesjsPresetWebpage from 'grapesjs-preset-webpage';
import { useToast } from '@/hooks/use-toast';

interface GrapesJsEditorProps {
  initialData?: { html: string, css: string };
  onSave: (data: { html: string, css: string }) => void;
  onBack: () => void;
}

const GrapesJsEditor: React.FC<GrapesJsEditorProps> = ({ initialData, onSave, onBack }) => {
  const editorContainerRef = useRef<HTMLDivElement>(null);
  const editorInstanceRef = useRef<Editor | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (editorContainerRef.current && !editorInstanceRef.current) {
      const editor = grapesjs.init({
        container: editorContainerRef.current,
        fromElement: false,
        height: '100%',
        width: 'auto',
        storageManager: false, // Desabilitamos o storage local para usar o nosso
        plugins: [grapesjsPresetWebpage],
        pluginsOpts: {
          [grapesjsPresetWebpage as any]: {
            // opções do preset
          },
        },
        assetManager: {
            upload: '/api/assets/lp-upload', // Endpoint para upload de imagens
            uploadName: 'files',
        },
        canvas: {
          // Assegura que estilos globais sejam aplicados no iframe do editor
          styles: ['/src/index.css'],
        }
      });
      
      // Adiciona o botão de Voltar
      editor.Panels.addButton('options', {
        id: 'back-button',
        className: 'fa fa-arrow-left',
        command: () => onBack(),
        attributes: { title: 'Voltar' }
      });
      
      // Adiciona o botão de Salvar
      editor.Panels.addButton('options', {
        id: 'save-db',
        className: 'fa fa-floppy-o',
        command: () => {
          const html = editor.getHtml();
          const css = editor.getCss();
          onSave({ html, css });
        },
        attributes: { title: 'Salvar' }
      });

      // Carrega os dados iniciais se existirem
      if (initialData?.html) {
        editor.setComponents(initialData.html);
        editor.setStyle(initialData.css || '');
      } else {
        editor.setComponents('<div><h1>Sua Landing Page Começa Aqui!</h1></div>');
      }

      editorInstanceRef.current = editor;
    }

    return () => {
      if (editorInstanceRef.current) {
        editorInstanceRef.current.destroy();
        editorInstanceRef.current = null;
      }
    };
  }, [initialData, onSave, onBack, toast]);

  return (
    <div className="h-screen w-full">
      <div ref={editorContainerRef} className="h-full w-full" />
    </div>
  );
};

export default GrapesJsEditor;
