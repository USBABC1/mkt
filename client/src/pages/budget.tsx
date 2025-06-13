import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  Wallet, 
  TrendingUp, 
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  DollarSign
} from 'lucide-react';
import { apiRequest } from '@/lib/api';

interface BudgetData {
  id: number;
  totalBudget: string;
  spentAmount: string;
  period: string;
  startDate: string;
  endDate: string;
  campaignId?: number;
}

interface Campaign {
  id: number;
  name: string;
  budget: string;
  platforms: string[];
}

export default function Budget() {
  const { data: budgets = [], isLoading: budgetsLoading } = useQuery<BudgetData[]>({
    queryKey: ['/api/budgets'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/budgets');
      return response.json();
    },
  });

  const { data: campaigns = [], isLoading: campaignsLoading } = useQuery<Campaign[]>({
    queryKey: ['/api/campaigns'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/campaigns');
      return response.json();
    },
  });

  // Calculate summary metrics
  const totalBudget = budgets.reduce((sum, budget) => sum + parseFloat(budget.totalBudget || '0'), 0);
  const totalSpent = budgets.reduce((sum, budget) => sum + parseFloat(budget.spentAmount || '0'), 0);
  const budgetUtilization = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;

  // Monthly and daily calculations (simplified)
  const monthlyBudget = totalBudget * 0.3; // Assuming 30% monthly allocation
  const monthlySpent = totalSpent * 0.45; // 45% of total spent this month
  const dailyBudget = monthlyBudget / 30;
  const dailySpent = totalSpent * 0.02; // 2% of total spent today

  const overviewCards = [
    {
      title: 'Orçamento Total',
      value: `R$ ${(totalBudget / 1000).toFixed(1)}k`,
      progress: budgetUtilization,
      change: '+12%',
      trend: 'up',
      icon: Wallet,
      iconBg: 'bg-primary/10',
      iconColor: 'text-primary',
    },
    {
      title: 'Gasto Mensal',
      value: `R$ ${(monthlySpent / 1000).toFixed(1)}k`,
      progress: monthlyBudget > 0 ? (monthlySpent / monthlyBudget) * 100 : 0,
      change: '+8%',
      trend: 'up',
      icon: TrendingUp,
      iconBg: 'bg-success/10',
      iconColor: 'text-success',
    },
    {
      title: 'Gasto Diário',
      value: `R$ ${dailySpent.toFixed(0)}`,
      progress: dailyBudget > 0 ? (dailySpent / dailyBudget) * 100 : 0,
      change: '+23%',
      trend: 'up',
      icon: Calendar,
      iconBg: 'bg-warning/10',
      iconColor: 'text-warning',
    },
  ];

  const getCampaignBudgetData = () => {
    return campaigns.map(campaign => {
      const campaignBudget = parseFloat(campaign.budget || '0');
      // Simulate spent amount (in real app, this would come from metrics)
      const spentAmount = campaignBudget * (0.4 + Math.random() * 0.4); // 40-80% spent
      const progress = campaignBudget > 0 ? (spentAmount / campaignBudget) * 100 : 0;
      
      return {
        ...campaign,
        budgetAmount: campaignBudget,
        spentAmount,
        progress,
      };
    });
  };

  const getPlatformBadge = (platform: string) => {
    const platformConfig = {
      facebook: { className: 'platform-facebook', label: 'Facebook' },
      google_ads: { className: 'platform-google', label: 'Google Ads' },
      instagram: { className: 'platform-instagram', label: 'Instagram' },
      linkedin: { className: 'platform-linkedin', label: 'LinkedIn' },
    };
    
    return platformConfig[platform as keyof typeof platformConfig] || { className: '', label: platform };
  };

  if (budgetsLoading || campaignsLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Controle de Orçamento</h1>
        <p className="text-muted-foreground mt-2">
          Monitore e gerencie seus gastos com publicidade
        </p>
      </div>

      {/* Budget Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {overviewCards.map((card) => {
          const Icon = card.icon;
          const TrendIcon = card.trend === 'up' ? ArrowUpRight : ArrowDownRight;
          
          return (
            <Card key={card.title} className="kpi-card">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-foreground">{card.title}</h3>
                  <div className={`kpi-icon ${card.iconBg}`}>
                    <Icon className={`w-6 h-6 ${card.iconColor}`} />
                  </div>
                </div>
                <p className="text-3xl font-bold text-foreground mb-2">{card.value}</p>
                <div className="w-full bg-muted rounded-full h-2 mb-2">
                  <div 
                    className="bg-primary h-2 rounded-full transition-all" 
                    style={{ width: `${Math.min(card.progress, 100)}%` }}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    {card.progress.toFixed(0)}% utilizado
                  </p>
                  <div className={`flex items-center text-sm ${
                    card.trend === 'up' ? 'text-success' : 'text-destructive'
                  }`}>
                    <TrendIcon className="w-4 h-4 mr-1" />
                    <span className="font-medium">{card.change}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Budget by Campaign */}
      <Card>
        <CardHeader>
          <CardTitle>Orçamento por Campanha</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {getCampaignBudgetData().map((campaign) => (
              <div key={campaign.id} className="flex items-center justify-between p-4 bg-accent/50 rounded-lg">
                <div className="flex-1">
                  <h4 className="font-medium text-foreground">{campaign.name}</h4>
                  <div className="flex items-center space-x-2 mt-1">
                    {campaign.platforms?.map((platform) => {
                      const platformConfig = getPlatformBadge(platform);
                      return (
                        <span key={platform} className={`platform-badge ${platformConfig.className}`}>
                          {platformConfig.label}
                        </span>
                      );
                    })}
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="text-right">
                    <p className="font-semibold text-foreground">
                      R$ {campaign.spentAmount.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      de R$ {campaign.budgetAmount.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
                    </p>
                  </div>
                  <div className="w-24">
                    <div className="w-full bg-muted rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full transition-all ${
                          campaign.progress > 90 ? 'bg-destructive' : 
                          campaign.progress > 75 ? 'bg-warning' : 'bg-primary'
                        }`}
                        style={{ width: `${Math.min(campaign.progress, 100)}%` }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 text-center">
                      {campaign.progress.toFixed(0)}%
                    </p>
                  </div>
                </div>
              </div>
            ))}
            
            {campaigns.length === 0 && (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                  <DollarSign className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Nenhuma campanha encontrada</h3>
                <p className="text-muted-foreground">
                  Crie campanhas para visualizar o controle de orçamento
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Budget Evolution Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Evolução do Gasto</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 bg-muted/30 rounded-lg flex items-center justify-center">
            <div className="text-center">
              <TrendingUp className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                Gráfico de evolução do gasto - Integração com Chart.js
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                Dados históricos de gastos por período
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
