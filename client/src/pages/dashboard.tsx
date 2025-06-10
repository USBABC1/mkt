// client/src/pages/dashboard.tsx
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LineChart, BarChart, DoughnutChart } from '@/components/charts'; // Removido chartColors pois não é usado diretamente aqui
import { apiRequest } from '@/lib/api';
import {
  TrendingUp,
  TrendingDown,
  Activity,
  Zap,
  DollarSign,
  Target,
  Eye,
  BarChart3,
  PieChart as PieChartIcon, // Renomeado para evitar conflito com o componente PieChart
  Filter,
  Download,
  RefreshCw,
  Loader2 // Adicionado Loader2
} from 'lucide-react';

// Interfaces para os dados dos gráficos (mantidas do seu arquivo)
interface ChartDataset {
  label: string;
  data: number[];
  borderColor?: string;
  backgroundColor?: string | string[];
  fill?: boolean;
  tension?: number;
  borderWidth?: number;
}

interface LineChartData {
  labels: string[];
  datasets: ChartDataset[];
}

interface BarChartData {
  labels: string[];
  datasets: ChartDataset[];
}

interface DoughnutChartData {
  labels: string[];
  datasets: ChartDataset[];
}

interface CampaignItem {
  id: number;
  name: string;
  description?: string | null; // Ajustado para ser opcional/nulo
  status: string;
  platforms: string[]; // Deve ser um array
  budget?: number | string | null; // Ajustado para ser opcional/nulo e aceitar string
  spent?: number | string | null;  // Ajustado para ser opcional/nulo e aceitar string
  performance?: number | null; // Ajustado para ser opcional/nulo
}

interface DashboardData {
  metrics: {
    activeCampaigns: number;
    totalSpent: number;
    conversions: number;
    avgROI: number;
    impressions: number;
    clicks: number;
    ctr: number;
    cpc: number;
    totalCostPeriod?: number; // Adicionado para corresponder ao log
  };
  recentCampaigns: CampaignItem[]; // Usando CampaignItem
  alertCount: number;
  trends: {
    campaignsChange: number;
    spentChange: number;
    conversionsChange: number;
    roiChange: number;
  };
  timeSeriesData: LineChartData;
  channelPerformanceData: DoughnutChartData;
  conversionData: LineChartData;
  roiData: BarChartData;
}

