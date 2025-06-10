import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Plus, LayoutTemplate, Eye, Edit2, Trash2, ExternalLink, AlertTriangle, Loader2 } from 'lucide-react';
import StudioEditorComponent from '@/components/StudioEditorComponent';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { useAuthStore } from '@/lib/auth'; // Importar o seu auth store

const GRAPESJS_STUDIO_LICENSE_KEY = 'a588bab57a26417d829a73e27616d0233b3b7ba518ea4156a72f28517c14f616';

interface LandingPageItem {
  id: string;
  name: string;
  studioProjectId?: string; 
  createdAt: string;
  status: 'draft' | 'published';
  urlSlug?: string;
  publicUrl?: string;
  grapesJsData?: any; 
}

export default function LandingPagesPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [showStudioEditor, setShowStudioEditor] = useState(false);
  const [editingLp, setEditingLp] = useState<LandingPageItem | null>(null);
  const [isEditorLoading, setIsEditorLoading] = useState(false);

  const { data: landingPages = [], isLoading: isLoadingLps, error: lpsError, refetch: refetchLps } = useQuery<LandingPageItem[], Error>({
    queryKey: ['myStudioLandingPages'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/landingpages');
      if (!response.ok) {
        const errData = await response.json().catch(() => ({ message: 'Falha ao carregar landing pages.' }));
        throw new Error(errData.message);
      }
      return response.json();
    }
  });

  const saveLpMutation = useMutation<LandingPageItem, Error, { projectData: any, lpMetadata: Partial<Omit<LandingPageItem, 'id' | 'createdAt' | 'grapesJsData'>> & { id?: string, grapesJsData: any } }>({
    mutationFn: async ({ lpMetadata }) => {
      const method = lpMetadata.id ? 'PUT' : 'POST';
      const endpoint = lpMetadata.id ? `/api/landingpages/${lpMetadata.id}` : '/api/landingpages';
      
      const payload = {
        name: lpMetadata.name,
        studioProjectId: lpMetadata.studioProjectId,
        status: lpMetadata.status,
        slug: lpMetadata.urlSlug || lpMetadata.name?.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
        grapesJsData: lpMetadata.grapesJsData,
        publicUrl: lpMetadata.publicUrl, 
      };
      if (lpMetadata.id) {
        (payload as any).id = lpMetadata.id;
      }

      const response = await apiRequest(method, endpoint, payload);
      if (!response.ok) {
        const errorResult = await response.json().catch(() => ({ message: 'Erro desconhecido ao salvar' }));
        throw new Error(errorResult.message);
      }
      return response.json();
    },
    onSuccess: (savedLp) => {
      queryClient.invalidateQueries({ queryKey: ['myStudioLandingPages'] });
      setShowStudioEditor(false);
      setEditingLp(null);
      toast({ title: "Sucesso", description: `Landing page "${savedLp.name}" salva no seu backend.` });
    },
    onError: (error) => {
      toast({ title: "Erro ao Salvar LP", description: error.message, variant: "destructive" });
    }
  });

  const handleProjectSave = async (projectData: any, studioProjectIdFromEditor: string): Promise<{ id: string } | void > => {
    setIsEditorLoading(true);
    let lpName = editingLp?.name || "Nova Landing Page";
    let lpIdInOurDb = editingLp?.id;

    if (!editingLp) {
        const newName = prompt("Defina o Nome da Landing Page:", lpName);
        if (!newName || newName.trim() === "") {
            toast({ title: "Ação Cancelada", description: "Nome é obrigatório para nova landing page.", variant: "destructive"});
            setIsEditorLoading(false);
            throw new Error("Nome é obrigatório");
        }
        lpName = newName;
    }
    
    try {
      const savedLp = await saveLpMutation.mutateAsync({ 
        projectData, 
        lpMetadata: { 
            id: lpIdInOurDb, 
            name: lpName, 
            studioProjectId: studioProjectIdFromEditor, 
            status: 'draft',
            grapesJsData: projectData 
        } 
      });
      setIsEditorLoading(false);
      if (!savedLp.studioProjectId) {
        console.error("Backend não retornou studioProjectId para a landing page salva.", savedLp);
        throw new Error("Falha ao obter ID do projeto do Studio do backend.");
      }
      return { id: savedLp.studioProjectId }; 
    } catch (error) {
      setIsEditorLoading(false);
      console.error("Falha na mutação saveLpMutation em handleProjectSave:", error);
      throw error; 
    }
  };
  
  const handleProjectLoad = async (projectIdToLoad: string): Promise<{ project: any }> => {
    setIsEditorLoading(true);
    try {
      console.log(`[LP_PAGE] handleProjectLoad: Carregando projeto com studioProjectId: ${projectIdToLoad}`);
      const response = await apiRequest('GET', `/api/landingpages/studio-project/${projectIdToLoad}`);
      if (!response.ok) {
        const errData = await response.json().catch(() => ({ message: `Projeto ${projectIdToLoad} não encontrado ou erro ao carregar.` }));
        throw new Error(errData.message);
      }
      const lpData : any = await response.json();
      setIsEditorLoading(false);
      if (!lpData || typeof lpData.project !== 'object' || lpData.project === null) {
        console.warn(`[LP_PAGE] handleProjectLoad: Dados do projeto ${projectIdToLoad} estão vazios, malformados ou não contêm a chave 'project'. Resposta:`, lpData);
        return { project: {} };
      }
      console.log(`[LP_PAGE] handleProjectLoad: Projeto ${projectIdToLoad} carregado.`);
      return { project: lpData.project };
    } catch (error) {
        setIsEditorLoading(false);
        console.error("[LP_PAGE] handleProjectLoad: Erro ao carregar dados do projeto do backend:", error);
        toast({title: "Erro ao Carregar Projeto", description: (error as Error).message, variant: "destructive"})
        throw error;
    }
  };

  const handleAssetsUpload = async (files: File[]): Promise<{ src: string }[]> => {
    setIsEditorLoading(true);
    console.log("[LP_PAGE] handleAssetsUpload: Iniciando upload para", files.length, "arquivo(s).");
    
    const token = useAuthStore.getState().token; // TENTANDO PEGAR DO STORE ZUSTAND
    // const token = localStorage.getItem('token'); // Linha antiga

    console.log("[LP_PAGE] handleAssetsUpload: Token obtido:", token ? `SIM (primeiros 10: ${token.substring(0,10)}...)` : 'NÃO ENCONTRADO');

    if (!token) {
        toast({ title: "Erro de Autenticação", description: "Token não encontrado para upload de asset.", variant: "destructive" });
        setIsEditorLoading(false);
        throw new Error("Token de autenticação não encontrado para upload de asset.");
    }

    try {
      const uploadedAssetsPromises = files.map(async (file) => {
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch('/api/assets/lp-upload', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`, 
          },
          body: formData,
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({ message: `Falha no upload do arquivo: ${file.name}` }));
          console.error(`[LP_PAGE] handleAssetsUpload: Erro no backend para ${file.name}`, errData);
          throw new Error(errData.message);
        }
        const result = await response.json(); 
        console.log(`[LP_PAGE] handleAssetsUpload: Resposta do backend para ${file.name}`, result);

        if (Array.isArray(result) && result.length > 0 && result[0].src) {
          return result[0]; 
        } else {
          console.error("[LP_PAGE] handleAssetsUpload: Formato de resposta inesperado do upload de asset:", result);
          throw new Error(`API de upload não retornou a URL formatada corretamente para ${file.name}`);
        }
      });

      const results = await Promise.all(uploadedAssetsPromises);
      setIsEditorLoading(false);
      console.log("[LP_PAGE] handleAssetsUpload: Todos os assets processados:", results);
      return results; 
    } catch (error) {
      setIsEditorLoading(false);
      console.error("[LP_PAGE] handleAssetsUpload: Erro geral:", error);
      toast({ title: "Erro Upload de Assets", description: (error as Error).message, variant: "destructive" });
      throw error; 
    }
  };

  const handleAssetsDelete = async (assets: { src: string }[]): Promise<void> => {
    setIsEditorLoading(true);
    console.log("[LP_PAGE] handleAssetsDelete: Deletando assets:", assets);
    try {
      const response = await apiRequest('POST', '/api/assets/lp-delete', { assets }); 
      if (!response.ok) {
        const errData = await response.json().catch(() => ({ message: 'Falha ao deletar assets' }));
        throw new Error(errData.message);
      }
      setIsEditorLoading(false);
      toast({title: "Assets Deletados", description: `${assets.length} asset(s) marcados para remoção.`});
    } catch (error) {
        setIsEditorLoading(false);
        console.error("[LP_PAGE] handleAssetsDelete: Erro ao deletar assets no backend:", error);
        toast({title: "Erro ao Deletar Assets", description: (error as Error).message, variant: "destructive"})
        throw error;
    }
  };
  
  const handleEditorError = (error: any) => {
    console.error("[LP_PAGE] Studio Editor - Erro Global Recebido:", error);
    toast({ title: "Erro no Editor", description: error?.message || "Ocorreu um problema com o editor.", variant: "destructive"});
    setShowStudioEditor(false); 
  };

  const handleCreateNew = () => {
    if (!GRAPESJS_STUDIO_LICENSE_KEY) {
      toast({ title: "Configuração Inválida", description: "Chave de licença do GrapesJS Studio está ausente.", variant: "destructive" });
      return;
    }
    setEditingLp(null);
    setShowStudioEditor(true);
  };

  const handleEdit = (page: LandingPageItem) => {
     if (!GRAPESJS_STUDIO_LICENSE_KEY ) {
      toast({ title: "Configuração Inválida", description: "Chave de licença do GrapesJS Studio está ausente.", variant: "destructive" });
      return;
    }
    if (!page.studioProjectId && !page.grapesJsData) {
      toast({ title: "Dados Incompletos", description: "Landing page sem ID de projeto do Studio ou dados para carregar.", variant: "destructive"});
      return;
    }
    setEditingLp(page);
    setShowStudioEditor(true);
  };

  const deleteLpMutation = useMutation<void, Error, string>({
    mutationFn: async (pageId: string) => {
        const response = await apiRequest('DELETE', `/api/landingpages/${pageId}`);
        if(!response.ok) {
            const errorResult = await response.json().catch(() => ({ message: 'Erro desconhecido ao excluir' }));
            throw new Error(errorResult.message || "Falha ao excluir landing page");
        }
    },
    onSuccess: () => {
        queryClient.invalidateQueries({queryKey: ['myStudioLandingPages']});
        toast({title: "Excluído", description: "Landing page excluída com sucesso."});
    },
    onError: (error) => {
        toast({title: "Erro ao Excluir", description: error.message, variant: "destructive"});
    }
  });

  const handleDelete = (page: LandingPageItem) => {
    if (window.confirm(`Tem certeza que deseja excluir a landing page "${page.name}"? Esta ação não pode ser desfeita.`)) {
      deleteLpMutation.mutate(page.id);
    }
  };

  if (isLoadingLps) {
    return (
        <div className="p-8 text-center flex flex-col items-center justify-center h-[calc(100vh-150px)]">
            <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
            Carregando landing pages...
        </div>
    );
  }

  if (showStudioEditor) {
    return (
      <div className="p-0 md:p-0 h-screen flex flex-col bg-background relative">
        {(isEditorLoading || saveLpMutation.isPending) && (
            <div className="absolute inset-0 bg-black/30 flex items-center justify-center z-50">
                <Loader2 className="h-10 w-10 animate-spin text-white"/>
            </div>
        )}
        <div className="flex items-center justify-between mb-0 p-3 border-b bg-card flex-shrink-0">
          <Button onClick={() => { setShowStudioEditor(false); setEditingLp(null); }} variant="outline" size="sm" disabled={isEditorLoading || saveLpMutation.isPending}>
            ← Voltar para Lista
          </Button>
          <h2 className="text-lg font-semibold truncate px-2">
            {editingLp ? `Editando: ${editingLp.name}` : 'Nova Landing Page'}
          </h2>
          <div style={{width: '96px'}}></div>
        </div>
        <div className="flex-grow min-h-0">
          <StudioEditorComponent
            key={editingLp?.id || 'new-studio-lp'}
            licenseKey={GRAPESJS_STUDIO_LICENSE_KEY}
            projectId={editingLp?.studioProjectId}
            initialProjectData={editingLp?.grapesJsData}
            onProjectSave={handleProjectSave}
            onProjectLoad={handleProjectLoad}
            onAssetsUpload={handleAssetsUpload}
            onAssetsDelete={handleAssetsDelete}
            onEditorError={handleEditorError}
            onEditorLoad={() => console.log("[LP_PAGE] Studio Editor Component Carregado e Pronto!")}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground flex items-center">
            <LayoutTemplate className="w-7 h-7 mr-3 text-primary" />
            Landing Pages
          </h1>
          <p className="text-muted-foreground mt-1 md:mt-2">
            Crie e gerencie suas páginas de destino com o GrapesJS Studio.
          </p>
        </div>
        <Button onClick={handleCreateNew}>
          <Plus className="w-4 h-4 mr-2" />
          Criar Nova Landing Page
        </Button>
      </div>

      {lpsError && (
         <Card className="border-destructive bg-destructive/10">
            <CardContent className="p-4 text-destructive-foreground">
                <div className="flex items-center">
                    <AlertTriangle className="w-5 h-5 mr-2" />
                    <p className="font-semibold">Erro ao carregar landing pages:</p>
                </div>
                <p className="text-sm ml-7">{lpsError.message}</p>
                <Button variant="link" className="p-0 h-auto text-destructive-foreground hover:underline ml-7 mt-1" onClick={() => refetchLps()}>Tentar novamente</Button>
            </CardContent>
         </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Suas Landing Pages</CardTitle>
          <CardDescription>
            Visualize e gerencie todas as suas landing pages.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!isLoadingLps && landingPages.length === 0 && !lpsError ? (
            <div className="text-center py-12">
              <LayoutTemplate className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">Nenhuma Landing Page Criada</h3>
              <p className="text-muted-foreground mb-4">Comece criando sua primeira página de destino.</p>
              <Button onClick={handleCreateNew}>
                <Plus className="w-4 h-4 mr-2" />
                Criar Primeira Landing Page
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {landingPages.map((page) => (
                <Card key={page.id} className="flex flex-col sm:flex-row items-center justify-between p-4 gap-4 hover:shadow-md transition-shadow">
                  <div className="flex-grow">
                    <h4 className="font-semibold text-lg text-foreground">{page.name}</h4>
                    <p className="text-sm text-muted-foreground">
                      Criada em: {new Date(page.createdAt).toLocaleDateString()} - Status: 
                      <span className={`ml-1 font-medium ${page.status === 'published' ? 'text-green-500' : 'text-yellow-500'}`}>
                        {page.status === 'published' ? 'Publicada' : 'Rascunho'}
                      </span>
                    </p>
                    {page.publicUrl && page.status === 'published' && (
                       <a 
                         href={page.publicUrl} 
                         target="_blank" 
                         rel="noopener noreferrer" 
                         className="text-xs text-primary hover:underline flex items-center mt-1"
                       >
                         {page.publicUrl} <ExternalLink className="w-3 h-3 ml-1" />
                       </a>
                    )}
                    {page.studioProjectId && <p className="text-xs text-muted-foreground mt-1">Studio Project ID: {page.studioProjectId}</p>}
                  </div>
                  <div className="flex items-center space-x-2 flex-shrink-0">
                    {page.status === 'published' && page.publicUrl && (
                      <Button variant="outline" size="sm" onClick={() => window.open(page.publicUrl, '_blank')}>
                        <Eye className="w-4 h-4 mr-1 sm:mr-2" /> <span className="hidden sm:inline">Ver</span>
                      </Button>
                    )}
                    <Button variant="outline" size="sm" onClick={() => handleEdit(page)} disabled={!page.studioProjectId && !page.grapesJsData}>
                      <Edit2 className="w-4 h-4 mr-1 sm:mr-2" /> <span className="hidden sm:inline">Editar</span>
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => handleDelete(page)}>
                      <Trash2 className="w-4 h-4 mr-1 sm:mr-2" /> <span className="hidden sm:inline">Excluir</span>
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
