// client/src/pages/landingpages.tsx
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { apiRequest } from '@/lib/api';
import { LandingPage as LpType, InsertLandingPage, Campaign as CampaignType, LandingPageOptions } from '@shared/schema';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Edit, Bot, Loader2, ExternalLink, Save, Settings, Info, SlidersHorizontal, Palette, Briefcase, Users, LayoutList } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import GrapesJsEditor from '@/components/grapesjs-editor';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Switch } from '@/components/ui/switch';
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { Label } from '@/components/ui/label';

const generateLpFormSchema = z.object({
  name: z.string().min(3, "O nome deve ter pelo menos 3 caracteres."),
  campaignId: z.preprocess((val) => (val === "NONE" || val === "" ? null : Number(val)), z.number().nullable().optional()),
  reference: z.string().url("URL inválida.").optional().or(z.literal('')),
  prompt: z.string().min(20, "O prompt precisa de mais detalhes."),
  options: z.object({
    style: z.enum(['modern', 'minimal', 'bold', 'elegant', 'tech', 'startup']).optional(),
    colorScheme: z.enum(['dark', 'light', 'gradient', 'neon', 'earth', 'ocean']).optional(),
    industry: z.string().optional(),
    targetAudience: z.string().optional(),
    primaryCTA: z.string().optional(),
    secondaryCTA: z.string().optional(),
    includeTestimonials: z.boolean().optional(),
    includePricing: z.boolean().optional(),
    includeStats: z.boolean().optional(),
    includeFAQ: z.boolean().optional(),
    animationsLevel: z.enum(['none', 'subtle', 'moderate', 'dynamic']).optional(),
  }).optional(),
});

type GenerateLpFormData = z.infer<typeof generateLpFormSchema>;

