import { useState, useEffect } from "react";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { subscribeToAllReports, subscribeToStats, saveAIAnalysis, addProgressUpdate, deleteReport } from "../services/firebaseService";
import { analyzeReport, analyzeAllReports, getAISuggestion, checkAIHealth, getAIModelStatus, loadAIModel } from "../services/aiService";
import { generateAllReportsPDF, generateReportPDF } from "../utils/pdfGenerator";
import { useAuth } from "../context/AuthContext";
import { motion } from "framer-motion";
import "./AdminReports.css";

const STATUS_LABELS = {
  submitted: "Submitted", under_review: "Under Review", in_progress: "In Progress",
  work_completed: "Work Completed", verified: "Verified", closed: "Closed",
};
const CATEGORIES = {
  road_damage: "Road Damage", waste_management: "Waste Management", water_supply: "Water Supply",
  street_lighting: "Street Lighting", drainage_sewage: "Drainage/Sewage", public_safety: "Public Safety",
  noise_pollution: "Noise Pollution", air_quality: "Air Quality", park_green_space: "Park/Green Space",
  public_transport: "Public Transport", building_structure: "Building/Structure", electricity: "Electricity", other: "Other",
};
const CAT_COLORS = ["#ef4444", "#f59e0b", "#3b82f6", "#eab308", "#06b6d4", "#8b5cf6", "#ec4899", "#14b8a6", "#22c55e", "#6366f1", "#f97316", "#fbbf24", "#94a3b8"];
const STATUS_COLORS = { submitted: "#3b82f6", under_review: "#f59e0b", in_progress: "#f97316", work_completed: "#22c55e", verified: "#10b981", closed: "#64748b" };

