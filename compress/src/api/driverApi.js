import { seedOrders, seedPaymentMethods } from "../data/demoSeed";

const STORAGE_KEY = "driver_demo_orders_v1";

function sleep(ms = 250) {
  return new Promise((r) => setTimeout(r, ms));
}

function loadDB() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) return JSON.parse(raw);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(seedOrders));
  return seedOrders;
}

function saveDB(orders) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(orders));
}

function sortByDateDesc(a, b) {
  // newest first
  return String(b.date).localeCompare(String(a.date));
}

// ---- API-like functions ----

export async function apiGetOrders({ driverId, filter }) {
  await sleep();
  const db = loadDB();

  // filter behavior:
  // pending: show orders still pending AND not rejected by this driver
  // in_delivery: only orders assigned to this driver and state in_delivery/money_received
  // done: only orders assigned to this driver and done
  let orders = [...db].sort(sortByDateDesc);

  if (filter === "pending") {
    orders = orders.filter((o) => o.state === "pending");
    // "reject => not seen anymore by this driver"
    const rejectedKey = `driver_rejected_${driverId}`;
    const rejectedIds = JSON.parse(localStorage.getItem(rejectedKey) || "[]");
    orders = orders.filter((o) => !rejectedIds.includes(o.id));
  }

  if (filter === "in_delivery") {
    orders = orders.filter(
      (o) =>
        o.driver_id === driverId &&
        (o.state === "in_delivery" || o.state === "money_received")
    );
  }

  if (filter === "done") {
    orders = orders.filter((o) => o.driver_id === driverId && o.state === "done");
  }

  return {
    status: "success",
    result: {
      orders,
    },
  };
}

export async function apiGetOrderDetails({ orderId }) {
  await sleep();
  const db = loadDB();
  const order = db.find((o) => String(o.id) === String(orderId));
  if (!order) return { status: "error", message: "Order not found" };
  return { status: "success", result: { order } };
}

export async function apiAcceptOrder({ driverId, orderId }) {
  await sleep();
  const db = loadDB();
  const idx = db.findIndex((o) => String(o.id) === String(orderId));
  if (idx === -1) return { status: "error", message: "Order not found" };

  if (db[idx].state !== "pending") {
    return { status: "error", message: "Order is not pending" };
  }

  db[idx] = {
    ...db[idx],
    driver_id: driverId,
    state: "in_delivery",
  };
  saveDB(db);

  return { status: "success", result: { order: db[idx] } };
}

export async function apiRejectOrder({ driverId, orderId }) {
  await sleep();
  // Doesn’t change order state in DB; just hides it from this driver.
  const rejectedKey = `driver_rejected_${driverId}`;
  const rejectedIds = JSON.parse(localStorage.getItem(rejectedKey) || "[]");
  const idNum = Number(orderId);
  if (!rejectedIds.includes(idNum)) {
    rejectedIds.push(idNum);
    localStorage.setItem(rejectedKey, JSON.stringify(rejectedIds));
  }
  return { status: "success", result: { rejected: true } };
}

export async function apiGetPaymentMethods() {
  await sleep();
  return { status: "success", result: { methods: seedPaymentMethods } };
}

export async function apiReceiveMoney({ driverId, orderId, method }) {
  await sleep();
  const db = loadDB();
  const idx = db.findIndex((o) => String(o.id) === String(orderId));
  if (idx === -1) return { status: "error", message: "Order not found" };

  const order = db[idx];
  if (order.driver_id !== driverId) return { status: "error", message: "Not your order" };
  if (order.state !== "in_delivery") return { status: "error", message: "Order not in delivery" };

  db[idx] = {
    ...order,
    state: "money_received",
    payment: {
      ...order.payment,
      status: "received",
      method,
      received_at: new Date().toISOString(),
    },
  };
  saveDB(db);
  return { status: "success", result: { order: db[idx] } };
}

export async function apiReturnMoney({ driverId, orderId }) {
  await sleep();
  const db = loadDB();
  const idx = db.findIndex((o) => String(o.id) === String(orderId));
  if (idx === -1) return { status: "error", message: "Order not found" };

  const order = db[idx];
  if (order.driver_id !== driverId) return { status: "error", message: "Not your order" };
  if (order.state !== "money_received") return { status: "error", message: "Money not received yet" };

  db[idx] = {
    ...order,
    state: "done",
    payment: {
      ...order.payment,
      status: "returned",
      returned_at: new Date().toISOString(),
    },
  };
  saveDB(db);
  return { status: "success", result: { order: db[idx] } };
}
