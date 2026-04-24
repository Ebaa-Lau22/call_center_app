import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import NewOrder from '../pages/NewOrder';
import SaleOrders from '../pages/SaleOrdersLayout';
import SaleOrderDetail from '../pages/OrderDetails';
import LoginPage from '../pages/Login';
import DriverOrdersList from "../pages/DriverOrdersList";
import DriverOrderDetails from "../pages/DriverOrderDetails";

function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Default Route: Redirects to the Orders List or New Order */}
        <Route path="/" element={<Navigate to="/login" replace />} />

        {/* Login View */}
        <Route path="/login" element={<LoginPage />} />

        {/* Orders List View */}
        <Route path="/orders" element={<SaleOrders />} />
        
        {/* Create New Order - Uses OrderForm component */}
        <Route path="/orders/new" element={<NewOrder />} />
        
        {/* Edit Draft Order - Uses OrderForm component with orderId param */}
        <Route path="/orders/:id/edit" element={<NewOrder />} />
        
        {/* View Order Detail (Read-only for confirmed/done orders) */}
        <Route path="/orders/:id" element={<SaleOrderDetail />} />

        <Route path="/driver/orders" element={<DriverOrdersList />} />
        <Route path="/driver/orders/:id" element={<DriverOrderDetails />} />
      </Routes>
    </BrowserRouter>
  );
}

export default AppRoutes;