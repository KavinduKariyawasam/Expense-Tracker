import React, { useState, useEffect } from "react";
import { getCurrentUser } from "../services/expense";
import "./Settings.css";

const Settings = () => {
  const [user, setUser] = useState({ name: "", email: "" });
  const [settings, setSettings] = useState({
    currency: "LKR",
    dateFormat: "DD/MM/YYYY",
    theme: "light",
    notifications: true,
    autoBackup: false,
    language: "en",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadUserData();
    loadSettings();
  }, []);

  const loadUserData = async () => {
    try {
      const userInfo = await getCurrentUser();
      setUser({
        name: userInfo.username,
        email: userInfo.email,
      });
    } catch (err) {
      console.error("Failed to load user data:", err);
    } finally {
      setLoading(false);
    }
  };

  const loadSettings = () => {
    // Load settings from localStorage
    const savedSettings = localStorage.getItem("userSettings");
    if (savedSettings) {
      setSettings({ ...settings, ...JSON.parse(savedSettings) });
    }
  };

  const handleSettingChange = (key, value) => {
    setSettings((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Save settings to localStorage (in a real app, you would save to backend)
      localStorage.setItem("userSettings", JSON.stringify(settings));

      // Simulate API call delay
      await new Promise((resolve) => setTimeout(resolve, 1000));

      alert("Settings saved successfully!");
    } catch (err) {
      alert("Failed to save settings. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleExportData = () => {
    alert("Data export feature coming soon!");
  };

  const handleDeleteAccount = () => {
    const confirmation = window.confirm(
      "Are you sure you want to delete your account? This action cannot be undone."
    );
    if (confirmation) {
      alert("Account deletion feature coming soon!");
    }
  };

  if (loading) {
    return (
      <div className="settings-container">
        <div className="loading-spinner">
          <p>Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="settings-container">
      <div className="settings-header">
        <h1>⚙️ Settings</h1>
        <p>Customize your expense tracker experience</p>
      </div>

      <div className="settings-content">
        {/* Profile Section */}
        <div className="settings-section">
          <h3>👤 Profile Information</h3>
          <div className="settings-grid">
            <div className="setting-item">
              <label>Name</label>
              <input
                type="text"
                value={user.name}
                disabled
                className="setting-input disabled"
              />
              <small>Contact support to change your name</small>
            </div>
            <div className="setting-item">
              <label>Email</label>
              <input
                type="email"
                value={user.email}
                disabled
                className="setting-input disabled"
              />
              <small>Contact support to change your email</small>
            </div>
          </div>
        </div>

        {/* General Settings */}
        <div className="settings-section">
          <h3>🌍 General Settings</h3>
          <div className="settings-grid">
            <div className="setting-item">
              <label>Currency</label>
              <select
                value={settings.currency}
                onChange={(e) =>
                  handleSettingChange("currency", e.target.value)
                }
                className="setting-select"
              >
                <option value="LKR">Sri Lankan Rupee (LKR)</option>
                <option value="USD">US Dollar (USD)</option>
                <option value="EUR">Euro (EUR)</option>
                <option value="GBP">British Pound (GBP)</option>
                <option value="INR">Indian Rupee (INR)</option>
              </select>
            </div>

            <div className="setting-item">
              <label>Date Format</label>
              <select
                value={settings.dateFormat}
                onChange={(e) =>
                  handleSettingChange("dateFormat", e.target.value)
                }
                className="setting-select"
              >
                <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                <option value="YYYY-MM-DD">YYYY-MM-DD</option>
              </select>
            </div>

            <div className="setting-item">
              <label>Language</label>
              <select
                value={settings.language}
                onChange={(e) =>
                  handleSettingChange("language", e.target.value)
                }
                className="setting-select"
              >
                <option value="en">English</option>
                <option value="si">Sinhala</option>
                <option value="ta">Tamil</option>
              </select>
            </div>

            <div className="setting-item">
              <label>Theme</label>
              <select
                value={settings.theme}
                onChange={(e) => handleSettingChange("theme", e.target.value)}
                className="setting-select"
              >
                <option value="light">Light</option>
                <option value="dark">Dark</option>
                <option value="auto">Auto</option>
              </select>
              <small>Dark theme coming soon!</small>
            </div>
          </div>
        </div>

        {/* Preferences */}
        <div className="settings-section">
          <h3>🔔 Preferences</h3>
          <div className="settings-grid">
            <div className="setting-item">
              <div className="setting-toggle">
                <label className="toggle-label">
                  <input
                    type="checkbox"
                    checked={settings.notifications}
                    onChange={(e) =>
                      handleSettingChange("notifications", e.target.checked)
                    }
                    className="toggle-input"
                  />
                  <span className="toggle-slider"></span>
                  Email Notifications
                </label>
                <small>Receive email updates about your expenses</small>
              </div>
            </div>

            <div className="setting-item">
              <div className="setting-toggle">
                <label className="toggle-label">
                  <input
                    type="checkbox"
                    checked={settings.autoBackup}
                    onChange={(e) =>
                      handleSettingChange("autoBackup", e.target.checked)
                    }
                    className="toggle-input"
                  />
                  <span className="toggle-slider"></span>
                  Auto Backup
                </label>
                <small>Automatically backup your data weekly</small>
              </div>
            </div>
          </div>
        </div>

        {/* Data Management */}
        <div className="settings-section">
          <h3>💾 Data Management</h3>
          <div className="settings-actions">
            <button className="action-btn secondary" onClick={handleExportData}>
              📥 Export Data
            </button>
            <button className="action-btn danger" onClick={handleDeleteAccount}>
              🗑️ Delete Account
            </button>
          </div>
        </div>

        {/* Save Button */}
        <div className="settings-footer">
          <button className="save-btn" onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "💾 Save Settings"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Settings;
