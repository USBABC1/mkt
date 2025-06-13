import React, { useMemo } from 'react';
import { Layout, Program, Channel, usePlanby } from '@planby/react';
import { FullCampaignData } from '@shared/schema';
import { parseISO, subDays, addDays, isValid } from 'date-fns';
import { usePlanbyTheme } from '@/hooks/usePlanbyTheme';

interface PlanbyScheduleProps {
    campaign: FullCampaignData;
    containerRef: React.RefObject<HTMLDivElement>;
}

const getAvatarUrl = (assigneeName?: string | null) => {
    if (!assigneeName) return '';
    const initials = assigneeName.split(' ').map(n => n[0]).join('').toUpperCase();
    return `https://ui-avatars.com/api/?name=${initials}&background=2563eb&color=fff&size=32&font-size=0.45&bold=true`;
};

export function PlanbySchedule({ campaign, containerRef }: PlanbyScheduleProps) {
    const theme = usePlanbyTheme();

    const channels = useMemo(() => {
        return (campaign.phases || [])
            .sort((a,b) => a.order - b.order)
            .map(phase => ({
                uuid: String(phase.id),
                logo: `https://ui-avatars.com/api/?name=${phase.name.substring(0, 1)}&background=18181b&color=a1a1aa&size=48&font-size=0.5&bold=true`,
                position: { top: 0 },
                title: phase.name,
            }));
    }, [campaign.phases]);

    const epg = useMemo(() => {
        return (campaign.phases || [])
            .flatMap(phase => 
                (phase.tasks || []).map(task => ({
                    channelUuid: String(phase.id),
                    description: task.description || 'Sem descrição detalhada.',
                    id: String(task.id),
                    image: getAvatarUrl(task.assignee?.username),
                    since: task.startDate && isValid(parseISO(task.startDate)) ? parseISO(task.startDate).toISOString() : new Date().toISOString(),
                    till: task.endDate && isValid(parseISO(task.endDate)) ? parseISO(task.endDate).toISOString() : addDays(new Date(), 1).toISOString(),
                    title: task.name,
                    disabled: !task.startDate || !task.endDate
                }))
            );
    }, [campaign.phases]);

    const overallStartDate = useMemo(() => {
        const dates = (campaign?.phases || []).flatMap(p => p.tasks).map(t => t.startDate ? parseISO(t.startDate) : null).filter(Boolean);
        return dates.length > 0 ? subDays(new Date(Math.min(...dates.map(d => d!.getTime()))), 1) : subDays(new Date(), 15);
    }, [campaign]);

    const overallEndDate = useMemo(() => {
        const dates = (campaign?.phases || []).flatMap(p => p.tasks).map(t => t.endDate ? parseISO(t.endDate) : null).filter(Boolean);
        return dates.length > 0 ? addDays(new Date(Math.max(...dates.map(d => d!.getTime()))), 1) : addDays(new Date(), 15);
    }, [campaign]);

    const { getLayoutProps, getTimelineProps } = usePlanby({
        channels,
        epg,
        startDate: overallStartDate.toISOString(),
        endDate: overallEndDate.toISOString(),
        theme: theme,
        dayWidth: 4800,
        sidebarWidth: 200,
        itemHeight: 80,
        isBaseTimeFormat: true,
        isSidebar: true,
        isTimeline: true,
        isLine: true,
        isProgramVisible: (program: Program) => !!program.since && !!program.till
    });

    return (
        <div ref={containerRef} style={{ height: "600px", width: "100%" }}>
            <Layout
                {...getLayoutProps()}
                renderTimeline={(props) => (
                    <div {...getTimelineProps(props)} style={{ ...props.style, userSelect: 'none' }} />
                )}
                renderProgram={({ program, ...rest }) => (
                    <div {...rest} style={{ ...rest.style, boxShadow: '0 1px 3px rgba(0,0,0,0.5)', borderRadius: '6px', borderLeft: '3px solid hsl(var(--primary))' }}>
                        <div className="p-2 h-full w-full flex flex-col justify-center">
                            <p className="text-sm font-semibold">{program.data.title}</p>
                            <p className="text-xs text-secondary-foreground/70 truncate">{program.data.description}</p>
                        </div>
                        <img src={program.data.image} alt="assignee" className="absolute w-6 h-6 rounded-full right-2 bottom-2" />
                    </div>
                )}
                renderChannel={({ channel, ...rest }) => (
                    <div {...rest} className="flex items-center p-2 border-b border-border/50">
                        <img src={channel.logo} alt={channel.title} className="w-8 h-8 rounded-full mr-2"/>
                        <span className="text-sm font-medium">{channel.title}</span>
                    </div>
                )}
            />
        </div>
    );
}
