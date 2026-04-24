import { useMemo } from 'react';
import {
  Box,
  Typography,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Chip,
  Fade,
  alpha,
} from '@mui/material';

import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import LocalOfferIcon from '@mui/icons-material/LocalOffer';
import WarningIcon from '@mui/icons-material/Warning';
import DescriptionIcon from '@mui/icons-material/Description';


const THEME_PURPLE = '#7e57c2';
const LIGHT_PURPLE_BG = '#faf9fc';

export default function OrderLinesReadOnly({
  lines = [],
  deliveryType = false,
  deliveryCharge = 0,
  termsAndConditions = '',
}) {
  const companyData = JSON.parse(localStorage.getItem('company_data') || 'null');

  const currency_symbol = companyData?.currency_symbol || '';

  const deliveryChargeProductId = companyData?.delivery_charge_service?.id;
  const discountProductId = companyData?.discount_service?.id;

  const isDeliveryId = (id) => String(id) === String(deliveryChargeProductId);
  const isDiscountId = (id) => String(id) === String(discountProductId);

  const orderLines = useMemo(() => {
    return (lines || []).map((l) => {
      const id = l.id ?? l.product_id ?? l.product?.id;
      const qty = Number(l.qty ?? l.requested_qty ?? 1);
      const price = Number(l.price ?? l.price_unit ?? 0);
      const cost = Number(l.cost ?? l.cost_unit ?? 0);
      const stock_qty = Number(l.stock_qty ?? 0);

      return {
        ...l,
        id,
        name: l.name ?? l.product_name ?? l.display_name ?? l.product?.name ?? '—',
        qty,
        price,
        cost,
        stock_qty,
      };
    });
  }, [lines]);

  const realItemsCount = useMemo(() => {
    return orderLines.filter(l => !isDeliveryId(l.id) && !isDiscountId(l.id)).length;
  }, [orderLines, deliveryChargeProductId, discountProductId]);

  const totals = useMemo(() => {
    const totalRevenue = orderLines.reduce((sum, l) => sum + (Number(l.price) * Number(l.qty)), 0);
    const totalCost = orderLines.reduce((sum, l) => sum + (Number(l.cost || 0) * Number(l.qty || 0)), 0);

    const marginValue = totalRevenue - totalCost;
    const marginPercentage = totalRevenue > 0 ? (marginValue / totalRevenue) * 100 : 0;

    return {
      revenue: totalRevenue,
      margin: marginValue,
      percentage: marginPercentage.toFixed(2),
    };
  }, [orderLines, deliveryChargeProductId]);

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
          },
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
        </Box>

        <Typography
          variant="body2"
          sx={{
            color: '#9e9e9e',
            mb: 4,
            fontFamily: "'Inter', 'Segoe UI', sans-serif",
          }}
        >
          Order Products
        </Typography>

        {orderLines.length > 0 ? (
          <Fade in>
            <Box>
              <Box
                sx={{
                  backgroundColor: LIGHT_PURPLE_BG,
                  borderRadius: '16px',
                  overflow: 'hidden',
                  border: '1px solid #e8e4f0',
                  boxShadow: '0 2px 8px rgba(126, 87, 194, 0.06)',
                }}
              >
                <Table>
                  <TableHead>
                    <TableRow sx={{ backgroundColor: 'white' }}>
                      <TableCell sx={{ fontWeight: 600, color: '#2d2d2d', fontFamily: "'Inter', 'Segoe UI', sans-serif", py: 2.5 }}>
                        Product
                      </TableCell>
                      <TableCell sx={{ fontWeight: 600, color: '#2d2d2d', fontFamily: "'Inter', 'Segoe UI', sans-serif", width: '100px', textAlign: 'center' }}>
                        Stock Qty
                      </TableCell>
                      <TableCell sx={{ fontWeight: 600, color: '#2d2d2d', fontFamily: "'Inter', 'Segoe UI', sans-serif", width: '100px', textAlign: 'center' }}>
                        Quantity
                      </TableCell>
                      <TableCell sx={{ fontWeight: 600, color: '#2d2d2d', fontFamily: "'Inter', 'Segoe UI', sans-serif" }}>
                        Price
                      </TableCell>
                      <TableCell sx={{ fontWeight: 600, color: '#2d2d2d', fontFamily: "'Inter', 'Segoe UI', sans-serif" }}>
                        Subtotal
                      </TableCell>
                      <TableCell width="60" />
                    </TableRow>
                  </TableHead>

                  <TableBody>
                    {orderLines.map((line) => {
                      const delivery = isDeliveryId(line.id);
                      const discount = isDiscountId(line.id);

                      return (
                        <TableRow
                          key={`${line.id}-${line.name}`}
                          sx={{
                            transition: 'all 0.2s ease',
                            backgroundColor: delivery
                              ? alpha(THEME_PURPLE, 0.05)
                              : discount
                                ? alpha('#e9f41e', 0.1)
                                : line.restricted
                                  ? alpha('#ea412e', 0.05)
                                  : 'transparent',
                            '&:hover': {
                              backgroundColor: delivery ? alpha(THEME_PURPLE, 0.05) : 'white',
                              transform: 'scale(1.005)',
                            },
                          }}
                        >
                          <TableCell sx={{ fontFamily: "'Inter', 'Segoe UI', sans-serif", color: '#2d2d2d' }}>
                            <Box>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                {delivery && (
                                  <LocalShippingIcon sx={{ fontSize: 18, color: THEME_PURPLE, flexShrink: 0 }} />
                                )}
                                {discount && (
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
                            {delivery || discount ? '—' : (line.stock_qty || 0)}
                          </TableCell>

                          <TableCell sx={{ textAlign: 'center' }}>
                            <Box
                              sx={{
                                minWidth: '50px',
                                display: 'inline-block',
                                textAlign: 'center',
                                fontFamily: "'Inter', 'Segoe UI', sans-serif",
                                fontWeight: 700,
                                fontSize: '16px',
                                color: delivery || discount ? '#9e9e9e' : THEME_PURPLE,
                                backgroundColor: delivery || discount
                                  ? alpha('#9e9e9e', 0.08)
                                  : alpha(THEME_PURPLE, 0.1),
                                border: delivery || discount ? 'none' : `2px solid ${alpha(THEME_PURPLE, 0.25)}`,
                                borderRadius: '8px',
                                py: 0.75,
                              }}
                            >
                              {delivery || discount ? 1 : Number(line.qty || 1)}
                            </Box>
                          </TableCell>

                          <TableCell sx={{ fontFamily: "'Inter', 'Segoe UI', sans-serif", color: '#2d2d2d' }}>
                            {Number(line.price).toFixed(2)} {currency_symbol}
                          </TableCell>

                          <TableCell sx={{ fontFamily: "'Inter', 'Segoe UI', sans-serif", fontWeight: 600, color: THEME_PURPLE }}>
                            {(Number(line.price) * Number(line.qty)).toFixed(2)} {currency_symbol}
                          </TableCell>

                          <TableCell />
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </Box>

              <Box
                sx={{
                  mt: 4,
                  pt: 4,
                  borderTop: `2px solid ${alpha(THEME_PURPLE, 0.15)}`,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                }}
              >
                <Box>
                  <Chip
                    label={`${realItemsCount} ${realItemsCount === 1 ? 'item' : 'items'}`}
                    sx={{
                      backgroundColor: alpha(THEME_PURPLE, 0.1),
                      color: THEME_PURPLE,
                      fontFamily: "'Inter', 'Segoe UI', sans-serif",
                      fontWeight: 600,
                    }}
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
                      fontSize: '0.85rem',
                    }}
                  >
                    Margin: {totals.margin.toFixed(2)} {currency_symbol} ({totals.percentage}%)
                  </Typography>
                </Box>
              </Box>

              {/* Terms and Conditions Section */}
              {termsAndConditions && (
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
                  <Box
                    sx={{
                      backgroundColor: alpha(THEME_PURPLE, 0.03),
                      border: `1px solid ${alpha(THEME_PURPLE, 0.15)}`,
                      borderRadius: '16px',
                      p: 2.5,
                      fontFamily: "'Inter', 'Segoe UI', sans-serif",
                      color: '#2d2d2d',
                      fontSize: '14px',
                      lineHeight: 1.6,
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                    }}
                  >
                    {termsAndConditions}
                  </Box>
                </Box>
              )}
            </Box>
          </Fade>
        ) : (
          <Box
            sx={{
              py: 10,
              textAlign: 'center',
              backgroundColor: LIGHT_PURPLE_BG,
              borderRadius: '20px',
              border: `2px dashed ${alpha(THEME_PURPLE, 0.2)}`,
            }}
          >
            <ShoppingCartIcon sx={{ fontSize: 64, color: alpha(THEME_PURPLE, 0.3), mb: 2 }} />
            <Typography sx={{ color: '#9e9e9e', fontFamily: "'Inter', 'Segoe UI', sans-serif", fontSize: '16px', fontWeight: 500 }}>
              No products added
            </Typography>
          </Box>
        )}
      </Box>
    </Fade>
  );
}