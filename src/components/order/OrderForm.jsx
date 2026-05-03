import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import dayjs from "dayjs";
import {
  Box,
  Grid,
  TextField,
  Typography,
  MenuItem,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Button,
  Container,
  Divider,
  Fade,
  alpha,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Radio,
  RadioGroup,
  FormControlLabel,
  FormControl,
  Chip,
  Popper,
  Paper,
  Switch,
  InputAdornment,
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
import SendIcon from '@mui/icons-material/Send';
import DraftsIcon from '@mui/icons-material/Drafts';
import HomeIcon from '@mui/icons-material/Home';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import AssignmentIcon from '@mui/icons-material/Assignment';
import PaymentIcon from '@mui/icons-material/Payment';
import ScheduleSendIcon from '@mui/icons-material/ScheduleSend';
import OrderLines from './OrderLines';

import { C, FONT, R, bannerGradient, AppLoader, textFieldSx, textAreaSx, selectFieldSx, formFieldSx, formFieldDisabledSx, sharedMenuProps } from '../../theme/ccTheme';

// ─── date helpers ─────────────────────────────────────────────────────────────
const todayDateStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export const localToUtcOdooDatetime = (localStr) => {
  if (!localStr) return '';
  let datePart, timePart;
  if (localStr.includes('T')) { [datePart, timePart] = localStr.split('T'); }
  else { [datePart, timePart = '00:00:00'] = localStr.split(' '); }
  timePart = timePart ? `${timePart}:00` : '00:00:00';
  const [y, m, d] = datePart.split('-').map(Number);
  const [hh, mi, ss] = timePart.split(':').map(Number);
  const iso = new Date(y, m - 1, d, hh, mi, ss).toISOString();
  return iso.slice(0, 19).replace('T', ' ');
};

export const utcOdooToLocal = (utcStr) => {
  if (!utcStr) return '';
  const d = new Date(utcStr.replace(' ', 'T') + 'Z');
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}T${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

const nowLocalDatetime = () => {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

// ─── stock validation (mirrors OrderLines logic, runs on the lines array) ─────
const checkStockViolations = (lines, deliveryChargeProductId, customerServiceProductId) => {
  const isDeliveryId = (id) => String(id) === String(deliveryChargeProductId);
  const isCustomerServiceId = (id) => String(id) === String(customerServiceProductId);
  return lines.filter(l => {
    if (l.isDeliveryCharge || l.isCustomerService || isDeliveryId(l.id) || isCustomerServiceId(l.id)) return false;
    const available = (l.stock_qty || 0) - (l.in_prep_qty || 0);
    return (l.qty || 0) > available;
  }).map(l => ({
    name: l.name,
    ordered: l.qty,
    available: Math.max(0, (l.stock_qty || 0) - (l.in_prep_qty || 0)),
  }));
};

const alertStockViolations = (violations) => {
  const lines = violations.map(v => `• ${v.name}: ordered ${v.ordered}, available ${v.available}`).join('\n');
  alert(`Insufficient stock for the following products:\n\n${lines}\n\nPlease adjust quantities before proceeding.`);
};

// ─────────────────────────────────────────────────────────────────────────────
export default function OrderForm() {
  const navigate = useNavigate();
  const { id: orderId } = useParams();

  const isNewOrder = !orderId;
  const isDraftOrder = !!orderId;

  const companyData = JSON.parse(localStorage.getItem('company_data'));
  const companyId = companyData?.id;
  const sessionCountry = companyData?.country;
  const sessionCountryId = companyData?.country_id;
  const deliveryChargeProductId = companyData?.delivery_charge_service?.id;
  const customerServiceProductId = companyData?.customer_service?.id;

  const userData = JSON.parse(localStorage.getItem('user_data') || 'null');
  if (!userData?.isManager && !userData?.isCallCenterEmployee) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <Typography color="error">Access denied.</Typography>
      </Box>
    );
  }

  // ─── state ─────────────────────────────────────────────────────────────────
  const [loading, setLoading] = useState(isDraftOrder);
  const [loadError, setLoadError] = useState(null);
  const [customer, setCustomer] = useState({ id: '', name: '', phone: '', area: '', landmark: '', street: '', net_sale: '' });
  const [order, setOrder] = useState({ deliveryTypeId: '', deliveryMethodId: '', deliveryCompanyOrderId: '', branch: '', scheduledDate: nowLocalDatetime(), deliveryCharge: 0, orderName: '' });
  const [doctor, setDoctor] = useState({ id: '', doctor_name: '', doctor_phone: '', clinic_name: '' });
  const [doctorSearchResults, setDoctorSearchResults] = useState([]);
  const [orderLinesData, setOrderLinesData] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [selectedCustomerData, setSelectedCustomerData] = useState(null);
  const [showLocationDialog, setShowLocationDialog] = useState(false);
  const [selectedLocationId, setSelectedLocationId] = useState('');
  const [warehousesData, setWarehousesData] = useState([]);
  const [deliveryTypesData, setDeliveryTypesData] = useState([]);
  const [areasData, setAreasData] = useState([]);
  const [countriesData, setCountriesData] = useState([]);
  const [countriesLoading, setCountriesLoading] = useState(false);
  const [countriesLoaded, setCountriesLoaded] = useState(false);
  const [selectedCountryId, setSelectedCountryId] = useState(sessionCountryId || '');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [discountStatus, setDiscountStatus] = useState('none');
  const [deliveryCharge, setDeliveryCharge] = useState(0);
  const [deliveryChargeMode, setDeliveryChargeMode] = useState('auto');
  const [hasPrescription, setHasPrescription] = useState(false);
  const [termsAndConditions, setTermsAndConditions] = useState('');
  const [productNotes, setProductNotes] = useState({});
  const [alreadyPaidOnline, setAlreadyPaidOnline] = useState(false);
  const [appliedLoyalties, setAppliedLoyalties] = useState([]);

  const doctorSearchRef = useRef(null);
  const [doctorAnchorEl, setDoctorAnchorEl] = useState(null);

  const handleLinesChange = useCallback((lines) => setOrderLinesData(lines), []);
  const handleTermsAndConditionsChange = useCallback((t) => setTermsAndConditions(t), []);

  // ─── Task 5: derive whether the order will be scheduled ───────────────────
  const isScheduled = order.scheduledDate?.slice(0, 10) > todayDateStr();

  const submitLabel = useMemo(() => {
    if (isScheduled) return 'Schedule Order';
    return isDraftOrder ? 'Update Order' : 'Submit Order';
  }, [isScheduled, isDraftOrder]);

  // ─── load existing draft ───────────────────────────────────────────────────
  useEffect(() => {
    if (!isDraftOrder) { setLoading(false); return; }
    const fetchDraftOrder = async () => {
      try {
        setLoading(true);
        const response = await axios.post('/api/call_center/order/detail', { params: { company_id: companyId, order_id: orderId } }, { withCredentials: true });
        if (response.data.result.status === 'success') {
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
          const cfg = data.order_config || {};
          setOrder({
            deliveryTypeId: cfg.delivery_type_id || '',
            deliveryMethodId: cfg.delivery_method_id || '',
            deliveryCompanyOrderId: cfg.delivery_company_order_id || '',
            branch: cfg.branch_id || '',
            scheduledDate: utcOdooToLocal(data.order_info?.date) || nowLocalDatetime(),
            deliveryCharge: cfg.branch_delivery_charge || 0,
            orderName: data.order_info?.name || '',
          });
          setDoctor({ id: cfg.doctor_id || '', doctor_name: cfg.doctor_name || '', doctor_phone: cfg.doctor_phone || '', clinic_name: cfg.clinic_name || '' });
          setTermsAndConditions(cfg.terms_and_conditions || '');
          setHasPrescription(!!cfg.doctor_id);
          setDeliveryCharge(cfg.branch_delivery_charge || 0);
          setDeliveryChargeMode(cfg.delivery_charge_option || 'auto');
          setAlreadyPaidOnline(!!data.order_info?.already_paid_online);
          setSelectedCountryId(data.order_info?.country_id || sessionCountryId || '');
          setAppliedLoyalties(data.applied_loyalties || []);

          // normalise lines — include discount from backend
          const normalised = (data.lines || []).map(l => ({
            ...l,
            id: l.is_loyalty ? `reward_${l.id}` : l.id,
            isReward: l.is_loyalty,
            product_id: l.id,
            discount_percent: l.is_loyalty ? 100 : (l.discount || 0),
          }));
          setOrderLinesData(normalised);

          const notesFromLines = {};
          (data.lines || []).forEach(line => { if (line.note) notesFromLines[line.id] = line.note; });
          setProductNotes(notesFromLines);
          setLoadError(null);
        } else {
          setLoadError('Failed to load order data');
        }
      } catch (error) {
        setLoadError('Error loading order. Redirecting...');
        setTimeout(() => navigate('/orders'), 2000);
      } finally {
        setLoading(false);
      }
    };
    fetchDraftOrder();
  }, [orderId, isDraftOrder, navigate]);

  useEffect(() => {
    if (deliveryTypesData.length > 0 && orderId && order.deliveryTypeId) {
      const selectedType = deliveryTypesData.find(t => t.id === order.deliveryTypeId);
      if (selectedType) {
        const methodExists = selectedType.methods?.some(m => m.id === order.deliveryMethodId);
        if (!methodExists && selectedType.methods?.length > 0) {
          setOrder(prev => ({ ...prev, deliveryMethodId: selectedType.methods[0].id }));
        }
      }
    }
  }, [deliveryTypesData, orderId, order.deliveryTypeId]);

  useEffect(() => {
    if (customer.phone || customer.name || orderLinesData.length > 0) setHasUnsavedChanges(true);
  }, [customer, orderLinesData]);

  useEffect(() => {
    const handler = (e) => { if (hasUnsavedChanges) { e.preventDefault(); e.returnValue = ''; } };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [hasUnsavedChanges]);

  const fetchAreas = async (countryId) => {
    try {
      const response = await axios.post('/api/call_center/areas', { params: { country_id: countryId } }, { withCredentials: true });
      if (response.data.result?.status === 'success') setAreasData(response.data.result?.result || []);
    } catch { setAreasData([]); }
  };

  useEffect(() => {
    const fetchDeliveryTypes = async () => {
      try {
        const response = await axios.post('/api/call_center/delivery/types', { params: {} }, { withCredentials: true });
        if (response.data.result?.status === 'success') setDeliveryTypesData(response.data.result?.result || []);
      } catch { setDeliveryTypesData([]); }
    };
    const fetchWarehouses = async () => {
      try {
        const response = await axios.post('/api/call_center/warehouses', {}, { withCredentials: true });
        if (response.data.result?.status === 'success') setWarehousesData(response.data.result.warehouses);
      } catch { /* ignore */ }
    };
    fetchDeliveryTypes();
    fetchAreas(sessionCountryId);
    fetchWarehouses();
  }, []);

  useEffect(() => { if (selectedCountryId) fetchAreas(selectedCountryId); }, [selectedCountryId]);

  const fetchCountries = async () => {
    if (countriesLoaded || countriesLoading) return;
    setCountriesLoading(true);
    try {
      const res = await axios.post('/api/call_center/countries', { params: {} }, { withCredentials: true });
      if (res.data.result?.status === 'success') { setCountriesData(res.data.result?.result || []); setCountriesLoaded(true); }
    } catch { /* ignore */ }
    finally { setCountriesLoading(false); }
  };

  const selectedTypeObj = useMemo(
    () => deliveryTypesData.find(t => t.id === order.deliveryTypeId),
    [deliveryTypesData, order.deliveryTypeId]
  );
  const selectedMethodObj = useMemo(
    () => selectedTypeObj?.methods?.find(m => m.id === order.deliveryMethodId),
    [selectedTypeObj, order.deliveryMethodId]
  );

  const canAskDiscountPermission = useMemo(() => {
    if (!customer.phone || !customer.name) return false;
    if (orderLinesData.length === 0) return false;
    if (!order.deliveryTypeId || !order.deliveryMethodId) return false;
    return true;
  }, [customer.phone, customer.name, orderLinesData.length, order.deliveryTypeId, order.deliveryMethodId]);

  // ─── handlers ──────────────────────────────────────────────────────────────
  const handleBack = () => {
    if (hasUnsavedChanges && !window.confirm('You have unsaved changes. These will be lost if you leave. Continue?')) return;
    navigate('/orders');
  };

  const handleAreaChange = (event) => {
    const areaId = event.target.value;
    const selectedArea = areasData.find(a => String(a.id) === String(areaId));
    setCustomer(prev => ({ ...prev, area: areaId }));
    if (!selectedArea) return;
    const deliveryChargeValue = selectedArea.branch_delivery_charge || 0;
    setDeliveryCharge(deliveryChargeValue);
    let targetBranchId = selectedArea.branch_id;
    if (!targetBranchId && selectedArea.branch_name) {
      const match = warehousesData.find(w => String(w.name).trim() === String(selectedArea.branch_name).trim());
      targetBranchId = match?.id || '';
    }
    setOrder(prev => ({ ...prev, branch: targetBranchId ? String(targetBranchId) : '', deliveryCharge: deliveryChargeValue }));
  };

  const handleDoctorSearch = async (event) => {
    const value = event.target.value;
    setDoctor(prev => ({ ...prev, doctor_name: value }));
    setDoctorAnchorEl(doctorSearchRef.current);
    if (value.length > 0) {
      try {
        const response = await axios.post('/api/call_center/doctors', { params: { query: value } }, { withCredentials: true, headers: { 'Content-Type': 'application/json' } });
        if (response.data.result?.status === 'success') setDoctorSearchResults(response.data.result?.result || []);
      } catch { setDoctorSearchResults([]); }
    } else { setDoctorSearchResults([]); setDoctorAnchorEl(null); }
  };

  const selectDoctor = (doctorData) => {
    setDoctor({ id: doctorData.id || '', doctor_name: doctorData.doctor_name || '', doctor_phone: doctorData.doctor_phone || '', clinic_name: doctorData.clinic_name || '' });
    setDoctorSearchResults([]);
    setDoctorAnchorEl(null);
  };

  const handlePrescriptionChange = (event) => {
    const isChecked = event.target.checked;
    setHasPrescription(isChecked);
    if (!isChecked) { setDoctor({ id: '', doctor_name: '', doctor_phone: '', clinic_name: '' }); setDoctorSearchResults([]); setDoctorAnchorEl(null); }
  };

  const handleCustomerChange = (field) => async (event) => {
    const value = event.target.value;
    setCustomer(prev => ({ ...prev, [field]: value }));
    if (field === 'phone' && value.length > 0) {
      try {
        const response = await axios.post('/api/call_center/customers', { params: { phone: value } }, { withCredentials: true, headers: { 'Content-Type': 'application/json' } });
        setSearchResults(response.data.result || []);
      } catch { setSearchResults([]); }
    } else if (field === 'phone') { setSearchResults([]); }
  };

  const handleOrderChange = (field) => (event) => {
    const value = event.target.value;
    if (field === 'deliveryTypeId') {
      const selectedType = deliveryTypesData.find(t => t.id === value);
      const firstMethodId = selectedType?.methods?.length > 0 ? selectedType.methods[0].id : '';
      setOrder(prev => ({ ...prev, deliveryTypeId: value, deliveryMethodId: firstMethodId, deliveryCompanyOrderId: '' }));
    } else {
      setOrder(prev => ({ ...prev, [field]: value }));
    }
  };

  const validateOrder = (requireProducts = true) => {
    if (!customer.phone || !customer.name) { alert('Please provide at least a customer name and phone number.'); return false; }
    if (requireProducts && orderLinesData.length === 0) { alert('Please add at least one product.'); return false; }
    if (!order.deliveryTypeId || !order.deliveryMethodId) { alert('Please select a Delivery Type and Delivery Method.'); return false; }
    if (selectedMethodObj?.is_delivery_company && !order.deliveryCompanyOrderId?.trim()) {
      alert('Delivery Company Order ID is required for this delivery method.');
      return false;
    }
    return true;
  };

  // Task 4 — stock check before any save that touches product lines
  const validateStock = () => {
    const violations = checkStockViolations(orderLinesData, deliveryChargeProductId, customerServiceProductId);
    if (violations.length > 0) { alertStockViolations(violations); return false; }
    return true;
  };

  // ─── Task 8: transform lines 
  const transformLinesToBackend = (lines) => {
    const transformed = [];
    lines.forEach(line => {
      if (line.isReward) {
        transformed.push({
          product_id: line.product_id,
          requested_qty: line.qty,
          price_unit: line.price,
          discount_percent: 100,
          is_delivery_charge: false,
          is_loyalty: true,
          loyalty_id: line.loyalty_id || null,
          note: productNotes[line.id] || '',
        });
      } else if (line.isDeliveryCharge) {
        transformed.push({
          product_id: line.id,
          requested_qty: line.qty,
          price_unit: line.price,
          discount_percent: 0,
          is_delivery_charge: true,
          is_loyalty: false,
          loyalty_id: null,
          note: productNotes[line.id] || '',
        });
      } else if (line.isCustomerService) {
        transformed.push({
          product_id: line.id,
          requested_qty: line.qty,
          price_unit: line.price,
          discount_percent: 0,
          is_delivery_charge: false,
          is_customer_service: true,
          is_loyalty: false,
          loyalty_id: null,
          note: productNotes[line.id] || '',
        });
      } else {
        // regular product line
        transformed.push({
          product_id: line.id,
          requested_qty: line.qty,
          price_unit: line.price,
          discount_percent: line.discount_percent || 0,
          is_delivery_charge: false,
          is_loyalty: false,
          loyalty_id: null,
          note: productNotes[line.id] || '',
        });
      }
    });
    return transformed;
  };

  const saveOrder = async (state, overrideLines) => {
    const lines = overrideLines ?? orderLinesData;
    try {
      const customerResponse = await axios.post(
        '/api/call_center/customer/upsert',
        { params: { customer_data: { name: customer.name, phone: customer.phone, area_id: customer.area, country_id: selectedCountryId, street: customer.street, landmark: customer.landmark } } },
        { withCredentials: true }
      );
      if (customerResponse.data.result.status !== 'success') { alert('Failed to save customer data: ' + customerResponse.data.result.message); return null; }

      const confirmedPartnerId = customerResponse.data.result.customer.id;
      const orderPayload = {
        params: {
          company_id: companyId,
          partner_id: confirmedPartnerId,
          area_id: customer.area,
          country_id: selectedCountryId,
          street: customer.street,
          landmark: customer.landmark,
          delivery_type_id: order.deliveryTypeId,
          delivery_method_id: order.deliveryMethodId,
          delivery_company_order_id: selectedMethodObj?.is_delivery_company ? order.deliveryCompanyOrderId : false,
          doctor_id: hasPrescription && doctor.id ? doctor.id : null,
          has_prescription: hasPrescription,
          branch: order.branch,
          scheduled_date: localToUtcOdooDatetime(order.scheduledDate),
          deliveryCharge: order.deliveryCharge,
          deliveryChargeMode: deliveryChargeMode,
          terms_and_conditions: termsAndConditions,
          already_paid_online: alreadyPaidOnline,
          state,
          lines: transformLinesToBackend(lines),
          applied_loyalties: appliedLoyalties.map(a => ({
            loyalty_id: a.loyalty_id,
            loyalty_name: a.loyalty_name,
            activations: a.activations,
            reward_product_id: a.reward_product_id,
            reward_product_name: a.reward_product_name,
            reward_qty_per_activation: a.reward_qty_per_activation,
          })),
        }
      };
      if (isDraftOrder) orderPayload.params.order_id = orderId;
      console.log('Order payload to be sent to backend:', orderPayload);
      const apiEndpoint = isNewOrder ? '/api/call_center/create_order' : '/api/call_center/update_order';
      const orderResponse = await axios.post(apiEndpoint, orderPayload, { withCredentials: true, headers: { 'Content-Type': 'application/json' } });
      if (orderResponse.data.result.status === 'success') return orderResponse.data.result;
      alert('Order ' + (isNewOrder ? 'creation' : 'update') + ' failed: ' + orderResponse.data.result.message);
      return null;
    } catch (error) {
      alert('An error occurred while saving. Please check the console.');
      return null;
    }
  };

  // Task 4: stock check wired into every submission path
  const handleSubmit = async () => {
    if (!validateOrder(true)) return;
    if (!validateStock()) return;
    if (discountStatus === 'pending') { alert('Discount is waiting for approval.'); return; }

    const today = todayDateStr();
    const schedDate = order.scheduledDate.slice(0, 10);
    const orderState = isDraftOrder ? 'not_prepared' : (schedDate > today ? 'draft' : 'not_prepared');
    const result = await saveOrder(orderState);
    if (result) {
      const stateText = orderState === 'draft' ? `scheduled for ${schedDate}` : 'submitted successfully!';
      alert(`Order ${result.order_name} ${stateText}`);
      setHasUnsavedChanges(false);
      navigate('/orders');
    }
  };

  const handleSaveAsDraft = async (silent = false) => {
    if (!validateOrder(false)) return;
    const result = await saveOrder('draft');
    if (result) {
      if (!silent) alert(`Order ${result.order_name} saved as draft successfully!`);
      setHasUnsavedChanges(false);
      if (!silent) navigate('/orders');
    }
  };

  const handleAskDiscountPermission = async (payload) => {
    if (!validateOrder(true)) return;
    if (!validateStock()) return;
    const linesToSave = payload?.lines || orderLinesData;
    setOrderLinesData(linesToSave);
    const result = await saveOrder('wait_for_discount_approval', linesToSave);
    if (result) { setHasUnsavedChanges(false); navigate('/orders'); }
  };

  const handleCancelOrder = async () => {
    if (isDraftOrder) { setShowCancelDialog(true); return; }
    if (hasUnsavedChanges && !window.confirm('You have unsaved changes. Leave without saving?')) return;
    navigate('/orders');
  };

  const confirmCancelOrder = async () => {
    setShowCancelDialog(false);
    if (!validateOrder(false)) return;
    const result = await saveOrder('canceled');
    if (result) { alert(`Order ${result.order_name} has been cancelled.`); setHasUnsavedChanges(false); navigate('/orders'); }
  };

  const selectCustomer = (customerData) => {
    setSearchResults([]);
    if (customerData.locations && customerData.locations.length > 1) {
      setSelectedCustomerData(customerData); setSelectedLocationId(''); setShowLocationDialog(true);
    } else if (customerData.locations && customerData.locations.length === 1) {
      applyCustomerData(customerData, customerData.locations[0]);
    } else {
      applyCustomerData(customerData, null);
    }
  };

  const applyCustomerData = (customerData, location) => {
    const areaId = location?.area || '';
    const countryId = location?.country_id || customerData?.country_id || '';
    setCustomer({ id: customerData.id || '', name: customerData.name || '', phone: customerData.phone || '', area: areaId, landmark: location?.landmark || '', street: location?.street || '', net_sale: customerData.net_sale || '' });
    if (countryId) setSelectedCountryId(String(countryId));
    if (areaId) {
      const selectedArea = areasData.find(a => String(a.id) === String(areaId));
      if (selectedArea) {
        const deliveryChargeValue = selectedArea.branch_delivery_charge || 0;
        setDeliveryCharge(deliveryChargeValue);
        let targetBranchId = selectedArea.branch_id;
        if (!targetBranchId && selectedArea.branch_name) {
          const match = warehousesData.find(w => String(w.name).trim() === String(selectedArea.branch_name).trim());
          targetBranchId = match?.id || '';
        }
        setOrder(prev => ({ ...prev, branch: targetBranchId ? String(targetBranchId) : '', deliveryCharge: deliveryChargeValue }));
      }
    }
  };

  const handleLocationSelect = () => {
    if (!selectedLocationId) { alert('Please select a location'); return; }
    const selectedLocation = (selectedCustomerData?.locations || []).find(loc => String(loc.id) === String(selectedLocationId));
    if (selectedLocation) { applyCustomerData(selectedCustomerData, selectedLocation); setShowLocationDialog(false); }
  };

  if (loading) return <AppLoader />;
  if (loadError) return (
    <Box sx={{ minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', flexDirection: 'column', backgroundColor: C.purpleBg }}>
      <Typography color="error" variant="h6">{loadError}</Typography>
      <Typography color="textSecondary">Redirecting to orders...</Typography>
    </Box>
  );

  // ─── render ────────────────────────────────────────────────────────────────
  return (
    <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="en-gb">
      <Box sx={{
        minHeight: '100vh', background: `linear-gradient(135deg, ${C.purpleBg} 0%, #ffffff 100%)`, py: { xs: 2, sm: 4 }, px: { xs: 1, sm: 2 }, fontFamily: FONT,
        '& .react-datepicker-wrapper': { width: '100%' },
        '& .react-datepicker-popper': { zIndex: 10 },
        '& .react-datepicker': { fontFamily: FONT, border: `1px solid ${alpha(C.purple, 0.15)}`, borderRadius: '16px', boxShadow: `0 12px 36px ${alpha(C.purple, 0.15)}` },
        '& .react-datepicker__header': { backgroundColor: 'white', borderBottom: `1px solid ${alpha(C.purple, 0.1)}`, borderTopLeftRadius: '16px', borderTopRightRadius: '16px', pt: 1.5 },
        '& .react-datepicker__current-month, & .react-datepicker-time__header': { color: '#1e1e1e', fontWeight: 700, fontSize: '15px' },
        '& .react-datepicker__day-name': { color: C.teal, fontWeight: 600 },
        '& .react-datepicker__day': { borderRadius: '8px', color: '#2d2d2d', '&:hover': { backgroundColor: alpha(C.purple, 0.15), borderRadius: '8px', color: '#000000' } },
        '& .react-datepicker__day--selected': { backgroundColor: alpha(C.purple, 0.8), color: '#ffffff', borderRadius: '8px', fontWeight: 600, '&:hover': { backgroundColor: C.purple, borderRadius: '8px', color: '#ffffff' } },
        '& .react-datepicker__day--keyboard-selected': { backgroundColor: alpha(C.purple, 0.8), color: '#ffffff', borderRadius: '8px' },
        '& .react-datepicker__triangle': { display: 'none' },
        '& .react-datepicker__time-container': { width: '100px', borderLeft: `1px solid ${alpha(C.purple, 0.1)}` },
        '& .react-datepicker__time': { backgroundColor: 'white', borderBottomRightRadius: '16px' },
        '& .react-datepicker__time-box': { width: '100% !important', borderRadius: '0 0 16px 0' },
        '& .react-datepicker__time-list-item': { fontFamily: FONT, fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '35px !important', color: '#2d2d2d', '&:hover': { backgroundColor: alpha(C.purple, 0.15) + ' !important' } },
        '& .react-datepicker__time-list-item--selected': { backgroundColor: `${alpha(C.purple, 0.8)} !important`, color: 'white !important', fontWeight: '700 !important' },
        '& .react-datepicker__time-list::-webkit-scrollbar': { width: '6px' },
        '& .react-datepicker__time-list::-webkit-scrollbar-thumb': { background: alpha(C.purple, 0.2), borderRadius: '10px' },
      }}>
        <Container maxWidth="lg" sx={{ px: { xs: 0, sm: 2 } }}>
          <Fade in timeout={600}>
            <Box>
              {/* top bar: back button + chips (same layout as order details) */}
              <Box sx={{ mb: { xs: 3, sm: 4 }, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
                <Button startIcon={<ArrowBackIcon />} onClick={handleBack}
                  sx={{ color: C.purple, fontFamily: FONT, fontWeight: 500, textTransform: 'none', fontSize: { xs: '13px', sm: '15px' }, '&:hover': { backgroundColor: alpha(C.purple, 0.08) } }}>
                  Back to Orders
                </Button>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                  {isDraftOrder && order.orderName && (
                    <Chip label={order.orderName} sx={{ backgroundColor: alpha(C.purple, 0.10), color: C.purple, fontFamily: FONT, fontWeight: 600, fontSize: '13px', height: '28px', borderRadius: R.pill }} />
                  )}
                  <Chip
                    label={isNewOrder ? 'New Order' : 'Draft'}
                    sx={isNewOrder
                      ? { backgroundColor: alpha('#00c9a7', 0.12), color: '#007a65', border: `1.5px solid ${alpha('#00c9a7', 0.35)}`, fontFamily: FONT, fontWeight: 700, fontSize: '13px', height: '28px', borderRadius: R.pill }
                      : { backgroundColor: '#e3f2fd', color: '#1565c0', fontFamily: FONT, fontWeight: 600, fontSize: '13px', height: '28px', borderRadius: R.pill }
                    }
                  />
                </Box>
              </Box>

              {/* ── Main Card ── */}
              <Box sx={{
                backgroundColor: 'white', borderRadius: { xs: R.cardSm, sm: R.card },
                p: { xs: 3, sm: 6 }, mb: 3,
                boxShadow: '0 8px 32px rgba(126, 87, 194, 0.12)',
                border: '1px solid rgba(126, 87, 194, 0.08)',
                position: 'relative', overflow: 'hidden',
                '&::before': { content: '""', position: 'absolute', top: 0, left: 0, right: 0, height: '5px', background: bannerGradient },
              }}>

                {/* header */}
                <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 5, flexWrap: 'wrap', gap: 2 }}>
                  <Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                      <AssignmentIcon sx={{ color: C.purple, fontSize: { xs: 26, sm: 32 } }} />
                      <Typography variant="h4" sx={{ fontWeight: 700, color: C.text, fontFamily: FONT, letterSpacing: '-0.5px', fontSize: { xs: '24px', sm: '32px' } }}>
                        {isNewOrder ? 'New Order' : 'Edit Order'}
                      </Typography>
                    </Box>
                    <Typography variant="body2" sx={{ color: C.muted, fontFamily: FONT, fontSize: { xs: '13px', sm: '14px' }, ml: { xs: 0, sm: '44px' } }}>
                      {isNewOrder ? 'Fill in customer and delivery details to create a new order' : 'Update order information'}
                    </Typography>
                  </Box>

                  {/* already paid online */}
                  <Box
                    onClick={() => setAlreadyPaidOnline(v => !v)}
                    sx={{ display: 'flex', alignItems: 'center', gap: 1.5, px: 2.5, py: 1.5, borderRadius: R.pill, cursor: 'pointer', userSelect: 'none', border: `1.5px solid ${alreadyPaidOnline ? alpha(C.teal, 0.50) : '#e8e4f0'}`, backgroundColor: alreadyPaidOnline ? alpha(C.teal, 0.06) : 'white', transition: 'all 0.2s ease', flexShrink: 0 }}>
                    <PaymentIcon sx={{ fontSize: 20, color: alreadyPaidOnline ? C.teal : C.muted, transition: 'color 0.2s' }} />
                    <Box>
                      <Typography sx={{ fontFamily: FONT, fontWeight: 600, fontSize: '13px', color: alreadyPaidOnline ? C.teal : C.mutedDark, lineHeight: 1.2, transition: 'color 0.2s' }}>Paid Online</Typography>
                      <Typography sx={{ fontFamily: FONT, fontSize: '11px', color: C.muted }}>{alreadyPaidOnline ? 'Yes' : 'No'}</Typography>
                    </Box>
                    <Switch checked={alreadyPaidOnline} onChange={(e) => { e.stopPropagation(); setAlreadyPaidOnline(e.target.checked); }} size="small"
                      sx={{ '& .MuiSwitch-switchBase.Mui-checked': { color: C.teal }, '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { backgroundColor: C.teal } }} />
                  </Box>
                </Box>

                {/* ── Customer Details ── */}
                <Box sx={{ mb: 5 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 3, gap: 1 }}>
                    <PersonIcon sx={{ color: C.purple, fontSize: { xs: 20, sm: 24 } }} />
                    <Typography variant="h6" sx={{ fontWeight: 600, color: C.purple, fontFamily: FONT, fontSize: { xs: '15px', sm: '18px' } }}>Customer Details</Typography>
                  </Box>
                  <Grid container spacing={{ xs: 2, sm: 3 }}>
                    <Grid item xs={12} md={6}>
                      <Box sx={{ position: 'relative' }}>
                        <TextField label="Phone Number" value={customer.phone} onChange={handleCustomerChange('phone')} fullWidth size="medium" sx={formFieldSx}
                          InputProps={{ startAdornment: <PhoneIcon sx={{ color: C.muted, mr: 1, fontSize: { xs: 18, sm: 20 } }} /> }} />
                        {searchResults.length > 0 && (
                          <List sx={{ position: 'absolute', zIndex: 10, backgroundColor: 'white', width: '100%', maxHeight: 200, overflowY: 'auto', border: '1.5px solid #e8e4f0', borderRadius: R.cardSm, mt: 1, boxShadow: '0 8px 24px rgba(126, 87, 194, 0.15)' }}>
                            {searchResults.map((c, index) => (
                              <ListItem key={index} disablePadding>
                                <ListItemButton onClick={() => selectCustomer(c)} sx={{ fontFamily: FONT, py: { xs: 1, sm: 1.25 }, '&:hover': { backgroundColor: alpha(C.purple, 0.06), transform: 'translateX(4px)' } }}>
                                  <ListItemText primary={`${c.phone} - ${c.name}`} secondary={c.locations?.length > 1 ? `${c.locations.length} locations` : ''}
                                    primaryTypographyProps={{ fontFamily: FONT, fontSize: { xs: '13px', sm: '14px' } }}
                                    secondaryTypographyProps={{ fontFamily: FONT, color: C.purple, fontWeight: 500, fontSize: { xs: '12px', sm: '13px' } }} />
                                </ListItemButton>
                              </ListItem>
                            ))}
                          </List>
                        )}
                      </Box>
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField label="Customer Name" value={customer.name} onChange={handleCustomerChange('name')} fullWidth size="medium" sx={formFieldSx}
                        InputProps={{ startAdornment: <PersonIcon sx={{ color: C.muted, mr: 1, fontSize: { xs: 18, sm: 20 } }} /> }} />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField select label="Area" value={customer.area || ''} onChange={handleAreaChange} fullWidth size="medium" sx={{ ...formFieldSx, minWidth: '250px' }} SelectProps={sharedMenuProps}
                        InputProps={{ startAdornment: <LocationOnIcon sx={{ color: C.muted, mr: 1, fontSize: { xs: 18, sm: 20 } }} /> }}>
                        {areasData.length > 0 ? areasData.map(area => <MenuItem key={area.id} value={area.id}>{area.name}</MenuItem>) : <MenuItem disabled>No areas available</MenuItem>}
                      </TextField>
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField select label="Country" value={selectedCountryId} onChange={(e) => setSelectedCountryId(e.target.value)} fullWidth size="medium"
                        sx={{ ...formFieldSx, minWidth: '250px' }} SelectProps={{ ...sharedMenuProps, onOpen: fetchCountries }}
                        InputProps={{ startAdornment: <LocationOnIcon sx={{ color: C.muted, mr: 1, fontSize: { xs: 18, sm: 20 } }} /> }}>
                        {countriesLoading
                          ? <MenuItem disabled><Typography sx={{ fontFamily: FONT, fontSize: '13px', color: C.muted }}>Loading…</Typography></MenuItem>
                          : countriesLoaded
                            ? countriesData.map(c => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)
                            : <MenuItem value={sessionCountryId || ''}>{sessionCountry || 'Select country'}</MenuItem>}
                      </TextField>
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField label="Landmark" value={customer.landmark} onChange={handleCustomerChange('landmark')} fullWidth size="medium" sx={formFieldSx} placeholder="e.g., Near City Mall"
                        InputProps={{ startAdornment: <LandscapeIcon sx={{ color: C.muted, mr: 1, fontSize: { xs: 18, sm: 20 } }} /> }} />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField label="Street" value={customer.street} onChange={handleCustomerChange('street')} fullWidth size="medium" sx={formFieldSx}
                        InputProps={{ startAdornment: <SignpostIcon sx={{ color: C.muted, mr: 1, fontSize: { xs: 18, sm: 20 } }} /> }} />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField label="Net Sale" value={customer.net_sale} fullWidth size="medium" disabled sx={formFieldDisabledSx}
                        InputProps={{ startAdornment: <MonetizationOnIcon sx={{ color: C.muted, mr: 1, fontSize: { xs: 18, sm: 20 } }} /> }} />
                    </Grid>
                  </Grid>
                </Box>

                <Divider sx={{ my: 5, borderColor: alpha(C.purple, 0.1) }} />

                {/* ── Delivery & Scheduling ── */}
                <Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 3, gap: 1 }}>
                    <LocalShippingIcon sx={{ color: C.purple, fontSize: { xs: 20, sm: 24 } }} />
                    <Typography variant="h6" sx={{ fontWeight: 600, color: C.purple, fontFamily: FONT, fontSize: { xs: '15px', sm: '18px' } }}>Delivery & Scheduling</Typography>
                  </Box>
                  <Grid container spacing={{ xs: 2, sm: 3 }}>
                    <Grid item xs={12} md={6}>
                      <DatePicker
                        selected={order.scheduledDate ? new Date(order.scheduledDate) : null}
                        onChange={(date) => handleOrderChange("scheduledDate")({ target: { value: date ? dayjs(date).format("YYYY-MM-DDTHH:mm") : "" } })}
                        showTimeSelect timeFormat="HH:mm" timeIntervals={15} dateFormat="dd/MM/yyyy HH:mm"
                        customInput={
                          <TextField label="Scheduled Date & Time" fullWidth size="medium" sx={formFieldSx} InputLabelProps={{ shrink: true }}
                            InputProps={{ startAdornment: <CalendarTodayIcon sx={{ color: C.muted, mr: 1, fontSize: { xs: 18, sm: 20 }, cursor: 'pointer' }} /> }}
                            helperText={isScheduled ? 'Order will be saved as draft until this date' : 'Order will be processed immediately'} />
                        }
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField select label="Branch" value={order.branch} onChange={handleOrderChange('branch')} fullWidth size="medium" sx={{ ...formFieldSx, minWidth: '250px' }} SelectProps={sharedMenuProps}
                        InputProps={{ startAdornment: <StoreIcon sx={{ color: C.muted, mr: 1, fontSize: { xs: 18, sm: 20 } }} /> }}>
                        {warehousesData.length > 0 ? warehousesData.map(wh => <MenuItem key={wh.id} value={wh.id}>{wh.name}</MenuItem>) : <MenuItem disabled>No branches available</MenuItem>}
                      </TextField>
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField select label="Delivery Type" value={order.deliveryTypeId} onChange={handleOrderChange('deliveryTypeId')} fullWidth size="medium" sx={{ ...formFieldSx, minWidth: '250px' }} SelectProps={sharedMenuProps}>
                        {deliveryTypesData.length > 0 ? deliveryTypesData.map(type => <MenuItem key={type.id} value={type.id}>{type.name}</MenuItem>) : <MenuItem disabled>Loading…</MenuItem>}
                      </TextField>
                    </Grid>
                    {selectedTypeObj && (
                      <Grid item xs={12} md={6}>
                        <TextField select label="Delivery Method" value={order.deliveryMethodId} onChange={handleOrderChange('deliveryMethodId')} fullWidth size="medium" sx={{ ...formFieldSx, minWidth: '250px' }} SelectProps={sharedMenuProps}>
                          {selectedTypeObj.methods.map(method => <MenuItem key={method.id} value={method.id}>{method.name}</MenuItem>)}
                        </TextField>
                      </Grid>
                    )}
                    {selectedMethodObj?.is_delivery_company && (
                      <Grid item xs={12} md={6}>
                        <TextField label="Delivery Company Order ID *" value={order.deliveryCompanyOrderId} onChange={handleOrderChange('deliveryCompanyOrderId')} fullWidth size="medium" sx={formFieldSx}
                          placeholder="e.g., #12345" error={!order.deliveryCompanyOrderId?.trim()} helperText={!order.deliveryCompanyOrderId?.trim() ? 'Required for this delivery method' : ''} />
                      </Grid>
                    )}
                  </Grid>
                </Box>

                <Divider sx={{ my: 5, borderColor: alpha(C.purple, 0.1) }} />

                {/* ── Prescription ── */}
                <Box sx={{ mb: 5, position: 'relative' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 3, gap: 1.5 }}>
                    <PersonIcon sx={{ color: C.purple, fontSize: { xs: 20, sm: 24 } }} />
                    <Typography variant="h6" sx={{ fontWeight: 600, color: C.purple, fontFamily: FONT, fontSize: { xs: '15px', sm: '18px' } }}>Prescription</Typography>
                    <Switch checked={hasPrescription} onChange={handlePrescriptionChange} size="small"
                      sx={{ ml: 0.5, '& .MuiSwitch-switchBase.Mui-checked': { color: C.teal }, '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { backgroundColor: C.teal } }} />
                  </Box>
                  <Grid container spacing={{ xs: 2, sm: 3 }} sx={{ position: 'relative', zIndex: 15 }}>
                    {hasPrescription && (
                      <>
                        <Grid item xs={12} md={6}>
                          <Box sx={{ position: 'relative' }}>
                            <TextField ref={doctorSearchRef} label="Search Doctor" placeholder="Name, Phone, or Clinic Name"
                              onChange={handleDoctorSearch} fullWidth size="medium" sx={formFieldSx}
                              InputProps={{ startAdornment: <PersonIcon sx={{ color: C.muted, mr: 1, fontSize: { xs: 18, sm: 20 } }} /> }} />
                            <Popper open={Boolean(doctorAnchorEl) && doctorSearchResults.length > 0} anchorEl={doctorAnchorEl} placement="bottom-start" style={{ zIndex: 1400 }} modifiers={[{ name: 'offset', options: { offset: [0, 8] } }]}>
                              <Paper sx={{ width: doctorSearchRef.current?.offsetWidth, maxHeight: 280, overflowY: 'auto', border: '1.5px solid #e8e4f0', borderRadius: R.cardSm, boxShadow: '0 8px 24px rgba(126, 87, 194, 0.15)' }}>
                                <List sx={{ p: 0 }}>
                                  {doctorSearchResults.map((doc, index) => (
                                    <ListItem key={index} disablePadding>
                                      <ListItemButton onClick={() => selectDoctor(doc)} sx={{ fontFamily: FONT, py: { xs: 1, sm: 1.5 }, px: { xs: 1.5, sm: 2 }, '&:hover': { backgroundColor: alpha(C.purple, 0.06), transform: 'translateX(4px)' } }}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                                          {doc.image_128 && <Box component="img" src={`data:image/png;base64,${doc.image_128}`} sx={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />}
                                          <ListItemText primary={doc.doctor_name} secondary={`${doc.clinic_name || 'No Clinic'} • ${doc.doctor_phone || 'No Phone'}`}
                                            primaryTypographyProps={{ fontFamily: FONT, fontWeight: 600, fontSize: { xs: '13px', sm: '14px' } }}
                                            secondaryTypographyProps={{ fontFamily: FONT, color: C.purple, fontWeight: 500, fontSize: { xs: '11px', sm: '12px' } }} sx={{ m: 0 }} />
                                        </Box>
                                      </ListItemButton>
                                    </ListItem>
                                  ))}
                                </List>
                              </Paper>
                            </Popper>
                          </Box>
                        </Grid>
                        {doctor.id && (
                          <>
                            <Grid item xs={12} md={6}><TextField label="Doctor Name" value={doctor.doctor_name} fullWidth size="medium" disabled sx={formFieldDisabledSx} InputProps={{ startAdornment: <PersonIcon sx={{ color: C.muted, mr: 1, fontSize: { xs: 18, sm: 20 } }} /> }} /></Grid>
                            <Grid item xs={12} md={6}><TextField label="Doctor Phone" value={doctor.doctor_phone} fullWidth size="medium" disabled sx={formFieldDisabledSx} InputProps={{ startAdornment: <PhoneIcon sx={{ color: C.muted, mr: 1, fontSize: { xs: 18, sm: 20 } }} /> }} /></Grid>
                            <Grid item xs={12} md={6}><TextField label="Clinic Name" value={doctor.clinic_name} fullWidth size="medium" disabled sx={formFieldDisabledSx} InputProps={{ startAdornment: <StoreIcon sx={{ color: C.muted, mr: 1, fontSize: { xs: 18, sm: 20 } }} /> }} /></Grid>
                          </>
                        )}
                      </>
                    )}
                  </Grid>
                </Box>

              </Box>

              {/* ── Order Lines ── */}
              <OrderLines
                initialLines={isDraftOrder ? orderLinesData : []}
                onLinesChange={handleLinesChange}
                onDiscountStatusChange={(status) => setDiscountStatus(status)}
                onDeliveryChargeModeChange={setDeliveryChargeMode}
                initialDeliveryChargeMode={deliveryChargeMode}
                onAskDiscountPermission={handleAskDiscountPermission}
                canAskDiscountPermission={canAskDiscountPermission}
                deliveryType={selectedMethodObj?.is_delivery_company || false}
                deliveryCharge={order.deliveryCharge}
                onTermsAndConditionsChange={handleTermsAndConditionsChange}
                initialTermsAndConditions={termsAndConditions}
                productNotes={productNotes}
                onProductNotesChange={setProductNotes}
                appliedLoyalties={appliedLoyalties}
                onAppliedLoyaltiesChange={setAppliedLoyalties}
              />

              {/* ── Action Buttons ── */}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 4, gap: { xs: 1, sm: 2 }, flexWrap: 'wrap' }}>
                <Button startIcon={<CancelIcon />} onClick={handleCancelOrder} sx={{
                  borderColor: '#ef5350', color: '#ef5350', borderRadius: { xs: R.cardSm, sm: R.pill },
                  px: { xs: 2, sm: 4 }, py: { xs: 1.2, sm: 1.5 }, fontWeight: 600, fontSize: { xs: '13px', sm: '15px' },
                  fontFamily: FONT, textTransform: 'none', border: '2px solid #ef5350',
                  '&:hover': { backgroundColor: alpha('#ef5350', 0.08), borderColor: '#d32f2f' },
                }}>Cancel Order</Button>

                <Box sx={{ display: 'flex', gap: { xs: 1, sm: 2 }, flexWrap: 'wrap' }}>
                  <Button startIcon={<DraftsIcon />} onClick={() => handleSaveAsDraft(false)} sx={{
                    borderColor: '#5d526f', color: '#5d526f', borderRadius: { xs: R.cardSm, sm: R.pill },
                    px: { xs: 2, sm: 4 }, py: { xs: 1.2, sm: 1.5 }, fontWeight: 600, fontSize: { xs: '13px', sm: '15px' },
                    fontFamily: FONT, textTransform: 'none', border: '2px solid #5d526f',
                    '&:hover': { backgroundColor: alpha('#5d526f', 0.08) },
                  }}>Save as Draft</Button>

                  {/* Task 5: dynamic label + icon based on scheduled state */}
                  <Button
                    startIcon={isScheduled ? <ScheduleSendIcon /> : <SendIcon />}
                    onClick={handleSubmit}
                    sx={{
                      backgroundColor: isScheduled ? C.teal : C.purple,
                      color: 'white', borderRadius: { xs: R.cardSm, sm: R.pill },
                      px: { xs: 3, sm: 6 }, py: { xs: 1.2, sm: 1.5 }, fontWeight: 600, fontSize: { xs: '13px', sm: '15px' },
                      fontFamily: FONT, textTransform: 'none',
                      boxShadow: isScheduled ? `0 6px 20px ${alpha(C.teal, 0.35)}` : `0 6px 20px ${alpha(C.purple, 0.35)}`,
                      transition: 'background-color 0.3s ease, box-shadow 0.3s ease',
                      '&:hover': {
                        backgroundColor: isScheduled ? C.tealDark : C.tealDark,
                        boxShadow: `0 8px 28px ${alpha(C.teal, 0.40)}`,
                      },
                    }}>{submitLabel}</Button>
                </Box>
              </Box>

            </Box>
          </Fade>
        </Container>

        {/* ── Location Dialog ── */}
        <Dialog open={showLocationDialog} onClose={() => setShowLocationDialog(false)}
          PaperProps={{ sx: { borderRadius: '24px', p: 2, boxShadow: '0 18px 50px rgba(126, 87, 194, 0.18)', border: '1px solid rgba(126, 87, 194, 0.12)', overflow: 'hidden', position: 'relative', '&::before': { content: '""', position: 'absolute', top: 0, left: 0, right: 0, height: '4px', background: bannerGradient } } }}>
          <DialogTitle sx={{ fontFamily: FONT, fontWeight: 700, color: '#2d2d2d', pt: 3, fontSize: { xs: '18px', sm: '20px' } }}>Select a Location</DialogTitle>
          <DialogContent sx={{ pt: 1 }}>
            <Typography variant="body2" sx={{ fontFamily: FONT, color: '#7a7a7a', mb: 2, fontSize: { xs: '13px', sm: '14px' } }}>
              This customer has multiple saved locations. Choose one to fill the address fields.
            </Typography>
            <FormControl sx={{ width: '100%' }}>
              <RadioGroup value={selectedLocationId} onChange={(e) => setSelectedLocationId(e.target.value)} sx={{ gap: 1 }}>
                {(selectedCustomerData?.locations || []).map((loc) => (
                  <Box key={loc.id} sx={{ borderRadius: '18px', border: `1.5px solid ${alpha(C.purple, selectedLocationId === String(loc.id) ? 0.35 : 0.12)}`, backgroundColor: alpha(C.purple, selectedLocationId === String(loc.id) ? 0.06 : 0.02), transition: 'all 0.2s ease', px: { xs: 1.5, sm: 2 }, py: { xs: 1, sm: 1.5 }, '&:hover': { backgroundColor: alpha(C.purple, 0.06), borderColor: alpha(C.purple, 0.25) } }}>
                    <FormControlLabel value={String(loc.id)}
                      control={<Radio sx={{ color: alpha(C.purple, 0.5), '&.Mui-checked': { color: C.purple } }} />}
                      label={
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                            <Typography sx={{ fontFamily: FONT, fontWeight: 650, color: '#2d2d2d', lineHeight: 1.2, fontSize: { xs: '13px', sm: '14px' } }}>{loc.name || loc.label || 'Location'}</Typography>
                            {loc.branch && <Chip icon={<HomeIcon />} label={loc.branch} size="small" sx={{ backgroundColor: alpha(C.purple, 0.10), color: C.purple, fontWeight: 600, borderRadius: '999px', fontSize: { xs: '11px', sm: '12px' }, '& .MuiChip-icon': { color: C.purple } }} />}
                          </Box>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <LocationOnIcon sx={{ fontSize: { xs: 16, sm: 18 }, color: alpha('#000', 0.45) }} />
                            <Typography variant="body2" sx={{ fontFamily: FONT, color: '#5f5f5f', fontSize: { xs: '12px', sm: '13px' } }}>
                              {[loc.area_name || loc.area, loc.street, loc.landmark].filter(Boolean).join(' • ') || 'No address details'}
                            </Typography>
                          </Box>
                        </Box>
                      }
                      sx={{ m: 0, alignItems: 'flex-start', width: '100%', '& .MuiFormControlLabel-label': { width: '100%' } }}
                    />
                  </Box>
                ))}
              </RadioGroup>
            </FormControl>
          </DialogContent>
          <DialogActions sx={{ px: { xs: 2, sm: 3 }, pb: { xs: 2, sm: 3 }, gap: 1.5 }}>
            <Button onClick={() => setShowLocationDialog(false)} sx={{ color: '#666', fontFamily: FONT, textTransform: 'none', borderRadius: '50px', px: 3, fontSize: { xs: '13px', sm: '14px' } }}>Cancel</Button>
            <Button startIcon={<CheckCircleIcon />} onClick={handleLocationSelect} disabled={!selectedLocationId}
              sx={{ backgroundColor: C.purple, color: 'white', fontFamily: FONT, textTransform: 'none', borderRadius: '50px', px: 4, fontSize: { xs: '13px', sm: '14px' }, boxShadow: `0 6px 18px ${alpha(C.purple, 0.28)}`, '&:hover': { backgroundColor: C.tealDark }, '&.Mui-disabled': { backgroundColor: alpha(C.purple, 0.35), color: 'white' } }}>
              Use this location
            </Button>
          </DialogActions>
        </Dialog>

        {/* ── Cancel Confirmation Dialog ── */}
        <Dialog open={showCancelDialog} onClose={() => setShowCancelDialog(false)}
          PaperProps={{ sx: { borderRadius: '24px', p: 2, overflow: 'hidden', position: 'relative', '&::before': { content: '""', position: 'absolute', top: 0, left: 0, right: 0, height: '4px', background: 'linear-gradient(90deg, #ef5350, #ff867c)' } } }}>
          <DialogTitle sx={{ fontFamily: FONT, fontWeight: 600, color: '#2d2d2d', fontSize: { xs: '18px', sm: '20px' } }}>Cancel Order?</DialogTitle>
          <DialogContent>
            <Typography sx={{ fontFamily: FONT, fontSize: { xs: '13px', sm: '14px' } }}>
              Are you sure you want to cancel this order? This action will save the order with a cancelled status.
            </Typography>
          </DialogContent>
          <DialogActions sx={{ px: { xs: 2, sm: 3 }, pb: { xs: 2, sm: 3 } }}>
            <Button onClick={() => setShowCancelDialog(false)} sx={{ color: '#666', fontFamily: FONT, textTransform: 'none', borderRadius: '50px', px: 3, fontSize: { xs: '13px', sm: '14px' } }}>Go Back</Button>
            <Button onClick={confirmCancelOrder} sx={{ backgroundColor: '#ef5350', color: 'white', fontFamily: FONT, textTransform: 'none', borderRadius: '50px', px: 4, fontSize: { xs: '13px', sm: '14px' }, '&:hover': { backgroundColor: '#d32f2f' } }}>
              Yes, Cancel Order
            </Button>
          </DialogActions>
        </Dialog>

      </Box>
    </LocalizationProvider>
  );
}