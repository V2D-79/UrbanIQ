import { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, Circle, LayersControl, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useAuth } from "../context/AuthContext";
import { subscribeToAllReports, addProgressUpdate, updateReport, deleteReport } from "../services/firebaseService";
import "./AdminGeoTag.css";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

const CATEGORIES = [
  { id: "road_damage", label: "Road Damage", icon: "fa-road", color: "#ef4444" },
  { id: "waste_management", label: "Waste Management", icon: "fa-trash", color: "#f59e0b" },
  { id: "water_supply", label: "Water Supply", icon: "fa-tint", color: "#3b82f6" },
  { id: "street_lighting", label: "Street Lighting", icon: "fa-lightbulb", color: "#eab308" },
  { id: "drainage_sewage", label: "Drainage/Sewage", icon: "fa-water", color: "#06b6d4" },
  { id: "public_safety", label: "Public Safety", icon: "fa-shield-alt", color: "#8b5cf6" },
  { id: "noise_pollution", label: "Noise Pollution", icon: "fa-volume-up", color: "#ec4899" },
  { id: "air_quality", label: "Air Quality", icon: "fa-wind", color: "#14b8a6" },
  { id: "park_green_space", label: "Park/Green Space", icon: "fa-tree", color: "#22c55e" },
  { id: "public_transport", label: "Public Transport", icon: "fa-bus", color: "#6366f1" },
  { id: "building_structure", label: "Building/Structure", icon: "fa-building", color: "#f97316" },
  { id: "electricity", label: "Electricity", icon: "fa-bolt", color: "#fbbf24" },
  { id: "other", label: "Other", icon: "fa-ellipsis-h", color: "#94a3b8" },
];

const STATUS_LABELS = {
  submitted: "Submitted", under_review: "Under Review", in_progress: "In Progress",
  work_completed: "Work Completed", verified: "Verified", closed: "Closed",
};

const STATUS_OPTIONS = ["submitted", "under_review", "in_progress", "work_completed", "verified", "closed"];

function makeIcon(category, status) {
  const cat = CATEGORIES.find((c) => c.id === category) || CATEGORIES[12];
  const isResolved = status === "closed" || status === "verified" || status === "work_completed";
  const bg = isResolved ? "#22c55e" : cat.color;
  return L.divIcon({
    className: "custom-marker",
    html: `<div style="width:36px;height:36px;border-radius:10px;background:${bg};display:flex;align-items:center;justify-content:center;box-shadow:0 0 12px ${bg}66;border:2px solid #fff"><i class="fas ${cat.icon}" style="color:#fff;font-size:14px"></i></div>`,
    iconSize: [36, 36], iconAnchor: [18, 18],
  });
}

function FlyTo({ loc }) {
  const map = useMap();
  useEffect(() => { if (loc) map.flyTo([loc.lat, loc.lng], 15); }, [loc, map]);
  return null;
}

