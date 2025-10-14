import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import BillUpload from "./BillUpload";
import {
  getDashboardStats,
  getRecentExpenses,
  getCurrentUser,
} from "../services/expense";
import { getRecentIncome } from "../services/income";
import "./DashboardNew.css";

export default function Dashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState({ name: "Loading...", email: "" });
  const [stats, setStats] = useState({
    total_expenses: 0,
    total_income: 0,
    net_worth: 0,
    monthly_expenses: 0,
    monthly_income: 0,
    monthly_net: 0,
    total_expense_categories: 0,
    total_income_categories: 0,
    recent_expense_transactions: 0,
    recent_income_transactions: 0,
    total_expense_transactions: 0,
    total_income_transactions: 0,
  });

  const [recentExpenses, setRecentExpenses] = useState([]);
  const [recentIncome, setRecentIncome] = useState([]);
  const [showBillUpload, setShowBillUpload] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Load data on component mount
  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError("");

      // Load user info, dashboard stats, recent expenses, and recent income in parallel
      const [userInfo, dashboardStats, recentExpensesData, recentIncomeData] =
        await Promise.all([
          getCurrentUser(),
          getDashboardStats(),
          getRecentExpenses(5),
          getRecentIncome(5),
        ]);

      setUser({
        name: userInfo.username,
        email: userInfo.email,
      });

      setStats(dashboardStats);
      setRecentExpenses(recentExpensesData);
      setRecentIncome(recentIncomeData);
    } catch (err) {
      setError("Failed to load dashboard data");

      if (err.message.includes("401")) {
        // Token expired or invalid, redirect to login
        localStorage.removeItem("access_token");
        navigate("/login");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleUploadSuccess = () => {
    alert("Expenses saved successfully!");
    // Reload dashboard data to show updated stats
    loadDashboardData();
  };

  // Format currency for display
  const formatCurrency = (amount) => {
    if (amount === null || amount === undefined || isNaN(amount)) {
      return "LKR 0.00";
    }
    return `LKR ${Number(amount).toFixed(2)}`;
  };

  // Format date for display
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="dashboard-container">
        <div className="loading-spinner">
          <p>Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      {/* Welcome Header */}
      <header className="dashboard-welcome">
        <div className="welcome-content">
          <h1>Welcome back, {user.name}! 👋</h1>
          <p>Here's your financial overview</p>
        </div>
      </header>

      {error && (
        <div className="error-banner">
          <p>{error}</p>
          <button onClick={loadDashboardData}>Retry</button>
        </div>
      )}

      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card primary">
          <div className="stat-icon">💰</div>
          <div className="stat-info">
            <h3>Total Income</h3>
            <p className="stat-value">{formatCurrency(stats.total_income)}</p>
            <small>{stats.total_income_transactions} transactions</small>
          </div>
        </div>

        <div className="stat-card secondary">
          <div className="stat-icon">💸</div>
          <div className="stat-info">
            <h3>Total Expenses</h3>
            <p className="stat-value">{formatCurrency(stats.total_expenses)}</p>
            <small>{stats.total_expense_transactions} transactions</small>
          </div>
        </div>

        <div className="stat-card tertiary">
          <div className="stat-icon">📊</div>
          <div className="stat-info">
            <h3>Net Worth</h3>
            <p
              className={`stat-value ${
                stats.net_worth >= 0 ? "positive" : "negative"
              }`}
            >
              {formatCurrency(stats.net_worth)}
            </p>
            <small>{stats.net_worth >= 0 ? "Surplus" : "Deficit"}</small>
          </div>
        </div>

        <div className="stat-card quaternary">
          <div className="stat-icon">📅</div>
          <div className="stat-info">
            <h3>This Month Net</h3>
            <p
              className={`stat-value ${
                stats.monthly_net >= 0 ? "positive" : "negative"
              }`}
            >
              {formatCurrency(stats.monthly_net)}
            </p>
            <small>
              Income: {formatCurrency(stats.monthly_income)} | Expenses:{" "}
              {formatCurrency(stats.monthly_expenses)}
            </small>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="quick-actions">
        <h2>Quick Actions</h2>
        <div className="action-buttons">
          <button
            className="action-btn primary"
            onClick={() => setShowBillUpload(!showBillUpload)}
          >
            <span className="btn-icon">📄</span>
            {showBillUpload ? "Hide" : "Upload Bill"}
          </button>
          <button
            className="action-btn secondary"
            onClick={() => navigate("/expenses")}
          >
            <span className="btn-icon">➕</span>
            Add Expense
          </button>
          <button
            className="action-btn income"
            onClick={() => navigate("/income")}
          >
            <span className="btn-icon">💰</span>
            Add Income
          </button>
          <button
            className="action-btn tertiary"
            onClick={() => navigate("/reports")}
          >
            <span className="btn-icon">📊</span>
            View Reports
          </button>
        </div>
      </div>

      {/* Bill Upload Section */}
      {showBillUpload && (
        <div className="bill-upload-section">
          <BillUpload onUploadSuccess={handleUploadSuccess} />
        </div>
      )}

      {/* Recent Activity Overview */}
      <div className="recent-overview">
        <div className="recent-section">
          <div className="section-header">
            <h2>Recent Expenses</h2>
            <button
              className="view-all-btn"
              onClick={() => navigate("/expenses")}
            >
              View All
            </button>
          </div>
          <div className="recent-list">
            {recentExpenses.length === 0 ? (
              <div className="no-data">
                <p>No recent expenses</p>
              </div>
            ) : (
              recentExpenses.slice(0, 3).map((expense) => (
                <div key={expense.id} className="recent-item expense">
                  <div className="item-info">
                    <h4>{expense.description}</h4>
                    <span className="item-category">{expense.category}</span>
                  </div>
                  <div className="item-amount expense-amount">
                    -{formatCurrency(expense.amount)}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="recent-section">
          <div className="section-header">
            <h2>Recent Income</h2>
            <button
              className="view-all-btn"
              onClick={() => navigate("/income")}
            >
              View All
            </button>
          </div>
          <div className="recent-list">
            {recentIncome.length === 0 ? (
              <div className="no-data">
                <p>No recent income</p>
              </div>
            ) : (
              recentIncome.slice(0, 3).map((income) => (
                <div key={income.id} className="recent-item income">
                  <div className="item-info">
                    <h4>{income.description}</h4>
                    <span className="item-category">{income.category}</span>
                  </div>
                  <div className="item-amount income-amount">
                    +{formatCurrency(income.amount)}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
