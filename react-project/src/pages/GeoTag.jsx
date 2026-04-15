import { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, LayersControl, useMapEvents, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useAuth } from "../context/AuthContext";
import { addReport, subscribeToUserReports, updateReport, deleteReport } from "../services/firebaseService";
import "./GeoTag.css";

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

function MapClickHandler({ onMapClick, active }) {
  useMapEvents({ click(e) { if (active) onMapClick(e.latlng); } });
  return null;
}

function FlyTo({ loc }) {
  const map = useMap();
  useEffect(() => { if (loc) map.flyTo([loc.lat, loc.lng], 16); }, [loc, map]);
  return null;
}

const GeoTag = () => {
  const { user, userProfile } = useAuth();
  const [reports, setReports] = useState([]);
  const [toast, setToast] = useState(null);
  const [flyTo, setFlyTo] = useState(null);
  const [showReportForm, setShowReportForm] = useState(false);
  const [geoTagMode, setGeoTagMode] = useState(false);
  const [pendingReport, setPendingReport] = useState(null);
  const [selectedReport, setSelectedReport] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(true);

  // Report form state
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("road_damage");
  const [description, setDescription] = useState("");
  const [images, setImages] = useState([]);
  const [address, setAddress] = useState("");
  const [severity, setSeverity] = useState("medium");
  const [contactPhone, setContactPhone] = useState("");
  const [landmark, setLandmark] = useState("");
  const [wardZone, setWardZone] = useState("");
  const [preferredDate, setPreferredDate] = useState("");
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringFrequency, setRecurringFrequency] = useState("");

  // Edit state
  const [editingReport, setEditingReport] = useState(null);

  // Address search
  const [addressQuery, setAddressQuery] = useState("");
  const [addressResults, setAddressResults] = useState([]);

  useEffect(() => {
    if (!user) return;
    const unsub = subscribeToUserReports(user.uid, setReports);
    return () => unsub();
  }, [user]);

  const showToast = (msg, type = "info") => {
    setToast({ message: msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const searchAddress = async () => {
    if (!addressQuery.trim()) return;
    try {
      const resp = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(addressQuery)}&limit=5`);
      setAddressResults(await resp.json());
    } catch { showToast("Address search failed", "error"); }
  };

  const goToAddress = (result) => {
    setFlyTo({ lat: parseFloat(result.lat), lng: parseFloat(result.lon) });
    setAddressResults([]);
    setAddressQuery(result.display_name.substring(0, 40));
  };

  // Image to base64
  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files);
    if (files.length + images.length > 5) {
      showToast("Maximum 5 images allowed", "warning");
      return;
    }
    files.forEach((file) => {
      if (file.size > 2 * 1024 * 1024) {
        showToast(`${file.name} is too large (max 2MB)`, "warning");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        // Compress image
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const maxW = 800, maxH = 600;
          let w = img.width, h = img.height;
          if (w > maxW) { h = (h * maxW) / w; w = maxW; }
          if (h > maxH) { w = (w * maxH) / h; h = maxH; }
          canvas.width = w; canvas.height = h;
          canvas.getContext("2d").drawImage(img, 0, 0, w, h);
          const compressed = canvas.toDataURL("image/jpeg", 0.6);
          setImages((prev) => [...prev, compressed]);
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index) => setImages((prev) => prev.filter((_, i) => i !== index));

  // Submit report (step 1: form data)
  const handleSubmitReport = () => {
    if (!title.trim()) { showToast("Title is required", "warning"); return; }
    if (!description.trim()) { showToast("Description is required", "warning"); return; }
    
    const reportData = {
      title: title.trim(), category, description: description.trim(),
      images, address: address.trim(), severity, contactPhone: contactPhone.trim(),
      landmark: landmark.trim(), wardZone: wardZone.trim(), preferredDate,
      isRecurring, recurringFrequency: isRecurring ? recurringFrequency : "",
      userId: user.uid, userName: userProfile?.name || "Anonymous",
    };

    if (editingReport) {
      // Update existing report
      updateReport(editingReport.id, reportData)
        .then(() => { showToast("Report updated!", "success"); resetForm(); })
        .catch(() => showToast("Failed to update", "error"));
    } else {
      setPendingReport(reportData);
      setShowReportForm(false);
      setGeoTagMode(true);
      showToast("Click on the map to geotag this report location", "info");
    }
  };

  // Step 2: Map click to geotag
  const handleMapClick = async (latlng) => {
    if (!geoTagMode || !pendingReport) return;
    try {
      const report = { ...pendingReport, lat: latlng.lat, lng: latlng.lng };
      await addReport(report);
      showToast("Report added successfully! 🎉", "success");
      resetForm();
      setGeoTagMode(false);
      setPendingReport(null);
    } catch (err) {
      showToast("Failed to add report", "error");
    }
  };

  const resetForm = () => {
    setTitle(""); setCategory("road_damage"); setDescription(""); setImages([]);
    setAddress(""); setSeverity("medium"); setContactPhone(""); setLandmark("");
    setWardZone(""); setPreferredDate(""); setIsRecurring(false); setRecurringFrequency("");
    setShowReportForm(false); setEditingReport(null);
  };

  const handleEdit = (report) => {
    setEditingReport(report);
    setTitle(report.title || ""); setCategory(report.category || "road_damage");
    setDescription(report.description || ""); setImages(report.images || []);
    setAddress(report.address || ""); setSeverity(report.severity || "medium");
    setContactPhone(report.contactPhone || ""); setLandmark(report.landmark || "");
    setWardZone(report.wardZone || ""); setPreferredDate(report.preferredDate || "");
    setIsRecurring(report.isRecurring || false); setRecurringFrequency(report.recurringFrequency || "");
    setShowReportForm(true);
  };

  const handleDelete = async (report) => {
    if (!window.confirm(`Delete "${report.title}"?`)) return;
    try { await deleteReport(report.id); showToast("Report deleted", "success"); } 
    catch { showToast("Delete failed", "error"); }
  };

  return (
    <div className="geotag-page">
      {/* Sidebar Drawer */}
      <aside className={`geotag-sidebar ${drawerOpen ? "open" : "collapsed"}`}>
        <div className="sidebar-header">
          <h2><i className="fas fa-map-marker-alt"></i> My Reports</h2>
          <div className="sidebar-header-actions">
            <span className="report-count">{reports.length}</span>
            <button className="btn btn-sm btn-primary" onClick={() => { resetForm(); setShowReportForm(true); }}>
              <i className="fas fa-plus"></i> Report
            </button>
          </div>
        </div>

        {/* Address Search */}
        <div className="sidebar-search">
          <i className="fas fa-search"></i>
          <input type="text" placeholder="Search location..." value={addressQuery}
            onChange={(e) => setAddressQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && searchAddress()} />
          <button className="search-go" onClick={searchAddress}><i className="fas fa-arrow-right"></i></button>
          {addressResults.length > 0 && (
            <div className="search-dropdown">
              {addressResults.map((r, i) => (
                <div key={i} className="search-item" onClick={() => goToAddress(r)}>
                  <i className="fas fa-map-pin"></i>
                  <span>{r.display_name.substring(0, 60)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Reports List */}
        <div className="sidebar-reports">
          {reports.length === 0 ? (
            <div className="empty-state">
              <i className="fas fa-clipboard-list"></i>
              <p>No reports yet</p>
              <button className="btn btn-primary btn-sm" onClick={() => { resetForm(); setShowReportForm(true); }}>
                <i className="fas fa-plus"></i> Create First Report
              </button>
            </div>
          ) : (
            reports.map((report) => {
              const cat = CATEGORIES.find((c) => c.id === report.category) || CATEGORIES[12];
              return (
                <div key={report.id} className={`report-item ${selectedReport?.id === report.id ? "active" : ""}`}
                  onClick={() => {
                    setSelectedReport(report);
                    if (report.lat && report.lng) setFlyTo({ lat: report.lat, lng: report.lng });
                  }}
                  style={{ borderLeftColor: cat.color }}>
                  <div className="report-item-header">
                    <span className="report-title">{report.title}</span>
                    <span className={`badge badge-${report.status}`}>{STATUS_LABELS[report.status] || report.status}</span>
                  </div>
                  <div className="report-item-meta">
                    <span><i className={`fas ${cat.icon}`} style={{ color: cat.color }}></i> {cat.label}</span>
                    <span className={`severity-dot severity-${report.severity}`}>{report.severity}</span>
                  </div>
                  <div className="report-item-date">
                    <i className="fas fa-clock"></i> {report.createdAt ? new Date(report.createdAt).toLocaleDateString() : "N/A"}
                  </div>
                  <div className="report-item-actions">
                    <button className="btn btn-sm btn-ghost" onClick={(e) => { e.stopPropagation(); handleEdit(report); }} title="Edit">
                      <i className="fas fa-edit"></i>
                    </button>
                    <button className="btn btn-sm btn-danger" onClick={(e) => { e.stopPropagation(); handleDelete(report); }} title="Delete">
                      <i className="fas fa-trash"></i>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <button className="sidebar-toggle" onClick={() => setDrawerOpen(!drawerOpen)}>
          <i className={`fas fa-chevron-${drawerOpen ? "left" : "right"}`}></i>
        </button>
      </aside>

      {/* Map Area */}
      <div className="geotag-map-area">
        {geoTagMode && (
          <div className="map-mode-indicator">
            <i className="fas fa-crosshairs"></i>
            Click on the map to mark the issue location
            <button onClick={() => { setGeoTagMode(false); setPendingReport(null); }}>Cancel</button>
          </div>
        )}

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

          <MapClickHandler onMapClick={handleMapClick} active={geoTagMode} />
          <FlyTo loc={flyTo} />

          {reports.filter((r) => r.lat && r.lng).map((report) => (
            <Marker key={report.id} position={[report.lat, report.lng]} icon={makeIcon(report.category, report.status)}>
              <Popup>
                <div className="map-popup">
                  <h3>{report.title}</h3>
                  <p className="popup-category">{CATEGORIES.find((c) => c.id === report.category)?.label || report.category}</p>
                  <div className="popup-stats">
                    <div><strong>Status:</strong> {STATUS_LABELS[report.status]}</div>
                    <div><strong>Severity:</strong> {report.severity}</div>
                    {report.address && <div><strong>Address:</strong> {report.address}</div>}
                  </div>
                  <p className="popup-desc">{(report.description || "").substring(0, 100)}{report.description?.length > 100 ? "..." : ""}</p>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      {/* Report Form Modal */}
      {showReportForm && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowReportForm(false); }}>
          <div className="modal-content report-modal">
            <div className="modal-header">
              <h2><i className="fas fa-exclamation-triangle"></i> {editingReport ? "Edit Report" : "Report Issue"}</h2>
              <button className="modal-close" onClick={() => setShowReportForm(false)}><i className="fas fa-times"></i></button>
            </div>

            <div className="report-form">
              <div className="form-group">
                <label>Title *</label>
                <input type="text" className="form-control" placeholder="Brief title of the issue" value={title} onChange={(e) => setTitle(e.target.value)} />
              </div>

              <div className="form-row">
                <div className="form-group flex-1">
                  <label>Category *</label>
                  <select className="form-control" value={category} onChange={(e) => setCategory(e.target.value)}>
                    {CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
                  </select>
                </div>
                <div className="form-group flex-1">
                  <label>Severity</label>
                  <select className="form-control" value={severity} onChange={(e) => setSeverity(e.target.value)}>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>Description *</label>
                <textarea className="form-control" placeholder="Describe the issue in detail..." value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
              </div>

              <div className="form-group">
                <label>Images (max 5, max 2MB each)</label>
                <input type="file" accept="image/*" multiple onChange={handleImageUpload} className="form-control" />
                {images.length > 0 && (
                  <div className="image-preview-grid">
                    {images.map((img, i) => (
                      <div key={i} className="image-preview">
                        <img src={img} alt={`upload ${i + 1}`} />
                        <button onClick={() => removeImage(i)}><i className="fas fa-times"></i></button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="form-group">
                <label>Address</label>
                <input type="text" className="form-control" placeholder="Street address" value={address} onChange={(e) => setAddress(e.target.value)} />
              </div>

              <div className="form-row">
                <div className="form-group flex-1">
                  <label>Ward / Zone</label>
                  <input type="text" className="form-control" placeholder="e.g. Ward 12" value={wardZone} onChange={(e) => setWardZone(e.target.value)} />
                </div>
                <div className="form-group flex-1">
                  <label>Nearby Landmark</label>
                  <input type="text" className="form-control" placeholder="e.g. Near City Mall" value={landmark} onChange={(e) => setLandmark(e.target.value)} />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group flex-1">
                  <label>Contact Phone</label>
                  <input type="tel" className="form-control" placeholder="Optional" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} />
                </div>
                <div className="form-group flex-1">
                  <label>Preferred Resolution Date</label>
                  <input type="date" className="form-control" value={preferredDate} onChange={(e) => setPreferredDate(e.target.value)} />
                </div>
              </div>

              <div className="form-group">
                <label className="checkbox-label">
                  <input type="checkbox" checked={isRecurring} onChange={(e) => setIsRecurring(e.target.checked)} />
                  <span>This is a recurring issue</span>
                </label>
                {isRecurring && (
                  <input type="text" className="form-control mt-sm" placeholder="How often? (e.g., Weekly, Monthly)" value={recurringFrequency} onChange={(e) => setRecurringFrequency(e.target.value)} />
                )}
              </div>

              <button className="btn btn-primary w-full btn-lg" onClick={handleSubmitReport}>
                <i className="fas fa-paper-plane"></i> {editingReport ? "Update Report" : "Submit & GeoTag"}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && <div className="toast-container"><div className={`toast toast-${toast.type}`}>{toast.message}</div></div>}
    </div>
  );
};

export default GeoTag;