const AdminGeoTag = () => {
  const { user, userProfile } = useAuth();
  const [reports, setReports] = useState([]);
  const [selectedReport, setSelectedReport] = useState(null);
  const [flyTo, setFlyTo] = useState(null);
  const [toast, setToast] = useState(null);
  const [showHotspots, setShowHotspots] = useState(false);
  const [hotspots, setHotspots] = useState([]);
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(true);

  // Progress update form
  const [showProgressForm, setShowProgressForm] = useState(false);
  const [progressDesc, setProgressDesc] = useState("");
  const [progressStatus, setProgressStatus] = useState("");
  const [progressImages, setProgressImages] = useState([]);

  useEffect(() => {
    const unsub = subscribeToAllReports(setReports);
    return () => unsub();
  }, []);

  const showToast = (msg, type = "info") => {
    setToast({ message: msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Hotspot detection
  const detectHotspots = () => {
    const geoReports = reports.filter((r) => r.lat && r.lng);
    if (geoReports.length < 3) { showToast("Need at least 3 geotagged reports", "warning"); return; }

    const radius = 0.02; // ~2km
    const clusters = [];
    const visited = new Set();

    geoReports.forEach((report, i) => {
      if (visited.has(i)) return;
      const cluster = [report];
      visited.add(i);

      geoReports.forEach((other, j) => {
        if (visited.has(j)) return;
        const dist = Math.sqrt(Math.pow(report.lat - other.lat, 2) + Math.pow(report.lng - other.lng, 2));
        if (dist < radius) { cluster.push(other); visited.add(j); }
      });

      if (cluster.length >= 2) {
        const avgLat = cluster.reduce((s, r) => s + r.lat, 0) / cluster.length;
        const avgLng = cluster.reduce((s, r) => s + r.lng, 0) / cluster.length;
        clusters.push({ lat: avgLat, lng: avgLng, count: cluster.length, reports: cluster });
      }
    });

    clusters.sort((a, b) => b.count - a.count);
    setHotspots(clusters);
    setShowHotspots(true);
    showToast(`Found ${clusters.length} hotspot areas`, "success");
    if (clusters.length > 0) setFlyTo({ lat: clusters[0].lat, lng: clusters[0].lng });
  };

  // Progress image upload
  const handleProgressImageUpload = (e) => {
    const files = Array.from(e.target.files);
    files.forEach((file) => {
      if (file.size > 2 * 1024 * 1024) return;
      const reader = new FileReader();
      reader.onloadend = () => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          let w = img.width, h = img.height;
          if (w > 800) { h = (h * 800) / w; w = 800; }
          canvas.width = w; canvas.height = h;
          canvas.getContext("2d").drawImage(img, 0, 0, w, h);
          setProgressImages((prev) => [...prev, canvas.toDataURL("image/jpeg", 0.6)]);
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  };

  // Submit progress update
  const handleSubmitProgress = async () => {
    if (!progressDesc.trim()) { showToast("Description is required", "warning"); return; }
    if (!progressStatus) { showToast("Select a status", "warning"); return; }
    try {
      await addProgressUpdate(selectedReport.id, {
        description: progressDesc.trim(),
        status: progressStatus,
        images: progressImages,
        authorityId: user.uid,
        authorityName: userProfile?.name || "Authority",
      });
      showToast("Progress update added!", "success");
      setShowProgressForm(false);
      setProgressDesc("");
      setProgressStatus("");
      setProgressImages([]);
    } catch {
      showToast("Failed to add progress", "error");
    }
  };

  const handleDeleteReport = async (report) => {
    if (!window.confirm(`Delete "${report.title}"?`)) return;
    try { await deleteReport(report.id); setSelectedReport(null); showToast("Report deleted", "success"); }
    catch { showToast("Delete failed", "error"); }
  };

  const filteredReports = reports
    .filter((r) => filterStatus === "all" || r.status === filterStatus)
    .filter((r) => filterCategory === "all" || r.category === filterCategory)
    .filter((r) => !searchQuery || r.title?.toLowerCase().includes(searchQuery.toLowerCase()) || r.address?.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="admin-geotag-page">
      <aside className={`admin-sidebar ${drawerOpen ? "open" : "collapsed"}`}>
        <div className="sidebar-header">
          <h2><i className="fas fa-map-marked-alt"></i> All Reports</h2>
          <span className="report-count">{reports.length}</span>
        </div>

        {/* Filters */}
        <div className="admin-filters">
          <select className="form-control" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
            <option value="all">All Status</option>
            {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
          </select>
          <select className="form-control" value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}>
            <option value="all">All Categories</option>
            {CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>
          <input type="text" className="form-control" placeholder="Search..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
        </div>

        {/* Hotspot Button */}
        <div className="hotspot-btn-area">
          <button className={`btn ${showHotspots ? "btn-warning" : "btn-primary"} w-full`} onClick={() => { if (showHotspots) { setShowHotspots(false); setHotspots([]); } else { detectHotspots(); } }}>
            <i className="fas fa-fire"></i> {showHotspots ? "Hide Hotspots" : "Find Hotspots"}
          </button>
        </div>

        {/* Reports List */}
        <div className="admin-reports-list">
          {filteredReports.map((report) => {
            const cat = CATEGORIES.find((c) => c.id === report.category) || CATEGORIES[12];
            return (
              <div key={report.id} className={`report-item ${selectedReport?.id === report.id ? "active" : ""}`}
                onClick={() => { setSelectedReport(report); if (report.lat && report.lng) setFlyTo({ lat: report.lat, lng: report.lng }); }}
                style={{ borderLeftColor: cat.color }}>
                <div className="report-item-header">
                  <span className="report-title">{report.title}</span>
                  <span className={`badge badge-${report.status}`}>{STATUS_LABELS[report.status]}</span>
                </div>
                <div className="report-item-meta">
                  <span><i className={`fas ${cat.icon}`} style={{ color: cat.color }}></i> {cat.label}</span>
                  <span>{report.userName || "Anonymous"}</span>
                </div>
              </div>
            );
          })}
        </div>

        <button className="sidebar-toggle" onClick={() => setDrawerOpen(!drawerOpen)}>
          <i className={`fas fa-chevron-${drawerOpen ? "left" : "right"}`}></i>
        </button>
      </aside>

      {/* Map */}
      <div className="admin-map-area">
        <MapContainer center={[20.5937, 78.9629]} zoom={5} className="map-container" zoomControl={true}>
          <LayersControl position="topright">
            <LayersControl.BaseLayer checked name="Streets">
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap" maxZoom={19} />
            </LayersControl.BaseLayer>
            <LayersControl.BaseLayer name="Satellite">
              <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" attribution="Tiles &copy; Esri" maxZoom={19} />
            </LayersControl.BaseLayer>
            <LayersControl.BaseLayer name="Dark">
              <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" attribution="&copy; CARTO" maxZoom={19} />
            </LayersControl.BaseLayer>
          </LayersControl>

          <FlyTo loc={flyTo} />

          {filteredReports.filter((r) => r.lat && r.lng).map((report) => (
            <Marker key={report.id} position={[report.lat, report.lng]} icon={makeIcon(report.category, report.status)}
              eventHandlers={{ click: () => setSelectedReport(report) }}>
              <Popup>
                <div className="map-popup">
                  <h3>{report.title}</h3>
                  <p className="popup-category">{CATEGORIES.find((c) => c.id === report.category)?.label}</p>
                  <div className="popup-stats">
                    <div><strong>Status:</strong> {STATUS_LABELS[report.status]}</div>
                    <div><strong>By:</strong> {report.userName}</div>
                    <div><strong>Severity:</strong> {report.severity}</div>
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}

          {/* Hotspot circles */}
          {showHotspots && hotspots.map((hs, i) => (
            <Circle key={i} center={[hs.lat, hs.lng]}
              radius={Math.max(500, hs.count * 300)}
              pathOptions={{ color: "#ef4444", fillColor: "#ef4444", fillOpacity: 0.15 + hs.count * 0.05, weight: 2, dashArray: "6,4" }}>
              <Popup>
                <div className="map-popup">
                  <h3>🔥 Hotspot Area</h3>
                  <p><strong>{hs.count}</strong> reports in this area</p>
                </div>
              </Popup>
            </Circle>
          ))}
        </MapContainer>
      </div>

      {/* Progress Update Modal */}
      {showProgressForm && selectedReport && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowProgressForm(false); }}>
          <div className="modal-content">
            <div className="modal-header">
              <h2><i className="fas fa-tasks"></i> Add Progress Update</h2>
              <button className="modal-close" onClick={() => setShowProgressForm(false)}><i className="fas fa-times"></i></button>
            </div>
            <p className="modal-subtitle">Report: {selectedReport.title}</p>

            <div className="form-group">
              <label>Update Status *</label>
              <select className="form-control" value={progressStatus} onChange={(e) => setProgressStatus(e.target.value)}>
                <option value="">Select new status...</option>
                {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
              </select>
            </div>

            <div className="form-group">
              <label>Description *</label>
              <textarea className="form-control" placeholder="Describe the work being done, current status, etc." value={progressDesc} onChange={(e) => setProgressDesc(e.target.value)} rows={4} />
            </div>

            <div className="form-group">
              <label>Work Photos</label>
              <input type="file" accept="image/*" multiple onChange={handleProgressImageUpload} className="form-control" />
              {progressImages.length > 0 && (
                <div className="image-preview-grid" style={{ marginTop: 8 }}>
                  {progressImages.map((img, i) => (
                    <div key={i} className="image-preview">
                      <img src={img} alt={`work ${i + 1}`} />
                      <button onClick={() => setProgressImages((prev) => prev.filter((_, j) => j !== i))}><i className="fas fa-times"></i></button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button className="btn btn-primary w-full btn-lg" onClick={handleSubmitProgress}>
              <i className="fas fa-paper-plane"></i> Submit Update
            </button>
          </div>
        </div>
      )}

      {/* Report Detail Panel */}
      {selectedReport && !showProgressForm && (
        <div className="admin-report-detail">
          <div className="detail-header">
            <h3>{selectedReport.title}</h3>
            <button className="modal-close" onClick={() => setSelectedReport(null)}><i className="fas fa-times"></i></button>
          </div>
          <div className="detail-badges">
            <span className={`badge badge-${selectedReport.status}`}>{STATUS_LABELS[selectedReport.status]}</span>
            <span className={`badge badge-${selectedReport.severity}`}>{selectedReport.severity}</span>
          </div>
          <div className="detail-fields-compact">
            <div><label>Category</label><span>{CATEGORIES.find((c) => c.id === selectedReport.category)?.label}</span></div>
            <div><label>Reporter</label><span>{selectedReport.userName}</span></div>
            <div><label>Address</label><span>{selectedReport.address || "N/A"}</span></div>
            <div><label>Description</label><p>{selectedReport.description}</p></div>
          </div>
          {selectedReport.images?.length > 0 && (
            <div className="detail-images-compact">
              {selectedReport.images.map((img, i) => <img key={i} src={img} alt={`report ${i + 1}`} />)}
            </div>
          )}
          <div className="detail-actions-compact">
            <button className="btn btn-primary flex-1" onClick={() => { setProgressStatus(selectedReport.status); setShowProgressForm(true); }}>
              <i className="fas fa-plus"></i> Add Progress
            </button>
            <button className="btn btn-danger btn-sm" onClick={() => handleDeleteReport(selectedReport)}>
              <i className="fas fa-trash"></i>
            </button>
          </div>
        </div>
      )}

      {toast && <div className="toast-container"><div className={`toast toast-${toast.type}`}>{toast.message}</div></div>}
    </div>
  );
};

export default AdminGeoTag;
