import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import BillUpload from "./BillUpload";
import AddExpense from "./AddExpense";
import AddIncome from "./AddIncome";
import YearlySummary from "./YearlySummary";
import Reports from "./Reports";
import {
  getDashboardStats,
  getRecentExpenses,
  getCurrentUser,
  updateExpense,
} from "../services/expense";
import { getRecentIncome } from "../services/income";
import { EXPENSE_CATEGORIES } from "../constants/categories";
import "./Dashboard.css";

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
  const [activeView, setActiveView] = useState(null); // 'addExpense', 'addIncome', 'yearlySummary', 'reports'
  const [editingExpenseId, setEditingExpenseId] = useState(null);
  const [editFormData, setEditFormData] = useState({});
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

  const handleLogout = () => {
    localStorage.removeItem("access_token");
    navigate("/login");
  };

  const handleUploadSuccess = () => {
    alert("Expenses saved successfully!");
    // Reload dashboard data to show updated stats
    loadDashboardData();
  };

  const handleExpenseAdded = () => {
    // Reload dashboard data to show updated stats
    loadDashboardData();
    // Keep the add expense form open for adding more expenses
  };

  const handleIncomeAdded = () => {
    // Reload dashboard data to show updated stats
    loadDashboardData();
    // Keep the add income form open for adding more income
  };

  const handleEditExpense = (expense) => {
    setEditingExpenseId(expense.id);
    setEditFormData({
      vendor: expense.vendor || "",
      description: expense.description,
      amount: expense.amount,
      category: expense.category,
      expense_date: expense.expense_date,
    });
  };

  const handleCancelEdit = () => {
    setEditingExpenseId(null);
    setEditFormData({});
  };

  const handleSaveEdit = async () => {
    try {
      const updatedExpense = {
        ...editFormData,
        amount: parseFloat(editFormData.amount),
      };

      await updateExpense(editingExpenseId, updatedExpense);

      // Update the expense in the local state
      setRecentExpenses((prevExpenses) =>
        prevExpenses.map((expense) =>
          expense.id === editingExpenseId
            ? { ...expense, ...updatedExpense }
            : expense
        )
      );

      setEditingExpenseId(null);
      setEditFormData({});

      // Reload dashboard data to update stats
      loadDashboardData();
    } catch (err) {
      console.error("Error updating expense:", err);
      alert("Failed to update expense: " + (err.message || "Unknown error"));
    }
  };

  const handleEditFormChange = (field, value) => {
    setEditFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
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
      {/* Navigation Header */}
      <header className="dashboard-header">
        <div className="header-content">
          <h1 className="app-title">💰 ExpenseTracker</h1>
          <div className="user-menu">
            <div className="user-info">
              <span className="user-name">Welcome, {user.name}</span>
            </div>
            <button onClick={handleLogout} className="logout-btn">
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main Dashboard Content */}
      <main className="dashboard-main">
        <div className="dashboard-content">
          {error && (
            <div className="error-banner">
              <p>{error}</p>
              <button onClick={loadDashboardData}>Retry</button>
            </div>
          )}

          {/* Bill Upload Section */}
          {showBillUpload && (
            <BillUpload onUploadSuccess={handleUploadSuccess} />
          )}

          {/* Add Expense Section */}
          {activeView === "addExpense" && (
            <AddExpense
              onExpenseAdded={handleExpenseAdded}
              onClose={() => setActiveView(null)}
            />
          )}

          {/* Add Income Section */}
          {activeView === "addIncome" && (
            <AddIncome
              onIncomeAdded={handleIncomeAdded}
              onClose={() => setActiveView(null)}
            />
          )}

          {/* Yearly Summary Section */}
          {activeView === "yearlySummary" && (
            <YearlySummary onClose={() => setActiveView(null)} />
          )}

          {/* Reports Section */}
          {activeView === "reports" && (
            <Reports onClose={() => setActiveView(null)} />
          )}

          {/* Stats Cards */}
          <div className="stats-grid">
            <div className="stat-card primary">
              <div className="stat-icon">💸</div>
              <div className="stat-info">
                <h3>Total Income</h3>
                <p className="stat-value">
                  {formatCurrency(stats.total_income)}
                </p>
                <small>{stats.total_income_transactions} transactions</small>
              </div>
            </div>

            <div className="stat-card secondary">
              <div className="stat-icon">🫰</div>
              <div className="stat-info">
                <h3>Total Expenses</h3>
                <p className="stat-value">
                  {formatCurrency(stats.total_expenses)}
                </p>
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

          {/* Action Buttons */}
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
              onClick={() =>
                setActiveView(activeView === "addExpense" ? null : "addExpense")
              }
            >
              <span className="btn-icon">➕</span>
              {activeView === "addExpense" ? "Hide" : "Add Expense"}
            </button>
            <button
              className="action-btn income"
              onClick={() =>
                setActiveView(activeView === "addIncome" ? null : "addIncome")
              }
            >
              <span className="btn-icon">💰</span>
              {activeView === "addIncome" ? "Hide" : "Add Income"}
            </button>
            <button
              className="action-btn tertiary"
              onClick={() =>
                setActiveView(
                  activeView === "yearlySummary" ? null : "yearlySummary"
                )
              }
            >
              <span className="btn-icon">📊</span>
              {activeView === "yearlySummary" ? "Hide" : "Yearly Summary"}
            </button>
            <button
              className="action-btn quaternary"
              onClick={() =>
                setActiveView(activeView === "reports" ? null : "reports")
              }
            >
              <span className="btn-icon">📈</span>
              {activeView === "reports" ? "Hide" : "View Reports"}
            </button>
          </div>

          {/* Recent Expenses */}
          <div className="recent-expenses">
            <div className="section-header">
              <h2>Recent Expenses</h2>
              <button
                className="view-all-btn"
                onClick={() => navigate("/expenses")}
              >
                View All
              </button>
            </div>

            <div className="expenses-list">
              {recentExpenses.length === 0 ? (
                <div className="no-expenses">
                  <p>
                    No expenses found. Start by uploading a bill or adding an
                    expense manually.
                  </p>
                </div>
              ) : (
                recentExpenses.map((expense) => (
                  <div key={expense.id} className="expense-item">
                    {editingExpenseId === expense.id ? (
                      // Edit mode
                      <div className="expense-edit-form">
                        <div className="edit-form-row">
                          <input
                            type="text"
                            placeholder="Vendor"
                            value={editFormData.vendor}
                            onChange={(e) =>
                              handleEditFormChange("vendor", e.target.value)
                            }
                            className="edit-input vendor-input"
                          />
                          <input
                            type="text"
                            placeholder="Description"
                            value={editFormData.description}
                            onChange={(e) =>
                              handleEditFormChange(
                                "description",
                                e.target.value
                              )
                            }
                            className="edit-input description-input"
                            required
                          />
                        </div>
                        <div className="edit-form-row">
                          <input
                            type="number"
                            placeholder="Amount"
                            value={editFormData.amount}
                            onChange={(e) =>
                              handleEditFormChange("amount", e.target.value)
                            }
                            className="edit-input amount-input"
                            step="0.01"
                            min="0"
                            required
                          />
                          <select
                            value={editFormData.category}
                            onChange={(e) =>
                              handleEditFormChange("category", e.target.value)
                            }
                            className="edit-input category-input"
                          >
                            {EXPENSE_CATEGORIES.map((category) => (
                              <option key={category} value={category}>
                                {category}
                              </option>
                            ))}
                          </select>
                          <input
                            type="date"
                            value={editFormData.expense_date}
                            onChange={(e) =>
                              handleEditFormChange(
                                "expense_date",
                                e.target.value
                              )
                            }
                            className="edit-input date-input"
                            required
                          />
                        </div>
                        <div className="edit-actions">
                          <button
                            onClick={handleSaveEdit}
                            className="save-btn"
                            disabled={
                              !editFormData.description || !editFormData.amount
                            }
                          >
                            Save
                          </button>
                          <button
                            onClick={handleCancelEdit}
                            className="cancel-btn"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      // View mode
                      <>
                        <div className="expense-info">
                          <h4 className="expense-description">
                            {expense.vendor
                              ? `${expense.vendor} - ${expense.description}`
                              : expense.description}
                          </h4>
                          <span className="expense-category">
                            {expense.category || "Uncategorized"}
                          </span>
                        </div>
                        <div className="expense-details">
                          <span className="expense-amount">
                            -{formatCurrency(expense.amount)}
                          </span>
                          <span className="expense-date">
                            {formatDate(expense.expense_date)}
                          </span>
                          <button
                            onClick={() => handleEditExpense(expense)}
                            className="edit-expense-btn"
                            title="Edit expense"
                          >
                            ✏️
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Recent Income */}
          <div className="recent-income">
            <div className="section-header">
              <h2>Recent Income</h2>
              <button
                className="view-all-btn"
                onClick={() => navigate("/income")}
              >
                View All
              </button>
            </div>

            <div className="transactions-list income-list">
              {recentIncome.length === 0 ? (
                <div className="no-transactions">
                  <p>No recent income found</p>
                  <button
                    className="add-first-btn"
                    onClick={() => setActiveView("addIncome")}
                  >
                    Add your first income
                  </button>
                </div>
              ) : (
                recentIncome.map((incomeItem) => (
                  <div
                    key={incomeItem.id}
                    className="transaction-item income-item"
                  >
                    <div className="transaction-main">
                      <div className="transaction-details">
                        <h4>{incomeItem.description}</h4>
                        {incomeItem.source && (
                          <p className="transaction-vendor">
                            from {incomeItem.source}
                          </p>
                        )}
                        <div className="transaction-meta">
                          <span className="transaction-category income-category">
                            {incomeItem.category}
                          </span>
                          <span className="transaction-date">
                            {formatDate(incomeItem.income_date)}
                          </span>
                        </div>
                      </div>
                      <div className="transaction-amount income-amount">
                        +{formatCurrency(incomeItem.amount)}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
