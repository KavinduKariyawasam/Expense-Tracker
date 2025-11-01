import React from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import "./Navbar.css";

const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    localStorage.removeItem("access_token");
    navigate("/login");
  };

  const isActive = (path) => location.pathname === path;

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link to="/dashboard" className="navbar-brand">
          💰 ExpenseTracker
        </Link>

        <div className="navbar-menu">
          <Link
            to="/dashboard"
            className={`navbar-item ${isActive("/dashboard") ? "active" : ""}`}
          >
            <span className="navbar-icon">🏠</span>
            Dashboard
          </Link>
          <Link
            to="/expenses"
            className={`navbar-item ${isActive("/expenses") ? "active" : ""}`}
          >
            <span className="navbar-icon">💸</span>
            Expenses
          </Link>
          <Link
            to="/income"
            className={`navbar-item ${isActive("/income") ? "active" : ""}`}
          >
            <span className="navbar-icon">💰</span>
            Income
          </Link>
          <Link
            to="/investments"
            className={`navbar-item ${
              isActive("/investments") ? "active" : ""
            }`}
          >
            <span className="navbar-icon">📈</span>
            Invests
          </Link>
          <Link
            to="/loans"
            className={`navbar-item ${isActive("/loans") ? "active" : ""}`}
          >
            <span className="navbar-icon">💼</span>
            Loans
          </Link>
          <Link
            to="/reports"
            className={`navbar-item ${isActive("/reports") ? "active" : ""}`}
          >
            <span className="navbar-icon">📊</span>
            Reports
          </Link>
          <Link
            to="/settings"
            className={`navbar-item ${isActive("/settings") ? "active" : ""}`}
          >
            <span className="navbar-icon">⚙️</span>
            Settings
          </Link>
          <button onClick={handleLogout} className="navbar-logout">
            <span className="navbar-icon">🚪</span>
            Logout
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
