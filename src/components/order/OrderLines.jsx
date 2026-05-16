import { useState, useMemo, useEffect } from 'react';
import axios from 'axios';
import {
  Box, TextField, Button, Dialog, DialogTitle, DialogContent, DialogActions,
  Grid, Card, CardContent, CardMedia, IconButton, Table, TableHead, TableRow,
  TableCell, TableBody, Chip, Fade, alpha, MenuItem, Typography, CircularProgress,
  FormControl, FormControlLabel, RadioGroup, Checkbox, Divider,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import SearchIcon from '@mui/icons-material/Search';
import GridViewIcon from '@mui/icons-material/GridView';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import LocalOfferIcon from '@mui/icons-material/LocalOffer';
import PercentIcon from '@mui/icons-material/Percent';
import MoneyIcon from '@mui/icons-material/AttachMoney';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import GppMaybeIcon from '@mui/icons-material/GppMaybe';
import WarningIcon from '@mui/icons-material/Warning';
import DescriptionIcon from '@mui/icons-material/Description';
import CardGiftcardIcon from '@mui/icons-material/CardGiftcard';
import RedeemIcon from '@mui/icons-material/Redeem';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import MiscellaneousServicesIcon from '@mui/icons-material/MiscellaneousServices';
import NotesIcon from '@mui/icons-material/Notes';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CloseIcon from '@mui/icons-material/Close';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import KeyboardArrowLeftIcon from '@mui/icons-material/KeyboardArrowLeft';
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight';
import HistoryIcon from '@mui/icons-material/History';
import BlockIcon from '@mui/icons-material/Block';

import { C, FONT, R, bannerGradient, textFieldSx, textAreaSx, selectFieldSx } from '../../theme/ccTheme';

const BROWSE_LIMIT = 20;
const LOYALTY_PER_PAGE = 10;

// ─── Discount distribution helpers ───────────────────────────────────────────

function calcMaxDiscount(lines, isDeliveryIdFn, isRewardIdFn, isCustomerServiceIdFn) {
  return lines.reduce((s, l) => {
    if (isDeliveryIdFn(l.id) || isRewardIdFn(l.id) || isCustomerServiceIdFn(l.id)) return s;
    return s + (l.price || 0) * (l.qty || 0) * ((l.max_discount ?? 0) / 100);
  }, 0);
}

function distributeDiscount(lines, discountAmount, isDeliveryIdFn, isRewardIdFn, isCustomerServiceIdFn) {
  const maxDiscount = calcMaxDiscount(lines, isDeliveryIdFn, isRewardIdFn, isCustomerServiceIdFn);
  const exceeds = discountAmount > maxDiscount;

  if (!exceeds) {
    return lines.map(l => {
      if (isDeliveryIdFn(l.id) || isCustomerServiceIdFn(l.id)) return { ...l, discount_percent: 0 };
      if (isRewardIdFn(l.id)) return { ...l, discount_percent: 100 };
      const lineSubtotal = (l.price || 0) * (l.qty || 0);
      const lineMaxDiscount = lineSubtotal * ((l.max_discount ?? 0) / 100);
      if (lineMaxDiscount === 0 || maxDiscount === 0) return { ...l, discount_percent: 0 };
      const ratio = discountAmount / maxDiscount;
      return { ...l, discount_percent: (lineMaxDiscount * ratio / lineSubtotal) * 100 };
    });
  }

  // Case 2 — discount exceeds max
  const step1Map = {};
  lines.forEach(l => {
    if (isDeliveryIdFn(l.id) || isRewardIdFn(l.id) || isCustomerServiceIdFn(l.id)) return;
    const lineSubtotal = (l.price || 0) * (l.qty || 0);
    const lineMaxDiscount = lineSubtotal * ((l.max_discount ?? 0) / 100);
    step1Map[l.id] = { step1Discount: lineMaxDiscount, step1Subtotal: lineSubtotal - lineMaxDiscount, lineSubtotal };
  });

  const totalStep1Subtotal = Object.values(step1Map).reduce((s, v) => s + v.step1Subtotal, 0);
  const extraDiscount = discountAmount - maxDiscount;
  const extraRatio = totalStep1Subtotal > 0 ? extraDiscount / totalStep1Subtotal : 0;

  return lines.map(l => {
    if (isDeliveryIdFn(l.id) || isCustomerServiceIdFn(l.id)) return { ...l, discount_percent: 0 };
    if (isRewardIdFn(l.id)) return { ...l, discount_percent: 100 };
    const info = step1Map[l.id];
    if (!info || info.lineSubtotal === 0) return { ...l, discount_percent: 0 };
    const totalLineDiscount = info.step1Discount + extraRatio * info.step1Subtotal;
    return { ...l, discount_percent: (totalLineDiscount / info.lineSubtotal) * 100 };
  });
}

// ─────────────────────────────────────────────────────────────────────────────

export default function OrderLines({
  initialLines,
  onLinesChange,
  onDiscountStatusChange,
  onDeliveryChargeModeChange,
  initialDeliveryChargeMode,
  onAskDiscountPermission,
  canAskDiscountPermission,
  deliveryType = false,
  deliveryCharge = 0,
  termsAndConditions = '',
  onTermsAndConditionsChange,
  productNotes = {},
  onProductNotesChange,
  appliedLoyalties = [],
  onAppliedLoyaltiesChange,
}) {
  const companyData = JSON.parse(localStorage.getItem('company_data'));
  const currency_symbol = companyData?.currency_symbol;

  const deliveryChargeProductId = companyData?.delivery_charge_service?.id;
  const deliveryChargeProductName = companyData?.delivery_charge_service?.name || 'Delivery Charge';
  const deliveryChargeProductPrice = deliveryCharge || 0.0;
  const deliveryChargeProductCost = companyData?.delivery_charge_service?.cost || 1;
  const maxAmountForDeliveryCharge = companyData?.max_amount_for_delivery_charge || 3;

  const customerServiceProductId = companyData?.customer_service?.id;
  const customerServiceProductName = companyData?.customer_service?.name || 'Customer Service';
  const customerServiceProductPrice = companyData?.customer_service?.price || 0;
  const customerServiceProductCost = companyData?.customer_service?.cost || 0;

  const userData = JSON.parse(localStorage.getItem('user_data') || 'null');
  const isCCManager = userData?.isManager;
  if (!userData?.isManager && !userData?.isCallCenterEmployee) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <Typography color="error">Access denied.</Typography>
      </Box>
    );
  }

  // ─── id helpers ────────────────────────────────────────────────────────────
  const isDeliveryId = (id) => String(id) === String(deliveryChargeProductId);
  const isRewardId = (id) => String(id)?.startsWith('reward_');
  const isCustomerServiceId = (id) => String(id) === String(customerServiceProductId);
  const isServiceLine = (l) => l.isDeliveryCharge || l.isCustomerService;

  // ─── core state ────────────────────────────────────────────────────────────
  const [orderLines, setOrderLines] = useState(() => initialLines?.length > 0 ? initialLines : []);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogSearch, setDialogSearch] = useState('');
  const [browsePage, setBrowsePage] = useState(1);
  const [browseTotalCount, setBrowseTotalCount] = useState(0);
  const [showDiscountDialog, setShowDiscountDialog] = useState(false);
  const [discountType, setDiscountType] = useState('fixed');
  const [discountValue, setDiscountValue] = useState('');
  const [showExceededDialog, setShowExceededDialog] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [browseResults, setBrowseResults] = useState([]);
  const [discountStatus, setDiscountStatus] = useState('none');
  const [waitingForPermission, setWaitingForPermission] = useState(false);
  const [deliveryChargeMode, setDeliveryChargeMode] = useState(initialDeliveryChargeMode ?? 'auto');
  const [localTermsAndConditions, setLocalTermsAndConditions] = useState(termsAndConditions || '');
  const [localProductNotes, setLocalProductNotes] = useState(productNotes || {});

  // loyalty dialog state
  const [loyaltyDialogOpen, setLoyaltyDialogOpen] = useState(false);
  const [loyaltyView, setLoyaltyView] = useState('list');
  const [fetchedLoyalties, setFetchedLoyalties] = useState([]);
  const [selectedLoyalty, setSelectedLoyalty] = useState(null);
  const [isLoadingLoyalties, setIsLoadingLoyalties] = useState(false);
  const [loyaltyPage, setLoyaltyPage] = useState(1);
  const [loyaltyActivations, setLoyaltyActivations] = useState(1);
  const [selectedRewardProdId, setSelectedRewardProdId] = useState(null);
  const [loyaltyCache, setLoyaltyCache] = useState([]);

  // stock dialog state
  const [stockDialogOpen, setStockDialogOpen] = useState(false);
  const [stockDialogProduct, setStockDialogProduct] = useState({ name: '', is_kit: false, qty_details: {} });
  const [stockDialogWh, setStockDialogWh] = useState(null);
  const [stockDialogComponent, setStockDialogComponent] = useState(null);

  // ─── side effects ──────────────────────────────────────────────────────────
  useEffect(() => { onDeliveryChargeModeChange?.(deliveryChargeMode); }, [deliveryChargeMode]);
  useEffect(() => { onTermsAndConditionsChange?.(localTermsAndConditions); }, [localTermsAndConditions]);
  useEffect(() => { onProductNotesChange?.(localProductNotes); }, [localProductNotes]);

  useEffect(() => {
    if (!initialLines) return;
    const normalized = (initialLines || []).map(l => ({
      ...l,
      qty: Number(l.qty || l.product_uom_qty || 1),
      price: Number(l.price ?? 0),
      cost: Number(l.cost ?? 0),
      currency: l.currency || currency_symbol,
      stock_qty: Number(l.stock_qty ?? 0),
      is_kit: !!l.is_kit,
      in_prep_qty: Number(l.in_prep_qty ?? 0),
      discount_percent: isRewardId(l.id) || !!l.is_loyalty ? 100 : Number(l.discount ?? 0),
      isDeliveryCharge: isDeliveryId(l.id),
      isReward: isRewardId(l.id) || !!l.is_loyalty,
      isCustomerService: isCustomerServiceId(l.id),
    }));
    setOrderLines(normalized);
  }, [deliveryChargeProductId, customerServiceProductId, currency_symbol]);

  useEffect(() => {
    const t = setTimeout(() => {
      if (search) fetchSearchProducts(search, setSearchResults, 1, 10);
      else setSearchResults([]);
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    if (!dialogOpen) return;
    if (!dialogSearch) { setBrowseResults([]); setBrowseTotalCount(0); return; }
    const t = setTimeout(() => fetchBrowseProducts(dialogSearch, browsePage), 300);
    return () => clearTimeout(t);
  }, [dialogSearch, dialogOpen, browsePage]);

  useEffect(() => { setBrowsePage(1); }, [dialogSearch]);

  // ─── derived values ────────────────────────────────────────────────────────
  const productTotal = useMemo(() => orderLines
    .filter(l => !isDeliveryId(l.id) && !isRewardId(l.id) && !isCustomerServiceId(l.id))
    .reduce((sum, l) => sum + l.price * l.qty, 0),
    [orderLines]);

  const hasProductLines = useMemo(() =>
    orderLines.some(l => !isDeliveryId(l.id) && !isRewardId(l.id) && !isCustomerServiceId(l.id)),
    [orderLines]);

  const hasRewardApplied = useMemo(() => orderLines.some(l => isRewardId(l.id)), [orderLines]);

  const hasCustomerService = orderLines.some(l => isCustomerServiceId(l.id));

  const hasAnyDiscount = useMemo(() =>
    orderLines.some(l => !isRewardId(l.id) && (l.discount_percent || 0) > 0),
    [orderLines]);

  const shouldApplyDeliveryCharge = useMemo(() => {
    if (deliveryType === true) return false;
    if (deliveryChargeMode === 'remove') return false;
    if (deliveryChargeMode === 'add') return true;
    return productTotal < maxAmountForDeliveryCharge && productTotal > 0;
  }, [deliveryType, deliveryChargeMode, productTotal, maxAmountForDeliveryCharge]);

  const calculatedMaxDiscount = useMemo(() =>
    calcMaxDiscount(orderLines, isDeliveryId, isRewardId, isCustomerServiceId),
    [orderLines]);

  const effectiveMaxDiscount = useMemo(() =>
    Math.floor(calculatedMaxDiscount * 1000) / 1000,
    [calculatedMaxDiscount]);

  const maxDiscountPercent = useMemo(() =>
    productTotal > 0 ? Math.floor((effectiveMaxDiscount / productTotal) * 100 * 1000) / 1000 : 0,
    [effectiveMaxDiscount, productTotal]);

  const totals = useMemo(() => {
    let revenueBeforeDiscount = 0;
    let discountTotal = 0;
    let cost = 0;
    orderLines.forEach(l => {
      if (isRewardId(l.id)) {
        cost += (l.cost || 0) * (l.qty || 0);
        return;
      }
      const lineTotal = (l.price || 0) * (l.qty || 0);
      const lineDiscount = lineTotal * ((l.discount_percent || 0) / 100);
      revenueBeforeDiscount += lineTotal;
      discountTotal += lineDiscount;
      cost += (l.cost || 0) * (l.qty || 0);
    });
    const revenue = revenueBeforeDiscount - discountTotal;
    const margin = revenue - cost;
    return {
      revenue,
      margin,
      percentage: (revenue > 0 ? (margin / revenue) * 100 : 0).toFixed(2),
      discountTotal,
      revenueBeforeDiscount,
    };
  }, [orderLines]);

  const totalPages = Math.max(1, Math.ceil(browseTotalCount / BROWSE_LIMIT));

  const productLinesSignature = useMemo(() =>
    orderLines
      .filter(l => !isDeliveryId(l.id) && !isRewardId(l.id) && !isCustomerServiceId(l.id))
      .map(l => `${l.id}:${l.qty}`)
      .join('|'),
    [orderLines]);

  const adjustedLoyalties = useMemo(() => fetchedLoyalties.map(prog => {
    const applied = appliedLoyalties.find(a => a.loyalty_id === prog.id);
    const usedActivations = applied?.activations || 0;
    return { ...prog, remaining_activations: prog.max_activations - usedActivations, used_activations: usedActivations };
  }), [fetchedLoyalties, appliedLoyalties]);

  const availableLoyalties = useMemo(() => adjustedLoyalties.filter(p => p.remaining_activations > 0), [adjustedLoyalties]);
  const exhaustedLoyalties = useMemo(() => adjustedLoyalties.filter(p => p.remaining_activations <= 0 && p.used_activations > 0), [adjustedLoyalties]);
  const loyaltyTotalPages = Math.max(1, Math.ceil(availableLoyalties.length / LOYALTY_PER_PAGE));
  const pagedLoyalties = availableLoyalties.slice((loyaltyPage - 1) * LOYALTY_PER_PAGE, loyaltyPage * LOYALTY_PER_PAGE);

  // ─── delivery charge auto-management ──────────────────────────────────────
  useEffect(() => {
    setOrderLines(prev => {
      const hasDeliveryCharge = prev.some(l => isDeliveryId(l.id));
      if (shouldApplyDeliveryCharge && !hasDeliveryCharge) {
        return [...prev, {
          id: deliveryChargeProductId, name: deliveryChargeProductName,
          price: deliveryChargeProductPrice, cost: deliveryChargeProductCost,
          qty: 1, currency: currency_symbol, isDeliveryCharge: true,
          discount_percent: 0, stock_qty: 0, in_prep_qty: 0,
        }];
      }
      if (!shouldApplyDeliveryCharge && hasDeliveryCharge) {
        return prev.filter(l => !isDeliveryId(l.id));
      }
      return prev;
    });
  }, [shouldApplyDeliveryCharge, deliveryChargeProductPrice]);

  useEffect(() => { onLinesChange?.(orderLines); }, [orderLines]);
  useEffect(() => {
    if (typeof onDiscountStatusChange === 'function') onDiscountStatusChange(discountStatus);
  }, [discountStatus]);

  // ─── api ───────────────────────────────────────────────────────────────────
  const fetchSearchProducts = async (query, setter, page = 1, limit = 10) => {
    if (!query) { setter([]); return; }
    try {
      const res = await axios.post(
        '/api/call_center/products/search',
        { params: { query, page, limit, company_id: companyData?.id } },
        { withCredentials: true, headers: { 'Content-Type': 'application/json' } }
      );
      const data = res.data.result;
      setter((data?.products || []).filter(p => !isDeliveryId(p.id) && !isCustomerServiceId(p.id)));
    } catch { setter([]); }
  };

  const fetchBrowseProducts = async (query, page = 1) => {
    if (!query) { setBrowseResults([]); setBrowseTotalCount(0); return; }
    try {
      const res = await axios.post(
        '/api/call_center/products/search',
        { params: { query, page, limit: BROWSE_LIMIT, company_id: companyData?.id } },
        { withCredentials: true, headers: { 'Content-Type': 'application/json' } }
      );
      const data = res.data.result;
      setBrowseResults((data?.products || []).filter(p => !isDeliveryId(p.id) && !isCustomerServiceId(p.id)));
      setBrowseTotalCount(data?.total || 0);
    } catch { setBrowseResults([]); setBrowseTotalCount(0); }
  };

  // ─── stock validation ──────────────────────────────────────────────────────
  const validateStockAvailability = () => {
    const violations = [];
    orderLines.forEach(l => {
      if (l.isDeliveryCharge || l.isCustomerService) return;
      const available = (l.stock_qty || 0) - (l.in_prep_qty || 0);
      if ((l.qty || 0) > available) {
        violations.push({ name: l.name, ordered: l.qty, available: Math.max(0, available) });
      }
    });
    return violations;
  };

  const alertStockViolations = (violations) => {
    const lines = violations.map(v => `• ${v.name}: ordered ${v.ordered}, available ${v.available}`).join('\n');
    alert(`Insufficient stock for the following products:\n\n${lines}\n\nPlease adjust quantities before proceeding.`);
  };

  // ─── line mutations ────────────────────────────────────────────────────────
  const withDiscountReset = (lines) => {
    setDiscountStatus('none');
    setWaitingForPermission(false);
    return lines.map(l => ({ ...l, discount_percent: isRewardId(l.id) ? 100 : 0 }));
  };

  const addProduct = (product) => {
    if (isDeliveryId(product.id) || isCustomerServiceId(product.id)) return;
    setOrderLines(prev => {
      const existing = prev.find(l => String(l.id) === String(product.id));
      const base = existing
        ? prev.map(l => String(l.id) === String(product.id) ? { ...l, qty: l.qty + 1 } : l)
        : [...prev, { ...product, qty: 1, stock_qty: product.stock_qty || 0, in_prep_qty: product.in_prep_qty || 0, discount_percent: 0 }];
      return withDiscountReset(base);
    });
  };

  const removeLine = (id) => {
    if (isDeliveryId(id)) return;
    setOrderLines(prev => {
      if (isRewardId(id)) {
        const rewardLine = prev.find(l => String(l.id) === String(id));
        if (rewardLine?.loyalty_id && onAppliedLoyaltiesChange) {
          const removedActivations = rewardLine.reward_qty_per_activation
            ? rewardLine.qty / rewardLine.reward_qty_per_activation : 1;
          const updated = appliedLoyalties
            .map(a => a.loyalty_id === rewardLine.loyalty_id
              ? { ...a, activations: Math.max(0, a.activations - removedActivations) } : a)
            .filter(a => a.activations > 0);
          onAppliedLoyaltiesChange(updated);
        }
        return prev.filter(l => String(l.id) !== String(id));
      }
      return withDiscountReset(prev.filter(l => String(l.id) !== String(id)));
    });
    if (localProductNotes[id]) setLocalProductNotes(prev => { const u = { ...prev }; delete u[id]; return u; });
  };

  const updateQty = (id, qty) => {
    if (isDeliveryId(id) || isRewardId(id) || isCustomerServiceId(id)) return;
    if (qty < 1) return;
    setOrderLines(prev => withDiscountReset(prev.map(l => String(l.id) === String(id) ? { ...l, qty } : l)));
  };

  const updatePrice = (id, value) => {
    setOrderLines(prev => prev.map(l => String(l.id) === String(id) ? { ...l, price: Number(value) || 0 } : l));
  };

  const removeDiscount = () => {
    setOrderLines(prev => prev.map(l => ({ ...l, discount_percent: isRewardId(l.id) ? 100 : 0 })));
    setDiscountStatus('none');
    setWaitingForPermission(false);
  };

  const toggleCustomerService = () => {
    if (hasCustomerService) {
      setOrderLines(prev => prev.filter(l => !isCustomerServiceId(l.id)));
    } else {
      setOrderLines(prev => [...prev, {
        id: customerServiceProductId, name: customerServiceProductName,
        price: customerServiceProductPrice, cost: customerServiceProductCost,
        qty: 1, currency: currency_symbol, isCustomerService: true,
        discount_percent: 0, stock_qty: 0, in_prep_qty: 0,
      }]);
    }
  };

  // ─── loyalty handlers ──────────────────────────────────────────────────────
  useEffect(() => {
    const productLines = orderLines.filter(l => !isDeliveryId(l.id) && !isRewardId(l.id) && !isCustomerServiceId(l.id));
    if (productLines.length === 0) { setLoyaltyCache([]); setIsLoadingLoyalties(false); return; }
    setIsLoadingLoyalties(true);
    const t = setTimeout(async () => {
      try {
        const resp = await axios.post(
          '/api/call_center/order/loyalties',
          { params: { order_lines: productLines.map(l => ({ product_id: l.id, qty: l.qty })), company_id: companyData?.id } },
          { withCredentials: true }
        );
        if (resp.data.result?.status === 'success') setLoyaltyCache(resp.data.result.result || []);
        else setLoyaltyCache([]);
      } catch { setLoyaltyCache([]); }
      setIsLoadingLoyalties(false);
    }, 600);
    return () => clearTimeout(t);
  }, [productLinesSignature]);

  useEffect(() => {
    if (appliedLoyalties.length === 0) return;
    const cacheIds = new Set(loyaltyCache.map(p => p.id));
    const cacheMap = Object.fromEntries(loyaltyCache.map(p => [p.id, p]));

    const staleIds = appliedLoyalties
      .filter(al => !cacheIds.has(al.loyalty_id) || cacheMap[al.loyalty_id]?.max_activations === 0)
      .map(al => al.loyalty_id);

    if (staleIds.length === 0) return;

    const staleSet = new Set(staleIds);
    setOrderLines(prev => prev.filter(l => !isRewardId(l.id) || !staleSet.has(l.loyalty_id)));
    onAppliedLoyaltiesChange?.(appliedLoyalties.filter(al => !staleSet.has(al.loyalty_id)));
  }, [loyaltyCache]);

  const handleGetApplicableLoyalties = () => {
    if (loyaltyCache.length === 0) return;
    setFetchedLoyalties(loyaltyCache);
    setLoyaltyPage(1);
    setLoyaltyView('list');
    setSelectedLoyalty(null);
    setLoyaltyDialogOpen(true);
  };

  const handleOpenLoyaltyDetail = (loyalty) => {
    setSelectedLoyalty(loyalty);
    setLoyaltyActivations(1);
    const firstReward = loyalty.rewards?.[0];
    setSelectedRewardProdId(firstReward?.products?.length === 1 ? firstReward.products[0].id : null);
    setLoyaltyView('detail');
  };

  const handleCloseLoyaltyDialog = () => {
    setLoyaltyDialogOpen(false);
    setLoyaltyView('list');
    setSelectedLoyalty(null);
    setSelectedRewardProdId(null);
    setFetchedLoyalties([]);
  };

  const handleRemoveAppliedLoyalty = (loyaltyId) => {
    setOrderLines(prev => prev.filter(l => l.loyalty_id !== loyaltyId));
    onAppliedLoyaltiesChange?.(appliedLoyalties.filter(a => a.loyalty_id !== loyaltyId));
  };

  const handleConfirmReward = () => {
    if (!selectedLoyalty) return;
    const reward = selectedLoyalty.rewards?.[0];
    if (!reward) return;
    let rewardProduct;
    if (reward.products.length === 1) {
      rewardProduct = reward.products[0];
    } else {
      rewardProduct = reward.products.find(p => p.id === selectedRewardProdId);
      if (!rewardProduct) return;
    }
    const rewardQtyPerActivation = reward.reward_product_qty || 1;
    const totalQty = loyaltyActivations * rewardQtyPerActivation;
    console.log('applied product', rewardProduct);
    setOrderLines(prev => [...prev, {
      id: `reward_${selectedLoyalty.id}_${Date.now()}`,
      name: `Gift: ${rewardProduct.name}`,
      price: rewardProduct.price,
      cost: rewardProduct.cost,
      qty: totalQty,
      product_id: rewardProduct.id,
      loyalty_id: selectedLoyalty.id,
      image: rewardProduct.image,
      stock_qty: rewardProduct.stock_qty || 0,
      in_prep_qty: rewardProduct.in_prep_qty || 0,
      qty_details: {},
      isReward: true,
      reward_qty_per_activation: rewardQtyPerActivation,
      discount_percent: 100,
    }]);

    if (onAppliedLoyaltiesChange) {
      const existingIdx = appliedLoyalties.findIndex(a => a.loyalty_id === selectedLoyalty.id);
      const updated = existingIdx >= 0
        ? appliedLoyalties.map((a, i) => i === existingIdx ? { ...a, activations: a.activations + loyaltyActivations } : a)
        : [...appliedLoyalties, {
          loyalty_id: selectedLoyalty.id, loyalty_name: selectedLoyalty.name,
          activations: loyaltyActivations, reward_product_id: rewardProduct.id,
          reward_product_name: rewardProduct.name, reward_qty_per_activation: rewardQtyPerActivation,
        }];
      onAppliedLoyaltiesChange(updated);
    }
    handleCloseLoyaltyDialog();
  };

  // ─── discount application ──────────────────────────────────────────────────
  const resolveDiscountAmount = () => {
    const v = Number(discountValue);
    if (!v || v <= 0) return null;
    return discountType === 'percent' ? (productTotal * v) / 100 : v;
  };

  const applyDistributedDiscount = (force = false) => {
    if (!canAskDiscountPermission) { alert('Complete required fields before applying discount.'); return; }
    const amount = resolveDiscountAmount();
    if (!amount) { alert('Please enter a valid discount value.'); return; }

    const withinTolerance = amount <= effectiveMaxDiscount * 1.002;
    if (!withinTolerance && !force) { setShowDiscountDialog(false); setShowExceededDialog(true); return; }

    const violations = validateStockAvailability();
    if (violations.length > 0) { alertStockViolations(violations); return; }

    const cappedAmount = withinTolerance ? Math.min(amount, effectiveMaxDiscount) : amount;
    const newLines = distributeDiscount(orderLines, cappedAmount, isDeliveryId, isRewardId, isCustomerServiceId);
    setOrderLines(newLines);
    setDiscountStatus('applied');
    setWaitingForPermission(false);
    setShowDiscountDialog(false);
    setShowExceededDialog(false);
  };

  const askDiscountPermission = () => {
    if (!canAskDiscountPermission) { alert('Please complete customer info, products, delivery type & method before asking discount permission.'); return; }
    const amount = resolveDiscountAmount();
    if (!amount) return;

    const violations = validateStockAvailability();
    if (violations.length > 0) { alertStockViolations(violations); return; }

    const newLines = distributeDiscount(orderLines, amount, isDeliveryId, isRewardId, isCustomerServiceId);
    setOrderLines(newLines);
    setShowExceededDialog(false);
    setDiscountStatus('pending');
    setWaitingForPermission(true);
    setShowDiscountDialog(false);
    onAskDiscountPermission?.({ lines: newLines });
  };

  // ─── shared cell sx ────────────────────────────────────────────────────────
  const thSx = { fontWeight: 600, color: C.text, fontFamily: FONT, fontSize: '11px', py: 1.5, px: 1 };
  const tdSx = { fontFamily: FONT, color: C.text, fontSize: '11px', px: 1, py: 0.75 };
  const numSx = { ...tdSx, fontWeight: 600, color: C.purple };

  // ─── render ────────────────────────────────────────────────────────────────
  return (
    <Fade in timeout={600}>
      <Box sx={{
        backgroundColor: 'white',
        borderRadius: { xs: R.cardSm, sm: R.card },
        p: { xs: 2.5, sm: 5 },
        boxShadow: '0 8px 32px rgba(126, 87, 194, 0.12)',
        border: '1px solid rgba(126, 87, 194, 0.08)',
        position: 'relative', overflow: 'hidden',
        '&::before': { content: '""', position: 'absolute', top: 0, left: 0, right: 0, height: '5px', background: bannerGradient },
      }}>

        {/* header row */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1, flexWrap: 'wrap', gap: { xs: 2, sm: 0 } }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <ShoppingCartIcon sx={{ color: C.purple, fontSize: { xs: 22, sm: 26 } }} />
            <Typography variant="h5" sx={{ fontWeight: 700, color: C.text, fontFamily: FONT, fontSize: { xs: '20px', sm: '26px' } }}>
              Order Lines
            </Typography>
          </Box>

          {deliveryType === false && (
            <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, alignItems: { xs: 'stretch', sm: 'center' }, gap: 1.5, width: { xs: '100%', sm: 'auto' } }}>
              <Box sx={{ width: 32, height: 32, borderRadius: R.soft, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: alpha(C.purple, 0.10) }}>
                <LocalShippingIcon sx={{ fontSize: 18, color: C.purple }} />
              </Box>
              <TextField
                select label="Delivery Charge" value={deliveryChargeMode}
                onChange={(e) => setDeliveryChargeMode(e.target.value)}
                size="small" sx={{ minWidth: { xs: '100%', sm: 200 }, ...selectFieldSx }}
                SelectProps={{ MenuProps: { PaperProps: { sx: { borderRadius: R.cardSm, mt: 1, '& .MuiMenuItem-root': { fontFamily: FONT, borderRadius: R.soft, mx: 1, my: 0.5 } } } } }}>
                <MenuItem value="auto">Auto (recommended)</MenuItem>
                <MenuItem value="add">Manually Added</MenuItem>
                <MenuItem value="remove">Manually Removed</MenuItem>
              </TextField>
            </Box>
          )}
        </Box>

        <Typography variant="body2" sx={{ color: C.muted, mb: 3, fontFamily: FONT, fontSize: '13px' }}>
          Add products to your order by searching or browsing
        </Typography>

        {/* action buttons */}
        <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
          <Button variant="outlined" startIcon={<GridViewIcon sx={{ fontSize: 16 }} />}
            onClick={() => { setDialogOpen(true); setDialogSearch(''); setBrowsePage(1); }}
            sx={{ borderColor: C.purple, color: C.purple, borderRadius: { xs: '10px', sm: R.pill }, px: { xs: 1.5, sm: 3 }, fontFamily: FONT, fontWeight: 500, textTransform: 'none', fontSize: '13px', borderWidth: '1.5px', minHeight: '38px', '&:hover': { backgroundColor: alpha(C.purple, 0.06) } }}>
            Browse
          </Button>

          <Button variant={hasAnyDiscount ? 'contained' : 'outlined'} startIcon={<LocalOfferIcon sx={{ fontSize: 16 }} />}
            disabled={!hasProductLines}
            onClick={() => setShowDiscountDialog(true)}
            sx={hasAnyDiscount ? {
              backgroundColor: C.gold, color: '#3d2e00', borderRadius: { xs: '10px', sm: R.pill }, px: { xs: 1.5, sm: 3 }, fontFamily: FONT, fontWeight: 700, textTransform: 'none', fontSize: '13px', boxShadow: `0 4px 16px ${alpha(C.gold, 0.45)}`, minHeight: '38px', '&:hover': { backgroundColor: C.goldDark, color: 'white' },
            } : {
              borderColor: alpha(C.gold, 0.70), color: C.goldDark, borderRadius: { xs: '10px', sm: R.pill }, px: { xs: 1.5, sm: 3 }, fontFamily: FONT, fontWeight: 600, textTransform: 'none', fontSize: '13px', borderWidth: '1.5px', minHeight: '38px', '&:hover': { backgroundColor: alpha(C.gold, 0.08) }, '&.Mui-disabled': { borderColor: alpha(C.gold, 0.25), color: alpha(C.goldDark, 0.40) },
            }}>
            Discount
          </Button>

          <Button variant={hasRewardApplied ? 'contained' : 'outlined'}
            startIcon={isLoadingLoyalties ? <CircularProgress size={16} sx={{ color: hasRewardApplied ? 'white' : C.pink }} /> : <CardGiftcardIcon sx={{ fontSize: 16 }} />}
            disabled={isLoadingLoyalties || loyaltyCache.length === 0 || !hasProductLines}
            onClick={handleGetApplicableLoyalties}
            sx={hasRewardApplied ? {
              backgroundColor: C.pink, color: 'white', borderRadius: { xs: '10px', sm: R.pill }, px: { xs: 1.5, sm: 3 }, fontFamily: FONT, fontWeight: 600, textTransform: 'none', fontSize: '13px', boxShadow: `0 4px 16px ${alpha(C.pink, 0.35)}`, minHeight: '38px', '&:hover': { backgroundColor: '#e91e63' },
            } : {
              borderColor: alpha(C.pink, 0.60), color: C.pink, borderRadius: { xs: '10px', sm: R.pill }, px: { xs: 1.5, sm: 3 }, fontFamily: FONT, fontWeight: 600, textTransform: 'none', fontSize: '13px', borderWidth: '1.5px', minHeight: '38px', '&:hover': { backgroundColor: alpha(C.pink, 0.06) }, '&.Mui-disabled': { borderColor: alpha(C.pink, 0.25), color: alpha(C.pink, 0.40) },
            }}>
            Reward
            {appliedLoyalties.length > 0 && (
              <Box component="span" sx={{ ml: 0.75, px: 0.8, py: 0.1, borderRadius: '50px', backgroundColor: 'rgba(255,255,255,0.25)', fontSize: '10px', fontWeight: 700 }}>
                {appliedLoyalties.reduce((s, a) => s + a.activations, 0)}
              </Box>
            )}
          </Button>

          {customerServiceProductId && (
            <Button variant={hasCustomerService ? 'contained' : 'outlined'}
              startIcon={<MiscellaneousServicesIcon sx={{ fontSize: 16 }} />}
              onClick={toggleCustomerService}
              sx={hasCustomerService ? {
                backgroundColor: C.teal, color: 'white', borderRadius: { xs: '10px', sm: R.pill }, px: { xs: 1.5, sm: 3 }, fontFamily: FONT, fontWeight: 600, textTransform: 'none', fontSize: '13px', boxShadow: `0 4px 14px ${alpha(C.teal, 0.22)}`, minHeight: '38px', '&:hover': { backgroundColor: '#17b891' },
              } : {
                borderColor: alpha(C.teal, 0.5), color: C.teal, borderRadius: { xs: '10px', sm: R.pill }, px: { xs: 1.5, sm: 3 }, fontFamily: FONT, fontWeight: 500, textTransform: 'none', fontSize: '13px', borderWidth: '1.5px', minHeight: '38px', '&:hover': { backgroundColor: alpha(C.teal, 0.05) },
              }}>
              Cust. Service
            </Button>
          )}
        </Box>

        {/* quick search bar */}
        <Box sx={{ mb: 2.5 }}>
          <TextField placeholder="Search products by name or code..." size="small" fullWidth sx={textFieldSx} value={search} onChange={(e) => setSearch(e.target.value)} InputProps={{ startAdornment: <SearchIcon sx={{ color: C.muted, mr: 1, fontSize: 18 }} /> }} />
        </Box>

        {search.length > 0 && (
          <Fade in>
            <Box sx={{ mb: 2.5 }}>
              {searchResults.length > 0 ? (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                  {searchResults.map(p => (
                    <Chip key={p.id} label={`${p.name} (${p.code})`} size="small" onClick={() => { addProduct(p); setSearch(''); }} sx={{ cursor: 'pointer', backgroundColor: alpha(C.purple, 0.08), color: C.purple, fontFamily: FONT, fontSize: '12px', '&:hover': { backgroundColor: C.purple, color: 'white' } }} />
                  ))}
                </Box>
              ) : (
                <Typography variant="caption" sx={{ color: C.muted }}>No products found</Typography>
              )}
            </Box>
          </Fade>
        )}

        {/* ── order lines table ─────────────────────────────────────────────── */}
        {orderLines.length > 0 ? (
          <Fade in>
            <Box>
              <Box sx={{ backgroundColor: C.purpleBg, borderRadius: { xs: R.soft, sm: R.cardSm }, overflow: 'auto', border: '1px solid #e8e4f0', WebkitOverflowScrolling: 'touch' }}>
                <Table sx={{ minWidth: '938px' }}>
                  <TableHead>
                    <TableRow sx={{ backgroundColor: 'white' }}>
                      <TableCell sx={{ ...thSx, width: '52px', textAlign: 'center' }}>Image</TableCell>
                      <TableCell sx={{ ...thSx, minWidth: '130px' }}>Product</TableCell>
                      <TableCell sx={{ ...thSx, width: '78px', textAlign: 'center' }}>SKU</TableCell>
                      <TableCell sx={{ ...thSx, width: '56px', textAlign: 'center' }}>Stock</TableCell>
                      <TableCell sx={{ ...thSx, width: '60px', textAlign: 'center' }}>In Prep</TableCell>
                      <TableCell sx={{ ...thSx, width: '110px', textAlign: 'center' }}>Qty</TableCell>
                      <TableCell sx={{ ...thSx, width: '70px' }}>Price</TableCell>
                      <TableCell sx={{ ...thSx, width: '68px', textAlign: 'center' }}>Disc %</TableCell>
                      <TableCell sx={{ ...thSx, width: '78px' }}>Before Disc</TableCell>
                      <TableCell sx={{ ...thSx, width: '78px' }}>Subtotal</TableCell>
                      <TableCell sx={{ width: '36px' }} />
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {orderLines.map((line) => {
                      const isService = line.isDeliveryCharge || line.isCustomerService;
                      const lineGross = (line.price || 0) * (line.qty || 0);
                      const lineDiscount = lineGross * ((line.discount_percent || 0) / 100);
                      const lineNet = lineGross - lineDiscount;

                      return (
                        <>
                          <TableRow key={line.id} sx={{
                            backgroundColor: line.isDeliveryCharge ? alpha('#a21ef4', 0.04) : line.isReward ? alpha(C.pink, 0.07) : line.isCustomerService ? alpha(C.teal, 0.06) : line.restricted ? alpha(C.red, 0.04) : 'transparent',
                            '&:hover': { backgroundColor: 'white' },
                          }}>
                            {/* image / icon */}
                            <TableCell sx={{ p: '4px 8px', textAlign: 'center', verticalAlign: 'middle' }}>
                              {line.isDeliveryCharge && <LocalShippingIcon sx={{ fontSize: 22, color: C.purple }} />}
                              {line.isReward && <CardGiftcardIcon sx={{ fontSize: 22, color: C.pink }} />}
                              {line.isCustomerService && <MiscellaneousServicesIcon sx={{ fontSize: 20, color: alpha(C.teal, 0.75) }} />}
                              {!isService && !line.isReward && (
                                <Box sx={{ width: 52, height: 52, mx: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                                  <Box component="img" src={line.image ? `data:image/png;base64,${line.image}` : '/assets/placeholder-product.png'} sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                                </Box>
                              )}
                            </TableCell>

                            {/* product name */}
                            <TableCell sx={tdSx}>
                              <Box>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                  {line.restricted && <WarningIcon sx={{ fontSize: 13, color: '#b71c1c', flexShrink: 0 }} />}
                                  <span style={{ fontWeight: line.isReward ? 600 : 400 }}>{line.name}{line.name_ar ? ` - ${line.name_ar}` : ''}</span>
                                </Box>
                                {line.restricted && <Typography variant="caption" sx={{ display: 'block', mt: 0.25, ml: 2, color: '#b71c1c', fontFamily: FONT, fontSize: '10px', fontWeight: 500 }}>Restricted — prescription required</Typography>}
                              </Box>
                            </TableCell>

                            {/* sku */}
                            <TableCell sx={{ ...tdSx, textAlign: 'center', fontFamily: FONT, fontSize: '12px', color: C.mutedDark, fontWeight: 600, letterSpacing: '0.3px' }}>
                              {isService || line.isReward ? <BlockIcon sx={{ fontSize: 14, color: alpha(C.muted, 0.5) }} /> : (line.code || '—')}
                            </TableCell>

                            {/* stock */}
                            <TableCell sx={{ ...tdSx, textAlign: 'center', fontWeight: 600 }}>
                              {isService ? (
                                <BlockIcon sx={{ fontSize: 14, color: alpha(C.muted, 0.5) }} />
                              ) : (
                                <Box sx={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', pt: Object.keys(line.qty_details || {}).length > 0 ? 1 : 0 }}>
                                  {Object.keys(line.qty_details || {}).length > 0 && (
                                    <IconButton size="small" onClick={() => { setStockDialogProduct({ name: line.name, is_kit: !!line.is_kit, qty_details: line.qty_details }); setStockDialogWh(null); setStockDialogComponent(null); setStockDialogOpen(true); }} sx={{ position: 'absolute', top: -6, right: -12, p: '2px', color: alpha(C.purple, 0.50), '&:hover': { color: C.purple } }}>                                      <InfoOutlinedIcon sx={{ fontSize: 11 }} />
                                    </IconButton>
                                  )}
                                  <span>{line.stock_qty || 0}</span>
                                </Box>
                              )}
                            </TableCell>

                            {/* in prep */}
                            <TableCell sx={{ ...tdSx, textAlign: 'center', fontWeight: 600, color: isService ? C.muted : '#e65100' }}>
                              {isService ? <BlockIcon sx={{ fontSize: 14, color: alpha(C.muted, 0.5) }} /> : (line.in_prep_qty || 0)}
                            </TableCell>

                            {/* qty */}
                            <TableCell sx={{ textAlign: 'center', px: 0.5 }}>
                              {isService ? (
                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                  <Box sx={{ minWidth: '36px', textAlign: 'center', fontFamily: FONT, fontWeight: 600, fontSize: '12px', color: C.muted, backgroundColor: alpha(C.muted, 0.08), borderRadius: R.soft, py: 0.5 }}>{line.qty}</Box>
                                </Box>
                              ) : line.isReward ? (
                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                  <Box sx={{ minWidth: '36px', textAlign: 'center', fontFamily: FONT, fontWeight: 600, fontSize: '12px', color: C.pink, backgroundColor: alpha(C.pink, 0.08), borderRadius: R.soft, py: 0.5 }}>{line.qty}</Box>
                                </Box>
                              ) : (
                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.25 }}>
                                  <IconButton size="small" onClick={() => updateQty(line.id, line.qty - 1)} sx={{ color: alpha(C.purple, 0.5), p: '2px', minHeight: '28px', minWidth: '28px', '&:hover': { color: C.purple } }}><RemoveIcon sx={{ fontSize: 14 }} /></IconButton>
                                  <TextField type="number" inputProps={{ min: 1, step: 1, style: { textAlign: 'center', fontWeight: 700, fontSize: '13px', padding: '4px 0' } }} value={line.qty} onChange={(e) => { const v = e.target.value; if (v && !isNaN(v)) updateQty(line.id, Math.max(1, parseInt(v))); }} sx={{ width: '44px', '& .MuiOutlinedInput-root': { padding: 0, height: '30px', fontFamily: FONT, fontWeight: 700, fontSize: '13px', color: C.purple, backgroundColor: alpha(C.purple, 0.1), borderRadius: R.soft, border: `2px solid ${alpha(C.purple, 0.25)}`, '& fieldset': { border: 'none' } }, '& input[type=number]': { MozAppearance: 'textfield' }, '& input[type=number]::-webkit-outer-spin-button': { WebkitAppearance: 'none' }, '& input[type=number]::-webkit-inner-spin-button': { WebkitAppearance: 'none' } }} />
                                  <IconButton size="small" onClick={() => updateQty(line.id, line.qty + 1)} sx={{ color: alpha(C.purple, 0.5), p: '2px', minHeight: '28px', minWidth: '28px', '&:hover': { color: C.purple } }}><AddIcon sx={{ fontSize: 14 }} /></IconButton>
                                </Box>
                              )}
                            </TableCell>

                            {/* price */}
                            <TableCell sx={tdSx}>
                              {line.isCustomerService ? (
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                  <TextField type="number" size="small" value={line.price} onChange={(e) => updatePrice(line.id, e.target.value)} inputProps={{ min: 0, style: { textAlign: 'center', fontWeight: 600, fontSize: '12px', padding: '4px 6px' } }} sx={{ width: '52px', '& .MuiOutlinedInput-root': { borderRadius: R.soft, fontFamily: FONT, backgroundColor: alpha(C.teal, 0.07), '& fieldset': { borderColor: alpha(C.teal, 0.4) }, '&:hover fieldset': { borderColor: C.teal }, '&.Mui-focused fieldset': { borderColor: C.teal } }, '& input[type=number]': { MozAppearance: 'textfield' }, '& input[type=number]::-webkit-outer-spin-button': { WebkitAppearance: 'none' }, '& input[type=number]::-webkit-inner-spin-button': { WebkitAppearance: 'none' } }} />
                                  <Typography sx={{ fontFamily: FONT, fontSize: '11px', color: C.muted, flexShrink: 0 }}>{currency_symbol}</Typography>
                                </Box>
                              ) : `${(line.price || 0).toFixed(2)} ${currency_symbol}`}
                            </TableCell>

                            {/* disc % */}
                            <TableCell sx={{ ...tdSx, textAlign: 'center' }}>
                              {isService ? (
                                <BlockIcon sx={{ fontSize: 14, color: alpha(C.muted, 0.5) }} />
                              ) : line.isReward ? (
                                <Chip label="100%" size="small" sx={{ backgroundColor: alpha(C.pink, 0.12), color: C.pink, fontFamily: FONT, fontWeight: 700, fontSize: '10px', height: '20px' }} />
                              ) : (line.discount_percent || 0) > 0 ? (
                                <Chip label={`${(line.discount_percent).toFixed(3)}%`} size="small" sx={{ backgroundColor: alpha(C.gold, 0.15), color: C.goldDark, fontFamily: FONT, fontWeight: 700, fontSize: '10px', height: '20px' }} />
                              ) : (
                                <span style={{ color: C.muted }}>—</span>
                              )}
                            </TableCell>

                            {/* subtotal before discount */}
                            <TableCell sx={{ ...tdSx, color: C.mutedDark }}>
                              {isService ? '—' : `${lineGross.toFixed(2)} ${currency_symbol}`}
                            </TableCell>

                            {/* subtotal after discount */}
                            <TableCell sx={numSx}>
                              {(line.price * line.qty).toFixed(2) !== lineNet.toFixed(2) || line.isReward
                                ? <span style={{ color: line.isReward ? C.pink : C.purple }}>{lineNet.toFixed(2)} {currency_symbol}</span>
                                : `${lineNet.toFixed(2)} ${currency_symbol}`
                              }
                            </TableCell>

                            {/* delete */}
                            <TableCell align="right" sx={{ px: 0.5 }}>
                              {!line.isDeliveryCharge && !line.isReward && (
                                <IconButton onClick={() => removeLine(line.id)} sx={{ color: C.red, p: '4px', '&:hover': { backgroundColor: alpha(C.red, 0.10) } }}>
                                  <DeleteIcon sx={{ fontSize: 16 }} />
                                </IconButton>
                              )}
                            </TableCell>
                          </TableRow>

                          {/* note sub-row */}
                          {!isService && (
                            <TableRow sx={{ backgroundColor: alpha(C.purple, 0.012) }}>
                              <TableCell sx={{ p: '0 8px', textAlign: 'center', verticalAlign: 'middle' }}>
                                <NotesIcon sx={{ fontSize: 14, color: '#b8b2c4', display: 'block', mx: 'auto' }} />
                              </TableCell>
                              <TableCell colSpan={10} sx={{ p: 0, verticalAlign: 'middle' }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', minHeight: '30px', pl: '12px', pr: '8px' }}>
                                  <textarea placeholder="Add a note…" value={localProductNotes[line.id] || ''} onChange={(e) => setLocalProductNotes(prev => ({ ...prev, [line.id]: e.target.value.slice(0, 200) }))} maxLength={200} style={{ flex: 1, border: 'none', backgroundColor: 'transparent', fontFamily: FONT, fontSize: '11.5px', color: '#666', outline: 'none', padding: '0', resize: 'none', height: '24px', lineHeight: '24px' }} />
                                </Box>
                              </TableCell>
                            </TableRow>
                          )}
                        </>
                      );
                    })}
                  </TableBody>
                </Table>
              </Box>

              {waitingForPermission && (
                <Fade in>
                  <Box sx={{ mt: 2, p: 2, borderRadius: R.cardSm, backgroundColor: alpha('#efb359', 0.12) }}>
                    <Typography sx={{ fontFamily: FONT, fontWeight: 700, color: '#e65100', fontSize: '13px' }}>Waiting for manager permission on discount</Typography>
                  </Box>
                </Fade>
              )}

              {/* ── totals ─────────────────────────────────────────────────── */}
              <Box sx={{ mt: 3.5, pt: 3.5, borderTop: `2px solid ${alpha(C.purple, 0.15)}`, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: { xs: 2, sm: 0 } }}>
                <Box>
                  <Chip label={`${orderLines.filter(l => !isDeliveryId(l.id) && !isRewardId(l.id) && !isCustomerServiceId(l.id)).length} items`}
                    sx={{ backgroundColor: alpha(C.purple, 0.1), color: C.purple, fontFamily: FONT, fontWeight: 600, fontSize: '12px' }} />
                </Box>
                <Box sx={{ textAlign: 'right' }}>
                  {totals.discountTotal > 0 && (
                    <Box sx={{ mb: 1 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mb: 0.4 }}>
                        <Typography sx={{ color: C.mutedDark, fontFamily: FONT, fontSize: '13px' }}>Before Discount</Typography>
                        <Typography sx={{ color: C.mutedDark, fontFamily: FONT, fontSize: '13px', fontWeight: 600 }}>{totals.revenueBeforeDiscount.toFixed(2)} {currency_symbol}</Typography>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mb: 0.4 }}>
                        <Typography sx={{ color: alpha(C.gold, 0.80), fontFamily: FONT, fontSize: '13px' }}>Discount</Typography>
                        <Typography sx={{ color: alpha(C.gold, 0.80), fontFamily: FONT, fontSize: '13px', fontWeight: 600 }}>−{totals.discountTotal.toFixed(2)} {currency_symbol}</Typography>
                      </Box>
                      <Box sx={{ borderBottom: `1.5px solid ${alpha(C.gold, 0.20)}`, mb: 0.8 }} />
                    </Box>
                  )}
                  <Typography variant="body2" sx={{ color: C.muted, fontFamily: FONT, mb: 0.5, fontSize: '12px' }}>{totals.discountTotal > 0 ? 'Final Total' : 'Total Amount'}</Typography>
                  <Typography variant="h4" sx={{ fontWeight: 700, color: C.purple, fontFamily: FONT, fontSize: { xs: '22px', sm: '28px' } }}>{totals.revenue.toFixed(2)} {currency_symbol}</Typography>
                  <Typography variant="caption" sx={{ display: 'block', mt: 0.75, color: '#616161', fontFamily: FONT, fontWeight: 500, fontSize: '11px' }}>Margin: {totals.margin.toFixed(2)} {currency_symbol} ({totals.percentage}%)</Typography>
                </Box>
              </Box>

              {/* terms and conditions */}
              <Box sx={{ mt: 3.5, pt: 3.5, borderTop: `2px solid ${alpha(C.purple, 0.15)}` }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                  <DescriptionIcon sx={{ color: C.purple, fontSize: { xs: 18, sm: 22 } }} />
                  <Typography sx={{ fontWeight: 700, fontSize: { xs: '13px', sm: '15px' }, color: C.text, fontFamily: FONT }}>Terms & Conditions</Typography>
                </Box>
                <TextField multiline rows={4} placeholder="Add terms and conditions for this order..." value={localTermsAndConditions} onChange={(e) => setLocalTermsAndConditions(e.target.value)} fullWidth sx={textAreaSx} />
              </Box>
            </Box>
          </Fade>
        ) : (
          <Box sx={{ py: { xs: 6, sm: 10 }, textAlign: 'center', backgroundColor: C.purpleBg, borderRadius: { xs: R.soft, sm: R.card }, border: `2px dashed ${alpha(C.purple, 0.2)}` }}>
            <ShoppingCartIcon sx={{ fontSize: { xs: 44, sm: 56 }, color: alpha(C.purple, 0.3), mb: 2 }} />
            <Typography sx={{ color: C.muted, fontFamily: FONT, fontSize: { xs: '13px', sm: '15px' }, fontWeight: 500 }}>No products added yet</Typography>
          </Box>
        )}

        {/* ══════════════════════════════════════════ DIALOGS ══════════════════════════════════════════ */}

        {/* browse dialog */}
        <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: R.card, overflow: 'hidden', position: 'relative', maxWidth: 900, boxShadow: `0 18px 50px ${alpha(C.purple, 0.18)}`, border: `1px solid ${alpha(C.purple, 0.10)}`, '&::before': { content: '""', position: 'absolute', top: 0, left: 0, right: 0, height: '5px', background: bannerGradient, zIndex: 1 } } }}>
          <DialogTitle sx={{ pt: 3, pb: 1.5, px: { xs: 2.5, sm: 4 }, display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Typography sx={{ fontWeight: 700, fontFamily: FONT, fontSize: { xs: '17px', sm: '20px' }, color: C.text }}>Browse Products</Typography>
            {browseTotalCount > 0 && <Box sx={{ px: 1.5, py: 0.3, borderRadius: R.pill, background: bannerGradient, color: 'white', fontFamily: FONT, fontWeight: 700, fontSize: '11px' }}>{browseTotalCount}</Box>}
          </DialogTitle>
          <DialogContent sx={{ pt: 4, px: { xs: 2.5, sm: 4 }, zIndex: 2 }}>
            <TextField placeholder="Search products by name, code, or ingredient..." size="medium" fullWidth sx={{ ...textFieldSx, mb: 3 }} value={dialogSearch} onChange={(e) => setDialogSearch(e.target.value)} InputProps={{ startAdornment: <SearchIcon sx={{ color: C.muted, mr: 1 }} /> }} autoFocus />
            {!dialogSearch && <Box sx={{ py: 8, textAlign: 'center' }}><SearchIcon sx={{ fontSize: 48, color: alpha(C.purple, 0.20), mb: 1.5 }} /><Typography sx={{ fontFamily: FONT, color: C.muted, fontSize: '14px' }}>Type something to find products</Typography></Box>}
            {dialogSearch && (
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' }, gap: 2 }}>
                {browseResults.length > 0 ? browseResults.map((p) => {
                  const selected = orderLines.find(l => l.id === p.id);
                  return (
                    <Card key={p.id} onClick={() => addProduct(p)} sx={{ cursor: 'pointer', width: '100%', height: 240, borderRadius: R.cardSm, border: selected ? `2px solid ${C.purple}` : `1.5px solid ${alpha(C.purple, 0.12)}`, backgroundColor: selected ? alpha(C.purple, 0.03) : 'white', boxShadow: 'none', position: 'relative', display: 'flex', flexDirection: 'column', transition: 'box-shadow 0.15s ease, border-color 0.15s ease', '&:hover': { boxShadow: `0 8px 24px ${alpha(C.purple, 0.16)}`, borderColor: C.purple } }}>
                      {selected && <Box sx={{ position: 'absolute', top: 8, right: 8, backgroundColor: C.purple, color: 'white', borderRadius: R.soft, px: 1.2, py: 0.3, fontWeight: 700, fontSize: '11px', zIndex: 2, minWidth: '26px', textAlign: 'center' }}>{selected.qty}</Box>}
                      <Box sx={{ height: 80, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: C.purpleBg, flexShrink: 0, p: 1 }}>
                        <CardMedia component="img" image={p.image ? `data:image/png;base64,${p.image}` : '/assets/placeholder-product.png'} sx={{ objectFit: 'contain', maxHeight: '100%', width: '100%' }} />
                      </Box>
                      <CardContent sx={{ p: '8px 10px', flexGrow: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                        <Box>
                          <Typography title={p.name} sx={{ fontWeight: 600, fontFamily: FONT, color: C.text, fontSize: '11px', lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{p.name}</Typography>
                          {p.name_ar && <Typography title={p.name_ar} sx={{ fontWeight: 500, fontFamily: FONT, color: C.mutedDark, fontSize: '10px', direction: 'rtl', textAlign: 'right', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{p.name_ar}</Typography>}
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 0.5 }}>
                          <Typography sx={{ color: C.purple, fontFamily: FONT, fontWeight: 700, fontSize: '12px' }}>{p.price} {currency_symbol}</Typography>
                          {p.in_prep_qty > 0 && <Typography sx={{ color: '#e65100', fontFamily: FONT, fontWeight: 600, fontSize: '10px' }}>In Prep: {p.in_prep_qty}</Typography>}
                        </Box>
                      </CardContent>
                    </Card>
                  );
                }) : <Typography align="center" sx={{ py: 6, color: C.muted, fontFamily: FONT, gridColumn: '1 / -1' }}>No products found.</Typography>}
              </Box>
            )}
            {dialogSearch && totalPages > 1 && (
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1.5, mt: 3 }}>
                <IconButton size="small" disabled={browsePage <= 1} onClick={() => setBrowsePage(p => p - 1)} sx={{ color: browsePage <= 1 ? C.muted : C.purple, border: `1.5px solid ${browsePage <= 1 ? '#e0dce8' : alpha(C.purple, 0.30)}`, borderRadius: R.soft }}><ChevronLeftIcon fontSize="small" /></IconButton>
                <Box sx={{ px: 2.5, py: 0.6, borderRadius: R.pill, backgroundColor: alpha(C.purple, 0.07), minWidth: '110px', textAlign: 'center' }}><Typography sx={{ fontFamily: FONT, fontSize: '12px', color: C.mutedDark, fontWeight: 600 }}>Page {browsePage} of {totalPages}</Typography></Box>
                <IconButton size="small" disabled={browsePage >= totalPages} onClick={() => setBrowsePage(p => p + 1)} sx={{ color: browsePage >= totalPages ? C.muted : C.purple, border: `1.5px solid ${browsePage >= totalPages ? '#e0dce8' : alpha(C.purple, 0.30)}`, borderRadius: R.soft }}><ChevronRightIcon fontSize="small" /></IconButton>
              </Box>
            )}
          </DialogContent>
          <DialogActions sx={{ px: { xs: 2.5, sm: 4 }, pb: { xs: 2.5, sm: 4 }, pt: 1 }}>
            <Button onClick={() => setDialogOpen(false)} sx={{ backgroundColor: C.purple, color: 'white', borderRadius: R.pill, px: { xs: 4, sm: 6 }, fontWeight: 600, fontFamily: FONT, textTransform: 'none', '&:hover': { backgroundColor: C.tealDark } }}>Done</Button>
          </DialogActions>
        </Dialog>

        {/* discount dialog */}
        <Dialog open={showDiscountDialog} onClose={() => setShowDiscountDialog(false)} PaperProps={{ sx: { borderRadius: '24px', p: 2, boxShadow: `0 18px 50px ${alpha(C.gold, 0.22)}`, border: `1px solid ${alpha(C.gold, 0.18)}`, overflow: 'hidden', position: 'relative', '&::before': { content: '""', position: 'absolute', top: 0, left: 0, right: 0, height: '4px', background: `linear-gradient(90deg, ${C.gold}, #f5e070, ${C.gold})` } } }}>
          <DialogTitle sx={{ fontFamily: FONT, fontWeight: 700, color: C.text, pt: 3 }}>Apply Discount</DialogTitle>
          <DialogContent sx={{ pt: 1 }}>
            <Typography variant="body2" sx={{ fontFamily: FONT, color: C.mutedDark, mb: 2 }}>
              Max allowed: <strong>{discountType === 'fixed' ? `${effectiveMaxDiscount.toFixed(3)} ${currency_symbol}` : `${maxDiscountPercent.toFixed(3)}%`}</strong>
            </Typography>
            <FormControl sx={{ width: '100%' }}>
              <RadioGroup value={discountType} onChange={(e) => { setDiscountType(e.target.value); setDiscountValue(''); }} sx={{ gap: 1 }}>
                <Box sx={{ borderRadius: '18px', border: `1.5px solid ${alpha(C.gold, discountType === 'fixed' ? 0.55 : 0.15)}`, backgroundColor: alpha(C.gold, discountType === 'fixed' ? 0.07 : 0.02), transition: 'all 0.2s ease', px: 2, py: 1.5 }}>
                  <FormControlLabel value="fixed" control={<Checkbox checked={discountType === 'fixed'} sx={{ display: 'none' }} />} label={<Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><MoneyIcon sx={{ color: alpha('#000', 0.55) }} /><Typography sx={{ fontFamily: FONT, fontWeight: 650 }}>Fixed Amount</Typography></Box>} onClick={() => setDiscountType('fixed')} sx={{ m: 0, width: '100%' }} />
                </Box>
                <Box sx={{ borderRadius: '18px', border: `1.5px solid ${alpha(C.gold, discountType === 'percent' ? 0.55 : 0.15)}`, backgroundColor: alpha(C.gold, discountType === 'percent' ? 0.07 : 0.02), transition: 'all 0.2s ease', px: 2, py: 1.5 }}>
                  <FormControlLabel value="percent" control={<Checkbox checked={discountType === 'percent'} sx={{ display: 'none' }} />} label={<Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><PercentIcon sx={{ color: alpha('#000', 0.55) }} /><Typography sx={{ fontFamily: FONT, fontWeight: 650 }}>Percentage</Typography></Box>} onClick={() => setDiscountType('percent')} sx={{ m: 0, width: '100%' }} />
                </Box>
              </RadioGroup>
            </FormControl>
            <Box sx={{ mt: 2 }}>
              <TextField label={discountType === 'percent' ? 'Discount %' : `Discount Amount (${currency_symbol || ''})`} value={discountValue} onChange={(e) => setDiscountValue(e.target.value.replace(/[^\d.]/g, ''))} fullWidth size="medium" sx={{ '& .MuiOutlinedInput-root': { borderRadius: { xs: R.cardSm, sm: R.pill }, backgroundColor: 'white', fontFamily: FONT, '& fieldset': { borderColor: alpha(C.gold, 0.30), borderWidth: '1.5px' }, '&:hover fieldset': { borderColor: alpha(C.gold, 0.55) }, '&.Mui-focused fieldset': { borderColor: C.gold, borderWidth: '2px' } }, '& .MuiInputLabel-root': { fontFamily: FONT, color: C.muted, '&.Mui-focused': { color: C.gold } }, '& .MuiInputBase-input': { fontFamily: FONT } }} helperText={discountType === 'percent' ? `Products total: ${productTotal.toFixed(3)} ${currency_symbol}` : 'Distributed across eligible lines.'} />
            </Box>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 3, gap: 1, display: 'flex', justifyContent: 'space-between' }}>
            <Button
              startIcon={<BlockIcon sx={{ fontSize: 16 }} />}
              disabled={!hasAnyDiscount}
              onClick={() => { removeDiscount(); setShowDiscountDialog(false); }}
              sx={{ color: hasAnyDiscount ? C.red : C.muted, borderColor: hasAnyDiscount ? C.red : '#e0e0e0', border: '1.5px solid', borderRadius: R.pill, px: 2.5, fontFamily: FONT, textTransform: 'none', fontSize: '13px', '&:hover': { backgroundColor: alpha(C.red, 0.06) }, '&.Mui-disabled': { color: alpha(C.muted, 0.5), borderColor: '#e8e4f0' } }}>
              Remove
            </Button>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button onClick={() => setShowDiscountDialog(false)} sx={{ color: '#666', fontFamily: FONT, textTransform: 'none', borderRadius: R.pill, px: 3 }}>Cancel</Button>
              <Button startIcon={<CheckCircleIcon />} onClick={() => applyDistributedDiscount(false)} disabled={!discountValue || Number(discountValue) <= 0 || productTotal <= 0} sx={{ backgroundColor: C.gold, color: '#3d2e00', fontFamily: FONT, textTransform: 'none', borderRadius: R.pill, px: 3.5, boxShadow: `0 6px 18px ${alpha(C.gold, 0.40)}`, '&:hover': { backgroundColor: C.goldDark, color: 'white' }, '&.Mui-disabled': { backgroundColor: alpha(C.gold, 0.35), color: '#7a6a20' } }}>Apply</Button>
            </Box>
          </DialogActions>
        </Dialog>

        {/* exceeded discount dialog */}
        <Dialog open={showExceededDialog} onClose={() => setShowExceededDialog(false)} PaperProps={{ sx: { borderRadius: '24px', p: 2, boxShadow: `0 18px 50px ${alpha(C.purple, 0.15)}`, border: `1px solid ${alpha(C.purple, 0.12)}`, overflow: 'hidden', position: 'relative', '&::before': { content: '""', position: 'absolute', top: 0, left: 0, right: 0, height: '4px', background: bannerGradient } } }}>
          <DialogTitle sx={{ fontFamily: FONT, fontWeight: 800, color: C.text, pt: 3 }}>Discount Exceeded</DialogTitle>
          <DialogContent sx={{ pt: 1 }}>
            <Typography variant="body2" sx={{ fontFamily: FONT, color: C.mutedDark, mb: 1 }}>
              The entered discount exceeds the allowed maximum of <strong>{effectiveMaxDiscount.toFixed(3)} {currency_symbol}</strong>.
            </Typography>
            <Typography variant="body2" sx={{ fontFamily: FONT, color: C.mutedDark }}>
              {isCCManager ? 'As a manager, you can allow it.' : 'You need manager approval to proceed.'}
            </Typography>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 3, gap: 1.5 }}>
            <Button onClick={() => setShowExceededDialog(false)} sx={{ color: '#666', fontFamily: FONT, textTransform: 'none', borderRadius: R.pill, px: 3 }}>Cancel</Button>
            {!isCCManager ? (
              <Button startIcon={<GppMaybeIcon />} onClick={askDiscountPermission} sx={{ backgroundColor: C.purple, color: 'white', fontFamily: FONT, textTransform: 'none', borderRadius: R.pill, px: 4, boxShadow: `0 6px 18px ${alpha(C.purple, 0.25)}`, '&:hover': { backgroundColor: C.red } }}>Ask Permission</Button>
            ) : (
              <Button startIcon={<CheckCircleIcon />} onClick={() => applyDistributedDiscount(true)} sx={{ backgroundColor: C.purple, color: 'white', fontFamily: FONT, textTransform: 'none', borderRadius: R.pill, px: 4, boxShadow: `0 6px 18px ${alpha(C.purple, 0.25)}`, '&:hover': { backgroundColor: C.red } }}>Allow</Button>
            )}
          </DialogActions>
        </Dialog>

        {/* ── Loyalty dialog ── */}
        <Dialog open={loyaltyDialogOpen} onClose={handleCloseLoyaltyDialog} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: '24px', p: 1, boxShadow: `0 12px 36px rgba(0,0,0,0.10)`, border: '1px solid #ebebeb', overflow: 'hidden', position: 'relative', '&::before': { content: '""', position: 'absolute', top: 0, left: 0, right: 0, height: '4px', background: `linear-gradient(90deg, ${C.pink}, #f48fb1, ${C.pink})` } } }}>
          <DialogTitle sx={{ pt: 3, pb: 1.5, display: 'flex', alignItems: 'center', gap: 1.5, pr: 6 }}>
            {(loyaltyView === 'detail' || loyaltyView === 'applied') ? (
              <IconButton size="small" onClick={() => setLoyaltyView('list')} sx={{ color: C.mutedDark, border: '1.5px solid #e0e0e0', borderRadius: R.soft, p: '4px', '&:hover': { backgroundColor: '#f5f5f5' } }}>
                <ArrowBackIcon fontSize="small" />
              </IconButton>
            ) : (
              <Box sx={{ width: 36, height: 36, borderRadius: R.soft, backgroundColor: '#f5f5f5', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <CardGiftcardIcon sx={{ color: C.pink, fontSize: 20 }} />
              </Box>
            )}
            <Box>
              <Typography sx={{ fontFamily: FONT, fontWeight: 700, fontSize: '16px', color: C.text, lineHeight: 1.2 }}>
                {loyaltyView === 'detail' ? selectedLoyalty?.name : loyaltyView === 'applied' ? 'Applied Rewards' : 'Available Rewards'}
              </Typography>
              <Typography sx={{ fontFamily: FONT, fontSize: '12px', color: C.mutedDark, fontWeight: 400, mt: 0.25 }}>
                {loyaltyView === 'detail' ? 'Set activations and choose your reward product'
                  : loyaltyView === 'applied' ? `${appliedLoyalties.length} program${appliedLoyalties.length !== 1 ? 's' : ''} applied`
                    : `${availableLoyalties.length} available · ${appliedLoyalties.length} applied`}
              </Typography>
            </Box>
            <IconButton size="small" onClick={handleCloseLoyaltyDialog} sx={{ position: 'absolute', right: 14, top: 14, color: C.muted, '&:hover': { color: C.text, backgroundColor: '#f5f5f5' } }}>
              <CloseIcon fontSize="small" />
            </IconButton>
          </DialogTitle>

          <DialogContent sx={{ pt: 0.5, pb: 3 }}>
            {loyaltyView === 'list' && (
              <Box>
                {appliedLoyalties.length > 0 && (
                  <Box onClick={() => setLoyaltyView('applied')} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 2, py: 1.5, mb: 2, borderRadius: '12px', border: '1.5px solid #ebebeb', cursor: 'pointer', backgroundColor: '#fafafa', '&:hover': { backgroundColor: '#f5f5f5', borderColor: '#d0d0d0' }, transition: 'all 0.15s ease' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <HistoryIcon sx={{ color: C.pink, fontSize: 18 }} />
                      <Typography sx={{ fontFamily: FONT, fontSize: '13px', fontWeight: 600, color: C.text }}>View Applied Rewards</Typography>
                      <Chip label={`${appliedLoyalties.reduce((s, a) => s + a.activations, 0)} activations`} size="small" sx={{ backgroundColor: alpha(C.pink, 0.1), color: C.pink, fontFamily: FONT, fontWeight: 700, fontSize: '11px', height: '22px', borderRadius: '50px' }} />
                    </Box>
                    <ChevronRightIcon sx={{ color: '#bdbdbd', fontSize: 18 }} />
                  </Box>
                )}

                {availableLoyalties.length === 0 && exhaustedLoyalties.length === 0 ? (
                  <Typography sx={{ fontFamily: FONT, color: C.muted, textAlign: 'center', py: 5, fontSize: '14px' }}>No matching reward programs for your current order.</Typography>
                ) : (
                  <>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mt: 1 }}>
                      {pagedLoyalties.map((loyalty) => (
                        <Box key={loyalty.id} sx={{ border: '1.5px solid #ebebeb', borderRadius: '14px', px: 2.5, py: 1.75, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Box sx={{ width: 38, height: 38, borderRadius: '10px', backgroundColor: '#f5f5f5', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                              <RedeemIcon sx={{ color: C.pink, fontSize: 20 }} />
                            </Box>
                            <Box>
                              <Typography sx={{ fontFamily: FONT, fontWeight: 600, fontSize: '14px', color: C.text }}>{loyalty.name}</Typography>
                              <Typography sx={{ fontFamily: FONT, fontSize: '12px', color: C.mutedDark, mt: 0.2 }}>
                                Up to <strong>{loyalty.remaining_activations}×</strong>
                                {loyalty.used_activations > 0 && <span style={{ color: C.pink, marginLeft: 6 }}>({loyalty.used_activations} applied)</span>}
                              </Typography>
                            </Box>
                          </Box>
                          <Button variant="contained" size="small" onClick={() => handleOpenLoyaltyDetail(loyalty)} sx={{ backgroundColor: C.pink, color: 'white', borderRadius: R.pill, px: 2.5, fontFamily: FONT, fontWeight: 600, fontSize: '12px', textTransform: 'none', flexShrink: 0, boxShadow: `0 3px 10px ${alpha(C.pink, 0.28)}`, '&:hover': { backgroundColor: '#e91e63' } }}>Apply</Button>
                        </Box>
                      ))}
                      {exhaustedLoyalties.map((loyalty) => (
                        <Box key={loyalty.id} sx={{ border: '1.5px solid #f0f0f0', borderRadius: '14px', px: 2.5, py: 1.75, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, opacity: 0.55 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Box sx={{ width: 38, height: 38, borderRadius: '10px', backgroundColor: '#f5f5f5', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                              <RedeemIcon sx={{ color: '#bdbdbd', fontSize: 20 }} />
                            </Box>
                            <Box>
                              <Typography sx={{ fontFamily: FONT, fontWeight: 600, fontSize: '14px', color: C.mutedDark }}>{loyalty.name}</Typography>
                              <Typography sx={{ fontFamily: FONT, fontSize: '12px', color: C.muted, mt: 0.2 }}>All {loyalty.max_activations} activations used</Typography>
                            </Box>
                          </Box>
                          <Chip label="Maxed" size="small" sx={{ backgroundColor: '#f0f0f0', color: '#9e9e9e', fontFamily: FONT, fontWeight: 600, fontSize: '11px', height: '24px', borderRadius: '50px' }} />
                        </Box>
                      ))}
                    </Box>
                    {loyaltyTotalPages > 1 && (
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 2.5, pt: 2, borderTop: '1px solid #f0f0f0' }}>
                        <Typography sx={{ fontFamily: FONT, fontSize: '13px', color: C.mutedDark }}>Page <strong>{loyaltyPage}</strong> of {loyaltyTotalPages}</Typography>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <IconButton size="small" disabled={loyaltyPage <= 1} onClick={() => setLoyaltyPage(p => p - 1)} sx={{ borderRadius: '10px', border: `1.5px solid ${loyaltyPage <= 1 ? alpha(C.pink, 0.1) : alpha(C.pink, 0.25)}`, color: loyaltyPage <= 1 ? alpha(C.pink, 0.25) : C.pink }}><KeyboardArrowLeftIcon sx={{ fontSize: 18 }} /></IconButton>
                          <IconButton size="small" disabled={loyaltyPage >= loyaltyTotalPages} onClick={() => setLoyaltyPage(p => p + 1)} sx={{ borderRadius: '10px', border: `1.5px solid ${loyaltyPage >= loyaltyTotalPages ? alpha(C.pink, 0.1) : alpha(C.pink, 0.25)}`, color: loyaltyPage >= loyaltyTotalPages ? alpha(C.pink, 0.25) : C.pink }}><KeyboardArrowRightIcon sx={{ fontSize: 18 }} /></IconButton>
                        </Box>
                      </Box>
                    )}
                  </>
                )}
              </Box>
            )}

            {loyaltyView === 'applied' && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mt: 1 }}>
                {appliedLoyalties.length === 0 ? (
                  <Typography sx={{ fontFamily: FONT, color: C.muted, textAlign: 'center', py: 5, fontSize: '14px' }}>No rewards applied yet.</Typography>
                ) : appliedLoyalties.map((al, idx) => (
                  <Box key={idx} sx={{ border: '1px solid #ebebeb', borderRadius: '14px', overflow: 'hidden' }}>
                    <Box sx={{ px: 2, py: 1.5, backgroundColor: '#fafafa', borderBottom: '1px solid #f0f0f0', display: 'flex', alignItems: 'center', gap: 2 }}>
                      <RedeemIcon sx={{ color: C.pink, fontSize: 18, flexShrink: 0 }} />
                      <Typography sx={{ fontFamily: FONT, fontWeight: 600, fontSize: '14px', color: C.text, flex: 1 }}>{al.loyalty_name}</Typography>
                      <Chip label={`${al.activations}× applied`} size="small" sx={{ backgroundColor: alpha(C.pink, 0.1), color: C.pink, fontFamily: FONT, fontWeight: 700, fontSize: '11px', height: '22px', borderRadius: '50px' }} />
                      <IconButton size="small" onClick={() => handleRemoveAppliedLoyalty(al.loyalty_id)} sx={{ color: C.red, border: `1.5px solid ${alpha(C.red, 0.25)}`, borderRadius: '8px', p: '4px', '&:hover': { backgroundColor: alpha(C.red, 0.08), borderColor: C.red } }}>
                        <CloseIcon sx={{ fontSize: 14 }} />
                      </IconButton>
                    </Box>
                    <Box sx={{ px: 2, py: 1.25, display: 'flex', gap: 4 }}>
                      <Box>
                        <Typography sx={{ fontFamily: FONT, fontSize: '11px', color: C.muted, textTransform: 'uppercase', letterSpacing: '0.4px' }}>Reward Product</Typography>
                        <Typography sx={{ fontFamily: FONT, fontWeight: 600, fontSize: '13px', color: C.text, mt: 0.25 }}>{al.reward_product_name || '—'}</Typography>
                      </Box>
                      <Box>
                        <Typography sx={{ fontFamily: FONT, fontSize: '11px', color: C.muted, textTransform: 'uppercase', letterSpacing: '0.4px' }}>Total Qty</Typography>
                        <Typography sx={{ fontFamily: FONT, fontWeight: 700, fontSize: '14px', color: C.pink, mt: 0.25 }}>{al.activations * (al.reward_qty_per_activation || 1)}</Typography>
                      </Box>
                    </Box>
                  </Box>
                ))}
              </Box>
            )}

            {loyaltyView === 'detail' && selectedLoyalty && (
              <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                <Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                    <CheckCircleOutlineIcon sx={{ color: C.pink, fontSize: 18 }} />
                    <Typography sx={{ fontFamily: FONT, fontWeight: 700, fontSize: '12px', color: C.mutedDark, textTransform: 'uppercase', letterSpacing: '0.6px' }}>Conditions</Typography>
                  </Box>
                  {selectedLoyalty.conditions.map((cond, ci) => (
                    <Box key={ci} sx={{ border: '1px solid #ebebeb', borderRadius: '12px', overflow: 'hidden', mb: 1.5 }}>
                      <Box sx={{ px: 2, py: 1.25, backgroundColor: '#fafafa', borderBottom: '1px solid #f0f0f0', display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                        {cond.minimum_qty > 0 && <Box><Typography sx={{ fontFamily: FONT, fontSize: '11px', color: C.muted, textTransform: 'uppercase', letterSpacing: '0.4px' }}>Need</Typography><Typography sx={{ fontFamily: FONT, fontWeight: 700, fontSize: '14px', color: C.pink }}>{cond.minimum_qty}</Typography></Box>}
                        <Box><Typography sx={{ fontFamily: FONT, fontSize: '11px', color: C.muted, textTransform: 'uppercase', letterSpacing: '0.4px' }}>You have</Typography><Typography sx={{ fontFamily: FONT, fontWeight: 700, fontSize: '14px', color: cond.matched_qty >= cond.minimum_qty ? '#2e7d32' : C.red }}>{cond.matched_qty}</Typography></Box>
                        {cond.credit_points > 0 && <Box><Typography sx={{ fontFamily: FONT, fontSize: '11px', color: C.muted, textTransform: 'uppercase', letterSpacing: '0.4px' }}>Points / trigger</Typography><Typography sx={{ fontFamily: FONT, fontWeight: 700, fontSize: '14px', color: C.pink }}>{cond.credit_points}</Typography></Box>}
                      </Box>
                      {cond.products.length > 0 && (
                        <Table size="small">
                          <TableHead><TableRow sx={{ backgroundColor: '#fafafa' }}>{['Product', 'Price', 'Stock', 'In Prep'].map(h => <TableCell key={h} sx={{ fontFamily: FONT, fontWeight: 600, fontSize: '11px', color: C.mutedDark, borderBottom: '1px solid #f0f0f0', py: 0.75 }}>{h}</TableCell>)}</TableRow></TableHead>
                          <TableBody>{cond.products.map((p, pi, arr) => <TableRow key={pi} sx={{ '&:hover': { backgroundColor: '#fafafa' }, borderBottom: pi < arr.length - 1 ? '1px solid #f5f5f5' : 'none' }}>
                            <TableCell sx={{ fontFamily: FONT, fontSize: '12px', color: C.text, fontWeight: 500, border: 'none' }}>{p.name}</TableCell>
                            <TableCell sx={{ fontFamily: FONT, fontSize: '12px', color: C.pink, fontWeight: 700, border: 'none' }}>{p.price} {p.currency}</TableCell>
                            <TableCell sx={{ fontFamily: FONT, fontSize: '12px', color: C.mutedDark, border: 'none' }}>{p.stock_qty}</TableCell>
                            <TableCell sx={{ fontFamily: FONT, fontSize: '12px', color: '#e65100', fontWeight: 600, border: 'none' }}>{p.in_prep_qty || 0}</TableCell>
                          </TableRow>)}</TableBody>
                        </Table>
                      )}
                    </Box>
                  ))}
                </Box>

                <Divider sx={{ borderColor: '#f0f0f0' }} />

                <Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                    <RedeemIcon sx={{ color: C.pink, fontSize: 18 }} />
                    <Typography sx={{ fontFamily: FONT, fontWeight: 700, fontSize: '12px', color: C.mutedDark, textTransform: 'uppercase', letterSpacing: '0.6px' }}>Reward</Typography>
                  </Box>
                  {selectedLoyalty.rewards.map((rew, ri) => (
                    <Box key={ri} sx={{ border: '1px solid #ebebeb', borderRadius: '12px', overflow: 'hidden', mb: 1.5 }}>
                      <Box sx={{ px: 2, py: 1.25, backgroundColor: '#fafafa', borderBottom: '1px solid #f0f0f0', display: 'flex', gap: 3 }}>
                        <Box><Typography sx={{ fontFamily: FONT, fontSize: '11px', color: C.muted, textTransform: 'uppercase', letterSpacing: '0.4px' }}>Points required</Typography><Typography sx={{ fontFamily: FONT, fontWeight: 700, fontSize: '14px', color: C.pink }}>{rew.reward_points}</Typography></Box>
                        <Box><Typography sx={{ fontFamily: FONT, fontSize: '11px', color: C.muted, textTransform: 'uppercase', letterSpacing: '0.4px' }}>Qty per activation</Typography><Typography sx={{ fontFamily: FONT, fontWeight: 700, fontSize: '14px', color: C.pink }}>{rew.reward_product_qty || 1}</Typography></Box>
                      </Box>
                      {rew.products.length === 1 ? (
                        <Box sx={{ px: 2, py: 1.25, display: 'flex', alignItems: 'center', gap: 1.5 }}>
                          {rew.products[0].image && <Box component="img" src={`data:image/png;base64,${rew.products[0].image}`} sx={{ width: 36, height: 36, objectFit: 'contain', borderRadius: '8px', border: '1px solid #f0f0f0' }} />}
                          <Typography sx={{ fontFamily: FONT, fontSize: '13px', color: C.text, fontWeight: 600 }}>{rew.products[0].name}</Typography>
                          <CheckCircleIcon sx={{ color: C.pink, fontSize: 18, ml: 'auto' }} />
                        </Box>
                      ) : (
                        <Box sx={{ p: 1.5, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: 1 }}>
                          {rew.products.map((p) => {
                            const isSel = selectedRewardProdId === p.id;
                            return (
                              <Box key={p.id} onClick={() => setSelectedRewardProdId(p.id)} sx={{ border: `2px solid ${isSel ? C.pink : '#ebebeb'}`, borderRadius: '10px', p: 1, cursor: 'pointer', backgroundColor: isSel ? alpha(C.pink, 0.04) : 'white', transition: 'all 0.15s ease', textAlign: 'center', '&:hover': { borderColor: alpha(C.pink, 0.5) } }}>
                                {p.image && <Box component="img" src={`data:image/png;base64,${p.image}`} sx={{ width: '100%', height: 48, objectFit: 'contain', mb: 0.5 }} />}
                                <Typography sx={{ fontFamily: FONT, fontSize: '11px', color: C.text, fontWeight: isSel ? 700 : 500, lineHeight: 1.3 }}>{p.name}</Typography>
                                {isSel && <CheckCircleIcon sx={{ color: C.pink, fontSize: 14, mt: 0.5 }} />}
                              </Box>
                            );
                          })}
                        </Box>
                      )}
                    </Box>
                  ))}
                </Box>

                <Divider sx={{ borderColor: '#f0f0f0' }} />

                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
                  <Box>
                    <Typography sx={{ fontFamily: FONT, fontWeight: 700, fontSize: '13px', color: C.text }}>Activations</Typography>
                    <Typography sx={{ fontFamily: FONT, fontSize: '12px', color: C.mutedDark, mt: 0.25 }}>
                      Remaining: <strong>{selectedLoyalty.remaining_activations}</strong>
                      {selectedLoyalty.used_activations > 0 && <span style={{ color: C.pink, marginLeft: 6 }}>({selectedLoyalty.used_activations} already applied)</span>}
                      {' · '} Gift qty: <strong>{loyaltyActivations * ((selectedLoyalty.rewards?.[0]?.reward_product_qty) || 1)}</strong>
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <IconButton size="small" onClick={() => setLoyaltyActivations(v => Math.max(1, v - 1))} disabled={loyaltyActivations <= 1} sx={{ border: `1.5px solid ${loyaltyActivations <= 1 ? '#e0e0e0' : alpha(C.pink, 0.3)}`, borderRadius: '10px', color: loyaltyActivations <= 1 ? '#bdbdbd' : C.pink }}><RemoveIcon sx={{ fontSize: 16 }} /></IconButton>
                    <Box sx={{ minWidth: 44, textAlign: 'center', px: 2, py: 0.75, borderRadius: '10px', border: `2px solid ${alpha(C.pink, 0.25)}`, backgroundColor: alpha(C.pink, 0.04) }}>
                      <Typography sx={{ fontFamily: FONT, fontWeight: 700, fontSize: '16px', color: C.pink }}>{loyaltyActivations}</Typography>
                    </Box>
                    <IconButton size="small" onClick={() => setLoyaltyActivations(v => Math.min(selectedLoyalty.remaining_activations, v + 1))} disabled={loyaltyActivations >= selectedLoyalty.remaining_activations} sx={{ border: `1.5px solid ${loyaltyActivations >= selectedLoyalty.remaining_activations ? '#e0e0e0' : alpha(C.pink, 0.3)}`, borderRadius: '10px', color: loyaltyActivations >= selectedLoyalty.remaining_activations ? '#bdbdbd' : C.pink }}><AddIcon sx={{ fontSize: 16 }} /></IconButton>
                  </Box>
                </Box>
              </Box>
            )}
          </DialogContent>

          {loyaltyView === 'detail' && (
            <DialogActions sx={{ px: 3, pb: 3, pt: 0, gap: 1.5 }}>
              <Button onClick={() => setLoyaltyView('list')} sx={{ color: '#666', fontFamily: FONT, textTransform: 'none', borderRadius: R.pill, px: 3 }}>Back</Button>
              <Button variant="contained" startIcon={<CheckCircleIcon />} onClick={handleConfirmReward} disabled={!selectedLoyalty || (selectedLoyalty.rewards?.[0]?.products?.length > 1 && !selectedRewardProdId)} sx={{ backgroundColor: C.pink, color: 'white', borderRadius: R.pill, px: 4, fontFamily: FONT, fontWeight: 600, textTransform: 'none', boxShadow: `0 4px 14px ${alpha(C.pink, 0.32)}`, '&:hover': { backgroundColor: '#e91e63' }, '&.Mui-disabled': { backgroundColor: alpha(C.pink, 0.35), color: 'white' } }}>Confirm Reward</Button>
            </DialogActions>
          )}
        </Dialog>

        {/* stock detail dialog */}
        <Dialog open={stockDialogOpen} onClose={() => setStockDialogOpen(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: '24px', p: 1, boxShadow: `0 18px 50px ${alpha(C.purple, 0.22)}`, border: `1px solid ${alpha(C.purple, 0.14)}`, overflow: 'hidden', position: 'relative', '&::before': { content: '""', position: 'absolute', top: 0, left: 0, right: 0, height: '4px', background: `linear-gradient(90deg, ${C.purple}, #9575cd, ${C.purple})` } } }}>
          <DialogTitle sx={{ fontFamily: FONT, fontWeight: 700, color: C.text, pt: 3, display: 'flex', alignItems: 'center', gap: 1, pr: 6 }}>
            {(stockDialogWh || stockDialogComponent) ? (
              <IconButton size="small" onClick={() => { if (stockDialogComponent) setStockDialogComponent(null); else setStockDialogWh(null); }} sx={{ mr: 0.5, color: C.purple, border: `1.5px solid ${alpha(C.purple, 0.30)}`, borderRadius: R.soft, p: '4px' }}><ArrowBackIcon fontSize="small" /></IconButton>
            ) : (
              <Box sx={{ width: 32, height: 32, borderRadius: R.soft, backgroundColor: alpha(C.purple, 0.12), display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><InfoOutlinedIcon sx={{ color: C.purple, fontSize: 18 }} /></Box>
            )}
            <Box>
              <Typography sx={{ fontFamily: FONT, fontWeight: 700, fontSize: '15px', color: C.text, lineHeight: 1.2 }}>
                {stockDialogComponent?.name ?? stockDialogWh ?? 'Stock by Warehouse'}
              </Typography>
              <Typography sx={{ fontFamily: FONT, fontSize: '12px', color: C.mutedDark, fontWeight: 400, mt: 0.2 }}>
                {stockDialogComponent ? `${stockDialogProduct.name} · ${stockDialogWh}` : stockDialogProduct.name}
              </Typography>
            </Box>
            <IconButton size="small" onClick={() => setStockDialogOpen(false)} sx={{ position: 'absolute', right: 14, top: 14, color: C.muted }}><CloseIcon fontSize="small" /></IconButton>
          </DialogTitle>
          <DialogContent sx={{ pt: 0.5, pb: 2 }}>
            {(() => {
              const isKit = !!stockDialogProduct.is_kit;
              const thBase = { fontFamily: FONT, fontWeight: 600, fontSize: '12px', color: C.mutedDark, borderBottom: `1px solid ${alpha(C.purple, 0.12)}`, py: 0.75, textAlign: 'center' };
              const tdBase = { fontFamily: FONT, fontSize: '13px', border: 'none', textAlign: 'center' };

              // ── Level 1: warehouses
              if (!stockDialogWh) {
                const secondColLabel = isKit ? 'Components' : 'Lots';
                return (
                  <Box sx={{ borderRadius: R.cardSm, overflow: 'hidden', border: `1px solid ${alpha(C.purple, 0.16)}` }}>
                    <Table size="small">
                      <TableHead>
                        <TableRow sx={{ backgroundColor: alpha(C.purple, 0.06) }}>
                          <TableCell sx={{ ...thBase, textAlign: 'left' }}>Warehouse</TableCell>
                          <TableCell sx={thBase}>Qty</TableCell>
                          <TableCell sx={thBase}>{secondColLabel}</TableCell>
                          <TableCell sx={{ ...thBase, width: '36px' }} />
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {Object.entries(stockDialogProduct.qty_details || {}).map(([whName, whData], idx, arr) => {
                          const lots = whData.lots || {};
                          const components = whData.components || [];
                          const whQty = whData.wh_qty ?? 0;
                          const secondColValue = isKit ? components.length : Object.keys(lots).length;
                          return (
                            <TableRow key={whName} onClick={() => setStockDialogWh(whName)} sx={{ cursor: 'pointer', '&:hover': { backgroundColor: alpha(C.purple, 0.04) }, borderBottom: idx < arr.length - 1 ? `1px solid ${alpha(C.purple, 0.08)}` : 'none' }}>
                              <TableCell sx={{ ...tdBase, textAlign: 'left', color: C.text, fontWeight: 600 }}>{whName}</TableCell>
                              <TableCell sx={{ ...tdBase, color: C.purple, fontWeight: 700 }}>{whQty}</TableCell>
                              <TableCell sx={{ ...tdBase, color: C.mutedDark }}>{secondColValue}</TableCell>
                              <TableCell sx={{ border: 'none', textAlign: 'right' }}><ChevronRightIcon sx={{ fontSize: 18, color: alpha(C.purple, 0.45) }} /></TableCell>
                            </TableRow>
                          );
                        })}
                        {Object.keys(stockDialogProduct.qty_details || {}).length === 0 && (
                          <TableRow><TableCell colSpan={4} sx={{ ...tdBase, color: C.muted, py: 3 }}>No warehouse data available</TableCell></TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </Box>
                );
              }

              const whData = stockDialogProduct.qty_details[stockDialogWh] || {};

              // ── Level 2 (kit): components inside the chosen warehouse
              if (isKit && !stockDialogComponent) {
                const components = whData.components || [];
                return (
                  <Box sx={{ borderRadius: R.cardSm, overflow: 'hidden', border: `1px solid ${alpha(C.purple, 0.16)}` }}>
                    <Table size="small">
                      <TableHead>
                        <TableRow sx={{ backgroundColor: alpha(C.purple, 0.06) }}>
                          <TableCell sx={{ ...thBase, textAlign: 'left' }}>Component</TableCell>
                          <TableCell sx={thBase}>Per Kit</TableCell>
                          <TableCell sx={thBase}>Available</TableCell>
                          <TableCell sx={thBase}>Lots</TableCell>
                          <TableCell sx={{ ...thBase, width: '36px' }} />
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {components.map((c, i, arr) => {
                          const lotsCount = Object.keys(c.lots || {}).length;
                          return (
                            <TableRow key={c.product_id} onClick={() => setStockDialogComponent(c)} sx={{ cursor: 'pointer', '&:hover': { backgroundColor: alpha(C.purple, 0.04) }, borderBottom: i < arr.length - 1 ? `1px solid ${alpha(C.purple, 0.08)}` : 'none' }}>
                              <TableCell sx={{ ...tdBase, textAlign: 'left', color: C.text, fontWeight: 600 }}>{c.name}</TableCell>
                              <TableCell sx={{ ...tdBase, color: C.mutedDark }}>{c.required_per_kit}</TableCell>
                              <TableCell sx={{ ...tdBase, color: C.purple, fontWeight: 700 }}>{c.available_qty}</TableCell>
                              <TableCell sx={{ ...tdBase, color: C.mutedDark }}>{lotsCount}</TableCell>
                              <TableCell sx={{ border: 'none', textAlign: 'right' }}><ChevronRightIcon sx={{ fontSize: 18, color: alpha(C.purple, 0.45) }} /></TableCell>
                            </TableRow>
                          );
                        })}
                        {components.length === 0 && (
                          <TableRow><TableCell colSpan={5} sx={{ ...tdBase, color: C.muted, py: 3 }}>No component data for this warehouse</TableCell></TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </Box>
                );
              }

              // ── Level 3 (kit) OR Level 2 (regular): lots
              const lotsSource = isKit ? (stockDialogComponent?.lots || {}) : (whData.lots || {});
              return (
                <Box sx={{ borderRadius: R.cardSm, overflow: 'hidden', border: `1px solid ${alpha(C.purple, 0.16)}` }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ backgroundColor: alpha(C.purple, 0.06) }}>
                        {['Serial No.', 'Qty', 'Expiry Date', 'Removal Date'].map(h => (
                          <TableCell key={h} sx={thBase}>{h}</TableCell>
                        ))}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {Object.values(lotsSource).map((lot, i, arr) => (
                        <TableRow key={i} sx={{ '&:hover': { backgroundColor: alpha(C.purple, 0.03) }, borderBottom: i < arr.length - 1 ? `1px solid ${alpha(C.purple, 0.08)}` : 'none' }}>
                          <TableCell sx={{ ...tdBase, fontSize: '12px', color: C.text, fontWeight: 600 }}>{lot.serial_number || '—'}</TableCell>
                          <TableCell sx={{ ...tdBase, fontSize: '12px', color: C.purple, fontWeight: 700 }}>{lot.lot_qty ?? '—'}</TableCell>
                          <TableCell sx={{ ...tdBase, fontSize: '12px', color: C.mutedDark }}>{lot.expiration_date || '—'}</TableCell>
                          <TableCell sx={{ ...tdBase, fontSize: '12px', color: C.mutedDark }}>{lot.removal_date || '—'}</TableCell>
                        </TableRow>
                      ))}
                      {Object.keys(lotsSource).length === 0 && (
                        <TableRow><TableCell colSpan={4} sx={{ ...tdBase, fontSize: '12px', color: C.muted, py: 3 }}>No lot data for this warehouse</TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                </Box>
              );
            })()}
          </DialogContent>
        </Dialog>

      </Box>
    </Fade>
  );
}