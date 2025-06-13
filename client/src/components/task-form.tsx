import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/api';
import { CampaignTask, InsertCampaignTask, User, taskStatusEnum } from '@shared/schema';
import { Loader2, CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

const formSchema = z.object({
  name: z.string().min(1, "O nome da tarefa é obrigatório."),
  description: z.string().optional(),
  status: z.enum(taskStatusEnum.enumValues),
  startDate: z.date().optional().nullable(),
  endDate: z.date().optional().nullable(),
  assigneeId: z.preprocess(val => (val ? Number(val) : null), z.number().nullable().optional()),
  phaseId: z.number(),
});

type TaskFormData = z.infer<typeof formSchema>;

interface TaskFormProps {
  campaignId: number;
  phaseId: number;
  task?: CampaignTask;
  onClose: () => void;
}

export default function TaskForm({ campaignId, phaseId, task, onClose }: TaskFormProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ['users'],
    queryFn: () => apiRequest('GET', '/api/users').then(res => res.json()),
  });

  const form = useForm<TaskFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: task?.name || '',
      description: task?.description || '',
      status: task?.status || 'pending',
      startDate: task?.startDate ? new Date(task.startDate) : undefined,
      endDate: task?.endDate ? new Date(task.endDate) : undefined,
      assigneeId: task?.assigneeId || null,
      phaseId: phaseId,
    },
  });

  const mutation = useMutation({
    mutationFn: (data: InsertCampaignTask) => {
      const url = task ? `/api/tasks/${task.id}` : `/api/campaigns/${campaignId}/tasks`;
      const method = task ? 'PUT' : 'POST';
      return apiRequest(method, url, data);
    },
    onSuccess: async (response) => {
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Falha ao ${task ? 'atualizar' : 'criar'} tarefa`);
      }
      toast({ title: `Tarefa ${task ? 'atualizada' : 'criada'} com sucesso!` });
      queryClient.invalidateQueries({ queryKey: ['campaignSchedule', String(campaignId)] });
      onClose();
    },
    onError: (error: Error) => {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    },
  });

  function onSubmit(data: TaskFormData) {
    mutation.mutate(data);
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{task ? 'Editar Tarefa' : 'Nova Tarefa'}</DialogTitle>
          <DialogDescription>
            {task ? 'Modifique os detalhes da tarefa.' : 'Preencha os campos para adicionar uma nova tarefa à fase.'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" autoComplete="off">
            <FormField control={form.control} name="name" render={({ field }) => (
              <FormItem><FormLabel htmlFor="taskName">Nome da Tarefa</FormLabel><FormControl><Input id="taskName" {...field} /></FormControl><FormMessage /></FormItem>
            )}/>
            <FormField control={form.control} name="description" render={({ field }) => (
              <FormItem><FormLabel htmlFor="taskDescription">Descrição</FormLabel><FormControl><Textarea id="taskDescription" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
            )}/>
             <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="startDate" render={({ field }) => (
                <FormItem className="flex flex-col"><FormLabel>Data de Início</FormLabel><Popover><PopoverTrigger asChild>
                    <FormControl><Button variant="outline" className={cn("font-normal", !field.value && "text-muted-foreground")}>{field.value ? format(field.value, 'PPP', {locale: ptBR}) : <span>Escolha uma data</span>}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></FormControl>
                </PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value ?? undefined} onSelect={field.onChange} initialFocus /></PopoverContent></Popover><FormMessage /></FormItem>
              )}/>
              <FormField control={form.control} name="endDate" render={({ field }) => (
                <FormItem className="flex flex-col"><FormLabel>Data de Fim</FormLabel><Popover><PopoverTrigger asChild>
                    <FormControl><Button variant="outline" className={cn("font-normal", !field.value && "text-muted-foreground")}>{field.value ? format(field.value, 'PPP', {locale: ptBR}) : <span>Escolha uma data</span>}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></FormControl>
                </PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value ?? undefined} onSelect={field.onChange} disabled={(date) => form.getValues("startDate") ? date < form.getValues("startDate")! : false} initialFocus /></PopoverContent></Popover><FormMessage /></FormItem>
              )}/>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="status" render={({ field }) => (
                <FormItem><FormLabel>Status</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl><SelectTrigger id="taskStatus"><SelectValue /></SelectTrigger></FormControl>
                  <SelectContent>{taskStatusEnum.enumValues.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select><FormMessage /></FormItem>
              )}/>
              <FormField control={form.control} name="assigneeId" render={({ field }) => (
                <FormItem><FormLabel>Atribuir a</FormLabel><Select onValueChange={(value) => field.onChange(value === "NONE" ? null : Number(value))} value={field.value ? String(field.value) : "NONE"}>
                  <FormControl><SelectTrigger id="taskAssignee"><SelectValue placeholder="Ninguém" /></SelectTrigger></FormControl>
                  <SelectContent>
                    <SelectItem value="NONE">Ninguém</SelectItem>
                    {users.map(u => <SelectItem key={u.id} value={String(u.id)}>{u.username}</SelectItem>)}
                  </SelectContent>
                </Select><FormMessage /></FormItem>
              )}/>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose} disabled={mutation.isPending}>Cancelar</Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {task ? 'Salvar Alterações' : 'Criar Tarefa'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
