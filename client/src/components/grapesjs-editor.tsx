import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import grapesjs, { Editor } from 'grapesjs';
import 'grapesjs/dist/css/grapes.min.css';
import gjsPresetWebpage from 'grapesjs-preset-webpage';
import { API_URL } from '@/lib/api';
import { Button } from './ui/button';
import { ArrowLeft, Save, Loader2, Eye, Code, Smartphone, Tablet, Monitor } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
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

  useEffect(() => {
    if (!editorRef.current) return;

    const assetManager = {
      upload: `${API_URL}/assets/upload`,
      uploadName: 'files',
      multiUpload: true,
      autoAdd: 1,
      headers: {
      },
    };

    const gjsEditor = grapesjs.init({
      container: editorRef.current,
      fromElement: false,
      height: 'calc(100vh - 120px)',
      width: 'auto',
      storageManager: false, 
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

    gjsEditor.Commands.add('set-device-desktop', {
      run: (editor) => editor.setDevice('Desktop')
    });
    gjsEditor.Commands.add('set-device-tablet', {
      run: (editor) => editor.setDevice('Tablet')
    });
    gjsEditor.Commands.add('set-device-mobile', {
      run: (editor) => editor.setDevice('Mobile portrait')
    });

    gjsEditor.on('component:selected', () => {
    });

    gjsEditor.on('component:deselected', () => {
    });

    setEditor(gjsEditor);

    return () => {
      if (gjsEditor) {
        gjsEditor.destroy();
        setEditor(null);
      }
    };
  }, []);

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

  const togglePreview = useCallback(() => {
    if (!editor) return;
    
    if (isPreviewMode) {
      editor.runCommand('core:canvas-clear');
    } else {
      editor.runCommand('core:preview');
    }
    setIsPreviewMode(!isPreviewMode);
  }, [editor, isPreviewMode]);

  const handleDeviceChange = useCallback((device: string) => {
    if (!editor) return;
    
    setCurrentDevice(device);
    switch (device) {
      case 'desktop':
        editor.runCommand('set-device-desktop');
        break;
      case 'tablet':
        editor.runCommand('set-device-tablet');
        break;
      case 'mobile':
        editor.runCommand('set-device-mobile');
        break;
    }
  }, [editor]);

  useEffect(() => {
    if (!editor) return;

    const autoSaveInterval = setInterval(() => {
      if (editor.getDirtyCount() > 0) {
        handleSave();
      }
    }, 30000); 

    return () => clearInterval(autoSaveInterval);
  }, [editor, handleSave]);

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
          Erro ao carregar a landing page
        </div>
        <Button onClick={() => navigate('/landingpages')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar
        </Button>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      <div className="flex justify-between items-center p-3 bg-white dark:bg-gray-900 border-b shadow-sm">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" onClick={() => navigate('/landingpages')}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
          </Button>
          <h1 className="text-lg font-bold text-gray-900 dark:text-white">
            {landingPage?.name || 'Novo Site'}
          </h1>
        </div>

        <div className="flex items-center space-x-2">
          <div className="flex border rounded-lg p-1">
            <Button
              variant={currentDevice === 'desktop' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => handleDeviceChange('desktop')}
            >
              <Monitor className="h-4 w-4" />
            </Button>
            <Button
              variant={currentDevice === 'tablet' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => handleDeviceChange('tablet')}
            >
              <Tablet className="h-4 w-4" />
            </Button>
            <Button
              variant={currentDevice === 'mobile' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => handleDeviceChange('mobile')}
            >
              <Smartphone className="h-4 w-4" />
            </Button>
          </div>

          <Button variant="outline" onClick={togglePreview}>
            <Eye className="mr-2 h-4 w-4" />
            {isPreviewMode ? 'Editar' : 'Preview'}
          </Button>

          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Salvar
          </Button>
        </div>
      </div>

      <div className="flex-1 flex">
        <div className="flex-1">
          <div ref={editorRef} className="h-full" />
        </div>

        <div className="panel__right w-80 border-l bg-white dark:bg-gray-900">
          <div className="panel__switcher border-b p-2">
          </div>
        </div>
      </div>
    </div>
  );
};

export default GrapesJsEditor;
