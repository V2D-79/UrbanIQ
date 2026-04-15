import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Navbar from "./components/Navbar";
import Chatbot from "./components/Chatbot";
import ProtectedRoute from "./components/ProtectedRoute";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Profile from "./pages/Profile";
import GeoTag from "./pages/GeoTag";
import CitizenDashboard from "./pages/CitizenDashboard";
import AdminGeoTag from "./pages/AdminGeoTag";
import AdminReports from "./pages/AdminReports";
import "./App.css";

function AppContent() {
  const { loading } = useAuth();

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner"><i className="fas fa-city fa-spin"></i></div>
        <p>Loading UrbanIQ...</p>
      </div>
    );
  }

  return (
    <div className="app">
      <Navbar />
      <main className="main-content">
        <Routes>
          {/* Public */}
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />

          {/* Protected - both roles */}
          <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />

          {/* Citizen routes */}
          <Route path="/geotag" element={<ProtectedRoute requiredRole="citizen"><GeoTag /></ProtectedRoute>} />
          <Route path="/dashboard" element={<ProtectedRoute requiredRole="citizen"><CitizenDashboard /></ProtectedRoute>} />

          {/* Authority routes */}
          <Route path="/admin/geotag" element={<ProtectedRoute requiredRole="authority"><AdminGeoTag /></ProtectedRoute>} />
          <Route path="/admin/reports" element={<ProtectedRoute requiredRole="authority"><AdminReports /></ProtectedRoute>} />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <Chatbot />
    </div>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </Router>
  );
}

export default App;
