// client/src/pages/landingpages.tsx
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { apiRequest } from '@/lib/api';
import { LandingPage as LpType, InsertLandingPage, Campaign as CampaignType } from '@shared/schema';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { MoreHorizontal, Edit, Bot, Loader2, Link as LinkIcon, Save, ExternalLink } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { StudioEditorComponent } from '@/components/StudioEditorComponent';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const generateLpFormSchema = z.object({
  name: z.string().min(3, "O nome deve ter pelo menos 3 caracteres."),
  campaignId: z.preprocess((val) => (val === "NONE" || val === "" ? null : Number(val)), z.number().nullable().optional()),
  reference: z.string().url("Por favor, insira uma URL válida.").optional().or(z.literal('')),
  prompt: z.string().min(20, "O prompt deve ter pelo menos 20 caracteres."),
});

type GenerateLpFormData = z.infer<typeof generateLpFormSchema>;

export default function LandingPages() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [showStudioEditor, setShowStudioEditor] = useState(false);
  const [editingLp, setEditingLp] = useState<LpType | null>(null);

  const { data: campaigns = [] } = useQuery<CampaignType[]>({
    queryKey: ['campaignsForLpSelect'],
    queryFn: () => apiRequest('GET', '/api/campaigns').then(res => res.json())
  });

  const form = useForm<GenerateLpFormData>({
    resolver: zodResolver(generateLpFormSchema),
    defaultValues: { name: '', campaignId: null, reference: '', prompt: '' },
  });

  const previewMutation = useMutation({
    mutationFn: async (data: { prompt: string; reference?: string }) => {
      const response = await apiRequest('POST', '/api/landingpages/preview-from-prompt', data);
      return response.json();
    },
    onSuccess: (data: { htmlContent: string }) => {
      setPreviewHtml(data.htmlContent);
      toast({ title: "Pré-visualização Gerada!", description: "Revise o resultado abaixo." });
    },
    onError: (error: Error) => {
      toast({ title: "Erro na Geração", description: error.message, variant: "destructive" });
    },
  });

  const saveAndEditMutation = useMutation({
    mutationFn: (data: { name: string; campaignId: number | null; grapesJsData: { html: string; css: string } }) =>
      apiRequest('POST', '/api/landingpages', data).then(res => res.json()),
    onSuccess: (savedLp: LpType) => {
      toast({ title: "Página Salva!", description: "Redirecionando para o editor..." });
      queryClient.invalidateQueries({ queryKey: ['landingPages'] });
      setEditingLp(savedLp);
      setShowStudioEditor(true);
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao Salvar", description: error.message, variant: "destructive" });
    },
  });

  const onGenerateSubmit = (data: GenerateLpFormData) => {
    setPreviewHtml(null);
    previewMutation.mutate({ prompt: data.prompt, reference: data.reference });
  };
  
  const handleEditClick = () => {
    if (!previewHtml) return;
    const formData = form.getValues();
    saveAndEditMutation.mutate({
      name: formData.name,
      campaignId: formData.campaignId || null,
      grapesJsData: { html: previewHtml, css: '' },
    });
  };

  // ✅ NOVO: Função para abrir o preview em uma nova aba
  const handleOpenInNewTab = () => {
    if (previewHtml) {
        const newWindow = window.open();
        if (newWindow) {
            newWindow.document.write(previewHtml);
            newWindow.document.close();
        } else {
            toast({ title: "Erro", description: "Não foi possível abrir a nova aba. Verifique se o seu navegador está bloqueando pop-ups.", variant: "destructive" });
        }
    }
  };

  if (showStudioEditor) {
    return <StudioEditorComponent initialData={editingLp} onBack={() => { setShowStudioEditor(false); setEditingLp(null); }} />;
  }

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Gerador de Landing Pages com IA</h1>
        <p className="text-muted-foreground">Crie e edite suas páginas de forma rápida e inteligente.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        <Card className="sticky top-6">
          <CardHeader>
            <CardTitle className="flex items-center"><Bot className="mr-2 text-primary" /> Informações para a IA</CardTitle>
            <CardDescription>Descreva o que você precisa e a IA criará uma primeira versão para você.</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onGenerateSubmit)} className="space-y-4">
                <FormField control={form.control} name="name" render={({ field }) => ( <FormItem><FormLabel>Nome da Página *</FormLabel><FormControl><Input id="lp-name" autoComplete="off" placeholder="Ex: Lançamento do Produto Y" {...field} /></FormControl><FormMessage /></FormItem> )} />
                <FormField control={form.control} name="campaignId" render={({ field }) => ( <FormItem><FormLabel>Associar à Campanha</FormLabel><Select onValueChange={(value) => field.onChange(value === "NONE" ? null : parseInt(value))} defaultValue={field.value === null ? "NONE" : String(field.value)}><FormControl><SelectTrigger id="lp-campaignId"><SelectValue placeholder="Nenhuma" /></SelectTrigger></FormControl><SelectContent><SelectItem value="NONE">Nenhuma campanha</SelectItem>{campaigns.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem> )} />
                <FormField control={form.control} name="reference" render={({ field }) => ( <FormItem><FormLabel>URL de Referência (Opcional)</FormLabel><FormControl><Input id="lp-reference" autoComplete="url" placeholder="https://exemplo.com/pagina-inspiracao" {...field} /></FormControl><FormMessage /></FormItem> )} />
                <FormField control={form.control} name="prompt" render={({ field }) => ( <FormItem><FormLabel>Prompt Detalhado *</FormLabel><FormControl><Textarea id="lp-prompt" placeholder="Descreva a estrutura, seções, conteúdo e o objetivo da sua página..." rows={8} {...field} /></FormControl><FormMessage /></FormItem> )} />
                <Button type="submit" className="w-full" disabled={previewMutation.isPending}>
                  {previewMutation.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/> Gerando Preview...</> : 'Gerar Preview'}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Preview da Página</CardTitle>
            <div className="flex items-center justify-between gap-2">
                <CardDescription className="flex-grow">Revise o resultado e clique para editar ou abrir em nova aba.</CardDescription>
                <div className="flex items-center flex-shrink-0 gap-2">
                    {/* ✅ NOVO: Botão para abrir em nova aba */}
                    <Button onClick={handleOpenInNewTab} size="sm" variant="outline" disabled={!previewHtml}>
                        <ExternalLink className="mr-2 h-4 w-4"/> Nova Aba
                    </Button>
                    <Button onClick={handleEditClick} size="sm" disabled={!previewHtml || saveAndEditMutation.isPending}>
                        {saveAndEditMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Edit className="mr-2 h-4 w-4"/>}
                        Salvar e Editar
                    </Button>
                </div>
            </div>
          </CardHeader>
          <CardContent className="h-[calc(100vh-20rem)] min-h-[500px] border rounded-md bg-white">
            {previewMutation.isPending && (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                    <Bot className="w-12 h-12 mb-4 animate-bounce" />
                    <p className="font-semibold">A IA está trabalhando...</p>
                    <p className="text-sm">Isso pode levar alguns instantes.</p>
                </div>
            )}
            {!previewMutation.isPending && previewHtml && (
                <iframe srcDoc={previewHtml} title="Preview da Landing Page" className="w-full h-full border-0" sandbox="allow-scripts"/>
            )}
            {!previewMutation.isPending && !previewHtml && (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                    <p>A pré-visualização da sua página aparecerá aqui.</p>
                </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
