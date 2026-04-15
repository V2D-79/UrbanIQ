import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import "./Profile.css";

const Profile = () => {
  const { user, userProfile, updateProfile, changePassword, logout } = useAuth();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(userProfile?.name || "");
  const [phone, setPhone] = useState(userProfile?.phone || "");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) { setMessage({ type: "error", text: "Name is required" }); return; }
    setLoading(true);
    try {
      await updateProfile({ name: name.trim(), phone: phone.trim() });
      setEditing(false);
      setMessage({ type: "success", text: "Profile updated successfully!" });
    } catch {
      setMessage({ type: "error", text: "Failed to update profile" });
    }
    setLoading(false);
    setTimeout(() => setMessage(null), 3000);
  };

  const handlePasswordChange = async () => {
    if (!newPassword || newPassword.length < 6) {
      setMessage({ type: "error", text: "Password must be at least 6 characters" });
      return;
    }
    if (newPassword !== confirmPassword) {
      setMessage({ type: "error", text: "Passwords do not match" });
      return;
    }
    setLoading(true);
    try {
      await changePassword(newPassword);
      setNewPassword("");
      setConfirmPassword("");
      setMessage({ type: "success", text: "Password changed successfully!" });
    } catch (err) {
      if (err.code === "auth/requires-recent-login") {
        setMessage({ type: "error", text: "Please log out and log in again before changing password" });
      } else {
        setMessage({ type: "error", text: "Failed to change password" });
      }
    }
    setLoading(false);
    setTimeout(() => setMessage(null), 3000);
  };

  return (
    <div className="profile-page">
      <div className="container">
        <div className="profile-header">
          <h1><i className="fas fa-user-cog"></i> My Profile</h1>
          <p>Manage your account settings</p>
        </div>

        {message && (
          <div className={`profile-message ${message.type}`}>
            <i className={`fas ${message.type === "success" ? "fa-check-circle" : "fa-exclamation-circle"}`}></i>
            {message.text}
          </div>
        )}

        <div className="profile-grid">
          {/* Profile Info Card */}
          <div className="profile-card">
            <div className="profile-card-header">
              <h3><i className="fas fa-id-card"></i> Account Information</h3>
              {!editing && (
                <button className="btn btn-secondary btn-sm" onClick={() => { setEditing(true); setName(userProfile?.name || ""); setPhone(userProfile?.phone || ""); }}>
                  <i className="fas fa-edit"></i> Edit
                </button>
              )}
            </div>

            <div className="profile-avatar">
              <div className="avatar-circle">
                <i className="fas fa-user"></i>
              </div>
              <div className="avatar-info">
                <h2>{userProfile?.name || "User"}</h2>
                <span className={`badge badge-${userProfile?.role === "authority" ? "in_progress" : "submitted"}`}>
                  {userProfile?.role === "authority" ? "City Authority" : "Citizen"}
                </span>
              </div>
            </div>

            {editing ? (
              <div className="profile-edit-form">
                <div className="form-group">
                  <label>Full Name</label>
                  <input type="text" className="form-control" value={name} onChange={(e) => setName(e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Phone Number</label>
                  <input type="tel" className="form-control" value={phone} onChange={(e) => setPhone(e.target.value)} />
                </div>
                <div className="profile-edit-actions">
                  <button className="btn btn-primary flex-1" onClick={handleSave} disabled={loading}>
                    {loading ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-save"></i>} Save
                  </button>
                  <button className="btn btn-ghost flex-1" onClick={() => setEditing(false)}>Cancel</button>
                </div>
              </div>
            ) : (
              <div className="profile-fields">
                <div className="profile-field"><label>Email</label><span>{user?.email || "N/A"}</span></div>
                <div className="profile-field"><label>Name</label><span>{userProfile?.name || "N/A"}</span></div>
                <div className="profile-field"><label>Phone</label><span>{userProfile?.phone || "Not set"}</span></div>
                <div className="profile-field"><label>Role</label><span className="capitalize">{userProfile?.role || "N/A"}</span></div>
                <div className="profile-field"><label>Member Since</label><span>{userProfile?.createdAt ? new Date(userProfile.createdAt).toLocaleDateString() : "N/A"}</span></div>
              </div>
            )}
          </div>

          {/* Security Card */}
          <div className="profile-card">
            <div className="profile-card-header">
              <h3><i className="fas fa-shield-alt"></i> Security</h3>
            </div>

            <div className="profile-security">
              <h4>Change Password</h4>
              <div className="form-group">
                <label>New Password</label>
                <input type="password" className="form-control" placeholder="Enter new password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
              </div>
              <div className="form-group">
                <label>Confirm New Password</label>
                <input type="password" className="form-control" placeholder="Confirm new password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
              </div>
              <button className="btn btn-secondary w-full" onClick={handlePasswordChange} disabled={loading}>
                <i className="fas fa-key"></i> Update Password
              </button>

              <hr className="divider" />

              <button className="btn btn-danger w-full" onClick={logout}>
                <i className="fas fa-sign-out-alt"></i> Log Out
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
