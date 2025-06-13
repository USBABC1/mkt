import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import grapesjs, { Editor } from 'grapesjs';
import 'grapesjs/dist/css/grapes.min.css';
import gjsPresetWebpage from 'grapesjs-preset-webpage';
import { API_URL } from '@/lib/api';
import { Button } from './ui/button';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

const GrapesJsEditor = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [editor, setEditor] = useState<Editor | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    const { data: landingPage, isLoading } = useQuery({
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
        },
    });

    useEffect(() => {
        const assetManager = {
            upload: `${API_URL}/assets/upload`, 
            uploadName: 'files',
        };

        const gjsEditor = grapesjs.init({
            container: '#gjs',
            fromElement: true,
            height: 'calc(100vh - 50px)',
            width: 'auto',
            plugins: [gjsPresetWebpage],
            pluginsOpts: {
                [gjsPresetWebpage]: {
                    forms: true,
                },
            },
            assetManager,
            storageManager: {
                type: 'remote',
                stepsBeforeSave: 1,
                options: {
                    remote: {
                        onStore: (data, editor) => {
                            const html = editor.getHtml();
                            const css = editor.getCss();
                            return { id, html, css };
                        },
                    }
                }
            },
        });
        setEditor(gjsEditor);

        return () => {
            gjsEditor.destroy();
            setEditor(null);
        };
    }, [id]);

    useEffect(() => {
        if (editor && landingPage) {
            editor.setComponents(landingPage.html || '');
            editor.setStyle(landingPage.css || '');
        }
    }, [editor, landingPage]);

    const handleSave = async () => {
        if (editor) {
            setIsSaving(true);
            const html = editor.getHtml();
            const css = editor.getCss();
            try {
                await mutation.mutateAsync({ html, css });
            } catch (error) {
                console.error("Failed to save:", error);
            } finally {
                setIsSaving(false);
            }
        }
    };

    if (isLoading && id) {
        return (
            <div className="flex items-center justify-center h-screen">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }
    
    return (
        <div>
            <div className="flex justify-between items-center p-2 bg-gray-100 dark:bg-gray-900">
                <Button variant="ghost" onClick={() => navigate('/landingpages')}>
                    <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
                </Button>
                <h1 className="text-lg font-bold">{landingPage?.name || 'Novo Site'}</h1>
                <Button onClick={handleSave} disabled={isSaving}>
                    {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Salvar
                </Button>
            </div>
            <div id="gjs"></div>
        </div>
    );
};

export default GrapesJsEditor;
