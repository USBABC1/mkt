import React from "react";
import { Planby, usePlanby } from "@planby/core";
import { useApp } from "@/hooks/usePlanbyTheme";
import { Timeline, ProgramItem, ChannelItem } from "../PlanbyComponents"; // Ajuste o caminho se necessário

export const PlanbySchedule: React.FC = () => {
  // ✅ CORREÇÃO 1: Obter a função 'onCampaignsChange' e o 'theme' do nosso hook.
  const { channels, epg, theme, onCampaignsChange } = useApp();

  const { getLayoutProps } = usePlanby({
    channels,
    epg,
    dayWidth: 7200,
    sidebarWidth: 100,
    itemHeight: 80,
    isSidebar: true,
    isTimeline: true,
    isLine: true,
    isBaseTimeFormat: true,
    // ✅ CORREÇÃO 2: Passar a função para o hook da biblioteca `usePlanby`.
    // É isso que vai resolver o erro 'cannot read ... of undefined'.
    onCampaignsChange,
  });

  // A chamada duplicada para useApp() foi removida.

  return (
    <div style={{ height: "calc(100vh - 100px)", width: "100%" }}>
      <Planby
        {...getLayoutProps()}
        renderTimeline={(props) => <Timeline {...props} />}
        renderProgram={({ program, ...rest }) => (
          <ProgramItem key={program.data.id} program={program} {...rest} />
        )}
        renderChannel={({ channel }) => (
          <ChannelItem key={channel.uuid} channel={channel} />
        )}
        theme={theme}
      />
    </div>
  );
};
