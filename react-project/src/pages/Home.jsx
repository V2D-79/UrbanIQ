import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { subscribeToStats } from "../services/firebaseService";
import "./Home.css";

const Home = () => {
  const { isAuthenticated, isAdmin, isCitizen, userProfile } = useAuth();
  const [stats, setStats] = useState({ totalReports: 0, resolvedReports: 0, inProgressReports: 0, satisfactionRate: 0 });

  useEffect(() => {
    const unsub = subscribeToStats(setStats);
    return () => unsub();
  }, []);

  const features = [
    { icon: "fas fa-map-marker-alt", title: "GeoTag Issues", description: "Pin maintenance issues directly on the map with precise location tagging for faster response.", color: "#10b981" },
    { icon: "fas fa-clipboard-check", title: "Track Progress", description: "Follow your report from submission to resolution with real-time status updates.", color: "#6366f1" },
    { icon: "fas fa-brain", title: "AI Analysis", description: "AI-powered issue prioritization and resolution suggestions for efficient city maintenance.", color: "#f59e0b" },
    { icon: "fas fa-star", title: "Give Feedback", description: "Rate the quality of repairs and help improve city services through transparent feedback.", color: "#ec4899" },
  ];

  const steps = [
    { step: "01", title: "Sign Up", desc: "Create your account as a Citizen or City Authority.", icon: "fas fa-user-plus" },
    { step: "02", title: "Report Issue", desc: "Describe the problem, upload photos, and select category.", icon: "fas fa-camera" },
    { step: "03", title: "GeoTag Location", desc: "Mark the exact location of the issue on the interactive map.", icon: "fas fa-map-marked-alt" },
    { step: "04", title: "Track Progress", desc: "Monitor repair progress with real-time updates from authorities.", icon: "fas fa-tasks" },
    { step: "05", title: "Give Feedback", desc: "Rate the completed work and help improve city services.", icon: "fas fa-thumbs-up" },
  ];

  const categories = [
    { icon: "fas fa-road", label: "Road Damage", color: "#ef4444" },
    { icon: "fas fa-trash", label: "Waste", color: "#f59e0b" },
    { icon: "fas fa-tint", label: "Water Supply", color: "#3b82f6" },
    { icon: "fas fa-lightbulb", label: "Street Lights", color: "#eab308" },
    { icon: "fas fa-water", label: "Drainage", color: "#06b6d4" },
    { icon: "fas fa-shield-alt", label: "Public Safety", color: "#8b5cf6" },
    { icon: "fas fa-tree", label: "Parks", color: "#22c55e" },
    { icon: "fas fa-bolt", label: "Electricity", color: "#f97316" },
  ];

  return (
    <div className="home">
      {/* Hero */}
      <section className="hero">
        <div className="hero-bg">
          <div className="hero-glow hero-glow-1"></div>
          <div className="hero-glow hero-glow-2"></div>
          <div className="hero-particles"></div>
        </div>
        <div className="hero-content container">
          <div className="hero-badge">
            <i className="fas fa-city"></i>
            <span>Smart City Citizen Management Platform</span>
          </div>
          <h1 className="hero-title">
            Urban<span className="hero-highlight">IQ</span>
            <br />Transparent City Care
          </h1>
          <p className="hero-subtitle">
            Report, track, and resolve city maintenance issues with full transparency.
            Empowering citizens and authorities with AI-powered infrastructure management.
          </p>
          <div className="hero-actions">
            {!isAuthenticated ? (
              <>
                <Link to="/signup" className="btn btn-primary btn-lg">
                  <i className="fas fa-rocket"></i> Get Started
                </Link>
                <Link to="/login" className="btn btn-secondary btn-lg">
                  <i className="fas fa-sign-in-alt"></i> Sign In
                </Link>
              </>
            ) : isAdmin ? (
              <>
                <Link to="/admin/geotag" className="btn btn-primary btn-lg">
                  <i className="fas fa-map-marked-alt"></i> Admin Map
                </Link>
                <Link to="/admin/reports" className="btn btn-secondary btn-lg">
                  <i className="fas fa-chart-bar"></i> Reports
                </Link>
              </>
            ) : (
              <>
                <Link to="/geotag" className="btn btn-primary btn-lg">
                  <i className="fas fa-map-marker-alt"></i> Report Issue
                </Link>
                <Link to="/dashboard" className="btn btn-secondary btn-lg">
                  <i className="fas fa-tachometer-alt"></i> My Dashboard
                </Link>
              </>
            )}
          </div>
          <div className="hero-stats">
            <div className="stat-item"><div className="stat-value">{stats.totalReports}</div><div className="stat-label">Total Reports</div></div>
            <div className="stat-item"><div className="stat-value">{stats.resolvedReports}</div><div className="stat-label">Resolved</div></div>
            <div className="stat-item"><div className="stat-value">{stats.inProgressReports}</div><div className="stat-label">In Progress</div></div>
            <div className="stat-item"><div className="stat-value">{stats.satisfactionRate}%</div><div className="stat-label">Satisfaction</div></div>
          </div>
        </div>
      </section>

      {/* About */}
      <section className="section about-section">
        <div className="container">
          <div className="section-header">
            <span className="section-tag">About</span>
            <h2>What is UrbanIQ?</h2>
            <p className="section-desc">
              UrbanIQ is a <strong>smart city platform</strong> where citizens can geotag and report
              maintenance issues, and city authorities can manage, track, and resolve them with
              full transparency on progress and repair status.
            </p>
          </div>
          <div className="about-grid">
            <div className="about-card">
              <i className="fas fa-users"></i>
              <h3>For Citizens</h3>
              <p>Report issues with photos and geolocation. Track repair progress in real-time and provide feedback on completion.</p>
            </div>
            <div className="about-card">
              <i className="fas fa-building"></i>
              <h3>For Authorities</h3>
              <p>View all reports on a map, detect hotspots, update progress with photos, and use AI for prioritization.</p>
            </div>
            <div className="about-card">
              <i className="fas fa-robot"></i>
              <h3>AI-Powered</h3>
              <p>Local AI model analyzes reports, suggests resolutions, and provides city-wide maintenance planning.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="section categories-section">
        <div className="container">
          <div className="section-header">
            <span className="section-tag">Categories</span>
            <h2>Report Any Issue</h2>
            <p className="section-desc">From potholes to power outages — report any city infrastructure issue.</p>
          </div>
          <div className="categories-grid">
            {categories.map((cat, i) => (
              <div key={i} className="category-card" style={{ "--cat-color": cat.color }}>
                <i className={cat.icon}></i>
                <span>{cat.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="section workflow-section">
        <div className="container">
          <div className="section-header">
            <span className="section-tag">Workflow</span>
            <h2>How It Works</h2>
            <p className="section-desc">From reporting an issue to seeing it resolved — 5 simple steps.</p>
          </div>
          <div className="workflow-timeline">
            {steps.map((item, i) => (
              <div key={i} className="workflow-step">
                <div className="step-number">{item.step}</div>
                <div className="step-icon"><i className={item.icon}></i></div>
                <h3>{item.title}</h3>
                <p>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="section features-section">
        <div className="container">
          <div className="section-header">
            <span className="section-tag">Features</span>
            <h2>Powerful Capabilities</h2>
            <p className="section-desc">Everything you need for transparent city maintenance management.</p>
          </div>
          <div className="features-grid">
            {features.map((feature, i) => (
              <div key={i} className="feature-card" style={{ "--feature-color": feature.color }}>
                <div className="feature-icon"><i className={feature.icon}></i></div>
                <h3>{feature.title}</h3>
                <p>{feature.description}</p>
                <div className="feature-glow"></div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Architecture */}
      <section className="section arch-section">
        <div className="container">
          <div className="section-header">
            <span className="section-tag">Architecture</span>
            <h2>System Architecture</h2>
          </div>
          <div className="arch-flow">
            <div className="arch-node"><div className="arch-icon"><i className="fas fa-mobile-alt"></i></div><span>Citizens</span></div>
            <div className="arch-arrow"><i className="fas fa-long-arrow-alt-right"></i></div>
            <div className="arch-node highlight"><div className="arch-icon"><i className="fab fa-react"></i></div><span>React Frontend</span></div>
            <div className="arch-arrow"><i className="fas fa-exchange-alt"></i></div>
            <div className="arch-node"><div className="arch-icon"><i className="fas fa-fire"></i></div><span>Firebase RTDB</span></div>
            <div className="arch-arrow"><i className="fas fa-exchange-alt"></i></div>
            <div className="arch-node highlight"><div className="arch-icon"><i className="fas fa-robot"></i></div><span>Python AI API</span></div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="container">
          <div className="footer-inner">
            <div className="footer-brand"><i className="fas fa-city"></i><span>UrbanIQ</span></div>
            <p className="footer-text">Smart City Citizen Management Platform — Transparent Infrastructure Care</p>
            <p className="footer-copy">&copy; 2026 UrbanIQ. Making cities smarter, one report at a time.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Home;
