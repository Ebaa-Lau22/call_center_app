import { useMemo } from 'react';
import {
  Box, Typography, Table, TableHead, TableRow, TableCell, TableBody,
  Chip, Fade, alpha,
} from '@mui/material';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import CardGiftcardIcon from '@mui/icons-material/CardGiftcard';
import MiscellaneousServicesIcon from '@mui/icons-material/MiscellaneousServices';
import WarningIcon from '@mui/icons-material/Warning';
import DescriptionIcon from '@mui/icons-material/Description';
import NotesIcon from '@mui/icons-material/Notes';
import BlockIcon from '@mui/icons-material/Block';

import { C, FONT, R, bannerGradient } from '../../theme/ccTheme';

export default function OrderLinesReadOnly({
  lines = [],
  termsAndConditions = '',
  productNotes = {},
}) {
  const companyData = JSON.parse(localStorage.getItem('company_data') || 'null');
  const currency_symbol = companyData?.currency_symbol || '';

  const userData = JSON.parse(localStorage.getItem('user_data') || 'null');
  if (!userData?.isManager && !userData?.isCallCenterEmployee) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <Typography color="error">Access denied.</Typography>
      </Box>
    );
  }

  const deliveryChargeProductId = companyData?.delivery_charge_service?.id;
  const customerServiceProductId = companyData?.customer_service?.id;

  const isDeliveryId = (id) => String(id) === String(deliveryChargeProductId);
  const isRewardId = (id) => String(id)?.startsWith('reward_') || false;
  const isCustomerServiceId = (id) => String(id) === String(customerServiceProductId);

  const orderLines = useMemo(() => (lines || []).map((l) => ({
    ...l,
    id: l.id ?? l.product_id ?? l.product?.id,
    name: l.name ?? l.product_name ?? l.display_name ?? l.product?.name ?? '—',
    qty: Number(l.qty ?? l.requested_qty ?? l.product_uom_qty ?? 1),
    price: Number(l.price ?? l.price_unit ?? 0),
    cost: Number(l.cost ?? l.cost_unit ?? 0),
    stock_qty: Number(l.stock_qty ?? 0),
    in_prep_qty: Number(l.in_prep_qty ?? 0),
    discount_percent: (isRewardId(l.id ?? l.product_id) || !!l.is_loyalty) ? 100 : Number(l.discount ?? 0),
  })), [lines]);

  const totals = useMemo(() => {
    let revenueBeforeDiscount = 0;
    let discountTotal = 0;
    let cost = 0;
    orderLines.forEach(l => {
      const isRew = isRewardId(l.id);
      if (isRew) return;
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

  const itemCount = useMemo(() =>
    orderLines.filter(l => !isDeliveryId(l.id) && !isRewardId(l.id) && !isCustomerServiceId(l.id)).length,
    [orderLines]);

  const thSx = { fontWeight: 600, color: C.text, fontFamily: FONT, fontSize: '11px', py: 1.5, px: 1 };
  const tdSx = { fontFamily: FONT, color: C.text, fontSize: '11px', px: 1, py: 0.75 };

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

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <ShoppingCartIcon sx={{ color: C.purple, fontSize: { xs: 22, sm: 26 } }} />
          <Typography variant="h5" sx={{ fontWeight: 700, color: C.text, fontFamily: FONT, fontSize: { xs: '20px', sm: '26px' } }}>
            Order Lines
          </Typography>
        </Box>
        <Typography variant="body2" sx={{ color: C.muted, mb: 3, fontFamily: FONT, fontSize: '13px' }}>
          Order Products
        </Typography>

        {orderLines.length > 0 ? (
          <Fade in>
            <Box>
              <Box sx={{ backgroundColor: C.purpleBg, borderRadius: { xs: R.soft, sm: R.cardSm }, overflow: 'auto', border: '1px solid #e8e4f0', WebkitOverflowScrolling: 'touch' }}>
                <Table sx={{ minWidth: '820px' }}>
                  <TableHead>
                    <TableRow sx={{ backgroundColor: 'white' }}>
                      <TableCell sx={{ ...thSx, width: '52px', textAlign: 'center' }}>Image</TableCell>
                      <TableCell sx={{ ...thSx, minWidth: '130px' }}>Product</TableCell>
                      <TableCell sx={{ ...thSx, width: '56px', textAlign: 'center' }}>Stock</TableCell>
                      <TableCell sx={{ ...thSx, width: '60px', textAlign: 'center' }}>In Prep</TableCell>
                      <TableCell sx={{ ...thSx, width: '60px', textAlign: 'center' }}>Qty</TableCell>
                      <TableCell sx={{ ...thSx, width: '70px' }}>Price</TableCell>
                      <TableCell sx={{ ...thSx, width: '68px', textAlign: 'center' }}>Disc %</TableCell>
                      <TableCell sx={{ ...thSx, width: '78px' }}>Before Disc</TableCell>
                      <TableCell sx={{ ...thSx, width: '78px' }}>Subtotal</TableCell>
                    </TableRow>
                  </TableHead>

                  <TableBody>
                    {orderLines.map((line, idx) => {
                      const isDelivery = isDeliveryId(line.id);
                      const isReward = isRewardId(line.id) || !!line.is_loyalty;
                      const isService = isCustomerServiceId(line.id);
                      const isServiceRow = isDelivery || isService;

                      const lineGross = (line.price || 0) * (line.qty || 0);
                      const lineDiscount = lineGross * ((line.discount_percent || 0) / 100);
                      const lineNet = lineGross - lineDiscount;

                      return (
                        <>
                          <TableRow key={`${line.id}-${idx}`} sx={{
                            backgroundColor:
                              isDelivery ? alpha('#a21ef4', 0.04) :
                                isReward ? alpha(C.pink, 0.07) :
                                  isService ? alpha(C.teal, 0.06) :
                                    line.restricted ? alpha(C.red, 0.04) :
                                      'transparent',
                          }}>

                            {/* image / icon */}
                            <TableCell sx={{ p: '4px 8px', textAlign: 'center', verticalAlign: 'middle' }}>
                              {isDelivery && <LocalShippingIcon sx={{ fontSize: 22, color: C.purple }} />}
                              {isReward && <CardGiftcardIcon sx={{ fontSize: 22, color: C.pink }} />}
                              {isService && <MiscellaneousServicesIcon sx={{ fontSize: 20, color: alpha(C.teal, 0.75) }} />}
                              {!isDelivery && !isReward && !isService && (
                                <Box sx={{ width: 52, height: 52, mx: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderRadius: R.soft }}>
                                  <Box component="img"
                                    src={line.image ? `data:image/png;base64,${line.image}` : '/assets/placeholder-product.png'}
                                    sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                                  />
                                </Box>
                              )}
                            </TableCell>

                            {/* product name */}
                            <TableCell sx={tdSx}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                {line.restricted && <WarningIcon sx={{ fontSize: 13, color: '#b71c1c', flexShrink: 0 }} />}
                                <span style={{ fontWeight: isReward ? 600 : 400 }}>{line.name}{line.name_ar ? ` - ${line.name_ar}` : ''}</span>
                              </Box>
                              {line.restricted && (
                                <Typography variant="caption" sx={{ display: 'block', mt: 0.25, ml: 2, color: '#b71c1c', fontFamily: FONT, fontSize: '10px', fontWeight: 500 }}>
                                  Restricted — prescription required
                                </Typography>
                              )}
                            </TableCell>

                            {/* stock */}
                            <TableCell sx={{ ...tdSx, textAlign: 'center', fontWeight: 600 }}>
                              {isServiceRow
                                ? <BlockIcon sx={{ fontSize: 14, color: alpha(C.muted, 0.5) }} />
                                : (line.stock_qty || 0)}
                            </TableCell>

                            {/* in prep */}
                            <TableCell sx={{ ...tdSx, textAlign: 'center', fontWeight: 600, color: isServiceRow ? C.muted : '#e65100' }}>
                              {isServiceRow
                                ? <BlockIcon sx={{ fontSize: 14, color: alpha(C.muted, 0.5) }} />
                                : (line.in_prep_qty || 0)}
                            </TableCell>

                            {/* qty — static badge */}
                            <TableCell sx={{ textAlign: 'center', px: 0.5 }}>
                              <Box sx={{
                                display: 'inline-block', minWidth: '36px', textAlign: 'center',
                                fontFamily: FONT, fontWeight: 700, fontSize: '13px',
                                color: isServiceRow ? C.muted : isReward ? C.pink : C.purple,
                                backgroundColor: isServiceRow ? alpha(C.muted, 0.08) : isReward ? alpha(C.pink, 0.08) : alpha(C.purple, 0.10),
                                border: isServiceRow || isReward ? 'none' : `2px solid ${alpha(C.purple, 0.25)}`,
                                borderRadius: R.soft, py: 0.5,
                              }}>
                                {line.qty}
                              </Box>
                            </TableCell>

                            {/* price */}
                            <TableCell sx={tdSx}>
                              {(line.price || 0).toFixed(2)} {currency_symbol}
                            </TableCell>

                            {/* disc % */}
                            <TableCell sx={{ ...tdSx, textAlign: 'center' }}>
                              {isServiceRow ? (
                                <BlockIcon sx={{ fontSize: 14, color: alpha(C.muted, 0.5) }} />
                              ) : isReward ? (
                                <Chip label="100%" size="small" sx={{ backgroundColor: alpha(C.pink, 0.12), color: C.pink, fontFamily: FONT, fontWeight: 700, fontSize: '10px', height: '20px' }} />
                              ) : (line.discount_percent || 0) > 0 ? (
                                <Chip label={`${(line.discount_percent).toFixed(3)}%`} size="small" sx={{ backgroundColor: alpha(C.gold, 0.15), color: C.goldDark, fontFamily: FONT, fontWeight: 700, fontSize: '10px', height: '20px' }} />
                              ) : (
                                <span style={{ color: C.muted }}>—</span>
                              )}
                            </TableCell>

                            {/* subtotal before discount */}
                            <TableCell sx={{ ...tdSx, color: C.mutedDark }}>
                              {isServiceRow ? '—' : `${lineGross.toFixed(2)} ${currency_symbol}`}
                            </TableCell>

                            {/* subtotal after discount */}
                            <TableCell sx={{ ...tdSx, fontWeight: 600, color: isReward ? C.pink : C.purple }}>
                              {isReward ? `0.00 ${currency_symbol}` : `${lineNet.toFixed(2)} ${currency_symbol}`}
                            </TableCell>
                          </TableRow>

                          {/* note sub-row — shown only when a note exists */}
                          {!isDelivery && !isService && productNotes[line.id] && (
                            <TableRow key={`note-${line.id}-${idx}`} sx={{ backgroundColor: alpha(C.purple, 0.012) }}>
                              <TableCell sx={{ p: '0 8px', textAlign: 'center', verticalAlign: 'middle' }}>
                                <NotesIcon sx={{ fontSize: 14, color: '#b8b2c4', display: 'block', mx: 'auto' }} />
                              </TableCell>
                              <TableCell colSpan={8} sx={{ p: 0, verticalAlign: 'middle' }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', minHeight: '30px', pl: '12px', pr: '8px' }}>
                                  <Typography sx={{ fontFamily: FONT, fontSize: '11.5px', color: '#666', lineHeight: '24px' }}>
                                    {productNotes[line.id]}
                                  </Typography>
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

              {/* totals */}
              <Box sx={{ mt: 3.5, pt: 3.5, borderTop: `2px solid ${alpha(C.purple, 0.15)}`, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: { xs: 2, sm: 0 } }}>
                <Box>
                  <Chip label={`${itemCount} item${itemCount !== 1 ? 's' : ''}`} sx={{ backgroundColor: alpha(C.purple, 0.1), color: C.purple, fontFamily: FONT, fontWeight: 600, fontSize: '12px' }} />
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
                  <Typography variant="caption" sx={{ display: 'block', mt: 0.75, color: '#616161', fontFamily: FONT, fontWeight: 500, fontSize: '11px' }}>
                    Margin: {totals.margin.toFixed(2)} {currency_symbol} ({totals.percentage}%)
                  </Typography>
                </Box>
              </Box>

              {/* terms and conditions */}
              {termsAndConditions && (
                <Box sx={{ mt: 3.5, pt: 3.5, borderTop: `2px solid ${alpha(C.purple, 0.15)}` }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                    <DescriptionIcon sx={{ color: C.purple, fontSize: { xs: 18, sm: 22 } }} />
                    <Typography sx={{ fontWeight: 700, fontSize: { xs: '13px', sm: '15px' }, color: C.text, fontFamily: FONT }}>Terms & Conditions</Typography>
                  </Box>
                  <Box sx={{
                    backgroundColor: alpha(C.purple, 0.03),
                    border: `1px solid ${alpha(C.purple, 0.12)}`,
                    borderRadius: R.cardSm,
                    p: 2.5,
                    fontFamily: FONT,
                    color: C.text,
                    fontSize: '13px',
                    lineHeight: 1.6,
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                  }}>
                    {termsAndConditions}
                  </Box>
                </Box>
              )}
            </Box>
          </Fade>
        ) : (
          <Box sx={{ py: { xs: 6, sm: 10 }, textAlign: 'center', backgroundColor: C.purpleBg, borderRadius: { xs: R.soft, sm: R.card }, border: `2px dashed ${alpha(C.purple, 0.2)}` }}>
            <ShoppingCartIcon sx={{ fontSize: { xs: 44, sm: 56 }, color: alpha(C.purple, 0.3), mb: 2 }} />
            <Typography sx={{ color: C.muted, fontFamily: FONT, fontSize: { xs: '13px', sm: '15px' }, fontWeight: 500 }}>No products added</Typography>
          </Box>
        )}
      </Box>
    </Fade>
  );
}