export default function Dashboard() {
  const [timeRange, setTimeRange] = useState('30d');
  // const [selectedMetric, setSelectedMetric] = useState('conversions'); // Não utilizado no JSX fornecido

  const { data: dashboardData, isLoading, error, refetch } = useQuery<DashboardData>({
    queryKey: ['dashboardData', timeRange],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/dashboard?timeRange=${timeRange}`);
      // response.ok já é verificado em apiRequest, que lança erro se não estiver ok
      const jsonData = await response.json();
      // Garantir que recentCampaigns seja um array, mesmo que a API falhe em fornecê-lo
      if (jsonData && typeof jsonData === 'object' && !Array.isArray(jsonData.recentCampaigns)) {
        jsonData.recentCampaigns = [];
      }
      return jsonData;
    },
    staleTime: 1000 * 60 * 5, // 5 minutos
    refetchOnWindowFocus: false,
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active': return <Badge className="bg-green-100 text-green-800 dark:bg-green-700/30 dark:text-green-400">Ativo</Badge>;
      case 'paused': return <Badge variant="secondary" className="dark:bg-yellow-700/30 dark:text-yellow-400">Pausado</Badge>;
      case 'completed': return <Badge variant="outline" className="dark:border-blue-500/50 dark:text-blue-400">Concluído</Badge>;
      default: return <Badge variant="destructive" className="dark:bg-slate-700 dark:text-slate-300">Rascunho</Badge>;
    }
  };

  const getTrendIcon = (change?: number) => { // Tornar change opcional
    if (change === undefined || change === null) return null;
    return change >= 0 ?
      <TrendingUp className="w-4 h-4 text-green-500" /> :
      <TrendingDown className="w-4 h-4 text-red-500" />;
  };

  const formatCurrency = (value?: number | string | null) => {
    if (value === null || value === undefined) return "N/A";
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(numValue)) return "N/A";
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(numValue);
  };

  const formatNumber = (value?: number | string | null) => {
    if (value === null || value === undefined) return "N/A";
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(numValue)) return "0";
    return new Intl.NumberFormat('pt-BR').format(numValue);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen p-6">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-4 text-muted-foreground">Carregando dashboard...</p>
      </div>
    );
  }

  if (error || !dashboardData) { // Adicionado !dashboardData para cobrir casos onde não há erro mas os dados são nulos
    return (
        <div className="p-8 text-center">
        <AlertTriangle className="w-16 h-16 text-destructive mx-auto mb-4" />
        <h2 className="text-2xl font-semibold text-destructive mb-2">Erro ao carregar dados do Dashboard</h2>
        <p className="text-muted-foreground mb-4">
          {(error as Error)?.message || "Não foi possível buscar os dados para o dashboard."}
        </p>
        <Button onClick={() => refetch()}>Tentar Novamente</Button>
      </div>
    );
  }
  
  const { metrics, recentCampaigns, trends, timeSeriesData, channelPerformanceData, conversionData, roiData } = dashboardData;

  return (
    <div className="space-y-6 p-4 md:p-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Visão geral das suas campanhas e performance
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" className="neu-button">
            <Filter className="w-4 h-4 mr-2" />
            Filtros
          </Button>
          <Button variant="outline" size="sm" className="neu-button">
            <Download className="w-4 h-4 mr-2" />
            Exportar
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            className="neu-button"
            disabled={isLoading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="neu-card animate-scale-in">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">Campanhas Ativas</CardTitle>
              <Activity className="w-5 h-5 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{formatNumber(metrics.activeCampaigns)}</div>
            <div className="flex items-center space-x-1 text-sm">
              {getTrendIcon(trends.campaignsChange)}
              <span className={trends.campaignsChange >= 0 ? 'text-green-600' : 'text-red-600'}>
                {Math.abs(trends.campaignsChange)}%
              </span>
              <span className="text-muted-foreground">vs mês anterior</span>
            </div>
          </CardContent>
        </Card>

        <Card className="neu-card animate-scale-in" style={{ animationDelay: '100ms' }}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Investido (Período)</CardTitle>
              <DollarSign className="w-5 h-5 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{formatCurrency(metrics.totalCostPeriod ?? metrics.totalSpent)}</div>
            <div className="flex items-center space-x-1 text-sm">
              {getTrendIcon(trends.spentChange)}
              <span className={trends.spentChange >= 0 ? 'text-green-600' : 'text-red-600'}>
                {Math.abs(trends.spentChange)}%
              </span>
              <span className="text-muted-foreground">vs mês anterior</span>
            </div>
          </CardContent>
        </Card>

        <Card className="neu-card animate-scale-in" style={{ animationDelay: '200ms' }}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">Conversões</CardTitle>
              <Target className="w-5 h-5 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{formatNumber(metrics.conversions)}</div>
            <div className="flex items-center space-x-1 text-sm">
              {getTrendIcon(trends.conversionsChange)}
              <span className={trends.conversionsChange >= 0 ? 'text-green-600' : 'text-red-600'}>
                {Math.abs(trends.conversionsChange)}%
              </span>
              <span className="text-muted-foreground">vs mês anterior</span>
            </div>
          </CardContent>
        </Card>

        <Card className="neu-card animate-scale-in" style={{ animationDelay: '300ms' }}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">ROI Médio</CardTitle>
              <TrendingUp className="w-5 h-5 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{metrics.avgROI.toFixed(2)}x</div> {/* Ajustado para formatar o ROI */}
            <div className="flex items-center space-x-1 text-sm">
              {getTrendIcon(trends.roiChange)}
              <span className={trends.roiChange >= 0 ? 'text-green-600' : 'text-red-600'}>
                {Math.abs(trends.roiChange)}%
              </span>
              <span className="text-muted-foreground">vs mês anterior</span>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="neu-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Impressões</p><p className="text-2xl font-bold">{formatNumber(metrics.impressions)}</p></div><Eye className="w-8 h-8 text-blue-500" /></div>
          </CardContent>
        </Card>
        <Card className="neu-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Cliques</p><p className="text-2xl font-bold">{formatNumber(metrics.clicks)}</p></div><Zap className="w-8 h-8 text-yellow-500" /></div>
          </CardContent>
        </Card>
        <Card className="neu-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">CTR</p><p className="text-2xl font-bold">{metrics.ctr.toFixed(2)}%</p></div><BarChart3 className="w-8 h-8 text-green-500" /></div>
          </CardContent>
        </Card>
        <Card className="neu-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">CPC</p><p className="text-2xl font-bold">{formatCurrency(metrics.cpc)}</p></div><DollarSign className="w-8 h-8 text-purple-500" /></div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="neu-card">
          <CardHeader><CardTitle className="flex items-center space-x-2"><Activity className="w-5 h-5" /><span>Performance ao Longo do Tempo</span></CardTitle><CardDescription>Métricas de performance dos últimos {timeRange === '30d' ? '30 dias' : '7 dias'}</CardDescription></CardHeader>
          <CardContent><div className="h-[300px]">{timeSeriesData && <LineChart data={timeSeriesData} />}</div></CardContent>
        </Card>
        <Card className="neu-card">
          <CardHeader><CardTitle className="flex items-center space-x-2"><PieChartIcon className="w-5 h-5" /><span>Distribuição por Canal</span></CardTitle><CardDescription>Performance por tipo de campanha</CardDescription></CardHeader>
          <CardContent><div className="h-[300px]">{channelPerformanceData && <DoughnutChart data={channelPerformanceData} />}</div></CardContent>
        </Card>
        <Card className="neu-card">
          <CardHeader><CardTitle className="flex items-center space-x-2"><Target className="w-5 h-5" /><span>Conversões por Mês</span></CardTitle><CardDescription>Evolução das conversões mensais</CardDescription></CardHeader>
          <CardContent><div className="h-[300px]">{conversionData && <LineChart data={conversionData} />}</div></CardContent>
        </Card>
        <Card className="neu-card">
          <CardHeader><CardTitle className="flex items-center space-x-2"><BarChart3 className="w-5 h-5" /><span>ROI por Plataforma</span></CardTitle><CardDescription>Retorno sobre investimento por canal</CardDescription></CardHeader>
          <CardContent><div className="h-[300px]">{roiData && <BarChart data={roiData} />}</div></CardContent>
        </Card>
      </div>

      <Card className="neu-card">
        <CardHeader><div className="flex items-center justify-between"><div><CardTitle>Campanhas Recentes</CardTitle><CardDescription>Últimas campanhas criadas e sua performance atual</CardDescription></div><Button variant="outline" size="sm" className="neu-button">Ver Todas</Button></div></CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* CORREÇÃO: Adicionada verificação para recentCampaigns antes de chamar .map */}
            {recentCampaigns && Array.isArray(recentCampaigns) && recentCampaigns.length > 0 ? (
              recentCampaigns.map((campaign) => (
                <div key={campaign.id} className="flex items-center justify-between p-4 neu-card hover:scale-[1.02] transition-transform cursor-pointer">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 neu-card flex items-center justify-center"><Activity className="w-6 h-6 text-primary" /></div>
                    <div>
                      <h3 className="font-semibold">{campaign.name}</h3>
                      <p className="text-sm text-muted-foreground">{campaign.description || 'Sem descrição'}</p>
                      <div className="flex items-center space-x-2 mt-1">
                        {/* CORREÇÃO: Adicionada verificação para campaign.platforms antes de chamar .map */}
                        {campaign.platforms && Array.isArray(campaign.platforms) && campaign.platforms.map((platform) => (
                          <Badge key={platform} variant="outline" className="text-xs">{platform}</Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="text-right space-y-1">
                    <div className="flex items-center space-x-4">
                      <div><p className="text-sm text-muted-foreground">Orçamento</p><p className="font-semibold">{formatCurrency(campaign.budget)}</p></div>
                      <div><p className="text-sm text-muted-foreground">Gasto</p><p className="font-semibold">{formatCurrency(campaign.spent)}</p></div>
                      <div>
                        <p className="text-sm text-muted-foreground">Performance</p>
                        <div className="flex items-center space-x-2">
                          <div className="w-16 bg-muted rounded-full h-2">
                            <div className="bg-primary h-2 rounded-full" style={{ width: `${campaign.performance || 0}%` }}></div>
                          </div>
                          <span className="text-sm font-medium">{campaign.performance || 0}%</span>
                        </div>
                      </div>
                      <div>{getStatusBadge(campaign.status)}</div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-center text-muted-foreground py-4">Nenhuma campanha recente para exibir.</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
