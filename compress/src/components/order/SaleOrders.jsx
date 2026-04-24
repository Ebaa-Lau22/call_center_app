import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import {
  Box, Container, Typography, Table, TableBody, TableCell, Grid,
  TableHead, TableRow, Chip, TablePagination, MenuItem, Select, FormControl,
  InputLabel, Collapse, IconButton, Button, CircularProgress, TextField, Fade, alpha, Menu
} from '@mui/material';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import FilterListIcon from '@mui/icons-material/FilterList';
import ShoppingBagIcon from '@mui/icons-material/ShoppingBag';
import LogoutIcon from '@mui/icons-material/Logout';
import SettingsIcon from '@mui/icons-material/Settings';

const THEME_PURPLE = '#7e57c2';
const LIGHT_PURPLE_BG = '#faf9fc';

export const utcOdooToLocal = (utcStr) => {
  if (!utcStr) return "";

  // "YYYY-MM-DD HH:mm:ss" -> "YYYY-MM-DDTHH:mm:ssZ"
  const isoUtc = utcStr.replace(" ", "T") + "Z";
  const d = new Date(isoUtc); // interpreted as UTC then shown in device local

  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  const ss = String(d.getSeconds()).padStart(2, "0");

  return `${yyyy}-${mm}-${dd} ${hh}:${mi}:${ss}`;
};

