import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Box,
  Container,
  Fade,
  Typography,
  Button,
  alpha,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Chip,
  CircularProgress,
  useMediaQuery,
  useTheme,
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
import axios from "axios";
import { styles, THEME_PURPLE } from "../theme/theme";

function stateLabel(s) {
  if (s === "waiting_for_approve") return "Pending Approval";
  if (s === "delivery") return "In Delivery";
  if (s === "partially_received") return "Partially Received";
  if (s === "received") return "Money Received";
  if (s === "done") return "Done";
  return s;
}

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

  const load = async () => {
    setLoading(true);
    try {
      const response = await axios.post(
        `/api/driver/task/details`,
        {
          params: {
            assignment_id: id,
            driver_id: driverId,
          },
        },
        {
          withCredentials: true,
          headers: { "Content-Type": "application/json" },
        }
      );

      if (response.data.result?.status === "success") {
        setAssignment(response.data.result?.result);
      } else {
        console.error("API Error:", response.data.result?.message);
      }
    } catch (error) {
      console.error("Error loading assignment:", error);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, driverId]);

  const canAct = useMemo(
    () => assignment && assignment.state === "waiting_for_approve",
    [assignment]
  );
  const isAccepted = useMemo(
    () => assignment && assignment.state !== "waiting_for_approve",
    [assignment]
  );
  const canCall = useMemo(
    () => assignment && assignment.state === "delivery",
    [assignment]
  );
  const canReceive = useMemo(
    () =>
      assignment &&
      (assignment.state === "delivery" ||
        assignment.state === "partially_received"),
    [assignment]
  );

  const handleAccept = async () => {
    try {
      const response = await axios.post(
        `/api/driver/task/accept`,
        {
          params: {
            assignment_id: id,
            driver_id: driverId,
          },
        },
        {
          withCredentials: true,
          headers: { "Content-Type": "application/json" },
        }
      );
      if (response.data.result?.status === "success") {
        navigate("/driver/orders");
      } else {
        alert(response.data.result?.message || "Failed to accept");
      }
    } catch (error) {
      alert("Error accepting assignment");
      console.error(error);
    }
  };

  const handleReject = async () => {
    try {
      const response = await axios.post(
        `/api/driver/task/refuse`,
        {
          params: {
            assignment_id: id,
            driver_id: driverId,
            reason: "",
          },
        },
        {
          withCredentials: true,
          headers: { "Content-Type": "application/json" },
        }
      );

      if (response.data.result?.status === "success") {
        navigate("/driver/orders");
      } else {
        alert(response.data.result?.message || "Failed to reject");
      }
    } catch (error) {
      alert("Error rejecting assignment");
      console.error(error);
    }
  };

  const openReceiveMoney = async () => {
    setLoadingPayment(true);
    try {
      const response = await axios.post(
        `/api/driver/payment/types`,
        { params: {} },
        {
          withCredentials: true,
          headers: { "Content-Type": "application/json" },
        }
      );

      if (response.data.result?.status === "success") {
        const methods = response.data.result?.payment_types || [];
        setPaymentMethods(methods);

        const enabledState = methods.reduce(
          (acc, m) => ({ ...acc, [m.id]: false }),
          {}
        );
        const amountsState = methods.reduce(
          (acc, m) => ({ ...acc, [m.id]: 0 }),
          {}
        );

        setPaymentEnabled(enabledState);
        setPaymentAmounts(amountsState);
        setPaymentNote("");
        setPayDialogOpen(true);
      } else {
        alert("Error loading payment methods");
      }
    } catch (error) {
      alert("Error loading payment methods");
      console.error(error);
    }
    setLoadingPayment(false);
  };

  const togglePaymentMethod = (methodId) => {
    setPaymentEnabled((prev) => ({
      ...prev,
      [methodId]: !prev[methodId],
    }));
  };

  const handleAmountChange = (methodId, value) => {
    setPaymentAmounts((prev) => ({
      ...prev,
      [methodId]: parseFloat(value) || 0,
    }));
  };

  const confirmReceiveMoney = async () => {
    const paymentTypeIds = paymentMethods
      .filter((m) => paymentEnabled[m.id] && paymentAmounts[m.id] > 0)
      .map((m) => ({
        payment_type_id: m.id,
        amount: paymentAmounts[m.id],
      }));

    // Calculate total payment
    const totalPaid = paymentTypeIds.reduce(
      (sum, p) => sum + p.amount,
      0
    );
    const totalOrder = assignment.orders?.[0]?.amount_total || 0;

    // Scenario 1: Amount exceeds order total - ALERT (cannot proceed)
    if (totalPaid > totalOrder) {
      alert(
        `The amount (${totalPaid.toFixed(2)}) exceeds the order total (${totalOrder.toFixed(
          2
        )}). Please reduce the amount.`
      );
      return;
    }

    // Scenario 2: No payment selected
    if (totalPaid === 0) {
      setConfirmMessage(
        "No payment amount entered. This order will be marked as rejected by customer. Are you sure?"
      );
      setConfirmCallback(() => submitPayment(paymentTypeIds, totalPaid));
      setConfirmDialogOpen(true);
      return;
    }

    // Scenario 3: Partially paid
    if (totalPaid < totalOrder) {
      setConfirmMessage(
        `Order total: ${totalOrder.toFixed(2)}\nAmount entered: ${totalPaid.toFixed(
          2
        )}\n\nThis order will be marked as partially paid. Are you sure?`
      );
      setConfirmCallback(() => submitPayment(paymentTypeIds, totalPaid));
      setConfirmDialogOpen(true);
      return;
    }

    // Scenario 4: Full payment
    submitPayment(paymentTypeIds, totalPaid);
  };

  const submitPayment = async (paymentTypeIds, totalPaid) => {
    setLoadingPayment(true);
    setConfirmDialogOpen(false);

    try {
      const response = await axios.post(
        `/api/driver/receive/money`,
        {
          params: {
            assignment_id: id,
            driver_id: driverId,
            payment_type_ids:
              paymentTypeIds.length > 0 ? paymentTypeIds : undefined,
            description: paymentNote,
          },
        },
        {
          withCredentials: true,
          headers: { "Content-Type": "application/json" },
        }
      );

      if (response.data.result?.status === "success") {
        setPayDialogOpen(false);
        setPaymentAmounts({});
        setPaymentEnabled({});
        setPaymentNote("");
        alert("Payment recorded successfully!");
        navigate("/driver/orders");
      } else {
        alert(response.data.result?.message || "Failed to record payment");
      }
    } catch (error) {
      alert("Error recording payment");
      console.error(error);
    }
    setLoadingPayment(false);
  };

  const copyPhoneToClipboard = async (phone) => {
    try {
      await navigator.clipboard.writeText(phone);
      alert("Phone copied to clipboard!");
    } catch (error) {
      console.error("Failed to copy:", error);
    }
  };

  const getWhatsAppUrl = (phone) => {
    const cleanPhone = phone.replace(/\D/g, "");
    return `https://wa.me/${cleanPhone}`;
  };

  if (loading) {
    return (
      <Box
        sx={{
          ...styles.pageBg,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "100vh",
        }}
      >
        <CircularProgress sx={{ color: THEME_PURPLE }} />
      </Box>
    );
  }

  if (!assignment) {
    return (
      <Box sx={{ ...styles.pageBg, minHeight: "100vh" }}>
        <Container maxWidth="md">
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate("/driver/orders")}
            sx={{
              color: THEME_PURPLE,
              fontWeight: 700,
              mt: isMobile ? 1.5 : 2,
              fontSize: isMobile ? 13 : 14,
              "&:hover": { backgroundColor: alpha(THEME_PURPLE, 0.08) },
            }}
          >
            Back
          </Button>
          <Typography
            sx={{
              color: alpha("#000", 0.6),
              mt: isMobile ? 4 : 6,
              fontSize: isMobile ? 14 : 16,
            }}
          >
            Assignment not found
          </Typography>
        </Container>
      </Box>
    );
  }

  const order = assignment.orders?.[0];

  return (
    <Box sx={{ ...styles.pageBg, minHeight: "100vh" }}>
      <Container maxWidth="md">
        <Fade in timeout={500}>
          <Box sx={{ pb: isMobile ? 3 : 4 }}>
            {/* Back Button */}
            <Button
              startIcon={<ArrowBackIcon />}
              onClick={() => navigate("/driver/orders")}
              sx={{
                color: THEME_PURPLE,
                fontWeight: 700,
                mt: isMobile ? 1.5 : 2,
                mb: isMobile ? 1.5 : 2,
                fontSize: isMobile ? 13 : 14,
                "&:hover": { backgroundColor: alpha(THEME_PURPLE, 0.08) },
              }}
            >
              Back
            </Button>

            <Box
              sx={{
                borderRadius: isMobile ? "12px" : "16px",
                backgroundColor: "white",
                border: `1px solid ${alpha(THEME_PURPLE, 0.12)}`,
                p: isMobile ? 2 : 3,
              }}
            >
              {/* Top Actions - Pending Only */}
              {canAct && (
                <Box
                  sx={{
                    display: "flex",
                    gap: isMobile ? 1.2 : 1.5,
                    flexWrap: "nowrap",
                    mb: isMobile ? 2 : 2.5,
                    justifyContent: "space-between",
                  }}
                >
                  <Button
                    startIcon={<CheckCircleIcon />}
                    onClick={handleAccept}
                    fullWidth
                    sx={{
                      backgroundColor: THEME_PURPLE,
                      color: "white",
                      px: isMobile ? 1.5 : 3.5,
                      py: isMobile ? 1 : 1.2,
                      fontWeight: 700,
                      fontSize: isMobile ? 13 : 14,
                      borderRadius: "10px",
                      boxShadow: `0 8px 22px ${alpha(THEME_PURPLE, 0.35)}`,
                      "&:hover": {
                        backgroundColor: "#7c3bd7",
                        boxShadow: `0 10px 26px ${alpha(THEME_PURPLE, 0.45)}`,
                      },
                    }}
                  >
                    Accept
                  </Button>

                  <Button
                    startIcon={<CancelIcon />}
                    onClick={handleReject}
                    fullWidth
                    sx={{
                      border: "2px solid #ef5350",
                      color: "#ef5350",
                      px: isMobile ? 1.5 : 3.5,
                      py: isMobile ? 1 : 1.2,
                      fontWeight: 700,
                      fontSize: isMobile ? 13 : 14,
                      borderRadius: "10px",
                      "&:hover": { backgroundColor: alpha("#ef5350", 0.08) },
                    }}
                  >
                    Reject
                  </Button>
                </Box>
              )}

              {/* Header Section */}
              <Box sx={{ mb: isMobile ? 2 : 2.5 }}>
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    gap: 1,
                  }}
                >
                  <Box>
                    <Typography
                      sx={{
                        fontWeight: 900,
                        fontSize: isMobile ? 18 : 22,
                        color: "#2d2d2d",
                      }}
                    >
                      {assignment.name}
                    </Typography>
                    <Typography
                      sx={{
                        color: alpha("#000", 0.55),
                        fontSize: isMobile ? 11 : 12,
                        mt: 0.5,
                      }}
                    >
                      Date: {assignment.assignment_date}
                    </Typography>
                  </Box>

                  <Chip
                    label={stateLabel(assignment.state)}
                    sx={{
                      backgroundColor: alpha(THEME_PURPLE, 0.12),
                      color: THEME_PURPLE,
                      fontWeight: 900,
                      fontSize: isMobile ? 11 : 12,
                      height: isMobile ? 28 : 32,
                    }}
                  />
                </Box>
              </Box>

              <Divider sx={{ my: isMobile ? 2 : 2.5, borderColor: alpha(THEME_PURPLE, 0.12) }} />

              {/* Order Details Section - Only for accepted */}
              { order && (
                <>
                  {/* Order Card */}
                  <Box sx={{ mb: isMobile ? 2 : 2.5 }}>
                    <Typography
                      sx={{
                        fontWeight: 900,
                        color: "#2d2d2d",
                        fontSize: isMobile ? 15 : 16,
                        mb: 1.2,
                      }}
                    >
                      Order Details
                    </Typography>

                    <Box
                      sx={{
                        borderRadius: "12px",
                        border: `1px solid ${alpha(THEME_PURPLE, 0.18)}`,
                        backgroundColor: alpha(THEME_PURPLE, 0.03),
                        px: isMobile ? 1.5 : 2,
                        py: isMobile ? 1.5 : 2,
                      }}
                    >
                      <Box sx={{ mb: 1.2 }}>
                        <Typography
                          sx={{
                            fontWeight: 800,
                            color: "#2d2d2d",
                            fontSize: isMobile ? 14 : 15,
                          }}
                        >
                          {order.name}
                        </Typography>
                        <Typography
                          sx={{
                            color: alpha("#000", 0.6),
                            fontSize: isMobile ? 12 : 13,
                            mt: 0.3,
                          }}
                        >
                          Customer: {order.customer_name}
                        </Typography>
                      </Box>

                      {/* Delivery Location */}
                      <Box sx={{ mb: 1.2, p: 1, backgroundColor: "white", borderRadius: "8px" }}>
                        <Box sx={{ display: "flex", gap: 1, alignItems: "flex-start" }}>
                          <LocationOnIcon
                            sx={{
                              color: THEME_PURPLE,
                              fontSize: isMobile ? 18 : 20,
                              flexShrink: 0,
                              mt: 0.3,
                            }}
                          />
                          <Box>
                            <Typography
                              sx={{
                                fontWeight: 700,
                                color: "#2d2d2d",
                                fontSize: isMobile ? 12 : 13,
                              }}
                            >
                              Delivery Location
                            </Typography>
                            <Typography
                              sx={{
                                color: alpha("#000", 0.6),
                                fontSize: isMobile ? 11 : 12,
                                mt: 0.25,
                              }}
                            >
                              {order.customer_address?.street}
                            </Typography>
                            {order.customer_address?.street2 && (
                              <Typography
                                sx={{
                                  color: alpha("#000", 0.6),
                                  fontSize: isMobile ? 11 : 12,
                                }}
                              >
                                {order.customer_address?.street2}
                              </Typography>
                            )}
                            <Typography
                              sx={{
                                color: THEME_PURPLE,
                                fontWeight: 700,
                                fontSize: isMobile ? 11 : 12,
                                mt: 0.25,
                              }}
                            >
                              Area: {order.customer_address?.area}
                            </Typography>
                          </Box>
                        </Box>
                      </Box>

                      {/* Pickup Location */}
                      {order.branch_address && (
                        <Box sx={{ p: 1, backgroundColor: "white", borderRadius: "8px" }}>
                          <Box sx={{ display: "flex", gap: 1, alignItems: "flex-start" }}>
                            <StoreIcon
                              sx={{
                                color: THEME_PURPLE,
                                fontSize: isMobile ? 18 : 20,
                                flexShrink: 0,
                                mt: 0.3,
                              }}
                            />
                            <Box>
                              <Typography
                                sx={{
                                  fontWeight: 700,
                                  color: "#2d2d2d",
                                  fontSize: isMobile ? 12 : 13,
                                }}
                              >
                                Pickup Location
                              </Typography>
                              <Typography
                                sx={{
                                  color: alpha("#000", 0.6),
                                  fontSize: isMobile ? 11 : 12,
                                  mt: 0.25,
                                }}
                              >
                                {order.branch_address}
                              </Typography>
                            </Box>
                          </Box>
                        </Box>
                      )}

                      {/* Amount */}
                      <Box sx={{ mt: 1.5, pt: 1.5, borderTop: `1px solid ${alpha(THEME_PURPLE, 0.15)}` }}>
                        <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                          <Typography sx={{ color: alpha("#000", 0.6), fontSize: isMobile ? 13 : 14 }}>
                            Order Amount:
                          </Typography>
                          <Chip
                            label={`${order.amount_total} ${order.currency}`}
                            sx={{
                              backgroundColor: alpha(THEME_PURPLE, 0.12),
                              color: THEME_PURPLE,
                              fontWeight: 600,
                              fontSize: isMobile ? 12 : 13,
                            }}
                          />
                        </Box>
                      </Box>
                    </Box>
                  </Box>

                  {/* Products Section */}
                  {order.items && order.items.length > 0 && (
                    <Box sx={{ mb: isMobile ? 2 : 2.5 }}>
                      <Typography
                        sx={{
                          fontWeight: 900,
                          color: "#2d2d2d",
                          fontSize: isMobile ? 15 : 16,
                          mb: 1.2,
                        }}
                      >
                        Products ({order.items.length})
                      </Typography>

                      <Box sx={{ display: "grid", gap: 0.8 }}>
                        {order.items.map((item, index) => (
                          <Box
                            key={index}
                            sx={{
                              borderRadius: "10px",
                              backgroundColor: alpha(THEME_PURPLE, 0.04),
                              border: `1px solid ${alpha(THEME_PURPLE, 0.12)}`,
                              p: isMobile ? 1.2 : 1.5,
                            }}
                          >
                            <Box
                              sx={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "flex-start",
                                gap: 1,
                              }}
                            >
                              <Box sx={{ flex: 1 }}>
                                <Typography
                                  sx={{
                                    fontWeight: 700,
                                    color: "#2d2d2d",
                                    fontSize: isMobile ? 13 : 14,
                                  }}
                                >
                                  {item.name || item.title || `Product ${index + 1}`}
                                </Typography>
                                {item.description && (
                                  <Typography
                                    sx={{
                                      color: alpha("#000", 0.55),
                                      fontSize: isMobile ? 11 : 12,
                                      mt: 0.25,
                                    }}
                                  >
                                    {item.description}
                                  </Typography>
                                )}
                                {item.quantity && (
                                  <Typography
                                    sx={{
                                      color: THEME_PURPLE,
                                      fontSize: isMobile ? 11 : 12,
                                      fontWeight: 600,
                                      mt: 0.25,
                                    }}
                                  >
                                    Qty: {item.quantity}
                                  </Typography>
                                )}
                              </Box>
                              {item.price && (
                                <Chip
                                  label={`${item.price}`}
                                  size="small"
                                  sx={{
                                    backgroundColor: alpha(THEME_PURPLE, 0.12),
                                    color: THEME_PURPLE,
                                    fontWeight: 700,
                                    fontSize: isMobile ? 11 : 12,
                                    height: isMobile ? 24 : 28,
                                    flexShrink: 0,
                                  }}
                                />
                              )}
                            </Box>
                          </Box>
                        ))}
                      </Box>
                    </Box>
                  )}

                  <Divider sx={{ my: isMobile ? 2 : 2.5, borderColor: alpha(THEME_PURPLE, 0.12) }} />

                  {/* Customer Section */}
                  <Box sx={{ mb: isMobile ? 2 : 2.5 }}>
                    <Typography
                      sx={{
                        fontWeight: 900,
                        color: "#2d2d2d",
                        fontSize: isMobile ? 15 : 16,
                        mb: 1.2,
                      }}
                    >
                      Customer Information
                    </Typography>
                    <Typography
                      sx={{
                        color: "#2d2d2d",
                        fontWeight: 750,
                        fontSize: isMobile ? 14 : 15,
                        mb: 1,
                      }}
                    >
                      {order.customer_name}
                    </Typography>

                    <Box sx={{ display: "flex", gap: 0.8, flexWrap: "wrap" }}>
                      <Chip
                        icon={<PhoneIcon />}
                        label={order.customer_phone}
                        sx={{
                          backgroundColor: alpha(THEME_PURPLE, 0.1),
                          color: THEME_PURPLE,
                          fontWeight: 600,
                          fontSize: isMobile ? 11 : 12,
                          "& .MuiChip-icon": { color: THEME_PURPLE },
                        }}
                      />
                      <Chip
                        icon={<LocationOnIcon />}
                        label={order.customer_address?.area}
                        sx={{
                          backgroundColor: alpha(THEME_PURPLE, 0.1),
                          color: THEME_PURPLE,
                          fontWeight: 600,
                          fontSize: isMobile ? 11 : 12,
                          "& .MuiChip-icon": { color: THEME_PURPLE },
                        }}
                      />
                    </Box>
                  </Box>

                  <Divider sx={{ my: isMobile ? 2 : 2.5, borderColor: alpha(THEME_PURPLE, 0.12) }} />

                  {/* Actions Section */}
                  <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mb: isMobile ? 2 : 2.5 }}>
                    {canCall && order.customer_phone && (
                      <>
                        <Button
                          startIcon={<ContentCopyIcon />}
                          onClick={() => copyPhoneToClipboard(order.customer_phone)}
                          fullWidth={isMobile}
                          sx={{
                            border: `2px solid ${THEME_PURPLE}`,
                            color: THEME_PURPLE,
                            px: isMobile ? 1.5 : 3,
                            py: isMobile ? 0.8 : 1,
                            fontWeight: 700,
                            fontSize: isMobile ? 12 : 13,
                            borderRadius: "10px",
                            "&:hover": {
                              backgroundColor: alpha(THEME_PURPLE, 0.08),
                            },
                          }}
                        >
                          Copy Phone
                        </Button>

                        <Button
                          startIcon={<PhoneIcon />}
                          component="a"
                          href={`tel:${order.customer_phone}`}
                          fullWidth={isMobile}
                          sx={{
                            border: `2px solid ${THEME_PURPLE}`,
                            color: THEME_PURPLE,
                            px: isMobile ? 1.5 : 3,
                            py: isMobile ? 0.8 : 1,
                            fontWeight: 700,
                            fontSize: isMobile ? 12 : 13,
                            borderRadius: "10px",
                            "&:hover": {
                              backgroundColor: alpha(THEME_PURPLE, 0.08),
                            },
                          }}
                        >
                          Call
                        </Button>

                        <Button
                          startIcon={<WhatsAppIcon />}
                          component="a"
                          href={getWhatsAppUrl(order.customer_phone)}
                          target="_blank"
                          rel="noopener noreferrer"
                          fullWidth={isMobile}
                          sx={{
                            border: "2px solid #25D366",
                            color: "#25D366",
                            px: isMobile ? 1.5 : 3,
                            py: isMobile ? 0.8 : 1,
                            fontWeight: 700,
                            fontSize: isMobile ? 12 : 13,
                            borderRadius: "10px",
                            "&:hover": {
                              backgroundColor: alpha("#25D366", 0.08),
                            },
                          }}
                        >
                          WhatsApp
                        </Button>
                      </>
                    )}

                    {canReceive && (
                      <Button
                        startIcon={<PaymentsIcon />}
                        onClick={openReceiveMoney}
                        disabled={loadingPayment}
                        fullWidth={isMobile}
                        sx={{
                          backgroundColor: THEME_PURPLE,
                          color: "white",
                          px: isMobile ? 1.5 : 3.5,
                          py: isMobile ? 0.8 : 1,
                          fontWeight: 700,
                          fontSize: isMobile ? 12 : 13,
                          borderRadius: "10px",
                          boxShadow: `0 8px 22px ${alpha(THEME_PURPLE, 0.35)}`,
                          "&:hover": { backgroundColor: "#793bd7" },
                          "&:disabled": {
                            backgroundColor: alpha(THEME_PURPLE, 0.5),
                          },
                        }}
                      >
                        {loadingPayment ? "Loading..." : "Receive Money"}
                      </Button>
                    )}
                  </Box>
                </>
              )}
            </Box>
          </Box>
        </Fade>
      </Container>

      {/* Confirmation Dialog */}
      <Dialog
        open={confirmDialogOpen}
        onClose={() => !loadingPayment && setConfirmDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          s: {
            borderRadius: "16px",
            p: isMobile ? 1.5 : 2,
            boxShadow: `0 18px 50px ${alpha(THEME_PURPLE, 0.22)}`,
            border: `1px solid ${alpha(THEME_PURPLE, 0.14)}`,
          },
        }}
      >
        <DialogTitle
          sx={{
            fontWeight: 900,
            color: "#2d2d2d",
            fontSize: isMobile ? 16 : 18,
            pt: 2,
          }}
        >
          Confirm Action
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Typography
            sx={{
              color: "#555",
              fontSize: isMobile ? 13 : 14,
              lineHeight: 1.6,
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
            }}
          >
            {confirmMessage}
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: isMobile ? 2 : 3, pb: 2, gap: 1 }}>
          <Button
            onClick={() => setConfirmDialogOpen(false)}
            disabled={loadingPayment}
            sx={{
              color: "#666",
              borderRadius: "8px",
              fontWeight: 700,
              fontSize: isMobile ? 12 : 13,
              "&:disabled": { color: alpha("#000", 0.3) },
            }}
          >
            Cancel
          </Button>
          {confirmCallback && (
            <Button
              onClick={confirmCallback}
              disabled={loadingPayment}
              sx={{
                backgroundColor: THEME_PURPLE,
                color: "white",
                borderRadius: "8px",
                fontWeight: 700,
                fontSize: isMobile ? 12 : 13,
                "&:hover": { backgroundColor: "#7c3bd7" },
                "&:disabled": { backgroundColor: alpha(THEME_PURPLE, 0.5) },
              }}
            >
              {loadingPayment ? "Processing..." : "Confirm"}
            </Button>
          )}
          {!confirmCallback && (
            <Button
              onClick={() => setConfirmDialogOpen(false)}
              sx={{
                backgroundColor: "#ef5350",
                color: "white",
                borderRadius: "8px",
                fontWeight: 700,
                fontSize: isMobile ? 12 : 13,
                "&:hover": { backgroundColor: "#d32f2f" },
              }}
            >
              OK
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Receive Money Dialog */}
      <Dialog
        open={payDialogOpen}
        onClose={() => !loadingPayment && setPayDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        disableScrollLock
        PaperProps={{
          sx :{
            borderRadius: "20px",
            p: isMobile ? 1.5 : 2,
            boxShadow: `0 18px 50px ${alpha(THEME_PURPLE, 0.22)}`,
            border: `1px solid ${alpha(THEME_PURPLE, 0.14)}`,
            overflow: "hidden",
            position: "relative",
            "&::before": {
              content: '""',
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              height: "4px",
              background: `linear-gradient(90deg, ${THEME_PURPLE}, #49127d)`,
            },
          },
        }}
      >
        <DialogTitle
          sx={{
            fontWeight: 900,
            color: "#2d2d2d",
            fontSize: isMobile ? 16 : 18,
            pt: 3,
          }}
        >
          Receive Money
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Typography
            sx={{
              color: alpha("#000", 0.55),
              mb: 2,
              fontWeight: 600,
              fontSize: isMobile ? 13 : 14,
            }}
          >
            Select payment methods and enter amounts:
          </Typography>

          <Box sx={{ display: "grid", gap: isMobile ? 1.3 : 1.8 }}>
            {/* Payment Methods */}
            {paymentMethods.map((method) => (
              <Box
                key={method.id}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1.5,
                  p: 1,
                  borderRadius: "8px",
                  backgroundColor: alpha(THEME_PURPLE, 0.03),
                }}
              >
                <input
                  type="checkbox"
                  checked={paymentEnabled[method.id] || false}
                  onChange={() => togglePaymentMethod(method.id)}
                  style={{
                    width: "18px",
                    height: "18px",
                    cursor: "pointer",
                    accentColor: THEME_PURPLE,
                    flexShrink: 0,
                  }}
                />
                <Typography
                  sx={{
                    fontWeight: 600,
                    color: "#2d2d2d",
                    minWidth: "100px",
                    fontSize: isMobile ? 13 : 14,
                  }}
                >
                  {method.name}
                </Typography>
                {paymentEnabled[method.id] && (
                  <input
                    type="number"
                    placeholder="0.00"
                    value={paymentAmounts[method.id] || 0}
                    onChange={(e) =>
                      handleAmountChange(method.id, e.target.value)
                    }
                    step="0.5"
                    min="0"
                    style={{
                      border: "none",
                      borderBottom: `2px solid ${THEME_PURPLE}`,
                      padding: "6px 8px",
                      fontSize: "13px",
                      width: "80px",
                      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
                      outline: "none",
                      fontWeight: 400,
                    }}
                  />
                )}
              </Box>
            ))}

            {/* Notes Section */}
            <Box sx={{ mt: 1 }}>
              <Typography
                sx={{
                  fontWeight: 700,
                  color: "#2d2d2d",
                  mb: 1,
                  fontSize: isMobile ? 13 : 14,
                }}
              >
                Additional Notes (Optional)
              </Typography>
              <TextField
                multiline
                rows={isMobile ? 2 : 3}
                placeholder="Add any details about this payment..."
                value={paymentNote}
                onChange={(e) => setPaymentNote(e.target.value)}
                fullWidth
                size="small"
                sx={{
                  "& .MuiOutlinedInput-root": {
                    borderRadius: "10px",
                    fontSize: isMobile ? 12 : 13,
                    "&:hover fieldset": {
                      borderColor: THEME_PURPLE,
                    },
                    "&.Mui-focused fieldset": {
                      borderColor: THEME_PURPLE,
                    },
                  },
                }}
              />
            </Box>
          </Box>
        </DialogContent>

        <DialogActions sx={{ px: isMobile ? 2 : 3, pb: 2, gap: 1 }}>
          <Button
            onClick={() => setPayDialogOpen(false)}
            disabled={loadingPayment}
            sx={{
              color: "#666",
              borderRadius: "8px",
              fontWeight: 700,
              fontSize: isMobile ? 12 : 13,
              "&:disabled": { color: alpha("#000", 0.3) },
            }}
          >
            Cancel
          </Button>

          <Button
            onClick={confirmReceiveMoney}
            disabled={loadingPayment}
            sx={{
              backgroundColor: THEME_PURPLE,
              color: "white",
              borderRadius: "8px",
              fontWeight: 700,
              fontSize: isMobile ? 12 : 13,
              px: isMobile ? 2 : 2.5,
              py: isMobile ? 0.7 : 0.9,
              boxShadow: `0 6px 18px ${alpha(THEME_PURPLE, 0.3)}`,
              "&:hover": { backgroundColor: "#49127d" },
              "&:disabled": { backgroundColor: alpha(THEME_PURPLE, 0.5) },
            }}
          >
            {loadingPayment ? "Processing..." : "Confirm"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}