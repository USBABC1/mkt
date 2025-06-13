// client/src/components/upload-modal.tsx
import { useState, useEffect, useRef, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, uploadFile } from '@/lib/api';
import { insertCreativeSchema as baseCreativeSchema, Campaign as CampaignType, Creative as CreativeType } from '@shared/schema';
import { X, Loader2, Upload, FileImage, FileVideo, FileTextIcon as FileText, AlertCircle, FolderSearch, Link as LinkIcon, Save } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card } from '@/components/ui/card'; // ✅ CORREÇÃO APLICADA AQUI

const creativeSchema = baseCreativeSchema.extend({
  id: z.number().optional(),
}).refine(data => {
  if (data.type === 'text' && !data.content?.trim()) {
    return false;
  }
  return true;
}, {
  message: "Conteúdo é obrigatório para criativos de texto.",
  path: ["content"],
});

interface CreativeFormData {
  id?: number;
  name: string;
  type: 'image' | 'video' | 'text' | 'carousel';
  campaignId?: number | null;
  content?: string;
  platforms?: string[];
  fileUrl?: string | null;
}

interface Campaign {
  id: number;
  name: string;
}

interface GoogleDriveFile {
  id: string;
  name: string;
  thumbnailLink?: string;
  webViewLink?: string;
  iconLink?: string;
  webContentLink?: string;
}

interface UploadModalProps {
  onClose: () => void;
  onSuccess: (data: any) => void;
  onError?: (errorMessage: string) => void;
  initialData?: CreativeType;
}

const platformOptions = [
  { value: 'facebook', label: 'Facebook' },
  { value: 'google_ads', label: 'Google Ads' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'tiktok', label: 'TikTok' },
];

const placeholderSvg = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='1' stroke-linecap='round' stroke-linejoin='round' class='lucide lucide-image-off'%3E%3Cpath d='M21.12 5.54a2.35 2.35 0 0 0-1.09-1.09l-2.02-1.01A2.35 2.35 0 0 0 16.5 2H6a2 2 0 0 0-2 2v13.5a2.35 2.35 0 0 0 .54 1.51l2.02 1.01A2.35 2.35 0 0 0 8 22h9.5a2.35 2.35 0 0 0 1.51-.54l2.02-1.01A2.35 2.35 0 0 0 22 18.94V8a2.35 2.35 0 0 0-.54-1.51l-2.02-1.01A2.35 2.35 0 0 0 17 5Z'/%3E%3Cpath d='m2 2 20 20'/%3E%3Ccircle cx='9' cy='9' r='2'/%3E%3Cpath d='m21 15-3.06-3.06a2 2 0 0 0-2.82 0L6 21'/%3E%3C/svg%3E";


