import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { 
  Link as LinkIcon, 
  CheckCircle, 
  AlertCircle, 
  Settings, 
  Zap,
  BarChart3,
  Target,
  MessageSquare,
  Globe
} from 'lucide-react';
import { SiFacebook, SiGoogle, SiInstagram, SiLinkedin, SiTiktok, SiWhatsapp } from 'react-icons/si';

interface Integration {
  id: string;
  name: string;
  description: string;
  icon: any;
  status: 'connected' | 'disconnected' | 'error';
  features: string[];
  apiEndpoint: string;
  authUrl?: string;
  lastSync?: string;
  accountInfo?: {
    name: string;
    id: string;
    currency?: string;
  };
}

export default function IntegrationsPage() {
  const [integrations, setIntegrations] = useState<Integration[]>([
    {
      id: 'google-ads',
      name: 'Google Ads',
      description: 'Gerencie campanhas, palavras-chave e relatórios do Google Ads',
      icon: SiGoogle,
      status: 'disconnected',
      features: ['Campanhas', 'Palavras-chave', 'Relatórios', 'Conversões'],
      apiEndpoint: 'https://googleads.googleapis.com/v14',
      authUrl: 'https://accounts.google.com/oauth/authorize',
      accountInfo: undefined
    },
    {
      id: 'meta-ads',
      name: 'Meta Business (Facebook/Instagram)',
      description: 'Integração completa com Facebook Ads e Instagram',
      icon: SiFacebook,
      status: 'disconnected',
      features: ['Campanhas', 'Conjuntos de anúncios', 'Criativos', 'Pixels'],
      apiEndpoint: 'https://graph.facebook.com/v18.0',
      authUrl: 'https://www.facebook.com/v18.0/dialog/oauth',
      accountInfo: undefined
    },
    {
      id: 'linkedin-ads',
      name: 'LinkedIn Ads',
      description: 'Campanhas B2B e segmentação profissional',
      icon: SiLinkedin,
      status: 'disconnected',
      features: ['Campanhas B2B', 'Segmentação', 'Lead Gen Forms'],
      apiEndpoint: 'https://api.linkedin.com/v2',
      authUrl: 'https://www.linkedin.com/oauth/v2/authorization',
      accountInfo: undefined
    },
    {
      id: 'tiktok-ads',
      name: 'TikTok for Business',
      description: 'Anúncios na plataforma de vídeos mais popular',
      icon: SiTiktok,
      status: 'disconnected',
      features: ['Vídeo Ads', 'Spark Ads', 'Audiências'],
      apiEndpoint: 'https://business-api.tiktok.com/open_api/v1.3',
      authUrl: 'https://ads.tiktok.com/marketing_api/auth',
      accountInfo: undefined
    },
    {
      id: 'whatsapp-business',
      name: 'WhatsApp Business API',
      description: 'Automação e mensagens em massa via WhatsApp',
      icon: SiWhatsapp,
      status: 'disconnected',
      features: ['Mensagens', 'Templates', 'Webhooks', 'Catálogo'],
      apiEndpoint: 'https://graph.facebook.com/v18.0',
      authUrl: 'https://business.facebook.com/wa/manage/phone-numbers',
      accountInfo: undefined
    }
  ]);

  const [selectedIntegration, setSelectedIntegration] = useState<string>('google-ads');
  const [apiKeys, setApiKeys] = useState<Record<string, string>>({});

  const handleConnect = async (integrationId: string) => {
    const integration = integrations.find(i => i.id === integrationId);
    if (!integration) return;

    // Para conexões OAuth, redirecionar para a URL de autorização
    if (integration.authUrl) {
      const authParams = new URLSearchParams({
        client_id: 'your-client-id', // Será fornecido pelo usuário
        redirect_uri: `${window.location.origin}/integrations/callback`,
        scope: getRequiredScopes(integrationId),
        response_type: 'code',
        state: integrationId
      });
      
      window.location.href = `${integration.authUrl}?${authParams}`;
    }
  };

  const getRequiredScopes = (integrationId: string): string => {
    const scopes = {
      'google-ads': 'https://www.googleapis.com/auth/adwords',
      'meta-ads': 'ads_management,ads_read,business_management',
      'linkedin-ads': 'r_ads,r_ads_reporting,rw_ads',
      'tiktok-ads': 'ads:read,ads:write',
      'whatsapp-business': 'whatsapp_business_management,whatsapp_business_messaging'
    };
    return scopes[integrationId as keyof typeof scopes] || '';
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected': return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'error': return <AlertCircle className="w-5 h-5 text-red-500" />;
      default: return <AlertCircle className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'connected': return <Badge className="bg-green-100 text-green-800">Conectado</Badge>;
      case 'error': return <Badge variant="destructive">Erro</Badge>;
      default: return <Badge variant="outline">Desconectado</Badge>;
    }
  };

  const selectedIntegrationData = integrations.find(i => i.id === selectedIntegration);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Integrações</h1>
          <p className="text-muted-foreground">
            Conecte suas contas de anúncios para sincronização automática
          </p>
        </div>
        <Button>
          <Zap className="w-4 h-4 mr-2" />
          Sincronizar Todas
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Lista de Integrações */}
        <div className="lg:col-span-1">
          <Card className="neu-card">
            <CardHeader>
              <CardTitle>Plataformas Disponíveis</CardTitle>
              <CardDescription>
                Conecte suas contas de publicidade
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {integrations.map((integration) => {
                const Icon = integration.icon;
                return (
                  <div
                    key={integration.id}
                    className={`p-4 rounded-xl cursor-pointer transition-all duration-200 ${
                      selectedIntegration === integration.id
                        ? 'neu-card-inset'
                        : 'neu-card hover:scale-105'
                    }`}
                    onClick={() => setSelectedIntegration(integration.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <Icon className="w-6 h-6" />
                        <div>
                          <h3 className="font-semibold text-sm">{integration.name}</h3>
                          <p className="text-xs text-muted-foreground">
                            {integration.features.length} recursos
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(integration.status)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>

        {/* Detalhes da Integração */}
        <div className="lg:col-span-2 space-y-6">
          {selectedIntegrationData && (
            <>
              <Card className="neu-card">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <selectedIntegrationData.icon className="w-8 h-8" />
                      <div>
                        <CardTitle>{selectedIntegrationData.name}</CardTitle>
                        <CardDescription>{selectedIntegrationData.description}</CardDescription>
                      </div>
                    </div>
                    {getStatusBadge(selectedIntegrationData.status)}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-semibold mb-2">Recursos Disponíveis</h4>
                      <div className="flex flex-wrap gap-2">
                        {selectedIntegrationData.features.map((feature) => (
                          <Badge key={feature} variant="outline">
                            {feature}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <Separator />

                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-medium">Status da Conexão</p>
                        <p className="text-sm text-muted-foreground">
                          {selectedIntegrationData.status === 'connected' 
                            ? 'Conectado e sincronizando dados automaticamente'
                            : 'Clique em conectar para autorizar o acesso'
                          }
                        </p>
                      </div>
                      <Button 
                        onClick={() => handleConnect(selectedIntegrationData.id)}
                        disabled={selectedIntegrationData.status === 'connected'}
                        className="neu-button"
                      >
                        <LinkIcon className="w-4 h-4 mr-2" />
                        {selectedIntegrationData.status === 'connected' ? 'Conectado' : 'Conectar'}
                      </Button>
                    </div>

                    {selectedIntegrationData.accountInfo && (
                      <>
                        <Separator />
                        <div>
                          <h4 className="font-semibold mb-2">Informações da Conta</h4>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Nome:</span>
                              <span>{selectedIntegrationData.accountInfo.name}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">ID:</span>
                              <span className="font-mono">{selectedIntegrationData.accountInfo.id}</span>
                            </div>
                            {selectedIntegrationData.accountInfo.currency && (
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Moeda:</span>
                                <span>{selectedIntegrationData.accountInfo.currency}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Tabs defaultValue="setup" className="space-y-4">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="setup">Configuração</TabsTrigger>
                  <TabsTrigger value="sync">Sincronização</TabsTrigger>
                  <TabsTrigger value="webhooks">Webhooks</TabsTrigger>
                </TabsList>

                <TabsContent value="setup" className="space-y-4">
                  <Card className="neu-card">
                    <CardHeader>
                      <CardTitle>Configurar Conexão</CardTitle>
                      <CardDescription>
                        Insira suas credenciais de API para conectar
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="client-id">Client ID</Label>
                        <Input 
                          id="client-id" 
                          placeholder="Digite seu Client ID"
                          className="neu-input"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="client-secret">Client Secret</Label>
                        <Input 
                          id="client-secret" 
                          type="password"
                          placeholder="Digite seu Client Secret"
                          className="neu-input"
                        />
                      </div>
                      {selectedIntegrationData.id === 'google-ads' && (
                        <div className="space-y-2">
                          <Label htmlFor="developer-token">Developer Token</Label>
                          <Input 
                            id="developer-token" 
                            placeholder="Digite seu Developer Token do Google Ads"
                            className="neu-input"
                          />
                        </div>
                      )}
                      <Button className="w-full neu-button">
                        Salvar Credenciais
                      </Button>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="sync" className="space-y-4">
                  <Card className="neu-card">
                    <CardHeader>
                      <CardTitle>Configurações de Sincronização</CardTitle>
                      <CardDescription>
                        Configure quando e quais dados sincronizar
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">Sincronização Automática</p>
                          <p className="text-sm text-muted-foreground">
                            Sincronizar dados a cada 15 minutos
                          </p>
                        </div>
                        <Switch defaultChecked />
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">Campanhas</p>
                          <p className="text-sm text-muted-foreground">
                            Importar todas as campanhas e métricas
                          </p>
                        </div>
                        <Switch defaultChecked />
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">Palavras-chave</p>
                          <p className="text-sm text-muted-foreground">
                            Sincronizar performance de palavras-chave
                          </p>
                        </div>
                        <Switch defaultChecked />
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">Conversões</p>
                          <p className="text-sm text-muted-foreground">
                            Importar dados de conversão e atribuição
                          </p>
                        </div>
                        <Switch defaultChecked />
                      </div>

                      <Separator />

                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-medium">Última Sincronização</p>
                          <p className="text-sm text-muted-foreground">
                            {selectedIntegrationData.lastSync || 'Nunca'}
                          </p>
                        </div>
                        <Button variant="outline" className="neu-button">
                          <BarChart3 className="w-4 h-4 mr-2" />
                          Sincronizar Agora
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="webhooks" className="space-y-4">
                  <Card className="neu-card">
                    <CardHeader>
                      <CardTitle>Configurar Webhooks</CardTitle>
                      <CardDescription>
                        Receba notificações em tempo real sobre mudanças
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="webhook-url">URL do Webhook</Label>
                        <Input 
                          id="webhook-url" 
                          placeholder="https://seusite.com/webhook"
                          className="neu-input"
                        />
                      </div>

                      <div className="space-y-3">
                        <Label>Eventos para Notificar</Label>
                        <div className="space-y-2">
                          <div className="flex items-center space-x-2">
                            <Switch id="campaign-changes" />
                            <Label htmlFor="campaign-changes">Mudanças em campanhas</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Switch id="budget-alerts" />
                            <Label htmlFor="budget-alerts">Alertas de orçamento</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Switch id="performance-changes" />
                            <Label htmlFor="performance-changes">Mudanças significativas de performance</Label>
                          </div>
                        </div>
                      </div>

                      <Button className="w-full neu-button">
                        <Settings className="w-4 h-4 mr-2" />
                        Configurar Webhook
                      </Button>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </>
          )}
        </div>
      </div>
    </div>
  );
}