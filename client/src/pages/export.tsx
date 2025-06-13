// client/src/pages/export.tsx
import React, { useState, useMemo, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { 
  Download, 
  FileText, 
  FileSpreadsheet, 
  FileImage, 
  Calendar as CalendarIcon,
  AlertTriangle,
  Loader2
} from 'lucide-react';
import { format, subDays, isValid, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { apiRequest } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { Campaign as CampaignType } from '@shared/schema';

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import Chart from 'chart.js/auto';
import LogoPng from '@/img/logo.png';

interface ExportTemplate {
  id: string;
  name: string;
  description: string;
  type: 'pdf' | 'excel' | 'csv' | 'image';
  icon: React.ElementType;
  fields: string[];
  popular: boolean;
}

interface AvailableField {
  id: keyof FormattedCampaignDataRow;
  label: string;
  category: string;
}

interface FormattedCampaignDataRow {
  campaignId?: number;
  campaignName?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  budget?: string; 
  spentAmount?: string; 
  impressions?: number | string;
  clicks?: number | string;
  ctr?: string; 
  conversions?: number | string;
  cost?: string; 
  revenue?: string; 
  roi?: string; 
  cpa?: string; 
  leads?: number | string;
  ageRange?: string;
  gender?: string;
  location?: string;
  interests?: string;
  device?: string;
  platforms?: string;
}

const exportTemplates: ExportTemplate[] = [
  {
    id: 'campaign-performance-summary',
    name: 'Resumo de Performance de Campanhas',
    description: 'Principais métricas de performance por campanha selecionada.',
    type: 'pdf',
    icon: FileSpreadsheet,
    fields: ['campaignName', 'status', 'budget', 'spentAmount', 'impressions', 'clicks', 'conversions', 'cost', 'roi'],
    popular: true
  },
  {
    id: 'campaign-details-list',
    name: 'Lista Detalhada de Campanhas',
    description: 'Informações cadastrais e de configuração das campanhas.',
    type: 'csv',
    icon: FileText,
    fields: ['campaignName', 'status', 'startDate', 'endDate', 'budget', 'platforms', 'targetAudience', 'industry'],
    popular: true
  },
];

const availableFields: AvailableField[] = [
  { id: 'campaignName', label: 'Nome da Campanha', category: 'Informações da Campanha' },
  { id: 'status', label: 'Status', category: 'Informações da Campanha' },
  { id: 'startDate', label: 'Data de Início', category: 'Informações da Campanha' },
  { id: 'endDate', label: 'Data de Fim', category: 'Informações da Campanha' },
  { id: 'platforms', label: 'Plataformas', category: 'Informações da Campanha'},
  { id: 'targetAudience', label: 'Público-Alvo', category: 'Informações da Campanha'},
  { id: 'industry', label: 'Indústria/Setor', category: 'Informações da Campanha'},
  { id: 'budget', label: 'Orçamento Total', category: 'Financeiro' },
  { id: 'spentAmount', label: 'Valor Gasto (Recente/Agregado)', category: 'Financeiro' },
  { id: 'cost', label: 'Custo de Ads (Agregado)', category: 'Métricas de Performance' },
  { id: 'impressions', label: 'Impressões (Agregado)', category: 'Métricas de Performance' },
  { id: 'clicks', label: 'Cliques (Agregado)', category: 'Métricas de Performance' },
  { id: 'ctr', label: 'CTR (Agregado)', category: 'Métricas de Performance' },
  { id: 'conversions', label: 'Conversões (Agregado)', category: 'Métricas de Performance' },
  { id: 'revenue', label: 'Receita (Agregado)', category: 'Métricas de Performance' },
  { id: 'roi', label: 'ROI (Agregado)', category: 'Métricas de Performance' },
  { id: 'cpa', label: 'CPA (Agregado)', category: 'Métricas de Performance' },
  { id: 'leads', label: 'Leads (Agregado)', category: 'Métricas de Performance' },
];

function convertToCSV(data: FormattedCampaignDataRow[], fieldObjects: AvailableField[]): string {
  if (!data || data.length === 0 || !fieldObjects || fieldObjects.length === 0) return "";
  const header = fieldObjects.map(f => f.label).join(';');
  const rows = data.map(row => fieldObjects.map(fieldObj => {
    let value = row[fieldObj.id];
    if (value === null || value === undefined) value = '';
    const stringValue = String(value).replace(/"/g, '""');
    return (stringValue.includes(';') || stringValue.includes('\n') || stringValue.includes(',')) ? `"${stringValue}"` : stringValue;
  }).join(';'));
  return [header, ...rows].join('\n');
}

function downloadCSV(csvData: string, filename: string) {
  const blob = new Blob([`\uFEFF${csvData}`], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
}

async function getImageDataUrl(imageUrl: string): Promise<string> {
    try {
        const response = await fetch(imageUrl);
        const blob = await response.blob();
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    } catch (error) {
        console.error("Erro ao carregar imagem para PDF:", error);
        return "";
    }
}

export default function ExportPage() {
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [selectedCampaignIds, setSelectedCampaignIds] = useState<string[]>([]);
  const [selectedFieldIds, setSelectedFieldIds] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({ from: subDays(new Date(), 30), to: new Date()});
  const [exportFormat, setExportFormat] = useState<string>('pdf');
  const { toast } = useToast();
  const [isExporting, setIsExporting] = useState(false);

  const chartContainerRef = useRef<HTMLDivElement>(null);

  const { data: campaigns = [], isLoading: isLoadingCampaigns, error: campaignsError } = useQuery<CampaignType[]>({
    queryKey: ['campaignsForExport'],
    queryFn: async () => apiRequest('GET', '/api/campaigns').then(res => res.json()),
  });

  const { data: dashboardApiData, isLoading: isLoadingDashboardData } = useQuery<any>({
    queryKey: ['dashboardDataForExport', dateRange.from?.toISOString(), dateRange.to?.toISOString()],
    queryFn: async () => {
      if (!dateRange.from || !dateRange.to) return null;
      const daysDiff = Math.max(1, Math.ceil((dateRange.to.getTime() - dateRange.from.getTime()) / (1000 * 3600 * 24)));
      const rangeParam = `${daysDiff}d`;
      return apiRequest('GET', `/api/dashboard?timeRange=${rangeParam}`).then(res => res.json()).catch(() => null);
    },
    enabled: !!dateRange.from && !!dateRange.to,
  });
  
  const formatCurrency = (value?: string | number | null) => {
    if (value === null || value === undefined || String(value).trim() === "") return "N/A";
    const numValue = parseFloat(String(value));
    if (isNaN(numValue)) return "N/A";
    return `R$ ${numValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatNumber = (value?: number | string | null) => {
    if (value === null || value === undefined) return "N/A";
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(numValue)) return "0";
    return numValue.toLocaleString('pt-BR');
  };

  const handleTemplateSelect = (templateId: string) => {
    const template = exportTemplates.find(t => t.id === templateId);
    if (template) {
      setSelectedTemplateId(templateId);
      setSelectedFieldIds(template.fields as (keyof FormattedCampaignDataRow)[]);
      setExportFormat(template.type === 'csv' || template.type === 'excel' || template.type === 'pdf' ? template.type : 'csv');
    } else {
      setSelectedTemplateId('');
    }
  };

  const handleCampaignToggle = (campaignId: string) => {
    setSelectedCampaignIds(prev => 
      prev.includes(campaignId)
        ? prev.filter(id => id !== campaignId)
        : [...prev, campaignId]
    );
  };

  const handleFieldToggle = (fieldId: keyof FormattedCampaignDataRow) => {
    setSelectedFieldIds(prev => 
      prev.includes(fieldId)
        ? prev.filter(id => id !== fieldId)
        : [...prev, fieldId]
    );
    setSelectedTemplateId(''); 
  };
  
  const generatePdfDocument = async (
    campaignData: FormattedCampaignDataRow[],
    selectedFieldsForPdf: AvailableField[],
    generalMetrics: any,
    chartsData: { timeSeries?: any; channel?: any; roi?: any },
    reportDateRange: { from?: Date; to?: Date }
  ) => {
    setIsExporting(true);
    const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
    const pageHeight = doc.internal.pageSize.height;
    const pageWidth = doc.internal.pageSize.width;
    const margin = 15;
    let currentY = margin;
    let pageNumber = 1;

    const logoDataUrl = await getImageDataUrl(LogoPng);

    const addHeader = () => {
      if (logoDataUrl) {
        const imgProps = doc.getImageProperties(logoDataUrl);
        const imgWidth = 30;
        const imgHeight = (imgProps.height * imgWidth) / imgProps.width;
        doc.addImage(logoDataUrl, 'PNG', margin, margin / 2, imgWidth, imgHeight);
      }
      doc.setFontSize(18);
      doc.setTextColor(40,40,40);
      doc.text("Relatório de Exportação", pageWidth / 2, margin + 5, { align: 'center' });
      currentY = margin + 20;
      if (logoDataUrl) currentY = Math.max(currentY, margin / 2 + 30 + 5);
    };

    const addFooter = () => {
      doc.setFontSize(8);
      doc.setTextColor(150,150,150);
      const footerText = `Desenvolvido por USB ABC CONTEUDO CRIATIVO - Página ${pageNumber}`;
      doc.text(footerText, pageWidth / 2, pageHeight - 10, { align: 'center' });
    };

    const checkAndAddPage = (neededHeight = 20) => {
      if (currentY + neededHeight > pageHeight - margin - 15) { // Ajuste para footer
        addFooter();
        doc.addPage();
        pageNumber++;
        addHeader();
        return true; 
      }
      return false;
    };
    
    addHeader();

    doc.setFontSize(14); doc.setTextColor(50,50,50);
    doc.text("Resumo do Relatório", margin, currentY);
    currentY += 8;
    doc.setFontSize(10); doc.setTextColor(100,100,100);
    doc.text(`Período: ${reportDateRange.from && isValid(reportDateRange.from) ? format(reportDateRange.from, "dd/MM/yyyy", {locale: ptBR}) : 'N/A'} a ${reportDateRange.to && isValid(reportDateRange.to) ? format(reportDateRange.to, "dd/MM/yyyy", {locale: ptBR}) : 'N/A'}`, margin, currentY);
    currentY += 5;
    doc.text(`Total de Campanhas Selecionadas: ${campaignData.length}`, margin, currentY);
    currentY += 5;
    doc.text(`Campos Incluídos: ${selectedFieldsForPdf.map(f => f.label).join(', ')}`, margin, currentY, { maxWidth: pageWidth - margin * 2 });
    currentY += 10;

    const getChartImage = async (chartConfig: any, chartType: 'line'|'bar'|'pie'|'doughnut'): Promise<string> => {
        return new Promise((resolve) => {
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = 400; 
            tempCanvas.height = 250;
            
            // Adiciona o canvas ao corpo (oculto) para garantir que seja renderizável
            tempCanvas.style.position = 'absolute';
            tempCanvas.style.left = '-9999px';
            document.body.appendChild(tempCanvas);

            const ctx = tempCanvas.getContext('2d');
            if (!ctx) { document.body.removeChild(tempCanvas); resolve(''); return; }

            new Chart(ctx, {
                type: chartType,
                data: chartConfig,
                options: {
                    responsive: false, 
                    animation: { duration: 0 }, 
                    devicePixelRatio: 2.5, // Aumenta a resolução da imagem do gráfico
                     plugins: { legend: { display: true, position: 'bottom', labels: { font: {size: 8}, color: '#333' } }, title: { display: true, text: chartConfig.options?.title?.text || '', font: {size: 10}, color: '#333' } },
                     scales: { x: { ticks: { font: {size: 8}, color: '#555' }, grid: { color: '#eee'} }, y: { ticks: { font: {size: 8}, color: '#555' }, grid: { color: '#eee'} }}
                }
            });
            
            setTimeout(() => {
                resolve(tempCanvas.toDataURL('image/png'));
                document.body.removeChild(tempCanvas); // Limpa o canvas temporário
            }, 300); // Aumentado o delay para garantir renderização completa
        });
    };
    
    if(selectedFieldsForPdf.some(f => ['impressions', 'clicks', 'conversions', 'roi'].includes(f.id))) {
        checkAndAddPage(10 + ((chartsData.timeSeries || chartsData.channel || chartsData.roi) ? 80 : 0)); 
        doc.setFontSize(14); doc.setTextColor(50,50,50);
        doc.text("Visualizações Gráficas", margin, currentY);
        currentY += 8;

        const chartWidth = (pageWidth - margin * 2 - 10) / 2; 
        const chartHeight = chartWidth * (250/400); 
        let chartX = margin;
        let chartsOnCurrentRow = 0;

        const addChartToPdf = async (chartData: any, type: 'line'|'bar'|'pie'|'doughnut', title: string) => {
            if (chartData) {
                 if (chartsOnCurrentRow >= 2 || chartX + chartWidth > pageWidth - margin) {
                    currentY += chartHeight + 15; // Mais espaço vertical
                    chartX = margin;
                    chartsOnCurrentRow = 0;
                    checkAndAddPage(chartHeight + 15);
                }
                const chartImage = await getChartImage({...chartData, options: { ...(chartData.options || {}), title: {display: true, text: title}}}, type);
                if(chartImage) {
                    doc.addImage(chartImage, 'PNG', chartX, currentY, chartWidth, chartHeight);
                    chartsOnCurrentRow++;
                    chartX += chartWidth + 10;
                }
            }
        }

        if (chartsData.timeSeries && dashboardApiData?.timeSeriesData) await addChartToPdf(dashboardApiData.timeSeriesData, 'line', 'Performance ao Longo do Tempo');
        if (chartsData.channel && dashboardApiData?.channelPerformanceData) await addChartToPdf(dashboardApiData.channelPerformanceData, 'doughnut', 'Distribuição por Canal');
        if (chartsData.roi && dashboardApiData?.roiData) await addChartToPdf(dashboardApiData.roiData, 'bar', 'ROI por Mês/Plataforma');
        
        if(chartsOnCurrentRow > 0) currentY += chartHeight + 15;
    }

    checkAndAddPage(30); 
    doc.setFontSize(14); doc.setTextColor(50,50,50);
    doc.text("Dados Detalhados", margin, currentY);
    currentY += 8;

    const tableColumnStyles: { [key: string]: any } = {};
    selectedFieldsForPdf.forEach(field => {
      if (['budget', 'spentAmount', 'cost', 'revenue', 'impressions', 'clicks', 'conversions', 'leads'].includes(field.id)) {
        tableColumnStyles[field.id] = { halign: 'right' };
      }
    });

    autoTable(doc, {
      startY: currentY,
      head: [selectedFieldsForPdf.map(f => f.label)],
      body: campaignData.map(row => selectedFieldsForPdf.map(field => {
        const value = row[field.id];
        return value === null || value === undefined ? '' : String(value);
      })),
      theme: 'striped', // 'striped', 'grid', 'plain'
      styles: { fontSize: 7, cellPadding: 1.5, overflow: 'linebreak' },
      headStyles: { fillColor: [26, 188, 156], textColor: 255, fontStyle: 'bold', fontSize: 8 },
      alternateRowStyles: { fillColor: [245, 245, 245] },
      columnStyles: tableColumnStyles,
      margin: { left: margin, right: margin },
      didDrawPage: (data) => { 
        if (data.pageNumber > 1 || (data.pageNumber === 1 && data.cursor?.y === margin + 20)) {
          // (Re)adiciona header se não for a primeiríssima chamada da primeira página
          if (data.pageNumber > pageNumber || (data.pageNumber ===1 && data.cursor?.y !== margin + 20 )) { // Evitar header duplo na primeira pagina do autotable
             if(data.pageNumber !== 1) addHeader(); // Só adiciona header se não for a primeira página
          }
        }
         pageNumber = data.pageNumber; // Atualiza o contador de página
        addFooter();
      }
    });
    
    // Adiciona footer na última página se o autotable não criou uma nova página no final
    if (pageNumber === doc.getNumberOfPages()){
        addFooter();
    }
    
    doc.save(`Relatorio_USB_MKT_${format(new Date(), "yyyyMMdd_HHmmss")}.pdf`);
    setIsExporting(false);
    toast({ title: "PDF Gerado", description: "Seu relatório em PDF foi baixado." });
  };

  const handleExport = async () => {
    if (selectedCampaignIds.length === 0 || selectedFieldIds.length === 0 || !dateRange.from || !dateRange.to) {
      toast({ title: "Campos Obrigatórios", description: "Selecione campanhas, campos e período.", variant: "destructive" });
      return;
    }
    setIsExporting(true);

    const selectedCampaignObjects = campaigns.filter(c => selectedCampaignIds.includes(String(c.id)));
    const dataToExport: FormattedCampaignDataRow[] = [];
    const dashboardMetrics = dashboardApiData?.metrics;
    const recentCampaignsFromDashboard = dashboardApiData?.recentCampaigns || [];
    const finalSelectedFieldObjects = availableFields.filter(f => selectedFieldIds.includes(f.id));

    for (const campaign of selectedCampaignObjects) {
      const row: FormattedCampaignDataRow = {};
      const recentCampaignData = recentCampaignsFromDashboard.find((rc: any) => rc.id === campaign.id);

      for (const field of finalSelectedFieldObjects) {
        const fieldId = field.id;
        switch (fieldId) {
          case 'campaignId': row[fieldId] = campaign.id; break;
          case 'campaignName': row[fieldId] = campaign.name; break;
          case 'status': row[fieldId] = campaign.status; break;
          case 'startDate': row[fieldId] = campaign.startDate && isValid(parseISO(String(campaign.startDate))) ? format(parseISO(String(campaign.startDate)), 'dd/MM/yyyy', {locale: ptBR}) : 'N/A'; break;
          case 'endDate': row[fieldId] = campaign.endDate && isValid(parseISO(String(campaign.endDate))) ? format(parseISO(String(campaign.endDate)), 'dd/MM/yyyy', {locale: ptBR}) : 'N/A'; break;
          case 'platforms': row[fieldId] = campaign.platforms?.join(', ') || 'N/A'; break;
          case 'targetAudience': row[fieldId] = campaign.targetAudience || 'N/A'; break;
          case 'industry': row[fieldId] = campaign.industry || 'N/A'; break;
          case 'budget': row[fieldId] = formatCurrency(campaign.budget); break;
          case 'spentAmount': row[fieldId] = formatCurrency(recentCampaignData?.spent ?? 'N/A'); break;
          case 'impressions': row[fieldId] = formatNumber(dashboardMetrics?.impressions); break;
          case 'clicks': row[fieldId] = formatNumber(dashboardMetrics?.clicks); break;
          case 'ctr': row[fieldId] = `${dashboardMetrics?.ctr?.toFixed(2) ?? '0.00'}%`; break;
          case 'conversions': row[fieldId] = formatNumber(dashboardMetrics?.conversions); break;
          case 'cost': row[fieldId] = formatCurrency(dashboardMetrics?.totalCostPeriod); break;
          case 'revenue': row[fieldId] = 'N/A'; break; 
          case 'roi': row[fieldId] = `${dashboardMetrics?.avgROI?.toFixed(1) ?? '0.0'}x`; break;
          case 'cpa': row[fieldId] = 'N/A'; break;
          case 'leads': row[fieldId] = 'N/A'; break;
          default: row[fieldId] = (campaign as any)[fieldId] !== undefined && (campaign as any)[fieldId] !== null ? String((campaign as any)[fieldId]) : 'N/A';
        }
      }
      dataToExport.push(row);
    }
    
    if (selectedCampaignObjects.length > 1 && selectedFieldIds.some(sfId => ['impressions', 'clicks', 'conversions', 'cost', 'spentAmount'].includes(sfId))) {
        const totalsRow: FormattedCampaignDataRow = { campaignName: "TOTAIS (Agregado do Período Selecionado)" };
        if (selectedFieldIds.includes('impressions')) totalsRow.impressions = formatNumber(dashboardMetrics?.impressions);
        if (selectedFieldIds.includes('clicks')) totalsRow.clicks = formatNumber(dashboardMetrics?.clicks);
        if (selectedFieldIds.includes('conversions')) totalsRow.conversions = formatNumber(dashboardMetrics?.conversions);
        if (selectedFieldIds.includes('cost')) totalsRow.cost = formatCurrency(dashboardMetrics?.totalCostPeriod);
        if (selectedFieldIds.includes('spentAmount')) totalsRow.spentAmount = formatCurrency(dashboardMetrics?.totalSpent);
        dataToExport.push(totalsRow);
    }

    if (exportFormat === 'pdf') {
      await generatePdfDocument(
        dataToExport, 
        finalSelectedFieldObjects, 
        dashboardMetrics,
        { 
          timeSeries: dashboardApiData?.timeSeriesData, 
          channel: dashboardApiData?.channelPerformanceData, 
          roi: dashboardApiData?.roiData 
        },
        dateRange
      );
    } else if (exportFormat === 'csv') {
      const csvData = convertToCSV(dataToExport, finalSelectedFieldObjects);
      if(csvData) {
        downloadCSV(csvData, `relatorio_mktv2_${format(new Date(), 'yyyyMMdd_HHmmss')}.csv`);
        toast({ title: "Exportação CSV Concluída", description: "Seu relatório foi gerado e baixado." });
      } else {
        toast({ title: "Exportação Falhou", description: "Não foi possível gerar os dados para o CSV.", variant: "destructive" });
      }
      setIsExporting(false);
    } else {
      toast({ title: "Formato Indisponível", description: `A exportação para ${exportFormat.toUpperCase()} ainda não está implementada.`, variant: "default" });
      setIsExporting(false);
    }
  };

  const getFileIcon = (type: string) => {
    switch (type) {
      case 'pdf': return <FileText className="w-4 h-4 text-red-500" />;
      case 'excel': return <FileSpreadsheet className="w-4 h-4 text-green-500" />;
      case 'csv': return <FileText className="w-4 h-4 text-blue-500" />;
      case 'image': return <FileImage className="w-4 h-4 text-purple-500" />;
      default: return <FileText className="w-4 h-4" />;
    }
  };

  const groupedFields = availableFields.reduce((acc, field) => {
    if (!acc[field.category]) acc[field.category] = [];
    acc[field.category].push(field);
    return acc;
  }, {} as Record<string, AvailableField[]>);

  if (isLoadingCampaigns || (isLoadingDashboardData && !dashboardApiData && (dateRange.from && dateRange.to))) {
    return <div className="p-8 text-center"><Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" /> Carregando dados para exportação...</div>;
  }

  if (campaignsError) {
    return (
      <div className="p-8 text-center text-destructive">
        <AlertTriangle className="h-12 w-12 mx-auto mb-2" />
        Erro ao carregar campanhas: {(campaignsError as Error).message}
      </div>
    );
  }
  
  return (
    <div className="space-y-6 p-4 md:p-6">
      <div ref={chartContainerRef} style={{ position: 'absolute', left: '-9999px', top: '-9999px', width: '400px', height: '250px' }}></div>

      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Exportar Relatórios</h1>
          <p className="text-muted-foreground">
            Gere relatórios PDF ou CSV personalizados.
          </p>
        </div>
        <Button 
          onClick={handleExport}
          disabled={selectedCampaignIds.length === 0 || selectedFieldIds.length === 0 || !dateRange.from || !dateRange.to || isExporting}
          className="neu-button"
        >
          {isExporting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
          {isExporting ? "Exportando..." : `Gerar ${exportFormat.toUpperCase()}`}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card className="neu-card">
            <CardHeader>
              <CardTitle>1. Escolher Template (Opcional)</CardTitle>
              <CardDescription>
                Templates pré-definem os campos e o formato do relatório.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {exportTemplates.map((template) => {
                  const Icon = template.icon;
                  return (
                    <div
                      key={template.id}
                      className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                        selectedTemplateId === template.id
                          ? 'border-primary bg-primary/5 shadow-md'
                          : 'border-border hover:border-primary/50'
                      }`}
                      onClick={() => handleTemplateSelect(template.id)}
                    >
                       <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <Icon className="w-5 h-5 text-primary" />
                          <h3 className="font-semibold">{template.name}</h3>
                        </div>
                        {template.popular && <Badge variant="secondary" className="text-xs">Popular</Badge>}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {template.description}
                      </p>
                      <div className="flex items-center space-x-2 mt-2">
                        {getFileIcon(template.type)}
                        <span className="text-xs text-muted-foreground uppercase">
                          {template.type.toUpperCase()}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Card className="neu-card">
            <CardHeader>
              <CardTitle>2. Selecionar Campanhas *</CardTitle>
            </CardHeader>
            <CardContent className="max-h-60 overflow-y-auto custom-scrollbar">
              <div className="space-y-3">
                {campaigns.length > 0 ? campaigns.map((campaign) => (
                  <div key={campaign.id} className="flex items-center space-x-3">
                    <Checkbox
                      id={`campaign-export-${campaign.id}`}
                      checked={selectedCampaignIds.includes(String(campaign.id))}
                      onCheckedChange={() => handleCampaignToggle(String(campaign.id))}
                    />
                    <label
                      htmlFor={`campaign-export-${campaign.id}`}
                      className="flex-1 text-sm font-medium cursor-pointer"
                    >
                      {campaign.name}
                    </label>
                  </div>
                )) : <p className="text-sm text-muted-foreground">Nenhuma campanha disponível.</p>}
              </div>
            </CardContent>
          </Card>

          <Card className="neu-card">
            <CardHeader><CardTitle>3. Definir Período *</CardTitle></CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row items-center gap-4">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full sm:w-auto justify-start text-left font-normal neu-button">
                      <CalendarIcon className="w-4 h-4 mr-2" />
                      {dateRange.from && isValid(dateRange.from) ? format(dateRange.from, 'dd/MM/yyyy', { locale: ptBR }) : 'Data inicial'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 neu-card" align="start">
                    <Calendar mode="single" selected={dateRange.from} onSelect={(d) => setDateRange(prev => ({ ...prev, from: d || undefined }))} initialFocus />
                  </PopoverContent>
                </Popover>
                <span className="text-muted-foreground hidden sm:inline">-</span>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full sm:w-auto justify-start text-left font-normal neu-button">
                      <CalendarIcon className="w-4 h-4 mr-2" />
                      {dateRange.to && isValid(dateRange.to) ? format(dateRange.to, 'dd/MM/yyyy', { locale: ptBR }) : 'Data final'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 neu-card" align="start">
                    <Calendar mode="single" selected={dateRange.to} onSelect={(d) => setDateRange(prev => ({ ...prev, to: d || undefined }))} initialFocus disabled={(date) => dateRange.from ? date < dateRange.from : false }/>
                  </PopoverContent>
                </Popover>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-1 space-y-6">
          <Card className="neu-card">
            <CardHeader>
              <CardTitle>4. Selecionar Campos *</CardTitle>
              <CardDescription>Métricas para o relatório.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 max-h-[30rem] overflow-y-auto custom-scrollbar">
              {Object.entries(groupedFields).map(([category, fieldsInCategory]) => (
                <div key={category}>
                  <h4 className="text-sm font-semibold mb-2 text-primary">{category}</h4>
                  <div className="space-y-2">
                    {fieldsInCategory.map((field) => (
                      <div key={field.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`field-export-${field.id}`}
                          checked={selectedFieldIds.includes(field.id)}
                          onCheckedChange={() => handleFieldToggle(field.id as keyof FormattedCampaignDataRow)}
                        />
                        <label htmlFor={`field-export-${field.id}`} className="text-xs cursor-pointer">
                          {field.label}
                        </label>
                      </div>
                    ))}
                  </div>
                   {category !== Object.keys(groupedFields)[Object.keys(groupedFields).length -1] && <Separator className="my-3"/>}
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="neu-card">
            <CardHeader><CardTitle>5. Formato de Exportação</CardTitle></CardHeader>
            <CardContent>
              <Select value={exportFormat} onValueChange={setExportFormat}>
                <SelectTrigger className="neu-input">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="neu-card">
                  <SelectItem value="pdf">PDF (.pdf)</SelectItem>
                  <SelectItem value="csv">CSV (.csv)</SelectItem>
                  <SelectItem value="excel" disabled>Excel (.xlsx) - Em breve</SelectItem>
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
