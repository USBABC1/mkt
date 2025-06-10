// client/src/pages/metrics.tsx
import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LineChart, BarChart, PieChart } from '@/components/charts';
import { apiRequest } from '@/lib/api';
import { Campaign as CampaignType } from '@shared/schema'; // Usando o tipo compartilhado
import {
  TrendingUp,
  Eye,
  MousePointer,
  CreditCard,
  Users,
  Download,
  Filter,
  AlertTriangle,
  Loader2
} from 'lucide-react';

// Interfaces para os dados dos gráficos (baseado no retorno do /api/dashboard)
interface ChartDataset {
  label: string;
  data: number[];
  borderColor?: string;
  backgroundColor?: string | string[];
  fill?: boolean;
  tension?: number;
  borderWidth?: number;
}

interface GenericChartData {
  labels: string[];
  datasets: ChartDataset[];
}

interface DashboardMetrics {
  activeCampaigns?: number; // Campos do dashboard podem ser opcionais se a API não garantir todos
  totalSpent?: number;
  totalCostPeriod?: number;
  conversions?: number;
  avgROI?: number;
  impressions?: number;
  clicks?: number;
  ctr?: number;
  cpc?: number;
}

interface DashboardAPIData {
  metrics: DashboardMetrics;
  timeSeriesData?: GenericChartData;    // Performance ao Longo do Tempo
  channelPerformanceData?: GenericChartData; // Distribuição por Plataforma (Doughnut/Pie)
  conversionData?: GenericChartData;    // Dados de Conversão (se diferente de timeSeries)
  roiData?: GenericChartData;           // ROI por Plataforma/Mês (Bar)
  // Adicione outros campos que sua API /api/dashboard retorna, se necessário
}


