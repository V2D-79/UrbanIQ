import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const ProtectedRoute = ({ children, requiredRole }) => {
  const { user, userProfile, loading } = useAuth();

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner">
          <i className="fas fa-city fa-spin"></i>
        </div>
        <p>Loading UrbanIQ...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole && userProfile?.role !== requiredRole) {
    // Redirect to appropriate home
    if (userProfile?.role === "authority") {
      return <Navigate to="/admin/geotag" replace />;
    }
    return <Navigate to="/geotag" replace />;
  }

  return children;
};

export default ProtectedRoute;
