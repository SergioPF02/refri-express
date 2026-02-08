import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Booking from './pages/Booking';

import Quotation from './pages/Quotation';
import Success from './pages/Success';

import Dashboard from './pages/Dashboard';
import AdminDashboard from './pages/AdminDashboard';

import Login from './pages/Login';
import Register from './pages/Register';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import ClientOrders from './pages/ClientOrders';
import Profile from './pages/Profile';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/register" element={<Register />} />

          <Route path="/home" element={<ProtectedRoute requiredRole="client"><Home /></ProtectedRoute>} />
          <Route path="/booking" element={<ProtectedRoute requiredRole="client"><Booking /></ProtectedRoute>} />
          <Route path="/quotation" element={<ProtectedRoute requiredRole="client"><Quotation /></ProtectedRoute>} />
          <Route path="/success" element={<ProtectedRoute requiredRole="client"><Success /></ProtectedRoute>} />
          <Route path="/orders" element={<ProtectedRoute requiredRole="client"><ClientOrders /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />

          <Route
            path="/dashboard"
            element={
              <ProtectedRoute requiredRole="worker">
                <Dashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin"
            element={
              <ProtectedRoute requiredRole="admin">
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