export default function UploadModal({ onClose, onSuccess, onError, initialData }: UploadModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(initialData?.fileUrl || null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Estados para a funcionalidade do Google Drive
  const [folderUrl, setFolderUrl] = useState('');
  const [folderId, setFolderId] = useState<string | null>(null);
  const [selectedDriveFiles, setSelectedDriveFiles] = useState<GoogleDriveFile[]>([]);
  const [importCampaignId, setImportCampaignId] = useState<string>('');

  const isEditing = !!initialData?.id;

  const form = useForm<CreativeFormData>({
    resolver: zodResolver(creativeSchema),
    defaultValues: {
      id: initialData?.id,
      name: initialData?.name || '',
      type: initialData?.type || 'image',
      campaignId: initialData?.campaignId === undefined ? null : initialData.campaignId,
      content: initialData?.content || '',
      platforms: initialData?.platforms || [],
      fileUrl: initialData?.fileUrl || null,
    },
  });

  useEffect(() => {
    const currentType = form.watch('type');
    if (selectedFile) {
      const objectUrl = URL.createObjectURL(selectedFile);
      setPreviewUrl(objectUrl);
      return () => URL.revokeObjectURL(objectUrl);
    } else if (initialData?.fileUrl && currentType !== 'text') {
      setPreviewUrl(initialData.fileUrl);
    } else {
      setPreviewUrl(null);
    }
  }, [selectedFile, form.watch('type'), initialData?.fileUrl]);

  const { data: campaigns = [], isLoading: isLoadingCampaigns } = useQuery<Campaign[], Error>({
    queryKey: ['campaignsForSelect'],
    queryFn: async () => apiRequest('GET', '/api/campaigns').then(res => res.json()),
  });

  const { data: driveFiles = [], isLoading: isLoadingDrive, error: driveError, refetch: refetchDrive } = useQuery<GoogleDriveFile[], Error>({
    queryKey: ['googleDriveFiles', folderId],
    queryFn: () => apiRequest('GET', `/api/creatives/from-drive/${folderId}`).then(res => res.json()),
    enabled: !!folderId,
  });

  const importMutation = useMutation({
    mutationFn: (data: { campaignId: string; files: GoogleDriveFile[] }) =>
      apiRequest('POST', '/api/creatives/import-from-drive', data),
    onSuccess: (data: any) => {
      toast({ title: 'Importação Concluída!', description: data.message });
      queryClient.invalidateQueries({ queryKey: ['creatives'] });
      setSelectedDriveFiles([]);
      onSuccess(data);
    },
    onError: (err: Error) => toast({ title: 'Erro na Importação', description: err.message, variant: 'destructive' })
  });

  const mutation = useMutation<any, Error, CreativeFormData>({
    mutationFn: async (data: CreativeFormData) => {
      const apiPath = isEditing ? `/api/creatives/${data.id}` : '/api/creatives';
      const httpMethod = isEditing ? 'PUT' : 'POST';

      const formData = new FormData();
      if (selectedFile) {
        formData.append('file', selectedFile);
      }
      
      // Adiciona outros campos ao FormData
      Object.entries(data).forEach(([key, value]) => {
        if (key !== 'file' && value !== null && value !== undefined) {
          if (key === 'platforms' && Array.isArray(value)) {
             formData.append(key, JSON.stringify(value));
          } else {
            formData.append(key, String(value));
          }
        }
      });
      
      return await apiRequest(httpMethod, apiPath, formData, true);
    },
    onSuccess: (responseData) => {
      toast({ title: 'Sucesso!', description: `O criativo foi ${isEditing ? 'atualizado' : 'salvo'} com sucesso.` });
      queryClient.invalidateQueries({ queryKey: ['creatives'] });
      onSuccess(responseData);
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao Salvar', description: error.message, variant: 'destructive' });
      if (onError) onError(error.message);
    },
  });


  const onSubmit = (data: CreativeFormData) => {
    const isFileBased = data.type === 'image' || data.type === 'video' || data.type === 'carousel';
    if (isFileBased && !isEditing && !selectedFile) {
      form.setError('fileUrl', { type: 'custom', message: 'É necessário um arquivo para este tipo de criativo.' });
      return;
    }
    mutation.mutate(data);
  };
  
  const handleFetchDriveClick = () => {
    const extractedId = folderUrl.match(/folders\/([a-zA-Z0-9_-]{28,})/);
    if (extractedId?.[1]) {
        setFolderId(extractedId[1]);
    } else {
        toast({ title: "URL Inválida", description: "Insira uma URL válida de uma pasta do Google Drive.", variant: "destructive" });
    }
  };

  const handleDriveFileSelect = (file: GoogleDriveFile, isSelected: boolean) => {
    setSelectedDriveFiles(prev => isSelected ? [...prev, file] : prev.filter(f => f.id !== file.id));
  };

  const handleImportClick = () => {
    if (selectedDriveFiles.length === 0 || !importCampaignId) {
        toast({ title: 'Seleção Incompleta', description: 'Selecione pelo menos um criativo e uma campanha de destino.', variant: 'destructive' });
        return;
    }
    importMutation.mutate({ campaignId: importCampaignId, files: selectedDriveFiles });
  };
  
  const handleFileChange = (file: File | null) => {
    setSelectedFile(file);
    if (file) {
      const currentType = form.getValues('type');
      if (file.type.startsWith('image/')) {
        if(currentType !== 'image' && currentType !== 'carousel') form.setValue('type', 'image');
      } else if (file.type.startsWith('video/')) {
        if(currentType !== 'video') form.setValue('type', 'video');
      }
      if (!form.getValues('name')) {
        form.setValue('name', file.name.substring(0, file.name.lastIndexOf('.')) || file.name);
      }
    } else if (isEditing) {
      form.setValue('fileUrl', initialData?.fileUrl || null);
    }
  };

  const handleDrag = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true); else if (e.type === 'dragleave') setDragActive(false); };
  const handleDrop = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setDragActive(false); if (e.dataTransfer.files && e.dataTransfer.files[0]) handleFileChange(e.dataTransfer.files[0]); };
  const getFileIcon = (type: string | undefined, hasFile: boolean) => { if (!hasFile) return <Upload className="w-10 h-10 text-muted-foreground"/>; switch(type) { case 'image': return <FileImage className="w-10 h-10 text-primary" />; case 'video': return <FileVideo className="w-10 h-10 text-primary" />; case 'text': return <FileText className="w-10 h-10 text-primary" />; case 'carousel': return <FileImage className="w-10 h-10 text-primary" />; default: return <Upload className="w-10 h-10 text-muted-foreground"/>; }};

  const watchedType = form.watch('type');

  return (
    <Dialog open onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}>
      <DialogContent className="max-w-4xl max-h-[95vh] flex flex-col">
        <DialogHeader className="flex-shrink-0 p-6 pb-4">
            <div className="flex items-center justify-between">
                <DialogTitle className="text-2xl font-semibold">{isEditing ? 'Editar Criativo' : 'Adicionar Criativo'}</DialogTitle>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}><X className="w-5 h-5" /></Button>
            </div>
            <DialogDescription>{isEditing ? `Modificando criativo "${initialData?.name}"` : 'Adicione um novo criativo por upload ou importe do Google Drive.'}</DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="upload" className="flex-grow flex flex-col min-h-0">
          <TabsList className="grid w-full grid-cols-2 mx-6 mt-0">
            <TabsTrigger value="upload">Upload do Computador</TabsTrigger>
            <TabsTrigger value="gdrive">Importar do Google Drive</TabsTrigger>
          </TabsList>
          
          <TabsContent value="upload" className="flex-grow overflow-y-auto px-6 pb-6 custom-scrollbar">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5 mt-4">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField control={form.control} name="name" render={({ field }) => ( <FormItem> <FormLabel>Nome *</FormLabel> <FormControl><Input placeholder="Ex: Banner V1" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                    <FormField control={form.control} name="type" render={({ field }) => ( <FormItem> <FormLabel>Tipo *</FormLabel> <Select value={field.value} onValueChange={(value: any) => { field.onChange(value); if (value === 'text') { setSelectedFile(null); form.setValue('fileUrl', null); } }} > <FormControl><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger></FormControl> <SelectContent> <SelectItem value="image">Imagem</SelectItem> <SelectItem value="video">Vídeo</SelectItem> <SelectItem value="text">Texto/Copy</SelectItem> <SelectItem value="carousel">Carrossel</SelectItem> </SelectContent> </Select> <FormMessage /> </FormItem> )} />
                 </div>
                 <FormField control={form.control} name="campaignId" render={({ field }) => ( <FormItem> <FormLabel>Campanha (Opcional)</FormLabel> <Select value={field.value === null || field.value === undefined ? "NONE" : String(field.value)} onValueChange={(value) => field.onChange(value === "NONE" ? null : parseInt(value))} > <FormControl><SelectTrigger disabled={isLoadingCampaigns}><SelectValue placeholder={isLoadingCampaigns ? "Carregando..." : "Nenhuma"} /></SelectTrigger></FormControl> <SelectContent> <SelectItem value="NONE">Nenhuma campanha</SelectItem> {campaigns.map((c: Campaign) => (<SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>))} </SelectContent> </Select> <FormMessage /> </FormItem> )} />
                 <div> <FormLabel>Plataformas</FormLabel> <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-2 p-3 border rounded-md"> {platformOptions.map(p => (<FormField key={p.value} control={form.control} name="platforms" render={({ field }) => (<FormItem className="flex flex-row items-start space-x-3 space-y-0"><FormControl><Checkbox checked={field.value?.includes(p.value)} onCheckedChange={(checked) => {return checked ? field.onChange([...(field.value || []), p.value]) : field.onChange((field.value || []).filter(v => v !== p.value));}} /></FormControl><FormLabel className="text-sm font-normal">{p.label}</FormLabel></FormItem>)} />))} </div> <FormMessage /></div>
                 {watchedType === 'text' && ( <FormField control={form.control} name="content" render={({ field }) => ( <FormItem> <FormLabel>Conteúdo *</FormLabel> <FormControl><Textarea placeholder="Seu texto..." rows={5} {...field} /></FormControl> <FormMessage /> </FormItem> )} /> )}
                 {(watchedType === 'image' || watchedType === 'video' || watchedType === 'carousel') && (
                 <div>
                    <FormLabel>Arquivo {isEditing ? '(Opcional: selecione para substituir)' : '*'}</FormLabel>
                    <div className={`mt-1 border-2 border-dashed rounded-lg p-6 text-center cursor-pointer ${dragActive ? 'border-primary bg-primary/10' : 'border-border'}`} onClick={() => fileInputRef.current?.click()} onDragEnter={handleDrag} onDragLeave={handleDrag} onDragOver={handleDrag} onDrop={handleDrop}>
                      <input ref={fileInputRef} type="file" className="hidden" onChange={(e) => handleFileChange(e.target.files?.[0] || null)} accept={ watchedType === 'image' || watchedType === 'carousel' ? 'image/*' : 'video/*' }/>
                      <div className="flex flex-col items-center justify-center space-y-2 min-h-[100px]">
                        {previewUrl && watchedType !== 'text' ? ( <img src={previewUrl} alt="Preview" className="max-h-24 rounded-md"/>) : getFileIcon(watchedType, !!selectedFile || !!form.getValues('fileUrl'))}
                        {selectedFile ? ( <p className="font-medium text-sm">{selectedFile.name}</p>) : ( <p className="text-sm">Arraste ou <span className="font-semibold text-primary">clique para selecionar</span></p> )}
                      </div>
                    </div>
                    {isEditing && form.getValues('fileUrl') && !selectedFile && (
                        <Button type="button" variant="link" size="sm" className="text-red-500 hover:text-red-600 px-0 h-auto mt-1" onClick={() => { form.setValue('fileUrl', null); setPreviewUrl(null); toast({ title: 'Arquivo existente será removido ao salvar.'}) }}>
                            <X className="w-3 h-3 mr-1" /> Remover arquivo atual
                        </Button>
                    )}
                    <FormField control={form.control} name="fileUrl" render={() => <FormMessage />} />
                 </div>
                 )}
                {form.formState.errors.root?.serverError && (<div className="text-sm text-destructive p-2 bg-destructive/10 rounded-md flex items-center"><AlertCircle className="w-4 h-4 mr-2" />{form.formState.errors.root.serverError.message}</div>)}
                <DialogFooter className="flex-shrink-0 pt-4">
                  <Button type="button" variant="outline" onClick={onClose} disabled={mutation.isPending}>Cancelar</Button>
                  <Button type="submit" disabled={mutation.isPending}><>{mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} {isEditing ? 'Salvar Alterações' : 'Adicionar Criativo'}</></Button>
                </DialogFooter>
              </form>
            </Form>
          </TabsContent>

          <TabsContent value="gdrive" className="flex-grow flex flex-col overflow-hidden px-6 pb-6">
            <div className="flex flex-col sm:flex-row items-end gap-3 mt-4 flex-shrink-0">
                <div className="w-full flex-grow">
                    <Label htmlFor="gdrive-url-modal">URL da Pasta Pública do Google Drive</Label>
                    <div className="flex items-center gap-2 mt-1">
                        <LinkIcon className="text-muted-foreground flex-shrink-0" size={18}/>
                        <Input id="gdrive-url-modal" placeholder="Cole o link da pasta aqui..." value={folderUrl} onChange={(e) => setFolderUrl(e.target.value)} />
                    </div>
                </div>
                <Button onClick={handleFetchDriveClick} disabled={isLoadingDrive} className="w-full sm:w-auto flex-shrink-0">
                    {isLoadingDrive ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <FolderSearch className="w-4 h-4 mr-2" />} Buscar
                </Button>
            </div>

            <div className="flex-grow overflow-y-auto mt-4 custom-scrollbar -mx-6 px-6">
                {isLoadingDrive && <div className="text-center py-6"><Loader2 className="h-6 w-6 animate-spin text-primary mx-auto" /></div>}
                {driveError && <div className="mt-4 text-sm text-destructive flex items-center gap-2"><AlertCircle size={16}/> {driveError.message}</div>}
                {!isLoadingDrive && !driveError && driveFiles.length > 0 && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                        {driveFiles.map((file) => (
                            <Card key={file.id} className={`relative overflow-hidden cursor-pointer transition-all border-2 ${selectedDriveFiles.some(f => f.id === file.id) ? 'border-primary' : 'border-transparent'}`} onClick={() => handleDriveFileSelect(file, !selectedDriveFiles.some(f => f.id === file.id))}>
                                <Checkbox checked={selectedDriveFiles.some(f => f.id === file.id)} className="absolute top-2 right-2 z-10 bg-background/50"/>
                                <img src={file.thumbnailLink?.replace('=s220', '=s400') || placeholderSvg} alt={file.name} className="w-full h-24 object-cover bg-muted"/>
                                <p className="p-2 truncate text-xs font-medium bg-card" title={file.name}>{file.name}</p>
                            </Card>
                        ))}
                    </div>
                )}
                 {!isLoadingDrive && !driveError && folderId && driveFiles.length === 0 && (
                    <div className="text-center py-6 text-muted-foreground">Nenhum arquivo encontrado nesta pasta do Drive.</div>
                 )}
            </div>

            <div className="mt-4 pt-4 border-t flex flex-col md:flex-row items-center gap-4 flex-shrink-0">
                <p className="text-sm font-medium flex-shrink-0">{selectedDriveFiles.length} criativo(s) selecionado(s)</p>
                <Select value={importCampaignId} onValueChange={setImportCampaignId}><SelectTrigger className="w-full md:w-[250px]"><SelectValue placeholder="Selecione uma campanha para importar..." /></SelectTrigger>
                    <SelectContent>{campaigns.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
                <Button onClick={handleImportClick} disabled={importMutation.isPending || selectedDriveFiles.length === 0 || !importCampaignId} className="w-full md:w-auto">
                    {importMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin"/> : <Save className="w-4 h-4 mr-2"/>}
                    Importar Selecionados
                </Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
