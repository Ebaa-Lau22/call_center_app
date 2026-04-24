import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
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
  CircularProgress,
  Popper,
  Paper,
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
import OrderLines from './OrderLines';

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
  const discountProductId = companyData?.discount_service?.id;

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

  const [loading, setLoading] = useState(isDraftOrder);
  const [loadError, setLoadError] = useState(null);

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
  });

  const [doctor, setDoctor] = useState({
    id: '',
    doctor_name: '',
    doctor_phone: '',
    clinic_name: '',
  });

  const handleLinesChange = useCallback((lines) => {
    setOrderLinesData(lines);
  }, []);

  const [doctorSearchResults, setDoctorSearchResults] = useState([]);
  const [orderLinesData, setOrderLinesData] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [selectedCustomerData, setSelectedCustomerData] = useState(null);
  const [showLocationDialog, setShowLocationDialog] = useState(false);
  const [selectedLocationId, setSelectedLocationId] = useState('');
  const [warehousesData, setWarehousesData] = useState([]);
  const [deliveryTypesData, setDeliveryTypesData] = useState([]);
  const [areasData, setAreasData] = useState([]);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [discountStatus, setDiscountStatus] = useState('none');
  const [deliveryCharge, setDeliveryCharge] = useState(0);
  const [deliveryChargeMode, setDeliveryChargeMode] = useState('auto');
  const doctorSearchRef = useRef(null);
  const [doctorAnchorEl, setDoctorAnchorEl] = useState(null);
  const [hasPrescription, setHasPrescription] = useState(false);
  const [termsAndConditions, setTermsAndConditions] = useState('');

  const THEME_PURPLE = '#7e57c2';
  const LIGHT_PURPLE_BG = '#faf9fc';

  const isDeliveryId = (id) => String(id) === String(deliveryChargeProductId);
  const isDiscountId = (id) => String(id) === String(discountProductId);

  useEffect(() => {
    if (isDraftOrder) {
      console.log("Fetching draft order data for order ID:", orderId);
      const fetchDraftOrder = async () => {
        try {
          setLoading(true);
          const response = await axios.post(
            '/api/call_center/order/detail',
            { params: { order_id: orderId } },
            { withCredentials: true }
          );
          console.log("Draft order response:", response);
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

            // Set order with all config values
            const orderConfigData = data.order_config || {};
            setOrder({
              deliveryTypeId: orderConfigData.delivery_type_id || '',
              deliveryMethodId: orderConfigData.delivery_method_id || '',
              deliveryCompanyOrderId: orderConfigData.delivery_company_order_id || '',
              branch: orderConfigData.branch_id || '',
              scheduledDate: utcOdooToLocal(data.order_info?.date) || nowLocal().replace(' ', 'T').slice(0, 16),
              deliveryCharge: orderConfigData.branch_delivery_charge || 0,
            });

            setDoctor({
              id: data.order_config?.doctor_id || '',
              doctor_name: data.order_config?.doctor_name || '',
              doctor_phone: data.order_config?.doctor_phone || '',
              clinic_name: data.order_config?.clinic_name || '',
            });

            setTermsAndConditions(data.order_config?.terms_and_conditions || '');
            setHasPrescription(!!data.order_config?.doctor_id);
            setDeliveryCharge(orderConfigData.branch_delivery_charge || 0);     
            setDeliveryChargeMode(orderConfigData.delivery_charge_option || 'auto');

            const linesData = data.lines || [];
            setOrderLinesData(linesData);
            console.log("draft data:", data);
            setLoadError(null);
          } else {
            setLoadError('Failed to load order data');
            console.error('Error loading order:', response.data.result.message);
          }
        } catch (error) {
          setLoadError('Error loading order. Redirecting...');
          console.error('Error fetching draft order:', error);
          setTimeout(() => navigate('/orders'), 2000);
        } finally {
          setLoading(false);
        }
      };

      fetchDraftOrder();
    } else {
      setLoading(false);
    }
  }, [orderId, isDraftOrder, navigate]);

  useEffect(() => {
    if (deliveryTypesData.length > 0 && orderId && order.deliveryTypeId) {

      const selectedType = deliveryTypesData.find(t => t.id === order.deliveryTypeId);

      if (selectedType) {
        const methodExists = selectedType.methods?.some(m => m.id === order.deliveryMethodId);

        if (!methodExists && selectedType.methods?.length > 0) {
          setOrder(prev => ({
            ...prev,
            deliveryMethodId: selectedType.methods[0].id
          }));
        }
      }
    }
  }, [deliveryTypesData, orderId, order.deliveryTypeId]);

  useEffect(() => {
    if (customer.phone || customer.name || orderLinesData.length > 0) {
      setHasUnsavedChanges(true);
    }
  }, [customer, orderLinesData]);

  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  useEffect(() => {
    const fetchDeliveryTypes = async () => {
      try {
        const response = await axios.post(
          '/api/call_center/delivery/types',
          { params: {} },
          { withCredentials: true }
        );
        if (response.data.result?.status === 'success') {
          setDeliveryTypesData(response.data.result?.result || []);
        }
      } catch (error) {
        console.error("Error fetching delivery types:", error);
        setDeliveryTypesData([]);
      }
    };

    const fetchAreas = async () => {
      try {
        const response = await axios.post(
          '/api/call_center/areas',
          { params: { country_id: sessionCountryId } },
          { withCredentials: true }
        );
        console.log("respone: ", response)
        if (response.data.result?.status === 'success') {
          setAreasData(response.data.result?.result || []);
        }
      } catch (error) {
        console.error("Error fetching areas:", error);
        setAreasData([]);
      }
    };

    const fetchWarehouses = async () => {
      try {
        const response = await axios.post(
          '/api/call_center/warehouses',
          {},
          { withCredentials: true }
        );
        if (response.data.result?.status === 'success') {
          setWarehousesData(response.data.result.warehouses);
        }
      } catch (error) {
        console.error("Error fetching warehouses:", error);
      }
    };

    fetchDeliveryTypes();
    fetchAreas();
    fetchWarehouses();
  }, [sessionCountryId]);

  const selectedTypeObj = useMemo(
    () => deliveryTypesData.find(t => t.id === order.deliveryTypeId),
    [deliveryTypesData, order.deliveryTypeId]
  );

  const selectedMethodObj = useMemo(
    () => selectedTypeObj?.methods?.find(m => m.id === order.deliveryMethodId),
    [selectedTypeObj, order.deliveryMethodId]
  );

  const handleBack = () => {
    if (hasUnsavedChanges) {
      const confirm = window.confirm(
        "You have unsaved changes. These will be lost if you leave. Continue?"
      );
      if (!confirm) return;
    }
    navigate('/orders');
  };

  const handleTermsAndConditionsChange = useCallback((terms) => {
    setTermsAndConditions(terms);
  }, []);

  const handleAreaChange = (event) => {
    const areaId = event.target.value;
    const selectedArea = areasData.find(a => String(a.id) === String(areaId));

    setCustomer(prev => ({
      ...prev,
      area: areaId,
    }));

    if (!selectedArea) return;

    // Extract delivery charge from area
    const deliveryChargeValue = selectedArea.branch_delivery_charge || 0;
    setDeliveryCharge(deliveryChargeValue);

    let targetBranchId = selectedArea.branch_id;

    if (!targetBranchId && selectedArea.branch_name) {
      const matchingWarehouse = warehousesData.find(
        w => String(w.name).trim() === String(selectedArea.branch_name).trim()
      );
      targetBranchId = matchingWarehouse?.id || '';
    }

    const normalizedBranchId = targetBranchId ? String(targetBranchId) : '';

    setOrder(prev => ({
      ...prev,
      branch: normalizedBranchId,
      deliveryCharge: deliveryChargeValue,
    }));
  };

  const handleDoctorSearch = async (event) => {
    const value = event.target.value;

    setDoctor(prev => ({
      ...prev,
      doctor_name: value
    }));

    setDoctorAnchorEl(doctorSearchRef.current);

    if (value.length > 0) {
      try {
        const response = await axios.post(
          '/api/call_center/doctors',
          { params: { query: value } },
          {
            withCredentials: true,
            headers: { 'Content-Type': 'application/json' }
          }
        );
        if (response.data.result?.status === 'success') {
          setDoctorSearchResults(response.data.result?.result || []);
        }
      } catch (error) {
        console.error('Error fetching doctors:', error);
        setDoctorSearchResults([]);
      }
    } else {
      setDoctorSearchResults([]);
      setDoctorAnchorEl(null);
    }
  };

  const selectDoctor = (doctorData) => {
    setDoctor({
      id: doctorData.id || '',
      doctor_name: doctorData.doctor_name || '',
      doctor_phone: doctorData.doctor_phone || '',
      clinic_name: doctorData.clinic_name || '',
    });
    setDoctorSearchResults([]);
    setDoctorAnchorEl(null);
  };

  const handlePrescriptionChange = (event) => {
    const isChecked = event.target.checked;
    setHasPrescription(isChecked);

    if (!isChecked) {
      setDoctor({
        id: '',
        doctor_name: '',
        doctor_phone: '',
        clinic_name: '',
        commission: 0,
      });
      setDoctorSearchResults([]);
      setDoctorAnchorEl(null);
    }
  };

  const handleCustomerChange = (field) => async (event) => {
    const value = event.target.value;
    setCustomer(prev => ({ ...prev, [field]: value }));

    if (field === 'phone' && value.length > 0) {
      try {
        const response = await axios.post(
          '/api/call_center/customers',
          { params: { phone: value } },
          {
            withCredentials: true,
            headers: { 'Content-Type': 'application/json' }
          }
        );
        setSearchResults(response.data.result || []);
      } catch (error) {
        console.error('Error fetching customers:', error);
        setSearchResults([]);
      }
    } else if (field === 'phone') {
      setSearchResults([]);
    }
  };

  const handleOrderChange = (field) => (event) => {
    const value = event.target.value;

    if (field === 'deliveryTypeId') {
      const selectedType = deliveryTypesData.find(t => t.id === value);
      const firstMethodId = selectedType?.methods?.length > 0
        ? selectedType.methods[0].id
        : '';

      setOrder(prev => ({
        ...prev,
        deliveryTypeId: value,
        deliveryMethodId: firstMethodId,
        deliveryCompanyOrderId: ''
      }));
    } else {
      setOrder(prev => ({ ...prev, [field]: value }));
    }

    console.log("isServer?", typeof window === 'undefined');
    console.log("device tz:", Intl.DateTimeFormat().resolvedOptions().timeZone);
    console.log("local:", new Date().toString());
    console.log("utc:", new Date().toISOString());
  };

  const validateOrder = (requireProducts = true) => {
    if (!customer.phone || !customer.name) {
      alert("Please provide at least a customer name and phone number.");
      return false;
    }
    if (requireProducts && orderLinesData.length === 0) {
      alert("Please add at least one product.");
      return false;
    }
    if (!order.deliveryTypeId || !order.deliveryMethodId) {
      alert("Please select a Delivery Type and Delivery Method.");
      return false;
    }
    return true;
  };

  const canAskDiscountPermission = useMemo(() => {
    if (!customer.phone || !customer.name) return false;
    if (orderLinesData.length === 0) return false;
    if (!order.deliveryTypeId || !order.deliveryMethodId) return false;
    return true;
  }, [
    customer.phone,
    customer.name,
    orderLinesData.length,
    order.deliveryTypeId,
    order.deliveryMethodId
  ]);

  const handleAskDiscountPermission = async (payload) => {
    if (!validateOrder(true)) return;

    const linesToSave = payload?.lines || orderLinesData;

    setOrderLinesData(linesToSave);

    const result = await saveOrder('wait_for_discount_approval', linesToSave);
    if (result) {
      setHasUnsavedChanges(false);
      navigate('/orders');
    }
  };
  console.info("order.scheduledDate:", order.scheduledDate);
  const saveOrder = async (state, overrideLines) => {
    const lines = overrideLines ?? orderLinesData;
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
            }
          }
        },
        { withCredentials: true }
      );

      if (customerResponse.data.result.status !== 'success') {
        alert("Failed to save customer data: " + customerResponse.data.result.message);
        return null;
      }
      const confirmedPartnerId = customerResponse.data.result.customer.id;
      const orderPayload = {
        params: {
          company_id: companyId,
          partner_id: confirmedPartnerId,
          area_id: customer.area,
          country_id: sessionCountryId,
          street: customer.street,
          landmark: customer.landmark,
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
          deliveryChargeMode: deliveryChargeMode,
          terms_and_conditions: termsAndConditions,
          state: state,
          lines: lines.map(line => ({
            product_id: line.id,
            requested_qty: line.qty,
            price_unit: line.price,
            is_delivery_charge: isDeliveryId(line.id),
            is_discount: isDiscountId(line.id),
          }))
        }
      };

      console.log("lines before sending", orderPayload);

      const apiEndpoint = isNewOrder
        ? '/api/call_center/create_order'
        : '/api/call_center/update_order';

      if (isDraftOrder) {
        orderPayload.params.order_id = orderId;
      }

      const orderResponse = await axios.post(apiEndpoint, orderPayload, {
        withCredentials: true,
        headers: { 'Content-Type': 'application/json' }
      });
      console.log("Order save response:", orderResponse);
      if (orderResponse.data.result.status === 'success') {
        return orderResponse.data.result;
      } else {
        alert("Order " + (isNewOrder ? "creation" : "update") + " failed: " + orderResponse.data.result.message);
        return null;
      }
    } catch (error) {
      console.error("Save error:", error);
      alert("An error occurred while saving. Please check the console.");
      return null;
    }
  };

  const handleSubmit = async () => {
    if (!validateOrder(true)) return;

    if (discountStatus === 'pending') {
      alert('Discount is waiting for approval.');
      return;
    }

    const today = localToUtcOdooDatetime(nowLocal());
    const scheduledDate = localToUtcOdooDatetime(order.scheduledDate || '');
    const orderState = isDraftOrder ? 'not_prepared' : (scheduledDate > today ? 'draft' : 'not_prepared');

    const result = await saveOrder(orderState);

    if (result) {
      const stateText = orderState === 'draft'
        ? `saved as draft and will be processed on ${scheduledDate}`
        : 'submitted successfully and ready for preparation!';

      alert(`Order ${result.order_name} ${stateText}`);
      setHasUnsavedChanges(false);
      navigate('/orders');
    }
  };

  const handleSaveAsDraft = async (silent = false) => {
    if (!validateOrder(false)) return;

    const result = await saveOrder('draft');

    if (result) {
      if (!silent) {
        alert(`Order ${result.order_name} saved as draft successfully!`);
      }
      setHasUnsavedChanges(false);
      if (!silent) {
        navigate('/orders');
      }
    }
  };

  const handleCancelOrder = async () => {
    if (isDraftOrder) {
      setShowCancelDialog(true);
    } else {
      if (hasUnsavedChanges) {
        const confirm = window.confirm("You have unsaved changes. Leave without saving?");
        if (!confirm) return;
      }
      navigate('/orders');
    }
  };

  const confirmCancelOrder = async () => {
    setShowCancelDialog(false);
    console.log("is validate order", validateOrder(false));
    if (!validateOrder(false)) return;

    const result = await saveOrder('canceled');

    if (result) {
      alert(`Order ${result.order_name} has been cancelled.`);
      setHasUnsavedChanges(false);
      navigate('/orders');
    }
  };

  const selectCustomer = (customerData) => {
    setSearchResults([]);

    if (customerData.locations && customerData.locations.length > 1) {
      setSelectedCustomerData(customerData);
      setSelectedLocationId('');
      setShowLocationDialog(true);
    } else if (customerData.locations && customerData.locations.length === 1) {
      applyCustomerData(customerData, customerData.locations[0]);
    } else {
      applyCustomerData(customerData, null);
    }
  };

  const applyCustomerData = (customerData, location) => {
    const areaId = location?.area || '';

    setCustomer({
      id: customerData.id || '',
      name: customerData.name || '',
      phone: customerData.phone || '',
      area: areaId,
      landmark: location?.landmark || '',
      street: location?.street || '',
      net_sale: customerData.net_sale || '',
    });

    if (false) {
      setOrder(prev => ({
        ...prev,
        branch: location.branch
      }));
    } else if (areaId) {
      const selectedArea = areasData.find(a => String(a.id) === String(areaId));
      if (selectedArea) {

        const deliveryChargeValue = selectedArea.branch_delivery_charge || 0;

        setDeliveryCharge(deliveryChargeValue);

        let targetBranchId = selectedArea.branch_id;

        if (!targetBranchId && selectedArea.branch_name) {
          const matchingWarehouse = warehousesData.find(
            w => String(w.name).trim() === String(selectedArea.branch_name).trim()
          );
          targetBranchId = matchingWarehouse?.id || '';
        }

        const normalizedBranchId = targetBranchId ? String(targetBranchId) : '';
        setOrder(prev => ({
          ...prev,
          branch: normalizedBranchId,
          deliveryCharge: deliveryChargeValue,
        }));
      }
    }
  };


  const handleLocationSelect = () => {
    if (!selectedLocationId) {
      alert("Please select a location");
      return;
    }

    const selectedLocation = (selectedCustomerData?.locations || []).find(
      loc => String(loc.id) === String(selectedLocationId)
    );

    if (selectedLocation) {
      applyCustomerData(selectedCustomerData, selectedLocation);
      setShowLocationDialog(false);
    }
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
            <Box sx={{ mb: 4 }}>
              <Button
                startIcon={<ArrowBackIcon />}
                onClick={handleBack}
                sx={{
                  color: THEME_PURPLE,
                  fontFamily: "'Inter', 'Segoe UI', sans-serif",
                  fontWeight: 500,
                  textTransform: 'none',
                  fontSize: '15px',
                  '&:hover': {
                    backgroundColor: 'rgba(126, 87, 194, 0.08)',
                  }
                }}
              >
                Back to Orders
              </Button>
            </Box>

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
                }
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
                {isNewOrder ? 'Fill in customer and delivery details to create a new order' : 'Update order information'}
              </Typography>

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
                    <Box sx={{ position: 'relative' }}>
                      <TextField
                        label="Phone Number"
                        value={customer.phone}
                        onChange={handleCustomerChange('phone')}
                        fullWidth
                        size="medium"
                        sx={textFieldStyles}
                        InputProps={{
                          startAdornment: (
                            <PhoneIcon sx={{ color: '#9e9e9e', mr: 1, fontSize: 20 }} />
                          ),
                        }}
                      />
                      {searchResults.length > 0 && (
                        <List
                          sx={{
                            position: 'absolute',
                            zIndex: 10,
                            backgroundColor: 'white',
                            width: '100%',
                            maxHeight: 200,
                            overflowY: 'auto',
                            border: '1.5px solid #e8e4f0',
                            borderRadius: '16px',
                            mt: 1,
                            boxShadow: '0 8px 24px rgba(126, 87, 194, 0.15)',
                          }}
                        >
                          {searchResults.map((c, index) => (
                            <ListItem key={index} disablePadding>
                              <ListItemButton
                                onClick={() => selectCustomer(c)}
                                sx={{
                                  fontFamily: "'Inter', 'Segoe UI', sans-serif",
                                  transition: 'all 0.2s ease',
                                  '&:hover': {
                                    backgroundColor: 'rgba(126, 87, 194, 0.06)',
                                    transform: 'translateX(4px)',
                                  }
                                }}
                              >
                                <ListItemText
                                  primary={`${c.phone} - ${c.name}`}
                                  secondary={c.locations?.length > 1 ? `${c.locations.length} locations` : ''}
                                  primaryTypographyProps={{
                                    fontFamily: "'Inter', 'Segoe UI', sans-serif",
                                  }}
                                  secondaryTypographyProps={{
                                    fontFamily: "'Inter', 'Segoe UI', sans-serif",
                                    color: THEME_PURPLE,
                                    fontWeight: 500,
                                  }}
                                />
                              </ListItemButton>
                            </ListItem>
                          ))}
                        </List>
                      )}
                    </Box>
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <TextField
                      label="Customer Name"
                      value={customer.name}
                      onChange={handleCustomerChange('name')}
                      fullWidth
                      size="medium"
                      sx={textFieldStyles}
                      InputProps={{
                        startAdornment: (
                          <PersonIcon sx={{ color: '#9e9e9e', mr: 1, fontSize: 20 }} />
                        ),
                      }}
                    />
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <TextField
                      select
                      label="Area"
                      value={customer.area || ''}
                      onChange={handleAreaChange}
                      fullWidth
                      size="medium"
                      sx={{ ...textFieldStyles, minWidth: '250px' }}
                      SelectProps={selectMenuProps}
                      InputProps={{
                        startAdornment: (
                          <LocationOnIcon sx={{ color: '#9e9e9e', mr: 1, fontSize: 20 }} />
                        ),
                      }}
                    >
                      {areasData.length > 0 ? (
                        areasData.map((area) => (
                          <MenuItem key={area.id} value={area.id}>
                            {area.name}
                          </MenuItem>
                        ))
                      ) : (
                        <MenuItem disabled>No areas available</MenuItem>
                      )}
                    </TextField>
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <TextField
                      label="Country"
                      value={sessionCountry}
                      fullWidth
                      size="medium"
                      disabled
                      sx={{
                        ...textFieldStyles,
                        '& .MuiOutlinedInput-root.Mui-disabled': {
                          backgroundColor: alpha(THEME_PURPLE, 0.02),
                          '& fieldset': {
                            borderColor: '#e8e4f0',
                          },
                        },
                      }}
                      InputProps={{
                        startAdornment: (
                          <LocationOnIcon sx={{ color: '#9e9e9e', mr: 1, fontSize: 20 }} />
                        ),
                      }}
                    />
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <TextField
                      label="Landmark"
                      value={customer.landmark}
                      onChange={handleCustomerChange('landmark')}
                      fullWidth
                      size="medium"
                      sx={textFieldStyles}
                      placeholder="e.g., Near City Mall"
                      InputProps={{
                        startAdornment: (
                          <LandscapeIcon sx={{ color: '#9e9e9e', mr: 1, fontSize: 20 }} />
                        ),
                      }}
                    />
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <TextField
                      label="Street"
                      value={customer.street}
                      onChange={handleCustomerChange('street')}
                      fullWidth
                      size="medium"
                      sx={textFieldStyles}
                      InputProps={{
                        startAdornment: (
                          <SignpostIcon sx={{ color: '#9e9e9e', mr: 1, fontSize: 20 }} />
                        ),
                      }}
                    />
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <TextField
                      label="Net Sale"
                      value={customer.net_sale}
                      onChange={handleCustomerChange('net_sale')}
                      fullWidth
                      size="medium"
                      disabled
                      sx={{
                        ...textFieldStyles,
                        '& .MuiOutlinedInput-root.Mui-disabled': {
                          backgroundColor: alpha(THEME_PURPLE, 0.02),
                          '& fieldset': {
                            borderColor: '#e8e4f0',
                          },
                        },
                      }}
                      InputProps={{
                        startAdornment: (
                          <MonetizationOnIcon sx={{ color: '#9e9e9e', mr: 1, fontSize: 20 }} />
                        ),
                      }}
                    />
                  </Grid>
                </Grid>
              </Box>

              <Divider sx={{ my: 5, borderColor: alpha(THEME_PURPLE, 0.1) }} />

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
                      onChange={handleOrderChange('scheduledDate')}
                      fullWidth
                      size="medium"
                      sx={textFieldStyles}
                      InputLabelProps={{ shrink: true }}
                      InputProps={{
                        startAdornment: (
                          <CalendarTodayIcon sx={{ color: '#9e9e9e', mr: 1, fontSize: 20 }} />
                        ),
                      }}
                      helperText={
                        order.scheduledDate > nowLocal().replace(' ', 'T').slice(0, 16)
                          ? "Order will be saved as draft until this date"
                          : "Order will be processed immediately"
                      }
                    />
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <TextField
                      select
                      label="Branch"
                      value={order.branch}
                      onChange={handleOrderChange('branch')}
                      fullWidth
                      size="medium"
                      sx={{ ...textFieldStyles, minWidth: '250px' }}
                      SelectProps={selectMenuProps}
                      InputProps={{
                        startAdornment: (
                          <StoreIcon sx={{ color: '#9e9e9e', mr: 1, fontSize: 20 }} />
                        ),
                      }}
                    >
                      {warehousesData.length > 0 ? (
                        warehousesData.map((wh) => (
                          <MenuItem key={wh.id} value={wh.id}>
                            {wh.name}
                          </MenuItem>
                        ))
                      ) : (
                        <MenuItem disabled>No branches available</MenuItem>
                      )}
                    </TextField>
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <TextField
                      select
                      label="Delivery Type"
                      value={order.deliveryTypeId}
                      onChange={handleOrderChange('deliveryTypeId')}
                      fullWidth
                      size="medium"
                      sx={{ ...textFieldStyles, minWidth: '250px' }}
                      SelectProps={selectMenuProps}
                    >
                      {deliveryTypesData.length > 0 ? (
                        deliveryTypesData.map((type) => (
                          <MenuItem key={type.id} value={type.id}>
                            {type.name}
                          </MenuItem>
                        ))
                      ) : (
                        <MenuItem disabled>Loading...</MenuItem>
                      )}
                    </TextField>
                  </Grid>

                  {selectedTypeObj && (
                    <Grid item xs={12} md={6}>
                      <TextField
                        select
                        label="Delivery Method"
                        value={order.deliveryMethodId}
                        onChange={handleOrderChange('deliveryMethodId')}
                        fullWidth
                        size="medium"
                        sx={{ ...textFieldStyles, minWidth: '250px' }}
                        SelectProps={selectMenuProps}
                      >
                        {selectedTypeObj.methods.map((method) => (
                          <MenuItem key={method.id} value={method.id}>
                            {method.name}
                          </MenuItem>
                        ))}
                      </TextField>
                    </Grid>
                  )}

                  {selectedMethodObj?.is_delivery_company && (
                    <Grid item xs={12} md={6}>
                      <TextField
                        label="Delivery Company Order ID"
                        value={order.deliveryCompanyOrderId}
                        onChange={handleOrderChange('deliveryCompanyOrderId')}
                        fullWidth
                        size="medium"
                        sx={textFieldStyles}
                        placeholder="e.g., #12345"
                      />
                    </Grid>
                  )}
                </Grid>
              </Box>

              <Divider sx={{ my: 5, borderColor: alpha(THEME_PURPLE, 0.1) }} />

              <Box sx={{ mb: 5, position: 'relative' }}>
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
                    onChange={handlePrescriptionChange}
                    style={{
                      width: '20px',
                      height: '20px',
                      cursor: 'pointer',
                      accentColor: THEME_PURPLE,
                    }}
                  />
                </Box>

                <Grid container spacing={3} sx={{ position: 'relative', zIndex: 15 }}>

                  {/* Show doctor fields only if prescription is checked */}
                  {hasPrescription && (
                    <>
                      <Grid item xs={12} md={6}>
                        <Box sx={{ position: 'relative' }}>
                          <TextField
                            ref={doctorSearchRef}
                            label="Search Doctor"
                            placeholder="Name, Phone, or Clinic Name"
                            onChange={handleDoctorSearch}
                            fullWidth
                            size="medium"
                            sx={textFieldStyles}
                            InputProps={{
                              startAdornment: (
                                <PersonIcon sx={{ color: '#9e9e9e', mr: 1, fontSize: 20 }} />
                              ),
                            }}
                          />
                          <Popper
                            open={Boolean(doctorAnchorEl) && doctorSearchResults.length > 0}
                            anchorEl={doctorAnchorEl}
                            placement="bottom-start"
                            style={{ zIndex: 1400 }}
                            modifiers={[
                              {
                                name: 'offset',
                                options: {
                                  offset: [0, 8],
                                },
                              },
                            ]}
                          >
                            <Paper
                              sx={{
                                width: doctorSearchRef.current?.offsetWidth,
                                maxHeight: 280,
                                overflowY: 'auto',
                                border: '1.5px solid #e8e4f0',
                                borderRadius: '16px',
                                boxShadow: '0 8px 24px rgba(126, 87, 194, 0.15)',
                              }}
                            >
                              <List sx={{ p: 0 }}>
                                {doctorSearchResults.map((doc, index) => (
                                  <ListItem key={index} disablePadding>
                                    <ListItemButton
                                      onClick={() => {
                                        selectDoctor(doc);
                                      }}
                                      sx={{
                                        fontFamily: "'Inter', 'Segoe UI', sans-serif",
                                        transition: 'all 0.2s ease',
                                        py: 1.5,
                                        px: 2,
                                        '&:hover': {
                                          backgroundColor: 'rgba(126, 87, 194, 0.06)',
                                          transform: 'translateX(4px)',
                                        }
                                      }}
                                    >
                                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                                        {doc.image_128 && (
                                          <Box
                                            component="img"
                                            src={`data:image/png;base64,${doc.image_128}`}
                                            sx={{
                                              width: 40,
                                              height: 40,
                                              borderRadius: '50%',
                                              objectFit: 'cover',
                                              flexShrink: 0,
                                            }}
                                          />
                                        )}
                                        <ListItemText
                                          primary={doc.doctor_name}
                                          secondary={`${doc.clinic_name || 'No Clinic'} • ${doc.doctor_phone || 'No Phone'}`}
                                          primaryTypographyProps={{
                                            fontFamily: "'Inter', 'Segoe UI', sans-serif",
                                            fontWeight: 600,
                                            fontSize: '14px',
                                          }}
                                          secondaryTypographyProps={{
                                            fontFamily: "'Inter', 'Segoe UI', sans-serif",
                                            color: THEME_PURPLE,
                                            fontWeight: 500,
                                            fontSize: '12px',
                                          }}
                                          sx={{ m: 0 }}
                                        />
                                      </Box>
                                    </ListItemButton>
                                  </ListItem>
                                ))}
                              </List>
                            </Paper>
                          </Popper>
                        </Box>
                      </Grid>

                      {/* Display doctor info when selected */}
                      {doctor.id && (
                        <>
                          <Grid item xs={12} md={6}>
                            <TextField
                              label="Doctor Name"
                              value={doctor.doctor_name}
                              fullWidth
                              size="medium"
                              disabled
                              sx={{
                                ...textFieldStyles,
                                '& .MuiOutlinedInput-root.Mui-disabled': {
                                  backgroundColor: alpha(THEME_PURPLE, 0.02),
                                  '& fieldset': {
                                    borderColor: '#e8e4f0',
                                  },
                                },
                              }}
                              InputProps={{
                                startAdornment: (
                                  <PersonIcon sx={{ color: '#9e9e9e', mr: 1, fontSize: 20 }} />
                                ),
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
                              sx={{
                                ...textFieldStyles,
                                '& .MuiOutlinedInput-root.Mui-disabled': {
                                  backgroundColor: alpha(THEME_PURPLE, 0.02),
                                  '& fieldset': {
                                    borderColor: '#e8e4f0',
                                  },
                                },
                              }}
                              InputProps={{
                                startAdornment: (
                                  <PhoneIcon sx={{ color: '#9e9e9e', mr: 1, fontSize: 20 }} />
                                ),
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
                              sx={{
                                ...textFieldStyles,
                                '& .MuiOutlinedInput-root.Mui-disabled': {
                                  backgroundColor: alpha(THEME_PURPLE, 0.02),
                                  '& fieldset': {
                                    borderColor: '#e8e4f0',
                                  },
                                },
                              }}
                              InputProps={{
                                startAdornment: (
                                  <StoreIcon sx={{ color: '#9e9e9e', mr: 1, fontSize: 20 }} />
                                ),
                              }}
                            />
                          </Grid>
                        </>
                      )}
                    </>
                  )}
                </Grid>
              </Box>
            </Box>

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
            />

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
              <Button
                startIcon={<CancelIcon />}
                onClick={handleCancelOrder}
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

              <Box sx={{ display: 'flex', gap: 2 }}>
                <Button
                  startIcon={<DraftsIcon />}
                  onClick={() => handleSaveAsDraft(false)}
                  sx={{
                    borderColor: '#5d526f',
                    color: '#5d526f',
                    borderRadius: '50px',
                    px: 4,
                    py: 1.5,
                    fontWeight: 600,
                    fontSize: '15px',
                    fontFamily: "'Inter', 'Segoe UI', sans-serif",
                    textTransform: 'none',
                    border: '2px solid #5d526f',
                    transition: 'border-color 0.3s ease, background-color 0.3s ease',
                    '&:hover': {
                      backgroundColor: alpha('#5d526f', 0.08),
                      borderColor: '#5d526f',
                    },
                  }}
                >
                  Save as Draft
                </Button>

                <Button
                  startIcon={<SendIcon />}
                  onClick={handleSubmit}
                  sx={{
                    backgroundColor: THEME_PURPLE,
                    color: 'white',
                    borderRadius: '50px',
                    px: 6,
                    py: 1.5,
                    fontWeight: 600,
                    fontSize: '15px',
                    fontFamily: "'Inter', 'Segoe UI', sans-serif",
                    textTransform: 'none',
                    boxShadow: '0 6px 20px rgba(126, 87, 194, 0.35)',
                    transition: 'background-color 0.3s ease, box-shadow 0.3s ease',
                    '&:hover': {
                      backgroundColor: '#6d47b0',
                      boxShadow: '0 8px 28px rgba(126, 87, 194, 0.45)',
                    },
                  }}
                >
                  {isDraftOrder ? 'Update Order' : 'Submit Order'}
                </Button>
              </Box>
            </Box>
          </Box>
        </Fade>
      </Container>

      <Dialog
        open={showLocationDialog}
        onClose={() => setShowLocationDialog(false)}
        PaperProps={{
          sx: {
            borderRadius: '24px',
            p: 2,
            boxShadow: '0 18px 50px rgba(126, 87, 194, 0.18)',
            border: '1px solid rgba(126, 87, 194, 0.12)',
            overflow: 'hidden',
            position: 'relative',
            '&::before': {
              content: '""',
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '4px',
              background: `linear-gradient(90deg, ${THEME_PURPLE}, #9575cd)`,
            },
          }
        }}
      >
        <DialogTitle
          sx={{
            fontFamily: "'Inter', 'Segoe UI', sans-serif",
            fontWeight: 700,
            color: '#2d2d2d',
            pt: 3,
          }}
        >
          Select a Location
        </DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          <Typography
            variant="body2"
            sx={{
              fontFamily: "'Inter', 'Segoe UI', sans-serif",
              color: '#7a7a7a',
              mb: 2,
            }}
          >
            This customer has multiple saved locations. Choose one to fill the address fields.
          </Typography>
          <FormControl sx={{ width: '100%' }}>
            <RadioGroup
              value={selectedLocationId}
              onChange={(e) => setSelectedLocationId(e.target.value)}
              sx={{ gap: 1 }}
            >
              {(selectedCustomerData?.locations || []).map((loc) => (
                <Box
                  key={loc.id}
                  sx={{
                    borderRadius: '18px',
                    border: `1.5px solid ${alpha(THEME_PURPLE, selectedLocationId === String(loc.id) ? 0.35 : 0.12)}`,
                    backgroundColor: alpha(THEME_PURPLE, selectedLocationId === String(loc.id) ? 0.06 : 0.02),
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      backgroundColor: alpha(THEME_PURPLE, 0.06),
                      borderColor: alpha(THEME_PURPLE, 0.25),
                    },
                    px: 2,
                    py: 1.5,
                  }}
                >
                  <FormControlLabel
                    value={String(loc.id)}
                    control={
                      <Radio
                        sx={{
                          color: alpha(THEME_PURPLE, 0.5),
                          '&.Mui-checked': {
                            color: THEME_PURPLE
                          }
                        }}
                      />
                    }
                    label={
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                          <Typography
                            sx={{
                              fontFamily: "'Inter', 'Segoe UI', sans-serif",
                              fontWeight: 650,
                              color: '#2d2d2d',
                              lineHeight: 1.2,
                            }}
                          >
                            {loc.name || loc.label || 'Location'}
                          </Typography>
                          {loc.branch && (
                            <Chip
                              icon={<HomeIcon />}
                              label={loc.branch}
                              size="small"
                              sx={{
                                backgroundColor: alpha(THEME_PURPLE, 0.10),
                                color: THEME_PURPLE,
                                fontWeight: 600,
                                borderRadius: '999px',
                                '& .MuiChip-icon': {
                                  color: THEME_PURPLE
                                }
                              }}
                            />
                          )}
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <LocationOnIcon sx={{ fontSize: 18, color: alpha('#000', 0.45) }} />
                          <Typography
                            variant="body2"
                            sx={{
                              fontFamily: "'Inter', 'Segoe UI', sans-serif",
                              color: '#5f5f5f',
                            }}
                          >
                            {[loc.area_name || loc.area, loc.street, loc.landmark]
                              .filter(Boolean)
                              .join(' • ') || 'No address details'}
                          </Typography>
                        </Box>
                      </Box>
                    }
                    sx={{
                      m: 0,
                      alignItems: 'flex-start',
                      width: '100%',
                      '& .MuiFormControlLabel-label': {
                        width: '100%'
                      }
                    }}
                  />
                </Box>
              ))}
            </RadioGroup>
          </FormControl>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3, gap: 1.5 }}>
          <Button
            onClick={() => setShowLocationDialog(false)}
            sx={{
              color: '#666',
              fontFamily: "'Inter', 'Segoe UI', sans-serif",
              textTransform: 'none',
              borderRadius: '50px',
              px: 3,
            }}
          >
            Cancel
          </Button>
          <Button
            startIcon={<CheckCircleIcon />}
            onClick={handleLocationSelect}
            disabled={!selectedLocationId}
            sx={{
              backgroundColor: THEME_PURPLE,
              color: 'white',
              fontFamily: "'Inter', 'Segoe UI', sans-serif",
              textTransform: 'none',
              borderRadius: '50px',
              px: 4,
              boxShadow: '0 6px 18px rgba(126, 87, 194, 0.28)',
              '&:hover': {
                backgroundColor: '#6d47b0',
                boxShadow: '0 8px 24px rgba(126, 87, 194, 0.35)',
              },
              '&.Mui-disabled': {
                backgroundColor: alpha(THEME_PURPLE, 0.35),
                color: 'white',
              }
            }}
          >
            Use this location
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={showCancelDialog}
        onClose={() => setShowCancelDialog(false)}
        PaperProps={{
          sx: {
            borderRadius: '24px',
            p: 2,
          }
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
          <Typography
            sx={{
              fontFamily: "'Inter', 'Segoe UI', sans-serif",
            }}
          >
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
            onClick={confirmCancelOrder}
            sx={{
              backgroundColor: '#ef5350',
              color: 'white',
              fontFamily: "'Inter', 'Segoe UI', sans-serif",
              textTransform: 'none',
              borderRadius: '50px',
              px: 4,
              '&:hover': {
                backgroundColor: '#d32f2f',
              }
            }}
          >
            Yes, Cancel Order
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}