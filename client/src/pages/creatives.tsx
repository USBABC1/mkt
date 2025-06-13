// client/src/pages/creatives.tsx
import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/api';
import { Creative as CreativeType, Campaign as CampaignType } from '@shared/schema';
import UploadModal from '@/components/upload-modal';
import {
  Image as ImageIcon,
  Video,
  FileText,
  AlertTriangle,
  Loader2,
  Plus,
  Edit,
  Trash2,
  Search,
  Filter as FilterIcon,
} from 'lucide-react';


export default function Creatives() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCreative, setEditingCreative] = useState<CreativeType | undefined>(undefined);
  const [searchTerm, setSearchTerm] = useState('');
  const [campaignFilter, setCampaignFilter] = useState('all');

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: campaigns = [] } = useQuery<CampaignType[]>({
    queryKey: ['campaignsForCreativeFilter'],
    queryFn: async () => apiRequest('GET', '/api/campaigns').then(res => res.json())
  });

  const { data: savedCreatives = [], isLoading, error } = useQuery<CreativeType[]>({
    queryKey: ['creatives', campaignFilter],
    queryFn: async () => {
      const endpoint = campaignFilter === 'all'
        ? '/api/creatives'
        : `/api/creatives?campaignId=${campaignFilter}`;
      return apiRequest('GET', endpoint).then(res => res.json());
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest('DELETE', `/api/creatives/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['creatives'] });
      toast({ title: 'Criativo excluído com sucesso.' });
    },
    onError: (err: Error) => toast({ title: 'Erro ao excluir', description: err.message, variant: 'destructive' })
  });

  const getCreativeTypeIcon = (type?: string) => {
    switch (type) {
      case 'image': return <ImageIcon className="w-5 h-5 text-blue-400" />;
      case 'video': return <Video className="w-5 h-5 text-red-400" />;
      case 'text': return <FileText className="w-5 h-5 text-green-400" />;
      default: return <ImageIcon className="w-5 h-5 text-gray-400" />;
    }
  };

  const filteredSavedCreatives = useMemo(() => {
    if (!searchTerm) return savedCreatives;
    return savedCreatives.filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [savedCreatives, searchTerm]);

  const placeholderSvg = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='1' stroke-linecap='round' stroke-linejoin='round' class='lucide lucide-image-off'%3E%3Cpath d='M21.12 5.54a2.35 2.35 0 0 0-1.09-1.09l-2.02-1.01A2.35 2.35 0 0 0 16.5 2H6a2 2 0 0 0-2 2v13.5a2.35 2.35 0 0 0 .54 1.51l2.02 1.01A2.35 2.35 0 0 0 8 22h9.5a2.35 2.35 0 0 0 1.51-.54l2.02-1.01A2.35 2.35 0 0 0 22 18.94V8a2.35 2.35 0 0 0-.54-1.51l-2.02-1.01A2.35 2.35 0 0 0 17 5Z'/%3E%3Cpath d='m2 2 20 20'/%3E%3Ccircle cx='9' cy='9' r='2'/%3E%3Cpath d='m21 15-3.06-3.06a2 2 0 0 0-2.82 0L6 21'/%3E%3C/svg%3E";

  return (
    <div className="p-4 md:p-8 space-y-6">
      {isModalOpen && (
        <UploadModal 
          initialData={editingCreative} 
          onClose={() => {
            setIsModalOpen(false);
            setEditingCreative(undefined);
          }} 
          onSuccess={() => {
            setIsModalOpen(false);
            setEditingCreative(undefined);
            queryClient.invalidateQueries({ queryKey: ['creatives'] });
          }}
        />
      )}

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">Gerenciador de Criativos</h1>
          <p className="text-muted-foreground mt-1 md:mt-2">Adicione, edite e organize os criativos de suas campanhas.</p>
        </div>
        <Button onClick={() => { setEditingCreative(undefined); setIsModalOpen(true); }} className="w-full sm:w-auto neu-button-primary">
          <Plus className="w-4 h-4 mr-2" /> Novo Criativo
        </Button>
      </div>

      <Card className="neu-card">
        <CardContent className="p-4 flex flex-col md:flex-row gap-3">
            <div className="relative flex-grow">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input placeholder="Buscar por nome..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="neu-input pl-10 w-full" />
            </div>
            <Select value={campaignFilter} onValueChange={setCampaignFilter}>
                <SelectTrigger className="neu-input w-full md:w-[240px]"><FilterIcon className="w-4 h-4 mr-2 text-muted-foreground" /><SelectValue placeholder="Filtrar por Campanha" /></SelectTrigger>
                <SelectContent className="neu-card"><SelectItem value="all">Todas as Campanhas</SelectItem><SelectItem value="none">Sem Campanha</SelectItem>{campaigns.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}</SelectContent>
            </Select>
        </CardContent>
      </Card>
      
      {isLoading ? <div className="text-center py-10"><Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" /></div>
      : error ? <Card className="border-destructive bg-destructive/10"><CardContent className="p-4 text-destructive-foreground flex items-center"><AlertTriangle className="w-5 h-5 mr-2" /><p>{error.message}</p></CardContent></Card>
      : (
        filteredSavedCreatives.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredSavedCreatives.map((creative) => (
              <Card key={creative.id} className="creative-card flex flex-col overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300 dark:bg-card">
                <div className="aspect-[16/10] bg-muted/30 relative overflow-hidden group">
                  {creative.type !== 'text' ? (<img src={creative.thumbnailUrl || creative.fileUrl || placeholderSvg} alt={creative.name} className="w-full h-full object-cover" onError={(e) => (e.currentTarget.src = placeholderSvg)} />)
                  : (<div className="w-full h-full p-4 flex items-center justify-center text-center text-muted-foreground bg-muted/50"><FileText className="w-12 h-12" /></div>)}
                </div>
                <CardContent className="p-3 flex-grow flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between">
                      <Badge variant="outline" className="text-xs">{creative.type}</Badge>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => {setEditingCreative(creative); setIsModalOpen(true);}}><Edit className="w-3.5 h-3.5"/></Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteMutation.mutate(creative.id)}><Trash2 className="w-3.5 h-3.5"/></Button>
                      </div>
                    </div>
                    <h3 className="font-semibold text-sm text-foreground line-clamp-2 leading-tight mt-1" title={creative.name}>{creative.name}</h3>
                    {creative.type === 'text' && <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{creative.content}</p>}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (<Card><CardContent className="p-12 text-center"><div className="space-y-4"><ImageIcon className="w-16 h-16 text-muted-foreground mx-auto opacity-50" /><div><h3 className="text-lg font-semibold">Nenhum criativo encontrado</h3><p className="text-muted-foreground">Crie um novo criativo ou ajuste seus filtros de busca.</p></div></div></CardContent></Card>)
      )}
    </div>
  );
}
