import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { subscribeToUserReports, getProgressUpdates, addFeedback } from "../services/firebaseService";
import { generateReportPDF } from "../utils/pdfGenerator";
import "./CitizenDashboard.css";

const STATUS_LABELS = {
  submitted: "Submitted", under_review: "Under Review", in_progress: "In Progress",
  work_completed: "Work Completed", verified: "Verified", closed: "Closed",
};

const STATUS_ORDER = ["submitted", "under_review", "in_progress", "work_completed", "verified", "closed"];

const CATEGORIES = {
  road_damage: "Road Damage", waste_management: "Waste Management", water_supply: "Water Supply",
  street_lighting: "Street Lighting", drainage_sewage: "Drainage/Sewage", public_safety: "Public Safety",
  noise_pollution: "Noise Pollution", air_quality: "Air Quality", park_green_space: "Park/Green Space",
  public_transport: "Public Transport", building_structure: "Building/Structure", electricity: "Electricity", other: "Other",
};

const CitizenDashboard = () => {
  const { user } = useAuth();
  const [reports, setReports] = useState([]);
  const [selectedReport, setSelectedReport] = useState(null);
  const [progressUpdates, setProgressUpdates] = useState([]);
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackRating, setFeedbackRating] = useState(0);
  const [feedbackComment, setFeedbackComment] = useState("");
  const [toast, setToast] = useState(null);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!user) return;
    const unsub = subscribeToUserReports(user.uid, setReports);
    return () => unsub();
  }, [user]);

  useEffect(() => {
    if (selectedReport) {
      getProgressUpdates(selectedReport.id).then(setProgressUpdates);
    }
  }, [selectedReport]);

  const showToast = (msg, type = "info") => {
    setToast({ message: msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleDownloadPDF = async (report) => {
    const progress = await getProgressUpdates(report.id);
    generateReportPDF(report, progress, report.feedback);
    showToast("PDF downloaded!", "success");
  };

  const handleFeedbackSubmit = async () => {
    if (feedbackRating === 0) { showToast("Please select a rating", "warning"); return; }
    try {
      await addFeedback(selectedReport.id, {
        rating: feedbackRating,
        comment: feedbackComment,
        userId: user.uid,
      });
      showToast("Feedback submitted! Thank you! 🎉", "success");
      setShowFeedback(false);
      setFeedbackRating(0);
      setFeedbackComment("");
    } catch {
      showToast("Failed to submit feedback", "error");
    }
  };

  const filteredReports = reports
    .filter((r) => filter === "all" || r.status === filter)
    .filter((r) => !search || r.title?.toLowerCase().includes(search.toLowerCase()) || r.category?.toLowerCase().includes(search.toLowerCase()));

  const statCounts = {
    total: reports.length,
    submitted: reports.filter((r) => r.status === "submitted" || r.status === "under_review").length,
    inProgress: reports.filter((r) => r.status === "in_progress").length,
    resolved: reports.filter((r) => r.status === "work_completed" || r.status === "verified" || r.status === "closed").length,
  };

  return (
    <div className="dashboard-page">
      <div className="container">
        <div className="dashboard-header">
          <div>
            <h1><i className="fas fa-tachometer-alt"></i> My Dashboard</h1>
            <p>Track your reported issues and their resolution progress</p>
          </div>
        </div>

        {/* Stats Row */}
        <div className="dashboard-stats">
          <div className="dash-stat-card">
            <div className="dash-stat-icon si-blue"><i className="fas fa-clipboard-list"></i></div>
            <div><div className="dash-stat-value">{statCounts.total}</div><div className="dash-stat-label">Total Reports</div></div>
          </div>
          <div className="dash-stat-card">
            <div className="dash-stat-icon si-yellow"><i className="fas fa-clock"></i></div>
            <div><div className="dash-stat-value">{statCounts.submitted}</div><div className="dash-stat-label">Pending</div></div>
          </div>
          <div className="dash-stat-card">
            <div className="dash-stat-icon si-orange"><i className="fas fa-tools"></i></div>
            <div><div className="dash-stat-value">{statCounts.inProgress}</div><div className="dash-stat-label">In Progress</div></div>
          </div>
          <div className="dash-stat-card">
            <div className="dash-stat-icon si-green"><i className="fas fa-check-circle"></i></div>
            <div><div className="dash-stat-value">{statCounts.resolved}</div><div className="dash-stat-label">Resolved</div></div>
          </div>
        </div>

        {/* Filter & Search */}
        <div className="dashboard-toolbar">
          <div className="filter-tabs">
            {[{ key: "all", label: "All" }, { key: "submitted", label: "Submitted" }, { key: "in_progress", label: "In Progress" }, { key: "work_completed", label: "Completed" }].map((f) => (
              <button key={f.key} className={`filter-tab ${filter === f.key ? "active" : ""}`} onClick={() => setFilter(f.key)}>{f.label}</button>
            ))}
          </div>
          <div className="search-box">
            <i className="fas fa-search"></i>
            <input type="text" placeholder="Search reports..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </div>

        {/* Content */}
        <div className="dashboard-content">
          {/* Reports List */}
          <div className={`dashboard-list ${selectedReport ? "compressed" : ""}`}>
            {filteredReports.length === 0 ? (
              <div className="empty-state"><i className="fas fa-inbox"></i><p>No reports found</p></div>
            ) : (
              filteredReports.map((report) => (
                <div key={report.id} className={`dash-report-card ${selectedReport?.id === report.id ? "active" : ""}`}
                  onClick={() => setSelectedReport(report)}>
                  <div className="dash-report-header">
                    <h3>{report.title}</h3>
                    <span className={`badge badge-${report.status}`}>{STATUS_LABELS[report.status]}</span>
                  </div>
                  <div className="dash-report-meta">
                    <span><i className="fas fa-tag"></i> {CATEGORIES[report.category] || report.category}</span>
                    <span className={`severity-dot severity-${report.severity}`}><i className="fas fa-exclamation-circle"></i> {report.severity}</span>
                    <span><i className="fas fa-calendar"></i> {report.createdAt ? new Date(report.createdAt).toLocaleDateString() : "N/A"}</span>
                  </div>
                  <p className="dash-report-desc">{(report.description || "").substring(0, 120)}{report.description?.length > 120 ? "..." : ""}</p>
                  <div className="dash-report-actions">
                    <button className="btn btn-sm btn-secondary" onClick={(e) => { e.stopPropagation(); handleDownloadPDF(report); }}>
                      <i className="fas fa-file-pdf"></i> PDF
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Detail Panel */}
          {selectedReport && (
            <div className="dashboard-detail">
              <div className="detail-header">
                <h2>{selectedReport.title}</h2>
                <button className="modal-close" onClick={() => setSelectedReport(null)}><i className="fas fa-times"></i></button>
              </div>

              <div className="detail-badges">
                <span className={`badge badge-${selectedReport.status}`}>{STATUS_LABELS[selectedReport.status]}</span>
                <span className={`badge badge-${selectedReport.severity}`}>{selectedReport.severity}</span>
                <span className="badge badge-submitted">{CATEGORIES[selectedReport.category] || selectedReport.category}</span>
              </div>

              {/* Status Timeline */}
              <div className="status-timeline">
                <h4><i className="fas fa-stream"></i> Status Timeline</h4>
                <div className="timeline">
                  {STATUS_ORDER.map((status, i) => {
                    const currentIndex = STATUS_ORDER.indexOf(selectedReport.status);
                    const isCompleted = i <= currentIndex;
                    const isCurrent = i === currentIndex;
                    return (
                      <div key={status} className={`timeline-step ${isCompleted ? "completed" : ""} ${isCurrent ? "current" : ""}`}>
                        <div className="timeline-dot">
                          {isCompleted ? <i className="fas fa-check"></i> : <span>{i + 1}</span>}
                        </div>
                        <span className="timeline-label">{STATUS_LABELS[status]}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Report Details */}
              <div className="detail-info">
                <h4><i className="fas fa-info-circle"></i> Details</h4>
                <div className="detail-fields">
                  <div className="detail-field"><label>Description</label><p>{selectedReport.description}</p></div>
                  <div className="detail-field"><label>Address</label><span>{selectedReport.address || "N/A"}</span></div>
                  <div className="detail-field"><label>Ward/Zone</label><span>{selectedReport.wardZone || "N/A"}</span></div>
                  <div className="detail-field"><label>Landmark</label><span>{selectedReport.landmark || "N/A"}</span></div>
                  <div className="detail-field"><label>Location</label><span>{selectedReport.lat ? `${Number(selectedReport.lat).toFixed(5)}, ${Number(selectedReport.lng).toFixed(5)}` : "N/A"}</span></div>
                  <div className="detail-field"><label>Reported</label><span>{selectedReport.createdAt ? new Date(selectedReport.createdAt).toLocaleString() : "N/A"}</span></div>
                </div>

                {/* Images */}
                {selectedReport.images?.length > 0 && (
                  <div className="detail-images">
                    <label>Attached Images</label>
                    <div className="images-grid">
                      {selectedReport.images.map((img, i) => (
                        <img key={i} src={img} alt={`Report ${i + 1}`} className="detail-image" />
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Progress Updates from Authority */}
              {progressUpdates.length > 0 && (
                <div className="detail-progress">
                  <h4><i className="fas fa-tasks"></i> Progress Updates</h4>
                  {progressUpdates.map((p) => (
                    <div key={p.id} className="progress-item">
                      <div className="progress-item-header">
                        <span className={`badge badge-${p.status}`}>{STATUS_LABELS[p.status] || p.status}</span>
                        <span className="progress-date">{p.createdAt ? new Date(p.createdAt).toLocaleString() : ""}</span>
                      </div>
                      <p className="progress-desc">{p.description}</p>
                      <div className="progress-by">By: {p.authorityName || "Authority"}</div>
                      {p.images?.length > 0 && (
                        <div className="progress-images">
                          {p.images.map((img, i) => <img key={i} src={img} alt={`Progress ${i + 1}`} />)}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Feedback Section - Only show when work is completed */}
              {(selectedReport.status === "work_completed" || selectedReport.status === "verified" || selectedReport.status === "closed") && (
                <div className="detail-feedback">
                  {selectedReport.feedback ? (
                    <div className="feedback-display">
                      <h4><i className="fas fa-star"></i> Your Feedback</h4>
                      <div className="feedback-stars">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <i key={s} className={`fas fa-star ${s <= selectedReport.feedback.rating ? "active" : ""}`}></i>
                        ))}
                      </div>
                      <p>{selectedReport.feedback.comment || "No comment"}</p>
                    </div>
                  ) : showFeedback ? (
                    <div className="feedback-form">
                      <h4><i className="fas fa-star"></i> Rate This Resolution</h4>
                      <div className="feedback-stars interactive">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <i key={s} className={`fas fa-star ${s <= feedbackRating ? "active" : ""}`}
                            onClick={() => setFeedbackRating(s)}></i>
                        ))}
                      </div>
                      <textarea className="form-control" placeholder="Share your experience (optional)" value={feedbackComment} onChange={(e) => setFeedbackComment(e.target.value)} rows={3} />
                      <div className="feedback-actions">
                        <button className="btn btn-primary flex-1" onClick={handleFeedbackSubmit}>
                          <i className="fas fa-paper-plane"></i> Submit Feedback
                        </button>
                        <button className="btn btn-ghost flex-1" onClick={() => setShowFeedback(false)}>Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <button className="btn btn-success w-full" onClick={() => setShowFeedback(true)}>
                      <i className="fas fa-star"></i> Give Feedback
                    </button>
                  )}
                </div>
              )}

              <div className="detail-actions-row">
                <button className="btn btn-secondary flex-1" onClick={() => handleDownloadPDF(selectedReport)}>
                  <i className="fas fa-file-pdf"></i> Download PDF
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {toast && <div className="toast-container"><div className={`toast toast-${toast.type}`}>{toast.message}</div></div>}
    </div>
  );
};

export default CitizenDashboard;
