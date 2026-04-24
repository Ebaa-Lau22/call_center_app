import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import dayjs from "dayjs";
import {
  Box, Container, Typography, Table, TableBody, TableCell, Grid,
  TableHead, TableRow, Chip, MenuItem, Select, FormControl,
  InputLabel, Collapse, IconButton, Button, CircularProgress, TextField,
  Fade, alpha, Menu, Dialog, DialogTitle, DialogContent, Divider
} from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { DateField } from '@mui/x-date-pickers/DateField';
import enGB from 'date-fns/locale/en-GB';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import KeyboardArrowLeftIcon from '@mui/icons-material/KeyboardArrowLeft';
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import FilterListIcon from '@mui/icons-material/FilterList';
import ShoppingBagIcon from '@mui/icons-material/ShoppingBag';
import LogoutIcon from '@mui/icons-material/Logout';
import SettingsIcon from '@mui/icons-material/Settings';
import CardGiftcardIcon from '@mui/icons-material/CardGiftcard';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CloseIcon from '@mui/icons-material/Close';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import RedeemIcon from '@mui/icons-material/Redeem';
import { C, FONT, R } from '../../theme/ccTheme';

const P = C.purple;
const T = C.teal;
const bannerGradient = `linear-gradient(90deg, ${T}, ${P}, ${T})`;

