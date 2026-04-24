// Demo data format = what Odoo backend should return later.
export const seedOrders = [
  {
    id: 101,
    name: "SO101",
    date: "2026-01-15",
    state: "pending", // pending | in_delivery | money_received | done
    driver_id: null,  // assigned when accepted
    branch: { id: 1, name: "Branch A" },

    customer: {
      id: 501,
      name: "Ahmed Ali",
      phone: "+31611111111",
      country_id: 150,  // NL dummy
      state_id: 10,
      street: "Main St 10",
      street2: "Apt 2",
      city: "Amsterdam",
      landmark: "Near Park",
    },

    totals: { amount_total: 40.0, currency: "€" },
    lines: [
      { id: 1, product: "Burger", qty: 2, price: 10 },
      { id: 2, product: "Fries", qty: 1, price: 5 },
      { id: 3, product: "Drink", qty: 3, price: 5 },
    ],

    payment: {
      status: "unpaid", // unpaid | received | returned
      method: null,     // cash | visa | credit_card
      received_at: null,
      returned_at: null,
    },
  },

  {
    id: 102,
    name: "SO102",
    date: "2026-01-14",
    state: "pending",
    driver_id: null,
    branch: { id: 2, name: "Branch B" },
    customer: {
      id: 502,
      name: "Sara Noor",
      phone: "+31622222222",
      country_id: 150,
      state_id: 11,
      street: "River Rd 3",
      street2: "",
      city: "Utrecht",
      landmark: "Blue building",
    },
    totals: { amount_total: 22.5, currency: "€" },
    lines: [{ id: 4, product: "Salad", qty: 3, price: 7.5 }],
    payment: { status: "unpaid", method: null, received_at: null, returned_at: null },
  },

  {
    id: 103,
    name: "SO103",
    date: "2026-01-13",
    state: "in_delivery",
    driver_id: "driver_1", // already accepted by driver_1
    branch: { id: 1, name: "Branch A" },
    customer: {
      id: 503,
      name: "Omar Zaid",
      phone: "+31633333333",
      country_id: 150,
      state_id: 12,
      street: "Lake Ave 12",
      street2: "Floor 1",
      city: "Rotterdam",
      landmark: "",
    },
    totals: { amount_total: 18.0, currency: "€" },
    lines: [{ id: 5, product: "Pizza", qty: 1, price: 18 }],
    payment: { status: "unpaid", method: null, received_at: null, returned_at: null },
  },

  {
    id: 104,
    name: "SO104",
    date: "2026-01-10",
    state: "done",
    driver_id: "driver_1",
    branch: { id: 2, name: "Branch B" },
    customer: {
      id: 504,
      name: "Lina Hassan",
      phone: "+31644444444",
      country_id: 150,
      state_id: 13,
      street: "Sunset 1",
      street2: "",
      city: "Haarlem",
      landmark: "Mall gate",
    },
    totals: { amount_total: 55.0, currency: "€" },
    lines: [{ id: 6, product: "Family Meal", qty: 1, price: 55 }],
    payment: { status: "received", method: "cash", received_at: "2026-01-10T16:00:00Z", returned_at: null },
  },
];

// Payment methods fake endpoint
export const seedPaymentMethods = [
  { id: "cash", name: "Cash" },
  { id: "visa", name: "Visa" },
  { id: "credit_card", name: "Credit Card" },
];
