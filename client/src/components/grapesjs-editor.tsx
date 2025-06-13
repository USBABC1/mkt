// client/src/components/grapesjs-editor.tsx
import { useEffect, useRef } from 'react';
import grapesjs, { type Editor } from 'grapesjs';
import 'grapesjs/dist/css/grapes.min.css';
import gjsPresetWebpage from 'grapesjs-preset-webpage';
import { API_URL } from '@/lib/api';
import { Button } from './ui/button';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';

// Props atualizadas para receber os handlers onSave e onBack
interface GrapesJSEditorProps {
  initialData: {
    html?: string;
    css?: string;
    components?: any;
    styles?: any;
  };
  onSave: (data: { html: string; css: string; components: any; styles: any; }) => void;
  onBack: () => void;
  isSaving?: boolean;
}

export default function GrapesJSEditor({ initialData, onSave, onBack, isSaving }: GrapesJSEditorProps) {
  const editorEl = useRef<HTMLDivElement>(null);
  const editorInstance = useRef<Editor | null>(null);

  const handleSaveClick = () => {
    if (editorInstance.current) {
      onSave({
        html: editorInstance.current.getHtml(),
        css: editorInstance.current.getCss(),
        components: editorInstance.current.getComponents(),
        styles: editorInstance.current.getStyle(),
      });
    }
  };

  useEffect(() => {
    if (editorInstance.current) {
        return;
    }
    if (editorEl.current) {
      const editor = grapesjs.init({
        container: editorEl.current,
        fromElement: false,
        height: 'calc(100vh - 70px)', // Ajusta altura para a barra de botões
        width: 'auto',
        storageManager: false,
        plugins: [gjsPresetWebpage],
        pluginsOpts: {
          [gjsPresetWebpage]: {},
        },
        assetManager: {
            assets: [],
            upload: `${API_URL}/assets/lp-upload`,
            uploadName: 'files',
            headers: {
              Authorization: `Bearer ${localStorage.getItem('token')}`,
            },
        },
      });
      
      // Carrega dados iniciais
      if (initialData?.components) {
        editor.setComponents(JSON.parse(JSON.stringify(initialData.components)));
        editor.setStyle(JSON.parse(JSON.stringify(initialData.styles)));
      } else if (initialData?.html) {
        editor.setComponents(initialData.html);
      }
      
      editorInstance.current = editor;
    }

    return () => {
      editorInstance.current?.destroy();
      editorInstance.current = null;
    };
  }, [initialData]);

  return (
    <div className='grapes-editor-container relative'>
      {/* Barra de Ações no topo do editor */}
      <div className="absolute top-0 left-0 w-full bg-background/80 backdrop-blur-sm p-2 flex justify-between items-center z-10 border-b">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar
        </Button>
        <h3 className='text-lg font-semibold'>Editor Visual</h3>
        <Button onClick={handleSaveClick} disabled={isSaving}>
          {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Salvar Alterações
        </Button>
      </div>
      <div ref={editorEl} className="gjs-editor-wrapper pt-[60px]" />
    </div>
  );
}
