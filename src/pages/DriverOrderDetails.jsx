import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Box, Container, Fade, Typography, Button, alpha, Divider,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  Chip, CircularProgress, useMediaQuery, useTheme,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import PhoneIcon from "@mui/icons-material/Phone";
import PaymentsIcon from "@mui/icons-material/Payments";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import StoreIcon from "@mui/icons-material/Store";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import WhatsAppIcon from "@mui/icons-material/WhatsApp";
import AssignmentReturnIcon from "@mui/icons-material/AssignmentReturn";
import NotesIcon from "@mui/icons-material/Notes";
import PaymentIcon from "@mui/icons-material/Payment";
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";
import axios from "axios";
import { C, FONT, R, bannerGradient } from "../theme/ccTheme";

const P = C.purple;
const T = C.teal;

function stateLabel(s) {
  if (s === "waiting_for_approve") return "Pending Approval";
  if (s === "delivery") return "In Delivery";
  if (s === "partially_received") return "Partially Received";
  if (s === "received") return "Money Received";
  if (s === "done") return "Done";
  return s;
}

const RETURNED_METHOD = { id: "returned", name: "Returned" };

export default function DriverAssignmentDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const isTablet = useMediaQuery(theme.breakpoints.down("md"));

  const [assignment, setAssignment] = useState(null);
  const [loading, setLoading] = useState(false);

  const [payDialogOpen, setPayDialogOpen] = useState(false);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [paymentAmounts, setPaymentAmounts] = useState({});
  const [paymentEnabled, setPaymentEnabled] = useState({});
  const [loadingPayment, setLoadingPayment] = useState(false);
  const [paymentNote, setPaymentNote] = useState("");

  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [confirmMessage, setConfirmMessage] = useState("");
  const [confirmCallback, setConfirmCallback] = useState(null);

  const driverId = JSON.parse(localStorage.getItem("user_data"))?.id;
  const userData = JSON.parse(localStorage.getItem("user_data") || "null");
  if (!userData?.isDriver) {
    return (
      <Box sx={{ minHeight: "100vh", display: "flex", justifyContent: "center", alignItems: "center" }}>
        <Typography color="error">Access denied.</Typography>
      </Box>
    );
  }

  const load = async () => {
    setLoading(true);
    try {
      const response = await axios.post(
        `/api/driver/task/details`,
        { params: { assignment_id: id, driver_id: driverId } },
        { withCredentials: true, headers: { "Content-Type": "application/json" } }
      );
      if (response.data.result?.status === "success") {
        setAssignment(response.data.result?.result);
      }
    } catch (error) {
      console.error("Error loading assignment:", error);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, [id, driverId]);

  const canAct    = useMemo(() => assignment?.state === "waiting_for_approve", [assignment]);
  const canCall   = useMemo(() => assignment?.state === "delivery", [assignment]);
  const canReceive = useMemo(() =>
    assignment && (assignment.state === "delivery" || assignment.state === "partially_received"),
    [assignment]
  );

  const handleAccept = async () => {
    try {
      const res = await axios.post(
        `/api/driver/task/accept`,
        { params: { assignment_id: id, driver_id: driverId } },
        { withCredentials: true, headers: { "Content-Type": "application/json" } }
      );
      if (res.data.result?.status === "success") navigate("/driver/orders");
      else alert(res.data.result?.message || "Failed to accept");
    } catch { alert("Error accepting assignment"); }
  };

  const handleReject = async () => {
    try {
      const res = await axios.post(
        `/api/driver/task/refuse`,
        { params: { assignment_id: id, driver_id: driverId, reason: "" } },
        { withCredentials: true, headers: { "Content-Type": "application/json" } }
      );
      if (res.data.result?.status === "success") navigate("/driver/orders");
      else alert(res.data.result?.message || "Failed to reject");
    } catch { alert("Error rejecting assignment"); }
  };

  const allMethods = useMemo(() => [...paymentMethods, RETURNED_METHOD], [paymentMethods]);

  const openReceiveMoney = async () => {
    setLoadingPayment(true);
    try {
      const res = await axios.post(
        `/api/driver/payment/types`,
        { params: {} },
        { withCredentials: true, headers: { "Content-Type": "application/json" } }
      );
      if (res.data.result?.status === "success") {
        const methods = res.data.result?.payment_types || [];
        setPaymentMethods(methods);
        const allM = [...methods, RETURNED_METHOD];
        setPaymentEnabled(allM.reduce((acc, m) => ({ ...acc, [m.id]: false }), {}));
        setPaymentAmounts(allM.reduce((acc, m) => ({ ...acc, [m.id]: 0 }), {}));
        setPaymentNote("");
        setPayDialogOpen(true);
      } else {
        alert("Error loading payment methods");
      }
    } catch { alert("Error loading payment methods"); }
    setLoadingPayment(false);
  };

  const openReturnOrder = () => {
    const order = assignment?.orders?.[0];
    if (!order) return;
    setConfirmMessage(
      `This will mark the entire order as returned.\n\nOrder Total: ${order.amount_total} ${order.currency}\n\nNo money will be recorded. Are you sure?`
    );
    setConfirmCallback(() => async () => {
      setConfirmDialogOpen(false);
      setLoadingPayment(true);
      try {
        const res = await axios.post(
          `/api/driver/receive/money`,
          {
            params: {
              assignment_id: id,
              driver_id: driverId,
              payment_type_ids: [],
              description: "Full order returned by driver",
            },
          },
          { withCredentials: true, headers: { "Content-Type": "application/json" } }
        );
        if (res.data.result?.status === "success") {
          alert("Order marked as returned successfully.");
          navigate("/driver/orders");
        } else {
          alert(res.data.result?.message || "Failed to record return");
        }
      } catch { alert("Error recording return"); }
      setLoadingPayment(false);
    });
    setConfirmDialogOpen(true);
  };

  const togglePaymentMethod = (methodId) => {
    setPaymentEnabled((prev) => ({ ...prev, [methodId]: !prev[methodId] }));
    if (paymentEnabled[methodId]) {
      setPaymentAmounts((prev) => ({ ...prev, [methodId]: 0 }));
    }
  };

  const handleAmountChange = (methodId, value) => {
    setPaymentAmounts((prev) => ({ ...prev, [methodId]: parseFloat(value) || 0 }));
  };

  const totalEntered = useMemo(() =>
    allMethods.reduce((sum, m) => sum + (paymentEnabled[m.id] ? paymentAmounts[m.id] || 0 : 0), 0),
    [allMethods, paymentEnabled, paymentAmounts]
  );

  const confirmReceiveMoney = async () => {
    const order = assignment?.orders?.[0];
    const orderTotal = order?.amount_total || 0;
    const diff = Math.abs(totalEntered - orderTotal);

    if (diff > 0.01) {
      alert(
        `Total entered (${totalEntered.toFixed(2)}) must equal the order total (${orderTotal.toFixed(2)}).\n\nUse the "Returned" method for any amount not collected in cash.`
      );
      return;
    }

    const realPayments = allMethods
      .filter((m) => m.id !== "returned" && paymentEnabled[m.id] && paymentAmounts[m.id] > 0)
      .map((m) => ({ payment_type_id: m.id, amount: paymentAmounts[m.id] }));

    setLoadingPayment(true);
    setPayDialogOpen(false);
    try {
      const res = await axios.post(
        `/api/driver/receive/money`,
        {
          params: {
            assignment_id: id,
            driver_id: driverId,
            payment_type_ids: realPayments,
            description: paymentNote,
          },
        },
        { withCredentials: true, headers: { "Content-Type": "application/json" } }
      );
      if (res.data.result?.status === "success") {
        alert("Payment recorded successfully!");
        navigate("/driver/orders");
      } else {
        alert(res.data.result?.message || "Failed to record payment");
        setPayDialogOpen(true);
      }
    } catch { alert("Error recording payment"); setPayDialogOpen(true); }
    setLoadingPayment(false);
  };

  const copyPhone = async (phone) => {
    try { await navigator.clipboard.writeText(phone); alert("Phone copied!"); }
    catch { }
  };

  if (loading) {
    return (
      <Box sx={{ minHeight: "100vh", display: "flex", justifyContent: "center", alignItems: "center", background: `linear-gradient(135deg, ${alpha(P, 0.06)} 0%, white 100%)` }}>
        <CircularProgress sx={{ color: P }} />
      </Box>
    );
  }

  if (!assignment) {
    return (
      <Box sx={{ minHeight: "100vh", background: `linear-gradient(135deg, ${alpha(P, 0.06)} 0%, white 100%)` }}>
        <Container maxWidth="md" sx={{ pt: 4 }}>
          <Button startIcon={<ArrowBackIcon />} onClick={() => navigate("/driver/orders")} sx={{ color: P, fontFamily: FONT, fontWeight: 600, mb: 3 }}>Back</Button>
          <Typography sx={{ color: C.muted, fontFamily: FONT }}>Assignment not found</Typography>
        </Container>
      </Box>
    );
  }

  const order = assignment.orders?.[0];
  const hasDiscount = order && order.amount_discount > 0;

  return (
    <Box sx={{ minHeight: "100vh", background: `linear-gradient(135deg, ${alpha(P, 0.04)} 0%, white 60%, ${alpha(T, 0.03)} 100%)`, fontFamily: FONT, pb: 4 }}>
      <Container maxWidth="md" sx={{ pt: isMobile ? 2 : 3, px: isMobile ? 1.5 : 2 }}>
        <Fade in timeout={400}>
          <Box>
            <Button startIcon={<ArrowBackIcon />} onClick={() => navigate("/driver/orders")}
              sx={{ color: P, fontFamily: FONT, fontWeight: 600, mb: 2, fontSize: isMobile ? 13 : 14, "&:hover": { backgroundColor: alpha(P, 0.06) } }}>
              Back
            </Button>

            {/* Assignment header card */}
            <Box sx={cardSx(isMobile)}>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 1, mb: canAct ? 2.5 : 0 }}>
                <Box>
                  <Typography sx={{ fontFamily: FONT, fontWeight: 800, fontSize: isMobile ? 18 : 22, color: C.text }}>{assignment.name}</Typography>
                  <Typography sx={{ fontFamily: FONT, fontSize: isMobile ? 11 : 12, color: C.muted, mt: 0.4 }}>{assignment.assignment_date}</Typography>
                </Box>
                <Box sx={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 0.8, flexShrink: 0 }}>
                  <Chip label={stateLabel(assignment.state)}
                    sx={{ backgroundColor: alpha(P, 0.12), color: P, fontFamily: FONT, fontWeight: 700, fontSize: isMobile ? 11 : 12, height: isMobile ? 26 : 30, borderRadius: R.pill }} />
                  {order?.already_paid_online && (
                    <Chip icon={<PaymentIcon sx={{ fontSize: 14, color: T }} />} label="Paid Online"
                      sx={{ backgroundColor: alpha(T, 0.12), color: T, fontFamily: FONT, fontWeight: 700, fontSize: 11, height: 24, borderRadius: R.pill, "& .MuiChip-icon": { ml: "6px" } }} />
                  )}
                </Box>
              </Box>

              {canAct && (
                <Box sx={{ display: "flex", gap: 1.5 }}>
                  <Button startIcon={<CheckCircleIcon />} onClick={handleAccept} fullWidth
                    sx={{ backgroundColor: P, color: "white", borderRadius: R.cardSm, py: isMobile ? 1 : 1.2, fontWeight: 700, fontSize: isMobile ? 13 : 14, fontFamily: FONT, textTransform: "none", boxShadow: `0 6px 18px ${alpha(P, 0.30)}`, "&:hover": { backgroundColor: C.purpleDark } }}>
                    Accept
                  </Button>
                  <Button startIcon={<CancelIcon />} onClick={handleReject} fullWidth
                    sx={{ border: `2px solid ${C.red}`, color: C.red, borderRadius: R.cardSm, py: isMobile ? 1 : 1.2, fontWeight: 700, fontSize: isMobile ? 13 : 14, fontFamily: FONT, textTransform: "none", "&:hover": { backgroundColor: alpha(C.red, 0.06) } }}>
                    Reject
                  </Button>
                </Box>
              )}
            </Box>

            {/* Assignment note */}
            {assignment.note && (
              <Box sx={{ ...cardSx(isMobile), backgroundColor: alpha(T, 0.04), border: `1px solid ${alpha(T, 0.20)}` }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.2 }}>
                  <NotesIcon sx={{ color: T, fontSize: 18 }} />
                  <Typography sx={{ fontFamily: FONT, fontWeight: 700, fontSize: isMobile ? 13 : 14, color: C.text }}>Delivery Note</Typography>
                </Box>
                <Typography sx={{ fontFamily: FONT, fontSize: isMobile ? 13 : 14, color: C.text, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{assignment.note}</Typography>
              </Box>
            )}

            {order && (
              <>
                {/* Order info */}
                <Box sx={cardSx(isMobile)}>
                  <Typography sx={{ fontFamily: FONT, fontWeight: 800, fontSize: isMobile ? 15 : 16, color: C.text, mb: 1.5 }}>Order Details</Typography>

                  <Box sx={{ borderRadius: R.soft, border: `1px solid ${alpha(P, 0.14)}`, backgroundColor: alpha(P, 0.03), p: isMobile ? 1.5 : 2, mb: 1.5 }}>
                    <Typography sx={{ fontFamily: FONT, fontWeight: 700, fontSize: isMobile ? 14 : 15, color: C.text }}>{order.name}</Typography>
                    <Typography sx={{ fontFamily: FONT, fontSize: isMobile ? 12 : 13, color: C.muted, mt: 0.3 }}>Customer: {order.customer_name}</Typography>

                    <Divider sx={{ my: 1.5, borderColor: alpha(P, 0.10) }} />

                    <Box sx={{ display: "flex", gap: 1, alignItems: "flex-start", mb: 1 }}>
                      <LocationOnIcon sx={{ color: P, fontSize: 18, flexShrink: 0, mt: 0.2 }} />
                      <Box>
                        <Typography sx={{ fontFamily: FONT, fontWeight: 600, fontSize: isMobile ? 12 : 13, color: C.text }}>Delivery Location</Typography>
                        {order.customer_address?.street && <Typography sx={{ fontFamily: FONT, fontSize: isMobile ? 11 : 12, color: C.muted, mt: 0.2 }}>{order.customer_address.street}</Typography>}
                        {order.customer_address?.street2 && <Typography sx={{ fontFamily: FONT, fontSize: isMobile ? 11 : 12, color: C.muted }}>{order.customer_address.street2}</Typography>}
                        <Typography sx={{ fontFamily: FONT, fontWeight: 700, fontSize: isMobile ? 11 : 12, color: P, mt: 0.2 }}>Area: {order.customer_address?.area}</Typography>
                      </Box>
                    </Box>

                    {order.branch_address && (
                      <Box sx={{ display: "flex", gap: 1, alignItems: "flex-start" }}>
                        <StoreIcon sx={{ color: T, fontSize: 18, flexShrink: 0, mt: 0.2 }} />
                        <Box>
                          <Typography sx={{ fontFamily: FONT, fontWeight: 600, fontSize: isMobile ? 12 : 13, color: C.text }}>Pickup Location</Typography>
                          <Typography sx={{ fontFamily: FONT, fontSize: isMobile ? 11 : 12, color: C.muted, mt: 0.2 }}>{order.branch_address}</Typography>
                        </Box>
                      </Box>
                    )}

                    <Divider sx={{ my: 1.5, borderColor: alpha(P, 0.10) }} />

                    {/* Amount totals */}
                    {hasDiscount && (
                      <>
                        <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
                          <Typography sx={{ fontFamily: FONT, fontSize: isMobile ? 12 : 13, color: C.muted }}>Before Discount</Typography>
                          <Typography sx={{ fontFamily: FONT, fontSize: isMobile ? 12 : 13, color: C.mutedDark, fontWeight: 600 }}>
                            {order.amount_before_discount?.toFixed(2)} {order.currency}
                          </Typography>
                        </Box>
                        <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
                          <Typography sx={{ fontFamily: FONT, fontSize: isMobile ? 12 : 13, color: C.gold }}>Discount</Typography>
                          <Typography sx={{ fontFamily: FONT, fontSize: isMobile ? 12 : 13, color: C.gold, fontWeight: 600 }}>
                            −{order.amount_discount?.toFixed(2)} {order.currency}
                          </Typography>
                        </Box>
                        <Divider sx={{ my: 1, borderColor: alpha(P, 0.08) }} />
                      </>
                    )}
                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <Typography sx={{ fontFamily: FONT, fontSize: isMobile ? 13 : 14, color: C.muted, fontWeight: 600 }}>Order Total</Typography>
                      <Chip label={`${order.amount_total} ${order.currency}`}
                        sx={{ backgroundColor: alpha(P, 0.12), color: P, fontFamily: FONT, fontWeight: 800, fontSize: isMobile ? 13 : 14, height: 32, borderRadius: R.pill }} />
                    </Box>
                  </Box>
                </Box>

                {/* Order lines */}
                {order.order_lines && order.order_lines.length > 0 && (
                  <Box sx={cardSx(isMobile)}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
                      <ShoppingCartIcon sx={{ color: P, fontSize: 20 }} />
                      <Typography sx={{ fontFamily: FONT, fontWeight: 800, fontSize: isMobile ? 15 : 16, color: C.text }}>
                        Products ({order.order_lines.length})
                      </Typography>
                    </Box>

                    <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                      {order.order_lines.map((line, idx) => (
                        <Box key={line.id || idx} sx={{ borderRadius: R.soft, border: `1px solid ${alpha(P, 0.12)}`, backgroundColor: alpha(P, 0.02), p: isMobile ? 1.2 : 1.5 }}>
                          <Typography sx={{ fontFamily: FONT, fontWeight: 700, fontSize: isMobile ? 13 : 14, color: C.text, mb: 0.8 }}>{line.product_name}</Typography>
                          <Box sx={{ display: "flex", flexWrap: "wrap", gap: { xs: 1.5, sm: 3 } }}>
                            <LineDetail label="Qty" value={line.quantity} />
                            <LineDetail label="Unit Price" value={`${line.price_unit?.toFixed(2)} ${order.currency}`} />
                            {line.discount > 0 && <LineDetail label="Discount" value={`${line.discount}%`} highlight={C.gold} />}
                            {line.discount > 0 && <LineDetail label="Disc. Amount" value={`−${line.discount_amount?.toFixed(2)} ${order.currency}`} highlight={C.gold} />}
                            <LineDetail label="Subtotal" value={`${line.subtotal?.toFixed(2)} ${order.currency}`} highlight={P} bold />
                          </Box>
                        </Box>
                      ))}
                    </Box>

                    {/* Lines total section */}
                    <Box sx={{ mt: 2, pt: 2, borderTop: `1.5px solid ${alpha(P, 0.12)}` }}>
                      {hasDiscount && (
                        <>
                          <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
                            <Typography sx={{ fontFamily: FONT, fontSize: 13, color: C.muted }}>Subtotal before discounts</Typography>
                            <Typography sx={{ fontFamily: FONT, fontSize: 13, fontWeight: 600, color: C.mutedDark }}>{order.amount_before_discount?.toFixed(2)} {order.currency}</Typography>
                          </Box>
                          <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
                            <Typography sx={{ fontFamily: FONT, fontSize: 13, color: C.gold }}>Total discounts</Typography>
                            <Typography sx={{ fontFamily: FONT, fontSize: 13, fontWeight: 700, color: C.gold }}>−{order.amount_discount?.toFixed(2)} {order.currency}</Typography>
                          </Box>
                          <Divider sx={{ mb: 1, borderColor: alpha(P, 0.10) }} />
                        </>
                      )}
                      <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                        <Typography sx={{ fontFamily: FONT, fontSize: isMobile ? 14 : 15, fontWeight: 700, color: C.text }}>Total</Typography>
                        <Typography sx={{ fontFamily: FONT, fontSize: isMobile ? 15 : 16, fontWeight: 800, color: P }}>{order.amount_total?.toFixed(2)} {order.currency}</Typography>
                      </Box>
                    </Box>
                  </Box>
                )}

                {/* Customer info + contact actions */}
                <Box sx={cardSx(isMobile)}>
                  <Typography sx={{ fontFamily: FONT, fontWeight: 800, fontSize: isMobile ? 15 : 16, color: C.text, mb: 1.5 }}>Customer Information</Typography>
                  <Typography sx={{ fontFamily: FONT, fontWeight: 700, fontSize: isMobile ? 14 : 15, color: C.text, mb: 1 }}>{order.customer_name}</Typography>
                  <Box sx={{ display: "flex", gap: 0.8, flexWrap: "wrap", mb: canCall ? 2 : 0 }}>
                    <Chip icon={<PhoneIcon />} label={order.customer_phone}
                      sx={{ backgroundColor: alpha(P, 0.10), color: P, fontWeight: 600, fontSize: isMobile ? 11 : 12, "& .MuiChip-icon": { color: P }, fontFamily: FONT }} />
                    <Chip icon={<LocationOnIcon />} label={order.customer_address?.area}
                      sx={{ backgroundColor: alpha(P, 0.10), color: P, fontWeight: 600, fontSize: isMobile ? 11 : 12, "& .MuiChip-icon": { color: P }, fontFamily: FONT }} />
                  </Box>

                  {canCall && order.customer_phone && (
                    <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                      <Button startIcon={<ContentCopyIcon />} onClick={() => copyPhone(order.customer_phone)}
                        sx={outlineBtn(P, isMobile)}>Copy Phone</Button>
                      <Button startIcon={<PhoneIcon />} component="a" href={`tel:${order.customer_phone}`}
                        sx={outlineBtn(P, isMobile)}>Call</Button>
                      <Button startIcon={<WhatsAppIcon />} component="a" href={`https://wa.me/${order.customer_phone.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer"
                        sx={outlineBtn("#25D366", isMobile)}>WhatsApp</Button>
                    </Box>
                  )}
                </Box>

                {/* Action buttons: Receive Money + Return Order */}
                {canReceive && (
                  <Box sx={{ display: "flex", gap: isMobile ? 1 : 1.5, flexWrap: isMobile ? "wrap" : "nowrap" }}>
                    <Button startIcon={<PaymentsIcon />} onClick={openReceiveMoney} disabled={loadingPayment}
                      fullWidth={isMobile}
                      sx={{ backgroundColor: P, color: "white", borderRadius: R.cardSm, py: isMobile ? 1 : 1.2, fontWeight: 700, fontSize: isMobile ? 13 : 14, fontFamily: FONT, textTransform: "none", boxShadow: `0 6px 18px ${alpha(P, 0.30)}`, flex: 1, "&:hover": { backgroundColor: C.purpleDark }, "&:disabled": { backgroundColor: alpha(P, 0.45) } }}>
                      {loadingPayment ? "Loading…" : "Receive Money"}
                    </Button>
                    <Button startIcon={<AssignmentReturnIcon />} onClick={openReturnOrder} disabled={loadingPayment}
                      fullWidth={isMobile}
                      sx={{ border: `2px solid ${C.red}`, color: C.red, borderRadius: R.cardSm, py: isMobile ? 1 : 1.2, fontWeight: 700, fontSize: isMobile ? 13 : 14, fontFamily: FONT, textTransform: "none", flex: 1, "&:hover": { backgroundColor: alpha(C.red, 0.06) }, "&:disabled": { borderColor: alpha(C.red, 0.35), color: alpha(C.red, 0.35) } }}>
                      Return Order
                    </Button>
                  </Box>
                )}
              </>
            )}
          </Box>
        </Fade>
      </Container>

      {/* Confirmation dialog */}
      <Dialog open={confirmDialogOpen} onClose={() => !loadingPayment && setConfirmDialogOpen(false)} maxWidth="sm" fullWidth
        PaperProps={{ sx: { borderRadius: R.card, p: 1, overflow: "hidden", position: "relative", "&::before": { content: '""', position: "absolute", top: 0, left: 0, right: 0, height: "4px", background: `linear-gradient(90deg, ${C.red}, #ff867c)` } } }}>
        <DialogTitle sx={{ fontFamily: FONT, fontWeight: 700, color: C.text, pt: 3, fontSize: isMobile ? 16 : 18 }}>Confirm Action</DialogTitle>
        <DialogContent>
          <Typography sx={{ fontFamily: FONT, fontSize: isMobile ? 13 : 14, color: "#555", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{confirmMessage}</Typography>
        </DialogContent>
        <DialogActions sx={{ px: isMobile ? 2 : 3, pb: 2.5, gap: 1 }}>
          <Button onClick={() => setConfirmDialogOpen(false)} disabled={loadingPayment}
            sx={{ color: C.muted, fontFamily: FONT, textTransform: "none", borderRadius: R.pill, fontWeight: 600 }}>Cancel</Button>
          {confirmCallback && (
            <Button onClick={confirmCallback} disabled={loadingPayment}
              sx={{ backgroundColor: C.red, color: "white", borderRadius: R.pill, px: 3, fontFamily: FONT, fontWeight: 700, textTransform: "none", "&:hover": { backgroundColor: "#d32f2f" }, "&:disabled": { backgroundColor: alpha(C.red, 0.45) } }}>
              {loadingPayment ? "Processing…" : "Yes, Return Order"}
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Receive Money dialog */}
      <Dialog open={payDialogOpen} onClose={() => !loadingPayment && setPayDialogOpen(false)} maxWidth="sm" fullWidth disableScrollLock
        PaperProps={{ sx: { borderRadius: R.card, p: 1, overflow: "hidden", position: "relative", "&::before": { content: '""', position: "absolute", top: 0, left: 0, right: 0, height: "4px", background: bannerGradient } } }}>
        <DialogTitle sx={{ fontFamily: FONT, fontWeight: 700, color: C.text, pt: 3, fontSize: isMobile ? 16 : 18 }}>Receive Money</DialogTitle>
        <DialogContent sx={{ pt: 1.5 }}>
          <Typography sx={{ fontFamily: FONT, fontSize: isMobile ? 12 : 13, color: C.muted, mb: 2 }}>
            Total must equal order amount. Use <strong>Returned</strong> for any unrecoverable amount.
          </Typography>

          <Box sx={{ display: "flex", flexDirection: "column", gap: 1.2, mb: 2 }}>
            {allMethods.map((method) => {
              const isReturned = method.id === "returned";
              const accent = isReturned ? C.red : P;
              return (
                <Box key={method.id} sx={{ display: "flex", alignItems: "center", gap: 1.5, p: 1.2, borderRadius: R.soft, backgroundColor: paymentEnabled[method.id] ? alpha(accent, 0.05) : "transparent", border: `1px solid ${paymentEnabled[method.id] ? alpha(accent, 0.25) : "#f0eef5"}`, transition: "all 0.2s ease" }}>
                  <Box component="input" type="checkbox" checked={paymentEnabled[method.id] || false}
                    onChange={() => togglePaymentMethod(method.id)}
                    sx={{ width: 18, height: 18, cursor: "pointer", accentColor: accent, flexShrink: 0 }} />
                  <Typography sx={{ fontFamily: FONT, fontWeight: 600, fontSize: isMobile ? 13 : 14, color: isReturned ? C.red : C.text, minWidth: 90, flex: 1 }}>
                    {method.name}
                  </Typography>
                  {paymentEnabled[method.id] && (
                    <Box component="input" type="number" placeholder="0.00"
                      value={paymentAmounts[method.id] || ""}
                      onChange={(e) => handleAmountChange(method.id, e.target.value)}
                      step="0.5" min="0"
                      style={{ border: "none", borderBottom: `2px solid ${accent}`, padding: "4px 6px", fontSize: 14, width: 90, fontFamily: FONT, outline: "none", fontWeight: 600, color: isReturned ? C.red : P, backgroundColor: "transparent", textAlign: "right" }} />
                  )}
                </Box>
              );
            })}
          </Box>

          {/* Running total indicator */}
          {(() => {
            const orderTotal = assignment?.orders?.[0]?.amount_total || 0;
            const currency = assignment?.orders?.[0]?.currency || "";
            const diff = totalEntered - orderTotal;
            const color = Math.abs(diff) < 0.01 ? T : C.red;
            return (
              <Box sx={{ p: 1.5, borderRadius: R.soft, backgroundColor: alpha(color, 0.06), border: `1px solid ${alpha(color, 0.25)}`, display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
                <Typography sx={{ fontFamily: FONT, fontSize: 13, color: color, fontWeight: 600 }}>
                  {Math.abs(diff) < 0.01 ? "✓ Total matches" : diff > 0 ? `Over by ${diff.toFixed(2)}` : `Remaining: ${Math.abs(diff).toFixed(2)}`}
                </Typography>
                <Typography sx={{ fontFamily: FONT, fontSize: 14, fontWeight: 800, color }}>
                  {totalEntered.toFixed(2)} / {orderTotal.toFixed(2)} {currency}
                </Typography>
              </Box>
            );
          })()}

          <TextField multiline rows={isMobile ? 2 : 3} placeholder="Additional notes (optional)" value={paymentNote}
            onChange={(e) => setPaymentNote(e.target.value)} fullWidth size="small"
            sx={{ "& .MuiOutlinedInput-root": { borderRadius: R.soft, fontSize: 13, fontFamily: FONT, "&:hover fieldset": { borderColor: P }, "&.Mui-focused fieldset": { borderColor: P } } }} />
        </DialogContent>
        <DialogActions sx={{ px: isMobile ? 2 : 3, pb: 2.5, gap: 1 }}>
          <Button onClick={() => setPayDialogOpen(false)} disabled={loadingPayment}
            sx={{ color: C.muted, fontFamily: FONT, textTransform: "none", borderRadius: R.pill, fontWeight: 600 }}>Cancel</Button>
          <Button onClick={confirmReceiveMoney} disabled={loadingPayment || Math.abs(totalEntered - (assignment?.orders?.[0]?.amount_total || 0)) > 0.01}
            sx={{ backgroundColor: P, color: "white", borderRadius: R.pill, px: 3, fontFamily: FONT, fontWeight: 700, textTransform: "none", boxShadow: `0 4px 14px ${alpha(P, 0.28)}`, "&:hover": { backgroundColor: C.purpleDark }, "&:disabled": { backgroundColor: alpha(P, 0.40) } }}>
            {loadingPayment ? "Processing…" : "Confirm"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

function LineDetail({ label, value, highlight, bold }) {
  return (
    <Box>
      <Typography sx={{ fontFamily: FONT, fontSize: 10, color: C.muted, textTransform: "uppercase", letterSpacing: "0.4px", lineHeight: 1 }}>{label}</Typography>
      <Typography sx={{ fontFamily: FONT, fontSize: 13, fontWeight: bold ? 700 : 500, color: highlight || C.text, mt: 0.25 }}>{value}</Typography>
    </Box>
  );
}

function cardSx(isMobile) {
  return {
    backgroundColor: "white",
    borderRadius: isMobile ? R.cardSm : R.card,
    border: `1px solid ${alpha(C.purple, 0.10)}`,
    p: isMobile ? 2 : 2.5,
    mb: 1.5,
    position: "relative",
    overflow: "hidden",
    "&::before": { content: '""', position: "absolute", top: 0, left: 0, right: 0, height: "3px", background: bannerGradient },
  };
}

function outlineBtn(color, isMobile) {
  return {
    border: `2px solid ${color}`,
    color,
    borderRadius: R.soft,
    px: isMobile ? 1.5 : 2.5,
    py: isMobile ? 0.8 : 1,
    fontWeight: 700,
    fontSize: isMobile ? 12 : 13,
    fontFamily: FONT,
    textTransform: "none",
    "&:hover": { backgroundColor: alpha(color, 0.06) },
  };
}