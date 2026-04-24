import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

import {
  Box,
  TextField,
  Button,
  Typography,
  Container,
  Alert,
  IconButton,
  InputAdornment,
  Fade,
  alpha,
  CircularProgress,
} from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import LockIcon from '@mui/icons-material/Lock';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import LoginIcon from '@mui/icons-material/Login';

const THEME_PURPLE = '#7e57c2';
const DARK_PURPLE = '#5a3f8f';
const LIGHT_PURPLE_BG = '#faf9fc';
const ACCENT_TEAL = '#1dd1a1';

import { C, FONT, R, textFieldSx, textAreaSx, selectFieldSx } from '../theme/ccTheme';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [focusedField, setFocusedField] = useState(null);
  
  const navigate = useNavigate();

  const textFieldStyles = {
    '& .MuiOutlinedInput-root': {
      borderRadius: '16px',
      backgroundColor: '#ffffff',
      fontFamily: "'Inter', 'Segoe UI', sans-serif",
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      '& fieldset': {
        borderColor: '#e8e4f0',
        borderWidth: '1.5px',
      },
      '&:hover fieldset': {
        borderColor: alpha(THEME_PURPLE, 0.3),
        boxShadow: `0 4px 12px ${alpha(THEME_PURPLE, 0.08)}`,
      },
      '&.Mui-focused fieldset': {
        borderColor: THEME_PURPLE,
        borderWidth: '2px',
        boxShadow: `0 0 0 4px ${alpha(THEME_PURPLE, 0.1)}`,
      },
    },
    '& .MuiInputLabel-root': {
      fontFamily: "'Inter', 'Segoe UI', sans-serif",
      color: '#9e9e9e',
      fontWeight: 500,
      '&.Mui-focused': {
        color: THEME_PURPLE,
        fontWeight: 600,
      },
    },
    '& .MuiInputBase-input': {
      fontFamily: "'Inter', 'Segoe UI', sans-serif",
      fontSize: '15px',
      fontWeight: 500,
      padding: '14px 16px',
    },
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await axios.post(
        '/api/call_center/auth/login',
        {
          params: {
            username: username,
            password: password,
          }
        },
        {
          withCredentials: true,
          headers: { 'Content-Type': 'application/json' }
        }
      );

      const result = response.data.result;

      if (result.status === 'success') {
        if (result.token) {
          localStorage.setItem('cc_auth_token', result.token);
        }
        console.log("Login successful:", result);
        const userData = {
          id: result.user_id,
          name: result.user_name,
          isDriver: result.is_driver,
          isCallCenterEmployee: result.is_call_center_employee,
          isManager: result.is_call_center_manager,
        };

        const companyData = result.company_info;
        console.log("companyData", companyData)
        localStorage.setItem('user_data', JSON.stringify(userData));
        localStorage.setItem('company_data', JSON.stringify(companyData));
        if (result.is_driver) {
          navigate('/driver/orders');
        } else if (result.is_call_center_manager || result.is_call_center_employee) {
          navigate('/orders');
        } else {
          setError(result.message || 'Login failed');
        }
      }
    } catch (err) {
      console.error('Login error:', err);
      setError(err.response?.data?.result?.message || 'Invalid username or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: `linear-gradient(135deg, ${LIGHT_PURPLE_BG} 0%, #ffffff 50%, ${alpha(THEME_PURPLE, 0.02)} 100%)`,
        fontFamily: "'Inter', 'Segoe UI', sans-serif",
        position: 'relative',
        overflow: 'hidden',
        py: 3,
        px: 2,
        '&::before': {
          content: '""',
          position: 'absolute',
          top: '-50%',
          right: '-10%',
          width: '500px',
          height: '500px',
          borderRadius: '50%',
          background: `radial-gradient(circle, ${alpha(THEME_PURPLE, 0.05)} 0%, transparent 70%)`,
          pointerEvents: 'none',
          '@media (max-width: 600px)': {
            width: '300px',
            height: '300px',
            top: '-30%',
            right: '-15%',
          }
        },
        '&::after': {
          content: '""',
          position: 'absolute',
          bottom: '-30%',
          left: '-10%',
          width: '400px',
          height: '400px',
          borderRadius: '50%',
          background: `radial-gradient(circle, ${alpha(ACCENT_TEAL, 0.03)} 0%, transparent 70%)`,
          pointerEvents: 'none',
          '@media (max-width: 600px)': {
            width: '250px',
            height: '250px',
            bottom: '-20%',
            left: '-10%',
          }
        }
      }}
    >
      <Container maxWidth="sm" sx={{ position: 'relative', zIndex: 1 }}>
        <Fade in timeout={800}>
          <Box
            sx={{
              backgroundColor: '#ffffff',
              borderRadius: '28px',
              p: { xs: 4, sm: 6 },
              boxShadow: '0 20px 60px rgba(126, 87, 194, 0.15)',
              border: '1px solid rgba(126, 87, 194, 0.12)',
              position: 'relative',
              overflow: 'hidden',
              backdropFilter: 'blur(10px)',
              '&::before': {
                content: '""',
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: '5px',
                background: `linear-gradient(90deg, ${C.teal}, ${C.purple}, ${C.teal})`,
              },
            }}
          >
            {/* Header Section */}
            <Box sx={{ textAlign: 'center', mb: 5 }}>
              <Box
                sx={{
                  width: { xs: 70, sm: 80 },
                  height: { xs: 70, sm: 80 },
                  borderRadius: '20px',
                  background: `linear-gradient(135deg, ${alpha(THEME_PURPLE, 0.15)}, ${alpha(ACCENT_TEAL, 0.1)})`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 24px',
                  border: `2px solid ${alpha(THEME_PURPLE, 0.1)}`,
                  boxShadow: `0 8px 24px ${alpha(THEME_PURPLE, 0.1)}`,
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    transform: 'scale(1.05) rotate(-5deg)',
                    boxShadow: `0 12px 36px ${alpha(THEME_PURPLE, 0.15)}`,
                  }
                }}
              >
                <LoginIcon 
                  sx={{ 
                    fontSize: { xs: 32, sm: 40 }, 
                    color: THEME_PURPLE,
                    filter: `drop-shadow(0 4px 12px ${alpha(THEME_PURPLE, 0.2)})`
                  }} 
                />
              </Box>

              <Typography
                variant="h3"
                sx={{
                  fontWeight: 800,
                  color: '#1a1a1a',
                  mb: 1.5,
                  fontFamily: "'Inter', 'Segoe UI', sans-serif",
                  letterSpacing: '-1px',
                  fontSize: { xs: '28px', sm: '36px' },
                  background: `linear-gradient(135deg, ${THEME_PURPLE}, ${DARK_PURPLE})`,
                  backgroundClip: 'text',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  textShadow: 'none',
                }}
              >
                Priority Medical
              </Typography>

              <Typography
                variant="body2"
                sx={{
                  color: '#7a7a7a',
                  fontFamily: "'Inter', 'Segoe UI', sans-serif",
                  fontSize: '15px',
                  fontWeight: 500,
                  letterSpacing: '0.3px',
                }}
              >
                Enter your credentials to access the system
              </Typography>
            </Box>

            {/* Error Alert */}
            {error && (
              <Fade in>
                <Alert 
                  severity="error" 
                  onClose={() => setError('')}
                  sx={{ 
                    mb: 3, 
                    borderRadius: '16px',
                    fontFamily: "'Inter', 'Segoe UI', sans-serif",
                    backgroundColor: alpha('#ef5350', 0.08),
                    border: `1.5px solid ${alpha('#ef5350', 0.3)}`,
                    color: '#c62828',
                    fontWeight: 500,
                    fontSize: '14px',
                    '& .MuiAlert-icon': {
                      color: '#ef5350',
                    },
                    animation: 'slideDown 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    '@keyframes slideDown': {
                      from: {
                        opacity: 0,
                        transform: 'translateY(-16px)',
                      },
                      to: {
                        opacity: 1,
                        transform: 'translateY(0)',
                      },
                    },
                  }}
                >
                  {error}
                </Alert>
              </Fade>
            )}

            {/* Login Form */}
            <form onSubmit={handleLogin}>
              {/* Username Field */}
              <Box sx={{ mb: 3 }}>
                <TextField
                  label="Username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  onFocus={() => setFocusedField('username')}
                  onBlur={() => setFocusedField(null)}
                  fullWidth
                  size="medium"
                  required
                  disabled={loading}
                  sx={textFieldStyles}
                  InputProps={{
                    startAdornment: (
                      <PersonIcon 
                        sx={{ 
                          color: focusedField === 'username' ? THEME_PURPLE : '#9e9e9e',
                          mr: 1.5, 
                          fontSize: 22,
                          transition: 'all 0.3s ease',
                        }} 
                      />
                    ),
                  }}
                />
              </Box>

              {/* Password Field */}
              <Box sx={{ mb: 4 }}>
                <TextField
                  label="Password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={() => setFocusedField('password')}
                  onBlur={() => setFocusedField(null)}
                  fullWidth
                  size="medium"
                  required
                  disabled={loading}
                  sx={textFieldStyles}
                  InputProps={{
                    startAdornment: (
                      <LockIcon 
                        sx={{ 
                          color: focusedField === 'password' ? THEME_PURPLE : '#9e9e9e',
                          mr: 1.5, 
                          fontSize: 22,
                          transition: 'all 0.3s ease',
                        }} 
                      />
                    ),
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          onClick={() => setShowPassword(!showPassword)}
                          edge="end"
                          disabled={loading}
                          sx={{ 
                            color: '#9e9e9e',
                            transition: 'all 0.3s ease',
                            '&:hover': {
                              color: THEME_PURPLE,
                              backgroundColor: alpha(THEME_PURPLE, 0.05),
                            }
                          }}
                        >
                          {showPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
              </Box>

              {/* Sign In Button */}
              <Button
                type="submit"
                fullWidth
                disabled={loading || !username || !password}
                sx={{
                  backgroundColor: THEME_PURPLE,
                  color: '#ffffff',
                  borderRadius: '16px',
                  py: { xs: 1.6, sm: 1.8 },
                  px: 3,
                  fontWeight: 700,
                  fontSize: { xs: '15px', sm: '16px' },
                  fontFamily: "'Inter', 'Segoe UI', sans-serif",
                  textTransform: 'none',
                  letterSpacing: '0.5px',
                  boxShadow: `0 8px 24px ${alpha(THEME_PURPLE, 0.35)}`,
                  transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                  position: 'relative',
                  overflow: 'hidden',
                  '&::before': {
                    content: '""',
                    position: 'absolute',
                    top: 0,
                    left: '-100%',
                    width: '100%',
                    height: '100%',
                    backgroundColor: DARK_PURPLE,
                    transition: 'left 0.4s ease',
                    zIndex: -1,
                  },
                  '&:hover:not(:disabled)': {
                    backgroundColor: THEME_PURPLE,
                    boxShadow: `0 12px 32px ${alpha(THEME_PURPLE, 0.45)}`,
                    transform: 'translateY(-2px)',
                    '&::before': {
                      left: '0%',
                    }
                  },
                  '&:active:not(:disabled)': {
                    transform: 'translateY(0)',
                  },
                  '&:disabled': {
                    backgroundColor: alpha(THEME_PURPLE, 0.5),
                    boxShadow: 'none',
                    color: alpha('#ffffff', 0.7),
                  }
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, justifyContent: 'center' }}>
                  {loading ? (
                    <>
                      <CircularProgress 
                        size={18} 
                        sx={{ 
                          color: '#ffffff',
                        }} 
                      />
                      <span>Signing in...</span>
                    </>
                  ) : (
                    'Sign In'
                  )}
                </Box>
              </Button>
            </form>

            {/* Footer Info */}
            <Box 
              sx={{ 
                mt: 4, 
                pt: 3,
                borderTop: `1px solid ${alpha(THEME_PURPLE, 0.08)}`,
                textAlign: 'center'
              }}
            >
              <Typography
                variant="caption"
                sx={{
                  color: '#9e9e9e',
                  fontFamily: "'Inter', 'Segoe UI', sans-serif",
                  fontSize: '12px',
                  fontWeight: 500,
                  display: 'block',
                }}
              >
                Secure authentication • Protected by encryption
              </Typography>
            </Box>
          </Box>
        </Fade>
      </Container>
    </Box>
  );
}