export default function LandingPages() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  const [editingLp, setEditingLp] = useState<LpType | null>(null);

  const { data: campaigns = [] } = useQuery<CampaignType[]>({
    queryKey: ['campaignsForLpSelect'],
    queryFn: () => apiRequest('GET', '/api/campaigns').then(res => res.json())
  });

  const form = useForm<GenerateLpFormData>({
    resolver: zodResolver(generateLpFormSchema),
    defaultValues: {
        name: '',
        campaignId: null,
        reference: '',
        prompt: '',
        options: {
            style: 'modern',
            colorScheme: 'dark',
            includeTestimonials: true,
            includeFAQ: true,
            includeStats: true,
            animationsLevel: 'moderate',
        },
    },
  });

  const previewMutation = useMutation({
    mutationFn: async (data: { prompt: string; reference?: string, options: LandingPageOptions }) => {
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
    mutationFn: (data: Partial<InsertLandingPage>) =>
      apiRequest('POST', '/api/landingpages', data).then(res => res.json()),
    onSuccess: (savedLp: LpType) => {
      toast({ title: "Página Salva!", description: "Redirecionando para o editor..." });
      queryClient.invalidateQueries({ queryKey: ['landingPages'] });
      setEditingLp(savedLp);
      setShowEditor(true);
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao Salvar", description: error.message, variant: "destructive" });
    },
  });

  const updateLpMutation = useMutation({
    mutationFn: async (data: { id: number, grapesJsData: any }) => {
      return apiRequest('PUT', `/api/landingpages/${data.id}`, { grapesJsData: data.grapesJsData });
    },
    onSuccess: () => {
      toast({ title: "Sucesso!", description: "Alterações na landing page salvas." });
      queryClient.invalidateQueries({ queryKey: ['landingPages'] });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao Salvar", description: error.message, variant: "destructive" });
    }
  });

  const onGenerateSubmit = (data: GenerateLpFormData) => {
    setPreviewHtml(null);
    previewMutation.mutate({ prompt: data.prompt, reference: data.reference, options: data.options || {} });
  };
  
  const handleEditClick = () => {
    if (!previewHtml) return;
    const formData = form.getValues();
    saveAndEditMutation.mutate({
      name: formData.name,
      campaignId: formData.campaignId || null,
      grapesJsData: { html: previewHtml, css: '' },
      generationOptions: formData.options
    });
  };

  const handleOpenInNewTab = () => {
    if (previewHtml) {
      const blob = new Blob([previewHtml], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
      // URL.revokeObjectURL(url) // Pode fechar a aba instantaneamente em alguns navegadores
    } else {
        toast({ title: "Erro", description: "Nenhum preview para abrir.", variant: "destructive" });
    }
  };

  const handleSaveFromEditor = (id: number, data: any) => {
    updateLpMutation.mutate({ id, grapesJsData: data });
  };

  if (showEditor && editingLp) {
    return ( <GrapesJsEditor initialData={editingLp.grapesJsData as any} onSave={(data) => handleSaveFromEditor(editingLp.id, data)} onBack={() => setShowEditor(false)}/> );
  }

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Gerador de Landing Pages Avançado</h1>
        <p className="text-muted-foreground">Utilize o Gemini 1.5 Pro para criar páginas de alta conversão.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        <Card className="sticky top-6">
          <CardHeader>
            <CardTitle className="flex items-center"><Bot className="mr-2 text-primary" /> Informações para a IA</CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onGenerateSubmit)} className="space-y-6">
                
                {/* Campos Principais */}
                <div className="space-y-4">
                    <FormField control={form.control} name="name" render={({ field }) => ( <FormItem><FormLabel>Nome da Página *</FormLabel><FormControl><Input id="lp-name" autoComplete="off" placeholder="Ex: Lançamento do Produto Y" {...field} /></FormControl><FormMessage /></FormItem> )} />
                    <FormField control={form.control} name="prompt" render={({ field }) => ( <FormItem><FormLabel>Prompt Detalhado *</FormLabel><FormControl><Textarea id="lp-prompt" placeholder="Descreva a estrutura, seções, conteúdo e o objetivo da sua página..." rows={6} {...field} /></FormControl><FormMessage /></FormItem> )} />
                    <FormField control={form.control} name="reference" render={({ field }) => ( <FormItem><FormLabel>URL de Referência (Opcional)</FormLabel><FormControl><Input id="lp-reference" autoComplete="url" placeholder="https://exemplo.com/pagina-inspiracao" {...field} /></FormControl><FormMessage /></FormItem> )} />
                </div>
                
                {/* Opções Avançadas no Accordion */}
                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="item-1">
                    <AccordionTrigger><div className="flex items-center gap-2"><SlidersHorizontal className="w-4 h-4"/>Opções Avançadas</div></AccordionTrigger>
                    <AccordionContent className="pt-4 space-y-4">
                      {/* ... restante do formulário avançado ... */}
                       <FormField control={form.control} name="options.style" render={({ field }) => ( <FormItem><FormLabel>Estilo Visual</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Moderno" /></SelectTrigger></FormControl><SelectContent><SelectItem value="modern">Moderno</SelectItem><SelectItem value="minimal">Minimalista</SelectItem><SelectItem value="bold">Ousado</SelectItem><SelectItem value="elegant">Elegante</SelectItem><SelectItem value="tech">Tecnológico</SelectItem><SelectItem value="startup">Startup</SelectItem></SelectContent></Select><FormMessage /></FormItem> )} />
                        <FormField control={form.control} name="options.colorScheme" render={({ field }) => ( <FormItem><FormLabel>Esquema de Cores</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Escuro" /></SelectTrigger></FormControl><SelectContent><SelectItem value="dark">Escuro</SelectItem><SelectItem value="light">Claro</SelectItem><SelectItem value="gradient">Gradiente</SelectItem><SelectItem value="neon">Neon</SelectItem><SelectItem value="earth">Tons de Terra</SelectItem><SelectItem value="ocean">Tons de Oceano</SelectItem></SelectContent></Select><FormMessage /></FormItem> )} />
                        <div className="grid grid-cols-2 gap-4">
                           <FormField control={form.control} name="options.industry" render={({ field }) => ( <FormItem><FormLabel>Indústria</FormLabel><FormControl><Input placeholder="Ex: SaaS, E-commerce" {...field} /></FormControl></FormItem> )} />
                           <FormField control={form.control} name="options.targetAudience" render={({ field }) => ( <FormItem><FormLabel>Público-Alvo</FormLabel><FormControl><Input placeholder="Ex: Desenvolvedores, Mães" {...field} /></FormControl></FormItem> )} />
                        </div>
                        <div className="pt-2 space-y-3">
                           <Label className="font-semibold">Seções Opcionais</Label>
                           <FormField control={form.control} name="options.includeTestimonials" render={({ field }) => (<FormItem className="flex flex-row items-center justify-between rounded-lg border p-3"><FormLabel>Depoimentos</FormLabel><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl></FormItem> )} />
                           <FormField control={form.control} name="options.includePricing" render={({ field }) => (<FormItem className="flex flex-row items-center justify-between rounded-lg border p-3"><FormLabel>Tabela de Preços</FormLabel><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl></FormItem> )} />
                           <FormField control={form.control} name="options.includeFAQ" render={({ field }) => (<FormItem className="flex flex-row items-center justify-between rounded-lg border p-3"><FormLabel>FAQ (Perguntas Frequentes)</FormLabel><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl></FormItem> )} />
                        </div>

                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
                
                <Button type="submit" className="w-full text-base py-3" disabled={previewMutation.isPending}>
                  {previewMutation.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/> Gerando Preview...</> : <><Bot className="mr-2 h-4 w-4"/>Gerar Preview com IA</>}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Preview da Página</CardTitle>
            <div className="flex items-center justify-between gap-2">
                <CardDescription className="flex-grow">Revise o resultado. Se gostar, clique para editar.</CardDescription>
                <div className="flex items-center flex-shrink-0 gap-2">
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
