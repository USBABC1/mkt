// client/src/pages/funnel.tsx
import { useState, useMemo, useEffect, ChangeEvent } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select as ShadSelect, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Label } from '@/components/ui/label'; // Adicionado Label
import { Slider } from '@/components/ui/slider'; // Adicionado Slider
import { Users, MousePointer, ShoppingCart, CreditCard, TrendingUp, Plus, Edit, Trash2, Loader2, AlertTriangle, Link as LinkIcon, Filter as FilterIcon, BarChartHorizontalBig, Settings, Percent, ShoppingBag, DollarSign as DollarSignIcon } from 'lucide-react'; // Adicionado mais icones
import { ResponsiveContainer, FunnelChart, Funnel as RechartsFunnel, Tooltip as RechartsTooltip, LabelList, Cell } from 'recharts';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/api';
import { Funnel as FunnelType, FunnelStage, InsertFunnel, insertFunnelSchema, Campaign as CampaignType } from '@shared/schema';

interface FunnelWithStages extends FunnelType {
  stages: FunnelStage[];
  totalVisitors?: number;
  totalConversions?: number;
  overallConversionRate?: number;
}

type FunnelFormData = Pick<InsertFunnel, "name" | "description" | "campaignId">;

// Para o Simulador
interface SimulatorData {
  investimentoDiario: number;
  cpc: number;
  precoProduto: number;
  alcanceOrganico: number;
  conversaoAlcanceParaCliques: number;
  taxaConversaoSite: number;
}

const initialSimulatorData: SimulatorData = {
  investimentoDiario: 279.70,
  cpc: 1.95,
  precoProduto: 97.00,
  alcanceOrganico: 12000,
  conversaoAlcanceParaCliques: 2.00,
  taxaConversaoSite: 2.50,
};

const FUNNEL_COLORS = ['#8884d8', '#83a6ed', '#8dd1e1', '#82ca9d', '#a4de6c', '#d0ed57', '#ffc658'];
const SIMULATOR_FUNNEL_COLORS = ['#00C49F', '#FFBB28', '#FF8042'];


