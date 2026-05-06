import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Box, Container, Fade, Typography, Button, alpha, Divider,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  Chip, useMediaQuery, useTheme,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import PhoneIcon from "@mui/icons-material/Phone";
import PaymentsIcon from "@mui/icons-material/Payments";
import PaymentIcon from "@mui/icons-material/Payment"; 
import LocationOnIcon from "@mui/icons-material/LocationOn";
import StoreIcon from "@mui/icons-material/Store";
import WhatsAppIcon from "@mui/icons-material/WhatsApp";
import AssignmentReturnIcon from "@mui/icons-material/AssignmentReturn";
import NotesIcon from "@mui/icons-material/Notes";
import VerifiedIcon from "@mui/icons-material/Verified";
import PersonIcon from "@mui/icons-material/Person";
import axios from "axios";
import { C, FONT, R, bannerGradient, AppLoader } from "../theme/ccTheme";

const P = C.purple;
const T = C.teal;
const f = { fontFamily: FONT };

const RETURNED_METHOD = { id: "returned", name: "Returned", is_online: false };

const DONE_STATES = ["received", "partially_received", "rejected_by_client", "done"];

function stateLabel(s) {
  const map = {
    waiting_for_approve: "Pending Approval",
    delivery: "In Delivery",
    partially_received: "Partially Received",
    received: "Received",
    rejected_by_client: "Returned",
    done: "Done",
  };
  return map[s] || s;
}

function SLabel({ children }) {
  return (
    <Typography sx={{ ...f, fontSize: 10, letterSpacing: "0.8px", textTransform: "uppercase", color: C.muted, mb: 0.8 }}>
      {children}
    </Typography>
  );
}

function Row2({ label, value, color, strong }) {
  return (
    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", py: 0.3 }}>
      <Typography sx={{ ...f, fontSize: 13, color: C.muted }}>{label}</Typography>
      <Typography sx={{ ...f, fontSize: 13, color: color || C.text, fontWeight: strong ? 500 : 400 }}>{value}</Typography>
    </Box>
  );
}

/* Card without top banner — generic use */
function Card({ children, sx = {} }) {
  return (
    <Box sx={{
      backgroundColor: "white",
      borderRadius: R.cardSm,
      border: "1px solid rgba(126,87,194,0.08)",
      boxShadow: "0 2px 8px rgba(126,87,194,0.06)",
      p: 2,
      mb: 1.5,
      ...sx,
    }}>
      {children}
    </Box>
  );
}

/* Card WITH the gradient top banner — used for the hero header card */
function HeroCard({ children, sx = {} }) {
  return (
    <Box sx={{
      backgroundColor: "white",
      borderRadius: R.cardSm,
      border: "1px solid rgba(126,87,194,0.08)",
      boxShadow: "0 2px 8px rgba(126,87,194,0.06)",
      position: "relative",
      overflow: "hidden",
      mb: 1.5,
      "&::before": {
        content: '""',
        position: "absolute",
        top: 0, left: 0, right: 0,
        height: "4px",
        background: bannerGradient,
      },
      ...sx,
    }}>
      {/* push content below the strip */}
      <Box sx={{ pt: 2, px: 2, pb: 2 }}>
        {children}
      </Box>
    </Box>
  );
}

function MiniStat({ label, value, color }) {
  return (
    <Box>
      <Typography sx={{ ...f, fontSize: 10, color: C.muted, textTransform: "uppercase", letterSpacing: "0.5px" }}>{label}</Typography>
      <Typography sx={{ ...f, fontSize: 13, color: color || C.text, mt: 0.2 }}>{value}</Typography>
    </Box>
  );
}