const AdminReports = () => {
  const { user, userProfile } = useAuth();
  const [reports, setReports] = useState([]);
  const [stats, setStats] = useState({});
  const [selectedReport, setSelectedReport] = useState(null);
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [aiSuggestion, setAiSuggestion] = useState(null);
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAILoading] = useState(false);
  const [aiStatus, setAiStatus] = useState("checking");
  const [modelStatus, setModelStatus] = useState("unknown");
  const [toast, setToast] = useState(null);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [sortConfig, setSortConfig] = useState({ key: "createdAt", dir: "desc" });

  useEffect(() => {
    const u1 = subscribeToAllReports(setReports);
    const u2 = subscribeToStats(setStats);
    return () => { u1(); u2(); };
  }, []);

  useEffect(() => {
    checkAIHealth().then((r) => setAiStatus(r.status === "healthy" ? "online" : "offline"));
    getAIModelStatus().then((r) => setModelStatus(r.model_status || "unknown"));
  }, []);

  const showToast = (msg, type = "info") => { setToast({ message: msg, type }); setTimeout(() => setToast(null), 3000); };

  // AI batch analysis
  const runBatchAnalysis = async () => {
    if (reports.length === 0) return;
    setAILoading(true);
    try {
      const result = await analyzeAllReports(reports);
      setAiAnalysis(result);
      await saveAIAnalysis({ type: "batch", ...result });
      showToast("AI analysis complete!", "success");
    } catch { showToast("Analysis failed", "error"); }
    setAILoading(false);
  };

  // AI single report suggestion
  const runAISuggestion = async (report) => {
    setAILoading(true);
    try {
      const result = await getAISuggestion(report);
      setAiSuggestion(result);
      showToast("AI suggestion ready!", "success");
    } catch { showToast("Suggestion failed", "error"); }
    setAILoading(false);
  };

  const handleLoadModel = async () => {
    await loadAIModel();
    setModelStatus("loading");
    setTimeout(() => getAIModelStatus().then((r) => setModelStatus(r.model_status)), 5000);
  };

  const handleDeleteReport = async (report) => {
    if (!window.confirm(`Delete "${report.title}"?`)) return;
    try { await deleteReport(report.id); setSelectedReport(null); showToast("Deleted", "success"); }
    catch { showToast("Failed", "error"); }
  };

  // Chart data
  const catData = Object.entries(stats.categoryBreakdown || {}).map(([name, value]) => ({
    name: CATEGORIES[name] || name, value,
  })).filter((d) => d.value > 0);

  const statusData = Object.entries(
    reports.reduce((acc, r) => { acc[r.status] = (acc[r.status] || 0) + 1; return acc; }, {})
  ).map(([name, value]) => ({ name: STATUS_LABELS[name] || name, value, fill: STATUS_COLORS[name] || "#666" }));

  // Sorting & filtering
  const sorted = [...reports].sort((a, b) => {
    const dir = sortConfig.dir === "asc" ? 1 : -1;
    if (sortConfig.key === "createdAt") return dir * (new Date(a.createdAt || 0) - new Date(b.createdAt || 0));
    return dir * String(a[sortConfig.key] || "").localeCompare(String(b[sortConfig.key] || ""));
  });
  const filtered = sorted
    .filter((r) => filterStatus === "all" || r.status === filterStatus)
    .filter((r) => !search || r.title?.toLowerCase().includes(search.toLowerCase()) || r.category?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="admin-reports-page">
      <div className="container">
        {/* Header */}
        <div className="ar-header">
          <div>
            <h1><i className="fas fa-chart-bar"></i> Reports & AI Analysis</h1>
            <p>Manage all citizen reports with AI-powered insights</p>
          </div>
          <div className="ar-header-right">
            <div className={`ai-status ${aiStatus}`}><span className="status-dot"></span> API: {aiStatus}</div>
            <div className={`ai-status ${modelStatus === "ready" ? "online" : "offline"}`}><span className="status-dot"></span> AI: {modelStatus}</div>
            {modelStatus !== "ready" && <button className="btn btn-sm btn-secondary" onClick={handleLoadModel}><i className="fas fa-download"></i> Load Model</button>}
            <button className="btn btn-primary" onClick={runBatchAnalysis} disabled={aiLoading || reports.length === 0}>
              <i className={`fas ${aiLoading ? "fa-spinner fa-spin" : "fa-brain"}`}></i> AI Analysis
            </button>
            <button className="btn btn-secondary" onClick={() => generateAllReportsPDF(reports, stats)}>
              <i className="fas fa-file-pdf"></i> Export PDF
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="ar-stats">
          <div className="dash-stat-card"><div className="dash-stat-icon si-blue"><i className="fas fa-clipboard-list"></i></div><div><div className="dash-stat-value">{stats.totalReports || reports.length}</div><div className="dash-stat-label">Total</div></div></div>
          <div className="dash-stat-card"><div className="dash-stat-icon si-green"><i className="fas fa-check-circle"></i></div><div><div className="dash-stat-value">{stats.resolvedReports || 0}</div><div className="dash-stat-label">Resolved</div></div></div>
          <div className="dash-stat-card"><div className="dash-stat-icon si-orange"><i className="fas fa-tools"></i></div><div><div className="dash-stat-value">{stats.inProgressReports || 0}</div><div className="dash-stat-label">In Progress</div></div></div>
          <div className="dash-stat-card"><div className="dash-stat-icon si-yellow"><i className="fas fa-star"></i></div><div><div className="dash-stat-value">{stats.satisfactionRate || 0}%</div><div className="dash-stat-label">Satisfaction</div></div></div>
        </div>

        {/* Charts */}
        {(catData.length > 0 || statusData.length > 0) && (
          <div className="ar-charts">
            <div className="chart-card">
              <h3><i className="fas fa-chart-pie"></i> By Category</h3>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={catData} cx="50%" cy="50%" outerRadius={80} innerRadius={40} paddingAngle={3} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                    {catData.map((_, i) => <Cell key={i} fill={CAT_COLORS[i % CAT_COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: "#1a2332", border: "1px solid rgba(16,185,129,0.2)", borderRadius: "8px", color: "#e5e9f0" }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="chart-card">
              <h3><i className="fas fa-chart-bar"></i> By Status</h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={statusData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="name" tick={{ fill: "#94a3b8", fontSize: 10 }} />
                  <YAxis tick={{ fill: "#94a3b8" }} />
                  <Tooltip contentStyle={{ background: "#1a2332", border: "1px solid rgba(16,185,129,0.2)", borderRadius: "8px", color: "#e5e9f0" }} />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                    {statusData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* AI Batch Analysis Result */}
        {aiAnalysis?.analysis && (
          <div className="ar-ai-card">
            <div className="ar-ai-header">
              <h3><i className="fas fa-robot"></i> AI City-Wide Analysis</h3>
              <span className="ar-ai-meta">Model: {aiAnalysis.model} | {new Date(aiAnalysis.timestamp).toLocaleString()}</span>
            </div>
            <div className="ar-ai-text">{aiAnalysis.analysis}</div>
          </div>
        )}

        {/* Reports Table */}
        <div className="ar-table-card">
          <div className="ar-table-header">
            <h3><i className="fas fa-list"></i> All Reports ({filtered.length})</h3>
            <div className="ar-table-filters">
              <select className="form-control" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} style={{ width: 160 }}>
                <option value="all">All Status</option>
                {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
              <div className="search-box">
                <i className="fas fa-search"></i>
                <input type="text" placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="empty-state"><i className="fas fa-inbox"></i><p>No reports found</p></div>
          ) : (
            <div className="ar-table-wrapper">
              <table className="ar-table">
                <thead>
                  <tr>
                    <th onClick={() => setSortConfig({ key: "title", dir: sortConfig.key === "title" && sortConfig.dir === "asc" ? "desc" : "asc" })}>Title</th>
                    <th onClick={() => setSortConfig({ key: "category", dir: sortConfig.key === "category" && sortConfig.dir === "asc" ? "desc" : "asc" })}>Category</th>
                    <th>Severity</th>
                    <th onClick={() => setSortConfig({ key: "status", dir: sortConfig.key === "status" && sortConfig.dir === "asc" ? "desc" : "asc" })}>Status</th>
                    <th>Reporter</th>
                    <th onClick={() => setSortConfig({ key: "createdAt", dir: sortConfig.key === "createdAt" && sortConfig.dir === "asc" ? "desc" : "asc" })}>Date</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r) => (
                    <tr key={r.id} className={selectedReport?.id === r.id ? "active-row" : ""} onClick={() => { setSelectedReport(r); setAiSuggestion(null); }}>
                      <td className="td-title">{(r.title || "Untitled").substring(0, 35)}</td>
                      <td className="td-cat">{CATEGORIES[r.category] || r.category}</td>
                      <td><span className={`badge badge-${r.severity}`}>{r.severity}</span></td>
                      <td><span className={`badge badge-${r.status}`}>{STATUS_LABELS[r.status]}</span></td>
                      <td className="td-reporter">{r.userName || "N/A"}</td>
                      <td className="td-date">{r.createdAt ? new Date(r.createdAt).toLocaleDateString() : "N/A"}</td>
                      <td>
                        <div className="td-actions">
                          <button className="btn btn-sm btn-secondary" onClick={(e) => { e.stopPropagation(); runAISuggestion(r); }} title="AI Suggestion" disabled={aiLoading}>
                            <i className="fas fa-brain"></i>
                          </button>
                          <button className="btn btn-sm btn-ghost" onClick={(e) => { e.stopPropagation(); generateReportPDF(r); }} title="Download PDF">
                            <i className="fas fa-file-pdf"></i>
                          </button>
                          <button className="btn btn-sm btn-danger" onClick={(e) => { e.stopPropagation(); handleDeleteReport(r); }} title="Delete">
                            <i className="fas fa-trash"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* AI Suggestion Panel */}
        {aiSuggestion?.suggestion && (
          <div className="ar-ai-card">
            <div className="ar-ai-header">
              <h3><i className="fas fa-lightbulb"></i> AI Suggestion — {aiSuggestion.report_title}</h3>
              <button className="modal-close" onClick={() => setAiSuggestion(null)}><i className="fas fa-times"></i></button>
            </div>
            <div className="ar-ai-text">{aiSuggestion.suggestion}</div>
            <div className="ar-ai-meta">Model: {aiSuggestion.model} | {new Date(aiSuggestion.timestamp).toLocaleString()}</div>
          </div>
        )}
      </div>

      {toast && <div className="toast-container"><div className={`toast toast-${toast.type}`}>{toast.message}</div></div>}
    </div>
  );
};

export default AdminReports;
