import { Container, Typography, Box } from '@mui/material';

function PageLayout({ title, children }) {
  // Matches the theme used in your OrderForm
  const LIGHT_PURPLE_BG = '#faf9fc';

  return (
    <Box 
      sx={{ 
        backgroundColor: LIGHT_PURPLE_BG,
        minHeight: '100vh',
        fontFamily: "'Inter', 'Segoe UI', sans-serif",
      }}
    >
      <Container maxWidth="xl">
        <Typography 
          variant="h5" 
          gutterBottom
        >
          {title}
        </Typography>

        <Box>
          {children}
        </Box>
      </Container>
    </Box>
  );
}

export default PageLayout;