export default function Metrics() {
  const [selectedPeriod, setSelectedPeriod] = useState('30d');
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>('all');

  // Query para dados agregados do dashboard (KPIs e gráficos principais)
  const { data: dashboardApiData, isLoading: isLoadingDashboard, error: dashboardError } = useQuery<DashboardAPIData>({
    queryKey: ['dashboardDataForMetricsPage', selectedPeriod],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/dashboard?timeRange=${selectedPeriod}`);
      if (!response.ok) throw new Error('Falha ao carregar dados do dashboard para métricas.');
      return response.json();
    },
  });

  // Query para a lista de campanhas (para a tabela e filtro)
  const { data: campaignsList = [], isLoading: isLoadingCampaigns, error: campaignsError } = useQuery<CampaignType[]>({
    queryKey: ['campaignsListForMetrics'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/campaigns');
      if (!response.ok) throw new Error('Falha ao carregar lista de campanhas.');
      return response.json();
    },
  });

  const filteredCampaignsForTable = useMemo(() => {
    if (selectedCampaignId === 'all') {
      return campaignsList;
    }
    return campaignsList.filter(c => String(c.id) === selectedCampaignId);
  }, [campaignsList, selectedCampaignId]);

  const formatCurrency = (value?: number | string | null) => {
    if (value === null || value === undefined) return "N/A";
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(numValue)) return "N/A";
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(numValue);
  };
  
  const formatNumber = (value?: number | string | null) => {
    if (value === null || value === undefined) return "N/A";
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(numValue)) return "0";
    return new Intl.NumberFormat('pt-BR').format(numValue);
  };

  const getStatusBadgeClass = (status: string | undefined) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-700';
      case 'paused': return 'bg-yellow-100 text-yellow-700';
      case 'completed': return 'bg-blue-100 text-blue-700';
      case 'draft': return 'bg-gray-100 text-gray-700';
      default: return 'bg-gray-200 text-gray-800';
    }
  };
  
  const getPlatformBadge = (platform: string) => {
    const platformConfig: Record<string, { className: string, label: string }> = {
      facebook: { className: 'bg-blue-100 text-blue-700', label: 'Facebook' },
      google_ads: { className: 'bg-red-100 text-red-700', label: 'Google Ads' },
      instagram: { className: 'bg-pink-100 text-pink-700', label: 'Instagram' },
      linkedin: { className: 'bg-sky-100 text-sky-700', label: 'LinkedIn' },
      tiktok: { className: 'bg-purple-100 text-purple-700', label: 'TikTok' },
    };
    return platformConfig[platform] || { className: 'bg-gray-100 text-gray-700', label: platform };
  };


  if (isLoadingDashboard || isLoadingCampaigns) {
    return <div className="p-8 text-center"><Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" /> Carregando métricas...</div>;
  }

  if (dashboardError || campaignsError) {
    return (
      <div className="p-8 text-center text-destructive">
        <AlertTriangle className="h-12 w-12 mx-auto mb-2" />
        Erro ao carregar dados: 
        {dashboardError && <p>{(dashboardError as Error).message}</p>}
        {campaignsError && <p>{(campaignsError as Error).message}</p>}
        <Button onClick={() => {
          if (dashboardError) queryClient.refetchQueries({ queryKey: ['dashboardDataForMetricsPage', selectedPeriod] });
          if (campaignsError) queryClient.refetchQueries({ queryKey: ['campaignsListForMetrics'] });
        }} className="mt-4">
          Tentar Novamente
        </Button>
      </div>
    );
  }

  const kpis = dashboardApiData?.metrics;
  const performanceData = dashboardApiData?.timeSeriesData;
  const platformData = dashboardApiData?.channelPerformanceData;
  const roiData = dashboardApiData?.roiData;


  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Métricas e Analytics</h1>
          <p className="text-muted-foreground">
            Análise detalhada de performance das suas campanhas
          </p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline">
            <Filter className="w-4 h-4 mr-2" />
            Filtros Avançados
          </Button>
          <Button>
            <Download className="w-4 h-4 mr-2" />
            Exportar Relatório
          </Button>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex space-x-4">
        <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
          <SelectTrigger className="w-48 neu-input">
            <SelectValue placeholder="Período" />
          </SelectTrigger>
          <SelectContent className="neu-card">
            <SelectItem value="7d">Últimos 7 dias</SelectItem>
            <SelectItem value="30d">Últimos 30 dias</SelectItem>
            <SelectItem value="90d">Últimos 90 dias</SelectItem>
            <SelectItem value="365d">Último ano</SelectItem>
          </SelectContent>
        </Select>

        <Select value={selectedCampaignId} onValueChange={setSelectedCampaignId}>
          <SelectTrigger className="w-60 neu-input">
            <SelectValue placeholder="Selecionar Campanha" />
          </SelectTrigger>
          <SelectContent className="neu-card">
            <SelectItem value="all">Todas as campanhas</SelectItem>
            {campaignsList.map(campaign => (
              <SelectItem key={campaign.id} value={String(campaign.id)}>
                {campaign.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="neu-card-inset p-1">
          <TabsTrigger value="overview" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md rounded-md">Visão Geral</TabsTrigger>
          <TabsTrigger value="campaigns" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md rounded-md">Por Campanha</TabsTrigger>
          <TabsTrigger value="platforms" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md rounded-md">Por Plataforma</TabsTrigger>
          <TabsTrigger value="audience" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md rounded-md">Audiência</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="neu-card">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Impressões Totais</CardTitle>
                <Eye className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatNumber(kpis?.impressions)}</div>
                {/* Adicionar lógica de % de mudança se disponível no kpis */}
              </CardContent>
            </Card>
            <Card className="neu-card">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Cliques Totais</CardTitle>
                <MousePointer className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatNumber(kpis?.clicks)}</div>
              </CardContent>
            </Card>
            <Card className="neu-card">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Conversões</CardTitle>
                <CreditCard className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatNumber(kpis?.conversions)}</div>
              </CardContent>
            </Card>
            <Card className="neu-card">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">ROI Médio</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{kpis?.avgROI?.toFixed(2) ?? 'N/A'}x</div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="neu-card">
              <CardHeader>
                <CardTitle>Performance ao Longo do Tempo</CardTitle>
                <CardDescription>Impressões e cliques dos últimos {selectedPeriod === '7d' ? '7 dias' : selectedPeriod === '30d' ? '30 dias' : selectedPeriod === '90d' ? '90 dias' : 'ano'}.</CardDescription>
              </CardHeader>
              <CardContent>
                {performanceData ? <LineChart data={performanceData} className="h-80" /> : <p>Dados indisponíveis.</p>}
              </CardContent>
            </Card>
            <Card className="neu-card">
              <CardHeader>
                <CardTitle>Distribuição por Plataforma</CardTitle>
                <CardDescription>Conversões por canal de marketing.</CardDescription>
              </CardHeader>
              <CardContent>
                {platformData ? <PieChart data={platformData} className="h-80" /> : <p>Dados indisponíveis.</p>}
              </CardContent>
            </Card>
          </div>
          <Card className="neu-card">
            <CardHeader>
              <CardTitle>ROI por Mês</CardTitle>
              <CardDescription>Retorno sobre investimento mensal.</CardDescription>
            </CardHeader>
            <CardContent>
              {roiData ? <BarChart data={roiData} className="h-80" /> : <p>Dados indisponíveis.</p>}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="campaigns" className="space-y-4">
          <Card className="neu-card">
            <CardHeader>
              <CardTitle>Performance por Campanha</CardTitle>
              <CardDescription>Métricas detalhadas de cada campanha.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {filteredCampaignsForTable.length > 0 ? filteredCampaignsForTable.map((campaign) => (
                  <div key={campaign.id} className="border rounded-lg p-4 neu-card-inset">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold">{campaign.name}</h3>
                      <Badge className={getStatusBadgeClass(campaign.status)}>{campaign.status}</Badge>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Plataformas</p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {campaign.platforms?.map(p => {
                            const platformConfig = getPlatformBadge(p);
                            return <Badge key={p} variant="outline" className={`text-xs ${platformConfig.className}`}>{platformConfig.label}</Badge>
                          })}
                        </div>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Orçamento</p>
                        <p className="font-semibold">{formatCurrency(campaign.budget)}</p>
                      </div>
                       <div>
                        <p className="text-muted-foreground">Início</p>
                        <p className="font-semibold">{campaign.startDate ? new Date(campaign.startDate).toLocaleDateString('pt-BR') : 'N/A'}</p>
                      </div>
                      {/* Métricas de performance (Impressões, Cliques, ROI etc.) foram removidas
                          pois não são fornecidas pelo endpoint /api/campaigns.
                          Para adicioná-las, seria necessário um novo endpoint ou modificação no backend. */}
                    </div>
                  </div>
                )) : <p className="text-muted-foreground text-center py-4">Nenhuma campanha encontrada para os filtros selecionados.</p>}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="platforms" className="space-y-4">
           <Card className="neu-card">
              <CardHeader><CardTitle>Detalhes por Plataforma</CardTitle></CardHeader>
              <CardContent><p className="text-muted-foreground">Visualização detalhada da performance por plataforma (Google, Facebook, etc.). Esta seção será implementada conectando-se a um endpoint que forneça esses dados.</p></CardContent>
           </Card>
        </TabsContent>

        <TabsContent value="audience" className="space-y-4">
          <Card className="neu-card">
              <CardHeader><CardTitle>Análise de Audiência</CardTitle></CardHeader>
              <CardContent><p className="text-muted-foreground">Dados demográficos, interesses e comportamento da audiência. Esta seção será implementada conectando-se a um endpoint que forneça esses dados.</p></CardContent>
           </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
