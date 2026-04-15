import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "./Navbar.css";

const Navbar = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, userProfile, isAdmin, logout } = useAuth();

  const citizenLinks = [
    { path: "/", label: "Home", icon: "fas fa-home" },
    { path: "/geotag", label: "GeoTag", icon: "fas fa-map-marker-alt" },
    { path: "/dashboard", label: "Dashboard", icon: "fas fa-tachometer-alt" },
  ];

  const adminLinks = [
    { path: "/", label: "Home", icon: "fas fa-home" },
    { path: "/admin/geotag", label: "GeoTag", icon: "fas fa-map-marked-alt" },
    { path: "/admin/reports", label: "Reports", icon: "fas fa-chart-bar" },
  ];

  const publicLinks = [
    { path: "/", label: "Home", icon: "fas fa-home" },
  ];

  const navLinks = !user ? publicLinks : isAdmin ? adminLinks : citizenLinks;

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        <Link to="/" className="navbar-brand">
          <div className="brand-icon"><i className="fas fa-city"></i></div>
          <span className="brand-text">UrbanIQ</span>
        </Link>

        <div className={`navbar-links ${menuOpen ? "open" : ""}`}>
          {navLinks.map((link) => (
            <Link key={link.path} to={link.path}
              className={`nav-link ${location.pathname === link.path ? "active" : ""}`}
              onClick={() => setMenuOpen(false)}>
              <i className={link.icon}></i><span>{link.label}</span>
            </Link>
          ))}
        </div>

        <div className="navbar-right">
          {user ? (
            <>
              <div className="nav-role-badge">
                <i className={`fas ${isAdmin ? "fa-building" : "fa-user"}`}></i>
                <span>{isAdmin ? "Authority" : "Citizen"}</span>
              </div>
              <Link to="/profile" className="nav-profile-btn" title="Profile">
                <div className="nav-avatar">{(userProfile?.name || "U")[0].toUpperCase()}</div>
              </Link>
              <button className="btn btn-sm btn-ghost nav-logout" onClick={handleLogout} title="Log out">
                <i className="fas fa-sign-out-alt"></i>
              </button>
            </>
          ) : (
            <div className="nav-auth-btns">
              <Link to="/login" className="btn btn-sm btn-ghost">Sign In</Link>
              <Link to="/signup" className="btn btn-sm btn-primary">Get Started</Link>
            </div>
          )}
          <button className="menu-toggle" onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle menu">
            <i className={`fas ${menuOpen ? "fa-times" : "fa-bars"}`}></i>
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
