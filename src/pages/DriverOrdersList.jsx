import { useEffect, useMemo, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box, Container, Fade, Typography, Button, alpha, Chip,
  useMediaQuery, useTheme, IconButton, Menu, MenuItem,
} from "@mui/material";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import PendingActionsIcon from "@mui/icons-material/PendingActions";
import DoneAllIcon from "@mui/icons-material/DoneAll";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import RefreshIcon from "@mui/icons-material/Refresh";
import SettingsIcon from "@mui/icons-material/Settings";
import LogoutIcon from "@mui/icons-material/Logout";
import VerifiedIcon from "@mui/icons-material/Verified";
import axios from "axios";
import { C, FONT, R, bannerGradient, AppLoader } from "../theme/ccTheme";

const P = C.purple;
const T = C.teal;
const f = { fontFamily: FONT };

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
        const result = res.data.result.result;
        setAssignments(Array.isArray(result) ? result : result?.assignment || result?.tasks || []);
      } else { setAssignments([]); }
    } catch { setAssignments([]); }

    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => { load(); }, [filter, driverId]);

  const handleFilter = (val) => { setFilter(val); localStorage.setItem("assignmentFilter", val); };
  const handleLogout = () => { setAnchorEl(null); localStorage.removeItem("user_data"); navigate("/login"); };

  const filterTabs = [
    { value: "assigned", icon: <PendingActionsIcon sx={{ fontSize: 16 }} />, label: "Assigned" },
    { value: "in_delivery", icon: <LocalShippingIcon sx={{ fontSize: 16 }} />, label: "In Delivery" },
    { value: "done", icon: <DoneAllIcon sx={{ fontSize: 16 }} />, label: "Done" },
  ];

  const headerSub = useMemo(() => {
    if (filter === "assigned") return "Waiting for your approval";
    if (filter === "in_delivery") return "Assignments in progress";
    return "Completed assignments";
  }, [filter]);

  if (loading) return <AppLoader />;

  return (
    <Box sx={{ minHeight: "100vh", backgroundColor: C.purpleBg, fontFamily: FONT }}>
      <Box
        ref={scrollRef}
        sx={{
          height: "100vh",
          overflowY: "auto",
          overflowX: "hidden",
          "&::-webkit-scrollbar": { width: 4 },
          "&::-webkit-scrollbar-thumb": { background: alpha(P, 0.18), borderRadius: 10 },
        }}
      >
        {/* Container: no side padding on mobile so cards stretch edge-to-edge */}
        <Container maxWidth="md" sx={{ pb: 6, px: { xs: 1.5, sm: 2 } }}>
          <Fade in timeout={350}>
            <Box>

              {/* ── header card with gradient banner ── */}
              <Box
                sx={{
                  backgroundColor: "white",
                  borderRadius: R.cardSm,
                  border: "1px solid rgba(126,87,194,0.08)",
                  boxShadow: "0 2px 8px rgba(126,87,194,0.06)",
                  px: 2,
                  pt: 0,
                  pb: 2,
                  mb: 0,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  position: "relative",
                  overflow: "hidden",
                  "&::before": {
                    content: '""',
                    position: "absolute",
                    top: 0, left: 0, right: 0,
                    height: "4px",
                    background: bannerGradient,
                  },
                }}
              >
                {/* inner content needs top padding to clear the strip */}
                <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, pt: 2 }}>
                  <Box sx={{ width: isMobile ? 36 : 42, height: isMobile ? 36 : 42, borderRadius: "10px", backgroundColor: alpha(P, 0.08), display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <LocalShippingIcon sx={{ color: P, fontSize: isMobile ? 20 : 22 }} />
                  </Box>
                  <Box>
                    <Typography sx={{ ...f, fontSize: isMobile ? 16 : 18, color: C.text }}>Your Assignments</Typography>
                    <Typography sx={{ ...f, fontSize: 12, color: C.muted }}>{userName ? `Welcome, ${userName}` : headerSub}</Typography>
                  </Box>
                </Box>

                <Box sx={{ pt: 2 }}>
                  <IconButton
                    onClick={(e) => setAnchorEl(e.currentTarget)}
                    sx={{ color: T, backgroundColor: alpha(T, 0.07), borderRadius: "10px", p: 1, border: `1px solid ${alpha(T, 0.14)}`, transition: "all 0.25s", "&:hover": { backgroundColor: alpha(T, 0.13), transform: "rotate(22deg)" } }}
                  >
                    <SettingsIcon sx={{ fontSize: 20 }} />
                  </IconButton>
                </Box>

                <Menu
                  anchorEl={anchorEl}
                  open={Boolean(anchorEl)}
                  onClose={() => setAnchorEl(null)}
                  PaperProps={{ sx: { borderRadius: R.cardSm, mt: 1, boxShadow: `0 6px 20px ${alpha(P, 0.14)}`, "& .MuiMenuItem-root": { ...f, fontSize: 14 } } }}
                >
                  <MenuItem onClick={handleLogout} sx={{ color: C.red, gap: 1 }}>
                    <LogoutIcon sx={{ fontSize: 17 }} /> Logout
                  </MenuItem>
                </Menu>
              </Box>

              {/* ── filter tabs — sticky, extra top offset so not clipped ── */}
              <Box
                sx={{
                  position: "sticky",
                  top: 0,
                  zIndex: 10,
                  backgroundColor: C.purpleBg,
                  px: { xs: 1.5, sm: 0 },
                  pt: 1.5,
                  pb: 1.2,
                  borderBottom: "1px solid rgba(126,87,194,0.08)",
                  mb: 1.5,
                }}
              >
                <Box sx={{ display: "flex", gap: 0.6, overflowX: "auto", "&::-webkit-scrollbar": { height: 0 } }}>
                  {filterTabs.map((tab) => {
                    const active = filter === tab.value;
                    return (
                      <Button
                        key={tab.value}
                        onClick={() => handleFilter(tab.value)}
                        sx={{
                          ...f,
                          display: "flex", alignItems: "center", gap: 0.6,
                          px: isMobile ? 1.5 : 2, py: 0.65,
                          borderRadius: R.pill,
                          whiteSpace: "nowrap", flexShrink: 0,
                          fontSize: 12, textTransform: "none",
                          border: `1.5px solid ${active ? P : "rgba(126,87,194,0.15)"}`,
                          backgroundColor: active ? alpha(P, 0.08) : "white",
                          color: active ? P : C.mutedDark,
                          boxShadow: active ? "none" : "0 1px 4px rgba(126,87,194,0.06)",
                          transition: "all 0.2s",
                          "&:hover": { backgroundColor: active ? alpha(P, 0.12) : alpha(P, 0.04) },
                        }}
                      >
                        {tab.icon}{tab.label}
                      </Button>
                    );
                  })}
                </Box>
              </Box>

              {/* ── list ── */}
              <Box sx={{ display: "flex", flexDirection: "column", gap: 1, px: { xs: 1.5, sm: 0 } }}>
                {assignments.length === 0 ? (
                  <Box sx={{ textAlign: "center", py: 10 }}>
                    <LocalShippingIcon sx={{ fontSize: 42, color: alpha(P, 0.16), mb: 1.5, display: "block", mx: "auto" }} />
                    <Typography sx={{ ...f, color: C.text, fontSize: 15, mb: 0.5 }}>No assignments here</Typography>
                    <Typography sx={{ ...f, color: C.muted, fontSize: 13 }}>Try another filter or check back later</Typography>
                  </Box>
                ) : assignments.map((asgn) => {
                  const isPending = asgn.state === "waiting_for_approve";
                  const firstOrder = asgn.orders?.[0];
                  const paidOnline = !!firstOrder?.already_paid_online;
                  const blacklisted = !!firstOrder?.customer_blacklisted;
                  const totalAmount = asgn.orders?.reduce((s, o) => s + o.amount_total, 0) || 0;

                  return (
                    <Box
                      key={asgn.id}
                      onClick={() => navigate(`/driver/orders/${asgn.id}`)}
                      sx={{
                        borderRadius: R.cardSm,
                        border: paidOnline
                          ? `1.5px solid ${alpha(T, 0.28)}`
                          : (blacklisted ? `1.5px solid ${alpha(C.red, 0.40)}` : "1px solid rgba(126,87,194,0.08)"),
                        backgroundColor: !paidOnline && blacklisted ? alpha(C.red, 0.025) : "white",
                        boxShadow: "0 2px 8px rgba(126,87,194,0.06)",
                        p: isMobile ? 1.8 : 2,
                        cursor: "pointer",
                        position: "relative",
                        overflow: "hidden",
                        transition: "box-shadow 0.18s ease, background-color 0.15s ease",
                        "&:hover": {
                          boxShadow: "0 6px 20px rgba(126,87,194,0.13)",
                          backgroundColor: alpha(P, 0.015),
                        },
                        "&:active": { transform: "scale(0.99)" },
                      }}
                    >
                      {/* paid-online ribbon — top left */}
                      {paidOnline && (
                        <Box sx={{
                          position: "absolute", top: 0, left: 0,
                          width: 0, height: 0,
                          borderStyle: "solid",
                          borderWidth: "48px 48px 0 0",
                          borderColor: `${T} transparent transparent transparent`,
                        }}>
                          <VerifiedIcon sx={{ position: "absolute", top: -44, left: 4, fontSize: 14, color: "white" }} />
                        </Box>
                      )}

                      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 1, pl: paidOnline ? 2 : 0 }}>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography sx={{ ...f, fontSize: isMobile ? 15 : 16, color: C.text }}>{asgn.name}</Typography>
                          <Typography sx={{ ...f, fontSize: 12, color: C.muted, mt: 0.2 }}>{asgn.assignment_date}</Typography>
                        </Box>
                        <Chip
                          label={stateLabel(asgn.state)} size="small"
                          sx={{ ...f, backgroundColor: alpha(P, 0.08), color: P, fontSize: 11, height: 22, borderRadius: R.pill, flexShrink: 0 }}
                        />
                      </Box>

                      {/* accepted order preview */}
                      {!isPending && firstOrder && (
                        <Box sx={{ mt: 1.2, pt: 1.2, borderTop: "1px solid rgba(126,87,194,0.07)", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 1 }}>
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography sx={{ ...f, fontSize: 13, color: C.text }}>{firstOrder.customer_name}</Typography>
                            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mt: 0.2 }}>
                              <LocationOnIcon sx={{ fontSize: 13, color: T, flexShrink: 0 }} />
                              <Typography sx={{ ...f, fontSize: 12, color: C.muted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                {[
                                  firstOrder.customer_address?.area,
                                  firstOrder.customer_address?.building && `Bldg ${firstOrder.customer_address.building}`,
                                  firstOrder.customer_address?.floor && `Fl ${firstOrder.customer_address.floor}`,
                                ].filter(Boolean).join(' · ')}
                              </Typography>
                            </Box>
                          </Box>
                          <Box sx={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 0.3, flexShrink: 0 }}>
                            <Typography sx={{ ...f, fontSize: 13, color: P }}>{totalAmount.toFixed(3)} {firstOrder.currency}</Typography>
                            {paidOnline && (
                              <Box sx={{ display: "flex", alignItems: "center", gap: 0.3 }}>
                                <VerifiedIcon sx={{ fontSize: 11, color: T }} />
                                <Typography sx={{ ...f, fontSize: 11, color: T }}>Paid Online</Typography>
                              </Box>
                            )}
                          </Box>
                        </Box>
                      )}

                      {/* pending summary */}
                      {isPending && (
                        <Box sx={{ mt: 1.2, pt: 1.2, borderTop: "1px solid rgba(126,87,194,0.07)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <Box>
                            <Typography sx={{ ...f, fontSize: 14, color: C.text, mt: 0.2 }}>{totalAmount.toFixed(3)} {firstOrder?.currency || ""}</Typography>
                          </Box>
                          <Typography sx={{ ...f, fontSize: 12, color: P }}>Review →</Typography>
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

      {/* floating refresh — mobile only */}
      {isMobile && !loading && (
        <Button
          onClick={() => load(true)}
          disabled={refreshing}
          sx={{
            position: "fixed", bottom: 22, right: 22,
            width: 48, height: 48, borderRadius: "50%", minWidth: 0,
            backgroundColor: P, color: "white",
            boxShadow: `0 4px 14px ${alpha(P, 0.26)}`,
            animation: refreshing ? "spin 1s linear infinite" : "none",
            "@keyframes spin": { "0%": { transform: "rotate(0deg)" }, "100%": { transform: "rotate(360deg)" } },
            "&:hover": { backgroundColor: C.purpleDark },
            "&:disabled": { backgroundColor: alpha(P, 0.38) },
            zIndex: 50,
          }}
        >
          <RefreshIcon sx={{ fontSize: 20 }} />
        </Button>
      )}
    </Box>
  );
}