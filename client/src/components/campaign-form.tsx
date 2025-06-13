import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/api';
import { insertCampaignSchema, Campaign as CampaignType, InsertCampaign } from '@shared/schema';
import { X, Loader2, CalendarIcon, Info } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

type CampaignFormData = InsertCampaign;

interface CampaignFormProps {
  onClose: () => void;
  onSuccess: (newCampaign: CampaignType) => void;
  initialData?: Partial<CampaignType>;
}

const platformOptions = [
  { value: 'facebook', label: 'Facebook Ads' },
  { value: 'google_ads', label: 'Google Ads' },
  { value: 'instagram', label: 'Instagram Ads' },
  { value: 'linkedin', label: 'LinkedIn Ads' },
  { value: 'tiktok', label: 'TikTok Ads' },
];

const objectiveOptions = [
  { value: 'awareness', label: 'Reconhecimento de Marca' },
  { value: 'traffic', label: 'Tráfego para o Site' },
  { value: 'engagement', label: 'Engajamento com Conteúdo' },
  { value: 'leads', label: 'Geração de Leads' },
  { value: 'app_promotion', label: 'Promoção de Aplicativo' },
  { value: 'sales', label: 'Vendas Online (Conversões)' },
  { value: 'store_visits', label: 'Visitas à Loja Física' },
];

