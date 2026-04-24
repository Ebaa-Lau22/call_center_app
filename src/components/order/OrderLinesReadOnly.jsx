import { useMemo } from 'react';
import {
  Box, Typography, Table, TableHead, TableRow, TableCell, TableBody,
  Chip, Fade, alpha,
} from '@mui/material';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import LocalOfferIcon from '@mui/icons-material/LocalOffer';
import CardGiftcardIcon from '@mui/icons-material/CardGiftcard';
import MiscellaneousServicesIcon from '@mui/icons-material/MiscellaneousServices';
import WarningIcon from '@mui/icons-material/Warning';
import DescriptionIcon from '@mui/icons-material/Description';
import NotesIcon from '@mui/icons-material/Notes';

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
  const discountProductId = companyData?.discount_service?.id;
  const customerServiceProductId = companyData?.customer_service?.id;

  const isDeliveryId = (id) => String(id) === String(deliveryChargeProductId);
  const isDiscountId = (id) => String(id) === String(discountProductId);
  const isRewardId = (id) => String(id)?.startsWith('reward_');
  const isCustomerServiceId = (id) => String(id) === String(customerServiceProductId);

  // normalise whatever shape the parent passes in
  const orderLines = useMemo(() => {
    return (lines || []).map((l) => ({
      ...l,
      id: l.id ?? l.product_id ?? l.product?.id,
      name: l.name ?? l.product_name ?? l.display_name ?? l.product?.name ?? '—',
      qty: Number(l.qty ?? l.requested_qty ?? l.product_uom_qty ?? 1),
      price: Number(l.price ?? l.price_unit ?? 0),
      cost: Number(l.cost ?? l.cost_unit ?? 0),
      stock_qty: Number(l.stock_qty ?? 0),
    }));
  }, [lines]);

  const discountLine = orderLines.find(l => isDiscountId(l.id));
  const discountAmount = discountLine ? discountLine.price * discountLine.qty : 0;
  const hasDiscount = !!discountLine && discountAmount < 0;

  const itemCount = useMemo(() =>
    orderLines.filter(l =>
      !isDeliveryId(l.id) && !isDiscountId(l.id) &&
      !isRewardId(l.id) && !isCustomerServiceId(l.id)
    ).length,
    [orderLines]);

  const totals = useMemo(() => {
    const revenue = orderLines.filter(l => !isRewardId(l.id)).reduce((s, l) => s + l.price * l.qty, 0);
    const cost = orderLines.reduce((s, l) => s + (l.cost || 0) * l.qty, 0);
    const margin = revenue - cost;
    return { revenue, margin, percentage: (revenue > 0 ? (margin / revenue) * 100 : 0).toFixed(2) };
  }, [orderLines]);

  const tbd = hasDiscount ? totals.revenue - discountAmount : 0; // total before discount

  return (
    <Fade in timeout={600}>
      <Box sx={{
        backgroundColor: 'white',
        borderRadius: { xs: R.cardSm, sm: R.card },
        p: { xs: 3, sm: 6 },
        boxShadow: '0 8px 32px rgba(126, 87, 194, 0.12)',
        border: '1px solid rgba(126, 87, 194, 0.08)',
        position: 'relative', overflow: 'hidden',
        '&::before': {
          content: '""', position: 'absolute', top: 0, left: 0, right: 0,
          height: '5px', background: bannerGradient,
        },
      }}>

        {/* header */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <ShoppingCartIcon sx={{ color: C.purple, fontSize: { xs: 24, sm: 28 } }} />
          <Typography variant="h4" sx={{ fontWeight: 700, color: C.text, fontFamily: FONT, fontSize: { xs: '22px', sm: '32px' } }}>
            Order Lines
          </Typography>
        </Box>
        <Typography variant="body2" sx={{ color: C.muted, mb: 4, fontFamily: FONT, fontSize: { xs: '12px', sm: '14px' } }}>
          Order Products
        </Typography>

        {orderLines.length > 0 ? (
          <Fade in>
            <Box>
              <Box sx={{ backgroundColor: C.purpleBg, borderRadius: { xs: R.soft, sm: R.cardSm }, overflow: 'auto', border: '1px solid #e8e4f0', WebkitOverflowScrolling: 'touch' }}>
                <Table sx={{ minWidth: { xs: '560px', sm: 'auto' } }}>
                  <TableHead>
                    <TableRow sx={{ backgroundColor: 'white' }}>
                      <TableCell sx={{ fontWeight: 600, color: C.text, fontFamily: FONT, width: '72px', textAlign: 'center', py: { xs: 1.5, sm: 2.5 }, fontSize: { xs: '11px', sm: '13px' } }}>Image</TableCell>
                      <TableCell sx={{ fontWeight: 600, color: C.text, fontFamily: FONT, py: { xs: 1.5, sm: 2.5 }, fontSize: { xs: '12px', sm: '14px' } }}>Product</TableCell>
                      <TableCell sx={{ fontWeight: 600, color: C.text, fontFamily: FONT, width: { xs: '65px', sm: '80px' }, textAlign: 'center', fontSize: { xs: '11px', sm: '14px' } }}>Stock</TableCell>
                      <TableCell sx={{ fontWeight: 600, color: C.text, fontFamily: FONT, width: { xs: '80px', sm: '100px' }, textAlign: 'center', fontSize: { xs: '11px', sm: '14px' } }}>Qty</TableCell>
                      <TableCell sx={{ fontWeight: 600, color: C.text, fontFamily: FONT, fontSize: { xs: '12px', sm: '14px' } }}>Price</TableCell>
                      <TableCell sx={{ fontWeight: 600, color: C.text, fontFamily: FONT, fontSize: { xs: '12px', sm: '14px' } }}>Subtotal</TableCell>
                    </TableRow>
                  </TableHead>

                  <TableBody>
                    {orderLines.map((line, idx) => {
                      const isDelivery = isDeliveryId(line.id);
                      const isDisc = isDiscountId(line.id);
                      const isReward = isRewardId(line.id) || !!line.is_loyalty;
                      const isService = isCustomerServiceId(line.id);
                      const isSpecial = isDelivery || isDisc || isReward || isService;

                      return (
                        <>
                          <TableRow key={`${line.id}-${idx}`} sx={{
                            backgroundColor:
                              isDelivery ? alpha('#a21ef4', 0.05) :
                                isDisc ? alpha('#ecff20', 0.10) :
                                  isReward ? alpha(C.pink, 0.10) :
                                    isService ? alpha(C.teal, 0.08) :
                                      line.restricted ? alpha(C.red, 0.05) :
                                        'transparent',
                          }}>

                            {/* image / icon */}
                            <TableCell sx={{ p: { xs: 0.75, sm: 1 }, textAlign: 'center', verticalAlign: 'middle', width: '52px' }}>
                              {isDelivery && <LocalShippingIcon sx={{ fontSize: 26, color: C.purple }} />}
                              {isDisc && <LocalOfferIcon sx={{ fontSize: 26, color: C.gold }} />}
                              {isReward && <CardGiftcardIcon sx={{ fontSize: 26, color: C.pink }} />}
                              {isService && <MiscellaneousServicesIcon sx={{ fontSize: 22, color: alpha(C.teal, 0.75) }} />}
                              {!isSpecial && (
                                <Box sx={{ width: 52, height: 52, mx: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderRadius: R.soft }}>
                                  <Box component="img"
                                    src={line.image ? `data:image/png;base64,${line.image}` : '/assets/placeholder-product.png'}
                                    sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                                  />
                                </Box>
                              )}
                            </TableCell>

                            {/* product name */}
                            <TableCell sx={{ fontFamily: FONT, color: C.text, fontSize: { xs: '12px', sm: '14px' } }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                {line.restricted && <WarningIcon sx={{ fontSize: { xs: 15, sm: 17 }, color: '#b71c1c', flexShrink: 0 }} />}
                                <span>{line.name}{line.name_ar ? ` - ${line.name_ar}` : ''}</span>
                              </Box>
                              {line.restricted && (
                                <Typography variant="caption" sx={{ display: 'block', mt: 0.5, ml: 3, color: '#b71c1c', fontFamily: FONT, fontSize: { xs: '10px', sm: '12px' }, fontWeight: 500 }}>
                                  Restricted Product (needs a doctor prescription)
                                </Typography>
                              )}
                            </TableCell>

                            {/* stock */}
                            <TableCell sx={{ textAlign: 'center', fontFamily: FONT, color: C.text, fontWeight: 600, fontSize: { xs: '12px', sm: '14px' } }}>
                              {isSpecial ? '—' : (line.stock_qty || 0)}
                            </TableCell>

                            {/* qty — static badge, same visual style as the editable version */}
                            <TableCell sx={{ textAlign: 'center' }}>
                              <Box sx={{
                                display: 'inline-block',
                                minWidth: '44px',
                                textAlign: 'center',
                                fontFamily: FONT,
                                fontWeight: 700,
                                fontSize: { xs: '14px', sm: '16px' },
                                color: isSpecial ? C.muted : C.purple,
                                backgroundColor: isSpecial ? alpha(C.muted, 0.08) : alpha(C.purple, 0.10),
                                border: isSpecial ? 'none' : `2px solid ${alpha(C.purple, 0.25)}`,
                                borderRadius: R.soft,
                                py: 0.75,
                              }}>
                                {line.qty}
                              </Box>
                            </TableCell>

                            {/* price */}
                            <TableCell sx={{ fontFamily: FONT, color: C.text, fontSize: { xs: '12px', sm: '14px' } }}>
                              {Number(line.price).toFixed(2)} {currency_symbol}
                            </TableCell>

                            {/* subtotal */}
                            <TableCell sx={{ fontFamily: FONT, fontWeight: 600, color: C.purple, fontSize: { xs: '12px', sm: '14px' } }}>
                              {(line.price * line.qty).toFixed(2)} {currency_symbol}
                            </TableCell>
                          </TableRow>

                          {/* note sub-row — read-only, shown only when a note exists */}
                          {!isSpecial && productNotes[line.id] && (
                            <TableRow key={`note-${line.id}-${idx}`} sx={{ backgroundColor: alpha(C.purple, 0.015) }}>
                              <TableCell sx={{ p: '0 8px', textAlign: 'center', verticalAlign: 'middle', width: '72px' }}>
                                <NotesIcon sx={{ fontSize: 17, color: '#b8b2c4', display: 'block', mx: 'auto' }} />
                              </TableCell>
                              <TableCell colSpan={5} sx={{ p: 0, verticalAlign: 'middle' }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', minHeight: '36px', pl: '16px', pr: '8px' }}>
                                  <Typography sx={{ fontFamily: FONT, fontSize: '12.5px', color: '#666', lineHeight: '26px' }}>
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
              <Box sx={{ mt: 4, pt: 4, borderTop: `2px solid ${alpha(C.purple, 0.15)}`, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: { xs: 2, sm: 0 } }}>
                <Box>
                  <Chip label={`${itemCount} item${itemCount !== 1 ? 's' : ''}`} sx={{ backgroundColor: alpha(C.purple, 0.1), color: C.purple, fontFamily: FONT, fontWeight: 600 }} />
                </Box>

                <Box sx={{ textAlign: 'right' }}>
                  {hasDiscount && (
                    <Box sx={{ mb: 1 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mb: 0.4 }}>
                        <Typography sx={{ color: C.mutedDark, fontFamily: FONT, fontSize: '14px' }}>Before Discount</Typography>
                        <Typography sx={{ color: C.mutedDark, fontFamily: FONT, fontSize: '14px', fontWeight: 600 }}>{tbd.toFixed(2)} {currency_symbol}</Typography>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mb: 0.4 }}>
                        <Typography sx={{ color: alpha(C.gold, 0.80), fontFamily: FONT, fontSize: '14px' }}>Discount</Typography>
                        <Typography sx={{ color: alpha(C.gold, 0.80), fontFamily: FONT, fontSize: '14px', fontWeight: 600 }}>−{Math.abs(discountAmount).toFixed(2)} {currency_symbol}</Typography>
                      </Box>
                      <Box sx={{ borderBottom: `1.5px solid ${alpha(C.gold, 0.20)}`, mb: 0.8 }} />
                    </Box>
                  )}
                  <Typography variant="body2" sx={{ color: C.muted, fontFamily: FONT, mb: 0.5 }}>{hasDiscount ? 'Final Total' : 'Total Amount'}</Typography>
                  <Typography variant="h3" sx={{ fontWeight: 700, color: C.purple, fontFamily: FONT, fontSize: { xs: '24px', sm: '32px' } }}>{totals.revenue.toFixed(2)} {currency_symbol}</Typography>
                  <Typography variant="caption" sx={{ display: 'block', mt: 1, color: '#616161', fontFamily: FONT, fontWeight: 500 }}>Margin: {totals.margin.toFixed(2)} {currency_symbol} ({totals.percentage}%)</Typography>
                </Box>
              </Box>

              {/* terms and conditions — read-only styled box */}
              {termsAndConditions && (
                <Box sx={{ mt: 4, pt: 4, borderTop: `2px solid ${alpha(C.purple, 0.15)}` }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                    <DescriptionIcon sx={{ color: C.purple, fontSize: { xs: 20, sm: 24 } }} />
                    <Typography sx={{ fontWeight: 700, fontSize: { xs: '14px', sm: '16px' }, color: C.text, fontFamily: FONT }}>Terms & Conditions</Typography>
                  </Box>
                  <Box sx={{
                    backgroundColor: alpha(C.purple, 0.03),
                    border: `1px solid ${alpha(C.purple, 0.12)}`,
                    borderRadius: R.cardSm,
                    p: 2.5,
                    fontFamily: FONT,
                    color: C.text,
                    fontSize: '14px',
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
            <ShoppingCartIcon sx={{ fontSize: { xs: 48, sm: 64 }, color: alpha(C.purple, 0.3), mb: 2 }} />
            <Typography sx={{ color: C.muted, fontFamily: FONT, fontSize: { xs: '14px', sm: '16px' }, fontWeight: 500 }}>No products added</Typography>
          </Box>
        )}
      </Box>
    </Fade>
  );
}