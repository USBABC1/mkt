import { useTheme } from "@/components/theme-provider";
import { Theme } from "@planby/react";

export function usePlanbyTheme(): Theme {
  const { theme: appTheme } = useTheme();

  const isDark = appTheme === "dark";

  const theme: Theme = {
    primary: {
      main: isDark ? "hsl(210, 90%, 55%)" : "hsl(210, 85%, 50%)",
      contrastText: "#fff",
    },
    secondary: {
      main: isDark ? "hsl(220, 15%, 25%)" : "hsl(220, 10%, 80%)",
      contrastText: isDark ? "#fff" : "#000",
    },
    background: {
      main: isDark ? "hsl(220, 15%, 8%)" : "hsl(220, 15%, 97%)",
      sidebar: isDark ? "hsl(220, 18%, 4%)" : "hsl(220, 15%, 96%)",
      planner: isDark ? "hsl(220, 15%, 8%)" : "hsl(220, 15%, 97%)",
    },
    text: {
      primary: isDark ? "hsl(210, 15%, 92%)" : "hsl(220, 10%, 20%)",
      secondary: isDark ? "hsl(210, 10%, 60%)" : "hsl(220, 5%, 50%)",
    },
    loader: {
        background: 'rgba(0, 0, 0, 0.5)',
        color: 'hsl(var(--primary))',
    },
    // Typographies
    typography: {
      fontFamily: "'Montserrat', sans-serif",
      fontSize: 12,
    },
    // Borders
    border: {
      radius: 8,
      width: 1,
      color: isDark ? "hsl(220, 15%, 18%)" : "hsl(220, 13%, 91%)",
    },
    // Planner
    planner: {
      padding: {
        top: 20,
        bottom: 20,
      },
    },
    // Timeline
    timeline: {
      height: 48,
      border: {
        color: isDark ? "hsl(220, 15%, 15%)" : "hsl(220, 13%, 93%)",
        width: 1,
      },
    },
    // Sidebar
    sidebar: {
      width: 220,
      border: {
        color: isDark ? "hsl(220, 15%, 12%)" : "hsl(220, 13%, 90%)",
        width: 1,
      },
    },
    // Channel
    channel: {
      width: 220,
      height: 80,
      padding: {
        top: 8,
        bottom: 8,
        left: 8,
        right: 8,
      },
    },
    // Program
    program: {
      padding: {
        top: 8,
        bottom: 8,
        left: 8,
        right: 8,
      },
    },
  };

  return theme;
}
