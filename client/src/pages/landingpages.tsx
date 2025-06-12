// client/src/pages/landingpages.tsx
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api';
import { LandingPage as LpType } from '../../shared/schema';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreHorizontal, PlusCircle, Trash2, Edit, Eye, Bot } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { StudioEditorComponent } from '@/components/StudioEditorComponent';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface GenerateLpFormData {
  name: string;
  slug: string;
  prompt: string;
}

export default function LandingPages() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showStudioEditor, setShowStudioEditor] = useState(false);
  const [editingLp, setEditingLp] = useState<LpType | null>(null);
  const [isGenerateDialogOpen, setIsGenerateDialogOpen] = useState(false);
  const [generateFormData, setGenerateFormData] = useState<GenerateLpFormData>({ name: '', slug: '', prompt: '' });
  
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);

  const { data: landingPages = [], isLoading } = useQuery<LpType[]>({
    queryKey: ['landingPages'],
    queryFn: () => apiRequest('GET', '/api/landingpages').then(res => res.json())
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest('DELETE', `/api/landingpages/${id}`),
    onSuccess: () => {
      toast({ title: "Sucesso", description: "Landing page excluída." });
      queryClient.invalidateQueries({ queryKey: ['landingPages'] });
    },
    onError: (error) => toast({ title: "Erro", description: error.message, variant: "destructive" }),
  });

  const handleOpenStudio = (lp: LpType | null) => {
    setEditingLp(lp);
    setShowStudioEditor(true);
  };
  
  const handleGenerateFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    let finalValue = value;
    if (name === 'slug') {
        finalValue = value.toLowerCase().replace(/[^a-z0-9-]/g, '').replace(/\s+/g, '-');
    }
    setGenerateFormData(prev => ({ ...prev, [name]: finalValue }));
  };
  
  const handleGeneratePreview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!generateFormData.prompt) {
        toast({ title: "Atenção", description: "O prompt não pode estar vazio.", variant: "destructive" });
        return;
    }
    setIsPreviewLoading(true);
    try {
        const response = await apiRequest('POST', '/api/landingpages/preview-from-prompt', { prompt: generateFormData.prompt });
        const data = await response.json();
        setPreviewHtml(data.htmlContent);
    } catch (error: any) {
        toast({ title: "Erro ao gerar preview", description: error.message, variant: "destructive" });
    } finally {
        setIsPreviewLoading(false);
        setIsGenerateDialogOpen(false); 
    }
  };

  const saveFromPreviewMutation = useMutation({
    mutationFn: () => {
        if (!previewHtml) throw new Error("Não há conteúdo para salvar.");
        return apiRequest('POST', '/api/landingpages', {
            name: generateFormData.name,
            slug: generateFormData.slug,
            status: 'draft',
            grapesJsData: { html: previewHtml, css: '' },
        });
    },
    onSuccess: () => {
        toast({ title: "Sucesso!", description: "Landing page gerada e salva como rascunho." });
        queryClient.invalidateQueries({ queryKey: ['landingPages'] });
        setPreviewHtml(null);
        setGenerateFormData({ name: '', slug: '', prompt: '' });
    },
    onError: (error: any) => toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" }),
  });

  if (showStudioEditor) {
    return <StudioEditorComponent initialData={editingLp} onBack={() => setShowStudioEditor(false)} />;
  }

  return (
    <div className="container mx-auto p-4 md:p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Landing Pages</h1>
        <div className="flex gap-2">
            <Button onClick={() => setIsGenerateDialogOpen(true)}>
                <Bot className="mr-2 h-4 w-4" /> Gerar com IA
            </Button>
            <Button onClick={() => handleOpenStudio(null)} variant="outline">
                <PlusCircle className="mr-2 h-4 w-4" /> Criar do Zero
            </Button>
        </div>
      </div>
      
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-64 rounded-lg" />)}
        </div>
      ) : landingPages.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed rounded-lg">
          <h3 className="text-xl font-semibold text-gray-700">Nenhuma landing page criada ainda.</h3>
          <p className="text-gray-500 mt-2">Comece gerando uma com IA ou criando uma do zero no editor.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {landingPages.map((lp) => (
            <Card key={lp.id} className="flex flex-col">
              <CardHeader>
                <CardTitle className="flex justify-between items-start">
                  <span className="truncate pr-2">{lp.name}</span>
                  <Badge variant={lp.status === 'published' ? 'success' : 'secondary'}>{lp.status}</Badge>
                </CardTitle>
                <CardDescription>/{lp.slug}</CardDescription>
              </CardHeader>
              <CardContent className="flex-grow">
                <p className="text-sm text-muted-foreground">Atualizada em: {format(new Date(lp.updatedAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button variant="outline" size="sm" onClick={() => handleOpenStudio(lp)}>
                  <Edit className="mr-2 h-4 w-4" /> Editar
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild><Button variant="ghost" className="h-8 w-8 p-0"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem asChild><a href={`/lp/${lp.slug}`} target="_blank" rel="noopener noreferrer"><Eye className="mr-2 h-4 w-4" /> Ver Página</a></DropdownMenuItem>
                    <AlertDialog>
                      <AlertDialogTrigger asChild><DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-red-600"><Trash2 className="mr-2 h-4 w-4" /> Excluir</DropdownMenuItem></AlertDialogTrigger>
                      <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle><AlertDialogDescription>Deseja realmente excluir a landing page "{lp.name}"?</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => deleteMutation.mutate(lp.id)} className="bg-red-600 hover:bg-red-700">Excluir</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
                    </AlertDialog>
                  </DropdownMenuContent>
                </DropdownMenu>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={isGenerateDialogOpen} onOpenChange={setIsGenerateDialogOpen}>
          <DialogContent>
              <DialogHeader><DialogTitle>Gerar Landing Page com IA</DialogTitle><DialogDescription>Descreva a página que você deseja. A IA criará um rascunho para você visualizar e salvar.</DialogDescription></DialogHeader>
              <form onSubmit={handleGeneratePreview} className="grid gap-4 py-4">
                  <div className="grid gap-2"><Label htmlFor="name">Nome da Página</Label><Input id="name" name="name" value={generateFormData.name} onChange={handleGenerateFormChange} placeholder="Ex: Ebook Gratuito de Marketing" required/></div>
                  <div className="grid gap-2"><Label htmlFor="slug">URL (slug)</Label><Input id="slug" name="slug" value={generateFormData.slug} onChange={handleGenerateFormChange} placeholder="Ex: ebook-gratuito-mkt" required/></div>
                  <div className="grid gap-2"><Label htmlFor="prompt">Sua Descrição (Prompt)</Label><Textarea id="prompt" name="prompt" value={generateFormData.prompt} onChange={handleGenerateFormChange} placeholder="Ex: Uma landing page para capturar leads oferecendo um ebook gratuito sobre marketing digital para iniciantes. Deve ter um título chamativo, uma imagem de capa do ebook, 3 benefícios principais e um formulário com campos para nome e email." rows={6} required/></div>
                  <DialogFooter><Button type="submit" disabled={isPreviewLoading}>{isPreviewLoading ? 'Gerando Preview...' : 'Gerar Preview'}</Button></DialogFooter>
              </form>
          </DialogContent>
      </Dialog>

      <Dialog open={previewHtml !== null} onOpenChange={(isOpen) => !isOpen && setPreviewHtml(null)}>
        <DialogContent className="max-w-5xl h-[90vh] flex flex-col">
            <DialogHeader><DialogTitle>Preview da Landing Page Gerada</DialogTitle><DialogDescription>Revise o resultado. Se gostar, clique em "Salvar" para adicioná-la aos seus rascunhos.</DialogDescription></DialogHeader>
            <div className="flex-grow border rounded-md my-4 overflow-hidden">
                <iframe srcDoc={previewHtml || ''} title="Preview da Landing Page" className="h-full w-full" sandbox="allow-scripts allow-same-origin"/>
            </div>
            <DialogFooter>
                <Button variant="outline" onClick={() => setPreviewHtml(null)}>Descartar</Button>
                <Button onClick={() => saveFromPreviewMutation.mutate()} disabled={saveFromPreviewMutation.isPending}>{saveFromPreviewMutation.isPending ? 'Salvando...' : 'Salvar Landing Page'}</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