export default function SaleOrders() {
  const navigate = useNavigate();

  const [orders, setOrders] = useState([]);
  const [groupedOrders, setGroupedOrders] = useState({});
  const [loading, setLoading] = useState(false);
  const [totalCount, setTotalCount] = useState(0);

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [groupBy, setGroupBy] = useState('none');
  const [availableStates, setAvailableStates] = useState([]);
  const [filterState, setFilterState] = useState('all');
  const [searchType, setSearchType] = useState('all');
  const [searchValue, setSearchValue] = useState('');
  const [anchorEl, setAnchorEl] = useState(null);
  const [userName, setUserName] = useState('');

  useEffect(() => {
    const fetchStates = async () => {
      try {
        const resp = await axios.post('/api/call_center/order/states', {});
        if (resp.data.result.status === 'success') {
          setAvailableStates(resp.data.result.states);
        }
      } catch (e) {
        console.error("States fetch failed", e);
      }
    };
    fetchStates();

    // Get user data from localStorage
    const userData = JSON.parse(localStorage.getItem('user_data') || 'null');
    if (userData && userData.name) {
      setUserName(userData.name);
    }
  }, []);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const payload = {
        params: {
          limit: rowsPerPage,
          offset: page * rowsPerPage,
          state: filterState !== 'all' ? filterState : undefined,
          search_type: searchType,
          search_value: searchValue
        }
      };
      const response = await axios.post('/api/call_center/orders', payload);
      if (response.data.result?.status === 'success') {
        setOrders(response.data.result?.result);
        setTotalCount(response.data.result?.total_count);
      }
    } catch (error) {
      console.error("Error fetching orders", error);
    }
    setLoading(false);
  };

  const fetchGroupedOrders = async () => {
    setLoading(true);
    try {
      const response = await axios.post('/api/call_center/orders/group_by', {
        params: { group_by: groupBy }
      });
      if (response.data.result?.status === 'success') {
        setGroupedOrders(response.data.result?.result);
      }
    } catch (error) {
      console.error("Error fetching grouped orders", error);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (groupBy !== 'none') {
      fetchGroupedOrders();
    } else {
      fetchOrders();
    }
  }, [page, rowsPerPage, filterState, groupBy, searchValue, searchType]);

  const handleChangePage = (event, newPage) => setPage(newPage);
  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleRowClick = (id, state) => {
    if (state && state.toLowerCase() === 'draft') {
      navigate(`/orders/${id}/edit`);
    } else {
      navigate(`/orders/${id}`);
    }
  };

  const handleMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogoutClick = () => {
    handleMenuClose();
    navigate('/login');
  };

  const getStatusColor = (state) => {
    const stateColors = {
      draft: { bg: '#e3f2fd', color: '#1565c0' },
      wait_for_discount_approval: { bg: '#ede7f6', color: '#5e35b1' },
      not_prepared: { bg: '#fce4ec', color: '#c2185b' },
      in_preparation: { bg: '#fff3e0', color: '#ef6c00' },
      preparation_ended: { bg: '#e0f2f1', color: '#00897b' },
      confirmed: { bg: '#e8f5e9', color: '#2e7d32' },
      canceled: { bg: '#ffebee', color: '#c62828' },
    };

    return stateColors[state] || {
      bg: '#f5f5f5',
      color: '#616161',
    };
  };

  const renderStatusChip = (state) => {
    const colors = getStatusColor(state);
    return (
      <Chip
        label={state?.replace(/_/g, ' ').toUpperCase()}
        sx={{
          backgroundColor: colors.bg,
          color: colors.color,
          fontFamily: "'Inter', 'Segoe UI', sans-serif",
          fontWeight: 600,
          fontSize: '11px',
          height: '28px',
          borderRadius: '50px',
        }}
      />
    );
  };

  const selectStyles = {
    borderRadius: '50px',
    fontFamily: "'Inter', 'Segoe UI', sans-serif",
    backgroundColor: 'white',
    transition: 'all 0.2s ease',
    '& .MuiOutlinedInput-notchedOutline': {
      borderColor: '#e8e4f0',
      borderWidth: '1.5px',
    },
    '&:hover .MuiOutlinedInput-notchedOutline': {
      borderColor: '#d1c4e9',
      boxShadow: '0 0 0 4px rgba(126, 87, 194, 0.04)',
    },
    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
      borderColor: THEME_PURPLE,
      borderWidth: '2px',
      boxShadow: '0 0 0 4px rgba(126, 87, 194, 0.08)',
    },
  };

  const textFieldStyles = {
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
  };

  const selectMenuProps = {
    PaperProps: {
      sx: {
        borderRadius: '16px',
        mt: 1,
        boxShadow: '0 8px 24px rgba(126, 87, 194, 0.15)',
        '& .MuiMenuItem-root': {
          fontFamily: "'Inter', 'Segoe UI', sans-serif",
          borderRadius: '8px',
          mx: 1,
          my: 0.5,
          transition: 'all 0.2s ease',
          '&:hover': {
            backgroundColor: alpha(THEME_PURPLE, 0.08),
            transform: 'translateX(4px)',
          },
          '&.Mui-selected': {
            backgroundColor: alpha(THEME_PURPLE, 0.12),
            fontWeight: 600,
            '&:hover': {
              backgroundColor: alpha(THEME_PURPLE, 0.16),
            },
          },
        },
      },
    },
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: `linear-gradient(135deg, ${LIGHT_PURPLE_BG} 0%, #ffffff 100%)`,
        py: 4,
        fontFamily: "'Inter', 'Segoe UI', sans-serif",
      }}
    >
      <Container maxWidth="xl">
        <Fade in timeout={600}>
          <Box>
            {/* Top Header with User Name and Settings */}
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'left',
                alignItems: 'left',
                mb: 4,
                gap: 3,
              }}
            >

              <IconButton
                onClick={handleMenuOpen}
                sx={{
                  color: THEME_PURPLE,
                  backgroundColor: alpha(THEME_PURPLE, 0.08),
                  borderRadius: '12px',
                  p: 1.5,
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    backgroundColor: alpha(THEME_PURPLE, 0.15),
                    transform: 'rotate(20deg)',
                  },
                }}
              >
                <SettingsIcon sx={{ fontSize: 24 }} />
              </IconButton>

              <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={handleMenuClose}
                PaperProps={{
                  sx: {
                    borderRadius: '12px',
                    mt: 1.5,
                    boxShadow: '0 8px 24px rgba(126, 87, 194, 0.2)',
                    '& .MuiMenuItem-root': {
                      fontFamily: "'Inter', 'Segoe UI', sans-serif",
                      fontSize: '14px',
                      transition: 'all 0.2s ease',
                      '&:hover': {
                        backgroundColor: alpha(THEME_PURPLE, 0.08),
                      },
                    },
                  },
                }}
                anchorOrigin={{
                  vertical: 'bottom',
                  horizontal: 'left',
                }}
                transformOrigin={{
                  vertical: 'top',
                  horizontal: 'left',
                }}
              >
                <MenuItem onClick={handleLogoutClick} sx={{ color: '#c62828' }}>
                  <LogoutIcon sx={{ mr: 1.5, fontSize: 20 }} />
                  Logout
                </MenuItem>
              </Menu>

              <Box sx={{ display: 'flex', alignItems: 'right', gap: 2 }}>
                <Box>
                  <Typography
                    variant="body2"
                    sx={{
                      color: '#9e9e9e',
                      fontFamily: "'Inter', 'Segoe UI', sans-serif",
                      fontSize: '13px',
                      mb: 0.5,
                    }}
                  >
                    Welcome back,
                  </Typography>
                  <Typography
                    variant="h5"
                    sx={{
                      color: '#2d2d2d',
                      fontWeight: 700,
                      fontFamily: "'Inter', 'Segoe UI', sans-serif",
                      letterSpacing: '-0.5px',
                    }}
                  >
                    {userName || 'User'}
                  </Typography>
                </Box>

              </Box>

            </Box>

            {/* Page Title */}
            <Box sx={{ mb: 4 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1 }}>
                <Box sx={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  gap: 1.5,
                }}>
                  <ShoppingBagIcon sx={{ color: THEME_PURPLE, fontSize: 32 }} />
                  <Box sx={{ justifyContent: 'left', gap: 1.5 }}>   
                    <Typography
                      variant="h4"
                      sx={{
                        color: '#2d2d2d',
                        fontWeight: 700,
                        fontFamily: "'Inter', 'Segoe UI', sans-serif",
                        letterSpacing: '-0.5px',
                      }}
                    >
                      Sale Orders
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{
                        color: '#9e9e9e',
                        fontFamily: "'Inter', 'Segoe UI', sans-serif",
                        justifyContent: 'right',
                        alignItems: 'right',
                      }}
                    >
                      Manage and track all sales orders
                    </Typography>
                  </Box>
                </Box>

                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => navigate('/orders/new')}
                  sx={{
                    backgroundColor: THEME_PURPLE,
                    color: 'white',
                    borderRadius: '50px',
                    px: 5,
                    py: 1.5,
                    fontWeight: 600,
                    fontSize: '15px',
                    fontFamily: "'Inter', 'Segoe UI', sans-serif",
                    textTransform: 'none',
                    boxShadow: '0 6px 20px rgba(126, 87, 194, 0.35)',
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      backgroundColor: '#6d47b0',
                      boxShadow: '0 8px 28px rgba(126, 87, 194, 0.45)',
                      transform: 'translateY(-2px)',
                    },
                  }}
                >
                  New Order
                </Button>
              </Box>
            </Box>

            {/* Filters Bar */}
            <Box
              sx={{
                backgroundColor: 'white',
                borderRadius: '20px',
                p: 3,
                mb: 3,
                boxShadow: '0 4px 16px rgba(126, 87, 194, 0.08)',
                border: '1px solid rgba(126, 87, 194, 0.08)',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <FilterListIcon sx={{ color: THEME_PURPLE, fontSize: 20 }} />
                <Typography
                  variant="subtitle2"
                  sx={{
                    fontWeight: 600,
                    color: THEME_PURPLE,
                    fontFamily: "'Inter', 'Segoe UI', sans-serif",
                  }}
                >
                  Filters
                </Typography>
              </Box>

              <Grid container spacing={2}>
                {/* Search Bar */}
                <Grid item xs={12} md={4}>
                  <TextField
                    placeholder="Search orders..."
                    size="medium"
                    fullWidth
                    value={searchValue}
                    onChange={(e) => setSearchValue(e.target.value)}
                    disabled={groupBy !== 'none'}
                    sx={textFieldStyles}
                    InputProps={{
                      startAdornment: <SearchIcon sx={{ color: '#9e9e9e', mr: 1, fontSize: 22 }} />,
                    }}
                  />
                </Grid>

                {/* Search Field Selector */}
                <Grid item xs={12} md={2}>
                  <FormControl fullWidth size="medium">
                    <InputLabel
                      sx={{
                        fontFamily: "'Inter', 'Segoe UI', sans-serif",
                        '&.Mui-focused': {
                          color: THEME_PURPLE,
                        }
                      }}
                    >
                      Search By
                    </InputLabel>
                    <Select
                      value={searchType}
                      label="Search By"
                      onChange={(e) => {
                        setSearchType(e.target.value);
                        setPage(0);
                      }}
                      disabled={groupBy !== 'none'}
                      sx={selectStyles}
                      MenuProps={selectMenuProps}
                    >
                      <MenuItem value="all">All Fields</MenuItem>
                      <MenuItem value="phone">Phone</MenuItem>
                      <MenuItem value="name">Customer Name</MenuItem>
                      <MenuItem value="area">Area</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>

                {/* Status Filter */}
                <Grid item xs={12} md={2}>
                  <FormControl fullWidth size="medium">
                    <InputLabel
                      sx={{
                        fontFamily: "'Inter', 'Segoe UI', sans-serif",
                        '&.Mui-focused': {
                          color: THEME_PURPLE,
                        }
                      }}
                    >
                      Status
                    </InputLabel>
                    <Select
                      value={filterState}
                      label="Status"
                      onChange={(e) => {
                        setFilterState(e.target.value);
                        setPage(0);
                      }}
                      disabled={groupBy !== 'none'}
                      sx={selectStyles}
                      MenuProps={selectMenuProps}
                    >
                      <MenuItem value="all"><em>All Orders</em></MenuItem>
                      {availableStates.map((s) => (
                        <MenuItem key={s.key} value={s.key}>
                          {s.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                {/* Group By */}
                <Grid item xs={12} md={2}>
                  <FormControl fullWidth size="medium">
                    <InputLabel
                      sx={{
                        fontFamily: "'Inter', 'Segoe UI', sans-serif",
                        '&.Mui-focused': {
                          color: THEME_PURPLE,
                        }
                      }}
                    >
                      Group By
                    </InputLabel>
                    <Select
                      value={groupBy}
                      label="Group By"
                      onChange={(e) => {
                        setGroupBy(e.target.value);
                        setPage(0);
                      }}
                      sx={selectStyles}
                      MenuProps={selectMenuProps}
                    >
                      <MenuItem value="none">No Grouping</MenuItem>
                      <MenuItem value="customer_name">By Customer</MenuItem>
                      <MenuItem value="branch">By Branch</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>

                {/* Clear Filters */}
                {(searchValue || filterState !== 'all' || groupBy !== 'none' || searchType !== 'all') && (
                  <Grid item xs={12} md={2}>
                    <Button
                      fullWidth
                      variant="outlined"
                      onClick={() => {
                        setSearchValue('');
                        setFilterState('all');
                        setGroupBy('none');
                        setSearchType('all');
                        setPage(0);
                      }}
                      sx={{
                        borderColor: alpha(THEME_PURPLE, 0.3),
                        color: THEME_PURPLE,
                        borderRadius: '50px',
                        height: '100%',
                        fontFamily: "'Inter', 'Segoe UI', sans-serif",
                        fontWeight: 500,
                        textTransform: 'none',
                        '&:hover': {
                          borderColor: THEME_PURPLE,
                          backgroundColor: alpha(THEME_PURPLE, 0.04),
                        }
                      }}
                    >
                      Clear All
                    </Button>
                  </Grid>
                )}
              </Grid>
            </Box>

            {/* Table */}
            {loading ? (
              <Box
                display="flex"
                justifyContent="center"
                alignItems="center"
                sx={{ py: 10 }}
              >
                <CircularProgress sx={{ color: THEME_PURPLE }} />
              </Box>
            ) : (
              <>
                <Box
                  sx={{
                    backgroundColor: 'white',
                    borderRadius: '24px',
                    overflow: 'hidden',
                    boxShadow: '0 8px 32px rgba(126, 87, 194, 0.12)',
                    border: '1px solid rgba(126, 87, 194, 0.08)',
                  }}
                >
                  <Table>
                    <TableHead>
                      <TableRow sx={{ backgroundColor: alpha(THEME_PURPLE, 0.04) }}>
                        <TableCell sx={{
                          fontWeight: 600,
                          color: '#2d2d2d',
                          fontFamily: "'Inter', 'Segoe UI', sans-serif",
                          fontSize: '14px',
                          py: 2.5,
                        }}>
                          Order Ref
                        </TableCell>
                        {groupBy !== 'customer_name' && (
                          <TableCell sx={{
                            fontWeight: 600,
                            color: '#2d2d2d',
                            fontFamily: "'Inter', 'Segoe UI', sans-serif",
                            fontSize: '14px',
                          }}>
                            Customer
                          </TableCell>
                        )}
                        <TableCell sx={{
                          fontWeight: 600,
                          color: '#2d2d2d',
                          fontFamily: "'Inter', 'Segoe UI', sans-serif",
                          fontSize: '14px',
                        }}>
                          Phone
                        </TableCell>
                        <TableCell sx={{
                          fontWeight: 600,
                          color: '#2d2d2d',
                          fontFamily: "'Inter', 'Segoe UI', sans-serif",
                          fontSize: '14px',
                        }}>
                          Area
                        </TableCell>
                        <TableCell sx={{
                          fontWeight: 600,
                          color: '#2d2d2d',
                          fontFamily: "'Inter', 'Segoe UI', sans-serif",
                          fontSize: '14px',
                        }}>
                          Date
                        </TableCell>
                        {groupBy !== 'branch' && (
                          <TableCell sx={{
                            fontWeight: 600,
                            color: '#2d2d2d',
                            fontFamily: "'Inter', 'Segoe UI', sans-serif",
                            fontSize: '14px',
                          }}>
                            Branch
                          </TableCell>
                        )}
                        <TableCell sx={{
                          fontWeight: 600,
                          color: '#2d2d2d',
                          fontFamily: "'Inter', 'Segoe UI', sans-serif",
                          fontSize: '14px',
                        }}>
                          Amount
                        </TableCell>
                        <TableCell sx={{
                          fontWeight: 600,
                          color: '#2d2d2d',
                          fontFamily: "'Inter', 'Segoe UI', sans-serif",
                          fontSize: '14px',
                        }}>
                          Status
                        </TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {groupBy !== 'none' ? (
                        Object.entries(groupedOrders).map(([groupName, groupOrders]) => (
                          <GroupRow
                            key={groupName}
                            groupName={groupName}
                            orders={groupOrders}
                            renderStatus={renderStatusChip}
                            onRowClick={handleRowClick}
                            groupBy={groupBy}
                          />
                        ))
                      ) : (
                        orders.map((row) => (
                          <TableRow
                            key={row.id}
                            hover
                            onClick={() => handleRowClick(row.id, row.state)}
                            sx={{
                              cursor: 'pointer',
                              transition: 'all 0.2s ease',
                              '&:hover': {
                                backgroundColor: alpha(THEME_PURPLE, 0.04),
                                transform: 'scale(1.002)',
                              },
                            }}
                          >
                            <TableCell sx={{
                              fontFamily: "'Inter', 'Segoe UI', sans-serif",
                              color: '#2d2d2d',
                              fontWeight: 600,
                            }}>
                              {row.name}
                            </TableCell>
                            {groupBy !== 'customer_name' && (
                              <TableCell sx={{
                                fontFamily: "'Inter', 'Segoe UI', sans-serif",
                                color: '#2d2d2d',
                              }}>
                                {row.customer_name}
                              </TableCell>
                            )}
                            <TableCell sx={{
                              fontFamily: "'Inter', 'Segoe UI', sans-serif",
                              color: '#666',
                            }}>
                              {row.phone || '-'}
                            </TableCell>
                            <TableCell sx={{
                              fontFamily: "'Inter', 'Segoe UI', sans-serif",
                              color: '#666',
                            }}>
                              {row.area || '-'}
                            </TableCell>
                            <TableCell sx={{
                              fontFamily: "'Inter', 'Segoe UI', sans-serif",
                              color: '#666',
                            }}>
                              {utcOdooToLocal(row.date)}
                            </TableCell>
                            {groupBy !== 'branch' && (
                              <TableCell sx={{
                                fontFamily: "'Inter', 'Segoe UI', sans-serif",
                                color: '#666',
                              }}>
                                {row.branch || '-'}
                              </TableCell>
                            )}
                            <TableCell sx={{
                              fontFamily: "'Inter', 'Segoe UI', sans-serif",
                              color: THEME_PURPLE,
                              fontWeight: 600,
                            }}>
                              {row.amount_total} {row.currency || '$'}
                            </TableCell>
                            <TableCell>
                              {renderStatusChip(row.state)}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </Box>

                {groupBy === 'none' && (
                  <Box
                    sx={{
                      mt: 3,
                      display: 'flex',
                      justifyContent: 'flex-end',
                    }}
                  >
                    <Box
                      sx={{
                        backgroundColor: 'white',
                        borderRadius: '50px',
                        px: 2,
                        boxShadow: '0 4px 16px rgba(126, 87, 194, 0.08)',
                      }}
                    >
                      <TablePagination
                        component="div"
                        count={totalCount}
                        page={page}
                        onPageChange={handleChangePage}
                        rowsPerPage={rowsPerPage}
                        onRowsPerPageChange={handleChangeRowsPerPage}
                        sx={{
                          fontFamily: "'Inter', 'Segoe UI', sans-serif",
                          '& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows': {
                            fontFamily: "'Inter', 'Segoe UI', sans-serif",
                          },
                          '& .MuiTablePagination-select': {
                            fontFamily: "'Inter', 'Segoe UI', sans-serif",
                          },
                        }}
                      />
                    </Box>
                  </Box>
                )}
              </>
            )}
          </Box>
        </Fade>
      </Container>
    </Box>
  );
}

function GroupRow({ groupName, orders, renderStatus, onRowClick, groupBy }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <TableRow
        sx={{
          backgroundColor: alpha(THEME_PURPLE, 0.02),
          '&:hover': {
            backgroundColor: alpha(THEME_PURPLE, 0.04),
          }
        }}
      >
        <TableCell colSpan={8}>
          <Box display="flex" alignItems="center">
            <IconButton
              size="small"
              onClick={() => setOpen(!open)}
              sx={{
                color: THEME_PURPLE,
                transition: 'all 0.2s ease',
                '&:hover': {
                  backgroundColor: alpha(THEME_PURPLE, 0.1),
                  transform: 'scale(1.1)',
                }
              }}
            >
              {open ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
            </IconButton>
            <Typography
              variant="subtitle1"
              sx={{
                fontWeight: 600,
                ml: 1,
                fontFamily: "'Inter', 'Segoe UI', sans-serif",
                color: '#2d2d2d',
              }}
            >
              {groupName}
              <Chip
                label={`${orders.length} ${orders.length === 1 ? 'order' : 'orders'}`}
                size="small"
                sx={{
                  ml: 2,
                  backgroundColor: alpha(THEME_PURPLE, 0.1),
                  color: THEME_PURPLE,
                  fontFamily: "'Inter', 'Segoe UI', sans-serif",
                  fontWeight: 600,
                }}
              />
            </Typography>
          </Box>
        </TableCell>
      </TableRow>
      <TableRow>
        <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={8}>
          <Collapse in={open} timeout="auto" unmountOnExit>
            <Box sx={{ py: 2, px: 6 }}>
              <Table size="small">
                <TableBody>
                  {orders.map((historyRow) => (
                    <TableRow
                      key={historyRow.id}
                      hover
                      onClick={() => onRowClick(historyRow.id, historyRow.state)}
                      sx={{
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        '&:hover': {
                          backgroundColor: alpha(THEME_PURPLE, 0.04),
                        }
                      }}
                    >
                      <TableCell sx={{
                        fontFamily: "'Inter', 'Segoe UI', sans-serif",
                        color: '#2d2d2d',
                        fontWeight: 600,
                      }}>
                        {historyRow.name}
                      </TableCell>
                      {groupBy !== 'customer_name' && (
                        <TableCell sx={{
                          fontFamily: "'Inter', 'Segoe UI', sans-serif",
                          color: '#2d2d2d',
                        }}>
                          {historyRow.customer_name}
                        </TableCell>
                      )}
                      <TableCell sx={{
                        fontFamily: "'Inter', 'Segoe UI', sans-serif",
                        color: '#666',
                      }}>
                        {historyRow.phone || '-'}
                      </TableCell>
                      <TableCell sx={{
                        fontFamily: "'Inter', 'Segoe UI', sans-serif",
                        color: '#666',
                      }}>
                        {historyRow.area || '-'}
                      </TableCell>
                      <TableCell sx={{
                        fontFamily: "'Inter', 'Segoe UI', sans-serif",
                        color: '#666',
                      }}>
                        {utcOdooToLocal(historyRow.date)}
                      </TableCell>
                      {groupBy !== 'branch' && (
                        <TableCell sx={{
                          fontFamily: "'Inter', 'Segoe UI', sans-serif",
                          color: '#666',
                        }}>
                          {historyRow.branch || '-'}
                        </TableCell>
                      )}
                      <TableCell sx={{
                        fontFamily: "'Inter', 'Segoe UI', sans-serif",
                        color: THEME_PURPLE,
                        fontWeight: 600,
                      }}>
                        {historyRow.amount_total} {historyRow.currency || '$'}
                      </TableCell>
                      <TableCell>
                        {renderStatus(historyRow.state)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
    </>
  );
}