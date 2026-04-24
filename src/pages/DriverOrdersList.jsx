import { useEffect, useMemo, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Container,
  Fade,
  Typography,
  Button,
  alpha,
  Chip,
  CircularProgress,
  useMediaQuery,
  useTheme,
  IconButton,
  Menu,
  MenuItem,
} from "@mui/material";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import PendingActionsIcon from "@mui/icons-material/PendingActions";
import DoneAllIcon from "@mui/icons-material/DoneAll";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import RefreshIcon from "@mui/icons-material/Refresh";
import SettingsIcon from "@mui/icons-material/Settings";
import LogoutIcon from "@mui/icons-material/Logout";

import axios from "axios";
import { styles, THEME_PURPLE, LIGHT_PURPLE_BG } from "../theme/theme";

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
  const isTablet = useMediaQuery(theme.breakpoints.down("md"));

  const [filter, setFilter] = useState(() => {
    const savedFilter = localStorage.getItem("assignmentFilter");
    return savedFilter || "assigned";
  });
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const scrollContainerRef = useRef(null);
  const [anchorEl, setAnchorEl] = useState(null);
  const [userName, setUserName] = useState("");

  const driverId = JSON.parse(localStorage.getItem("user_data"))?.id;
  const userData = JSON.parse(localStorage.getItem('user_data') || 'null');
  if (!userData?.isDriver) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <Typography color="error">Access denied.</Typography>
      </Box>
    );
  }

  const handleMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogoutClick = () => {
    handleMenuClose();
    localStorage.removeItem("user_data");
    navigate("/login");
  };

  const load = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    if (!driverId) {
      console.error("Driver ID not found in localStorage");
      setLoading(false);
      setRefreshing(false);
      return;
    }

    try {
      let endpoint = "";

      if (filter === "assigned") {
        endpoint = "/api/driver/tasks/assigned";
      } else if (filter === "in_delivery") {
        endpoint = "/api/driver/tasks/pending";
      } else {
        endpoint = "/api/driver/tasks/done";
      }

      const response = await axios.post(
        endpoint,
        { params: { driver_id: driverId } },
        {
          withCredentials: true,
          headers: { "Content-Type": "application/json" },
        }
      );

      if (response.data.result?.status === "success") {
        const result = response.data.result?.result;
        let data = [];
        if (Array.isArray(result)) {
          data = result;
        } else if (result?.assignment) {
          data = result.assignment;
        } else if (result?.tasks) {
          data = result.tasks;
        }
        setAssignments(data);
      } else {
        console.error("API Error:", response.data.result?.message);
        setAssignments([]);
      }
    } catch (error) {
      console.error("Error loading assignments:", error);
      setAssignments([]);
    }
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, driverId]);

  const handleFilterChange = (newFilter) => {
    setFilter(newFilter);
    localStorage.setItem("assignmentFilter", newFilter);
  };

  const handlePullToRefresh = (e) => {
    if (scrollContainerRef.current?.scrollTop === 0) {
      load(true);
    }
  };

  const headerText = useMemo(() => {
    if (filter === "assigned")
      return "Assignments waiting for your approval";
    if (filter === "in_delivery") return "Assignments in progress";
    return "Your completed assignments";
  }, [filter]);

  const filterOptions = [
    {
      value: "assigned",
      icon: <PendingActionsIcon sx={{ fontSize: isMobile ? 18 : 20 }} />,
      label: "Assigned",
    },
    {
      value: "in_delivery",
      icon: <LocalShippingIcon sx={{ fontSize: isMobile ? 18 : 20 }} />,
      label: "In Delivery",
    },
    {
      value: "done",
      icon: <DoneAllIcon sx={{ fontSize: isMobile ? 18 : 20 }} />,
      label: "Done",
    },
  ];

  return (
    <Box
      sx={{
        ...styles.pageBg,
        background: `linear-gradient(135deg, ${LIGHT_PURPLE_BG} 0%, #ffffff 100%)`,
        minHeight: "100vh",
      }}
    >
      <Box
        ref={scrollContainerRef}
        onScroll={handlePullToRefresh}
        sx={{
          height: "100vh",
          overflowY: "auto",
          overflowX: "hidden",
          scrollBehavior: "smooth",
          "&::-webkit-scrollbar": {
            width: isMobile ? "4px" : "6px",
          },
          "&::-webkit-scrollbar-track": {
            background: "transparent",
          },
          "&::-webkit-scrollbar-thumb": {
            background: alpha(THEME_PURPLE, 0.3),
            borderRadius: "10px",
            "&:hover": {
              background: alpha(THEME_PURPLE, 0.5),
            },
          },
        }}
      >
        <Container maxWidth="md" sx={{ pb: 4 }}>
          <Fade in timeout={500}>
            <Box>
              {/* Top Menu Bar */}
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  pt: isMobile ? 2 : 2.5,
                  pb: isMobile ? 1.5 : 2,
                }}
              >
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1.5,
                  }}
                >
                  <Box>
                    <Typography
                      sx={{
                        color: "#9e9e9e",
                        fontSize: isMobile ? 12 : 13,
                        mb: 0.3,
                      }}
                    >
                      Welcome back,
                    </Typography>
                    <Typography
                      sx={{
                        color: "#2d2d2d",
                        fontWeight: 700,
                        fontSize: isMobile ? 15 : 17,
                        letterSpacing: "-0.5px",
                      }}
                    >
                      {userName || "Driver"}
                    </Typography>
                  </Box>
                </Box>

                <IconButton
                  onClick={handleMenuOpen}
                  sx={{
                    color: THEME_PURPLE,
                    backgroundColor: alpha(THEME_PURPLE, 0.08),
                    borderRadius: "12px",
                    p: 1.5,
                    transition: "all 0.3s ease",
                    "&:hover": {
                      backgroundColor: alpha(THEME_PURPLE, 0.15),
                      transform: "rotate(20deg)",
                    },
                  }}
                >
                  <SettingsIcon sx={{ fontSize: 24 }} />
                </IconButton>

                <Menu
                  anchorEl={anchorEl}
                  open={Boolean(anchorEl)}
                  onClose={handleMenuClose}
                  PaperProps={{
                    sx: {
                      borderRadius: "12px",
                      mt: 1,
                      boxShadow: "0 8px 24px rgba(126, 87, 194, 0.2)",
                      "& .MuiMenuItem-root": {
                        fontSize: "14px",
                        transition: "all 0.2s ease",
                        "&:hover": {
                          backgroundColor: alpha(THEME_PURPLE, 0.08),
                        },
                      },
                    },
                  }}
                >
                  <MenuItem
                    onClick={handleLogoutClick}
                    sx={{ color: "#c62828" }}
                  >
                    <LogoutIcon sx={{ mr: 1.5, fontSize: 20 }} />
                    Logout
                  </MenuItem>
                </Menu>
              </Box>

              {/* Header Section */}
              <Box
                sx={{
                  pt: isMobile ? 1.5 : 2,
                  pb: isMobile ? 1.5 : 2,
                  position: "sticky",
                  top: 0,
                  background: `linear-gradient(135deg, ${LIGHT_PURPLE_BG} 0%, #ffffff 100%)`,
                  backdropFilter: "blur(8px)",
                  zIndex: 10,
                  borderBottom: `1px solid ${alpha(THEME_PURPLE, 0.1)}`,
                }}
              >
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: isMobile ? 1 : 1.5,
                    mb: isMobile ? 1.5 : 2,
                  }}
                >
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: isMobile ? 40 : 48,
                      height: isMobile ? 40 : 48,
                      borderRadius: "12px",
                      background: `linear-gradient(135deg, ${alpha(
                        THEME_PURPLE,
                        0.15
                      )}, ${alpha(THEME_PURPLE, 0.05)})`,
                    }}
                  >
                    <LocalShippingIcon
                      sx={{
                        color: THEME_PURPLE,
                        fontSize: isMobile ? 24 : 28,
                      }}
                    />
                  </Box>
                  <Box>
                    <Typography
                      sx={{
                        fontWeight: 800,
                        fontSize: isMobile ? 18 : 22,
                        color: "#2d2d2d",
                        letterSpacing: "-0.5px",
                      }}
                    >
                      Assignments
                    </Typography>
                    <Typography
                      sx={{
                        color: alpha("#000", 0.5),
                        fontSize: isMobile ? 12 : 13,
                        fontWeight: 500,
                        mt: 0.25,
                      }}
                    >
                      {headerText}
                    </Typography>
                  </Box>
                </Box>

                {/* Filter Tabs - Horizontally Scrollable */}
                <Box
                  sx={{
                    display: "flex",
                    gap: 0.8,
                    overflowX: "auto",
                    pb: 1,
                    "&::-webkit-scrollbar": {
                      height: "3px",
                    },
                    "&::-webkit-scrollbar-track": {
                      background: "transparent",
                    },
                    "&::-webkit-scrollbar-thumb": {
                      background: alpha(THEME_PURPLE, 0.2),
                      borderRadius: "10px",
                    },
                  }}
                >
                  {filterOptions.map((option) => (
                    <Button
                      key={option.value}
                      onClick={() => handleFilterChange(option.value)}
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 0.8,
                        px: isMobile ? 2 : 2.5,
                        py: 0.8,
                        borderRadius: "999px",
                        whiteSpace: "nowrap",
                        flexShrink: 0,
                        border: `2px solid transparent`,
                        transition: "all 0.3s ease",
                        fontSize: isMobile ? 12 : 13,
                        fontWeight: 700,
                        backgroundColor:
                          filter === option.value
                            ? alpha(THEME_PURPLE, 0.15)
                            : "transparent",
                        color:
                          filter === option.value ? THEME_PURPLE : "#666",
                        borderColor:
                          filter === option.value
                            ? THEME_PURPLE
                            : "transparent",
                        "&:hover": {
                          backgroundColor: alpha(
                            THEME_PURPLE,
                            filter === option.value ? 0.2 : 0.08
                          ),
                        },
                      }}
                    >
                      {option.icon}
                      {option.label}
                    </Button>
                  ))}
                </Box>
              </Box>

              {/* Content Section */}
              <Box sx={{ mt: isMobile ? 2 : 3, display: "grid", gap: 1.2 }}>
                {loading ? (
                  <Box
                    sx={{
                      textAlign: "center",
                      py: isMobile ? 8 : 10,
                      px: 2,
                    }}
                  >
                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "center",
                        mb: 2,
                      }}
                    >
                      <CircularProgress
                        sx={{
                          color: THEME_PURPLE,
                          width: isMobile ? 48 : 56,
                          height: isMobile ? 48 : 56,
                        }}
                      />
                    </Box>
                    <Typography
                      sx={{
                        color: "#8a8a8a",
                        fontSize: isMobile ? 14 : 15,
                        fontWeight: 500,
                      }}
                    >
                      Loading assignments…
                    </Typography>
                  </Box>
                ) : assignments.length === 0 ? (
                  <Box
                    sx={{
                      textAlign: "center",
                      py: isMobile ? 8 : 10,
                      px: 2,
                    }}
                  >
                    <Box
                      sx={{
                        width: isMobile ? 64 : 80,
                        height: isMobile ? 64 : 80,
                        borderRadius: "16px",
                        background: `linear-gradient(135deg, ${alpha(
                          THEME_PURPLE,
                          0.1
                        )}, ${alpha(THEME_PURPLE, 0.05)})`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        margin: "0 auto 2rem",
                      }}
                    >
                      <LocalShippingIcon
                        sx={{
                          fontSize: isMobile ? 32 : 40,
                          color: alpha(THEME_PURPLE, 0.3),
                        }}
                      />
                    </Box>
                    <Typography
                      sx={{
                        fontWeight: 700,
                        color: "#2d2d2d",
                        fontSize: isMobile ? 15 : 16,
                        mb: 0.5,
                      }}
                    >
                      No assignments here
                    </Typography>
                    <Typography sx={{ color: "#999", fontSize: isMobile ? 13 : 14 }}>
                      Try another filter or check back later
                    </Typography>
                  </Box>
                ) : (
                  assignments.map((assignment) => {
                    const isAccepted =
                      assignment.state !== "waiting_for_approve";
                    const firstOrder = assignment.orders?.[0];
                    const totalAmount = assignment.orders?.reduce(
                      (sum, o) => sum + o.amount_total,
                      0
                    ) || 0;

                    return (
                      <Box
                        key={assignment.id}
                        onClick={() =>
                          navigate(`/driver/orders/${assignment.id}`)
                        }
                        sx={{
                          borderRadius: isMobile ? "12px" : "16px",
                          backgroundColor: "white",
                          border: `1px solid ${alpha(THEME_PURPLE, 0.1)}`,
                          p: isMobile ? 2 : 2.5,
                          cursor: "pointer",
                          transition: "all 0.2s ease",
                          "&:active": {
                            transform: isMobile ? "scale(0.98)" : "translateY(-2px)",
                            boxShadow: `0 8px 24px ${alpha(THEME_PURPLE, 0.2)}`,
                          },
                          "&:hover": isMobile
                            ? {}
                            : {
                                transform: "translateY(-2px)",
                                boxShadow: `0 12px 36px ${alpha(
                                  THEME_PURPLE,
                                  0.22
                                )}`,
                              },
                        }}
                      >
                        {/* Top Row: Title and Status */}
                        <Box
                          sx={{
                            display: "flex",
                            justifyContent: "space-between",
                            gap: 1,
                            alignItems: "flex-start",
                            mb: 1.5,
                          }}
                        >
                          <Box sx={{ flex: 1 }}>
                            <Typography
                              sx={{
                                fontWeight: 900,
                                fontSize: isMobile ? 15 : 17,
                                color: "#2d2d2d",
                              }}
                            >
                              {assignment.name}
                            </Typography>
                            <Typography
                              sx={{
                                color: alpha("#000", 0.55),
                                fontSize: isMobile ? 11 : 12,
                                mt: 0.25,
                              }}
                            >
                              {assignment.assignment_date}
                            </Typography>
                          </Box>

                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              gap: 0.5,
                            }}
                          >
                            <Chip
                              label={stateLabel(assignment.state)}
                              size={isMobile ? "small" : "medium"}
                              sx={{
                                backgroundColor: alpha(THEME_PURPLE, 0.12),
                                color: THEME_PURPLE,
                                fontWeight: 600,
                                fontSize: isMobile ? 11 : 12,
                                height: isMobile ? 24 : 32,
                              }}
                            />
                            {!isMobile && (
                              <ChevronRightIcon
                                sx={{
                                  color: alpha("#000", 0.35),
                                  fontSize: 20,
                                }}
                              />
                            )}
                          </Box>
                        </Box>

                        {/* Orders Preview */}
                        {isAccepted && firstOrder && (
                          <Box
                            sx={{
                              borderRadius: "10px",
                              backgroundColor: alpha(THEME_PURPLE, 0.03),
                              border: `1px solid ${alpha(THEME_PURPLE, 0.12)}`,
                              p: isMobile ? 1.2 : 1.5,
                              mb: 1,
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
                              <Box sx={{ flex: 1, minWidth: 0 }}>
                                <Typography
                                  sx={{
                                    fontWeight: 700,
                                    color: "#2d2d2d",
                                    fontSize: isMobile ? 13 : 14,
                                  }}
                                >
                                  {firstOrder.customer_name}
                                </Typography>
                                <Box
                                  sx={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 0.5,
                                    mt: 0.25,
                                  }}
                                >
                                  <LocationOnIcon
                                    sx={{
                                      fontSize: isMobile ? 14 : 16,
                                      color: THEME_PURPLE,
                                      flexShrink: 0,
                                    }}
                                  />
                                  <Typography
                                    sx={{
                                      color: alpha("#000", 0.55),
                                      fontSize: isMobile ? 11 : 12,
                                      overflow: "hidden",
                                      textOverflow: "ellipsis",
                                      whiteSpace: "nowrap",
                                    }}
                                  >
                                    {firstOrder.customer_address?.area}
                                  </Typography>
                                </Box>
                              </Box>
                              <Chip
                                label={`${totalAmount.toFixed(2)} ${
                                  firstOrder.currency
                                }`}
                                size="small"
                                sx={{
                                  backgroundColor: alpha(THEME_PURPLE, 0.12),
                                  color: THEME_PURPLE,
                                  fontWeight: 600,
                                  fontSize: isMobile ? 11 : 12,
                                  height: isMobile ? 24 : 28,
                                  flexShrink: 0,
                                }}
                              />
                            </Box>
                          </Box>
                        )}

                        {/* Pending Summary */}
                        {!isAccepted && (
                          <Box
                            sx={{
                              pt: 1,
                              borderTop: `1px solid ${alpha(
                                THEME_PURPLE,
                                0.12
                              )}`,
                            }}
                          >
                            <Box
                              sx={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                              }}
                            >
                              <Box>
                                <Typography
                                  sx={{
                                    color: alpha("#000", 0.55),
                                    fontSize: isMobile ? 12 : 13,
                                    fontWeight: 600,
                                  }}
                                >
                                  Orders: {assignment.orders_count}
                                </Typography>
                                <Typography
                                  sx={{
                                    color: "#2d2d2d",
                                    fontWeight: 700,
                                    fontSize: isMobile ? 13 : 14,
                                    mt: 0.3,
                                  }}
                                >
                                  {totalAmount.toFixed(2)}{" "}
                                  {firstOrder?.currency || ""}
                                </Typography>
                              </Box>
                              <Box
                                sx={{
                                  px: 2,
                                  py: 0.8,
                                  borderRadius: "8px",
                                  backgroundColor: alpha(THEME_PURPLE, 0.08),
                                }}
                              >
                                <Typography
                                  sx={{
                                    color: THEME_PURPLE,
                                    fontSize: isMobile ? 11 : 12,
                                    fontWeight: 700,
                                  }}
                                >
                                  Review →
                                </Typography>
                              </Box>
                            </Box>
                          </Box>
                        )}
                      </Box>
                    );
                  })
                )}
              </Box>
            </Box>
          </Fade>
        </Container>
      </Box>

      {/* Floating Refresh Button for Mobile */}
      {isMobile && !loading && (
        <Button
          onClick={() => load(true)}
          disabled={refreshing}
          sx={{
            position: "fixed",
            bottom: 24,
            right: 24,
            width: 56,
            height: 56,
            borderRadius: "50%",
            backgroundColor: THEME_PURPLE,
            color: "white",
            boxShadow: `0 8px 24px ${alpha(THEME_PURPLE, 0.3)}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            animation: refreshing ? "spin 1s linear infinite" : "none",
            "@keyframes spin": {
              "0%": { transform: "rotate(0deg)" },
              "100%": { transform: "rotate(360deg)" },
            },
            "&:hover": {
              backgroundColor: "#7c3bd7",
            },
            "&:disabled": {
              backgroundColor: alpha(THEME_PURPLE, 0.5),
            },
            zIndex: 50,
          }}
        >
          <RefreshIcon sx={{ fontSize: 24 }} />
        </Button>
      )}
    </Box>
  );
}