import { alpha, Box, CircularProgress } from '@mui/material';

// ─── Colors ─────────────────────────────────────────────────────────────────
export const C = {
  purple:     '#7e57c2',
  purpleDark: '#5a3f8f',
  purpleBg:   '#faf9fc',
  pink:       '#ec407a',
  teal:       '#1dd1a1',
  tealDark:   '#17b891',
  red:        '#ef5350',
  gold:       '#e4cd1b',
  goldDark:   '#b8971c',
  goldBg:     '#fdf8e1',
  text:       '#2d2d2d',
  muted:      '#9e9e9e',
  mutedDark:  '#7a7a7a',
};

// ─── Font ────────────────────────────────────────────────────────────────────
export const FONT = "'Inter', 'Segoe UI', sans-serif";

// ─── Border Radii ────────────────────────────────────────────────────────────
export const R = {
  pill:   '50px',
  card:   '20px',
  cardSm: '16px',
  input:  '14px',
  soft:   '8px',
};

// ─── Banner gradient (shared across all cards) ────────────────────────────────
export const bannerGradient = `linear-gradient(90deg, ${C.teal}, ${C.purple}, ${C.teal})`;

// ─── App-wide loading spinner (teal + purple) ─────────────────────────────────
export function AppLoader() {
  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', background: `linear-gradient(135deg, ${C.purpleBg} 0%, white 100%)` }}>
      <Box sx={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
        {/* outer teal ring */}
        <CircularProgress size={58} thickness={2.8} sx={{ color: C.teal }} />
        {/* inner purple ring, offset animation */}
        <CircularProgress size={58} thickness={2.8} sx={{ color: C.purple, position: 'absolute', opacity: 0.35, animationDuration: '1.6s', animationDelay: '-0.8s' }} />
        {/* small center dot */}
        <Box sx={{ position: 'absolute', width: 10, height: 10, borderRadius: '50%', background: bannerGradient }} />
      </Box>
    </Box>
  );
}

// ─── Shared select menu props ─────────────────────────────────────────────────
export const sharedMenuProps = {
  PaperProps: {
    sx: {
      borderRadius: R.cardSm,
      mt: 1,
      boxShadow: '0 8px 24px rgba(126, 87, 194, 0.15)',
      '& .MuiMenuItem-root': {
        fontFamily: FONT,
        borderRadius: R.soft,
        mx: 1,
        my: 0.5,
        transition: 'all 0.2s ease',
        fontSize: { xs: '13px', sm: '14px' },
        '&:hover': { backgroundColor: 'rgba(126,87,194,0.08)', transform: 'translateX(4px)' },
        '&.Mui-selected': {
          backgroundColor: 'rgba(126,87,194,0.12)', fontWeight: 600,
          '&:hover': { backgroundColor: 'rgba(126,87,194,0.16)' },
        },
      },
    },
  },
};

// ─── Reusable sx helpers ─────────────────────────────────────────────────────

// OrderLines inputs — purple focus
export const textFieldSx = {
  '& .MuiOutlinedInput-root': {
    borderRadius: { xs: R.cardSm, sm: R.pill },
    backgroundColor: 'white',
    fontFamily: FONT,
    '& fieldset': { borderColor: '#e8e4f0', borderWidth: '1.5px' },
    '&:hover fieldset': { borderColor: '#d1c4e9' },
    '&.Mui-focused fieldset': { borderColor: C.purple, borderWidth: '2px' },
  },
  '& .MuiInputLabel-root': { fontFamily: FONT, color: C.muted, '&.Mui-focused': { color: C.purple } },
  '& .MuiInputBase-input': { fontFamily: FONT },
};

// OrderForm inputs — teal focus
export const formFieldSx = {
  '& .MuiOutlinedInput-root': {
    borderRadius: { xs: R.cardSm, sm: R.pill },
    backgroundColor: 'white',
    fontFamily: FONT,
    transition: 'all 0.2s ease',
    '& fieldset': { borderColor: '#e8e4f0', borderWidth: '1.5px' },
    '&:hover fieldset': { borderColor: `rgba(29,209,161,0.4)`, boxShadow: `0 0 0 4px rgba(29,209,161,0.06)` },
    '&.Mui-focused fieldset': { borderColor: C.teal, borderWidth: '2px', boxShadow: `0 0 0 4px rgba(29,209,161,0.10)` },
  },
  '& .MuiInputLabel-root': {
    fontFamily: FONT, color: C.muted,
    fontSize: { xs: '13px', sm: '14px' },
    '&.Mui-focused': { color: C.teal },
  },
  '& .MuiInputBase-input': { fontFamily: FONT, fontSize: { xs: '14px', sm: '15px' } },
};

// Disabled variant (no hover/focus styles)
export const formFieldDisabledSx = {
  '& .MuiOutlinedInput-root': {
    borderRadius: { xs: R.cardSm, sm: R.pill },
    backgroundColor: 'rgba(126,87,194,0.02)',
    fontFamily: FONT,
    '& fieldset': { borderColor: '#e8e4f0', borderWidth: '1.5px' },
    '&.Mui-disabled fieldset': { borderColor: '#e8e4f0' },
  },
  '& .MuiInputLabel-root': { fontFamily: FONT, color: C.muted, fontSize: { xs: '13px', sm: '14px' } },
  '& .MuiInputBase-input': { fontFamily: FONT, fontSize: { xs: '14px', sm: '15px' } },
};

// Softer-rounded textarea (Terms & Conditions)
export const textAreaSx = {
  '& .MuiOutlinedInput-root': {
    borderRadius: R.input,
    backgroundColor: 'white',
    fontFamily: FONT,
    '& fieldset': { borderColor: '#e8e4f0', borderWidth: '1.5px' },
    '&:hover fieldset': { borderColor: '#d1c4e9' },
    '&.Mui-focused fieldset': { borderColor: C.purple, borderWidth: '2px' },
  },
  '& .MuiInputLabel-root': { fontFamily: FONT, color: C.muted, '&.Mui-focused': { color: C.purple } },
  '& .MuiInputBase-input': { fontFamily: FONT },
};

// OrderLines inline dropdown
export const selectFieldSx = {
  '& .MuiOutlinedInput-root': {
    borderRadius: R.input,
    backgroundColor: 'white',
    fontFamily: FONT,
    '& fieldset': { borderColor: 'rgba(126,87,194,0.18)', borderWidth: '1.5px' },
    '&:hover fieldset': { borderColor: 'rgba(126,87,194,0.30)' },
    '&.Mui-focused fieldset': { borderColor: C.purple, borderWidth: '2px' },
  },
  '& .MuiInputLabel-root': { fontFamily: FONT, color: C.muted, '&.Mui-focused': { color: C.purple } },
};