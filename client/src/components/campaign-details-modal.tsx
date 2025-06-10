// client/src/components/campaign-details-modal.tsx
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Campaign as CampaignType } from "@shared/schema";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { X, CalendarDays, Target, Tag, Users, DollarSign, BarChart3, Info } from "lucide-react";
import { cn } from "@/lib/utils";

interface CampaignDetailsModalProps {
  campaign: CampaignType | null;
  isOpen: boolean;
  onClose: () => void;
}

const DetailItem: React.FC<{ label: string; value?: string | number | null; icon?: React.ElementType; children?: React.ReactNode }> = ({
  label,
  value,
  icon: Icon,
  children,
}) => (
  <div className="py-3 sm:grid sm:grid-cols-3 sm:gap-4">
    <dt className="text-sm font-medium text-muted-foreground flex items-center">
      {Icon && <Icon className="w-4 h-4 mr-2 text-primary" />}
      {label}
    </dt>
    <dd className="mt-1 text-sm text-foreground sm:mt-0 sm:col-span-2">
      {children || value || <span className="italic">Não informado</span>}
    </dd>
  </div>
);

export default function CampaignDetailsModal({ campaign, isOpen, onClose }: CampaignDetailsModalProps) {
  if (!campaign) return null;

  const formatDate = (dateString?: string | Date | null) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("pt-BR", {
      day: '2-digit', month: '2-digit', year: 'numeric'
    });
  };

  const formatCurrency = (value?: string | number | null) => {
    if (value === null || value === undefined || value === "") return "N/A";
    return `R$ ${parseFloat(String(value)).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };
  
  const getPlatformBadgeConfig = (platform: string) => {
    const platformConfig = {
      facebook: { className: 'bg-blue-600/20 text-blue-400 border-blue-600/30', label: 'Facebook' },
      google_ads: { className: 'bg-red-500/20 text-red-400 border-red-500/30', label: 'Google Ads' },
      instagram: { className: 'bg-pink-500/20 text-pink-400 border-pink-500/30', label: 'Instagram' },
      linkedin: { className: 'bg-sky-700/20 text-sky-400 border-sky-700/30', label: 'LinkedIn' },
      tiktok: { className: 'bg-purple-500/20 text-purple-400 border-purple-500/30', label: 'TikTok' },
    };
    return platformConfig[platform as keyof typeof platformConfig] || { className: 'bg-gray-400/20 text-gray-300 border-gray-400/30', label: platform };
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="neu-card sm:max-w-2xl max-h-[90vh] p-0 flex flex-col">
        <DialogHeader className="p-6 pb-4 border-b border-border">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-2xl font-semibold text-foreground">{campaign.name}</DialogTitle>
            <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full neu-button">
              <X className="w-5 h-5" />
            </Button>
          </div>
          {campaign.description && (
            <DialogDescription className="mt-1 text-sm text-muted-foreground">
              {campaign.description}
            </DialogDescription>
          )}
        </DialogHeader>

        <ScrollArea className="flex-grow">
          <div className="px-6 py-4 space-y-4">
            <dl className="divide-y divide-border">
              <DetailItem label="Status" icon={Tag}>
                <Badge 
                  className={cn(
                    "text-xs",
                    campaign.status === "active" && "bg-green-500/20 text-green-400 border-green-500/30",
                    campaign.status === "paused" && "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
                    campaign.status === "completed" && "bg-blue-500/20 text-blue-400 border-blue-500/30",
                    campaign.status === "draft" && "bg-gray-500/20 text-gray-400 border-gray-500/30"
                  )}
                >
                  {campaign.status.charAt(0).toUpperCase() + campaign.status.slice(1)}
                </Badge>
              </DetailItem>

              <DetailItem label="Plataformas" icon={BarChart3}>
                <div className="flex flex-wrap gap-1.5">
                  {campaign.platforms && campaign.platforms.length > 0 ? (
                    campaign.platforms.map(platform => {
                      const config = getPlatformBadgeConfig(platform);
                      return <Badge key={platform} className={cn("text-[0.7rem]", config.className)}>{config.label}</Badge>;
                    })
                  ) : (
                    <span className="italic">Não informado</span>
                  )}
                </div>
              </DetailItem>

              {campaign.objectives && campaign.objectives.length > 0 && (
                <DetailItem label="Objetivos" icon={Target}>
                  <div className="flex flex-wrap gap-1.5">
                    {campaign.objectives.map(obj => <Badge key={obj} variant="outline" className="text-xs">{obj}</Badge>)}
                  </div>
                </DetailItem>
              )}

              <Separator className="my-3" />

              <DetailItem label="Orçamento Total" value={formatCurrency(campaign.budget)} icon={DollarSign} />
              <DetailItem label="Orçamento Diário" value={formatCurrency(campaign.dailyBudget)} icon={DollarSign} />
              <DetailItem label="Ticket Médio" value={formatCurrency(campaign.avgTicket)} icon={Info} />
              
              <Separator className="my-3" />

              <DetailItem label="Data de Início" value={formatDate(campaign.startDate)} icon={CalendarDays} />
              <DetailItem label="Data de Fim" value={formatDate(campaign.endDate)} icon={CalendarDays} />
              
              <Separator className="my-3" />
              
              <DetailItem label="Público-Alvo" value={campaign.targetAudience} icon={Users} />
              <DetailItem label="Setor/Indústria" value={campaign.industry} icon={Tag} />
              
              <Separator className="my-3" />

              <DetailItem label="Criada em" value={formatDate(campaign.createdAt)} />
              <DetailItem label="Última Atualização" value={formatDate(campaign.updatedAt)} />
            </dl>
          </div>
        </ScrollArea>

        <DialogFooter className="p-4 border-t border-border">
          <Button onClick={onClose} className="neu-button">Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
