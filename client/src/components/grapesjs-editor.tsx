import React, { useEffect, useRef, useState } from 'react';
import grapesjs, { Editor } from 'grapesjs';
import 'grapesjs/dist/css/grapes.min.css';
// Opcional: Importar preset (se instalado)
// import grapesjsPresetWebpage from 'grapesjs-preset-webpage';
// Opcional: Outros plugins que você queira usar
// import grapesjsCustomPlugin from 'grapesjs-some-custom-plugin';

interface GrapesJsEditorProps {
  initialData?: string; // Para carregar conteúdo JSON salvo anteriormente
  onSave: (jsonData: string, htmlData: string, cssData: string) => void;
  pageName?: string; // Nome da página para exibir ou usar no editor
}

const GrapesJsEditor: React.FC<GrapesJsEditorProps> = ({ initialData, onSave, pageName }) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const [editorInstance, setEditorInstance] = useState<Editor | null>(null);

  useEffect(() => {
    if (editorRef.current && !editorInstance) {
      const editor = grapesjs.init({
        container: editorRef.current,
        fromElement: false, // Não carregar de HTML/CSS existente no container
        height: 'calc(100vh - 220px)', // Ajuste a altura conforme necessário
        width: 'auto',
        storageManager: {
            type: 'local', // Ou 'remote' para salvar no backend
            autosave: true,
            stepsBeforeSave: 1,
            // Se 'remote', configurar options: { urlStore: '/api/landingpages/content/store', ... }
        },
        // Plugins (exemplo com preset-webpage)
        plugins: [
          // grapesjsPresetWebpage,
          // editor => grapesjsCustomPlugin(editor, { /* plugin options */ }),
        ],
        pluginsOpts: {
          // [grapesjsPresetWebpage]: {
            // Opções para o preset, se necessário
            // ex: blocks: ['h1-block', 'text', 'image', 'link', 'section', 'column1', 'column2', 'column3'],
          // },
        },
        // Configurações de Canvas (onde a página é renderizada)
        canvas: {
            styles: [
                // Adicione links para seus CSS globais se quiser que o editor os reflita
                // 'https://stackpath.bootstrapcdn.com/bootstrap/4.3.1/css/bootstrap.min.css',
                // '/path/to/your/global.css' // Se servido estaticamente
            ],
            // scripts: [
            //    // Adicione links para JS globais se necessário
            // ],
        },
        // Você pode querer configurar o Asset Manager para upload de imagens
        assetManager: {
          // Exemplo de configuração para upload (requer backend)
          // assets: [
          //  'http://placehold.it/350x250/78c5d6/fff/image1.jpg',
          // ],
          // upload: '/api/assets/upload', // Endpoint do seu backend para upload de assets
          // uploadName: 'files',
        },
        // Configurar blocos, painéis, comandos, etc.
        // ...
      });

      // Carregar dados iniciais se existirem
      if (initialData) {
        try {
          editor.loadProjectData(JSON.parse(initialData));
        } catch (e) {
          console.error("Erro ao carregar dados no GrapesJS:", e);
          // Se initialData for HTML, use editor.setComponents(initialData);
        }
      } else {
        // Conteúdo padrão para uma nova página
        editor.setComponents(`
          <div style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
            <h1>Sua Landing Page Incrível Começa Aqui!</h1>
            <p>Arraste e solte blocos da barra lateral para construir sua página.</p>
          </div>
        `);
      }
      
      // Exemplo de como adicionar um botão de salvar customizado (se não usar storageManager remoto)
      editor.Panels.addButton('options', [{
        id: 'save-db',
        className: 'fa fa-floppy-o', // Use ícones de sua preferência ou texto
        label: 'Salvar',
        command: () => {
          const jsonData = JSON.stringify(editor.getProjectData());
          const htmlData = editor.getHtml() || '';
          const cssData = editor.getCss() || '';
          onSave(jsonData, htmlData, cssData);
        },
        attributes: { title: 'Salvar no Banco de Dados' }
      }]);


      setEditorInstance(editor);
    }

    // Cleanup ao desmontar o componente
    return () => {
      if (editorInstance) {
        editorInstance.destroy();
        setEditorInstance(null);
      }
    };
  }, [initialData, onSave]); // Adicionado onSave às dependências

  return (
    <div className="grapesjs-editor-wrapper border rounded-md overflow-hidden">
        {/* O ID do container pode ser customizado */}
        <div ref={editorRef} id="gjs">
            {/* GrapesJS será renderizado aqui */}
        </div>
    </div>
  );
};

export default GrapesJsEditor;
