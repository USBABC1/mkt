import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertTitle } from '@/components/ui/alert';
import { Calendar as CalendarIcon, Loader2, BadgeAlert , Plus, MoreVertical, Edit, Trash2, GanttChartSquare, Download } from 'lucide-react';
import { FullCampaignData, CampaignTask as CampaignTaskType, InsertCampaignPhase } from '@shared/schema';
import { format, parseISO, differenceInDays, addDays, subDays, isValid, eachDayOfInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import TaskForm from '@/components/task-form';
import { useToast } from "@/hooks/use-toast";
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Slider } from '@/components/ui/slider';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import LogoPng from '@/img/logo.png';
import html2canvas from 'html2canvas';

interface PhaseState {
  id: number;
  name: string;
  duration: number;
  order: number;
}

const getPhaseColor = (index: number) => {
  const colors = ['#84cc16', '#3b82f6', '#ef4444', '#f97316', '#8b5cf6', '#14b8a6', '#eab308', '#ec4899'];
  return colors[index % colors.length];
};

const getStatusBadgeConfig = (status: CampaignTaskType['status']) => {
    const statusConfig = {
      pending: { label: 'Pendente', className: 'bg-red-500/20 text-red-400 border-red-500/30' },
      in_progress: { label: 'Em Progresso', className: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
      completed: { label: 'Concluído', className: 'bg-green-500/20 text-green-400 border-green-500/30' },
      on_hold: { label: 'Em Espera', className: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
    };
    return statusConfig[status] || statusConfig.pending;
};

const getAvatarUrl = (assigneeName?: string | null) => {
    if (!assigneeName) return `https://ui-avatars.com/api/?name=?&background=6b7280&color=fff&size=24&font-size=0.45&bold=true`;
    const initials = assigneeName.split(' ').map(n => n[0]).join('').toUpperCase();
    return `https://ui-avatars.com/api/?name=${initials}&background=2563eb&color=fff&size=24&font-size=0.45&bold=true`;
};

const ModernGanttChart = ({ campaign, scheduleRef }: { campaign: FullCampaignData, scheduleRef: React.Ref<HTMLDivElement> }) => {
    const sortedPhases = useMemo(() => (campaign.phases || []).sort((a,b) => a.order - b.order), [campaign.phases]);
    const allTasks = useMemo(() => sortedPhases.flatMap(p => p.tasks.map(t => ({...t, phaseName: p.name}))).filter(t => t.startDate && t.endDate), [sortedPhases]);

    const { startDate, endDate, totalDays } = useMemo(() => {
        const dates = allTasks.flatMap(t => [parseISO(t.startDate!), parseISO(t.endDate!)]);
        if (dates.length === 0) {
            const now = new Date();
            return { startDate: subDays(now, 15), endDate: addDays(now, 15), totalDays: 31 };
        }
        const minDate = new Date(Math.min(...dates.map(d => d.getTime())));
        const maxDate = new Date(Math.max(...dates.map(d => d.getTime())));
        return {
            startDate: subDays(minDate, 2),
            endDate: addDays(maxDate, 2),
            totalDays: differenceInDays(addDays(maxDate, 2), subDays(minDate, 2)) + 1
        };
    }, [allTasks]);

    const days = useMemo(() => eachDayOfInterval({ start: startDate, end: endDate }), [startDate, endDate]);

    return (
        <div className="bg-card p-4 rounded-lg neu-card-inset" ref={scheduleRef}>
            <div className="overflow-x-auto custom-scrollbar">
                <div className="grid" style={{ gridTemplateColumns: `200px repeat(${totalDays}, minmax(40px, 1fr))`, width: `${200 + totalDays * 40}px` }}>
                    {/* Header */}
                    <div className="sticky left-0 bg-card z-10 border-r border-b border-border"></div>
                    {days.map((day, index) => (
                        <div key={index} className="text-center py-2 border-b border-border text-xs text-muted-foreground">
                            <div>{format(day, 'EEE', { locale: ptBR })}</div>
                            <div className="font-bold">{format(day, 'd')}</div>
                        </div>
                    ))}

                    {/* Body */}
                    {sortedPhases.map((phase) => (
                        <React.Fragment key={phase.id}>
                            <div className="sticky left-0 bg-card z-10 border-r border-border p-2 flex items-center">
                                <p className="font-semibold text-sm truncate">{phase.name}</p>
                            </div>
                            <div className="col-span-full h-px bg-border/20"></div>

                            {phase.tasks.map((task) => {
                                if (!task.startDate || !task.endDate) return null;
                                const taskStart = parseISO(task.startDate);
                                const taskEnd = parseISO(task.endDate);
                                const startColumn = differenceInDays(taskStart, startDate) + 2;
                                const duration = differenceInDays(taskEnd, taskStart) + 1;
                                
                                return (
                                    <React.Fragment key={task.id}>
                                        <div className="sticky left-0 bg-card z-10 border-r border-border p-2 text-sm text-muted-foreground truncate flex items-center">{task.name}</div>
                                        <div className="p-2 relative" style={{ gridColumn: `${startColumn} / span ${duration}` }}>
                                            <div className="h-10 bg-primary/80 rounded-full flex items-center justify-between px-3 text-primary-foreground text-xs shadow-md">
                                                <span className="truncate">{task.name}</span>
                                                <img src={getAvatarUrl(task.assignee?.username)} alt={task.assignee?.username || ''} className="w-6 h-6 rounded-full border-2 border-background/50 ml-2"/>
                                            </div>
                                        </div>
                                    </React.Fragment>
                                );
                            })}
                        </React.Fragment>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default function SchedulePage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);
  const [modalState, setModalState] = useState<{ isOpen: boolean; phaseId?: number; task?: CampaignTaskType; }>({ isOpen: false });
  const [phasesState, setPhasesState] = useState<PhaseState[]>([]);
  const [eventDate, setEventDate] = useState<Date>(new Date());
  const [isExporting, setIsExporting] = useState(false);
  const scheduleRef = useRef<HTMLDivElement>(null);

  const { data: campaigns, isLoading: isLoadingCampaigns } = useQuery<FullCampaignData[]>({
    queryKey: ['campaignsListForSchedule'],
    queryFn: async () => apiRequest('GET', '/api/campaigns').then(res => res.json()),
  });

  const { data: campaign, isLoading: isLoadingCampaignDetails, error } = useQuery<FullCampaignData>({
    queryKey: ['campaignSchedule', selectedCampaignId],
    enabled: !!selectedCampaignId,
    queryFn: async () => {
      if (!selectedCampaignId) return null;
      const res = await apiRequest('GET', `/api/campaigns/${selectedCampaignId}`);
      if (!res.ok) throw new Error('Campanha não encontrada.');
      return res.json();
    },
  });
  
  useEffect(() => {
    if (campaign) {
        if(campaign.phases) {
            const eventPhase = campaign.phases.find(p => p.name.toLowerCase() === 'evento');
            if (eventPhase?.startDate && isValid(parseISO(String(eventPhase.startDate)))) {
              setEventDate(parseISO(String(eventPhase.startDate)));
            } else if (campaign.startDate && isValid(parseISO(String(campaign.startDate)))) {
              setEventDate(parseISO(String(campaign.startDate)));
            }
            setPhasesState(campaign.phases.map(p => ({
              id: p.id,
              name: p.name,
              duration: (p.startDate && p.endDate && isValid(parseISO(String(p.startDate))) && isValid(parseISO(String(p.endDate)))) ? differenceInDays(parseISO(String(p.endDate)), parseISO(String(p.startDate))) + 1 : 7,
              order: p.order,
            })).sort((a,b) => (a.order ?? 0) - (b.order ?? 0)));
        } else {
            setPhasesState([]);
            setEventDate(new Date());
        }
    } else if (!selectedCampaignId) {
        setPhasesState([]);
    }
  }, [campaign, selectedCampaignId]);

  const timeline = useMemo(() => {
    if (!selectedCampaignId || phasesState.length === 0 || !eventDate || !isValid(eventDate)) return { calculatedPhases: [] };
    const eventPhaseIndex = phasesState.findIndex(p => p.name.toLowerCase() === 'evento');
    if (eventPhaseIndex === -1) return { calculatedPhases: [] };
  
    let currentDate = new Date(eventDate);
    const tempPhases: (Omit<InsertCampaignPhase, 'campaignId'> & { duration: number })[] = [];
  
    for (let i = eventPhaseIndex; i < phasesState.length; i++) {
      const phase = phasesState[i];
      const startDate = new Date(currentDate);
      const endDate = addDays(startDate, phase.duration - 1);
      tempPhases.push({ id: phase.id, name: phase.name, order: phase.order, startDate, endDate, duration: phase.duration });
      currentDate = addDays(endDate, 1);
    }
  
    currentDate = subDays(new Date(eventDate), 1);
    for (let i = eventPhaseIndex - 1; i >= 0; i--) {
      const phase = phasesState[i];
      const endDate = new Date(currentDate);
      const startDate = subDays(endDate, phase.duration - 1);
      tempPhases.unshift({ id: phase.id, name: phase.name, order: phase.order, startDate, endDate, duration: phase.duration });
      currentDate = subDays(startDate, 1);
    }

    return { calculatedPhases: tempPhases.sort((a,b) => (a.order ?? 0) - (b.order ?? 0)) };
  }, [phasesState, eventDate, selectedCampaignId]);

  const updateCampaignMutation = useMutation({
    mutationFn: (data: { phases: Omit<InsertCampaignPhase, 'campaignId' | 'name' | 'order'>[] }) => apiRequest('PUT', `/api/campaigns/${selectedCampaignId}`, data),
    onSuccess: () => {
      toast({ title: "Cronograma Atualizado!" });
      queryClient.invalidateQueries({ queryKey: ['campaignSchedule', selectedCampaignId] });
    },
    onError: (err: Error) => toast({ title: "Erro", description: err.message, variant: "destructive" }),
  });

  const handleSaveChanges = () => {
    if (!selectedCampaignId) return;
    updateCampaignMutation.mutate({ phases: timeline.calculatedPhases as any });
  };
  
  const handlePhaseDurationChange = (id: number, duration: number) => {
    setPhasesState(currentPhases => currentPhases.map(p => p.id === id ? { ...p, duration } : p));
  };
  
  const deleteMutation = useMutation({
    mutationFn: (taskId: number) => apiRequest('DELETE', `/api/tasks/${taskId}`),
    onSuccess: () => {
        toast({ title: "Tarefa excluída com sucesso!"});
        queryClient.invalidateQueries({ queryKey: ['campaignSchedule', selectedCampaignId] });
    },
    onError: (err: Error) => toast({ title: "Erro ao excluir", description: err.message, variant: "destructive" })
  });

  const handleDeleteTask = (taskId: number) => {
    if (window.confirm("Tem certeza que deseja excluir esta tarefa?")) {
        deleteMutation.mutate(taskId);
    }
  };

  const handleExportToPdf = async () => {
    if (!campaign || !scheduleRef.current) {
        toast({ title: 'Erro', description: 'Dados da campanha ou gráfico não estão disponíveis para exportação.', variant: 'destructive' });
        return;
    }
    setIsExporting(true);

    const doc = new jsPDF({ orientation: 'l', unit: 'mm', format: 'a4' });
    const pageHeight = doc.internal.pageSize.height;
    const pageWidth = doc.internal.pageSize.width;
    const margin = 15;
    let currentY = 0;

    try {
      const logoImg = new Image();
      logoImg.src = LogoPng;
      await new Promise(resolve => { logoImg.onload = resolve; logoImg.onerror = resolve; });
      if (logoImg.complete && logoImg.naturalHeight !== 0) {
        doc.addImage(logoImg, 'PNG', margin, 10, 30, (30 * logoImg.height) / logoImg.width);
      }
    } catch (e) {
        console.error("Não foi possível carregar o logo para o PDF", e);
    }

    doc.setFontSize(22); doc.setTextColor(40);
    doc.text(`Cronograma: ${campaign.name}`, pageWidth - margin, 25, { align: 'right' });
    currentY = 45;
    
    // Tabela de Tarefas
    const bodyData: any[] = [];
    (campaign.phases || []).sort((a,b) => a.order - b.order).forEach(phase => {
        bodyData.push([{ content: phase.name, colSpan: 5, styles: { fontStyle: 'bold', fillColor: '#e9ecef', textColor: '#495057' } }]);
        if (phase.tasks.length === 0) {
            bodyData.push([{ content: 'Nenhuma tarefa para esta fase.', colSpan: 5, styles: { halign: 'center', textColor: '#6c757d' } }]);
        } else {
            phase.tasks.forEach(task => {
                bodyData.push([
                    task.name,
                    task.description || '-',
                    getStatusBadgeConfig(task.status).label,
                    task.endDate ? format(parseISO(String(task.endDate)), 'dd/MM/yy') : '-',
                    task.assignee?.username || '-'
                ]);
            });
        }
    });

    if (currentY > pageHeight - 40) { doc.addPage(); currentY = margin; }
    
    autoTable(doc, {
      startY: currentY,
      head: [['Tarefa', 'Descrição', 'Status', 'Prazo', 'Responsável']],
      body: bodyData,
      theme: 'grid',
      headStyles: { fillColor: [30, 144, 255] },
      didDrawCell: (data) => {
        if (data.row.raw[0].colSpan === 5) { data.cell.styles.halign = 'center'; }
      },
      didDrawPage: (data) => {
          doc.setFontSize(8);
          doc.text(`Página ${data.pageNumber}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
      }
    });

    doc.save(`cronograma_${campaign.name.replace(/\s/g, '_')}.pdf`);
    setIsExporting(false);
    toast({ title: 'Exportado!', description: 'O cronograma foi exportado para PDF.' });
  };


  return (
    <div className="p-4 md:p-8 space-y-6">
      <style jsx global>{`.custom-scrollbar::-webkit-scrollbar { height: 8px; } .custom-scrollbar::-webkit-scrollbar-track { background: hsl(var(--muted)); border-radius: 10px; } .custom-scrollbar::-webkit-scrollbar-thumb { background: hsl(var(--primary) / 0.6); border-radius: 10px; } .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: hsl(var(--primary)); }`}</style>
      {modalState.isOpen && modalState.phaseId && selectedCampaignId && ( <TaskForm campaignId={parseInt(selectedCampaignId)} phaseId={modalState.phaseId} task={modalState.task} onClose={() => setModalState({ isOpen: false })} /> )}
      
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2"> <h1 className="text-3xl font-bold">Cronograma de Campanhas</h1> </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button onClick={handleExportToPdf} variant="outline" className="w-full sm:w-auto" disabled={isExporting || !selectedCampaignId}> {isExporting ? <Loader2 className="w-4 h-4 mr-2 animate-spin"/> : <Download className="w-4 h-4 mr-2" />} Exportar PDF </Button>
            <Button onClick={handleSaveChanges} className="w-full sm:w-auto" disabled={updateCampaignMutation.isPending || !selectedCampaignId}> {updateCampaignMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin"/>} Salvar Cronograma </Button>
        </div>
      </div>

       <Card>
        <CardHeader> <CardTitle>Seleção de Campanha</CardTitle> <CardDescription>Escolha uma campanha para visualizar e editar seu cronograma.</CardDescription> </CardHeader>
        <CardContent> <Select onValueChange={setSelectedCampaignId} value={selectedCampaignId || ''}> <SelectTrigger className="w-full md:w-1/2"> <SelectValue placeholder="Selecione uma campanha..." /> </SelectTrigger> <SelectContent> {isLoadingCampaigns && <div className="p-2 text-sm text-muted-foreground">Carregando...</div>} {campaigns?.map((c) => ( <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem> ))} </SelectContent> </Select> </CardContent>
       </Card>

      {isLoadingCampaignDetails && selectedCampaignId && <div className="p-8 text-center"><Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" /> Carregando detalhes...</div>}
      {error && <div className="p-8 text-center text-destructive"><BadgeAlert className="h-12 w-12 mx-auto" />{(error as Error).message}</div>}
      {!selectedCampaignId && !isLoadingCampaigns && ( <div className="flex flex-col items-center justify-center text-center p-8 border-2 border-dashed rounded-lg h-96"> <GanttChartSquare className="h-16 w-16 text-muted-foreground" /> <p className="mt-4 text-lg font-medium text-muted-foreground"> Selecione uma campanha para começar. </p> </div> )}
      
      {campaign && (
        <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <Card className="lg:col-span-1">
                <CardHeader><CardTitle>Calculadora de Fases</CardTitle><CardDescription>Ajuste a data do evento e a duração de cada fase.</CardDescription></CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2"> <Label>Data do Evento Principal</Label> <Popover><PopoverTrigger asChild><Button variant="outline" className="w-full justify-start text-left"><CalendarIcon className="mr-2 h-4 w-4" />{eventDate ? format(eventDate, 'PPP', { locale: ptBR }) : <span>Escolha a data</span>}</Button></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={eventDate} onSelect={(date) => date && setEventDate(date)} initialFocus /></PopoverContent></Popover> </div>
                    <div className="space-y-4 pt-4 max-h-[50vh] overflow-y-auto pr-2 custom-scrollbar"> {phasesState.map((phase) => ( <div key={phase.id} className="space-y-2"> <Label className="flex items-center"><div className="w-2 h-2 rounded-full mr-2" style={{backgroundColor: getPhaseColor(phase.order)}}></div>{phase.name}: {phase.duration} dias</Label> <Slider value={[phase.duration]} onValueChange={(val) => handlePhaseDurationChange(phase.id, val[0])} max={90} step={1} /> </div> ))} </div>
                </CardContent>
                </Card>
                <Card className="lg:col-span-2"> 
                  <CardHeader><CardTitle>Linha do Tempo da Campanha</CardTitle><CardDescription>Visualização de todas as tarefas da campanha.</CardDescription></CardHeader> 
                  <CardContent> 
                    <ModernGanttChart campaign={campaign} scheduleRef={scheduleRef} />
                  </CardContent> 
                </Card>
            </div>
            <Card>
                <CardHeader><CardTitle>Tarefas por Fase</CardTitle></CardHeader>
                <CardContent className="space-y-6">
                {(campaign.phases || []).sort((a,b) => (a.order ?? 0) - (b.order ?? 0)).map((phase, index) => (
                    <div key={phase.id} className="border-l-4 pl-4" style={{ borderColor: getPhaseColor(index) }}>
                        <div className="flex justify-between items-center border-b pb-2 mb-3">
                            <div> <h3 className="font-semibold text-xl">{phase.name}</h3> <p className="text-sm text-muted-foreground"> {timeline.calculatedPhases.find(p => p.id === phase.id)?.startDate ? `${format(new Date(timeline.calculatedPhases.find(p => p.id === phase.id)!.startDate!), 'dd/MM/yy')} - ${format(new Date(timeline.calculatedPhases.find(p => p.id === phase.id)!.endDate!), 'dd/MM/yy')}` : 'Datas não calculadas'} </p> </div>
                            <Button size="sm" onClick={() => setModalState({ isOpen: true, phaseId: phase.id })}><Plus className="w-4 h-4 mr-2" /> Nova Tarefa</Button>
                        </div>
                        {(phase.tasks || []).length > 0 ? (phase.tasks).map(task => { const statusConfig = getStatusBadgeConfig(task.status); return (
                            <div key={task.id} className="flex items-center justify-between p-3 rounded-md hover:bg-muted/50">
                                <div><p className="font-medium">{task.name}</p><p className="text-sm text-muted-foreground">{task.description}</p></div>
                                <div className="flex items-center gap-4">
                                    <Badge variant="outline" className={cn("text-xs", statusConfig.className)}>{statusConfig.label}</Badge>
                                    <span className="text-sm text-muted-foreground">{task.assignee?.username || 'Não atribuído'}</span>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="w-8 h-8"><MoreVertical className="w-4 h-4" /></Button></DropdownMenuTrigger>
                                        <DropdownMenuContent>
                                            <DropdownMenuItem onClick={() => setModalState({ isOpen: true, phaseId: phase.id, task: task })}><Edit className="w-4 h-4 mr-2" />Editar</DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => handleDeleteTask(task.id)} className="text-destructive"><Trash2 className="w-4 h-4 mr-2" />Excluir</DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                            </div>
                        );}) : <p className="text-sm text-center py-4 text-muted-foreground italic">Nenhuma tarefa para esta fase.</p>}
                    </div>
                ))}
                </CardContent>
            </Card>
        </div>
      )}
    </div>
  );
}