export default function DriverAssignmentDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const [assignment, setAssignment] = useState(null);
  const [loading, setLoading] = useState(false);
  const [payDialogOpen, setPayDialogOpen] = useState(false);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [paymentAmounts, setPaymentAmounts] = useState({});
  const [paymentEnabled, setPaymentEnabled] = useState({});
  const [loadingPayment, setLoadingPayment] = useState(false);
  const [paymentNote, setPaymentNote] = useState("");
  const [returnDialog, setReturnDialog] = useState(false);

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
      const res = await axios.post(
        "/api/driver/task/details",
        { params: { assignment_id: id, driver_id: driverId } },
        { withCredentials: true, headers: { "Content-Type": "application/json" } }
      );
      if (res.data.result?.status === "success") setAssignment(res.data.result.result);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { load(); }, [id, driverId]);

  const order = assignment?.orders?.[0];
  const paidOnline = !!order?.already_paid_online;
  const hasDiscount = (order?.amount_discount || 0) > 0;

  const canAct = assignment?.state === "waiting_for_approve";
  const canCall = assignment?.state === "delivery";
  const canReceive = assignment?.state === "delivery";
  const isDone = DONE_STATES.includes(assignment?.state);
  const orderPaymnets = assignment?.payment_methods || [];

  // ── actions ───────────────────────────────────────────────────────────────

  const handleAccept = async () => {
    try {
      const res = await axios.post("/api/driver/task/accept",
        { params: { assignment_id: id, driver_id: driverId } },
        { withCredentials: true, headers: { "Content-Type": "application/json" } }
      );
      if (res.data.result?.status === "success") navigate("/driver/orders");
      else alert(res.data.result?.message || "Failed to accept");
    } catch { alert("Error accepting assignment"); }
  };

  const handleReject = async () => {
    try {
      const res = await axios.post("/api/driver/task/refuse",
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
      const res = await axios.post("/api/driver/payment/types", { params: {} },
        { withCredentials: true, headers: { "Content-Type": "application/json" } }
      );
      if (res.data.result?.status === "success") {
        const methods = res.data.result.payment_types || [];
        setPaymentMethods(methods);
        const allM = [...methods, RETURNED_METHOD];
        const enabled = allM.reduce((a, m) => ({ ...a, [m.id]: false }), {});
        const amounts = allM.reduce((a, m) => ({ ...a, [m.id]: "" }), {});

        if (paidOnline) {
          const onlineM = methods.find((m) => m.is_online);
          if (onlineM) {
            enabled[onlineM.id] = true;
            amounts[onlineM.id] = String(order?.amount_total || 0);
          }
        }

        setPaymentEnabled(enabled);
        setPaymentAmounts(amounts);
        setPaymentNote("");
        setPayDialogOpen(true);
      } else { alert("Error loading payment methods"); }
    } catch { alert("Error loading payment methods"); }
    setLoadingPayment(false);
  };

  const callReturnOrderAPI = async (description = "Order returned by driver") => {
    setLoadingPayment(true);
    try {
      const res = await axios.post("/api/driver/return_order",
        { params: { assignment_id: id, driver_id: driverId, description } },
        { withCredentials: true, headers: { "Content-Type": "application/json" } }
      );
      if (res.data.result?.status === "success") {
        alert("Order marked as returned.");
        navigate("/driver/orders");
      } else {
        alert(res.data.result?.message || "Failed");
      }
    } catch { alert("Error returning order"); }
    setLoadingPayment(false);
  };

  const confirmReturnOrder = () => {
    setReturnDialog(false);
    callReturnOrderAPI("Order fully returned by driver");
  };

  const toggleMethod = (mid) => {
    setPaymentEnabled((prev) => {
      const next = { ...prev, [mid]: !prev[mid] };
      if (!next[mid]) setPaymentAmounts((a) => ({ ...a, [mid]: "" }));
      return next;
    });
  };

  const totalEntered = useMemo(() =>
    allMethods.reduce((s, m) => s + (paymentEnabled[m.id] ? parseFloat(paymentAmounts[m.id]) || 0 : 0), 0),
    [allMethods, paymentEnabled, paymentAmounts]
  );

  const returnedAmount = useMemo(() =>
    paymentEnabled["returned"] ? parseFloat(paymentAmounts["returned"]) || 0 : 0,
    [paymentEnabled, paymentAmounts]
  );

  const submitPayment = async () => {
    const orderTotal = order?.amount_total || 0;
    const amountDiff = totalEntered - orderTotal;
    if (Math.abs(amountDiff) > 0.01) {
      alert(`Total entered (${totalEntered.toFixed(2)}) must equal the order total (${orderTotal.toFixed(2)}).\n\nUse "Returned" for any unrecovered amount.`);
      return;
    }

    if (Math.abs(returnedAmount - orderTotal) < 0.01) {
      setPayDialogOpen(false);
      await callReturnOrderAPI("Full order returned — entered via receive money dialog");
      return;
    }

    const realPayments = allMethods
      .filter((m) => m.id !== "returned" && paymentEnabled[m.id] && (parseFloat(paymentAmounts[m.id]) || 0) > 0)
      .map((m) => ({ payment_type_id: m.id, amount: parseFloat(paymentAmounts[m.id]) }));

    setLoadingPayment(true);
    setPayDialogOpen(false);
    try {
      const res = await axios.post("/api/driver/receive/money",
        { params: { assignment_id: id, driver_id: driverId, payment_type_ids: realPayments, description: paymentNote } },
        { withCredentials: true, headers: { "Content-Type": "application/json" } }
      );
      if (res.data.result?.status === "success") { alert("Payment recorded!"); navigate("/driver/orders"); }
      else { alert(res.data.result?.message || "Failed"); setPayDialogOpen(true); }
    } catch { alert("Error recording payment"); setPayDialogOpen(true); }
    setLoadingPayment(false);
  };

  // ── loading / not found ───────────────────────────────────────────────────

  if (loading) return <AppLoader />;

  if (!assignment) {
    return (
      <Box sx={{ minHeight: "100vh", backgroundColor: C.purpleBg, pt: 4 }}>
        <Container maxWidth="md" sx={{ px: { xs: 1.5, sm: 2 } }}>
          <Button startIcon={<ArrowBackIcon />} onClick={() => navigate("/driver/orders")} sx={{ ...f, color: P, mb: 3, textTransform: "none" }}>Back</Button>
          <Typography sx={{ ...f, color: C.muted }}>Assignment not found</Typography>
        </Container>
      </Box>
    );
  }

  const amountDiff = totalEntered - (order?.amount_total || 0);
  const amountOk = Math.abs(amountDiff) < 0.01;

  return (
    <Box sx={{ minHeight: "100vh", backgroundColor: C.purpleBg, fontFamily: FONT, pb: 5 }}>
      {/* Container: no side padding on mobile so cards are edge-to-edge */}
      <Container maxWidth="md" sx={{ pt: isMobile ? 0 : 3, px: { xs: 1.5, sm: 2 } }}>
        <Fade in timeout={350}>
          <Box>

            {/* back button — needs its own horizontal padding on mobile */}
            <Box sx={{ pt: { xs: 2, sm: 0 }, mb: 1 }}>
              <Button
                startIcon={<ArrowBackIcon />}
                onClick={() => navigate("/driver/orders")}
                sx={{ ...f, color: P, fontSize: 13, textTransform: "none", "&:hover": { backgroundColor: alpha(P, 0.06) } }}
              >
                Back
              </Button>
            </Box>

            {/* ── header hero card with gradient banner ── */}
            <HeroCard>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 1 }}>
                <Box sx={{ flex: 1 }}>
                  <Typography sx={{ ...f, fontSize: isMobile ? 17 : 19, color: C.text }}>{assignment.name}</Typography>
                  <Typography sx={{ ...f, fontSize: 12, color: C.muted, mt: 0.3 }}>{assignment.assignment_date}</Typography>

                  {/* note — only when non-empty, purple theme, divider style */}
                  {assignment.note?.trim() && (
                    <Box sx={{ mt: 2 }}>
                      <Box sx={{ width: "50%", borderTop: `1px solid ${alpha(C.muted, 0.30)}`, mb: 1.2 }} />
                      <Box sx={{ display: "flex", alignItems: "flex-start", gap: 0.7 }}>
                        <NotesIcon sx={{ color: P, fontSize: 15, mt: "2px", flexShrink: 0 }} />
                        <Box>
                          <Typography sx={{ ...f, fontSize: 11, color: P, letterSpacing: "0.3px", mb: 0.4 }}>
                            Driver Notes
                          </Typography>
                          <Typography sx={{ ...f, fontSize: 13, color: C.text, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
                            {assignment.note}
                          </Typography>
                        </Box>
                      </Box>
                    </Box>
                  )}
                </Box>

                <Box sx={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 0.6, flexShrink: 0 }}>
                  <Chip
                    label={stateLabel(assignment.state)}
                    sx={{ ...f, backgroundColor: alpha(P, 0.09), color: P, fontSize: 11, height: 24, borderRadius: R.pill }}
                  />
                  {paidOnline && (
                    <Chip
                      icon={<VerifiedIcon sx={{ fontSize: 12, color: T }} />}
                      label="Paid Online"
                      sx={{ ...f, backgroundColor: alpha(T, 0.10), color: T, fontSize: 11, height: 24, borderRadius: R.pill, "& .MuiChip-icon": { ml: "6px" } }}
                    />
                  )}
                </Box>
              </Box>

              {canAct && (
                <Box sx={{ display: "flex", gap: 1.2, mt: 2 }}>
                  <Button startIcon={<CheckCircleIcon />} onClick={handleAccept} fullWidth
                    sx={{ ...f, backgroundColor: P, color: "white", borderRadius: R.soft, py: 1.1, fontSize: 14, textTransform: "none", boxShadow: `0 4px 12px ${alpha(P, 0.22)}`, "&:hover": { backgroundColor: C.purpleDark } }}>
                    Accept
                  </Button>
                  <Button startIcon={<CancelIcon />} onClick={handleReject} fullWidth
                    sx={{ ...f, border: `1.5px solid ${C.red}`, color: C.red, borderRadius: R.soft, py: 1.1, fontSize: 14, textTransform: "none", "&:hover": { backgroundColor: alpha(C.red, 0.05) } }}>
                    Reject
                  </Button>
                </Box>
              )}
            </HeroCard>

            {order && (
              <>
                {/* paid online notice */}
                {paidOnline && (
                  <Card sx={{ border: `1.5px solid ${alpha(T, 0.28)}`, backgroundColor: alpha(T, 0.04) }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                      <VerifiedIcon sx={{ color: T, fontSize: 24, flexShrink: 0 }} />
                      <Box>
                        <Typography sx={{ ...f, fontSize: 14, color: T }}>Already Paid Online</Typography>
                        <Typography sx={{ ...f, fontSize: 12, color: C.mutedDark, mt: 0.2, lineHeight: 1.5 }}>
                          Do not ask the customer for cash. Payment was collected digitally.
                        </Typography>
                      </Box>
                    </Box>
                  </Card>
                )}

                {/* order summary — no total (lives in products card) */}
                <Card>
                  <SLabel>Order</SLabel>
                  <Typography sx={{ ...f, fontSize: 15, color: C.text }}>{order.name}</Typography>
                  <Typography sx={{ ...f, fontSize: 13, color: C.muted, mt: 0.3, mb: 1.5 }}>{order.customer_name}</Typography>

                  <Box sx={{ display: "flex", gap: 1, alignItems: "flex-start", mb: order.branch_address ? 1.2 : 0 }}>
                    <LocationOnIcon sx={{ color: P, fontSize: 16, flexShrink: 0, mt: "2px" }} />
                    <Box>
                      <Typography sx={{ ...f, fontSize: 13, color: C.text }}>{order.customer_address?.area}</Typography>
                      {order.customer_address?.street && (
                        <Typography sx={{ ...f, fontSize: 12, color: C.muted, mt: 0.15 }}>{order.customer_address.street}</Typography>
                      )}
                      {order.customer_address?.street2 && (
                        <Typography sx={{ ...f, fontSize: 12, color: C.muted }}>{order.customer_address.street2}</Typography>
                      )}
                    </Box>
                  </Box>

                  {order.branch_address && (
                    <Box sx={{ display: "flex", gap: 1, alignItems: "flex-start" }}>
                      <StoreIcon sx={{ color: T, fontSize: 16, flexShrink: 0, mt: "2px" }} />
                      <Typography sx={{ ...f, fontSize: 13, color: C.mutedDark }}>{order.branch_address}</Typography>
                    </Box>
                  )}
                </Card>

                {/* order lines with totals */}
                {order.order_lines?.length > 0 && (
                  <Card>
                    <SLabel>Products ({order.order_lines.length})</SLabel>
                    <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                      {order.order_lines.map((line, idx) => {
                        if (line.display_type) {
                          return (
                            <Box key={line.id || idx} sx={{ borderRadius: R.soft, backgroundColor: alpha(C.muted, 0.06), border: `1px solid ${alpha(C.muted, 0.14)}`, px: 1.5, py: 1 }}>
                              <Typography sx={{ ...f, fontSize: 12, color: C.mutedDark, fontStyle: "italic" }}>{line.product_name}</Typography>
                            </Box>
                          );
                        }
                        return (
                          <Box key={line.id || idx} sx={{ borderRadius: R.soft, border: "1px solid #f0eef5", p: 1.5 }}>
                            <Typography sx={{ ...f, fontSize: 13, color: C.text, mb: 1 }}>{line.product_name}</Typography>
                            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2 }}>
                              <MiniStat label="Qty" value={line.quantity} />
                              <MiniStat label="Unit price" value={`${Number(line.price_unit).toFixed(2)} ${order.currency}`} />
                              {line.discount > 0 && <MiniStat label="Discount" value={`${line.discount}%`} color={C.gold} />}
                              <MiniStat label="Subtotal" value={`${Number(line.subtotal).toFixed(2)} ${order.currency}`} color={P} />
                            </Box>
                          </Box>
                        );
                      })}
                    </Box>

                    <Divider sx={{ my: 1.5, borderColor: "#f0eef5" }} />
                    {hasDiscount && (
                      <>
                        <Row2 label="Subtotal before discounts" value={`${Number(order.amount_before_discount).toFixed(2)} ${order.currency}`} />
                        <Row2 label="Total discounts" value={`−${Number(order.amount_discount).toFixed(2)} ${order.currency}`} color={C.gold} />
                        <Divider sx={{ my: 1, borderColor: "#f0eef5" }} />
                      </>
                    )}
                    <Row2 label="Total" value={`${Number(order.amount_total).toFixed(2)} ${order.currency}`} color={P} strong />
                  </Card>
                )}

                {/* payment methods used — only when done, and only if there are any to show */}
                {isDone && orderPaymnets.length > 0 && (
                  <Card>
                    <SLabel>Payment Methods</SLabel>
                    <Box sx={{ display: "flex", flexDirection: "column", gap: 0.8, mt: 0.5 }}>
                      {orderPaymnets.map((pm, i) => (
                        <Box key={i} sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <Typography sx={{ ...f, fontSize: 13, color: C.mutedDark }}>{pm.name}</Typography>
                          <Typography sx={{ ...f, fontSize: 13, color: P, fontWeight: 500 }}>{Number(pm.amount).toFixed(2)} {order?.currency}</Typography>
                        </Box>
                      ))}
                    </Box>
                  </Card>
                )}

                {/* customer — textured with purple icon row */}
                <Card sx={{ backgroundImage: `radial-gradient(circle at 100% 0%, ${alpha(P, 0.03)} 0%, transparent 60%)` }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.2 }}>
                    <PersonIcon sx={{ color: P, fontSize: 18 }} />
                    <SLabel>Customer</SLabel>
                  </Box>
                  <Typography sx={{ ...f, fontSize: 14, color: C.text }}>{order.customer_name}</Typography>

                  {order.customer_phone && (
                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.8, mt: 0.6, mb: canCall ? 1.5 : 0 }}>
                      <PhoneIcon sx={{ color: P, fontSize: 15, flexShrink: 0 }} />
                      <Typography sx={{ ...f, fontSize: 13, color: C.mutedDark }}>{order.customer_phone}</Typography>
                      {order.customer_address?.area && (
                        <>
                          <Box sx={{ width: 3, height: 3, borderRadius: "50%", backgroundColor: alpha(C.muted, 0.5) }} />
                          <LocationOnIcon sx={{ color: T, fontSize: 14, flexShrink: 0 }} />
                          <Typography sx={{ ...f, fontSize: 13, color: C.mutedDark }}>{order.customer_address.area}</Typography>
                        </>
                      )}
                    </Box>
                  )}

                  {/* Call + WhatsApp always side by side */}
                  {canCall && order.customer_phone && (
                    <Box sx={{ display: "flex", gap: 1 }}>
                      <Button startIcon={<PhoneIcon />} component="a" href={`tel:${order.customer_phone}`} fullWidth
                        sx={{ ...f, border: `1.5px solid ${P}`, color: P, borderRadius: R.soft, py: 1.1, fontSize: 14, textTransform: "none", "&:hover": { backgroundColor: alpha(P, 0.05) } }}>
                        Call
                      </Button>
                      <Button startIcon={<WhatsAppIcon />} component="a"
                        href={`https://wa.me/${order.customer_phone.replace(/\D/g, "")}`}
                        target="_blank" rel="noopener noreferrer" fullWidth
                        sx={{ ...f, border: "1.5px solid #25D366", color: "#25D366", borderRadius: R.soft, py: 1.1, fontSize: 14, textTransform: "none", "&:hover": { backgroundColor: alpha("#25D366", 0.05) } }}>
                        WhatsApp
                      </Button>
                    </Box>
                  )}
                </Card>

                {/* action buttons — delivery state only */}
                {canReceive && (
                  <Box sx={{ display: "flex", flexDirection: isMobile ? "column" : "row", gap: 1, px: { xs: 0, sm: 0 } }}>
                    <Button startIcon={<PaymentsIcon />} onClick={openReceiveMoney} disabled={loadingPayment} fullWidth
                      sx={{ ...f, backgroundColor: P, color: "white", borderRadius: R.soft, py: 1.4, fontSize: 14, textTransform: "none", boxShadow: `0 4px 12px ${alpha(P, 0.20)}`, "&:hover": { backgroundColor: C.purpleDark }, "&:disabled": { backgroundColor: alpha(P, 0.38) } }}>
                      {loadingPayment ? "Loading…" : "Receive Money"}
                    </Button>
                    <Button startIcon={<AssignmentReturnIcon />} onClick={() => setReturnDialog(true)} disabled={loadingPayment} fullWidth
                      sx={{ ...f, border: `1.5px solid ${C.red}`, color: C.red, borderRadius: R.soft, py: 1.4, fontSize: 14, textTransform: "none", "&:hover": { backgroundColor: alpha(C.red, 0.05) }, "&:disabled": { borderColor: alpha(C.red, 0.28), color: alpha(C.red, 0.28) } }}>
                      Return Order
                    </Button>
                  </Box>
                )}
              </>
            )}
          </Box>
        </Fade>
      </Container>

      {/* return confirmation */}
      <Dialog open={returnDialog} onClose={() => setReturnDialog(false)} maxWidth="xs" fullWidth
        PaperProps={{ sx: { borderRadius: R.cardSm, overflow: "hidden", position: "relative", "&::before": { content: '""', position: "absolute", top: 0, left: 0, right: 0, height: "3px", background: `linear-gradient(90deg, ${C.red}, #ff867c)` } } }}>
        <DialogTitle sx={{ ...f, fontSize: 16, color: C.text, pt: 3 }}>Return this order?</DialogTitle>
        <DialogContent>
          <Typography sx={{ ...f, fontSize: 13, color: C.mutedDark, lineHeight: 1.6 }}>
            This will mark the order as returned by the client. No payment will be recorded.{"\n\n"}
            Order total: <strong>{order?.amount_total} {order?.currency}</strong>
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 2.5, pb: 2.5, gap: 1 }}>
          <Button onClick={() => setReturnDialog(false)} sx={{ ...f, color: C.muted, textTransform: "none", borderRadius: R.pill }}>Cancel</Button>
          <Button onClick={confirmReturnOrder} disabled={loadingPayment}
            sx={{ ...f, backgroundColor: C.red, color: "white", borderRadius: R.pill, px: 2.5, textTransform: "none", fontSize: 13, "&:hover": { backgroundColor: "#d32f2f" }, "&:disabled": { backgroundColor: alpha(C.red, 0.38) } }}>
            {loadingPayment ? "Processing…" : "Yes, return it"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* receive money */}
      <Dialog open={payDialogOpen} onClose={() => !loadingPayment && setPayDialogOpen(false)} maxWidth="xs" fullWidth disableScrollLock
        PaperProps={{ sx: { borderRadius: R.cardSm, overflow: "hidden", position: "relative", "&::before": { content: '""', position: "absolute", top: 0, left: 0, right: 0, height: "3px", background: bannerGradient } } }}>
        <DialogTitle sx={{ ...f, fontSize: 16, color: C.text, pt: 3 }}>Receive Money</DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          <Typography sx={{ ...f, fontSize: 12, color: C.muted, mb: 2, lineHeight: 1.5 }}>
            Entered total must match the order amount. Use <strong>Returned</strong> for any unrecovered amount.
          </Typography>

          <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
            {allMethods.map((method) => {
              const isRet = method.id === "returned";
              const accent = isRet ? C.red : P;
              const active = paymentEnabled[method.id];
              return (
                <Box
                  key={method.id}
                  sx={{ borderRadius: R.soft, border: `1px solid ${active ? alpha(accent, 0.28) : "#ebebeb"}`, backgroundColor: active ? alpha(accent, 0.03) : "white", transition: "border-color 0.15s ease" }}
                >
                  <Box
                    sx={{ display: "flex", alignItems: "center", gap: 1.5, px: 1.5, py: 1, cursor: "pointer" }}
                    onClick={() => toggleMethod(method.id)}
                  >
                    <Box
                      component="input" type="checkbox" checked={active || false}
                      onChange={() => { }}
                      onClick={(e) => { e.stopPropagation(); toggleMethod(method.id); }}
                      style={{ width: 16, height: 16, cursor: "pointer", accentColor: accent, flexShrink: 0 }}
                    />
                    <Typography sx={{ ...f, fontSize: 13, color: isRet ? C.red : C.text, flex: 1 }}>{method.name}</Typography>
                  </Box>
                  {active && (
                    <Box sx={{ px: 1.5, pb: 1 }}>
                      <TextField
                        type="number"
                        placeholder="0"
                        value={paymentAmounts[method.id]}
                        onChange={(e) => setPaymentAmounts((prev) => ({ ...prev, [method.id]: e.target.value }))}
                        fullWidth size="small"
                        inputProps={{ inputMode: "decimal", min: 0, step: "any" }}
                        sx={{
                          "& .MuiOutlinedInput-root": {
                            borderRadius: R.soft, fontSize: 14, fontFamily: FONT, color: accent,
                            "& fieldset": { borderColor: alpha(accent, 0.30) },
                            "&:hover fieldset": { borderColor: alpha(accent, 0.50) },
                            "&.Mui-focused fieldset": { borderColor: accent },
                          },
                          "& input[type=number]": { MozAppearance: "textfield" },
                          "& input[type=number]::-webkit-outer-spin-button": { WebkitAppearance: "none", margin: 0 },
                          "& input[type=number]::-webkit-inner-spin-button": { WebkitAppearance: "none", margin: 0 },
                        }}
                      />
                    </Box>
                  )}
                </Box>
              );
            })}
          </Box>

          {/* running total */}
          {(() => {
            const total = order?.amount_total || 0;
            const cur = order?.currency || "";
            const col = amountOk ? T : C.red;
            return (
              <Box sx={{ mt: 1.5, px: 1.5, py: 0.9, borderRadius: R.soft, border: `1px solid ${alpha(col, 0.22)}`, backgroundColor: alpha(col, 0.04), display: "flex", justifyContent: "space-between" }}>
                <Typography sx={{ ...f, fontSize: 12, color: col }}>
                  {amountOk ? "✓ Matches" : amountDiff > 0 ? `Over by ${amountDiff.toFixed(2)}` : `Remaining ${Math.abs(amountDiff).toFixed(2)}`}
                </Typography>
                <Typography sx={{ ...f, fontSize: 12, color: col }}>
                  {totalEntered.toFixed(2)} / {total.toFixed(2)} {cur}
                </Typography>
              </Box>
            );
          })()}

          <TextField
            multiline rows={2} placeholder="Notes (optional)" value={paymentNote}
            onChange={(e) => setPaymentNote(e.target.value)} fullWidth size="small"
            sx={{ mt: 1.5, "& .MuiOutlinedInput-root": { borderRadius: R.soft, fontSize: 13, fontFamily: FONT, "&.Mui-focused fieldset": { borderColor: P } } }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 2.5, pb: 2.5, gap: 1 }}>
          <Button onClick={() => setPayDialogOpen(false)} disabled={loadingPayment}
            sx={{ ...f, color: C.muted, textTransform: "none", borderRadius: R.pill }}>Cancel</Button>
          <Button onClick={submitPayment} disabled={loadingPayment || !amountOk}
            sx={{ ...f, backgroundColor: P, color: "white", borderRadius: R.pill, px: 2.5, textTransform: "none", fontSize: 13, "&:hover": { backgroundColor: C.purpleDark }, "&:disabled": { backgroundColor: alpha(P, 0.32) } }}>
            {loadingPayment ? "Processing…" : "Confirm"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}