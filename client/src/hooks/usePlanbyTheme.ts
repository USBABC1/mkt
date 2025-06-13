import { useMemo, useState, useCallback } from "react";
import {
  ThemeType,
  useTheme as usePlanbyThemeMode,
  Epg,
  Channel,
} from "@planby/core";
import { useTheme } from "next-themes";
// Em uma aplicação real, estes dados viriam de uma API.
import { epg as initialEpg, channels as initialChannels } from "@/lib/planbyData";

export function useApp() {
  const { theme: mode } = useTheme();

  // Mantém os dados do agendamento no estado do React.
  const [channels] = useState<Channel[]>(initialChannels);
  const [epg, setEpg] = useState<Epg>(initialEpg);

  const theme = useMemo<ThemeType>(
    () => ({
      ...usePlanbyThemeMode(mode as "light" | "dark"),
      // Aqui você pode adicionar outras personalizações de tema se necessário
      // Ex: sidebar: { ... }, program: { ... }
    }),
    [mode]
  );

  /**
   * ✅ CORREÇÃO: Implementação da função que faltava.
   * A biblioteca de agendamento precisa de uma função para lidar com
   * mudanças nos "programas" (quando um utilizador arrasta ou redimensiona um item).
   * Esta função será passada para o componente principal do agendamento.
   */
  const handleCampaignsChange = useCallback((newEpg: Epg) => {
    // Em uma aplicação real, aqui você faria uma chamada de API para salvar as alterações no banco de dados.
    // Para este exemplo, apenas atualizamos o estado local para refletir a mudança na UI.
    console.log("Os agendamentos (EPG) mudaram. Novo estado:", newEpg);
    setEpg(newEpg);
  }, []);

  return {
    theme,
    channels,
    epg,
    // Retornando a função com o nome que o componente espera ('onCampaignsChange').
    onCampaignsChange: handleCampaignsChange,
  };
}
