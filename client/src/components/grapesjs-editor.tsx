// client/src/components/grapesjs-editor.tsx
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import grapesjs, { type Editor } from 'grapesjs';
import 'grapesjs/dist/css/grapes.min.css';
import gjsPresetWebpage from 'grapesjs-preset-webpage';
import { API_URL } from '@/lib/api';
import { toast } from '@/hooks/use-toast';

// Tipagem para a referência do editor, permitindo que o componente pai chame a função getContent
export interface GrapesJSEditorRef {
  getContent: () => {
    html: string;
    css: string;
    components: any;
    styles: any;
  };
  loadContent: (html: string) => void;
}

interface GrapesJSEditorProps {
  initialData?: {
    html?: string;
    css?: string;
    components?: any;
    styles?: any;
  } | null;
  onSave?: (data: any) => void;
  landingPageId: number;
}

const GrapesJSEditor = forwardRef<GrapesJSEditorRef, GrapesJSEditorProps>(
  ({ initialData, landingPageId }, ref) => {
    const editorEl = useRef<HTMLDivElement>(null);
    const [editor, setEditor] = useState<Editor | null>(null);

    // Expõe a função `getContent` para o componente pai através da ref
    useImperativeHandle(ref, () => ({
      getContent: () => {
        if (!editor) {
          return { html: '', css: '', components: [], styles: [] };
        }
        return {
          html: editor.getHtml(),
          css: editor.getCss(),
          components: editor.getComponents(),
          styles: editor.getStyle(),
        };
      },
      loadContent: (html: string) => {
        editor?.setComponents(html);
      }
    }));

    useEffect(() => {
      if (!editor && editorEl.current) {
        const e = grapesjs.init({
          container: editorEl.current,
          fromElement: true,
          height: 'calc(100vh - 120px)',
          width: 'auto',
          storageManager: false, // Desabilitamos o storageManager padrão para usar o nosso
          plugins: [gjsPresetWebpage],
          pluginsOpts: {
            [gjsPresetWebpage]: {
              // Opções do preset
            },
          },
          // Configuração do Asset Manager para upload de imagens
          assetManager: {
            assets: [],
            upload: `${API_URL}/assets/lp-upload`, // Endpoint da nossa API para upload
            uploadName: 'files',
            params: {
              // landingPageId: landingPageId // Se quiser associar o upload a uma LP específica
            },
            headers: {
              Authorization: `Bearer ${localStorage.getItem('token')}`,
            },
          },
        });
        
        // Carrega os dados iniciais quando o editor estiver pronto
        e.on('load', () => {
          try {
            if (initialData?.components) {
              e.setComponents(JSON.parse(JSON.stringify(initialData.components)));
              e.setStyle(JSON.parse(JSON.stringify(initialData.styles)));
            } else if (initialData?.html) {
              e.setComponents(initialData.html);
            }
          } catch(err) {
            console.error("Erro ao carregar dados no GrapesJS: ", err);
            toast({
              title: "Erro ao carregar editor",
              description: "O conteúdo da página pode não ter sido carregado corretamente.",
              variant: "destructive"
            });
          }
        });

        setEditor(e);
      }

      return () => {
        editor?.destroy();
      };
    }, [editor, initialData, landingPageId]);

    return <div ref={editorEl} className="gjs-editor-wrapper" />;
  }
);

GrapesJSEditor.displayName = 'GrapesJSEditor';
export default GrapesJSEditor;
