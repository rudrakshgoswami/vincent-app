import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './layouts/Layout';
import AdminLayout from './layouts/AdminLayout';
import Home from './pages/Home';
import Menu from './pages/Menu';
import Reservations from './pages/Reservations';

import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';
import Register from './pages/Register';
import Login from './pages/Login';
import VerifyOtp from './pages/VerifyOtp';
import Profile from './pages/Profile';
import Contact from './pages/Contact';
import RequireAuth from './components/RequireAuth';
import Order from './pages/Order';
import Checkout from './pages/Checkout';
import MyOrders from './pages/MyOrders';
import MyMessages from './pages/MyMessages';
import './index.css';

import { CartProvider } from './context/CartContext';
import { AuthProvider } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';

// Import admin pages
import AdminOrders from './pages/admin/Orders';
import AdminReservations from './pages/admin/Reservations';

import AdminMenuManagement from './pages/admin/MenuManagement';
import AdminUsers from './pages/admin/UserManagement';
import AdminTableManagement from './pages/admin/TableManagement';
import AdminAdvancedAnalytics from './pages/admin/AdminAdvancedAnalytics';
// Table Reservation System
import TableReservation from './pages/TableReservation';
import MyTableReservations from './pages/MyTableReservations';

import AdminProfile from './pages/admin/Profile';
import AdminContactMessages from './pages/admin/ContactMessages';

// Admin Venue System
import AdminVenueManagement from './pages/admin/VenueManagement';
import AdminVenueBookings from './pages/admin/VenueBookings';
import AdminCateringManagement from './pages/admin/CateringManagement';



// Venue Booking System
import VenueListing from './pages/venues/VenueListing';
import VenueDetails from './pages/venues/VenueDetails';
import VenueBooking from './pages/venues/VenueBooking';
import MyVenueBookings from './pages/venues/MyVenueBookings';

// Catering Booking System
import CateringSelection from './pages/CateringSelection';

// Error boundary to catch silent render crashes
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, info) {
    console.error('🔴 React ErrorBoundary caught:', error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 40, fontFamily: 'monospace', background: '#fff5f5', minHeight: '100vh' }}>
          <h1 style={{ color: '#e53e3e' }}>⚠️ Application Error</h1>
          <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all', color: '#c53030' }}>
            {this.state.error?.message || 'Unknown error'}
          </pre>
          <pre style={{ fontSize: 12, color: '#666', marginTop: 10 }}>
            {this.state.error?.stack}
          </pre>
          <button onClick={() => window.location.reload()} style={{ marginTop: 20, padding: '10px 20px', cursor: 'pointer' }}>
            Reload Page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <AuthProvider>
        <SocketProvider>
          <CartProvider>
            <BrowserRouter>
              <Routes>
                {/* Auth Routes */}
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/verify-otp" element={<VerifyOtp />} />

                {/* Public & Protected User Routes */}
                <Route path="/" element={<Layout />}>
                  <Route index element={<Home />} />
                  <Route path="menu" element={<Menu />} />
                  <Route path="reservations" element={<Reservations />} />
                  <Route path="contact" element={<Contact />} />
                  <Route path="venues" element={<VenueListing />} />
                  <Route path="venues/:id" element={<VenueDetails />} />
                  <Route path="venues/:id/book" element={
                    <RequireAuth>
                      <VenueBooking />
                    </RequireAuth>
                  } />
                  <Route path="catering" element={
                    <RequireAuth>
                      <CateringSelection />
                    </RequireAuth>
                  } />

                  {/* Protected Routes */}
                  <Route path="order" element={
                    <RequireAuth>
                      <Order />
                    </RequireAuth>
                  } />
                  <Route path="checkout" element={
                    <RequireAuth>
                      <Checkout />
                    </RequireAuth>
                  } />
                  <Route path="my-orders" element={
                    <RequireAuth>
                      <MyOrders />
                    </RequireAuth>
                  } />
                  <Route path="my-venue-bookings" element={
                    <RequireAuth>
                      <MyVenueBookings />
                    </RequireAuth>
                  } />
                  <Route path="reserve-table" element={
                    <RequireAuth>
                      <TableReservation />
                    </RequireAuth>
                  } />
                  <Route path="my-table-reservations" element={
                    <RequireAuth>
                      <MyTableReservations />
                    </RequireAuth>
                  } />

                  <Route path="profile" element={
                    <RequireAuth>
                      <Profile />
                    </RequireAuth>
                  } />
                  <Route path="my-messages" element={
                    <RequireAuth>
                      <MyMessages />
                    </RequireAuth>
                  } />
                </Route>

                {/* Admin Routes */}
                <Route path="/admin/login" element={<AdminLogin />} />
                <Route path="/admin" element={<AdminLayout />}>
                  <Route index element={<Navigate to="/admin/dashboard" replace />} />
                  <Route path="dashboard" element={<AdminDashboard />} />
                  <Route path="orders" element={<AdminOrders />} />
                  <Route path="reservations" element={<AdminReservations />} />
                  <Route path="menu" element={<AdminMenuManagement />} />
                  <Route path="users" element={<AdminUsers />} />
                  <Route path="tables" element={<AdminTableManagement />} />
                  <Route path="analytics" element={<AdminAdvancedAnalytics />} />
                  <Route path="messages" element={<AdminContactMessages />} />
                  <Route path="venues" element={<AdminVenueManagement />} />
                  <Route path="venue-bookings" element={<AdminVenueBookings />} />
                  <Route path="catering" element={<AdminCateringManagement />} />


                  <Route path="profile" element={<AdminProfile />} />
                </Route>
              </Routes>
            </BrowserRouter>
          </CartProvider>
        </SocketProvider>
      </AuthProvider>
    </ErrorBoundary>
  </React.StrictMode>,
);
