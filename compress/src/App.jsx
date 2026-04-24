import AppRoutes from './routes/AppRoutes';

function App() {
  return (
    <AppRoutes />
  );
}

export default App;


// import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
// import DriverOrdersList from "./pages/DriverOrdersList";
// import DriverOrderDetails from "./pages/DriverOrderDetails";

// export default function App() {
//   // Demo driver identity (later comes from session/backend)
//   const driverId = "driver_1";

//   return (
//     <BrowserRouter>
//       <Routes>
//         <Route path="/" element={<Navigate to="/driver/orders" replace />} />
//         <Route path="/driver/orders" element={<DriverOrdersList driverId={driverId} />} />
//         <Route path="/driver/orders/:id" element={<DriverOrderDetails driverId={driverId} />} />
//       </Routes>
//     </BrowserRouter>
//   );
// }
