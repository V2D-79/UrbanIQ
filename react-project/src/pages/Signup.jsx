import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "./Login.css"; // shared styles

const Signup = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState("citizen");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { signup } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name || !email || !password) { setError("Please fill in all required fields"); return; }
    if (password.length < 6) { setError("Password must be at least 6 characters"); return; }
    if (password !== confirmPassword) { setError("Passwords do not match"); return; }
    setError("");
    setLoading(true);
    try {
      await signup(email, password, name, phone, role);
      navigate("/");
    } catch (err) {
      if (err.code === "auth/email-already-in-use") setError("An account with this email already exists");
      else if (err.code === "auth/weak-password") setError("Password is too weak. Use at least 6 characters");
      else if (err.code === "auth/invalid-email") setError("Invalid email address");
      else setError("Signup failed. Please try again.");
    }
    setLoading(false);
  };

  return (
    <div className="auth-page">
      <div className="auth-bg">
        <div className="auth-glow auth-glow-1"></div>
        <div className="auth-glow auth-glow-2"></div>
        <div className="auth-grid-pattern"></div>
      </div>
      <div className="auth-container" style={{ maxWidth: 480 }}>
        <div className="auth-card">
          <div className="auth-header">
            <div className="auth-logo">
              <i className="fas fa-city"></i>
            </div>
            <h1>UrbanIQ</h1>
            <p>Smart City Citizen Management</p>
          </div>

          <form onSubmit={handleSubmit} className="auth-form">
            <h2>Create Account</h2>
            <p className="auth-subtitle">Join UrbanIQ to report and track city issues</p>

            {error && <div className="auth-error"><i className="fas fa-exclamation-circle"></i> {error}</div>}

            {/* Role Selection */}
            <div className="form-group">
              <label>I am a</label>
              <div className="role-selector">
                <div className={`role-option ${role === "citizen" ? "active" : ""}`} onClick={() => setRole("citizen")}>
                  <i className="fas fa-user"></i>
                  <span>Citizen</span>
                </div>
                <div className={`role-option ${role === "authority" ? "active" : ""}`} onClick={() => setRole("authority")}>
                  <i className="fas fa-building"></i>
                  <span>Authority</span>
                </div>
              </div>
            </div>

            <div className="form-group">
              <label><i className="fas fa-user"></i> Full Name *</label>
              <input type="text" className="form-control" placeholder="Enter your full name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>

            <div className="form-group">
              <label><i className="fas fa-envelope"></i> Email *</label>
              <input type="email" className="form-control" placeholder="Enter your email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
            </div>

            <div className="form-group">
              <label><i className="fas fa-phone"></i> Phone Number</label>
              <input type="tel" className="form-control" placeholder="Enter your phone number" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>

            <div className="form-group">
              <label><i className="fas fa-lock"></i> Password *</label>
              <input type="password" className="form-control" placeholder="Create a password (min 6 chars)" value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>

            <div className="form-group">
              <label><i className="fas fa-lock"></i> Confirm Password *</label>
              <input type="password" className="form-control" placeholder="Confirm your password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
            </div>

            <button type="submit" className="btn btn-primary w-full btn-lg" disabled={loading}>
              {loading ? <><i className="fas fa-spinner fa-spin"></i> Creating Account...</> : <><i className="fas fa-user-plus"></i> Create Account</>}
            </button>

            <p className="auth-footer-text">
              Already have an account? <Link to="/login">Sign In</Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Signup;
