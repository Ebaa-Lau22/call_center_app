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
} from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import LockIcon from '@mui/icons-material/Lock';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import LoginIcon from '@mui/icons-material/Login';

const THEME_PURPLE = '#7e57c2';
const LIGHT_PURPLE_BG = '#faf9fc';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const navigate = useNavigate();

  const textFieldStyles = {
    // ... (Keep your existing styles exactly as they were)
    '& .MuiOutlinedInput-root': {
      borderRadius: '50px',
      backgroundColor: 'white',
      fontFamily: "'Inter', 'Segoe UI', sans-serif",
      transition: 'all 0.2s ease',
      '& fieldset': {
        borderColor: '#e8e4f0',
        borderWidth: '1.5px',
      },
      '&:hover fieldset': {
        borderColor: '#d1c4e9',
        boxShadow: '0 0 0 4px rgba(126, 87, 194, 0.04)',
      },
      '&.Mui-focused fieldset': {
        borderColor: THEME_PURPLE,
        borderWidth: '2px',
        boxShadow: '0 0 0 4px rgba(126, 87, 194, 0.08)',
      },
    },
    '& .MuiInputLabel-root': {
      fontFamily: "'Inter', 'Segoe UI', sans-serif",
      color: '#9e9e9e',
      '&.Mui-focused': {
        color: THEME_PURPLE,
      },
    },
    '& .MuiInputBase-input': {
      fontFamily: "'Inter', 'Segoe UI', sans-serif",
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
        background: `linear-gradient(135deg, ${LIGHT_PURPLE_BG} 0%, #ffffff 100%)`,
        fontFamily: "'Inter', 'Segoe UI', sans-serif",
      }}
    >
      <Container maxWidth="sm">
        <Fade in timeout={600}>
          <Box
            sx={{
              backgroundColor: 'white',
              borderRadius: '24px',
              p: 6,
              boxShadow: '0 8px 32px rgba(126, 87, 194, 0.12)',
              border: '1px solid rgba(126, 87, 194, 0.08)',
              position: 'relative',
              overflow: 'hidden',
              '&::before': {
                content: '""',
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: '4px',
                background: `linear-gradient(90deg, ${THEME_PURPLE}, #9575cd)`,
              }
            }}
          >
            {/* Header */}
            <Box sx={{ textAlign: 'center', mb: 5 }}>
              <Box
                sx={{
                  width: 80,
                  height: 80,
                  borderRadius: '20px',
                  backgroundColor: alpha(THEME_PURPLE, 0.1),
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 24px',
                }}
              >
                <LoginIcon sx={{ fontSize: 40, color: THEME_PURPLE }} />
              </Box>
              <Typography
                variant="h4"
                sx={{
                  fontWeight: 700,
                  color: '#2d2d2d',
                  mb: 1,
                  fontFamily: "'Inter', 'Segoe UI', sans-serif",
                  letterSpacing: '-0.5px',
                }}
              >
                Call Center Login
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  color: '#9e9e9e',
                  fontFamily: "'Inter', 'Segoe UI', sans-serif",
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
                  sx={{ 
                    mb: 3, 
                    borderRadius: '16px',
                    fontFamily: "'Inter', 'Segoe UI', sans-serif",
                  }}
                  onClose={() => setError('')}
                >
                  {error}
                </Alert>
              </Fade>
            )}

            {/* Login Form */}
            <form onSubmit={handleLogin}>
              <Box sx={{ mb: 3 }}>
                <TextField
                  label="Username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  fullWidth
                  size="medium"
                  required
                  sx={textFieldStyles}
                  InputProps={{
                    startAdornment: (
                      <PersonIcon sx={{ color: '#9e9e9e', mr: 1, fontSize: 22 }} />
                    ),
                  }}
                />
              </Box>

              <Box sx={{ mb: 4 }}>
                <TextField
                  label="Password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  fullWidth
                  size="medium"
                  required
                  sx={textFieldStyles}
                  InputProps={{
                    startAdornment: (
                      <LockIcon sx={{ color: '#9e9e9e', mr: 1, fontSize: 22 }} />
                    ),
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          onClick={() => setShowPassword(!showPassword)}
                          edge="end"
                          sx={{ color: '#9e9e9e' }}
                        >
                          {showPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
              </Box>

              <Button
                type="submit"
                fullWidth
                disabled={loading}
                sx={{
                  backgroundColor: THEME_PURPLE,
                  color: 'white',
                  borderRadius: '50px',
                  py: 1.8,
                  fontWeight: 600,
                  fontSize: '16px',
                  fontFamily: "'Inter', 'Segoe UI', sans-serif",
                  textTransform: 'none',
                  boxShadow: '0 6px 20px rgba(126, 87, 194, 0.35)',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    backgroundColor: '#6d47b0',
                    boxShadow: '0 8px 28px rgba(126, 87, 194, 0.45)',
                    transform: 'translateY(-2px)',
                  },
                  '&:active': {
                    transform: 'translateY(0)',
                  },
                  '&:disabled': {
                    backgroundColor: '#d1c4e9',
                    color: 'white',
                  }
                }}
              >
                {loading ? 'Signing in...' : 'Sign In'}
              </Button>
            </form>
          </Box>
        </Fade>
      </Container>
    </Box>
  );
}