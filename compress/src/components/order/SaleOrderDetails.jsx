import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import {
  Box,
  Grid,
  TextField,
  Typography,
  MenuItem,
  Button,
  Container,
  Divider,
  Fade,
  alpha,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Chip,
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

import OrderLinesReadOnly from './OrderLinesReadOnly';

export const localToUtcOdooDatetime = (localStr) => {
  if (!localStr) return "";

  let datePart, timePart;

  if (localStr.includes("T")) {
    [datePart, timePart] = localStr.split("T");
    timePart = timePart ? `${timePart}:00` : "00:00:00";
  } else {
    [datePart, timePart = "00:00:00"] = localStr.split(" ");
  }

  const [y, m, d] = datePart.split("-").map(Number);
  const [hh, mi, ss] = timePart.split(":").map(Number);

  const localDate = new Date(y, m - 1, d, hh, mi, ss);

  const iso = localDate.toISOString(); // UTC
  return iso.slice(0, 19).replace("T", " "); // "YYYY-MM-DD HH:mm:ss"
};

export const utcOdooToLocal = (utcStr) => {
  if (!utcStr) return "";

  const isoUtc = utcStr.replace(" ", "T") + "Z";
  const d = new Date(isoUtc);

  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");

  return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
};

export default function OrderDetailsReadOnly() {
  const navigate = useNavigate();
  const { id: orderId } = useParams();

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  const deviceTimeZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone;

  const nowLocal = () => {
    const tz = deviceTimeZone();
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: tz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }).formatToParts(new Date());

    const get = (t) => parts.find(p => p.type === t)?.value;
    return `${get('year')}-${get('month')}-${get('day')} ${get('hour')}:${get('minute')}:${get('second')}`;
  };

  const [customer, setCustomer] = useState({
    id: '',
    name: '',
    phone: '',
    area: '',
    landmark: '',
    street: '',
    net_sale: '',
  });

  const [order, setOrder] = useState({
    deliveryTypeId: '',
    deliveryMethodId: '',
    deliveryCompanyOrderId: '',
    branch: '',
    scheduledDate: nowLocal().replace(' ', 'T').slice(0, 16),
    deliveryCharge: 0,
    state: '',
    orderName: '',
  });

  const [doctor, setDoctor] = useState({
    id: '',
    doctor_name: '',
    doctor_phone: '',
    clinic_name: '',
  });

  const [hasPrescription, setHasPrescription] = useState(false);
  const [termsAndConditions, setTermsAndConditions] = useState('');
  const [orderLinesData, setOrderLinesData] = useState([]);
  const [warehousesData, setWarehousesData] = useState([]);
  const [deliveryTypesData, setDeliveryTypesData] = useState([]);
  const [areasData, setAreasData] = useState([]);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [busyAction, setBusyAction] = useState(false);

  const THEME_PURPLE = '#7e57c2';
  const LIGHT_PURPLE_BG = '#faf9fc';

  const companyData = JSON.parse(localStorage.getItem('company_data'));
  const userData = JSON.parse(localStorage.getItem('user_data'))
  const companyId = companyData?.id;
  const sessionCountry = companyData?.country;
  const sessionCountryId = companyData?.country_id;
  const sessionCurrency = companyData?.currency_symbol;

  const discountLineId = companyData?.discount_service?.id;

  const isCCManager = userData.isManager;
  const isCCEmp = !isCCManager;

  const selectedTypeObj = useMemo(
    () => deliveryTypesData.find(t => String(t.id) === String(order.deliveryTypeId)),
    [deliveryTypesData, order.deliveryTypeId]
  );

  const selectedMethodObj = useMemo(
    () => selectedTypeObj?.methods?.find(m => String(m.id) === String(order.deliveryMethodId)),
    [selectedTypeObj, order.deliveryMethodId]
  );

  const isDeliveryId = (lineId) => {
    return false;
  };

  const isDiscountId = (lineId) => {
    return String(lineId) === String(discountLineId);
  };

  const discountDetails = useMemo(() => {
    if (!discountLineId || !orderLinesData.length) {
      return { discountValue: 0, maxAllowed: 0, difference: 0 };
    }

    const discountLine = orderLinesData.find(line => isDiscountId(line.id));
    const discountValue = discountLine ? Math.abs((discountLine.price || 0) * (discountLine.qty || 1)) : 0;

    let maxAllowed = 0;
    orderLinesData.forEach(line => {
      if (isDeliveryId(line.id) || isDiscountId(line.id)) return;

      const lineSubtotal = (line.price || 0) * (line.qty || 0);
      console.info('line max discount', line.name, ': ', line.max_discount);
      const productMaxDiscount = line.max_discount !== undefined && line.max_discount !== null
        ? line.max_discount
        : 0;

      const lineMaxAllowed = (lineSubtotal * productMaxDiscount) / 100;
      maxAllowed += lineMaxAllowed;
    });

    const difference = discountValue - maxAllowed;

    return {
      discountValue: discountValue.toFixed(2),
      maxAllowed: maxAllowed.toFixed(2),
      difference: Math.max(0, difference).toFixed(2),
    };
  }, [orderLinesData, discountLineId]);

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
    '& .MuiInputBase-input': {
      fontFamily: "'Inter', 'Segoe UI', sans-serif",
    },
  };

  const disabledFieldSx = {
    ...textFieldStyles,
    '& .MuiOutlinedInput-root.Mui-disabled': {
      backgroundColor: alpha(THEME_PURPLE, 0.02),
      '& fieldset': {
        borderColor: '#e8e4f0',
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

  useEffect(() => {
    const fetchMeta = async () => {
      try {
        const [deliveryTypesRes, areasRes, whRes] = await Promise.all([
          axios.post('/api/call_center/delivery/types', { params: {} }, { withCredentials: true }),
          axios.post(
            '/api/call_center/areas',
            { params: { country_id: sessionCountryId } },
            { withCredentials: true }
          ),
          axios.post('/api/call_center/warehouses', {}, { withCredentials: true }),
        ]);

        if (deliveryTypesRes.data.result?.status === 'success') {
          setDeliveryTypesData(deliveryTypesRes.data.result?.result || []);
        }

        if (areasRes.data.result?.status === 'success') {
          setAreasData(areasRes.data.result?.result || []);
        }

        if (whRes.data.result?.status === 'success') {
          setWarehousesData(whRes.data.result.warehouses || []);
        }
      } catch (e) {
        // keep UI working even if meta fails
        setDeliveryTypesData([]);
        setAreasData([]);
        setWarehousesData([]);
      }
    };

    fetchMeta();
  }, [sessionCountryId]);

  useEffect(() => {
    const fetchOrder = async () => {
      if (!orderId) {
        setLoadError('Missing order id');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const response = await axios.post(
          '/api/call_center/order/detail',
          { params: { order_id: orderId } },
          { withCredentials: true }
        );

        if (response.data.result.status !== 'success') {
          setLoadError('Failed to load order data');
          setLoading(false);
          return;
        }

        const data = response.data.result.result;

        setCustomer({
          id: data.customer?.id || '',
          name: data.customer?.name || '',
          phone: data.customer?.phone || '',
          area: data.customer?.area || '',
          landmark: data.customer?.landmark || '',
          street: data.customer?.street || '',
          net_sale: data.customer?.net_sale || '',
        });

        const orderConfigData = data.order_config || {};
        setOrder({
          deliveryTypeId: orderConfigData.delivery_type_id || '',
          deliveryMethodId: orderConfigData.delivery_method_id || '',
          deliveryCompanyOrderId: orderConfigData.delivery_company_order_id || '',
          branch: orderConfigData.branch_id ? String(orderConfigData.branch_id) : '',
          scheduledDate: utcOdooToLocal(data.order_info?.date) || nowLocal().split(' ')[0],
          deliveryCharge: orderConfigData.branch_delivery_charge || 0,
          state: data.order_info?.state || data.order_info?.status || '',
          orderName: data.order_info?.name || data.order_info?.order_name || '',
        });

        setDoctor({
          id: data.order_config?.doctor_id || '',
          doctor_name: data.order_config?.doctor_name || '',
          doctor_phone: data.order_config?.doctor_phone || '',
          clinic_name: data.order_config?.clinic_name || '',
        });

        setHasPrescription(!!data.order_config?.doctor_id);
        setTermsAndConditions(data.order_config?.terms_and_conditions || '');
        setOrderLinesData(data.lines || []);

        setLoadError(null);
      } catch (error) {
        setLoadError('Error loading order. Redirecting...');
        setTimeout(() => navigate('/orders'), 2000);
      } finally {
        setLoading(false);
      }
    };

    fetchOrder();
  }, [orderId, navigate]);

  const handleBack = () => navigate('/orders');

  // --- Actions ---
  const saveOrder = async (state) => {
    // Same core behavior as your OrderForm, but no UI editing here
    try {
      const customerResponse = await axios.post(
        '/api/call_center/customer/upsert',
        {
          params: {
            customer_data: {
              name: customer.name,
              phone: customer.phone,
              area_id: customer.area,
              country_id: sessionCountryId,
              street: customer.street,
              landmark: customer.landmark,
            },
          },
        },
        { withCredentials: true }
      );

      if (customerResponse.data.result.status !== 'success') {
        alert('Failed to save customer data: ' + customerResponse.data.result.message);
        return null;
      }

      const confirmedPartnerId = customerResponse.data.result.customer.id;

      const orderPayload = {
        params: {
          order_id: orderId,
          company_id: companyId,
          partner_id: confirmedPartnerId,
          delivery_type_id: order.deliveryTypeId,
          delivery_method_id: order.deliveryMethodId,
          delivery_company_order_id: selectedMethodObj?.is_delivery_company
            ? order.deliveryCompanyOrderId
            : false,
          doctor_id: hasPrescription && doctor.id ? doctor.id : null,
          has_prescription: hasPrescription,
          branch: order.branch,
          scheduled_date: localToUtcOdooDatetime(order.scheduledDate),
          deliveryCharge: order.deliveryCharge,
          terms_and_conditions: termsAndConditions,
          state,
          lines: orderLinesData.map((line) => ({
            product_id: line.id,
            requested_qty: line.qty,
            price_unit: line.price,
            deliveryCharge: order.deliveryCharge,
          })),
        },
      };

      const orderResponse = await axios.post('/api/call_center/update_order', orderPayload, {
        withCredentials: true,
        headers: { 'Content-Type': 'application/json' },
      });

      if (orderResponse.data.result.status === 'success') {
        return orderResponse.data.result;
      }

      alert('Order update failed: ' + orderResponse.data.result.message);
      return null;
    } catch (e) {
      alert('An error occurred while saving. Please check the console.');
      return null;
    }
  };

  const resetToDraft = async () => {
    try {
      setBusyAction(true);
      const res = await axios.post(
        '/api/call_center/order/reset_to_draft',
        { params: { order_id: orderId } },
        { withCredentials: true }
      );

      const ok = res.data?.result?.status === 'success' || res.data?.status === 'success';
      if (!ok) {
        alert(res.data?.result?.message || res.data?.message || 'Reset to draft failed');
        return;
      }

      alert('Order has been reset to draft.');
      navigate('/orders');
    } catch (e) {
      alert('Reset to draft failed. Please check the console.');
    } finally {
      setBusyAction(false);
    }
  };

  const approveDiscount = async () => {
    const today = localToUtcOdooDatetime(nowLocal());
    const scheduledDate = localToUtcOdooDatetime(order.scheduledDate || '');
    const nextState = scheduledDate > today ? 'draft' : 'not_prepared';

    try {
      setBusyAction(true);
      const result = await saveOrder(nextState);
      if (result) {
        alert(`Order ${result.order_name || order.orderName || ''} approved successfully.`);
        navigate('/orders');
      }
    } finally {
      setBusyAction(false);
    }
  };

  const rejectDiscount = async () => {
    try {
      setBusyAction(true);
      console.log("Order lines data before removing discount line:", orderLinesData);
      if (discountLineId) {
        console.log("discount id to remove:", discountLineId);
        try {
          let a = await axios.post(
            '/api/call_center/order/remove_line',
            {
              params: {
                order_id: orderId,
                line_id: discountLineId
              }
            },
            { withCredentials: true }
          );
          console.log("Removed discount line via API:", a.data);
        } catch (e) {
          console.warn('Could not remove line via API, removing from UI:', e);
        }

        setOrderLinesData((prev) => prev.filter((line) => line.id !== discountLineId));
      }

      const res = await axios.post(
        '/api/call_center/order/reset_to_draft',
        { params: { order_id: orderId } },
        { withCredentials: true }
      );

      const ok = res.data?.result?.status === 'success' || res.data?.status === 'success';
      if (!ok) {
        alert(res.data?.result?.message || res.data?.message || 'Reset to draft failed');
        return;
      }

      alert('Discount rejected. Order reset to draft');
      navigate('/orders');
    } catch (e) {
      alert('Failed to reject discount. Please check the console.');
    } finally {
      setBusyAction(false);
    }
  };


  const confirmCancelOrder = async () => {
    setShowCancelDialog(false);
    try {
      setBusyAction(true);
      const result = await saveOrder('canceled');
      if (result) {
        alert(`Order ${result.order_name || order.orderName || ''} has been cancelled.`);
        navigate('/orders');
      }
    } finally {
      setBusyAction(false);
    }
  };

  const state = String(order.state || '').trim();

  const showTopDiscountBanner = state === 'wait_for_discount_approval';
  const showCancelBottom = state === 'wait_for_discount_approval' || state === 'not_prepared';
  const showResetBottom = state === 'not_prepared' || state === 'canceled';
  const showManagerTopButtons = showTopDiscountBanner && isCCManager;

  const areaName = useMemo(() => {
    const a = areasData.find(x => String(x.id) === String(customer.area));
    return a?.name || '';
  }, [areasData, customer.area]);

  const branchName = useMemo(() => {
    const w = warehousesData.find(x => String(x.id) === String(order.branch));
    return w?.name || '';
  }, [warehousesData, order.branch]);

  const deliveryTypeName = useMemo(() => {
    const t = deliveryTypesData.find(x => String(x.id) === String(order.deliveryTypeId));
    return t?.name || '';
  }, [deliveryTypesData, order.deliveryTypeId]);

  const deliveryMethodName = useMemo(() => {
    const t = deliveryTypesData.find(x => String(x.id) === String(order.deliveryTypeId));
    const m = t?.methods?.find(mm => String(mm.id) === String(order.deliveryMethodId));
    return m?.name || '';
  }, [deliveryTypesData, order.deliveryTypeId, order.deliveryMethodId]);

  if (loading) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', backgroundColor: LIGHT_PURPLE_BG }}>
        <CircularProgress sx={{ color: THEME_PURPLE }} />
      </Box>
    );
  }

  if (loadError) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', flexDirection: 'column', backgroundColor: LIGHT_PURPLE_BG }}>
        <Typography color="error" variant="h6">{loadError}</Typography>
        <Typography color="textSecondary">Redirecting to orders...</Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: `linear-gradient(135deg, ${LIGHT_PURPLE_BG} 0%, #ffffff 100%)`,
        py: 4,
        fontFamily: "'Inter', 'Segoe UI', sans-serif",
      }}
    >
      <Container maxWidth="lg">
        <Fade in timeout={600}>
          <Box>
            <Box sx={{ mb: 4, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
              <Button
                startIcon={<ArrowBackIcon />}
                onClick={handleBack}
                sx={{
                  color: THEME_PURPLE,
                  fontFamily: "'Inter', 'Segoe UI', sans-serif",
                  fontWeight: 500,
                  textTransform: 'none',
                  fontSize: '15px',
                  '&:hover': { backgroundColor: 'rgba(126, 87, 194, 0.08)' },
                }}
              >
                Back to Orders
              </Button>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                {order.orderName && (
                  <Chip
                    label={order.orderName}
                    sx={{
                      backgroundColor: alpha(THEME_PURPLE, 0.10),
                      color: THEME_PURPLE,
                      fontFamily: "'Inter', 'Segoe UI', sans-serif",
                      fontWeight: 600,
                      fontSize: '13px',
                      height: '28px',
                      borderRadius: '50px',
                    }}
                  />
                )}
                {state && (
                  <Chip
                    label={state?.replace(/_/g, ' ').toUpperCase()}
                    sx={{
                      backgroundColor: getStatusColor(state).bg,
                      color: getStatusColor(state).color,
                      fontFamily: "'Inter', 'Segoe UI', sans-serif",
                      fontWeight: 600,
                      fontSize: '13px',
                      height: '28px',
                      borderRadius: '50px',
                    }}
                  />
                )}
              </Box>
            </Box>

            {showTopDiscountBanner && (
              <Fade in timeout={600}>
                <Box
                  sx={{
                    backgroundColor: 'white',
                    borderRadius: '24px',
                    p: 4,
                    mb: 3,
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
                      background: `linear-gradient(90deg, #efb359, #f9a825)`,
                    },
                  }}
                >
                  {isCCEmp && (
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
                      <Box
                        sx={{
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          backgroundColor: '#e65100',
                          mt: 1,
                          flexShrink: 0,
                        }}
                      />
                      <Box sx={{ flex: 1 }}>
                        <Typography
                          sx={{
                            fontFamily: "'Inter', 'Segoe UI', sans-serif",
                            fontWeight: 700,
                            color: '#e65100',
                            fontSize: 15,
                            mb: 1,
                          }}
                        >
                          Waiting for Manager Approval
                        </Typography>
                        <Typography
                          sx={{
                            fontFamily: "'Inter', 'Segoe UI', sans-serif",
                            color: alpha('#000', 0.7),
                            fontSize: 14,
                            lineHeight: 1.6,
                          }}
                        >
                          This order has a discount request of{' '}
                          <Box
                            component="span"
                            sx={{
                              color: '#d32f2f',
                              fontWeight: 700,
                              textDecoration: 'underline',
                              textDecorationColor: alpha('#d32f2f', 0.4),
                              textDecorationThickness: '2px',
                              textUnderlineOffset: '3px',
                            }}
                          >
                            {discountDetails.discountValue} {sessionCurrency}
                          </Box>
                          {' '}that exceeds the maximum allowed{' '}
                          <Box
                            component="span"
                            sx={{
                              color: '#f57c00',
                              fontWeight: 700,
                              textDecoration: 'underline',
                              textDecorationColor: alpha('#f57c00', 0.4),
                              textDecorationThickness: '2px',
                              textUnderlineOffset: '3px',
                            }}
                          >
                            {discountDetails.maxAllowed} {sessionCurrency}
                          </Box>
                          {' '}by{' '}
                          <Box
                            component="span"
                            sx={{
                              color: '#d32f2f',
                              fontWeight: 700,
                              textDecoration: 'underline',
                              textDecorationColor: alpha('#d32f2f', 0.4),
                              textDecorationThickness: '2px',
                              textUnderlineOffset: '3px',
                            }}
                          >
                            {discountDetails.difference} {sessionCurrency}
                          </Box>
                          . <br /> Manager approval is required before you can proceed.
                        </Typography>
                      </Box>
                    </Box>
                  )}

                  {showManagerTopButtons && (
                    <Box>
                      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5, mb: 3 }}>
                        <Box
                          sx={{
                            width: 8,
                            height: 8,
                            borderRadius: '50%',
                            backgroundColor: '#e65100',
                            mt: 1,
                            flexShrink: 0,
                          }}
                        />
                        <Box sx={{ flex: 1 }}>
                          <Typography
                            sx={{
                              fontFamily: "'Inter', 'Segoe UI', sans-serif",
                              fontWeight: 700,
                              color: '#e65100',
                              fontSize: 15,
                              mb: 1,
                            }}
                          >
                            Discount Approval Required
                          </Typography>
                          <Typography
                            sx={{
                              fontFamily: "'Inter', 'Segoe UI', sans-serif",
                              color: alpha('#000', 0.7),
                              fontSize: 14,
                              lineHeight: 1.6,
                            }}
                          >
                            This order has a discount request of{' '}
                            <Box
                              component="span"
                              sx={{
                                color: '#d32f2f',
                                fontWeight: 700,
                                textDecoration: 'underline',
                                textDecorationColor: alpha('#d32f2f', 0.4),
                                textDecorationThickness: '2px',
                                textUnderlineOffset: '3px',
                              }}
                            >
                              {discountDetails.discountValue} {sessionCurrency}
                            </Box>
                            {' '}that exceeds the maximum allowed{' '}
                            <Box
                              component="span"
                              sx={{
                                color: '#f57c00',
                                fontWeight: 700,
                                textDecoration: 'underline',
                                textDecorationColor: alpha('#f57c00', 0.4),
                                textDecorationThickness: '2px',
                                textUnderlineOffset: '3px',
                              }}
                            >
                              {discountDetails.maxAllowed} {sessionCurrency}
                            </Box>
                            {' '}by{' '}
                            <Box
                              component="span"
                              sx={{
                                color: '#c62828',
                                fontWeight: 700,
                                textDecoration: 'underline',
                                textDecorationColor: alpha('#c62828', 0.4),
                                textDecorationThickness: '2px',
                                textUnderlineOffset: '3px',
                              }}
                            >
                              {discountDetails.difference} {sessionCurrency}
                            </Box>
                            .
                          </Typography>
                          <Typography
                            sx={{
                              fontFamily: "'Inter', 'Segoe UI', sans-serif",
                              color: alpha('#000', 0.6),
                              mt: 0.5,
                              fontSize: 13,
                            }}
                          >
                            Approve to submit the order, or reject to remove the discount and reset to draft.
                          </Typography>
                        </Box>
                      </Box>

                      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                        <Button
                          startIcon={<ThumbDownAltIcon />}
                          onClick={rejectDiscount}
                          disabled={busyAction}
                          sx={{
                            border: '2px solid #ef5350',
                            color: '#ef5350',
                            borderRadius: '50px',
                            px: 3.5,
                            py: 1.2,
                            fontWeight: 700,
                            fontSize: '13px',
                            fontFamily: "'Inter', 'Segoe UI', sans-serif",
                            textTransform: 'none',
                            transition: 'all 0.2s ease',
                            '&:hover': {
                              backgroundColor: alpha('#ef5350', 0.08),
                              borderColor: '#d32f2f',
                            },
                            '&.Mui-disabled': {
                              borderColor: alpha('#ef5350', 0.5),
                              color: alpha('#ef5350', 0.5),
                            },
                          }}
                        >
                          Reject Discount
                        </Button>

                        <Button
                          startIcon={<ThumbUpAltIcon />}
                          onClick={approveDiscount}
                          disabled={busyAction}
                          sx={{
                            backgroundColor: '#4caf50',
                            color: 'white',
                            borderRadius: '50px',
                            px: 3.5,
                            py: 1.2,
                            fontWeight: 700,
                            fontSize: '13px',
                            fontFamily: "'Inter', 'Segoe UI', sans-serif",
                            textTransform: 'none',
                            boxShadow: '0 4px 12px rgba(76, 175, 80, 0.25)',
                            transition: 'all 0.2s ease',
                            '&:hover': {
                              backgroundColor: '#45a049',
                              boxShadow: '0 6px 16px rgba(76, 175, 80, 0.35)',
                            },
                            '&.Mui-disabled': {
                              backgroundColor: alpha('#4caf50', 0.5),
                            },
                          }}
                        >
                          {busyAction ? 'Processing...' : 'Approve Discount'}
                        </Button>
                      </Box>
                    </Box>
                  )}
                </Box>
              </Fade>
            )}

            <Box
              sx={{
                backgroundColor: 'white',
                borderRadius: '24px',
                p: 6,
                mb: 3,
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
                },
              }}
            >
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
                Order Information
              </Typography>

              <Typography
                variant="body2"
                sx={{
                  color: '#9e9e9e',
                  mb: 5,
                  fontFamily: "'Inter', 'Segoe UI', sans-serif",
                }}
              >
                View order details
              </Typography>

              {/* Customer Details */}
              <Box sx={{ mb: 5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 3, gap: 1 }}>
                  <PersonIcon sx={{ color: THEME_PURPLE, fontSize: 24 }} />
                  <Typography
                    variant="h6"
                    sx={{
                      fontWeight: 600,
                      color: THEME_PURPLE,
                      fontFamily: "'Inter', 'Segoe UI', sans-serif",
                    }}
                  >
                    Customer Details
                  </Typography>
                </Box>

                <Grid container spacing={3}>
                  <Grid item xs={12} md={6}>
                    <TextField
                      label="Phone Number"
                      value={customer.phone}
                      fullWidth
                      size="medium"
                      disabled
                      sx={disabledFieldSx}
                      InputProps={{
                        startAdornment: <PhoneIcon sx={{ color: '#9e9e9e', mr: 1, fontSize: 20 }} />,
                      }}
                    />
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <TextField
                      label="Customer Name"
                      value={customer.name}
                      fullWidth
                      size="medium"
                      disabled
                      sx={disabledFieldSx}
                      InputProps={{
                        startAdornment: <PersonIcon sx={{ color: '#9e9e9e', mr: 1, fontSize: 20 }} />,
                      }}
                    />
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <TextField
                      select
                      label="Area"
                      value={customer.area || ''}
                      fullWidth
                      size="medium"
                      disabled
                      sx={{ ...disabledFieldSx, minWidth: '250px' }}
                      SelectProps={selectMenuProps}
                      InputProps={{
                        startAdornment: <LocationOnIcon sx={{ color: '#9e9e9e', mr: 1, fontSize: 20 }} />,
                      }}
                    >
                      {areasData.length > 0 ? (
                        areasData.map((area) => (
                          <MenuItem key={area.id} value={area.id}>
                            {area.name}
                          </MenuItem>
                        ))
                      ) : (
                        <MenuItem disabled>{areaName || 'No areas available'}</MenuItem>
                      )}
                    </TextField>
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <TextField
                      label="Country"
                      value={sessionCountry || ''}
                      fullWidth
                      size="medium"
                      disabled
                      sx={disabledFieldSx}
                      InputProps={{
                        startAdornment: <LocationOnIcon sx={{ color: '#9e9e9e', mr: 1, fontSize: 20 }} />,
                      }}
                    />
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <TextField
                      label="Landmark"
                      value={customer.landmark}
                      fullWidth
                      size="medium"
                      disabled
                      sx={disabledFieldSx}
                      InputProps={{
                        startAdornment: <LandscapeIcon sx={{ color: '#9e9e9e', mr: 1, fontSize: 20 }} />,
                      }}
                    />
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <TextField
                      label="Street"
                      value={customer.street}
                      fullWidth
                      size="medium"
                      disabled
                      sx={disabledFieldSx}
                      InputProps={{
                        startAdornment: <SignpostIcon sx={{ color: '#9e9e9e', mr: 1, fontSize: 20 }} />,
                      }}
                    />
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <TextField
                      label="Net Sale"
                      value={customer.net_sale}
                      fullWidth
                      size="medium"
                      disabled
                      sx={disabledFieldSx}
                      InputProps={{
                        startAdornment: <MonetizationOnIcon sx={{ color: '#9e9e9e', mr: 1, fontSize: 20 }} />,
                      }}
                    />
                  </Grid>
                </Grid>
              </Box>

              <Divider sx={{ my: 5, borderColor: alpha(THEME_PURPLE, 0.1) }} />

              {/* Time and Space Details */}
              <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 3, gap: 1 }}>
                  <LocalShippingIcon sx={{ color: THEME_PURPLE, fontSize: 24 }} />
                  <Typography
                    variant="h6"
                    sx={{
                      fontWeight: 600,
                      color: THEME_PURPLE,
                      fontFamily: "'Inter', 'Segoe UI', sans-serif",
                    }}
                  >
                    Time and Space Details
                  </Typography>
                </Box>

                <Grid container spacing={3}>
                  <Grid item xs={12} md={6}>
                    <TextField
                      label="Scheduled Date & Time"
                      type="datetime-local"
                      value={order.scheduledDate}
                      fullWidth
                      size="medium"
                      disabled
                      sx={disabledFieldSx}
                      InputLabelProps={{ shrink: true }}
                      InputProps={{
                        startAdornment: <CalendarTodayIcon sx={{ color: '#9e9e9e', mr: 1, fontSize: 20 }} />,
                      }}
                      helperText={
                        order.scheduledDate > nowLocal().replace(' ', 'T').slice(0, 16)
                          ? 'Order scheduled for future date'
                          : 'Order date is today or earlier'
                      }
                    />
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <TextField
                      select
                      label="Branch"
                      value={order.branch}
                      fullWidth
                      size="medium"
                      disabled
                      sx={{ ...disabledFieldSx, minWidth: '250px' }}
                      SelectProps={selectMenuProps}
                      InputProps={{
                        startAdornment: <StoreIcon sx={{ color: '#9e9e9e', mr: 1, fontSize: 20 }} />,
                      }}
                    >
                      {warehousesData.length > 0 ? (
                        warehousesData.map((wh) => (
                          <MenuItem key={wh.id} value={wh.id}>
                            {wh.name}
                          </MenuItem>
                        ))
                      ) : (
                        <MenuItem disabled>{branchName || 'No branches available'}</MenuItem>
                      )}
                    </TextField>
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <TextField
                      select
                      label="Delivery Type"
                      value={order.deliveryTypeId}
                      fullWidth
                      size="medium"
                      disabled
                      sx={{ ...disabledFieldSx, minWidth: '250px' }}
                      SelectProps={selectMenuProps}
                    >
                      {deliveryTypesData.length > 0 ? (
                        deliveryTypesData.map((type) => (
                          <MenuItem key={type.id} value={type.id}>
                            {type.name}
                          </MenuItem>
                        ))
                      ) : (
                        <MenuItem disabled>{deliveryTypeName || '—'}</MenuItem>
                      )}
                    </TextField>
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <TextField
                      select
                      label="Delivery Method"
                      value={order.deliveryMethodId}
                      fullWidth
                      size="medium"
                      disabled
                      sx={{ ...disabledFieldSx, minWidth: '250px' }}
                      SelectProps={selectMenuProps}
                    >
                      {(selectedTypeObj?.methods || []).map((method) => (
                        <MenuItem key={method.id} value={method.id}>
                          {method.name}
                        </MenuItem>
                      ))}
                      {!selectedTypeObj?.methods?.length && (
                        <MenuItem disabled>{deliveryMethodName || '—'}</MenuItem>
                      )}
                    </TextField>
                  </Grid>

                  {selectedMethodObj?.is_delivery_company && (
                    <Grid item xs={12} md={6}>
                      <TextField
                        label="Delivery Company Order ID"
                        value={order.deliveryCompanyOrderId || ''}
                        fullWidth
                        size="medium"
                        disabled
                        sx={disabledFieldSx}
                      />
                    </Grid>
                  )}
                </Grid>
              </Box>

              <Divider sx={{ my: 5, borderColor: alpha(THEME_PURPLE, 0.1) }} />

              <Box sx={{ mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 3, gap: 1 }}>
                  <PersonIcon sx={{ color: THEME_PURPLE, fontSize: 24 }} />
                  <Typography
                    variant="h6"
                    sx={{
                      fontWeight: 600,
                      color: THEME_PURPLE,
                      fontFamily: "'Inter', 'Segoe UI', sans-serif",
                    }}
                  >
                    Prescription
                  </Typography>

                  <input
                    type="checkbox"
                    checked={hasPrescription}
                    readOnly
                    disabled
                    style={{
                      width: '20px',
                      height: '20px',
                      cursor: 'not-allowed',
                      accentColor: THEME_PURPLE,
                      opacity: 0.7,
                    }}
                  />
                </Box>

                {hasPrescription && doctor.id && (
                  <Grid container spacing={3}>
                    <Grid item xs={12} md={6}>
                      <TextField
                        label="Doctor Name"
                        value={doctor.doctor_name}
                        fullWidth
                        size="medium"
                        disabled
                        sx={disabledFieldSx}
                        InputProps={{
                          startAdornment: <PersonIcon sx={{ color: '#9e9e9e', mr: 1, fontSize: 20 }} />,
                        }}
                      />
                    </Grid>

                    <Grid item xs={12} md={6}>
                      <TextField
                        label="Doctor Phone"
                        value={doctor.doctor_phone}
                        fullWidth
                        size="medium"
                        disabled
                        sx={disabledFieldSx}
                        InputProps={{
                          startAdornment: <PhoneIcon sx={{ color: '#9e9e9e', mr: 1, fontSize: 20 }} />,
                        }}
                      />
                    </Grid>

                    <Grid item xs={12} md={6}>
                      <TextField
                        label="Clinic Name"
                        value={doctor.clinic_name}
                        fullWidth
                        size="medium"
                        disabled
                        sx={disabledFieldSx}
                        InputProps={{
                          startAdornment: <StoreIcon sx={{ color: '#9e9e9e', mr: 1, fontSize: 20 }} />,
                        }}
                      />
                    </Grid>
                  </Grid>
                )}
              </Box>
            </Box>

            <OrderLinesReadOnly
              lines={orderLinesData}
              deliveryCharge={order.deliveryCharge}
              themePurple={THEME_PURPLE}
              termsAndConditions={termsAndConditions}
            />

            {(showCancelBottom || showResetBottom) && (
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  mt: 4,
                  gap: 2,
                  flexWrap: 'wrap',
                }}
              >
                {showCancelBottom ? (
                  <Button
                    startIcon={<CancelIcon />}
                    onClick={() => setShowCancelDialog(true)}
                    disabled={busyAction}
                    sx={{
                      borderColor: '#ef5350',
                      color: '#ef5350',
                      borderRadius: '50px',
                      px: 4,
                      py: 1.5,
                      fontWeight: 600,
                      fontSize: '15px',
                      fontFamily: "'Inter', 'Segoe UI', sans-serif",
                      textTransform: 'none',
                      border: '2px solid #ef5350',
                      transition: 'border-color 0.3s ease, background-color 0.3s ease',
                      '&:hover': {
                        backgroundColor: alpha('#ef5350', 0.08),
                        borderColor: '#d32f2f',
                      },
                    }}
                  >
                    Cancel Order
                  </Button>
                ) : (
                  <Box />
                )}

                {showResetBottom ? (
                  <Button
                    startIcon={<ReplayIcon />}
                    onClick={state === 'wait_for_discount_approval' ? rejectDiscount : resetToDraft}
                    disabled={busyAction}
                    sx={{
                      borderColor: '#5d526f',
                      color: '#5d526f',
                      borderRadius: '50px',
                      px: 4,
                      py: 1.5,
                      fontWeight: 700,
                      fontSize: '15px',
                      fontFamily: "'Inter', 'Segoe UI', sans-serif",
                      textTransform: 'none',
                      border: '2px solid #5d526f',
                      '&:hover': { backgroundColor: alpha('#5d526f', 0.08) },
                    }}
                  >
                    Reset to Draft
                  </Button>
                ) : (
                  <Box />
                )}
              </Box>
            )}
          </Box>
        </Fade>
      </Container>

      {/* Cancel dialog (same look) */}
      <Dialog
        open={showCancelDialog}
        onClose={() => setShowCancelDialog(false)}
        PaperProps={{
          sx: { borderRadius: '24px', p: 2 },
        }}
      >
        <DialogTitle
          sx={{
            fontFamily: "'Inter', 'Segoe UI', sans-serif",
            fontWeight: 600,
            color: '#2d2d2d',
          }}
        >
          Cancel Order?
        </DialogTitle>
        <DialogContent>
          <Typography sx={{ fontFamily: "'Inter', 'Segoe UI', sans-serif" }}>
            Are you sure you want to cancel this order? This action will save the order with a cancelled status.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button
            onClick={() => setShowCancelDialog(false)}
            sx={{
              color: '#666',
              fontFamily: "'Inter', 'Segoe UI', sans-serif",
              textTransform: 'none',
              borderRadius: '50px',
              px: 3,
            }}
          >
            Go Back
          </Button>
          <Button
            startIcon={<CheckCircleIcon />}
            onClick={confirmCancelOrder}
            disabled={busyAction}
            sx={{
              backgroundColor: '#ef5350',
              color: 'white',
              fontFamily: "'Inter', 'Segoe UI', sans-serif",
              textTransform: 'none',
              borderRadius: '50px',
              px: 4,
              '&:hover': { backgroundColor: '#d32f2f' },
              '&.Mui-disabled': { backgroundColor: alpha('#ef5350', 0.35), color: 'white' },
            }}
          >
            Yes, Cancel Order
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}