export default function CampaignForm({ onClose, onSuccess, initialData }: CampaignFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [templateToUse, setTemplateToUse] = useState<string | null>(null);
  const isEditing = !!initialData?.id;

  const form = useForm<CampaignFormData>({
    resolver: zodResolver(insertCampaignSchema),
    defaultValues: {
      name: initialData?.name || '',
      description: initialData?.description || '',
      status: initialData?.status || 'draft',
      platforms: initialData?.platforms || [],
      objectives: initialData?.objectives || [],
      budget: initialData?.budget ? String(initialData.budget) : '',
      dailyBudget: initialData?.dailyBudget ? String(initialData.dailyBudget) : '',
      startDate: initialData?.startDate ? new Date(initialData.startDate) : undefined,
      endDate: initialData?.endDate ? new Date(initialData.endDate) : undefined,
      targetAudience: initialData?.targetAudience || '',
      industry: initialData?.industry || '',
      avgTicket: initialData?.avgTicket ? String(initialData.avgTicket) : '',
      isTemplate: initialData?.isTemplate || false,
    },
  });

  const { data: templates = [] } = useQuery<CampaignType[]>({
    queryKey: ['campaignTemplates'],
    queryFn: async () => {
      const allCampaigns: CampaignType[] = await apiRequest('GET', '/api/campaigns').then(res => res.json());
      return allCampaigns.filter(c => c.isTemplate);
    }
  });

  const mutation = useMutation({
    mutationFn: async (data: CampaignFormData) => {
      const isCloning = !isEditing && templateToUse;
      const method = isEditing ? 'PUT' : 'POST';
      let url = '/api/campaigns';

      if (isEditing) {
        url = `/api/campaigns/${initialData!.id}`;
      } else if (isCloning) {
        url = `/api/campaigns/from-template/${templateToUse}`;
      }
      
      const payload: any = { ...data };
      ['budget', 'dailyBudget', 'avgTicket'].forEach(key => {
        if (payload[key] !== undefined && payload[key] !== null && payload[key] !== '') {
          payload[key] = parseFloat(payload[key]);
        } else {
          payload[key] = null;
        }
      });
      
      const response = await apiRequest(method, url, payload);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: `Erro ao ${isCloning ? 'clonar' : isEditing ? 'atualizar' : 'criar'} campanha` }));
        throw new Error(errorData.error || errorData.message);
      }
      return response.json();
    },
    onSuccess: (newCampaignData) => {
      toast({ title: `Campanha ${isEditing ? 'atualizada' : 'criada'} com sucesso.` });
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      queryClient.invalidateQueries({ queryKey: ['campaignSchedule', String(newCampaignData.id)] });
      onSuccess(newCampaignData);
    },
    onError: (error: Error) => {
      toast({ title: `Erro ao salvar campanha`, description: error.message, variant: 'destructive' });
    },
  });

  function onSubmit(data: CampaignFormData) {
    mutation.mutate(data);
  }

  return (
      <Dialog open onOpenChange={onClose}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col p-0">
            <DialogHeader className="p-6 pb-4 border-b">
              <DialogTitle className="text-2xl">{isEditing ? 'Editar Campanha' : 'Nova Campanha'}</DialogTitle>
              <DialogDescription>
                {isEditing ? `Modificando os detalhes da campanha "${initialData.name}".` : 'Preencha os campos abaixo para criar uma nova campanha.'}
              </DialogDescription>
            </DialogHeader>
            <div className="flex-grow overflow-y-auto custom-scrollbar">
                <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 px-6 py-4" autoComplete="off">
                    {!isEditing && templates.length > 0 && (
                        <FormItem>
                            <FormLabel>Usar Template de Cronograma</FormLabel>
                            <Select onValueChange={(value) => setTemplateToUse(value === "NONE" ? null : value)}>
                                <FormControl>
                                    <SelectTrigger id="template-select"><SelectValue placeholder="Opcional: Comece com um modelo" /></SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    <SelectItem value="NONE">Nenhum (Começar do zero)</SelectItem>
                                    {templates.map(t => <SelectItem key={t.id} value={String(t.id)}>{t.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </FormItem>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                    <FormField control={form.control} name="name" render={({ field }) => ( <FormItem className="md:col-span-2"><FormLabel>Nome da Campanha *</FormLabel><FormControl><Input placeholder="Ex: Lançamento Produto X - Q4" {...field} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="status" render={({ field }) => ( <FormItem><FormLabel>Status</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Selecione o status" /></SelectTrigger></FormControl><SelectContent><SelectItem value="draft">Rascunho</SelectItem><SelectItem value="active">Ativo</SelectItem><SelectItem value="paused">Pausado</SelectItem><SelectItem value="completed">Finalizado</SelectItem></SelectContent></Select><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="industry" render={({ field }) => ( <FormItem><FormLabel>Setor/Indústria</FormLabel><FormControl><Input placeholder="Ex: E-commerce, SaaS, Varejo" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} />
                    </div>

                    <FormField control={form.control} name="description" render={({ field }) => (
                        <FormItem><FormLabel>Descrição</FormLabel><FormControl><Textarea placeholder="Detalhes sobre o público, oferta, metas principais..." rows={3} {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>
                    )}/>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                    <FormField control={form.control} name="platforms" render={() => (
                        <FormItem>
                            <FormLabel>Plataformas *</FormLabel>
                            <FormDescription className="text-xs">Selecione onde a campanha será veiculada.</FormDescription>
                            <div className="mt-2 space-y-2 rounded-md border p-4 max-h-48 overflow-y-auto">
                            {platformOptions.map((platform) => (
                                <FormField key={platform.value} control={form.control} name="platforms" render={({ field }) => { return (<FormItem className="flex flex-row items-start space-x-3 space-y-0"><FormControl><Checkbox checked={field.value?.includes(platform.value)} onCheckedChange={(checked) => { return checked ? field.onChange([...(field.value || []), platform.value]) : field.onChange((field.value || []).filter( (value) => value !== platform.value));}}/></FormControl><FormLabel className="text-sm font-normal">{platform.label}</FormLabel></FormItem>);}}/>
                            ))}
                            </div>
                            <FormMessage />
                        </FormItem>
                    )}/>
                    <FormField control={form.control} name="objectives" render={() => (
                        <FormItem>
                            <FormLabel>Objetivos da Campanha</FormLabel>
                            <FormDescription className="text-xs">Quais metas você deseja alcançar?</FormDescription>
                            <div className="mt-2 space-y-2 rounded-md border p-4 max-h-48 overflow-y-auto">
                            {objectiveOptions.map((objective) => (
                                <FormField key={objective.value} control={form.control} name="objectives" render={({ field }) => { return ( <FormItem className="flex flex-row items-start space-x-3 space-y-0"><FormControl><Checkbox checked={field.value?.includes(objective.value)} onCheckedChange={(checked) => { return checked ? field.onChange([...(field.value || []), objective.value]) : field.onChange((field.value || []).filter((value) => value !== objective.value));}}/></FormControl><FormLabel className="text-sm font-normal">{objective.label}</FormLabel></FormItem>);}}/>
                            ))}
                            </div>
                            <FormMessage />
                        </FormItem>
                    )}/>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-4">
                    <FormField control={form.control} name="budget" render={({ field }) => ( <FormItem><FormLabel>Orçamento Total (R$)</FormLabel><FormControl><Input type="number" placeholder="Ex: 5000.00" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="dailyBudget" render={({ field }) => ( <FormItem><FormLabel>Orçamento Diário (R$)</FormLabel><FormControl><Input type="number" placeholder="Ex: 100.00" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="avgTicket" render={({ field }) => ( <FormItem><FormLabel>Ticket Médio (R$)</FormLabel><FormControl><Input type="number" placeholder="Ex: 150.00" {...field} value={field.value || ''} /></FormControl><FormDescription className="text-xs flex items-center"><Info size={12} className="mr-1"/> Valor médio por venda/conversão.</FormDescription><FormMessage /></FormItem>)} />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                    <FormField control={form.control} name="startDate" render={({ field }) => (
                        <FormItem className="flex flex-col"><FormLabel>Data de Início</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant={"outline"} className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>{field.value ? (format(field.value, "PPP", { locale: ptBR })) : (<span>Escolha uma data</span>)}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value ?? undefined} onSelect={field.onChange} initialFocus /></PopoverContent></Popover><FormMessage /></FormItem>
                    )}/>
                    <FormField control={form.control} name="endDate" render={({ field }) => (
                        <FormItem className="flex flex-col"><FormLabel>Data de Fim</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant={"outline"} className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>{field.value ? (format(field.value, "PPP", { locale: ptBR })) : (<span>Escolha uma data</span>)}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value ?? undefined} onSelect={field.onChange} disabled={(date) => (form.getValues("startDate") && date < form.getValues("startDate")!)} initialFocus /></PopoverContent></Popover><FormMessage /></FormItem>
                    )}/>
                    </div>

                    <FormField control={form.control} name="targetAudience" render={({ field }) => (
                        <FormItem><FormLabel>Público-Alvo Detalhado</FormLabel><FormControl><Textarea placeholder="Ex: Mulheres, 25-45 anos, interessadas em moda sustentável, residentes em capitais..." rows={3} {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>
                    )}/>
                    
                    <FormField control={form.control} name="isTemplate" render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm md:col-span-2 mt-4">
                            <div className="space-y-0.5">
                                <FormLabel>Salvar como Template</FormLabel>
                                <FormDescription>Permitir que esta campanha seja usada como modelo para futuras criações.</FormDescription>
                            </div>
                            <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                        </FormItem>
                    )}/>
                </form>
                </Form>
            </div>
            <DialogFooter className="p-6 pt-4 border-t">
              <Button type="button" variant="outline" onClick={onClose} disabled={mutation.isPending}>Cancelar</Button>
              <Button type="submit" form="campaign-form" disabled={mutation.isPending} onClick={form.handleSubmit(onSubmit)}>
                  {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {isEditing ? 'Salvar Alterações' : 'Criar Campanha'}
              </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
  );
}
