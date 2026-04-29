import { useEffect, useMemo, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box, Container, Fade, Typography, Button, alpha, Chip,
  CircularProgress, useMediaQuery, useTheme, IconButton, Menu, MenuItem,
} from "@mui/material";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import PendingActionsIcon from "@mui/icons-material/PendingActions";
import DoneAllIcon from "@mui/icons-material/DoneAll";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import RefreshIcon from "@mui/icons-material/Refresh";
import SettingsIcon from "@mui/icons-material/Settings";
import LogoutIcon from "@mui/icons-material/Logout";
import PaymentIcon from "@mui/icons-material/Payment";
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

export default function DriverAssignmentsList() {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const [filter, setFilter] = useState(() => localStorage.getItem("assignmentFilter") || "assigned");
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);
  const [userName, setUserName] = useState("");
  const scrollRef = useRef(null);

  const driverId = JSON.parse(localStorage.getItem("user_data"))?.id;
  const userData = JSON.parse(localStorage.getItem("user_data") || "null");

  useEffect(() => {
    const ud = JSON.parse(localStorage.getItem("user_data") || "null");
    if (ud?.name) setUserName(ud.name);
  }, []);

  if (!userData?.isDriver) {
    return (
      <Box sx={{ minHeight: "100vh", display: "flex", justifyContent: "center", alignItems: "center" }}>
        <Typography color="error">Access denied.</Typography>
      </Box>
    );
  }

  const load = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    if (!driverId) { setLoading(false); setRefreshing(false); return; }

    const endpointMap = {
      assigned: "/api/driver/tasks/assigned",
      in_delivery: "/api/driver/tasks/pending",
      done: "/api/driver/tasks/done",
    };

    try {
      const res = await axios.post(
        endpointMap[filter],
        { params: { driver_id: driverId } },
        { withCredentials: true, headers: { "Content-Type": "application/json" } }
      );
      if (res.data.result?.status === "success") {
        const result = res.data.result?.result;
        const data = Array.isArray(result) ? result : result?.assignment || result?.tasks || [];
        setAssignments(data);
      } else {
        setAssignments([]);
      }
    } catch { setAssignments([]); }
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => { load(); }, [filter, driverId]);

  const handleFilter = (val) => { setFilter(val); localStorage.setItem("assignmentFilter", val); };
  const handleLogout = () => { setAnchorEl(null); localStorage.removeItem("user_data"); navigate("/login"); };

  const headerText = useMemo(() => {
    if (filter === "assigned") return "Assignments waiting for your approval";
    if (filter === "in_delivery") return "Assignments in progress";
    return "Your completed assignments";
  }, [filter]);

  const filterOptions = [
    { value: "assigned", icon: <PendingActionsIcon sx={{ fontSize: isMobile ? 17 : 19 }} />, label: "Assigned" },
    { value: "in_delivery", icon: <LocalShippingIcon sx={{ fontSize: isMobile ? 17 : 19 }} />, label: "In Delivery" },
    { value: "done", icon: <DoneAllIcon sx={{ fontSize: isMobile ? 17 : 19 }} />, label: "Done" },
  ];

  return (
    <Box sx={{ minHeight: "100vh", background: `linear-gradient(135deg, ${alpha(P, 0.04)} 0%, white 60%, ${alpha(T, 0.03)} 100%)`, fontFamily: FONT }}>
      <Box ref={scrollRef} sx={{ height: "100vh", overflowY: "auto", overflowX: "hidden", "&::-webkit-scrollbar": { width: 4 }, "&::-webkit-scrollbar-thumb": { background: alpha(P, 0.25), borderRadius: 10 } }}>
        <Container maxWidth="md" sx={{ pb: 5, px: isMobile ? 1.5 : 2 }}>
          <Fade in timeout={400}>
            <Box>
              {/* Top bar */}
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", pt: isMobile ? 2 : 2.5, pb: isMobile ? 1.5 : 2 }}>
                <Box>
                  <Typography sx={{ fontFamily: FONT, fontSize: isMobile ? 12 : 13, color: C.muted }}>Welcome back,</Typography>
                  <Typography sx={{ fontFamily: FONT, fontWeight: 700, fontSize: isMobile ? 16 : 18, color: C.text, letterSpacing: "-0.3px" }}>{userName || "Driver"}</Typography>
                </Box>
                <IconButton onClick={(e) => setAnchorEl(e.currentTarget)}
                  sx={{ color: T, backgroundColor: alpha(T, 0.08), borderRadius: "12px", p: 1.25, border: `1.5px solid ${alpha(T, 0.18)}`, transition: "all 0.3s ease", "&:hover": { backgroundColor: alpha(T, 0.15), transform: "rotate(22deg)" } }}>
                  <SettingsIcon sx={{ fontSize: 22 }} />
                </IconButton>
                <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)}
                  PaperProps={{ sx: { borderRadius: R.cardSm, mt: 1, boxShadow: `0 8px 24px ${alpha(P, 0.18)}`, "& .MuiMenuItem-root": { fontFamily: FONT, fontSize: 14 } } }}>
                  <MenuItem onClick={handleLogout} sx={{ color: C.red, gap: 1 }}>
                    <LogoutIcon sx={{ fontSize: 18 }} /> Logout
                  </MenuItem>
                </Menu>
              </Box>

              {/* Header + filters — sticky */}
              <Box sx={{ position: "sticky", top: 0, background: `linear-gradient(135deg, ${alpha(P, 0.04)} 0%, white 80%)`, backdropFilter: "blur(8px)", zIndex: 10, pt: 1, pb: 1.5, borderBottom: `1px solid ${alpha(P, 0.08)}`, mb: 2 }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 1.5 }}>
                  <Box sx={{ width: isMobile ? 38 : 44, height: isMobile ? 38 : 44, borderRadius: "12px", background: `linear-gradient(135deg, ${alpha(P, 0.14)}, ${alpha(T, 0.08)})`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <LocalShippingIcon sx={{ color: P, fontSize: isMobile ? 22 : 26 }} />
                  </Box>
                  <Box>
                    <Typography sx={{ fontFamily: FONT, fontWeight: 800, fontSize: isMobile ? 18 : 22, color: C.text, letterSpacing: "-0.4px" }}>Assignments</Typography>
                    <Typography sx={{ fontFamily: FONT, fontSize: isMobile ? 12 : 13, color: C.muted, mt: 0.2 }}>{headerText}</Typography>
                  </Box>
                </Box>

                <Box sx={{ display: "flex", gap: 0.8, overflowX: "auto", pb: 0.5, "&::-webkit-scrollbar": { height: 3 }, "&::-webkit-scrollbar-thumb": { background: alpha(P, 0.2), borderRadius: 10 } }}>
                  {filterOptions.map((opt) => {
                    const active = filter === opt.value;
                    return (
                      <Button key={opt.value} onClick={() => handleFilter(opt.value)}
                        sx={{ display: "flex", alignItems: "center", gap: 0.8, px: isMobile ? 1.8 : 2.2, py: 0.7, borderRadius: R.pill, whiteSpace: "nowrap", flexShrink: 0, fontSize: isMobile ? 12 : 13, fontWeight: 700, fontFamily: FONT, textTransform: "none", border: `2px solid ${active ? P : "transparent"}`, backgroundColor: active ? alpha(P, 0.12) : "transparent", color: active ? P : C.muted, transition: "all 0.25s ease", "&:hover": { backgroundColor: alpha(P, active ? 0.18 : 0.06) } }}>
                        {opt.icon}{opt.label}
                      </Button>
                    );
                  })}
                </Box>
              </Box>

              {/* Content */}
              <Box sx={{ display: "flex", flexDirection: "column", gap: 1.2 }}>
                {loading ? (
                  <Box sx={{ textAlign: "center", py: 10 }}>
                    <CircularProgress sx={{ color: P }} size={isMobile ? 44 : 52} />
                    <Typography sx={{ fontFamily: FONT, color: C.muted, fontSize: isMobile ? 13 : 14, mt: 2 }}>Loading assignments…</Typography>
                  </Box>
                ) : assignments.length === 0 ? (
                  <Box sx={{ textAlign: "center", py: 10 }}>
                    <Box sx={{ width: isMobile ? 64 : 78, height: isMobile ? 64 : 78, borderRadius: "18px", background: `linear-gradient(135deg, ${alpha(P, 0.10)}, ${alpha(T, 0.06)})`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
                      <LocalShippingIcon sx={{ fontSize: isMobile ? 30 : 38, color: alpha(P, 0.30) }} />
                    </Box>
                    <Typography sx={{ fontFamily: FONT, fontWeight: 700, color: C.text, fontSize: isMobile ? 15 : 16, mb: 0.5 }}>No assignments here</Typography>
                    <Typography sx={{ fontFamily: FONT, color: C.muted, fontSize: isMobile ? 13 : 14 }}>Try another filter or check back later</Typography>
                  </Box>
                ) : assignments.map((asgn) => {
                  const isAccepted = asgn.state !== "waiting_for_approve";
                  const firstOrder = asgn.orders?.[0];
                  const totalAmount = asgn.orders?.reduce((s, o) => s + o.amount_total, 0) || 0;

                  return (
                    <Box key={asgn.id} onClick={() => navigate(`/driver/orders/${asgn.id}`)}
                      sx={{ borderRadius: isMobile ? R.cardSm : R.card, backgroundColor: "white", border: `1px solid ${alpha(P, 0.10)}`, p: isMobile ? 2 : 2.5, cursor: "pointer", position: "relative", overflow: "hidden", transition: "all 0.2s ease", "&::before": { content: '""', position: "absolute", top: 0, left: 0, right: 0, height: "3px", background: bannerGradient }, "&:hover": isMobile ? {} : { transform: "translateY(-2px)", boxShadow: `0 10px 30px ${alpha(P, 0.16)}` }, "&:active": { transform: "scale(0.985)" } }}>
                      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 1, mb: isAccepted && firstOrder ? 1.5 : 0 }}>
                        <Box sx={{ flex: 1 }}>
                          <Typography sx={{ fontFamily: FONT, fontWeight: 800, fontSize: isMobile ? 15 : 17, color: C.text }}>{asgn.name}</Typography>
                          <Typography sx={{ fontFamily: FONT, fontSize: isMobile ? 11 : 12, color: C.muted, mt: 0.3 }}>{asgn.assignment_date}</Typography>
                        </Box>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                          <Chip label={stateLabel(asgn.state)} size={isMobile ? "small" : "medium"}
                            sx={{ backgroundColor: alpha(P, 0.10), color: P, fontFamily: FONT, fontWeight: 700, fontSize: isMobile ? 10 : 12, height: isMobile ? 24 : 28, borderRadius: R.pill }} />
                          {!isMobile && <ChevronRightIcon sx={{ color: alpha(C.text, 0.30), fontSize: 18 }} />}
                        </Box>
                      </Box>

                      {isAccepted && firstOrder && (
                        <Box sx={{ borderRadius: R.soft, backgroundColor: alpha(P, 0.03), border: `1px solid ${alpha(P, 0.10)}`, p: isMobile ? 1.2 : 1.5 }}>
                          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 1 }}>
                            <Box sx={{ flex: 1, minWidth: 0 }}>
                              <Typography sx={{ fontFamily: FONT, fontWeight: 700, color: C.text, fontSize: isMobile ? 13 : 14 }}>{firstOrder.customer_name}</Typography>
                              <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mt: 0.3 }}>
                                <LocationOnIcon sx={{ fontSize: isMobile ? 13 : 15, color: T, flexShrink: 0 }} />
                                <Typography sx={{ fontFamily: FONT, fontSize: isMobile ? 11 : 12, color: C.muted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{firstOrder.customer_address?.area}</Typography>
                              </Box>
                            </Box>
                            <Box sx={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 0.5, flexShrink: 0 }}>
                              <Chip label={`${totalAmount.toFixed(2)} ${firstOrder.currency}`} size="small"
                                sx={{ backgroundColor: alpha(P, 0.10), color: P, fontFamily: FONT, fontWeight: 700, fontSize: isMobile ? 11 : 12, height: isMobile ? 22 : 26, borderRadius: R.pill }} />
                              {firstOrder.already_paid_online && (
                                <Chip icon={<PaymentIcon sx={{ fontSize: 11, color: T }} />} label="Paid Online" size="small"
                                  sx={{ backgroundColor: alpha(T, 0.10), color: T, fontFamily: FONT, fontWeight: 700, fontSize: 10, height: 20, borderRadius: R.pill, "& .MuiChip-icon": { ml: "4px" } }} />
                              )}
                            </Box>
                          </Box>
                        </Box>
                      )}

                      {!isAccepted && (
                        <Box sx={{ pt: 1.2, borderTop: `1px solid ${alpha(P, 0.08)}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <Box>
                            <Typography sx={{ fontFamily: FONT, fontSize: isMobile ? 12 : 13, color: C.muted, fontWeight: 600 }}>Orders: {asgn.orders_count}</Typography>
                            <Typography sx={{ fontFamily: FONT, fontWeight: 700, fontSize: isMobile ? 13 : 14, color: C.text, mt: 0.3 }}>
                              {totalAmount.toFixed(2)} {firstOrder?.currency || ""}
                            </Typography>
                          </Box>
                          <Box sx={{ px: 1.8, py: 0.7, borderRadius: R.soft, backgroundColor: alpha(T, 0.10) }}>
                            <Typography sx={{ fontFamily: FONT, fontSize: isMobile ? 11 : 12, fontWeight: 700, color: T }}>Review →</Typography>
                          </Box>
                        </Box>
                      )}
                    </Box>
                  );
                })}
              </Box>
            </Box>
          </Fade>
        </Container>
      </Box>

      {isMobile && !loading && (
        <Button onClick={() => load(true)} disabled={refreshing}
          sx={{ position: "fixed", bottom: 24, right: 24, width: 54, height: 54, borderRadius: "50%", minWidth: 0, backgroundColor: P, color: "white", boxShadow: `0 6px 20px ${alpha(P, 0.32)}`, animation: refreshing ? "spin 1s linear infinite" : "none", "@keyframes spin": { "0%": { transform: "rotate(0deg)" }, "100%": { transform: "rotate(360deg)" } }, "&:hover": { backgroundColor: C.purpleDark }, "&:disabled": { backgroundColor: alpha(P, 0.45) }, zIndex: 50 }}>
          <RefreshIcon sx={{ fontSize: 22 }} />
        </Button>
      )}
    </Box>
  );
}