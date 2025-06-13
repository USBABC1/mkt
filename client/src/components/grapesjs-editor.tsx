import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import grapesjs, { Editor } from 'grapesjs';
import 'grapesjs/dist/css/grapes.min.css';
import gjsPresetWebpage from 'grapesjs-preset-webpage';
import { getApiUrl, api } from '@/lib/api'; // CORREÇÃO AQUI
import { Button } from './ui/button';
import { ArrowLeft, Save, Loader2, Eye, Code, Smartphone, Tablet, Monitor } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface LandingPageData {
  id: string;
  name: string;
  html: string;
  css: string;
  createdAt?: string;
  updatedAt?: string;
}

const GrapesJsEditor = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const editorRef = useRef<HTMLDivElement>(null);
  const [editor, setEditor] = useState<Editor | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [currentDevice, setCurrentDevice] = useState('desktop');

  // Query para buscar os dados da landing page
  const { data: landingPage, isLoading, error } = useQuery<LandingPageData>({
    queryKey: ['landingpage', id],
    queryFn: async () => {
      if (!id) return null;
      const res = await api.landingpages[':id'].$get({ param: { id } });
      if (!res.ok) {
        throw new Error('Failed to fetch landing page');
      }
      return await res.json();
    },
    enabled: !!id,
    retry: 3,
    retryDelay: 1000,
  });

  // Mutation para salvar as alterações
  const mutation = useMutation({
    mutationFn: async (data: { html: string; css: string }) => {
      if (!id) throw new Error("No ID provided");
      const res = await api.landingpages[':id'].$put({
        param: { id },
        json: data
      });
      if (!res.ok) {
        throw new Error('Failed to save landing page');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['landingpages'] });
      queryClient.invalidateQueries({ queryKey: ['landingpage', id] });
      toast.success('Landing page salva com sucesso!');
    },
    onError: (error) => {
      console.error('Save error:', error);
      toast.error('Erro ao salvar a landing page');
    },
  });

  // Inicialização do editor GrapesJS
  useEffect(() => {
    if (!editorRef.current) return;

    const assetManager = {
      upload: `${getApiUrl()}/assets/upload`, // CORREÇÃO AQUI
      uploadName: 'files',
      multiUpload: true,
      autoAdd: 1,
      headers: {
        // Adicione headers de autenticação se necessário
        // 'Authorization': `Bearer ${token}`,
      },
    };

    const gjsEditor = grapesjs.init({
      container: editorRef.current,
      fromElement: false,
      height: 'calc(100vh - 120px)',
      width: 'auto',
      storageManager: false, // Desabilitar storage automático para controle manual
      plugins: [gjsPresetWebpage],
      pluginsOpts: {
        [gjsPresetWebpage]: {
          blocks: ['column1', 'column2', 'column3', 'text', 'link', 'image', 'video'],
          modal: true,
          flexGrid: true,
          styleManagerSectors: [
            {
              name: 'Dimensões',
              open: false,
              buildProps: ['width', 'min-height', 'padding'],
              properties: [
                {
                  type: 'integer',
                  name: 'A largura',
                  property: 'width',
                  units: ['px', '%'],
                  defaults: 'auto',
                  min: 0,
                }
              ]
            },
            {
              name: 'Decoração',
              open: false,
              buildProps: ['opacity', 'background-color', 'border-radius', 'border', 'box-shadow', 'background'],
            },
            {
              name: 'Tipografia',
              open: false,
              buildProps: ['font-family', 'font-size', 'font-weight', 'letter-spacing', 'color', 'line-height', 'text-align', 'text-decoration', 'text-shadow'],
            },
            {
              name: 'Espaçamento',
              open: false,
              buildProps: ['margin', 'padding'],
            }
          ]
        },
      },
      assetManager,
      canvas: {
        styles: [
          'https://stackpath.bootstrapcdn.com/bootstrap/4.1.3/css/bootstrap.min.css'
        ],
        scripts: [
          'https://code.jquery.com/jquery-3.3.1.slim.min.js',
          'https://stackpath.bootstrapcdn.com/bootstrap/4.1.3/js/bootstrap.min.js'
        ]
      },
      deviceManager: {
        devices: [
          {
            name: 'Desktop',
            width: '',
          },
          {
            name: 'Tablet',
            width: '768px',
            widthMedia: '992px',
          },
          {
            name: 'Mobile portrait',
            width: '320px',
            widthMedia: '575px',
          }
        ]
      },
      panels: {
        defaults: [
          {
            id: 'layers',
            el: '.panel__right',
            resizable: {
              maxDim: 350,
              minDim: 200,
              tc: 0,
              cl: 1,
              cr: 0,
              bc: 0,
              keyWidth: 'flex-basis',
            },
          },
          {
            id: 'panel-switcher',
            el: '.panel__switcher',
            buttons: [
              {
                id: 'show-layers',
                active: true,
                label: 'Camadas',
                command: 'show-layers',
                togglable: false,
              },
              {
                id: 'show-style',
                active: true,
                label: 'Estilos',
                command: 'show-styles',
                togglable: false,
              },
              {
                id: 'show-traits',
                active: true,
                label: 'Configurações',
                command: 'show-traits',
                togglable: false,
              }
            ],
          }
        ]
      }
    });

    // Comandos customizados
    gjsEditor.Commands.add('set-device-desktop', {
      run: (editor) => editor.setDevice('Desktop')
    });
    gjsEditor.Commands.add('set-device-tablet', {
      run: (editor) => editor.setDevice('Tablet')
    });
    gjsEditor.Commands.add('set-device-mobile', {
      run: (editor) => editor.setDevice('Mobile portrait')
    });

    setEditor(gjsEditor);

    return () => {
      if (gjsEditor) {
        gjsEditor.destroy();
        setEditor(null);
      }
    };
  }, []);

  // Carregar dados da landing page no editor
  useEffect(() => {
    if (editor && landingPage) {
      try {
        editor.setComponents(landingPage.html || '');
        editor.setStyle(landingPage.css || '');
      } catch (error) {
        console.error('Error loading landing page data:', error);
        toast.error('Erro ao carregar os dados da landing page');
      }
    }
  }, [editor, landingPage]);

  // Função para salvar
  const handleSave = useCallback(async () => {
    if (!editor) return;

    setIsSaving(true);
    try {
      const html = editor.getHtml();
      const css = editor.getCss();
      await mutation.mutateAsync({ html, css });
    } catch (error) {
      console.error("Failed to save:", error);
    } finally {
      setIsSaving(false);
    }
  }, [editor, mutation]);

  // Função para alternar preview
  const togglePreview = useCallback(() => {
    if (!editor) return;
    
    // O GrapesJS alterna o preview com o mesmo comando
    editor.runCommand('core:preview');
    setIsPreviewMode(!editor.Commands.isActive('core:preview'));

  }, [editor]);

  // Função para alterar dispositivo
  const handleDeviceChange = useCallback((device: string) => {
    if (!editor) return;
    
    setCurrentDevice(device);
    switch (device) {
      case 'desktop':
        editor.setDevice('Desktop');
        break;
      case 'tablet':
        editor.setDevice('Tablet');
        break;
      case 'mobile':
        editor.setDevice('Mobile portrait');
        break;
    }
  }, [editor]);

  // Auto-save (opcional)
  useEffect(() => {
    const saveInterval = 30000; // 30 segundos
    let intervalId: NodeJS.Timeout;

    if (editor && !isSaving) {
      intervalId = setInterval(() => {
        // A propriedade "dirty" não é padrão, mas pode ser verificada assim:
        const hasChanges = editor.getDirtyCount() > 0;
        if (hasChanges) {
          handleSave();
        }
      }, saveInterval);
    }

    return () => clearInterval(intervalId);
  }, [editor, isSaving, handleSave]);


  if (isLoading && id) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin mr-2" />
        <span>Carregando editor...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <div className="text-red-500 mb-4">
          Erro ao carregar a landing page.
        </div>
        <Button onClick={() => navigate('/landingpages')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar
        </Button>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <div className="flex justify-between items-center p-2 bg-white dark:bg-gray-900 border-b shadow-sm">
        <div className="flex items-center space-x-2">
          <Button variant="ghost" size="sm" onClick={() => navigate('/landingpages')}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
          </Button>
          <h1 className="text-md font-semibold text-gray-800 dark:text-white truncate">
            {landingPage?.name || 'Novo Site'}
          </h1>
        </div>

        {/* Device Controls */}
        <div className="flex items-center space-x-2">
          <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
            <Button
              variant={currentDevice === 'desktop' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => handleDeviceChange('desktop')}
            >
              <Monitor className="h-4 w-4" />
            </Button>
            <Button
              variant={currentDevice === 'tablet' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => handleDeviceChange('tablet')}
            >
              <Tablet className="h-4 w-4" />
            </Button>
            <Button
              variant={currentDevice === 'mobile' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => handleDeviceChange('mobile')}
            >
              <Smartphone className="h-4 w-4" />
            </Button>
          </div>

          <Button variant="outline" size="sm" onClick={togglePreview}>
            <Eye className="mr-2 h-4 w-4" />
            {isPreviewMode ? 'Editar' : 'Preview'}
          </Button>

          <Button onClick={handleSave} disabled={isSaving} size="sm">
            {isSaving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Salvar
          </Button>
        </div>
      </div>

      {/* Editor Container */}
      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1">
          <div ref={editorRef} className="h-full w-full" />
        </div>

        {/* Right Panel */}
        <div className="panel__right w-64 border-l bg-white dark:bg-gray-900 overflow-y-auto">
          <div className="panel__switcher border-b">
            {/* Os botões do painel serão renderizados aqui pelo GrapesJS */}
          </div>
          {/* O conteúdo das abas (layers, styles, traits) será renderizado aqui */}
        </div>
      </div>
    </div>
  );
};

export default GrapesJsEditor;
