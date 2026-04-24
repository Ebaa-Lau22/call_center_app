import { createTheme, alpha } from "@mui/material/styles";

export const THEME_PURPLE = "#7e57c2";
export const LIGHT_PURPLE_BG = "#faf9fc";

export const appTheme = createTheme({
  typography: {
    fontFamily: "'Inter', 'Segoe UI', sans-serif",
  },
  palette: {
    primary: { main: THEME_PURPLE },
    background: { default: LIGHT_PURPLE_BG },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 999,
          textTransform: "none",
          fontWeight: 600,
        },
      },
    },
  },
});

export const styles = {
  pageBg: {
    minHeight: "100vh",
    background: `linear-gradient(135deg, ${LIGHT_PURPLE_BG} 0%, #ffffff 100%)`,
    py: { xs: 2.5, md: 4 },
  },
  card: {
    backgroundColor: "white",
    borderRadius: "24px",
    p: { xs: 2.5, sm: 3, md: 4 },
    boxShadow: "0 8px 32px rgba(23, 10, 43, 0.13)",
    border: `1px solid ${alpha(THEME_PURPLE, 0.12)}`,
    position: "relative",
    overflow: "hidden",
    "&::before": {
      content: '""',
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      height: "4px",
      background: `linear-gradient(90deg, ${THEME_PURPLE}, #220c4832)`,
    },
  },
};
