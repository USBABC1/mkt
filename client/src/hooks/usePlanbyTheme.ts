import { useMemo } from "react";
import {
  ThemeType,
  useTheme as usePlanbyThemeMode,
} from "@planby/core";
import { useTheme } from "next-themes";
import { epg, channels } from "@/lib/planbyData"; // Assumindo que este arquivo exporta os dados necessários

export function useApp() {
  const { theme: mode } = useTheme();

  const theme = useMemo<ThemeType>(
    () => ({
      ...usePlanbyThemeMode(mode as "light" | "dark"),
      // ... (outras personalizações do tema, se houver)
    }),
    [mode]
  );
  
  // ✅ CORREÇÃO: A propriedade 'campaignsChange' estava a faltar.
  // Adicionamos um objeto com uma função vazia para satisfazer o componente 
  // que espera por esta propriedade. Isso evita o erro 'cannot read properties of undefined'.
  const campaignsChange = {
    // Esta é uma função de placeholder. Se a biblioteca precisar de uma lógica real,
    // ela precisará ser implementada aqui. Por agora, isso resolve o erro.
    onCampaignsChange: () => {},
  };


  return {
    theme,
    channels,
    epg,
    // ✅ CORREÇÃO: Retornando o objeto que estava a faltar.
    campaignsChange, 
  };
}