export default function FunnelPage() {
  const [selectedFunnelId, setSelectedFunnelId] = useState<number | null>(null);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingFunnel, setEditingFunnel] = useState<FunnelType | null>(null);
  const [campaignFilter, setCampaignFilter] = useState<string>('all');
  const [simulatorData, setSimulatorData] = useState<SimulatorData>(initialSimulatorData);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Queries para Funis Salvos
  const { data: allFunnels = [], isLoading: isLoadingFunnels, error: funnelsError, refetch: refetchFunnelsList } = useQuery<FunnelType[]>({
    queryKey: ['funnels'],
    queryFn: async () => apiRequest('GET', '/api/funnels').then(res => res.json()),
  });

  const { data: selectedFunnelData, isLoading: isLoadingSelectedFunnel, error: selectedFunnelError } = useQuery<FunnelWithStages>({
    queryKey: ['funnelDetails', selectedFunnelId],
    queryFn: async () => apiRequest('GET', `/api/funnels/${selectedFunnelId}`).then(res => res.json()),
    enabled: !!selectedFunnelId,
  });

  const { data: campaignsList = [] } = useQuery<CampaignType[]>({
    queryKey: ['campaignsForFunnelForm'],
    queryFn: () => apiRequest('GET', '/api/campaigns').then(res => res.json()),
  });

  // Formulário e Mutações para Funis Salvos
  const form = useForm<FunnelFormData>({
    resolver: zodResolver(insertFunnelSchema.pick({ name: true, description: true, campaignId: true })),
    defaultValues: { name: '', description: '', campaignId: null },
  });

  useEffect(() => {
    if (editingFunnel) {
      form.reset({
        name: editingFunnel.name,
        description: editingFunnel.description || '',
        campaignId: editingFunnel.campaignId === undefined || editingFunnel.campaignId === null ? null : editingFunnel.campaignId,
      });
    } else {
      form.reset({ name: '', description: '', campaignId: null });
    }
  }, [editingFunnel, form, isFormModalOpen]);

  const funnelMutation = useMutation<FunnelType, Error, FunnelFormData & { id?: number }>({
    mutationFn: async (data) => {
      const method = data.id ? 'PUT' : 'POST';
      const endpoint = data.id ? `/api/funnels/${data.id}` : '/api/funnels';
      const response = await apiRequest(method, endpoint, data);
      if (!response.ok) {
        const errorResult = await response.json().catch(() => ({ message: 'Erro desconhecido' }));
        throw new Error(errorResult.message || `Falha ao ${data.id ? 'atualizar' : 'criar'} funil.`);
      }
      return response.json();
    },
    onSuccess: (data) => {
      toast({ title: `Funil ${editingFunnel ? 'atualizado' : 'criado'}!`, description: `"${data.name}" foi salvo.` });
      queryClient.invalidateQueries({ queryKey: ['funnels'] });
      queryClient.invalidateQueries({ queryKey: ['funnelDetails', data.id] });
      setIsFormModalOpen(false);
      setEditingFunnel(null);
      setSelectedFunnelId(data.id);
    },
    onError: (error) => {
      toast({ title: 'Erro ao salvar funil', description: error.message, variant: 'destructive' });
    }
  });
  const deleteFunnelMutation = useMutation<void, Error, number>({
    mutationFn: async (id) => {
      const response = await apiRequest('DELETE', `/api/funnels/${id}`);
      if (!response.ok) {
        const errorResult = await response.json().catch(() => ({ message: 'Erro desconhecido' }));
        throw new Error(errorResult.message || 'Falha ao excluir funil.');
      }
    },
    onSuccess: (_, deletedId) => {
      toast({ title: 'Funil excluído!' });
      queryClient.invalidateQueries({ queryKey: ['funnels'] });
      if (selectedFunnelId === deletedId) {
        setSelectedFunnelId(null);
      }
    },
    onError: (error) => {
      toast({ title: 'Erro ao excluir funil', description: error.message, variant: 'destructive' });
    }
  });

  const handleOpenFormModal = (funnel?: FunnelType) => {
    setEditingFunnel(funnel || null);
    setIsFormModalOpen(true);
  };
  const onSubmitFunnelForm = (data: FunnelFormData) => funnelMutation.mutate({ ...data, id: editingFunnel?.id });
  const handleDeleteFunnel = (id: number) => { if (window.confirm('Excluir este funil e suas etapas?')) deleteFunnelMutation.mutate(id); };

  const filteredFunnelsList = useMemo(() => {
    if (campaignFilter === 'all') return allFunnels;
    return allFunnels.filter(f => String(f.campaignId) === campaignFilter);
  }, [allFunnels, campaignFilter]);

  useEffect(() => {
    if (filteredFunnelsList.length > 0 && !selectedFunnelId && !allFunnels.find(f => f.id === selectedFunnelId)) {
      setSelectedFunnelId(filteredFunnelsList[0].id);
    } else if (filteredFunnelsList.length === 0) {
      setSelectedFunnelId(null);
    }
  }, [filteredFunnelsList, selectedFunnelId, allFunnels]);

  // Dados para o gráfico de funil SALVO
  const savedFunnelChartData = useMemo(() => {
    if (!selectedFunnelData || !selectedFunnelData.stages || selectedFunnelData.stages.length === 0) return [];
    let currentStageValue = selectedFunnelData.totalVisitors || 1000;
    return selectedFunnelData.stages
      .sort((a, b) => a.order - b.order)
      .map((stage, index) => {
        if (index > 0) currentStageValue = Math.max(1, Math.floor(currentStageValue * (0.4 + Math.random() * 0.45)));
        return {
          value: currentStageValue,
          name: `${stage.order}. ${stage.name}`,
          fill: FUNNEL_COLORS[index % FUNNEL_COLORS.length],
          stageId: stage.id,
          description: stage.description
        };
    });
  }, [selectedFunnelData]);


  // Lógica para o SIMULADOR
  const handleSimulatorInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setSimulatorData(prev => ({ ...prev, [name]: parseFloat(value) || 0 }));
  };
  const handleSimulatorSliderChange = (name: keyof SimulatorData, value: number[]) => {
    setSimulatorData(prev => ({ ...prev, [name]: value[0] || 0 }));
  };

  const simulatorCalculations = useMemo(() => {
    const d = simulatorData;
    const visitantesPagos = d.cpc > 0 ? d.investimentoDiario / d.cpc : 0;
    const visitantesOrganicos = d.alcanceOrganico * (d.conversaoAlcanceParaCliques / 100);
    const totalVisitantes = visitantesPagos + visitantesOrganicos;
    const vendas = totalVisitantes * (d.taxaConversaoSite / 100);
    const faturamentoDiario = vendas * d.precoProduto;
    const lucroDiario = faturamentoDiario - d.investimentoDiario;
    return {
      visitantesPagos: Math.round(visitantesPagos), visitantesOrganicos: Math.round(visitantesOrganicos),
      totalVisitantes: Math.round(totalVisitantes), vendas: parseFloat(vendas.toFixed(2)),
      vendasDisplay: Math.round(vendas), faturamentoDiario, lucroDiario,
      faturamentoSemanal: faturamentoDiario * 7, lucroSemanal: lucroDiario * 7,
      faturamentoMensal: faturamentoDiario * 30, lucroMensal: lucroDiario * 30,
      vendasSemanais: Math.round(vendas * 7), vendasMensais: Math.round(vendas * 30),
    };
  }, [simulatorData]);

  const simulatorFunnelChartData = [
    { name: 'Total Visitantes', value: simulatorCalculations.totalVisitantes, fill: SIMULATOR_FUNNEL_COLORS[0] },
    { name: 'Vendas Estimadas', value: simulatorCalculations.vendasDisplay, fill: SIMULATOR_FUNNEL_COLORS[1] },
  ].filter(item => item.value > 0);

  const simulatorInputFields: Array<{ id: keyof SimulatorData, label: string, min: number, max: number, step: number, unit?: string, icon: React.ElementType }> = [
    { id: 'investimentoDiario', label: 'Investimento Diário (R$)', min: 0, max: 5000, step: 10, icon: DollarSignIcon },
    { id: 'cpc', label: 'Custo por Clique - CPC (R$)', min: 0.01, max: 20, step: 0.01, icon: MousePointer },
    { id: 'precoProduto', label: 'Preço do Produto (R$)', min: 0, max: 2000, step: 1, icon: ShoppingBag },
    { id: 'alcanceOrganico', label: 'Alcance Orgânico (diário)', min: 0, max: 100000, step: 500, icon: Users },
    { id: 'conversaoAlcanceParaCliques', label: 'Conversão Alcance p/ Cliques (%)', min: 0.1, max: 20, step: 0.1, unit: '%', icon: Percent },
    { id: 'taxaConversaoSite', label: 'Taxa de Conversão do Site (%)', min: 0.1, max: 20, step: 0.1, unit: '%', icon: TrendingUp },
  ];

  const formatCurrency = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  const formatNumber = (value: number) => new Intl.NumberFormat('pt-BR').format(value);

  // Renderização Principal
  if (isLoadingFunnels) return <div className="p-8 text-center"><Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" /> Carregando funis...</div>;
  if (funnelsError) return <div className="p-8 text-center text-destructive"><AlertTriangle className="h-12 w-12 mx-auto mb-2" />Erro: {funnelsError.message}<Button onClick={() => refetchFunnelsList()} className="mt-4">Tentar Novamente</Button></div>;

  const selectedCampaignNameForSavedFunnel = selectedFunnelData?.campaignId
    ? campaignsList.find(c => c.id === selectedFunnelData.campaignId)?.name
    : null;

  return (
    <div className="space-y-6 p-4 md:p-8">
      <div className="flex justify-between items-center">
        <div><h1 className="text-3xl font-bold tracking-tight">Análise e Simulação de Funis</h1><p className="text-muted-foreground">Gerencie funis existentes e simule novas previsões.</p></div>
        <Button onClick={() => handleOpenFormModal()}><Plus className="w-4 h-4 mr-2" /> Novo Funil Salvo</Button>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Funis Salvos</TabsTrigger>
          <TabsTrigger value="simulator">Simulador de Previsão</TabsTrigger> {/* Nova Aba */}
          <TabsTrigger value="detailed" disabled={!selectedFunnelId || !selectedFunnelData?.stages?.length}>Análise Detalhada (Salvo)</TabsTrigger>
          <TabsTrigger value="optimization" disabled={!selectedFunnelId}>Otimização (Salvo)</TabsTrigger>
        </TabsList>

        {/* Conteúdo da Aba de Funis Salvos (como antes) */}
        <TabsContent value="overview" className="space-y-4">
          {/* ... (Seletor de Funil Salvo e Cards de KPI para funil salvo, como na versão anterior) ... */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Selecionar Funil Salvo</CardTitle>
              <div className="w-64">
                <ShadSelect value={campaignFilter} onValueChange={setCampaignFilter}>
                  <SelectTrigger><FilterIcon className="w-4 h-4 mr-2" /><SelectValue placeholder="Filtrar por Campanha" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as Campanhas</SelectItem>
                    {campaignsList.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
                  </SelectContent>
                </ShadSelect>
              </div>
            </CardHeader>
            <CardContent>
              {filteredFunnelsList.length === 0 ? <p className="text-muted-foreground text-center py-4">Nenhum funil salvo encontrado.</p> : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredFunnelsList.map((f) => (
                     <Card key={f.id} className={`p-4 border rounded-lg cursor-pointer transition-colors ${selectedFunnelId === f.id ? 'border-primary bg-primary/5 shadow-md' : 'hover:border-primary/50'}`} onClick={() => setSelectedFunnelId(f.id)}>
                        <div className="flex justify-between items-start">
                            <div>
                                <h3 className="font-semibold text-base">{f.name}</h3>
                                <p className="text-xs text-muted-foreground truncate max-w-xs">{f.description || "Sem descrição"}</p>
                                {f.campaignId && campaignsList.find(c => c.id === f.campaignId) && (
                                    <Badge variant="outline" className="mt-1 text-xs">
                                        <LinkIcon className="w-3 h-3 mr-1"/>
                                        {campaignsList.find(c => c.id === f.campaignId)?.name}
                                    </Badge>
                                )}
                            </div>
                            <div className="flex space-x-1">
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); handleOpenFormModal(f);}}><Edit className="w-4 h-4" /></Button>
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive-foreground hover:bg-destructive/90" onClick={(e) => { e.stopPropagation(); handleDeleteFunnel(f.id);}}><Trash2 className="w-4 h-4" /></Button>
                            </div>
                        </div>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {isLoadingSelectedFunnel && selectedFunnelId && <div className="p-8 text-center"><Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" /> Carregando...</div>}
          {selectedFunnelError && <Card className="border-destructive bg-destructive/10"><CardContent className="p-4 text-destructive flex items-center"><AlertTriangle className="h-5 w-5 mr-2" />Erro: {selectedFunnelError.message}</CardContent></Card>}
          
          {selectedFunnelData && !isLoadingSelectedFunnel && (
            <>
              {selectedCampaignNameForSavedFunnel && ( <Card className="bg-secondary/50"><CardContent className="p-3"><p className="text-sm text-center font-medium">Funil referente à Campanha: <span className="text-primary">{selectedCampaignNameForSavedFunnel}</span></p></CardContent></Card> )}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card><CardHeader><CardTitle className="text-sm font-medium">Total de Visitantes</CardTitle><Users className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{formatNumber(selectedFunnelData.totalVisitors || 0)}</div></CardContent></Card>
                <Card><CardHeader><CardTitle className="text-sm font-medium">Conversões</CardTitle><ShoppingCart className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{formatNumber(selectedFunnelData.totalConversions || 0)}</div></CardContent></Card>
                <Card><CardHeader><CardTitle className="text-sm font-medium">Taxa de Conversão</CardTitle><Percent className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{(selectedFunnelData.overallConversionRate || 0).toFixed(2)}%</div></CardContent></Card>
                 <Card><CardHeader><CardTitle className="text-sm font-medium">Etapas</CardTitle><Settings className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{selectedFunnelData.stages?.length || 0}</div></CardContent></Card>
              </div>
              <Card>
                <CardHeader><CardTitle>Visualização do Funil Salvo</CardTitle><CardDescription>Fluxo de usuários por etapa.</CardDescription></CardHeader>
                <CardContent className="h-[400px] md:h-[500px] p-2">
                  {savedFunnelChartData && savedFunnelChartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <FunnelChart>
                        <RechartsTooltip formatter={(value: number, name: string) => [`${value.toLocaleString()} usuários (simulado)`, name.substring(name.indexOf('.') + 2)]} />
                        <RechartsFunnel dataKey="value" data={savedFunnelChartData} isAnimationActive lastShapeType="rectangle" orientation="vertical" neckWidth="30%" neckHeight="0%">
                          {savedFunnelChartData.map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.fill} />))}
                          <LabelList position="center" fill="#fff" dataKey="name" formatter={(value: string) => value.substring(value.indexOf('.') + 2)} className="text-xs font-semibold pointer-events-none select-none" />
                        </RechartsFunnel>
                      </FunnelChart>
                    </ResponsiveContainer>
                  ) : <div className="flex items-center justify-center h-full text-muted-foreground">Este funil não possui etapas ou os dados ainda estão carregando.</div>}
                </CardContent>
              </Card>
            </>
          )}
          {!selectedFunnelId && !isLoadingFunnels && <Card><CardContent className="p-8 text-muted-foreground text-center">Selecione um funil salvo para ver os detalhes.</CardContent></Card>}
        </TabsContent>

        {/* Nova Aba para o Simulador */}
        <TabsContent value="simulator" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-1 neu-card">
                  <CardHeader>
                    <CardTitle>Configurar Métricas da Simulação</CardTitle>
                    <CardDescription>Ajuste os valores para simular seu funil.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    {simulatorInputFields.map(field => {
                      const Icon = field.icon;
                      return (
                        <div key={field.id} className="space-y-2">
                          <Label htmlFor={`sim-${field.id}`} className="flex items-center text-sm font-medium"><Icon className="w-4 h-4 mr-2 text-primary" />{field.label}</Label>
                          <div className="flex items-center space-x-2">
                            <Input type="number" id={`sim-${field.id}`} name={field.id} value={simulatorData[field.id]} onChange={handleSimulatorInputChange} min={field.min} max={field.max} step={field.step} className="neu-input w-28 text-sm"/>
                            <Slider name={field.id} value={[simulatorData[field.id]]} onValueChange={(value) => handleSimulatorSliderChange(field.id, value)} min={field.min} max={field.max} step={field.step} className="flex-1"/>
                          </div>
                          <p className="text-xs text-muted-foreground text-right">Min: {field.unit === '%' ? field.min.toFixed(1) : field.min}{field.unit || ''} / Max: {field.unit === '%' ? field.max.toFixed(1) : field.max}{field.unit || ''}</p>
                        </div>
                      )})}
                  </CardContent>
                </Card>

                <div className="lg:col-span-2 space-y-6">
                  <Card className="neu-card">
                    <CardHeader>
                      <CardTitle className="flex items-center"><BarChartHorizontalBig className="w-5 h-5 mr-2 text-primary"/>Previsão do Funil (Simulação)</CardTitle>
                      <CardDescription>Resultados calculados com base nas suas métricas simuladas.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                        <div><p className="text-xs text-muted-foreground">Visitantes Pagos</p><p className="font-bold text-lg">{formatNumber(simulatorCalculations.visitantesPagos)}</p></div>
                        <div><p className="text-xs text-muted-foreground">Visitantes Orgânicos</p><p className="font-bold text-lg">{formatNumber(simulatorCalculations.visitantesOrganicos)}</p></div>
                        <div><p className="text-xs text-muted-foreground">Total Visitantes</p><p className="font-bold text-lg text-primary">{formatNumber(simulatorCalculations.totalVisitantes)}</p></div>
                        <div><p className="text-xs text-muted-foreground">Vendas Estimadas</p><p className="font-bold text-lg text-green-500">{formatNumber(simulatorCalculations.vendasDisplay)}</p></div>
                      </div>
                      <div className="h-[300px] md:h-[350px] mt-4">
                        {simulatorFunnelChartData.length > 0 ? (
                          <ResponsiveContainer width="100%" height="100%">
                            <FunnelChart>
                              <RechartsTooltip formatter={(value: number, name: string) => [`${formatNumber(value)} ${name.includes('Visitantes') ? 'visitantes' : 'vendas'}`, name]} labelStyle={{ color: 'hsl(var(--foreground))' }} itemStyle={{ color: 'hsl(var(--foreground))' }} contentStyle={{ backgroundColor: 'hsl(var(--background)/0.8)', borderColor: 'hsl(var(--border))', borderRadius: '0.5rem' }}/>
                              <RechartsFunnel dataKey="value" data={simulatorFunnelChartData} isAnimationActive labelLine={false} orientation="horizontal" neckWidth="20%" neckHeight="0%" trapezoid={false} >
                                <LabelList position="center" dataKey="name" formatter={(value: string) => value} className="text-xs md:text-sm font-semibold pointer-events-none select-none" fill="#fff"/>
                              </RechartsFunnel>
                            </FunnelChart>
                          </ResponsiveContainer>
                        ) : <div className="flex items-center justify-center h-full text-muted-foreground">Ajuste as métricas para gerar o funil.</div>}
                      </div>
                    </CardContent>
                  </Card>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Card className="neu-card"><CardHeader><CardTitle className="text-base">Volume de Vendas</CardTitle></CardHeader><CardContent className="space-y-1 text-sm"><p>Diário: <span className="font-semibold">{formatNumber(simulatorCalculations.vendasDisplay)}</span></p><p>Semanal: <span className="font-semibold">{formatNumber(simulatorCalculations.vendasSemanais)}</span></p><p>Mensal: <span className="font-semibold">{formatNumber(simulatorCalculations.vendasMensais)}</span></p></CardContent></Card>
                    <Card className="neu-card"><CardHeader><CardTitle className="text-base">Faturamento (R$)</CardTitle></CardHeader><CardContent className="space-y-1 text-sm"><p>Diário: <span className="font-semibold">{formatCurrency(simulatorCalculations.faturamentoDiario)}</span></p><p>Semanal: <span className="font-semibold">{formatCurrency(simulatorCalculations.faturamentoSemanal)}</span></p><p>Mensal: <span className="font-semibold">{formatCurrency(simulatorCalculations.faturamentoMensal)}</span></p></CardContent></Card>
                    <Card className="neu-card"><CardHeader><CardTitle className="text-base">Lucro Estimado (R$)</CardTitle></CardHeader><CardContent className="space-y-1 text-sm"><p>Diário: <span className="font-semibold">{formatCurrency(simulatorCalculations.lucroDiario)}</span></p><p>Semanal: <span className="font-semibold">{formatCurrency(simulatorCalculations.lucroSemanal)}</span></p><p>Mensal: <span className="font-semibold">{formatCurrency(simulatorCalculations.lucroMensal)}</span></p></CardContent></Card>
                  </div>
                </div>
            </div>
        </TabsContent>
        
        <TabsContent value="detailed" className="space-y-4"> {/* Conteúdo da Análise Detalhada para funis salvos */} </TabsContent>
        <TabsContent value="optimization" className="space-y-4"> {/* Conteúdo de Otimização para funis salvos */} </TabsContent>
      </Tabs>

      {/* Modal para Criar/Editar Funil SALVO */}
      <Dialog open={isFormModalOpen} onOpenChange={(isOpen) => { if (!isOpen) { setIsFormModalOpen(false); setEditingFunnel(null); form.reset(); } else { setIsFormModalOpen(true); }}}>
        <DialogContent className="sm:max-w-[500px] neu-card p-0">
            <DialogHeader className="p-6 pb-4 border-b border-border">
                <DialogTitle className="text-xl">{editingFunnel ? 'Editar Funil Salvo' : 'Novo Funil Salvo'}</DialogTitle>
                <DialogDescription>
                    {editingFunnel ? `Modificando "${editingFunnel.name}"` : 'Crie um novo funil para acompanhar suas métricas.'}
                </DialogDescription>
            </DialogHeader>
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmitFunnelForm)} className="space-y-5 p-6">
                    <FormField control={form.control} name="name" render={({ field }) => (<FormItem><FormLabel>Nome do Funil *</FormLabel><FormControl><Input placeholder="Ex: Funil de Vendas Principal" {...field} className="neu-input" /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="description" render={({ field }) => (<FormItem><FormLabel>Descrição</FormLabel><FormControl><Textarea placeholder="Descreva o objetivo e as etapas deste funil..." {...field} className="neu-input" rows={3} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="campaignId" render={({ field }) => (<FormItem><FormLabel>Associar à Campanha (Opcional)</FormLabel><ShadSelect value={field.value === null || field.value === undefined ? "NONE" : String(field.value)} onValueChange={(value) => field.onChange(value === "NONE" ? null : parseInt(value))}><FormControl><SelectTrigger className="neu-input"><SelectValue placeholder="Nenhuma campanha" /></SelectTrigger></FormControl><SelectContent><SelectItem value="NONE">Nenhuma campanha</SelectItem>{campaignsList.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}</SelectContent></ShadSelect><FormMessage /></FormItem>)} />
                    <DialogFooter className="pt-4">
                        <Button type="button" variant="outline" onClick={() => setIsFormModalOpen(false)} disabled={funnelMutation.isPending} className="neu-button">Cancelar</Button>
                        <Button type="submit" disabled={funnelMutation.isPending || !form.formState.isValid} className="neu-button-primary">
                            {funnelMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {editingFunnel ? 'Salvar Alterações' : 'Criar Funil'}
                        </Button>
                    </DialogFooter>
                </form>
            </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