export const utcOdooToLocal = (utcStr) => {
  if (!utcStr) return '';
  const isoUtc = utcStr.replace(' ', 'T') + 'Z';
  const d = new Date(isoUtc);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  const ss = String(d.getSeconds()).padStart(2, '0');
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
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [anchorEl, setAnchorEl] = useState(null);
  const [userName, setUserName] = useState('');

  // Loyalties dialog state
  const [loyaltyOpen, setLoyaltyOpen] = useState(false);
  const [loyalties, setLoyalties] = useState([]);
  const [loyaltyLoading, setLoyaltyLoading] = useState(false);
  const [selectedLoyalty, setSelectedLoyalty] = useState(null);

  useEffect(() => {
    const fetchStates = async () => {
      try {
        const resp = await axios.post('/api/call_center/order/states', {});
        if (resp.data.result.status === 'success') {
          setAvailableStates(resp.data.result.states);
        }
      } catch (e) {
        console.error('States fetch failed', e);
      }
    };
    fetchStates();
    const userData = JSON.parse(localStorage.getItem('user_data') || 'null');
    if (userData?.name) setUserName(userData.name);
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
          search_value: searchValue,
          date_from: dateFrom || undefined,
          date_to: dateTo || undefined,
        },
      };
      const response = await axios.post('/api/call_center/orders', payload);
      if (response.data.result?.status === 'success') {
        setOrders(response.data.result?.result);
        setTotalCount(response.data.result?.total_count);
      }
    } catch (error) {
      console.error('Error fetching orders', error);
    }
    setLoading(false);
  };

  const fetchGroupedOrders = async () => {
    setLoading(true);
    try {
      const response = await axios.post('/api/call_center/orders/group_by', {
        params: { group_by: groupBy },
      });
      if (response.data.result?.status === 'success') {
        setGroupedOrders(response.data.result?.result);
      }
    } catch (error) {
      console.error('Error fetching grouped orders', error);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (groupBy !== 'none') {
      fetchGroupedOrders();
    } else {
      fetchOrders();
    }
  }, [page, rowsPerPage, filterState, groupBy, searchValue, searchType, dateFrom, dateTo]);

  const handleChangePage = (delta) => setPage((p) => Math.max(0, p + delta));
  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleRowClick = (id, state) => {
    if (state?.toLowerCase() === 'draft') {
      navigate(`/orders/${id}/edit`);
    } else {
      navigate(`/orders/${id}`);
    }
  };

  const handleMenuOpen = (e) => setAnchorEl(e.currentTarget);
  const handleMenuClose = () => setAnchorEl(null);
  const handleLogoutClick = () => { handleMenuClose(); navigate('/login'); };

  const handleLoyaltiesClick = async () => {
    handleMenuClose();
    setLoyaltyOpen(true);
    setSelectedLoyalty(null);
    setLoyaltyLoading(true);
    try {
      const companyData = JSON.parse(localStorage.getItem('company_data') || 'null');
      const resp = await axios.post('/api/call_center/loyalties', {
        params: { company_id: companyData?.id },
      });
      console.info('Loyalties fetched:', resp.data.result.result);
      if (resp.data.result?.status === 'success') {
        setLoyalties(resp.data.result.result);
      }
    } catch (e) {
      console.error('Loyalties fetch failed', e);
    }
    setLoyaltyLoading(false);
  };

  const hasActiveFilters = searchValue || filterState !== 'all' || groupBy !== 'none' || searchType !== 'all' || dateFrom || dateTo;

  const clearFilters = () => {
    setSearchValue('');
    setFilterState('all');
    setGroupBy('none');
    setSearchType('all');
    setDateFrom('');
    setDateTo('');
    setPage(0);
  };

  const totalPages = Math.ceil(totalCount / rowsPerPage);
  const startRow = page * rowsPerPage + 1;
  const endRow = Math.min((page + 1) * rowsPerPage, totalCount);

  const getStatusColor = (state) => {
    const map = {
      draft: { bg: '#e3f2fd', color: '#1565c0' },
      wait_for_discount_approval: { bg: '#ede7f6', color: '#5e35b1' },
      not_prepared: { bg: '#fce4ec', color: '#c2185b' },
      in_preparation: { bg: '#fff3e0', color: '#ef6c00' },
      preparation_ended: { bg: '#e0f2f1', color: '#00897b' },
      confirmed: { bg: '#e8f5e9', color: '#2e7d32' },
      canceled: { bg: '#ffebee', color: '#c62828' },
    };
    return map[state] || { bg: '#f5f5f5', color: '#616161' };
  };

  const renderStatusChip = (state) => {
    const colors = getStatusColor(state);
    return (
      <Chip
        label={state?.replace(/_/g, ' ').toUpperCase()}
        sx={{
          backgroundColor: colors.bg,
          color: colors.color,
          fontFamily: FONT,
          fontWeight: 600,
          fontSize: '11px',
          height: '26px',
          borderRadius: '50px',
          letterSpacing: '0.3px',
        }}
      />
    );
  };

  const selectStyles = {
    borderRadius: R.pill,
    fontFamily: FONT,
    backgroundColor: 'white',
    transition: 'all 0.2s ease',
    '& .MuiOutlinedInput-notchedOutline': { borderColor: '#e8e4f0', borderWidth: '1.5px' },
    '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: alpha(P, 0.3) },
    '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: P, borderWidth: '2px', boxShadow: `0 0 0 4px ${alpha(P, 0.08)}` },
  };

  const purpleFieldSx = {
    '& .MuiOutlinedInput-root': {
      borderRadius: R.pill,
      backgroundColor: 'white',
      fontFamily: FONT,
      transition: 'all 0.2s ease',
      '& fieldset': { borderColor: '#e8e4f0', borderWidth: '1.5px' },
      '&:hover fieldset': { borderColor: alpha(P, 0.3) },
      '&.Mui-focused fieldset': { borderColor: P, borderWidth: '2px', boxShadow: `0 0 0 4px ${alpha(P, 0.08)}` },
    },
    '& .MuiInputLabel-root': { fontFamily: FONT, color: '#9e9e9e', '&.Mui-focused': { color: P } },
    '& .MuiInputBase-input': { fontFamily: FONT },
  };

  const labelSx = { fontFamily: FONT, '&.Mui-focused': { color: P } };

  const selectMenuProps = {
    PaperProps: {
      sx: {
        borderRadius: '16px',
        mt: 1,
        boxShadow: '0 8px 24px rgba(126, 87, 194, 0.15)',
        '& .MuiMenuItem-root': {
          fontFamily: FONT,
          borderRadius: '8px',
          mx: 1,
          my: 0.5,
          transition: 'all 0.2s ease',
          '&:hover': { backgroundColor: alpha(P, 0.08), transform: 'translateX(4px)' },
          '&.Mui-selected': { backgroundColor: alpha(P, 0.12), fontWeight: 600, '&:hover': { backgroundColor: alpha(P, 0.16) } },
        },
      },
    },
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: `linear-gradient(150deg, ${C.purpleBg} 0%, #ffffff 55%, ${alpha(T, 0.03)} 100%)`,
        py: 4,
        fontFamily: FONT,
        position: 'relative',
        overflow: 'hidden',
        '&::before': {
          content: '""',
          position: 'fixed',
          top: '-120px',
          right: '-120px',
          width: '420px',
          height: '420px',
          borderRadius: '50%',
          background: `radial-gradient(circle, ${alpha(P, 0.06)} 0%, transparent 70%)`,
          pointerEvents: 'none',
          zIndex: 0,
        },
        '&::after': {
          content: '""',
          position: 'fixed',
          bottom: '-80px',
          left: '-80px',
          width: '320px',
          height: '320px',
          borderRadius: '50%',
          background: `radial-gradient(circle, ${alpha(T, 0.05)} 0%, transparent 70%)`,
          pointerEvents: 'none',
          zIndex: 0,
        },
      }}
    >
      <Container maxWidth="xl" sx={{ position: 'relative', zIndex: 1 }}>
        <Fade in timeout={600}>
          <Box>

            {/* ── Page header ─────────────────────────────────────── */}
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                mb: 4,
                gap: 2,
              }}
            >
              {/* Left: icon + title */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box
                  sx={{
                    width: 48,
                    height: 48,
                    borderRadius: '14px',
                    backgroundColor: alpha(P, 0.08),
                    border: `1.5px solid ${alpha(P, 0.12)}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <ShoppingBagIcon sx={{ color: P, fontSize: 24 }} />
                </Box>
                <Box>
                  <Typography
                    variant="h5"
                    noWrap
                    sx={{ color: '#1e1e1e', fontWeight: 500, letterSpacing: '-0.3px', lineHeight: 1.3 }}
                  >
                    Sale Orders
                  </Typography>
                  <Typography noWrap variant="body2" sx={{ color: '#9e9e9e', fontSize: '13px', mt: 0.25 }}>
                    {userName ? `Welcome back, ${userName}` : 'Manage and track all sales orders'}
                  </Typography>
                </Box>
              </Box>

              {/* Right: settings + new order */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <IconButton
                  onClick={handleMenuOpen}
                  sx={{
                    color: T,
                    backgroundColor: alpha(T, 0.07),
                    borderRadius: '12px',
                    p: 1.25,
                    border: `1.5px solid ${alpha(T, 0.15)}`,
                    transition: 'all 0.3s ease',
                    '&:hover': { backgroundColor: alpha(T, 0.13), transform: 'rotate(22deg)' },
                  }}
                >
                  <SettingsIcon sx={{ fontSize: 22 }} />
                </IconButton>

                <Menu
                  anchorEl={anchorEl}
                  open={Boolean(anchorEl)}
                  onClose={handleMenuClose}
                  PaperProps={{
                    sx: {
                      borderRadius: '14px',
                      mt: 1.5,
                      boxShadow: '0 8px 28px rgba(126, 87, 194, 0.2)',
                      '& .MuiMenuItem-root': {
                        fontFamily: FONT,
                        fontSize: '14px',
                        transition: 'all 0.2s ease',
                        '&:hover': { backgroundColor: alpha(P, 0.08) },
                      },
                    },
                  }}
                  anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                  transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                >
                  <MenuItem onClick={handleLoyaltiesClick} sx={{ color: C.text, gap: 0 }}>
                    <CardGiftcardIcon sx={{ mr: 1.5, fontSize: 19 }} />
                    Loyalties
                  </MenuItem>
                  <Divider sx={{ my: 0.5, mx: 1, borderColor: alpha(P, 0.08) }} />
                  <MenuItem onClick={handleLogoutClick} sx={{ color: '#c62828' }}>
                    <LogoutIcon sx={{ mr: 1.5, fontSize: 19 }} />
                    Logout
                  </MenuItem>
                </Menu>

                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => navigate('/orders/new')}
                  sx={{
                    backgroundColor: P,
                    color: 'white',
                    borderRadius: R.pill,
                    px: 3.5,
                    py: 1.25,
                    fontWeight: 600,
                    fontSize: '14px',
                    fontFamily: FONT,
                    textTransform: 'none',
                    boxShadow: `0 4px 16px ${alpha(P, 0.35)}`,
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      backgroundColor: C.purpleDark,
                      boxShadow: `0 6px 24px ${alpha(P, 0.45)}`,
                      transform: 'translateY(-1px)',
                    },
                  }}
                >
                  New Order
                </Button>
              </Box>
            </Box>

            {/* ── Filters card ─────────────────────────────────────── */}
            <Box
              sx={{
                backgroundColor: alpha(P, 0.01),
                borderRadius: '20px',
                mb: 3,
                boxShadow: `0 4px 20px ${alpha(P, 0.09)}`,
                border: `1px solid ${alpha(P, 0.08)}`,
                position: 'relative',
                /* --- START OF DATE PICKER THEMING --- */
                '& .react-datepicker-wrapper': {
                  width: '100%',
                },
                '& .react-datepicker-popper': {
                  zIndex: 10, // Ensures it floats above other elements
                },
                '& .react-datepicker': {
                  fontFamily: FONT,
                  border: `1px solid ${alpha(C.purple, 0.15)}`,
                  borderRadius: '16px',
                  boxShadow: `0 12px 36px ${alpha(C.purple, 0.15)}`,
                },
                '& .react-datepicker__header': {
                  backgroundColor: 'white',
                  borderBottom: `1px solid ${alpha(C.purple, 0.1)}`,
                  borderTopLeftRadius: '16px',
                  borderTopRightRadius: '16px',
                  pt: 1.5,
                },
                '& .react-datepicker__current-month, & .react-datepicker-time__header, & .react-datepicker-year-header': {
                  color: '#1e1e1e',
                  fontWeight: 700,
                  fontSize: '15px',
                },
                '& .react-datepicker__day-name': {
                  color: C.teal,
                  fontWeight: 600,
                },
                '& .react-datepicker__day': {
                  borderRadius: '8px',
                  color: '#2d2d2d',
                  '&:hover': {
                    backgroundColor: alpha(C.purple, 0.15),
                    borderRadius: '8px',
                    color: '#000000',
                  },
                },
                '& .react-datepicker__day--selected, & .react-datepicker__day--in-selecting-range, & .react-datepicker__day--in-range': {
                  backgroundColor: alpha(C.purple, 0.8),
                  color: '#ffffff',
                  borderRadius: '8px',
                  fontWeight: 600,
                  '&:hover': {
                    backgroundColor: C.purple,
                    borderRadius: '8px',
                    color: '#ffffff',
                  },
                },
                '& .react-datepicker__day--keyboard-selected': {
                  backgroundColor: alpha(C.purple, 0.8),
                  color: '#ffffff',
                  borderRadius: '8px',
                  '&:hover': {
                    backgroundColor: C.purple,
                    color: '#ffffff',
                    borderRadius: '8px',
                  }
                },
                '& .react-datepicker__triangle': {
                  display: 'none',
                },

                /* --- END OF DATE PICKER THEMING --- */
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  top: 0, left: 0, right: 0,
                  height: '4px',
                },
              }}
            >
              <Box sx={{ p: 3, pt: 3.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2.5 }}>
                  <Box
                    sx={{
                      width: 28, height: 28,
                      borderRadius: '8px',
                      backgroundColor: alpha(P, 0.08),
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    <FilterListIcon sx={{ color: P, fontSize: 16 }} />
                  </Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#2d2d2d', fontFamily: FONT }}>
                    Filters & Search
                  </Typography>
                  {hasActiveFilters && (
                    <Chip
                      label="Active"
                      size="small"
                      sx={{
                        ml: 0.5,
                        height: '20px',
                        fontSize: '10px',
                        fontWeight: 700,
                        backgroundColor: alpha(P, 0.1),
                        color: P,
                        fontFamily: FONT,
                        letterSpacing: '0.4px',
                      }}
                    />
                  )}
                </Box>

                <Grid container spacing={2}>
                  <Grid item xs={12} md={3}>
                    <TextField
                      placeholder="Search orders..."
                      size="medium"
                      fullWidth
                      value={searchValue}
                      onChange={(e) => setSearchValue(e.target.value)}
                      disabled={groupBy !== 'none'}
                      sx={purpleFieldSx}
                      InputProps={{
                        startAdornment: <SearchIcon sx={{ color: alpha(P, 0.5), mr: 1, fontSize: 20 }} />,
                      }}
                    />
                  </Grid>

                  <Grid item xs={12} md={2}>
                    <FormControl fullWidth size="medium">
                      <InputLabel sx={labelSx}>Search By</InputLabel>
                      <Select
                        value={searchType}
                        label="Search By"
                        onChange={(e) => { setSearchType(e.target.value); setPage(0); }}
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

                  <Grid item xs={12} md={2}>
                    <DatePicker
                      selected={dateFrom ? new Date(dateFrom) : null}
                      onChange={(date) => {
                        setDateFrom(date ? dayjs(date).format("YYYY-MM-DD") : "");
                        setPage(0);
                      }}
                      dateFormat="dd/MM/yyyy"
                      customInput={
                        <TextField
                          label="Date From"
                          fullWidth
                          size="medium"
                          sx={purpleFieldSx}
                          disabled={groupBy !== 'none'}
                          InputLabelProps={{ shrink: true }}
                        />
                      }
                    />
                  </Grid>

                  <Grid item xs={12} md={2}>
                    <DatePicker
                      selected={dateTo ? new Date(dateTo) : null}
                      onChange={(date) => {
                        setDateTo(date ? dayjs(date).format("YYYY-MM-DD") : "");
                        setPage(0);
                      }}
                      dateFormat="dd/MM/yyyy"
                      customInput={
                        <TextField
                          label="Date To"
                          fullWidth
                          size="medium"
                          sx={purpleFieldSx}
                          disabled={groupBy !== 'none'}
                          InputLabelProps={{ shrink: true }}
                        />
                      }
                    />
                  </Grid>

                  <Grid item xs={12} md={2}>
                    <FormControl fullWidth size="medium">
                      <InputLabel sx={labelSx}>Status</InputLabel>
                      <Select
                        value={filterState}
                        label="Status"
                        onChange={(e) => { setFilterState(e.target.value); setPage(0); }}
                        disabled={groupBy !== 'none'}
                        sx={selectStyles}
                        MenuProps={selectMenuProps}
                      >
                        <MenuItem value="all"><em>All Orders</em></MenuItem>
                        {availableStates.map((s) => (
                          <MenuItem key={s.key} value={s.key}>{s.label}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>

                  <Grid item xs={12} md={2}>
                    <FormControl fullWidth size="medium">
                      <InputLabel sx={labelSx}>Group By</InputLabel>
                      <Select
                        value={groupBy}
                        label="Group By"
                        onChange={(e) => { setGroupBy(e.target.value); setPage(0); }}
                        sx={selectStyles}
                        MenuProps={selectMenuProps}
                      >
                        <MenuItem value="none">No Grouping</MenuItem>
                        <MenuItem value="customer_name">By Customer</MenuItem>
                        <MenuItem value="branch">By Branch</MenuItem>
                        <MenuItem value="day">By Day</MenuItem>
                        <MenuItem value="month">By Month</MenuItem>
                        <MenuItem value="year">By Year</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>

                  {hasActiveFilters && (
                    <Grid item xs={12} md={1}>
                      <Button
                        fullWidth
                        variant="outlined"
                        onClick={clearFilters}
                        sx={{
                          borderColor: alpha(P, 0.25),
                          color: P,
                          borderRadius: R.pill,
                          height: '56px',
                          fontFamily: FONT,
                          fontWeight: 500,
                          fontSize: '13px',
                          textTransform: 'none',
                          '&:hover': { borderColor: P, backgroundColor: alpha(P, 0.04) },
                        }}
                      >
                        Clear
                      </Button>
                    </Grid>
                  )}
                </Grid>
              </Box>
            </Box>

            {/* ── Table ───────────────────────────────────────────── */}
            {loading ? (
              <Box display="flex" justifyContent="center" alignItems="center" sx={{ py: 10 }}>
                <CircularProgress sx={{ color: P }} size={36} />
              </Box>
            ) : (
              <>
                <Box
                  sx={{
                    backgroundColor: 'white',
                    borderRadius: '20px',
                    overflow: 'hidden',
                    boxShadow: `0 4px 24px ${alpha(P, 0.1)}`,
                    border: `1px solid ${alpha(P, 0.07)}`,
                  }}
                >
                  <Table>
                    <TableHead>
                      <TableRow
                        sx={{
                          background: `linear-gradient(90deg, ${alpha(P, 0.05)} 0%, ${alpha(T, 0.04)} 100%)`,
                          borderBottom: `2px solid ${alpha(P, 0.08)}`,
                        }}
                      >
                        {['Order Ref', 'Customer', 'Phone', 'Area', 'Order Date', 'Commit Date', 'Branch', 'Amount', 'Status']
                          .filter((col) => {
                            if (col === 'Customer' && groupBy === 'customer_name') return false;
                            if (col === 'Branch' && groupBy === 'branch') return false;
                            return true;
                          })
                          .map((col, i) => (
                            <TableCell
                              key={col}
                              sx={{
                                fontWeight: 700,
                                color: '#3a3a3a',
                                fontFamily: FONT,
                                fontSize: '12px',
                                letterSpacing: '0.6px',
                                textTransform: 'uppercase',
                                py: 2,
                              }}
                            >
                              {col}
                            </TableCell>
                          ))}
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
                        orders.map((row, idx) => (
                          <TableRow
                            key={row.id}
                            hover
                            onClick={() => handleRowClick(row.id, row.state)}
                            sx={{
                              cursor: 'pointer',
                              transition: 'background-color 0.18s ease',
                              backgroundColor: idx % 2 === 0 ? 'white' : alpha(P, 0.012),
                              '&:hover': {
                                backgroundColor: alpha(T, 0.06),
                              },
                            }}
                          >
                            <TableCell sx={{ fontFamily: FONT, color: '#1e1e1e', fontWeight: 600, fontSize: '13.5px' }}>{row.name}</TableCell>
                            {groupBy !== 'customer_name' && (
                              <TableCell sx={{ fontFamily: FONT, color: '#2d2d2d', fontSize: '13.5px' }}>{row.customer_name}</TableCell>
                            )}
                            <TableCell sx={{ fontFamily: FONT, color: '#666', fontSize: '13px' }}>{row.phone || '-'}</TableCell>
                            <TableCell sx={{ fontFamily: FONT, color: '#666', fontSize: '13px' }}>{row.area || '-'}</TableCell>
                            <TableCell sx={{ fontFamily: FONT, color: '#666', fontSize: '13px' }}>{utcOdooToLocal(row.date)}</TableCell>
                            <TableCell sx={{ fontFamily: FONT, color: '#666', fontSize: '13px' }}>
                              {utcOdooToLocal(row.commitment_date) || '-'}
                            </TableCell>
                            {groupBy !== 'branch' && (
                              <TableCell sx={{ fontFamily: FONT, color: '#666', fontSize: '13px' }}>{row.branch || '-'}</TableCell>
                            )}
                            <TableCell sx={{ fontFamily: FONT, color: P, fontWeight: 700, fontSize: '13.5px' }}>
                              {Number(row.amount_total).toFixed(2)} {row.currency || '$'}
                            </TableCell>
                            <TableCell>{renderStatusChip(row.state)}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </Box>

                {/* ── Pagination ───────────────────────────────────── */}
                {groupBy === 'none' && totalCount > 0 && (
                  <Box
                    sx={{
                      mt: 2.5,
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      backgroundColor: 'white',
                      borderRadius: '16px',
                      px: 3,
                      py: 1.75,
                      boxShadow: `0 2px 12px ${alpha(P, 0.07)}`,
                      border: `1px solid ${alpha(P, 0.07)}`,
                    }}
                  >
                    <Typography variant="body2" sx={{ fontFamily: FONT, color: '#888', fontSize: '13px' }}>
                      Showing{' '}
                      <Box component="span" sx={{ color: '#2d2d2d', fontWeight: 600 }}>{startRow}–{endRow}</Box>
                      {' '}of{' '}
                      <Box component="span" sx={{ color: '#2d2d2d', fontWeight: 600 }}>{totalCount}</Box>
                      {' '}orders
                    </Typography>

                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body2" sx={{ fontFamily: FONT, color: '#888', fontSize: '13px', whiteSpace: 'nowrap' }}>
                          Rows per page
                        </Typography>
                        <Select
                          value={rowsPerPage}
                          onChange={handleChangeRowsPerPage}
                          size="small"
                          sx={{
                            fontFamily: FONT,
                            fontSize: '13px',
                            borderRadius: '10px',
                            '& .MuiOutlinedInput-notchedOutline': { borderColor: alpha(P, 0.2) },
                            '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: alpha(P, 0.4) },
                            '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: P },
                            '& .MuiSelect-select': { py: 0.75, px: 1.5 },
                          }}
                          MenuProps={selectMenuProps}
                        >
                          {[10, 25, 50].map((n) => (
                            <MenuItem key={n} value={n} sx={{ fontFamily: FONT, fontSize: '13px' }}>{n}</MenuItem>
                          ))}
                        </Select>
                      </Box>

                      <Box
                        sx={{
                          width: '1px',
                          height: '20px',
                          backgroundColor: alpha(P, 0.12),
                        }}
                      />

                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Typography variant="body2" sx={{ fontFamily: FONT, color: '#888', fontSize: '13px' }}>
                          Page{' '}
                          <Box component="span" sx={{ color: '#2d2d2d', fontWeight: 600 }}>{page + 1}</Box>
                          {' '}of {totalPages}
                        </Typography>

                        <IconButton
                          onClick={() => handleChangePage(-1)}
                          disabled={page === 0}
                          size="small"
                          sx={{
                            borderRadius: '10px',
                            border: `1.5px solid ${page === 0 ? alpha(P, 0.1) : alpha(P, 0.22)}`,
                            color: page === 0 ? alpha(P, 0.25) : P,
                            p: 0.5,
                            transition: 'all 0.2s ease',
                            '&:hover:not(:disabled)': {
                              backgroundColor: alpha(T, 0.08),
                              borderColor: T,
                              color: T,
                            },
                          }}
                        >
                          <KeyboardArrowLeftIcon sx={{ fontSize: 18 }} />
                        </IconButton>

                        <IconButton
                          onClick={() => handleChangePage(1)}
                          disabled={page >= totalPages - 1}
                          size="small"
                          sx={{
                            borderRadius: '10px',
                            border: `1.5px solid ${page >= totalPages - 1 ? alpha(P, 0.1) : alpha(P, 0.22)}`,
                            color: page >= totalPages - 1 ? alpha(P, 0.25) : P,
                            p: 0.5,
                            transition: 'all 0.2s ease',
                            '&:hover:not(:disabled)': {
                              backgroundColor: alpha(T, 0.08),
                              borderColor: T,
                              color: T,
                            },
                          }}
                        >
                          <KeyboardArrowRightIcon sx={{ fontSize: 18 }} />
                        </IconButton>
                      </Box>
                    </Box>
                  </Box>
                )}
              </>
            )}
          </Box>
        </Fade>

        {/* ── Loyalties Dialog ─────────────────────────────────── */}
        <Dialog
          open={loyaltyOpen}
          onClose={() => { setLoyaltyOpen(false); setSelectedLoyalty(null); }}
          maxWidth="md"
          fullWidth
          PaperProps={{
            sx: {
              borderRadius: '24px',
              p: 1,
              // lighter, neutral shadow — just a hint of pink
              boxShadow: `0 12px 36px rgba(0,0,0,0.10), 0 2px 8px ${alpha(C.pink, 0.08)}`,
              border: '1px solid #ebebeb',
              overflow: 'hidden',
              position: 'relative',
              // pink lives only in the top banner strip
              '&::before': {
                content: '""',
                position: 'absolute',
                top: 0, left: 0, right: 0,
                height: '4px',
                background: `linear-gradient(90deg, ${C.pink}, #f48fb1, ${C.pink})`,
              },
            },
          }}
        >
          <DialogTitle sx={{ pt: 3, pb: 1.5, display: 'flex', alignItems: 'center', gap: 1.5, pr: 6 }}>
            {selectedLoyalty ? (
              <IconButton
                size="small"
                onClick={() => setSelectedLoyalty(null)}
                sx={{
                  color: C.mutedDark,
                  border: '1.5px solid #e0e0e0',
                  borderRadius: R.soft,
                  p: '4px',
                  '&:hover': { backgroundColor: '#f5f5f5', borderColor: '#bdbdbd' },
                }}
              >
                <ArrowBackIcon fontSize="small" />
              </IconButton>
            ) : (
              // icon badge — neutral background, pink icon only
              <Box
                sx={{
                  width: 36, height: 36,
                  borderRadius: R.soft,
                  backgroundColor: '#f5f5f5',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <CardGiftcardIcon sx={{ color: C.pink, fontSize: 20 }} />
              </Box>
            )}
            <Box>
              <Typography sx={{ fontFamily: FONT, fontWeight: 700, fontSize: '17px', color: C.text, lineHeight: 1.2 }}>
                {selectedLoyalty ? selectedLoyalty.name : 'Loyalty Programs'}
              </Typography>
              <Typography sx={{ fontFamily: FONT, fontSize: '12px', color: C.mutedDark, fontWeight: 400, mt: 0.25 }}>
                {selectedLoyalty ? 'Conditions & Rewards' : `${loyalties.length} active program${loyalties.length !== 1 ? 's' : ''}`}
              </Typography>
            </Box>
            <IconButton
              size="small"
              onClick={() => { setLoyaltyOpen(false); setSelectedLoyalty(null); }}
              sx={{ position: 'absolute', right: 14, top: 14, color: C.muted, '&:hover': { color: C.text, backgroundColor: '#f5f5f5' } }}
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          </DialogTitle>

          <DialogContent sx={{ pt: 0.5, pb: 3 }}>
            {loyaltyLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
                <CircularProgress sx={{ color: C.pink }} size={32} />
              </Box>
            ) : !selectedLoyalty ? (
              /* ── Program list ── */
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mt: 1 }}>
                {loyalties.length === 0 ? (
                  <Typography sx={{ fontFamily: FONT, color: C.muted, textAlign: 'center', py: 4, fontSize: '14px' }}>
                    No active loyalty programs found.
                  </Typography>
                ) : loyalties.map((prog) => (
                  <Box
                    key={prog.id}
                    onClick={() => setSelectedLoyalty(prog)}
                    sx={{
                      border: '1.5px solid #ebebeb',
                      borderRadius: '14px',
                      px: 2.5,
                      py: 1.75,
                      cursor: 'pointer',
                      transition: 'all 0.18s ease',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 2,
                      '&:hover': {
                        borderColor: '#d0d0d0',
                        backgroundColor: '#fafafa',
                        transform: 'translateX(3px)',
                      },
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      {/* icon badge — neutral bg, pink icon */}
                      <Box
                        sx={{
                          width: 38, height: 38,
                          borderRadius: '10px',
                          backgroundColor: '#f5f5f5',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        <RedeemIcon sx={{ color: C.pink, fontSize: 20 }} />
                      </Box>
                      <Box>
                        <Typography sx={{ fontFamily: FONT, fontWeight: 600, fontSize: '14px', color: C.text }}>
                          {prog.name}
                        </Typography>
                        <Typography sx={{ fontFamily: FONT, fontSize: '12px', color: C.mutedDark, mt: 0.2 }}>
                          {prog.conditions.length} condition{prog.conditions.length !== 1 ? 's' : ''} · {prog.rewards.length} reward{prog.rewards.length !== 1 ? 's' : ''}
                        </Typography>
                      </Box>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0 }}>
                      {/* pink chip — one intentional accent */}
                      <Chip
                        label="Buy X Get Y"
                        size="small"
                        sx={{ backgroundColor: alpha(C.pink, 0.1), color: C.pink, fontFamily: FONT, fontWeight: 600, fontSize: '11px', height: '24px', borderRadius: '50px' }}
                      />
                      <KeyboardArrowRightIcon sx={{ color: '#bdbdbd', fontSize: 20 }} />
                    </Box>
                  </Box>
                ))}
              </Box>
            ) : (
              /* ── Program detail ── */
              <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 2.5 }}>

                {/* Conditions */}
                <Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                    {/* pink section icon — intentional accent */}
                    <CheckCircleOutlineIcon sx={{ color: C.pink, fontSize: 18 }} />
                    <Typography sx={{ fontFamily: FONT, fontWeight: 700, fontSize: '12px', color: C.mutedDark, textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                      Conditions
                    </Typography>
                  </Box>
                  {selectedLoyalty.conditions.map((cond, ci) => (
                    <Box
                      key={ci}
                      sx={{ border: '1px solid #ebebeb', borderRadius: '12px', overflow: 'hidden', mb: 1.5 }}
                    >
                      {/* meta bar — neutral background */}
                      <Box
                        sx={{
                          px: 2, py: 1.25,
                          backgroundColor: '#fafafa',
                          borderBottom: '1px solid #f0f0f0',
                          display: 'flex', gap: 3,
                        }}
                      >
                        {cond.minimum_qty > 0 && (
                          <Box>
                            <Typography sx={{ fontFamily: FONT, fontSize: '11px', color: C.muted, textTransform: 'uppercase', letterSpacing: '0.4px' }}>Min Qty</Typography>
                            {/* pink for the key value only */}
                            <Typography sx={{ fontFamily: FONT, fontWeight: 700, fontSize: '14px', color: C.pink }}>{cond.minimum_qty}</Typography>
                          </Box>
                        )}
                        {cond.minimum_amount > 0 && (
                          <Box>
                            <Typography sx={{ fontFamily: FONT, fontSize: '11px', color: C.muted, textTransform: 'uppercase', letterSpacing: '0.4px' }}>Min Amount</Typography>
                            <Typography sx={{ fontFamily: FONT, fontWeight: 700, fontSize: '14px', color: C.pink }}>{cond.minimum_amount} {selectedLoyalty.currency}</Typography>
                          </Box>
                        )}
                        {cond.credit_points > 0 && (
                          <Box>
                            <Typography sx={{ fontFamily: FONT, fontSize: '11px', color: C.muted, textTransform: 'uppercase', letterSpacing: '0.4px' }}>Points Earned</Typography>
                            <Typography sx={{ fontFamily: FONT, fontWeight: 700, fontSize: '14px', color: C.pink }}>{cond.credit_points}</Typography>
                          </Box>
                        )}
                      </Box>
                      {cond.products.length > 0 && (
                        <Table size="small">
                          <TableHead>
                            <TableRow sx={{ backgroundColor: '#fafafa' }}>
                              {['Product', 'Price', 'Stock'].map((h) => (
                                <TableCell key={h} sx={{ fontFamily: FONT, fontWeight: 600, fontSize: '12px', color: C.mutedDark, borderBottom: '1px solid #f0f0f0', py: 1 }}>{h}</TableCell>
                              ))}
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {cond.products.map((p, pi, arr) => (
                              <TableRow key={pi} sx={{ '&:hover': { backgroundColor: '#fafafa' }, borderBottom: pi < arr.length - 1 ? '1px solid #f5f5f5' : 'none' }}>
                                <TableCell sx={{ fontFamily: FONT, fontSize: '13px', color: C.text, fontWeight: 500, border: 'none' }}>{p.name}</TableCell>
                                {/* pink for the price value */}
                                <TableCell sx={{ fontFamily: FONT, fontSize: '13px', color: C.pink, fontWeight: 700, border: 'none' }}>{p.price} {p.currency}</TableCell>
                                <TableCell sx={{ fontFamily: FONT, fontSize: '13px', color: C.mutedDark, border: 'none' }}>{p.stock_qty}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      )}
                    </Box>
                  ))}
                </Box>

                <Divider sx={{ borderColor: '#f0f0f0' }} />

                {/* Rewards */}
                <Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                    <RedeemIcon sx={{ color: C.pink, fontSize: 18 }} />
                    <Typography sx={{ fontFamily: FONT, fontWeight: 700, fontSize: '12px', color: C.mutedDark, textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                      Rewards
                    </Typography>
                  </Box>
                  {selectedLoyalty.rewards.map((rew, ri) => (
                    <Box
                      key={ri}
                      sx={{ border: '1px solid #ebebeb', borderRadius: '12px', overflow: 'hidden', mb: 1.5 }}
                    >
                      <Box
                        sx={{
                          px: 2, py: 1.25,
                          backgroundColor: '#fafafa',
                          borderBottom: '1px solid #f0f0f0',
                        }}
                      >
                        <Typography sx={{ fontFamily: FONT, fontSize: '11px', color: C.muted, textTransform: 'uppercase', letterSpacing: '0.4px' }}>Points Required</Typography>
                        <Typography sx={{ fontFamily: FONT, fontWeight: 700, fontSize: '14px', color: C.pink }}>{rew.reward_points}</Typography>
                      </Box>
                      {rew.products.length > 0 && (
                        <Table size="small">
                          <TableHead>
                            <TableRow sx={{ backgroundColor: '#fafafa' }}>
                              {['Product', 'Price', 'Stock'].map((h) => (
                                <TableCell key={h} sx={{ fontFamily: FONT, fontWeight: 600, fontSize: '12px', color: C.mutedDark, borderBottom: '1px solid #f0f0f0', py: 1 }}>{h}</TableCell>
                              ))}
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {rew.products.map((p, pi, arr) => (
                              <TableRow key={pi} sx={{ '&:hover': { backgroundColor: '#fafafa' }, borderBottom: pi < arr.length - 1 ? '1px solid #f5f5f5' : 'none' }}>
                                <TableCell sx={{ fontFamily: FONT, fontSize: '13px', color: C.text, fontWeight: 500, border: 'none' }}>{p.name}</TableCell>
                                <TableCell sx={{ fontFamily: FONT, fontSize: '13px', color: C.pink, fontWeight: 700, border: 'none' }}>{p.price} {p.currency}</TableCell>
                                <TableCell sx={{ fontFamily: FONT, fontSize: '13px', color: C.mutedDark, border: 'none' }}>{p.stock_qty}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      )}
                    </Box>
                  ))}
                </Box>
              </Box>
            )}
          </DialogContent>
        </Dialog>

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
          backgroundColor: alpha(P, 0.03),
          '&:hover': { backgroundColor: alpha(P, 0.05) },
        }}
      >
        <TableCell colSpan={9} sx={{ py: 1.25 }}>
          <Box display="flex" alignItems="center">
            <IconButton
              size="small"
              onClick={() => setOpen(!open)}
              sx={{
                color: P,
                transition: 'all 0.2s ease',
                borderRadius: '8px',
                '&:hover': { backgroundColor: alpha(P, 0.08) },
              }}
            >
              {open ? <KeyboardArrowUpIcon fontSize="small" /> : <KeyboardArrowDownIcon fontSize="small" />}
            </IconButton>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, ml: 1, fontFamily: FONT, color: '#2d2d2d', fontSize: '13.5px' }}>
              {groupName}
            </Typography>
            <Chip
              label={`${orders.length} ${orders.length === 1 ? 'order' : 'orders'}`}
              size="small"
              sx={{
                ml: 2,
                height: '22px',
                fontSize: '11px',
                backgroundColor: alpha(P, 0.1),
                color: P,
                fontFamily: FONT,
                fontWeight: 700,
                borderRadius: '50px',
              }}
            />
          </Box>
        </TableCell>
      </TableRow>

      <TableRow>
        <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={9}>
          <Collapse in={open} timeout="auto" unmountOnExit>
            <Box sx={{ py: 1.5, px: 5, borderLeft: `2px solid ${alpha(P, 0.1)}` }}>
              <Table size="small">
                <TableBody>
                  {orders.map((row) => (
                    <TableRow
                      key={row.id}
                      hover
                      onClick={() => onRowClick(row.id, row.state)}
                      sx={{
                        cursor: 'pointer',
                        transition: 'background-color 0.18s ease',
                        '&:hover': { backgroundColor: alpha(T, 0.06) },
                      }}
                    >
                      <TableCell sx={{ fontFamily: FONT, color: '#1e1e1e', fontWeight: 600, fontSize: '13px' }}>{row.name}</TableCell>
                      {groupBy !== 'customer_name' && (
                        <TableCell sx={{ fontFamily: FONT, color: '#2d2d2d', fontSize: '13px' }}>{row.customer_name}</TableCell>
                      )}
                      <TableCell sx={{ fontFamily: FONT, color: '#666', fontSize: '13px' }}>{row.phone || '-'}</TableCell>
                      <TableCell sx={{ fontFamily: FONT, color: '#666', fontSize: '13px' }}>{row.area || '-'}</TableCell>
                      <TableCell sx={{ fontFamily: FONT, color: '#666', fontSize: '13px' }}>{utcOdooToLocal(row.date)}</TableCell>
                      <TableCell sx={{ fontFamily: FONT, color: '#666', fontSize: '13px', fontWeight: 400 }}>
                        {utcOdooToLocal(row.commitment_date) || '-'}
                      </TableCell>
                      {groupBy !== 'branch' && (
                        <TableCell sx={{ fontFamily: FONT, color: '#666', fontSize: '13px' }}>{row.branch || '-'}</TableCell>
                      )}
                      <TableCell sx={{ fontFamily: FONT, color: P, fontWeight: 700, fontSize: '13px' }}>
                        {Number(row.amount_total).toFixed(2)} {row.currency || '$'}
                      </TableCell>
                      <TableCell>{renderStatus(row.state)}</TableCell>
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