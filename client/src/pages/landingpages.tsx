// client/src/pages/landingpages.tsx
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { apiRequest } from '@/lib/api';
import { LandingPage as LpType, InsertLandingPage } from '@shared/schema';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreHorizontal, PlusCircle, Trash2, Edit, Eye, Bot, Loader2 as SpinnerIcon } from 'lucide-react';
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
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

const generateLpFormSchema = z.object({
  name: z.string().min(3, "O nome deve ter pelo menos 3 caracteres."),
  slug: z.string().min(3, "O slug deve ter pelo menos 3 caracteres.").regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug inválido (letras minúsculas, números e hífens)."),
  prompt: z.string().min(20, "A descrição (prompt) deve ter pelo menos 20 caracteres."),
});

type GenerateLpFormData = z.infer<typeof generateLpFormSchema>;

export default function LandingPages() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showStudioEditor, setShowStudioEditor] = useState(false);
  const [editingLp, setEditingLp] = useState<LpType | null>(null);
  const [isGenerateDialogOpen, setIsGenerateDialogOpen] = useState(false);

  const form = useForm<GenerateLpFormData>({
    resolver: zodResolver(generateLpFormSchema),
    defaultValues: { name: '', slug: '', prompt: '' },
  });
  
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
    onError: (error: any) => toast({ title: "Erro", description: error.message, variant: "destructive" }),
  });
  
  const createFromIaMutation = useMutation({
    mutationFn: (data: GenerateLpFormData) => apiRequest('POST', '/api/landingpages/generate-from-prompt', data),
    onSuccess: (newLp: LpType) => {
        toast({ title: "Sucesso!", description: "Landing page gerada e salva como rascunho." });
        queryClient.invalidateQueries({ queryKey: ['landingPages'] });
        setIsGenerateDialogOpen(false);
        form.reset();
        handleOpenStudio(newLp);
    },
    onError: (error: any) => {
      if (error.message && error.message.toLowerCase().includes('slug')) {
          form.setError('slug', { type: 'manual', message: error.message });
      } else {
          toast({ title: "Erro ao criar LP com IA", description: error.message, variant: "destructive" });
      }
    },
  });

  const handleOpenStudio = (lp: LpType | null) => {
    if (!lp) {
        const newLpData = {
            id: undefined,
            name: 'Nova Landing Page',
            slug: `pagina-${Date.now()}`,
            status: 'draft',
            grapesJsData: null,
        } as unknown as LpType;
        setEditingLp(newLpData);
    } else {
        setEditingLp(lp);
    }
    setShowStudioEditor(true);
  };
  
  const handleGenerateAndOpenEditor = async (data: GenerateLpFormData) => {
    createFromIaMutation.mutate(data);
  };

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
                  <Badge variant={lp.status === 'published' ? 'default' : 'secondary'}>{lp.status}</Badge>
                </CardTitle>
                <CardDescription>/{lp.slug}</CardDescription>
              </CardHeader>
              <CardContent className="flex-grow">
                <p className="text-sm text-muted-foreground">Atualizada em: {lp.updatedAt ? format(new Date(lp.updatedAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }) : 'N/A'}</p>
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button variant="outline" size="sm" onClick={() => handleOpenStudio(lp)}>
                  <Edit className="mr-2 h-4 w-4" /> Editar
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild><Button variant="ghost" className="h-8 w-8 p-0"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem asChild><a href={lp.publicUrl || `/lp/${lp.slug}`} target="_blank" rel="noopener noreferrer"><Eye className="mr-2 h-4 w-4" /> Ver Página</a></DropdownMenuItem>
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
              <DialogHeader><DialogTitle>Gerar Landing Page com IA</DialogTitle><DialogDescription>Descreva a página que você deseja. A IA criará um rascunho que você poderá editar e salvar.</DialogDescription></DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleGenerateAndOpenEditor)} className="grid gap-4 py-4">
                    <FormField control={form.control} name="name" render={({ field }) => ( <FormItem><FormLabel>Nome da Página</FormLabel><FormControl><Input placeholder="Ex: Ebook Gratuito de Marketing" {...field} /></FormControl><FormMessage /></FormItem> )} />
                    <FormField control={form.control} name="slug" render={({ field }) => ( <FormItem><FormLabel>URL (slug)</FormLabel><FormControl><Input placeholder="Ex: ebook-gratuito-mkt" {...field} onChange={e => field.onChange(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '').replace(/\s+/g, '-'))} /></FormControl><FormMessage /></FormItem> )} />
                    <FormField control={form.control} name="prompt" render={({ field }) => ( <FormItem><FormLabel>Sua Descrição (Prompt)</FormLabel><FormControl><Textarea placeholder="Ex: Uma landing page para capturar leads oferecendo um ebook gratuito sobre marketing digital para iniciantes..." rows={6} {...field} /></FormControl><FormMessage /></FormItem> )} />
                    <DialogFooter><Button type="submit" disabled={createFromIaMutation.isPending}>{createFromIaMutation.isPending ? <><SpinnerIcon className="mr-2 h-4 w-4 animate-spin"/> Gerando...</> : 'Gerar e Abrir Editor'}</Button></DialogFooter>
                </form>
              </Form>
          </DialogContent>
      </Dialog>
    </div>
  );
}
