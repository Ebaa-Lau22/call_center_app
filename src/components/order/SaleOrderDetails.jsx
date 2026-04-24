import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import dayjs from "dayjs";
import {
  Box, Grid, TextField, Typography, MenuItem, Button, Container,
  Divider, Fade, alpha, Dialog, DialogTitle, DialogContent,
  DialogActions, Chip, Switch,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import PersonIcon from '@mui/icons-material/Person';
import PhoneIcon from '@mui/icons-material/Phone';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import StoreIcon from '@mui/icons-material/Store';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import SignpostIcon from '@mui/icons-material/Signpost';
import LandscapeIcon from '@mui/icons-material/Landscape';
import MonetizationOnIcon from '@mui/icons-material/MonetizationOn';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import CancelIcon from '@mui/icons-material/Cancel';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ReplayIcon from '@mui/icons-material/Replay';
import ThumbUpAltIcon from '@mui/icons-material/ThumbUpAlt';
import ThumbDownAltIcon from '@mui/icons-material/ThumbDownAlt';
import AssignmentIcon from '@mui/icons-material/Assignment';
import PaymentIcon from '@mui/icons-material/Payment';

import OrderLinesReadOnly from './OrderLinesReadOnly';
import {
  C, FONT, R, bannerGradient, AppLoader, formFieldSx,
  formFieldDisabledSx, sharedMenuProps,
} from '../../theme/ccTheme';

// datetime helpers (same as OrderForm)
export const localToUtcOdooDatetime = (localStr) => {
  if (!localStr) return '';
  let datePart, timePart;
  if (localStr.includes('T')) { [datePart, timePart] = localStr.split('T'); }
  else { [datePart, timePart = '00:00:00'] = localStr.split(' '); }
  timePart = timePart ? `${timePart}:00` : '00:00:00';
  const [y, m, d] = datePart.split('-').map(Number);
  const [hh, mi, ss] = timePart.split(':').map(Number);
  return new Date(y, m - 1, d, hh, mi, ss).toISOString().slice(0, 19).replace('T', ' ');
};

export const utcOdooToLocal = (utcStr) => {
  if (!utcStr) return '';
  const d = new Date(utcStr.replace(' ', 'T') + 'Z');
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const todayDateStr = () => {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

const nowLocalDatetime = () => {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

// status chip colour map
const STATUS_COLORS = {
  draft: { bg: '#e3f2fd', color: '#1565c0' },
  wait_for_discount_approval: { bg: '#ede7f6', color: '#5e35b1' },
  not_prepared: { bg: '#fce4ec', color: '#c2185b' },
  in_preparation: { bg: '#fff3e0', color: '#ef6c00' },
  preparation_ended: { bg: '#e0f2f1', color: '#00897b' },
  confirmed: { bg: '#e8f5e9', color: '#2e7d32' },
  canceled: { bg: '#ffebee', color: '#c62828' },
};
const getStatusColor = (s) => STATUS_COLORS[s] || { bg: '#f5f5f5', color: '#616161' };

// ─────────────────────────────────────────────────────────────────────────────
export default function OrderDetailsReadOnly() {
  const navigate = useNavigate();
  const { id: orderId } = useParams();

  const companyData = JSON.parse(localStorage.getItem('company_data'));
  const userData = JSON.parse(localStorage.getItem('user_data'));
  const companyId = companyData?.id;
  const sessionCountry = companyData?.country;
  const sessionCountryId = companyData?.country_id;
  const sessionCurrency = companyData?.currency_symbol;
  const discountLineId = companyData?.discount_service?.id;
  const isCCManager = userData.isManager;
  const isCCEmp = !isCCManager;

  if (!userData?.isManager && !userData?.isCallCenterEmployee) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <Typography color="error">Access denied.</Typography>
      </Box>
    );
  }

  // --- state ---
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [busyAction, setBusyAction] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);

  const [customer, setCustomer] = useState({ id: '', name: '', phone: '', area: '', landmark: '', street: '', net_sale: '' });
  const [order, setOrder] = useState({
    deliveryTypeId: '', deliveryMethodId: '', deliveryCompanyOrderId: '',
    branch: '', scheduledDate: nowLocalDatetime(), deliveryCharge: 0,
    state: '', orderName: '', alreadyPaidOnline: false,
  });
  const [doctor, setDoctor] = useState({ id: '', doctor_name: '', doctor_phone: '', clinic_name: '' });
  const [hasPrescription, setHasPrescription] = useState(false);
  const [termsAndConditions, setTermsAndConditions] = useState('');
  const [orderLinesData, setOrderLinesData] = useState([]);
  const [warehousesData, setWarehousesData] = useState([]);
  const [deliveryTypesData, setDeliveryTypesData] = useState([]);
  const [areasData, setAreasData] = useState([]);
  const [productNotes, setProductNotes] = useState({});
  // --- derived ---
  const selectedTypeObj = useMemo(
    () => deliveryTypesData.find(t => String(t.id) === String(order.deliveryTypeId)),
    [deliveryTypesData, order.deliveryTypeId]
  );
  const selectedMethodObj = useMemo(
    () => selectedTypeObj?.methods?.find(m => String(m.id) === String(order.deliveryMethodId)),
    [selectedTypeObj, order.deliveryMethodId]
  );

  const isDiscountId = (id) => String(id) === String(discountLineId);

  const discountDetails = useMemo(() => {
    if (!discountLineId || !orderLinesData.length) return { discountValue: 0, maxAllowed: 0, difference: 0 };
    const dl = orderLinesData.find(l => isDiscountId(l.id));
    const dv = dl ? Math.abs((dl.price || 0) * (dl.qty || 1)) : 0;
    let maxAllowed = 0;
    orderLinesData.forEach(l => {
      if (isDiscountId(l.id)) return;
      maxAllowed += ((l.price || 0) * (l.qty || 0) * (l.max_discount ?? 0)) / 100;
    });
    return {
      discountValue: dv.toFixed(2),
      maxAllowed: maxAllowed.toFixed(2),
      difference: Math.max(0, dv - maxAllowed).toFixed(2),
    };
  }, [orderLinesData, discountLineId]);

  const areaName = useMemo(() => areasData.find(x => String(x.id) === String(customer.area))?.name || '', [areasData, customer.area]);
  const branchName = useMemo(() => warehousesData.find(x => String(x.id) === String(order.branch))?.name || '', [warehousesData, order.branch]);
  const deliveryTypeName = useMemo(() => deliveryTypesData.find(x => String(x.id) === String(order.deliveryTypeId))?.name || '', [deliveryTypesData, order.deliveryTypeId]);
  const deliveryMethodName = useMemo(() => {
    const t = deliveryTypesData.find(x => String(x.id) === String(order.deliveryTypeId));
    return t?.methods?.find(m => String(m.id) === String(order.deliveryMethodId))?.name || '';
  }, [deliveryTypesData, order.deliveryTypeId, order.deliveryMethodId]);

  // visibility flags
  const state = String(order.state || '').trim();
  const showTopDiscountBanner = state === 'wait_for_discount_approval';
  const showCancelBottom = state === 'wait_for_discount_approval' || state === 'not_prepared';
  const showResetBottom = state === 'not_prepared' || state === 'canceled';
  const showManagerTopButtons = showTopDiscountBanner && isCCManager;

  // --- fetch reference data on mount ---
  useEffect(() => {
    const fetchMeta = async () => {
      try {
        const [dtRes, areasRes, whRes] = await Promise.all([
          axios.post('/api/call_center/delivery/types', { params: {} }, { withCredentials: true }),
          axios.post('/api/call_center/areas', { params: { country_id: sessionCountryId } }, { withCredentials: true }),
          axios.post('/api/call_center/warehouses', {}, { withCredentials: true }),
        ]);
        if (dtRes.data.result?.status === 'success') setDeliveryTypesData(dtRes.data.result?.result || []);
        if (areasRes.data.result?.status === 'success') setAreasData(areasRes.data.result?.result || []);
        if (whRes.data.result?.status === 'success') setWarehousesData(whRes.data.result.warehouses || []);
      } catch { /* keep going — non-critical */ }
    };
    fetchMeta();
  }, [sessionCountryId]);

  // --- fetch order ---
  useEffect(() => {
    if (!orderId) { setLoadError('Missing order id'); setLoading(false); return; }
    const fetchOrder = async () => {
      try {
        setLoading(true);
        const res = await axios.post('/api/call_center/order/detail', { params: { company_id: companyId, order_id: orderId } }, { withCredentials: true });
        if (res.data.result.status !== 'success') { setLoadError('Failed to load order data'); return; }
        const data = res.data.result.result;

        setCustomer({
          id: data.customer?.id || '', name: data.customer?.name || '', phone: data.customer?.phone || '',
          area: data.customer?.area || '', landmark: data.customer?.landmark || '',
          street: data.customer?.street || '', net_sale: data.customer?.net_sale || '',
        });
        const cfg = data.order_config || {};
        setOrder({
          deliveryTypeId: cfg.delivery_type_id || '',
          deliveryMethodId: cfg.delivery_method_id || '',
          deliveryCompanyOrderId: cfg.delivery_company_order_id || '',
          branch: cfg.branch_id ? String(cfg.branch_id) : '',
          scheduledDate: utcOdooToLocal(data.order_info?.commitment_date) || nowLocalDatetime(),
          deliveryCharge: cfg.branch_delivery_charge || 0,
          state: data.order_info?.state || '',
          orderName: data.order_info?.name || '',
          alreadyPaidOnline: !!data.order_info?.already_paid_online,
        });
        setDoctor({ id: cfg.doctor_id || '', doctor_name: cfg.doctor_name || '', doctor_phone: cfg.doctor_phone || '', clinic_name: cfg.clinic_name || '' });
        setHasPrescription(!!cfg.doctor_id);
        setTermsAndConditions(cfg.terms_and_conditions || '');
        setOrderLinesData(data.lines || []);


        console.log('Fetched order lines:', data.lines);
        const notesFromLines = {};
        (data.lines || []).forEach(line => {
          if (line.note != '') notesFromLines[line.id] = line.note;
          if (line.is_loyalty) line.id = `reward_${line.id}`;
        });
        console.log('Fetched order lines after update:', data.lines);
        console.log('before notes done', notesFromLines);
        setProductNotes(notesFromLines);
        console.log('after Product notes:', notesFromLines);

        setLoadError(null);
      } catch (error) {
        console.error('Error fetching order details:', error);
        setLoadError('Error loading order. Redirecting...');
        setTimeout(() => navigate('/orders'), 2000);
      } finally {
        setLoading(false);
      }
    };
    fetchOrder();
  }, [orderId, navigate]);

  // --- actions ---
  const saveOrder = async (state) => {
    try {
      const custRes = await axios.post(
        '/api/call_center/customer/upsert',
        { params: { customer_data: { name: customer.name, phone: customer.phone, area_id: customer.area, country_id: sessionCountryId, street: customer.street, landmark: customer.landmark } } },
        { withCredentials: true }
      );
      if (custRes.data.result.status !== 'success') { alert('Failed to save customer: ' + custRes.data.result.message); return null; }
      const partnerId = custRes.data.result.customer.id;
      const res = await axios.post('/api/call_center/update_order', {
        params: {
          order_id: orderId, company_id: companyId, partner_id: partnerId,
          delivery_type_id: order.deliveryTypeId, delivery_method_id: order.deliveryMethodId,
          delivery_company_order_id: selectedMethodObj?.is_delivery_company ? order.deliveryCompanyOrderId : false,
          doctor_id: hasPrescription && doctor.id ? doctor.id : null,
          has_prescription: hasPrescription, branch: order.branch,
          scheduled_date: localToUtcOdooDatetime(order.scheduledDate),
          deliveryCharge: order.deliveryCharge,
          terms_and_conditions: termsAndConditions, state,
          lines: orderLinesData.map(l => ({ product_id: l.id, requested_qty: l.qty, price_unit: l.price })),
        }
      }, { withCredentials: true, headers: { 'Content-Type': 'application/json' } });
      if (res.data.result.status === 'success') return res.data.result;
      alert('Update failed: ' + res.data.result.message);
      return null;
    } catch { alert('An error occurred while saving.'); return null; }
  };

  const resetToDraft = async () => {
    try {
      setBusyAction(true);
      const res = await axios.post('/api/call_center/order/reset_to_draft', { params: { order_id: orderId } }, { withCredentials: true });
      const ok = res.data?.result?.status === 'success' || res.data?.status === 'success';
      if (!ok) { alert(res.data?.result?.message || 'Reset to draft failed'); return; }
      alert('Order has been reset to draft.');
      navigate('/orders');
    } catch { alert('Reset to draft failed.'); }
    finally { setBusyAction(false); }
  };

  const approveDiscount = async () => {
    const today = todayDateStr();
    const schedDate = order.scheduledDate.slice(0, 10);
    const nextState = schedDate > today ? 'draft' : 'not_prepared';
    try {
      setBusyAction(true);
      const result = await saveOrder(nextState);
      if (result) { alert(`Order ${result.order_name || order.orderName} approved.`); navigate('/orders'); }
    } finally { setBusyAction(false); }
  };

  const rejectDiscount = async () => {
    try {
      setBusyAction(true);
      if (discountLineId) {
        try {
          await axios.post('/api/call_center/order/remove_line', { params: { order_id: orderId, line_id: discountLineId } }, { withCredentials: true });
        } catch { /* fall through to UI removal */ }
        setOrderLinesData(prev => prev.filter(l => !isDiscountId(l.id)));
      }
      const res = await axios.post('/api/call_center/order/reset_to_draft', { params: { order_id: orderId } }, { withCredentials: true });
      const ok = res.data?.result?.status === 'success' || res.data?.status === 'success';
      if (!ok) { alert(res.data?.result?.message || 'Reset to draft failed'); return; }
      alert('Discount rejected. Order reset to draft.');
      navigate('/orders');
    } catch { alert('Failed to reject discount.'); }
    finally { setBusyAction(false); }
  };

  const confirmCancelOrder = async () => {
    setShowCancelDialog(false);
    try {
      setBusyAction(true);
      const result = await saveOrder('canceled');
      if (result) { alert(`Order ${result.order_name || order.orderName} has been cancelled.`); navigate('/orders'); }
    } finally { setBusyAction(false); }
  };

  // --- loading / error ---
  if (loading) return <AppLoader />;
  if (loadError) return (
    <Box sx={{ minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', flexDirection: 'column', backgroundColor: C.purpleBg }}>
      <Typography color="error" variant="h6">{loadError}</Typography>
      <Typography color="textSecondary">Redirecting to orders...</Typography>
    </Box>
  );

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <Box sx={{ minHeight: '100vh', background: `linear-gradient(135deg, ${C.purpleBg} 0%, #ffffff 100%)`, py: { xs: 2, sm: 4 }, px: { xs: 1, sm: 2 }, fontFamily: FONT }}>
      <Container maxWidth="lg" sx={{ px: { xs: 0, sm: 2 } }}>
        <Fade in timeout={600}>
          <Box>
            {/* top bar: back + order name + status */}
            <Box sx={{ mb: { xs: 3, sm: 4 }, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
              <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/orders')}
                sx={{ color: C.purple, fontFamily: FONT, fontWeight: 500, textTransform: 'none', fontSize: { xs: '13px', sm: '15px' }, '&:hover': { backgroundColor: alpha(C.purple, 0.08) } }}>
                Back to Orders
              </Button>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                {order.orderName && (
                  <Chip label={order.orderName} sx={{ backgroundColor: alpha(C.purple, 0.10), color: C.purple, fontFamily: FONT, fontWeight: 600, fontSize: '13px', height: '28px', borderRadius: R.pill }} />
                )}
                {state && (
                  <Chip label={state.replace(/_/g, ' ').toUpperCase()} sx={{ backgroundColor: getStatusColor(state).bg, color: getStatusColor(state).color, fontFamily: FONT, fontWeight: 600, fontSize: '13px', height: '28px', borderRadius: R.pill }} />
                )}
              </Box>
            </Box>

            {/* discount approval banner */}
            {showTopDiscountBanner && (
              <Fade in timeout={600}>
                <Box sx={{
                  backgroundColor: 'white', borderRadius: { xs: R.cardSm, sm: R.card },
                  p: { xs: 3, sm: 4 }, mb: 3,
                  boxShadow: '0 8px 32px rgba(126, 87, 194, 0.12)',
                  border: '1px solid rgba(126, 87, 194, 0.08)',
                  position: 'relative', overflow: 'hidden',
                  '&::before': { content: '""', position: 'absolute', top: 0, left: 0, right: 0, height: '5px', background: 'linear-gradient(90deg, #efb359, #f9a825)' },
                }}>
                  {/* employee view — waiting message */}
                  {isCCEmp && (
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
                      <Box sx={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#e65100', mt: 1, flexShrink: 0 }} />
                      <Box sx={{ flex: 1 }}>
                        <Typography sx={{ fontFamily: FONT, fontWeight: 700, color: '#e65100', fontSize: 15, mb: 1 }}>Waiting for Manager Approval</Typography>
                        <Typography sx={{ fontFamily: FONT, color: alpha('#000', 0.7), fontSize: 14, lineHeight: 1.6 }}>
                          This order has a discount request of{' '}
                          <Box component="span" sx={{ color: '#d32f2f', fontWeight: 700 }}>{discountDetails.discountValue} {sessionCurrency}</Box>
                          {' '}that exceeds the maximum allowed{' '}
                          <Box component="span" sx={{ color: '#f57c00', fontWeight: 700 }}>{discountDetails.maxAllowed} {sessionCurrency}</Box>
                          {' '}by{' '}
                          <Box component="span" sx={{ color: '#d32f2f', fontWeight: 700 }}>{discountDetails.difference} {sessionCurrency}</Box>.
                          <br />Manager approval is required before you can proceed.
                        </Typography>
                      </Box>
                    </Box>
                  )}

                  {/* manager view — approve / reject buttons */}
                  {showManagerTopButtons && (
                    <Box>
                      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5, mb: 3 }}>
                        <Box sx={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#e65100', mt: 1, flexShrink: 0 }} />
                        <Box sx={{ flex: 1 }}>
                          <Typography sx={{ fontFamily: FONT, fontWeight: 700, color: '#e65100', fontSize: 15, mb: 1 }}>Discount Approval Required</Typography>
                          <Typography sx={{ fontFamily: FONT, color: alpha('#000', 0.7), fontSize: 14, lineHeight: 1.6 }}>
                            Discount request of{' '}
                            <Box component="span" sx={{ color: '#d32f2f', fontWeight: 700 }}>{discountDetails.discountValue} {sessionCurrency}</Box>
                            {' '}exceeds the maximum allowed{' '}
                            <Box component="span" sx={{ color: '#f57c00', fontWeight: 700 }}>{discountDetails.maxAllowed} {sessionCurrency}</Box>
                            {' '}by{' '}
                            <Box component="span" sx={{ color: '#c62828', fontWeight: 700 }}>{discountDetails.difference} {sessionCurrency}</Box>.
                          </Typography>
                          <Typography sx={{ fontFamily: FONT, color: alpha('#000', 0.6), mt: 0.5, fontSize: 13 }}>
                            Approve to submit, or reject to remove the discount and reset to draft.
                          </Typography>
                        </Box>
                      </Box>
                      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                        <Button startIcon={<ThumbDownAltIcon />} onClick={rejectDiscount} disabled={busyAction} sx={{ border: `2px solid ${C.red}`, color: C.red, borderRadius: R.pill, px: 3.5, py: 1.2, fontWeight: 700, fontSize: '13px', fontFamily: FONT, textTransform: 'none', '&:hover': { backgroundColor: alpha(C.red, 0.08), borderColor: '#d32f2f' }, '&.Mui-disabled': { borderColor: alpha(C.red, 0.5), color: alpha(C.red, 0.5) } }}>
                          Reject Discount
                        </Button>
                        <Button startIcon={<ThumbUpAltIcon />} onClick={approveDiscount} disabled={busyAction} sx={{ backgroundColor: '#4caf50', color: 'white', borderRadius: R.pill, px: 3.5, py: 1.2, fontWeight: 700, fontSize: '13px', fontFamily: FONT, textTransform: 'none', boxShadow: '0 4px 12px rgba(76,175,80,0.25)', '&:hover': { backgroundColor: '#45a049', boxShadow: '0 6px 16px rgba(76,175,80,0.35)' }, '&.Mui-disabled': { backgroundColor: alpha('#4caf50', 0.5) } }}>
                          {busyAction ? 'Processing…' : 'Approve Discount'}
                        </Button>
                      </Box>
                    </Box>
                  )}
                </Box>
              </Fade>
            )}

            {/* main info card */}
            <Box sx={{
              backgroundColor: 'white', borderRadius: { xs: R.cardSm, sm: R.card },
              p: { xs: 3, sm: 6 }, mb: 3,
              boxShadow: '0 8px 32px rgba(126, 87, 194, 0.12)',
              border: '1px solid rgba(126, 87, 194, 0.08)',
              position: 'relative', overflow: 'hidden',
              '&::before': { content: '""', position: 'absolute', top: 0, left: 0, right: 0, height: '5px', background: bannerGradient },
            }}>

              {/* card header: title + paid online badge */}
              <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 5, flexWrap: 'wrap', gap: 2 }}>
                <Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                    <AssignmentIcon sx={{ color: C.purple, fontSize: { xs: 26, sm: 32 } }} />
                    <Typography variant="h4" sx={{ fontWeight: 700, color: C.text, fontFamily: FONT, letterSpacing: '-0.5px', fontSize: { xs: '24px', sm: '32px' } }}>
                      Order Details
                    </Typography>
                  </Box>
                  <Typography variant="body2" sx={{ color: C.muted, fontFamily: FONT, fontSize: { xs: '13px', sm: '14px' }, ml: { xs: 0, sm: '44px' } }}>
                    View order information
                  </Typography>
                </Box>

                {/* already paid online — read-only indicator */}
                <Box sx={{
                  display: 'flex', alignItems: 'center', gap: 1.5,
                  px: 2.5, py: 1.5, borderRadius: R.pill, userSelect: 'none',
                  border: `1.5px solid ${order.alreadyPaidOnline ? alpha(C.teal, 0.50) : '#e8e4f0'}`,
                  backgroundColor: order.alreadyPaidOnline ? alpha(C.teal, 0.06) : 'white',
                  flexShrink: 0,
                }}>
                  <PaymentIcon sx={{ fontSize: 20, color: order.alreadyPaidOnline ? C.teal : C.muted }} />
                  <Box>
                    <Typography sx={{ fontFamily: FONT, fontWeight: 600, fontSize: '13px', color: order.alreadyPaidOnline ? C.teal : C.mutedDark, lineHeight: 1.2 }}>Paid Online</Typography>
                    <Typography sx={{ fontFamily: FONT, fontSize: '11px', color: C.muted }}>{order.alreadyPaidOnline ? 'Yes' : 'No'}</Typography>
                  </Box>
                  <Switch checked={order.alreadyPaidOnline} disabled size="small"
                    sx={{ '& .MuiSwitch-switchBase.Mui-checked': { color: C.teal }, '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { backgroundColor: C.teal } }} />
                </Box>
              </Box>

              {/* customer details */}
              <Box sx={{ mb: 5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 3, gap: 1 }}>
                  <PersonIcon sx={{ color: C.purple, fontSize: { xs: 20, sm: 24 } }} />
                  <Typography variant="h6" sx={{ fontWeight: 600, color: C.purple, fontFamily: FONT, fontSize: { xs: '15px', sm: '18px' } }}>Customer Details</Typography>
                </Box>
                <Grid container spacing={{ xs: 2, sm: 3 }}>
                  <Grid item xs={12} md={6}>
                    <TextField label="Phone Number" value={customer.phone} fullWidth size="medium" disabled sx={formFieldDisabledSx} InputProps={{ startAdornment: <PhoneIcon sx={{ color: C.muted, mr: 1, fontSize: { xs: 18, sm: 20 } }} /> }} />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField label="Customer Name" value={customer.name} fullWidth size="medium" disabled sx={formFieldDisabledSx} InputProps={{ startAdornment: <PersonIcon sx={{ color: C.muted, mr: 1, fontSize: { xs: 18, sm: 20 } }} /> }} />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField select label="Area" value={customer.area || ''} fullWidth size="medium" disabled sx={{ ...formFieldDisabledSx, minWidth: '250px' }} SelectProps={sharedMenuProps} InputProps={{ startAdornment: <LocationOnIcon sx={{ color: C.muted, mr: 1, fontSize: { xs: 18, sm: 20 } }} /> }}>
                      {areasData.length > 0
                        ? areasData.map(a => <MenuItem key={a.id} value={a.id}>{a.name}</MenuItem>)
                        : <MenuItem disabled>{areaName || 'No areas available'}</MenuItem>}
                    </TextField>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField label="Country" value={sessionCountry || ''} fullWidth size="medium" disabled sx={formFieldDisabledSx} InputProps={{ startAdornment: <LocationOnIcon sx={{ color: C.muted, mr: 1, fontSize: { xs: 18, sm: 20 } }} /> }} />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField label="Landmark" value={customer.landmark} fullWidth size="medium" disabled sx={formFieldDisabledSx} InputProps={{ startAdornment: <LandscapeIcon sx={{ color: C.muted, mr: 1, fontSize: { xs: 18, sm: 20 } }} /> }} />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField label="Street" value={customer.street} fullWidth size="medium" disabled sx={formFieldDisabledSx} InputProps={{ startAdornment: <SignpostIcon sx={{ color: C.muted, mr: 1, fontSize: { xs: 18, sm: 20 } }} /> }} />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField label="Net Sale" value={customer.net_sale} fullWidth size="medium" disabled sx={formFieldDisabledSx} InputProps={{ startAdornment: <MonetizationOnIcon sx={{ color: C.muted, mr: 1, fontSize: { xs: 18, sm: 20 } }} /> }} />
                  </Grid>
                </Grid>
              </Box>

              <Divider sx={{ my: 5, borderColor: alpha(C.purple, 0.1) }} />

              {/* delivery & scheduling */}
              <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 3, gap: 1 }}>
                  <LocalShippingIcon sx={{ color: C.purple, fontSize: { xs: 20, sm: 24 } }} />
                  <Typography variant="h6" sx={{ fontWeight: 600, color: C.purple, fontFamily: FONT, fontSize: { xs: '15px', sm: '18px' } }}>Delivery & Scheduling</Typography>
                </Box>
                <Grid container spacing={{ xs: 2, sm: 3 }}>
                  <Grid item xs={12} md={6}>
                    <DatePicker
                      selected={order.scheduledDate ? new Date(order.scheduledDate) : null}
                      onChange={(date) =>
                        handleOrderChange("scheduledDate")({
                          target: {
                            value: date ? dayjs(date).format("YYYY-MM-DDTHH:mm") : ""
                          }
                        })
                      }
                      disabled
                      showTimeSelect
                      timeFormat="HH:mm"
                      timeIntervals={15}
                      dateFormat="dd/MM/yyyy HH:mm"
                      customInput={
                        <TextField
                          label="Scheduled Date & Time"
                          fullWidth
                          disabled
                          size="medium"
                          sx={formFieldDisabledSx}
                          InputLabelProps={{ shrink: true }}
                          InputProps={{
                            startAdornment: (
                              <CalendarTodayIcon
                                sx={{
                                  color: C.muted,
                                  mr: 1,
                                  fontSize: { xs: 18, sm: 20 },
                                  cursor: "pointer"
                                }}
                              />
                            )
                          }}
                        />
                      }
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField select label="Branch" value={order.branch} fullWidth size="medium" disabled sx={{ ...formFieldDisabledSx, minWidth: '250px' }} SelectProps={sharedMenuProps} InputProps={{ startAdornment: <StoreIcon sx={{ color: C.muted, mr: 1, fontSize: { xs: 18, sm: 20 } }} /> }}>
                      {warehousesData.length > 0
                        ? warehousesData.map(w => <MenuItem key={w.id} value={w.id}>{w.name}</MenuItem>)
                        : <MenuItem disabled>{branchName || 'No branches available'}</MenuItem>}
                    </TextField>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField select label="Delivery Type" value={order.deliveryTypeId} fullWidth size="medium" disabled sx={{ ...formFieldDisabledSx, minWidth: '250px' }} SelectProps={sharedMenuProps}>
                      {deliveryTypesData.length > 0
                        ? deliveryTypesData.map(t => <MenuItem key={t.id} value={t.id}>{t.name}</MenuItem>)
                        : <MenuItem disabled>{deliveryTypeName || '—'}</MenuItem>}
                    </TextField>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField select label="Delivery Method" value={order.deliveryMethodId} fullWidth size="medium" disabled sx={{ ...formFieldDisabledSx, minWidth: '250px' }} SelectProps={sharedMenuProps}>
                      {(selectedTypeObj?.methods || []).length > 0
                        ? selectedTypeObj.methods.map(m => <MenuItem key={m.id} value={m.id}>{m.name}</MenuItem>)
                        : <MenuItem disabled>{deliveryMethodName || '—'}</MenuItem>}
                    </TextField>
                  </Grid>
                  {selectedMethodObj?.is_delivery_company && (
                    <Grid item xs={12} md={6}>
                      <TextField label="Delivery Company Order ID" value={order.deliveryCompanyOrderId || ''} fullWidth size="medium" disabled sx={formFieldDisabledSx} />
                    </Grid>
                  )}
                </Grid>
              </Box>

              <Divider sx={{ my: 5, borderColor: alpha(C.purple, 0.1) }} />

              {/* prescription */}
              <Box sx={{ mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 3, gap: 1.5 }}>
                  <PersonIcon sx={{ color: C.purple, fontSize: { xs: 20, sm: 24 } }} />
                  <Typography variant="h6" sx={{ fontWeight: 600, color: C.purple, fontFamily: FONT, fontSize: { xs: '15px', sm: '18px' } }}>Prescription</Typography>
                  <Switch checked={hasPrescription} disabled size="small"
                    sx={{ ml: 0.5, '& .MuiSwitch-switchBase.Mui-checked': { color: C.teal }, '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { backgroundColor: C.teal } }} />
                </Box>

                {hasPrescription && doctor.id && (
                  <Grid container spacing={{ xs: 2, sm: 3 }}>
                    <Grid item xs={12} md={6}>
                      <TextField label="Doctor Name" value={doctor.doctor_name} fullWidth size="medium" disabled sx={formFieldDisabledSx} InputProps={{ startAdornment: <PersonIcon sx={{ color: C.muted, mr: 1, fontSize: { xs: 18, sm: 20 } }} /> }} />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField label="Doctor Phone" value={doctor.doctor_phone} fullWidth size="medium" disabled sx={formFieldDisabledSx} InputProps={{ startAdornment: <PhoneIcon sx={{ color: C.muted, mr: 1, fontSize: { xs: 18, sm: 20 } }} /> }} />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField label="Clinic Name" value={doctor.clinic_name} fullWidth size="medium" disabled sx={formFieldDisabledSx} InputProps={{ startAdornment: <StoreIcon sx={{ color: C.muted, mr: 1, fontSize: { xs: 18, sm: 20 } }} /> }} />
                    </Grid>
                  </Grid>
                )}
              </Box>
            </Box>

            {/* order lines — read only */}
            <OrderLinesReadOnly lines={orderLinesData} termsAndConditions={termsAndConditions} productNotes={productNotes} />

            {/* bottom action buttons */}
            {(showCancelBottom || showResetBottom) && (
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 4, gap: { xs: 1, sm: 2 }, flexWrap: 'wrap' }}>
                {showCancelBottom ? (
                  <Button startIcon={<CancelIcon />} onClick={() => setShowCancelDialog(true)} disabled={busyAction} sx={{ border: `2px solid ${C.red}`, color: C.red, borderRadius: { xs: R.cardSm, sm: R.pill }, px: { xs: 2, sm: 4 }, py: { xs: 1.2, sm: 1.5 }, fontWeight: 600, fontSize: { xs: '13px', sm: '15px' }, fontFamily: FONT, textTransform: 'none', '&:hover': { backgroundColor: alpha(C.red, 0.08), borderColor: '#d32f2f' } }}>
                    Cancel Order
                  </Button>
                ) : <Box />}

                {showResetBottom ? (
                  <Button startIcon={<ReplayIcon />} onClick={state === 'wait_for_discount_approval' ? rejectDiscount : resetToDraft} disabled={busyAction} sx={{ border: '2px solid #5d526f', color: '#5d526f', borderRadius: { xs: R.cardSm, sm: R.pill }, px: { xs: 2, sm: 4 }, py: { xs: 1.2, sm: 1.5 }, fontWeight: 700, fontSize: { xs: '13px', sm: '15px' }, fontFamily: FONT, textTransform: 'none', '&:hover': { backgroundColor: alpha('#5d526f', 0.08) } }}>
                    Reset to Draft
                  </Button>
                ) : <Box />}
              </Box>
            )}
          </Box>
        </Fade>
      </Container>

      {/* cancel confirmation dialog */}
      <Dialog open={showCancelDialog} onClose={() => setShowCancelDialog(false)}
        PaperProps={{ sx: { borderRadius: '24px', p: 2, overflow: 'hidden', position: 'relative', '&::before': { content: '""', position: 'absolute', top: 0, left: 0, right: 0, height: '4px', background: 'linear-gradient(90deg, #ef5350, #ff867c)' } } }}>
        <DialogTitle sx={{ fontFamily: FONT, fontWeight: 600, color: C.text, fontSize: { xs: '18px', sm: '20px' } }}>Cancel Order?</DialogTitle>
        <DialogContent>
          <Typography sx={{ fontFamily: FONT, fontSize: { xs: '13px', sm: '14px' } }}>
            Are you sure you want to cancel this order? This action will save the order with a cancelled status.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: { xs: 2, sm: 3 }, pb: { xs: 2, sm: 3 } }}>
          <Button onClick={() => setShowCancelDialog(false)} sx={{ color: '#666', fontFamily: FONT, textTransform: 'none', borderRadius: R.pill, px: 3, fontSize: { xs: '13px', sm: '14px' } }}>Go Back</Button>
          <Button startIcon={<CheckCircleIcon />} onClick={confirmCancelOrder} disabled={busyAction}
            sx={{ backgroundColor: C.red, color: 'white', fontFamily: FONT, textTransform: 'none', borderRadius: R.pill, px: 4, fontSize: { xs: '13px', sm: '14px' }, '&:hover': { backgroundColor: '#d32f2f' }, '&.Mui-disabled': { backgroundColor: alpha(C.red, 0.35), color: 'white' } }}>
            Yes, Cancel Order
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}