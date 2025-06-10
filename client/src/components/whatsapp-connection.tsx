import React, { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Smartphone, QrCode, CheckCircle, AlertCircle, Power, PowerOff, Loader2 } from 'lucide-react';

interface ConnectionStatus {
  status: 'disconnected' | 'connecting' | 'connected' | 'qr_code_needed' | 'auth_failure' | 'error' | 'disconnected_logged_out';
  qrCode: string | null;
  connectedPhoneNumber?: string;
  lastError?: string;
}

interface WhatsAppConnectionProps {
  onConnectionChange?: (status: ConnectionStatus) => void;
}

export const WhatsAppConnection: React.FC<WhatsAppConnectionProps> = ({ onConnectionChange }) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: status, isLoading: isLoadingStatus } = useQuery<ConnectionStatus>({
    queryKey: ['whatsappConnectionStatus'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/whatsapp/status');
      if (!response.ok) {
        const errData = await response.json().catch(() => ({ message: "Não foi possível obter o status." }));
        throw new Error(errData.message || "Erro de comunicação com o servidor.");
      }
      return response.json();
    },
    refetchInterval: (query) => {
        const data = query.state.data;
        return (data?.status === 'qr_code_needed' || data?.status === 'connecting') ? 3000 : 15000;
    },
    refetchOnWindowFocus: true,
  });
  
  useEffect(() => {
    if(status) {
        onConnectionChange?.(status);
    }
  }, [status, onConnectionChange]);


  const connectMutation = useMutation({
    mutationFn: () => apiRequest('POST', '/api/whatsapp/connect'),
    onSuccess: () => {
      toast({ title: "Conexão Iniciada", description: "Aguardando QR code ou conexão..." });
      queryClient.invalidateQueries({ queryKey: ['whatsappConnectionStatus'] });
    },
    onError: (err: Error) => {
      toast({ title: "Erro ao Conectar", description: err.message, variant: "destructive" });
    },
  });

  const disconnectMutation = useMutation({
    mutationFn: () => apiRequest('POST', '/api/whatsapp/disconnect'),
    onSuccess: () => {
      toast({ title: "Desconexão Solicitada", description: "Sua sessão do WhatsApp foi encerrada." });
      queryClient.invalidateQueries({ queryKey: ['whatsappConnectionStatus'] });
    },
    onError: (err: Error) => {
      toast({ title: "Erro ao Desconectar", description: err.message, variant: "destructive" });
    },
  });

  const getStatusInfo = () => {
    if (isLoadingStatus && !status) {
        return { icon: <Loader2 className="w-5 h-5 animate-spin" />, text: 'Carregando status...', color: "text-gray-500" };
    }
    switch (status?.status) {
      case 'connected': return { icon: <CheckCircle className="w-5 h-5 text-green-500" />, text: `Conectado: ${status.connectedPhoneNumber}`, color: "text-green-500" };
      case 'connecting': return { icon: <Loader2 className="w-5 h-5 animate-spin text-yellow-500" />, text: 'Conectando...', color: "text-yellow-500" };
      case 'qr_code_needed': return { icon: <QrCode className="w-5 h-5 text-blue-500" />, text: 'Aguardando leitura do QR Code', color: "text-blue-500" };
      case 'disconnected_logged_out': return { icon: <AlertCircle className="w-5 h-5 text-red-500" />, text: 'Desconectado. Faça a leitura novamente.', color: "text-red-500" };
      case 'error': return { icon: <AlertCircle className="w-5 h-5 text-red-500" />, text: `Erro: ${status.lastError || 'Desconhecido'}`, color: "text-red-500" };
      default: return { icon: <AlertCircle className="w-5 h-5 text-gray-500" />, text: 'Desconectado', color: "text-gray-500" };
    }
  };

  const statusInfo = getStatusInfo();
  const isLoading = isLoadingStatus || connectMutation.isPending || disconnectMutation.isPending;

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
            <div>
                <CardTitle>Conexão com WhatsApp</CardTitle>
                <CardDescription>Gerencie a conexão do seu número com a plataforma.</CardDescription>
            </div>
            <div className={`flex items-center gap-2 p-2 rounded-md bg-muted ${statusInfo.color}`}>
              {statusInfo.icon}
              <span className="font-semibold text-sm">{statusInfo.text}</span>
            </div>
        </div>
      </CardHeader>
      <CardContent>
        {status?.status === 'connected' ? (
          <div className="text-center p-8">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <Button variant="destructive" onClick={() => disconnectMutation.mutate()} disabled={isLoading}>
              {disconnectMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <PowerOff className="w-4 h-4 mr-2" />}
              Desconectar
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="flex flex-col items-center justify-center p-4 border rounded-lg bg-card-foreground/5 min-h-[280px]">
              {status?.status === 'qr_code_needed' && status.qrCode ? (
                <img src={status.qrCode} alt="WhatsApp QR Code" className="w-64 h-64 rounded-lg shadow-lg" />
              ) : (
                <div className="text-center text-muted-foreground">
                    {isLoading || status?.status === 'connecting' ? <Loader2 className="w-16 h-16 animate-spin text-primary" /> : <QrCode className="w-16 h-16" />}
                    <p className="mt-4">{isLoading || status?.status === 'connecting' ? 'Gerando QR Code...' : 'Clique em Conectar para gerar o QR Code'}</p>
                </div>
              )}
            </div>
            <div>
              <Alert>
                <Smartphone className="h-4 w-4" />
                <AlertTitle>Como conectar</AlertTitle>
                <AlertDescription>
                  <ol className="list-decimal list-inside space-y-1 mt-2">
                    <li>Clique em "Conectar / Gerar QR Code".</li>
                    <li>No seu celular, vá em WhatsApp &gt; Dispositivos conectados.</li>
                    <li>Toque em "Conectar um dispositivo" e escaneie o código.</li>
                  </ol>
                </AlertDescription>
              </Alert>
              <Button className="w-full mt-4" onClick={() => connectMutation.mutate()} disabled={isLoading || status?.status === 'connecting'}>
                {connectMutation.isPending || status?.status === 'connecting' ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Power className="w-4 h-4 mr-2" />}
                Conectar / Gerar QR Code
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
