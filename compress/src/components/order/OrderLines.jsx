import { useState, useMemo, useEffect } from 'react';
import axios from 'axios';
import {
  Box,
  Typography,
  TextField,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  Card,
  CardContent,
  CardMedia,
  IconButton,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Chip,
  Fade,
  alpha,
  FormControlLabel,
  FormControl,
  RadioGroup,
  Checkbox,
  MenuItem,
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
import GppMaybeIcon from '@mui/icons-material/GppMaybe';
import WarningIcon from '@mui/icons-material/Warning';
import DescriptionIcon from '@mui/icons-material/Description';

const THEME_PURPLE = '#7e57c2';
const LIGHT_PURPLE_BG = '#faf9fc';

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
}) {
  const companyData = JSON.parse(localStorage.getItem('company_data'));
  const deliveryChargeProductId = companyData?.delivery_charge_service?.id;
  const deliveryChargeProductName = companyData?.delivery_charge_service?.name || 'Delivery Charge';
  const deliveryChargeProductPrice = deliveryCharge || 0.0;
  const deliveryChargeProductCost = companyData?.delivery_charge_service?.cost || 1;
  const maxAmountForDeliveryCharge = companyData?.max_amount_for_delivery_charge || 3;
  const currency_symbol = companyData?.currency_symbol;

  const discountProductId = companyData?.discount_service?.id;
  const discountProductName = companyData?.discount_service?.name || 'Discount';
  const discountProductPrice = companyData?.discount_service?.price || -1;
  const discountProductCost = companyData?.discount_service?.cost || 0;

  const userData = JSON.parse(localStorage.getItem('user_data') || 'null');
  const isCCManager = userData.isManager;

  const [orderLines, setOrderLines] = useState(() => {
    return initialLines && initialLines.length > 0 ? initialLines : [];
  });
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogSearch, setDialogSearch] = useState('');
  const [showDiscountDialog, setShowDiscountDialog] = useState(false);
  const [discountType, setDiscountType] = useState('fixed');
  const [discountValue, setDiscountValue] = useState('');
  const [showExceededDialog, setShowExceededDialog] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [browseResults, setBrowseResults] = useState([]);
  const [discountStatus, setDiscountStatus] = useState('none');
  const [waitingForPermission, setWaitingForPermission] = useState(false);
  const [deliveryChargeMode, setDeliveryChargeMode] = useState(
    initialDeliveryChargeMode ?? 'auto'
  );
  const [localTermsAndConditions, setLocalTermsAndConditions] = useState(termsAndConditions || '');

  const isDeliveryId = (id) => String(id) === String(deliveryChargeProductId);
  const isDiscountId = (id) => String(id) === String(discountProductId);

  useEffect(() => {
    onDeliveryChargeModeChange?.(deliveryChargeMode);
  }, [deliveryChargeMode, onDeliveryChargeModeChange]);

  useEffect(() => {
    if (onTermsAndConditionsChange) {
      onTermsAndConditionsChange(localTermsAndConditions);
    }
  }, [localTermsAndConditions, onTermsAndConditionsChange]);

  useEffect(() => {
    if (!initialLines) return;

    const normalized = (initialLines || []).map(l => ({
      ...l,
      qty: Number(l.qty || l.product_uom_qty || 1),
      price: Number(l.price ?? 0),
      cost: Number(l.cost ?? 0),
      currency: l.currency || currency_symbol,
      stock_qty: Number(l.stock_qty ?? 0),
      isDeliveryCharge: isDeliveryId(l.id),
      isDiscount: isDiscountId(l.id),
    }));

    setOrderLines(normalized);
  }, [deliveryChargeProductId, discountProductId, currency_symbol]);

  const stripDiscountAndResetState = (lines) => {
    const hadDiscount = lines.some(l => isDiscountId(l.id));
    if (hadDiscount) {
      setDiscountStatus('none');
      setWaitingForPermission(false);
    }
    return lines.filter(l => !isDiscountId(l.id));
  };

  const fetchAllProducts = async () => {
    console.log("discount id", discountProductId);
    console.log("delivery id", deliveryChargeProductId);
    try {
      const response = await axios.post(
        `/api/call_center/products/`,
        { params: {} },
        {
          withCredentials: true,
          headers: { 'Content-Type': 'application/json' }
        }
      );
      const results = response.data.result?.products || response.data.result || [];
      setBrowseResults(results.filter(p => !isDeliveryId(p.id) && !isDiscountId(p.id)));
    } catch (error) {
      console.error('Error fetching all products:', error);
      setBrowseResults([]);
    }
  };

  const fetchSearchProducts = async (query, targetSetter) => {
    if (!query) {
      if (targetSetter === setBrowseResults) fetchAllProducts();
      else targetSetter([]);
      return;
    }

    try {
      const response = await axios.post(
        `/api/call_center/products/search/`,
        { params: { query: query } },
        {
          withCredentials: true,
          headers: { 'Content-Type': 'application/json' }
        }
      );
      const results = response.data.result || [];
      const filtered = results.filter(p => !isDeliveryId(p.id) && !isDiscountId(p.id));
      targetSetter(filtered);
    } catch (error) {
      console.error('Error searching products:', error);
      targetSetter([]);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      if (search) fetchSearchProducts(search, setSearchResults);
      else setSearchResults([]);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    if (dialogOpen) {
      if (dialogSearch === '') {
        fetchAllProducts();
      } else {
        const timer = setTimeout(() => {
          fetchSearchProducts(dialogSearch, setBrowseResults);
        }, 300);
        return () => clearTimeout(timer);
      }
    }
  }, [dialogSearch, dialogOpen]);

  const productTotal = useMemo(() => {
    return orderLines
      .filter(l => !isDeliveryId(l.id))
      .filter(l => !isDiscountId(l.id))
      .reduce((sum, l) => sum + l.price * l.qty, 0);
  }, [orderLines]);

  const shouldApplyDeliveryCharge = useMemo(() => {
    if (deliveryType === true) return false;

    if (deliveryChargeMode === 'remove') return false;
    if (deliveryChargeMode === 'add') return true;

    return (
      productTotal < maxAmountForDeliveryCharge &&
      productTotal > 0
    );
  }, [deliveryType, deliveryChargeMode, productTotal, maxAmountForDeliveryCharge]);

  useEffect(() => {
    const hasDeliveryCharge = orderLines.some(l => isDeliveryId(l.id));
    if (shouldApplyDeliveryCharge && !hasDeliveryCharge) {
      const deliveryLine = {
        id: deliveryChargeProductId,
        name: deliveryChargeProductName,
        price: deliveryChargeProductPrice,
        cost: deliveryChargeProductCost,
        qty: 1,
        currency: currency_symbol,
        isDeliveryCharge: true,
      };
      setOrderLines(prev => [...prev, deliveryLine]);
    } else if (!shouldApplyDeliveryCharge && hasDeliveryCharge) {
      setOrderLines(prev => prev.filter(l => !isDeliveryId(l.id)));
    }
  }, [shouldApplyDeliveryCharge, deliveryChargeProductPrice, orderLines]);

  useEffect(() => {
    if (onLinesChange) {
      onLinesChange(orderLines);
    }
  }, [orderLines, onLinesChange]);

  const addProduct = (product) => {
    if (isDeliveryId(product.id) || isDiscountId(product.id)) {
      return;
    }

    setOrderLines((prev) => {
      let next = prev;

      const existing = next.find((l) => String(l.id) === String(product.id));
      if (existing) {
        return next.map((l) =>
          String(l.id) === String(product.id) ? { ...l, qty: l.qty + 1 } : l
        );
      }

      return [...next, { ...product, qty: 1, stock_qty: product.stock_qty || 0 }];
    });
  };

  const removeLine = (id) => {
    if (isDeliveryId(id)) return;

    setOrderLines((prev) => {
      if (isDiscountId(id)) {
        setDiscountStatus('none');
        setWaitingForPermission(false);
        return prev.filter(l => !isDiscountId(l.id));
      }

      const withoutDiscount = stripDiscountAndResetState(prev);
      return withoutDiscount.filter((l) => String(l.id) !== String(id));
    });
  };

  const updateQty = (id, qty) => {
    if (isDeliveryId(id) || isDiscountId(id)) return;
    if (qty < 1) return;

    setOrderLines((prev) => {
      const next = stripDiscountAndResetState(prev);
      return next.map((l) =>
        String(l.id) === String(id) ? { ...l, qty } : l
      );
    });
  };

  const calculatedMaxDiscount = useMemo(() => {
    let maxAllowed = 0;

    orderLines.forEach(line => {
      if (isDeliveryId(line.id) || isDiscountId(line.id)) return;
      const lineSubtotal = (line.price || 0) * (line.qty || 0);
      const productMaxDiscount = line.max_discount !== undefined && line.max_discount !== null
        ? line.max_discount
        : 0;

      const lineMaxAllowed = (lineSubtotal * productMaxDiscount) / 100;
      maxAllowed += lineMaxAllowed;
    });

    return maxAllowed;
  }, [orderLines]);

  const totals = useMemo(() => {
    const totalRevenue = orderLines.reduce((sum, l) => sum + l.price * l.qty, 0);
    const totalCost = orderLines.reduce((sum, l) => sum + (l.cost || 0) * l.qty, 0);
    const marginValue = totalRevenue - totalCost;
    const marginPercentage = totalRevenue > 0 ? (marginValue / totalRevenue) * 100 : 0;

    return {
      revenue: totalRevenue,
      margin: marginValue,
      percentage: marginPercentage.toFixed(2)
    };
  }, [orderLines]);

  useEffect(() => {
    if (typeof onDiscountStatusChange === 'function') {
      onDiscountStatusChange(discountStatus);
    }
  }, [discountStatus]);

  const upsertDiscountLine = (force = false) => {
    if (!canAskDiscountPermission) {
      alert('Complete required fields (customer + delivery type/method + products) before applying/asking discount.');
      return;
    }

    const built = buildDiscountLine();
    if (!built) return;

    const { discountLine, exceeds } = built;

    if (exceeds && !force) {
      setShowDiscountDialog(false);
      setShowExceededDialog(true);
      return;
    }

    setOrderLines(prev => {
      const without = prev.filter(l => !isDiscountId(l.id));
      return [...without, discountLine];
    });

    setDiscountStatus('applied');
    setWaitingForPermission(false);
    setShowDiscountDialog(false);
    setShowExceededDialog(false);
  };

  const buildDiscountLine = () => {
    if (!discountProductId) {
      alert('Discount service product is not configured.');
      return null;
    }

    const v = Number(discountValue);
    if (!v || v <= 0) {
      alert('Please enter a valid discount value.');
      return null;
    }

    const amount =
      discountType === 'percent'
        ? (productTotal * v) / 100
        : v;

    if (!amount || amount <= 0) {
      alert('Discount results in 0. Check values.');
      return null;
    }

    const exceeds = amount > calculatedMaxDiscount;
    const diff = Math.max(0, amount - calculatedMaxDiscount);

    const price = amount * (Number(discountProductPrice) || -1);

    const discountLine = {
      id: discountProductId,
      name: discountProductName,
      price,
      cost: discountProductCost,
      qty: 1,
      currency: currency_symbol,
      isDiscount: true,
      discount_meta: {
        type: discountType,
        input_value: v,
        amount,
        max: calculatedMaxDiscount,
        diff,
      }
    };

    return { discountLine, amount, exceeds, diff, maxAllowed: calculatedMaxDiscount, inputValue: v };
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

  return (
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
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <ShoppingCartIcon sx={{ color: THEME_PURPLE, fontSize: 28 }} />
            <Typography
              variant="h4"
              sx={{
                fontWeight: 700,
                color: '#2d2d2d',
                fontFamily: "'Inter', 'Segoe UI', sans-serif",
                letterSpacing: '-0.5px',
              }}
            >
              Order Lines
            </Typography>
          </Box>

          {deliveryType === false && (
            <Box
              sx={{
                display: 'flex',
                flexDirection: { xs: 'column', sm: 'row' },
                alignItems: { xs: 'flex-start', sm: 'center' },
                gap: 2,

              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box
                  sx={{
                    width: 36,
                    height: 36,
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: alpha(THEME_PURPLE, 0.10),
                    flexShrink: 0,
                  }}
                >
                  <LocalShippingIcon sx={{ fontSize: 20, color: THEME_PURPLE }} />
                </Box>
              </Box>

              <TextField
                select
                label="Delivery Charge"
                value={deliveryChargeMode}
                onChange={(e) => setDeliveryChargeMode(e.target.value)}
                size="small"
                sx={{
                  minWidth: { xs: '100%', sm: 220 },
                  '& .MuiOutlinedInput-root': {
                    borderRadius: '14px',
                    backgroundColor: 'white',
                    fontFamily: "'Inter', 'Segoe UI', sans-serif",
                    '& fieldset': {
                      borderColor: alpha(THEME_PURPLE, 0.18),
                      borderWidth: '1.5px',
                    },
                    '&:hover fieldset': {
                      borderColor: alpha(THEME_PURPLE, 0.30),
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: THEME_PURPLE,
                      borderWidth: '2px',
                      boxShadow: `0 0 0 4px ${alpha(THEME_PURPLE, 0.08)}`,
                    },
                  },
                  '& .MuiInputLabel-root': {
                    fontFamily: "'Inter', 'Segoe UI', sans-serif",
                    color: '#9e9e9e',
                    '&.Mui-focused': { color: THEME_PURPLE },
                  },
                }}
                SelectProps={{
                  MenuProps: {
                    PaperProps: {
                      sx: {
                        borderRadius: '16px',
                        mt: 1,
                        boxShadow: `0 10px 28px ${alpha(THEME_PURPLE, 0.18)}`,
                        '& .MuiMenuItem-root': {
                          fontFamily: "'Inter', 'Segoe UI', sans-serif",
                          borderRadius: '10px',
                          mx: 1,
                          my: 0.5,
                          '&.Mui-selected': {
                            backgroundColor: alpha(THEME_PURPLE, 0.12),
                            fontWeight: 700,
                          },
                          '&:hover': {
                            backgroundColor: alpha(THEME_PURPLE, 0.08),
                          },
                        },
                      },
                    },
                  },
                }}
              >
                <MenuItem value="auto">Auto (recommended)</MenuItem>
                <MenuItem value="add">Manually Added</MenuItem>
                <MenuItem value="remove">Manually Removed</MenuItem>
              </TextField>
            </Box>
          )}

        </Box>

        <Typography
          variant="body2"
          sx={{
            color: '#9e9e9e',
            mb: 4,
            fontFamily: "'Inter', 'Segoe UI', sans-serif",
          }}
        >
          Add products to your order by searching or browsing
          {deliveryType === false && deliveryChargeMode === 'auto' && (
            <Typography
              component="span"
              sx={{
                display: 'block',
                mt: 0.5,
                color: alpha(THEME_PURPLE, 0.7),
                fontSize: '13px',
                fontStyle: 'italic',
              }}
            >
              * Delivery charge of {deliveryChargeProductPrice} {currency_symbol} applies for orders under {maxAmountForDeliveryCharge} {currency_symbol}
            </Typography>
          )}
        </Typography>

        <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
          <TextField
            placeholder="Search products by name or code..."
            size="medium"
            fullWidth
            sx={textFieldStyles}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            InputProps={{
              startAdornment: (
                <SearchIcon sx={{ color: '#9e9e9e', mr: 1, fontSize: 22 }} />
              ),
            }}
          />
          <Button
            variant="outlined"
            startIcon={<GridViewIcon />}
            sx={{
              borderColor: THEME_PURPLE,
              color: THEME_PURPLE,
              borderRadius: '50px',
              px: 4,
              whiteSpace: 'nowrap',
              fontFamily: "'Inter', 'Segoe UI', sans-serif",
              fontWeight: 500,
              textTransform: 'none',
              fontSize: '15px',
              borderWidth: '1.5px',
              transition: 'all 0.2s ease',
              '&:hover': {
                borderWidth: '1.5px',
                borderColor: THEME_PURPLE,
                backgroundColor: 'rgba(126, 87, 194, 0.06)',
                transform: 'translateY(-1px)',
              }
            }}
            onClick={() => setDialogOpen(true)}
          >
            Browse All
          </Button>

          <Button
            variant="contained"
            startIcon={<LocalOfferIcon />}
            onClick={() => setShowDiscountDialog(true)}
            sx={{
              backgroundColor: THEME_PURPLE,
              color: 'white',
              borderRadius: '50px',
              px: 4,
              whiteSpace: 'nowrap',
              fontFamily: "'Inter', 'Segoe UI', sans-serif",
              fontWeight: 600,
              textTransform: 'none',
              fontSize: '15px',
              boxShadow: '0 6px 20px rgba(126, 87, 194, 0.25)',
              transition: 'all 0.2s ease',
              '&:hover': {
                backgroundColor: '#6d47b0',
                transform: 'translateY(-1px)',
                boxShadow: '0 8px 26px rgba(126, 87, 194, 0.35)',
              }
            }}
          >
            Discount
          </Button>
        </Box>

        {search.length > 0 && (
          <Fade in>
            <Box sx={{ mb: 3 }}>
              {searchResults.length > 0 ? (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {searchResults.map((p) => (
                    <Chip
                      key={p.id}
                      label={
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25, alignItems: 'flex-start' }}>
                          <Typography sx={{ fontSize: '12px', fontWeight: 600, fontFamily: "'Inter', 'Segoe UI', sans-serif", }}>
                            {p.name} {p.name_ar ? `- ${p.name_ar} ` : ''}({p.code})
                          </Typography>
                        </Box>
                      }
                      onClick={() => {
                        addProduct(p);
                        setSearch('');
                      }}
                      sx={{
                        cursor: 'pointer',
                        backgroundColor: alpha(THEME_PURPLE, 0.08),
                        color: THEME_PURPLE,
                        fontFamily: "'Inter', 'Segoe UI', sans-serif",
                        fontWeight: 500,
                        border: `1px solid ${alpha(THEME_PURPLE, 0.2)}`,
                        transition: 'all 0.2s ease',
                        height: 'auto',
                        '& .MuiChip-label': {
                          display: 'block',
                          whiteSpace: 'normal',
                          padding: '8px 4px',
                        },
                        '&:hover': {
                          backgroundColor: THEME_PURPLE,
                          color: 'white',
                          borderColor: THEME_PURPLE,
                          boxShadow: '0 4px 12px rgba(126, 87, 194, 0.3)',
                        }
                      }}
                    />
                  ))}
                </Box>
              ) : (
                <Typography variant="caption" sx={{ color: '#9e9e9e', fontFamily: "'Inter', 'Segoe UI', sans-serif" }}>
                  No products found
                </Typography>
              )}
            </Box>
          </Fade>
        )}

        {orderLines.length > 0 ? (
          <Fade in>
            <Box>
              <Box sx={{
                backgroundColor: LIGHT_PURPLE_BG,
                borderRadius: '16px',
                overflow: 'hidden',
                border: '1px solid #e8e4f0',
                boxShadow: '0 2px 8px rgba(126, 87, 194, 0.06)',
              }}>
                <Table>
                  <TableHead>
                    <TableRow sx={{ backgroundColor: 'white' }}>
                      <TableCell sx={{ fontWeight: 600, color: '#2d2d2d', fontFamily: "'Inter', 'Segoe UI', sans-serif", py: 2.5 }}>Product</TableCell>
                      <TableCell sx={{ fontWeight: 600, color: '#2d2d2d', fontFamily: "'Inter', 'Segoe UI', sans-serif", width: '100px', textAlign: 'center' }}>Stock Qty</TableCell>
                      <TableCell sx={{ fontWeight: 600, color: '#2d2d2d', fontFamily: "'Inter', 'Segoe UI', sans-serif", width: '220px', textAlign: 'center' }}>Quantity</TableCell>
                      <TableCell sx={{ fontWeight: 600, color: '#2d2d2d', fontFamily: "'Inter', 'Segoe UI', sans-serif" }}>Price</TableCell>
                      <TableCell sx={{ fontWeight: 600, color: '#2d2d2d', fontFamily: "'Inter', 'Segoe UI', sans-serif" }}>Subtotal</TableCell>
                      <TableCell width="60"></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {orderLines.map((line) => (
                      <TableRow
                        key={line.id}
                        sx={{
                          transition: 'all 0.2s ease',
                          backgroundColor: line.isDeliveryCharge
                            ? alpha('#a21ef4', 0.05)
                            : line.isDiscount
                              ? alpha('#ecff20', 0.1)
                              : line.restricted
                                ? alpha('#ea412e', 0.05)
                                : 'transparent',
                          '&:hover': { backgroundColor: line.isDeliveryCharge ? alpha(THEME_PURPLE, 0.05) : 'white', transform: 'scale(1.005)' }
                        }}
                      >
                        <TableCell sx={{ fontFamily: "'Inter', 'Segoe UI', sans-serif", color: '#2d2d2d' }}>
                          <Box>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              {line.isDeliveryCharge && (
                                <LocalShippingIcon sx={{ fontSize: 18, color: THEME_PURPLE, flexShrink: 0 }} />
                              )}
                              {line.isDiscount && (
                                <LocalOfferIcon sx={{ fontSize: 18, color: '#e4cd1b', flexShrink: 0 }} />
                              )}
                              {line.restricted && (
                                <WarningIcon sx={{ fontSize: 18, color: '#b71c1c', flexShrink: 0 }} />
                              )}
                              <span>{line.name} {line.name_ar ? `- ${line.name_ar}` : ''}</span>
                            </Box>
                            {line.restricted && (
                              <Typography
                                variant="caption"
                                sx={{
                                  display: 'block',
                                  mt: 0.75,
                                  ml: 3.2,
                                  color: '#b71c1c',
                                  fontFamily: "'Inter', 'Segoe UI', sans-serif",
                                  fontSize: '12px',
                                  fontWeight: 500,
                                }}
                              >
                                Restricted Product (needs a doctor prescription)
                              </Typography>
                            )}
                          </Box>
                        </TableCell>
                        <TableCell sx={{ textAlign: 'center', fontFamily: "'Inter', 'Segoe UI', sans-serif", color: '#2d2d2d', fontWeight: 600 }}>
                          {line.isDeliveryCharge || line.isDiscount ? '—' : (line.stock_qty || 0)}
                        </TableCell>
                        <TableCell sx={{ alignItems: 'center', textAlign: 'center' }}>
                          {line.isDeliveryCharge || line.isDiscount ? (
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                              <Box sx={{
                                minWidth: '50px',
                                textAlign: 'center',
                                fontFamily: "'Inter', 'Segoe UI', sans-serif",
                                fontWeight: 600,
                                fontSize: '15px',
                                color: '#9e9e9e',
                                backgroundColor: alpha('#9e9e9e', 0.08),
                                borderRadius: '8px',
                                py: 0.75,
                              }}>
                                1
                              </Box>
                            </Box>
                          ) : (
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                              <IconButton
                                size="small"
                                onClick={() => updateQty(line.id, line.qty - 1)}
                                sx={{
                                  backgroundColor: 'transparent',
                                  color: alpha(THEME_PURPLE, 0.5),
                                  transition: 'all 0.2s ease',
                                  p: 0.5,
                                  '&:hover': {
                                    color: THEME_PURPLE,
                                    backgroundColor: alpha(THEME_PURPLE, 0.08),
                                  }
                                }}
                              >
                                <RemoveIcon sx={{ fontSize: 18 }} />
                              </IconButton>
                              <TextField
                                type="number"
                                inputProps={{
                                  min: 1,
                                  step: 1,
                                  style: {
                                    textAlign: 'center',
                                    fontWeight: 700,
                                    fontSize: '16px',
                                  }
                                }}
                                value={line.qty}
                                onChange={(e) => {
                                  const newQty = e.target.value;
                                  if (newQty && !isNaN(newQty)) {
                                    const qty = Math.max(1, parseInt(newQty));
                                    updateQty(line.id, qty);
                                  }
                                }}
                                sx={{
                                  width: '50px',
                                  '& .MuiOutlinedInput-root': {
                                    padding: 0,
                                    height: '40px',
                                    fontFamily: "'Inter', 'Segoe UI', sans-serif",
                                    fontWeight: 700,
                                    fontSize: '16px',
                                    color: THEME_PURPLE,
                                    backgroundColor: alpha(THEME_PURPLE, 0.1),
                                    borderRadius: '8px',
                                    border: `2px solid ${alpha(THEME_PURPLE, 0.25)}`,
                                    transition: 'all 0.2s ease',
                                    '& fieldset': {
                                      border: 'none',
                                    },
                                    '&:hover': {
                                      backgroundColor: alpha(THEME_PURPLE, 0.15),
                                      borderColor: THEME_PURPLE,
                                    },
                                    '&.Mui-focused': {
                                      backgroundColor: alpha(THEME_PURPLE, 0.15),
                                      borderColor: THEME_PURPLE,
                                    },
                                  },
                                  '& input[type=number]': {
                                    MozAppearance: 'textfield',
                                  },
                                  '& input[type=number]::-webkit-outer-spin-button': {
                                    WebkitAppearance: 'none',
                                    margin: 0,
                                  },
                                  '& input[type=number]::-webkit-inner-spin-button': {
                                    WebkitAppearance: 'none',
                                    margin: 0,
                                  },
                                }}
                              />
                              <IconButton
                                size="small"
                                onClick={() => updateQty(line.id, line.qty + 1)}
                                sx={{
                                  backgroundColor: 'transparent',
                                  color: alpha(THEME_PURPLE, 0.5),
                                  transition: 'all 0.2s ease',
                                  p: 0.5,
                                  '&:hover': {
                                    color: THEME_PURPLE,
                                    backgroundColor: alpha(THEME_PURPLE, 0.08),
                                  }
                                }}
                              >
                                <AddIcon sx={{ fontSize: 18 }} />
                              </IconButton>
                            </Box>
                          )}
                        </TableCell>
                        <TableCell sx={{ fontFamily: "'Inter', 'Segoe UI', sans-serif", color: '#2d2d2d' }}>{line.price} {currency_symbol}</TableCell>
                        <TableCell sx={{ fontFamily: "'Inter', 'Segoe UI', sans-serif", fontWeight: 600, color: THEME_PURPLE }}>
                          {(line.price * line.qty).toFixed(2)} {currency_symbol}
                        </TableCell>
                        <TableCell align="right">
                          {!line.isDeliveryCharge && (
                            <IconButton onClick={() => removeLine(line.id)} sx={{ color: '#ef5350', transition: 'all 0.2s ease', '&:hover': { backgroundColor: 'rgba(239, 83, 80, 0.12)', transform: 'scale(1.1)' } }}>
                              <DeleteIcon />
                            </IconButton>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Box>

              {waitingForPermission && (
                <Fade in>
                  <Box
                    sx={{
                      mt: 2,
                      p: 2,
                      borderRadius: '16px',
                      backgroundColor: alpha('#efb359', 0.12),
                      border: `1px solid ${alpha('#efb359', 0.25)}`,
                    }}
                  >
                    <Typography
                      sx={{
                        fontFamily: "'Inter', 'Segoe UI', sans-serif",
                        fontWeight: 700,
                        color: '#e65100',
                      }}
                    >
                      Waiting for permission
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{ fontFamily: "'Inter', 'Segoe UI', sans-serif", color: alpha('#000', 0.6) }}
                    >
                      Discount request exceeds max ({calculatedMaxDiscount.toFixed(2)}). Manager approval required.
                    </Typography>
                  </Box>
                </Fade>
              )}
              <Box sx={{
                mt: 4, pt: 4,
                borderTop: `2px solid ${alpha(THEME_PURPLE, 0.15)}`,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
              }}>
                <Box>
                  <Chip
                    label={`${orderLines.filter(l => !isDeliveryId(l.id) && !isDiscountId(l.id)).length} ${orderLines.filter(l => !isDeliveryId(l.id) && !isDiscountId(l.id)).length === 1 ? 'item' : 'items'}`}
                    sx={{ backgroundColor: alpha(THEME_PURPLE, 0.1), color: THEME_PURPLE, fontFamily: "'Inter', 'Segoe UI', sans-serif", fontWeight: 600 }}
                  />
                </Box>
                <Box sx={{ textAlign: 'right' }}>
                  <Typography variant="body2" sx={{ color: '#9e9e9e', fontFamily: "'Inter', 'Segoe UI', sans-serif", mb: 0.5 }}>
                    Total Amount
                  </Typography>
                  <Typography
                    variant="h3"
                    sx={{
                      fontWeight: 700,
                      color: THEME_PURPLE,
                      fontFamily: "'Inter', 'Segoe UI', sans-serif",
                      letterSpacing: '-1px',
                      lineHeight: 1,
                    }}
                  >
                    {totals.revenue.toFixed(2)} {currency_symbol}
                  </Typography>

                  <Typography
                    variant="caption"
                    sx={{
                      display: 'block',
                      mt: 1,
                      color: '#616161',
                      fontFamily: "'Inter', 'Segoe UI', sans-serif",
                      fontWeight: 500,
                      fontSize: '0.85rem'
                    }}
                  >
                    Margin: {totals.margin.toFixed(2)} {currency_symbol} ({totals.percentage}%)
                  </Typography>
                </Box>
              </Box>

              {/* Terms and Conditions Section */}
              <Box sx={{ mt: 4, pt: 4, borderTop: `2px solid ${alpha(THEME_PURPLE, 0.15)}` }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <DescriptionIcon sx={{ color: THEME_PURPLE, fontSize: 24 }} />
                  <Typography
                    sx={{
                      fontWeight: 700,
                      fontSize: '16px',
                      color: '#2d2d2d',
                      fontFamily: "'Inter', 'Segoe UI', sans-serif",
                    }}
                  >
                    Terms & Conditions
                  </Typography>
                </Box>
                <TextField
                  multiline
                  rows={4}
                  placeholder="Add terms and conditions for this order..."
                  value={localTermsAndConditions}
                  onChange={(e) => setLocalTermsAndConditions(e.target.value)}
                  fullWidth
                  sx={{
                    ...textFieldStyles,
                    '& .MuiOutlinedInput-root': {
                      ...textFieldStyles['& .MuiOutlinedInput-root'],
                      borderRadius: '16px',
                    },
                  }}
                />
              </Box>
            </Box>
          </Fade>
        ) : (
          <Box sx={{ py: 10, textAlign: 'center', backgroundColor: LIGHT_PURPLE_BG, borderRadius: '20px', border: `2px dashed ${alpha(THEME_PURPLE, 0.2)}` }}>
            <ShoppingCartIcon sx={{ fontSize: 64, color: alpha(THEME_PURPLE, 0.3), mb: 2 }} />
            <Typography sx={{ color: '#9e9e9e', fontFamily: "'Inter', 'Segoe UI', sans-serif", fontSize: '16px', fontWeight: 500 }}>No products added yet</Typography>
            <Typography sx={{ color: alpha('#9e9e9e', 0.7), fontFamily: "'Inter', 'Segoe UI', sans-serif", fontSize: '14px', mt: 0.5 }}>
              Search or browse to add products to your order
            </Typography>
          </Box>
        )}

        <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: '24px' } }}>
          <DialogTitle sx={{ fontWeight: 700, fontFamily: "'Inter', 'Segoe UI', sans-serif", fontSize: '24px', pt: 4, px: 4 }}>Browse Products</DialogTitle>
          <DialogContent sx={{ pt: 2, px: 4, pb: 3 }}>
            <TextField
              placeholder="Filter products..."
              size="medium"
              fullWidth
              sx={{ ...textFieldStyles, mb: 4 }}
              value={dialogSearch}
              onChange={(e) => setDialogSearch(e.target.value)}
              InputProps={{ startAdornment: <SearchIcon sx={{ color: '#9e9e9e', mr: 1, fontSize: 22 }} /> }}
            />
            <Grid container spacing={3}>
              {browseResults.length > 0 ? (
                browseResults.map((p) => {
                  const selected = orderLines.find((l) => l.id === p.id);
                  return (
                    <Grid item xs={12} sm={6} md={4} key={p.id}>
                      <Card
                        onClick={() => addProduct(p)}
                        sx={{
                          cursor: 'pointer',
                          borderRadius: '20px',
                          border: selected ? `2px solid ${THEME_PURPLE}` : '1.5px solid #e8e4f0',
                          transition: 'all 0.3s ease',
                          backgroundColor: selected ? alpha(THEME_PURPLE, 0.03) : 'white',
                          boxShadow: 'none',
                          height: '100%',
                          display: 'flex',
                          flexDirection: 'column',
                          position: 'relative',
                          '&:hover': {
                            transform: 'translateY(-6px)',
                            boxShadow: '0 12px 32px rgba(126, 87, 194, 0.2)',
                            borderColor: THEME_PURPLE,
                          },
                        }}
                      >
                        {selected && (
                          <Box
                            sx={{
                              position: 'absolute',
                              top: 12,
                              right: 12,
                              backgroundColor: THEME_PURPLE,
                              color: 'white',
                              borderRadius: '12px',
                              px: 1.5,
                              py: 0.5,
                              fontFamily: "'Inter', 'Segoe UI', sans-serif",
                              fontWeight: 700,
                              fontSize: '13px',
                              boxShadow: '0 4px 12px rgba(126, 87, 194, 0.5)',
                              zIndex: 1,
                              minWidth: '32px',
                              textAlign: 'center',
                            }}
                          >
                            {selected.qty}
                          </Box>
                        )}

                        <Box
                          sx={{
                            height: 140,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundColor: LIGHT_PURPLE_BG,
                            p: 2,
                          }}
                        >
                          <CardMedia
                            component="img"
                            image={p.image ? `data:image/png;base64,${p.image}` : '/assets/placeholder-product.png'}
                            sx={{
                              objectFit: 'contain',
                              maxHeight: '100%',
                              maxWidth: '100%',
                            }}
                          />
                        </Box>

                        <CardContent sx={{ p: 2.5, flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                          <Box sx={{ mb: 1.5 }}>
                            <Typography
                              sx={{
                                fontWeight: 600,
                                fontFamily: "'Inter', 'Segoe UI', sans-serif",
                                color: '#2d2d2d',
                                mb: 0.5,
                                fontSize: '15px',
                                lineHeight: 1.3,
                              }}
                              noWrap
                            >
                              {p.name}
                            </Typography>
                            {p.name_ar && (
                              <Typography
                                sx={{
                                  fontWeight: 600,
                                  fontFamily: "'Inter', 'Segoe UI', sans-serif",
                                  color: THEME_PURPLE,
                                  fontSize: '15px',
                                  lineHeight: 1.3,
                                  direction: 'rtl',
                                  textAlign: 'right',
                                }}
                                noWrap
                              >
                                {p.name_ar}
                              </Typography>
                            )}
                          </Box>

                          {p.code && (
                            <Typography
                              sx={{
                                color: '#9e9e9e',
                                fontFamily: "'Inter', 'Segoe UI', sans-serif",
                                fontSize: '12px',
                                fontWeight: 400,
                                mb: 1,
                              }}
                            >
                              Code: {p.code}
                            </Typography>
                          )}

                          <Typography
                            sx={{
                              color: THEME_PURPLE,
                              fontFamily: "'Inter', 'Segoe UI', sans-serif",
                              fontWeight: 700,
                              fontSize: '16px',
                              mt: 'auto',
                            }}
                          >
                            {p.price} {currency_symbol}
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                  );
                })
              ) : (
                <Grid item xs={12}>
                  <Typography
                    align="center"
                    sx={{
                      py: 6,
                      color: '#9e9e9e',
                      fontFamily: "'Inter', 'Segoe UI', sans-serif",
                    }}
                  >
                    No products available.
                  </Typography>
                </Grid>
              )}
            </Grid>
          </DialogContent>
          <DialogActions sx={{ px: 4, pb: 4 }}>
            <Button
              onClick={() => setDialogOpen(false)}
              sx={{
                backgroundColor: THEME_PURPLE,
                color: 'white',
                borderRadius: '50px',
                px: 6,
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
              }}
            >
              Done
            </Button>
          </DialogActions>
        </Dialog>

        <Dialog
          open={showDiscountDialog}
          onClose={() => setShowDiscountDialog(false)}
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
              pt: 3
            }}
          >
            Apply Discount
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
              Select discount type and enter value. Max allowed is {calculatedMaxDiscount.toFixed(2)}. (fixed amount)
            </Typography>

            <FormControl sx={{ width: '100%' }}>
              <RadioGroup
                value={discountType}
                onChange={(e) => {
                  setDiscountType(e.target.value);
                  setDiscountValue('');
                }}
                sx={{ gap: 1 }}
              >
                <Box
                  sx={{
                    borderRadius: '18px',
                    border: `1.5px solid ${alpha(THEME_PURPLE, discountType === 'fixed' ? 0.35 : 0.12)}`,
                    backgroundColor: alpha(THEME_PURPLE, discountType === 'fixed' ? 0.06 : 0.02),
                    transition: 'all 0.2s ease',
                    px: 2,
                    py: 1.5,
                  }}
                >
                  <FormControlLabel
                    value="fixed"
                    control={<Checkbox checked={discountType === 'fixed'} sx={{ display: 'none' }} />}
                    label={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <MoneyIcon sx={{ color: alpha('#000', 0.55) }} />
                        <Typography sx={{ fontFamily: "'Inter', 'Segoe UI', sans-serif", fontWeight: 650 }}>
                          Fixed Amount
                        </Typography>
                      </Box>
                    }
                    onClick={() => setDiscountType('fixed')}
                    sx={{ m: 0, width: '100%' }}
                  />
                </Box>

                <Box
                  sx={{
                    borderRadius: '18px',
                    border: `1.5px solid ${alpha(THEME_PURPLE, discountType === 'percent' ? 0.35 : 0.12)}`,
                    backgroundColor: alpha(THEME_PURPLE, discountType === 'percent' ? 0.06 : 0.02),
                    transition: 'all 0.2s ease',
                    px: 2,
                    py: 1.5,
                  }}
                >
                  <FormControlLabel
                    value="percent"
                    control={<Checkbox checked={discountType === 'percent'} sx={{ display: 'none' }} />}
                    label={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <PercentIcon sx={{ color: alpha('#000', 0.55) }} />
                        <Typography sx={{ fontFamily: "'Inter', 'Segoe UI', sans-serif", fontWeight: 650 }}>
                          Percentage
                        </Typography>
                      </Box>
                    }
                    onClick={() => setDiscountType('percent')}
                    sx={{ m: 0, width: '100%' }}
                  />
                </Box>
              </RadioGroup>
            </FormControl>

            <Box sx={{ mt: 2 }}>
              <TextField
                label={discountType === 'percent' ? 'Discount %' : `Discount Amount (${currency_symbol || ''})`}
                value={discountValue}
                onChange={(e) => setDiscountValue(e.target.value.replace(/[^\d.]/g, ''))}
                fullWidth
                size="medium"
                sx={textFieldStyles}
                inputProps={{
                  inputMode: 'decimal',
                }}
                helperText={
                  discountType === 'percent'
                    ? `Discount amount will be calculated from products total (${productTotal.toFixed(2)} ${currency_symbol}).`
                    : `Discount will be applied as a negative line.`
                }
              />
            </Box>
          </DialogContent>

          <DialogActions sx={{ px: 3, pb: 3, gap: 1.5 }}>
            <Button
              onClick={() => setShowDiscountDialog(false)}
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
              onClick={() => upsertDiscountLine(false)}
              disabled={!discountValue || Number(discountValue) <= 0 || productTotal <= 0}
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
              Apply Discount
            </Button>
          </DialogActions>
        </Dialog>

        <Dialog
          open={showExceededDialog}
          onClose={() => setShowExceededDialog(false)}
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
                background: `linear-gradient(90deg, #ef5350, #ff867c)`,
              },
            }
          }}
        >
          <DialogTitle
            sx={{
              fontFamily: "'Inter', 'Segoe UI', sans-serif",
              fontWeight: 800,
              color: '#2d2d2d',
              pt: 3
            }}
          >
            Discount Exceeded
          </DialogTitle>

          <DialogContent sx={{ pt: 1 }}>
            <Typography
              variant="body2"
              sx={{
                fontFamily: "'Inter', 'Segoe UI', sans-serif",
                color: '#7a7a7a',
                mb: 1,
              }}
            >
              The entered discount ({discountValue}) exceeds the allowed maximum ({calculatedMaxDiscount.toFixed(2)}).
            </Typography>

            <Typography
              variant="body2"
              sx={{
                fontFamily: "'Inter', 'Segoe UI', sans-serif",
                color: '#7a7a7a',
              }}
            >
              {isCCManager
                ? 'As a manager, you can allow it.'
                : 'You need manager approval to proceed.'}
            </Typography>
          </DialogContent>

          <DialogActions sx={{ px: 3, pb: 3, gap: 1.5 }}>
            <Button
              onClick={() => setShowExceededDialog(false)}
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

            {!isCCManager ? (
              <Button
                startIcon={<GppMaybeIcon />}
                onClick={() => {
                  if (!canAskDiscountPermission) {
                    alert('Please complete customer info, products, delivery type & method before asking discount permission.');
                    return;
                  }

                  const built = buildDiscountLine();
                  if (!built) return;

                  const { discountLine, amount, maxAllowed, diff, inputValue } = built;

                  const newLinesWithDiscount = orderLines.filter(l => !isDiscountId(l.id)).concat([discountLine]);

                  console.log("lines before adding discount: ", orderLines);
                  console.log("lines with the existing dis", newLinesWithDiscount);

                  setOrderLines(newLinesWithDiscount);

                  setShowExceededDialog(false);
                  setDiscountStatus('pending');
                  setWaitingForPermission(true);
                  setShowDiscountDialog(false);

                  onAskDiscountPermission?.({
                    lines: newLinesWithDiscount,
                    discount: {
                      type: discountType,
                      value: inputValue,
                      amount,
                      maxAllowed,
                      diff,
                    },
                  });

                  console.log("lines after asking permission (new array): ", newLinesWithDiscount);
                }}
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
                }}
              >
                Ask Permission
              </Button>
            ) : (
              <Button
                startIcon={<CheckCircleIcon />}
                onClick={() => upsertDiscountLine(true)}
                sx={{
                  backgroundColor: '#ef5350',
                  color: 'white',
                  fontFamily: "'Inter', 'Segoe UI', sans-serif",
                  textTransform: 'none',
                  borderRadius: '50px',
                  px: 4,
                  boxShadow: '0 6px 18px rgba(239, 83, 80, 0.28)',
                  '&:hover': {
                    backgroundColor: '#d32f2f',
                    boxShadow: '0 8px 24px rgba(239, 83, 80, 0.35)',
                  },
                }}
              >
                Allow
              </Button>
            )}
          </DialogActions>
        </Dialog>
      </Box>
    </Fade>
  );
}