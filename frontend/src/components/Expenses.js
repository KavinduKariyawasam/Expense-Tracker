import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getExpenses } from "../services/expense";
import AddExpense from "./AddExpense";
import "./Expenses.css";

const Expenses = () => {
  const navigate = useNavigate();
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [groupedExpenses, setGroupedExpenses] = useState({});
  const [showAddExpense, setShowAddExpense] = useState(false);

  useEffect(() => {
    loadAllExpenses();
  }, []);

  const loadAllExpenses = async () => {
    try {
      setLoading(true);
      setError("");

      // Load all expenses (set a high limit to get all, or we could implement pagination)
      const response = await getExpenses(0, 10000); // Get up to 10,000 expenses

      const expensesArray = response.expenses || response || []; // Try different response structures

      setExpenses(expensesArray);

      // Group expenses by month and then by day
      const grouped = groupExpensesByMonthAndDay(expensesArray);
      setGroupedExpenses(grouped);
    } catch (err) {
      setError("Failed to load expenses");
    } finally {
      setLoading(false);
    }
  };

  const groupExpensesByMonthAndDay = (expenses) => {
    const grouped = {};

    expenses.forEach((expense) => {
      const date = new Date(expense.expense_date);
      const monthYear = date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
      });
      const dayDate = date.toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });

      if (!grouped[monthYear]) {
        grouped[monthYear] = {};
      }

      if (!grouped[monthYear][dayDate]) {
        grouped[monthYear][dayDate] = [];
      }

      grouped[monthYear][dayDate].push(expense);
    });

    return grouped;
  };

  const handleExpenseAdded = () => {
    // Refresh the expenses list when a new expense is added
    loadAllExpenses();
    setShowAddExpense(false);
  };

  const calculateMonthTotal = (monthData) => {
    let total = 0;
    Object.values(monthData).forEach((dayExpenses) => {
      dayExpenses.forEach((expense) => {
        total += parseFloat(expense.amount || 0);
      });
    });
    return total;
  };

  const calculateDayTotal = (dayExpenses) => {
    return dayExpenses.reduce((total, expense) => {
      return total + parseFloat(expense.amount || 0);
    }, 0);
  };

  const getTotalAmount = () => {
    return expenses.reduce((sum, exp) => sum + parseFloat(exp.amount || 0), 0);
  };

  const getAverageAmount = () => {
    if (expenses.length === 0) return 0;
    return getTotalAmount() / expenses.length;
  };

  const getCurrentMonthTotal = () => {
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();

    return expenses
      .filter((expense) => {
        const expenseDate = new Date(expense.expense_date);
        return (
          expenseDate.getMonth() === currentMonth &&
          expenseDate.getFullYear() === currentYear
        );
      })
      .reduce((sum, exp) => sum + parseFloat(exp.amount || 0), 0);
  };

  const formatCurrency = (amount) => {
    if (amount === null || amount === undefined || isNaN(amount)) {
      return "LKR 0.00";
    }
    return `LKR ${Number(amount).toFixed(2)}`;
  };

  if (loading) {
    return (
      <div className="expenses-container">
        <div className="expenses-header">
          <div className="header-left">
            <button
              className="back-btn"
              onClick={() => navigate("/dashboard")}
              title="Back to Dashboard"
            >
              ← Back
            </button>
            <h1>All Transactions</h1>
          </div>
        </div>
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading transactions...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="expenses-container">
        <div className="expenses-header">
          <div className="header-left">
            <button
              className="back-btn"
              onClick={() => navigate("/dashboard")}
              title="Back to Dashboard"
            >
              ← Back
            </button>
            <h1>All Transactions</h1>
          </div>
        </div>
        <div className="error-state">
          <p className="error-message">{error}</p>
          <button onClick={loadAllExpenses} className="retry-btn">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (expenses.length === 0) {
    return (
      <div className="expenses-container">
        <div className="expenses-header">
          <div className="header-left">
            <button
              className="back-btn"
              onClick={() => navigate("/dashboard")}
              title="Back to Dashboard"
            >
              ← Back
            </button>
            <h1>All Transactions</h1>
          </div>
        </div>
        <div className="empty-state">
          <p>No transactions found</p>
          <p>Start by adding your first expense!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="expenses-container">
      <div className="expenses-header">
        <div className="header-top">
          <div className="header-left">
            <button
              className="back-btn"
              onClick={() => navigate("/dashboard")}
              title="Back to Dashboard"
            >
              ← Back
            </button>
            <h1>All Transactions</h1>
          </div>
          <div className="header-right">
            <button
              className="add-expense-btn"
              onClick={() => setShowAddExpense(!showAddExpense)}
              title={showAddExpense ? "Hide Add Expense" : "Add New Expense"}
            >
              {showAddExpense ? "✕ Close" : "➕ Add Expense"}
            </button>
          </div>
        </div>
        <div className="expenses-summary">
          <div className="summary-stats">
            <div className="stat-item">
              <span className="stat-label">Total Transactions:</span>
              <span className="stat-value">{expenses.length}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Total Amount:</span>
              <span className="stat-value">
                {formatCurrency(getTotalAmount())}
              </span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Average per Transaction:</span>
              <span className="stat-value">
                {formatCurrency(getAverageAmount())}
              </span>
            </div>
            <div className="stat-item">
              <span className="stat-label">This Month:</span>
              <span className="stat-value">
                {formatCurrency(getCurrentMonthTotal())}
              </span>
            </div>
          </div>
        </div>
      </div>

      {showAddExpense && (
        <div className="add-expense-section">
          <AddExpense
            onExpenseAdded={handleExpenseAdded}
            onClose={() => setShowAddExpense(false)}
          />
        </div>
      )}

      <div className="expenses-content">
        {Object.entries(groupedExpenses)
          .sort(([a], [b]) => new Date(b) - new Date(a)) // Sort months descending
          .map(([monthYear, monthData]) => (
            <div key={monthYear} className="month-group">
              <div className="month-header">
                <h2>{monthYear}</h2>
                <div className="month-total">
                  Total: {formatCurrency(calculateMonthTotal(monthData))}
                </div>
              </div>

              <div className="month-content">
                {Object.entries(monthData)
                  .sort(([a], [b]) => new Date(b) - new Date(a)) // Sort days descending
                  .map(([dayDate, dayExpenses]) => (
                    <div key={dayDate} className="day-group">
                      <div className="day-header">
                        <h3>{dayDate}</h3>
                        <div className="day-total">
                          {formatCurrency(calculateDayTotal(dayExpenses))}
                        </div>
                      </div>

                      <div className="day-expenses">
                        {dayExpenses
                          .sort(
                            (a, b) =>
                              new Date(b.created_at || b.expense_date) -
                              new Date(a.created_at || a.expense_date)
                          )
                          .map((expense) => (
                            <div key={expense.id} className="expense-item">
                              <div className="expense-main">
                                <div className="expense-description">
                                  <span className="description">
                                    {expense.description}
                                  </span>
                                  {expense.vendor && (
                                    <span className="vendor">
                                      @ {expense.vendor}
                                    </span>
                                  )}
                                </div>
                                <div className="expense-amount">
                                  {formatCurrency(expense.amount)}
                                </div>
                              </div>
                              <div className="expense-meta">
                                <span className="category">
                                  {expense.category}
                                </span>
                                {expense.items && expense.items.length > 0 && (
                                  <span className="items-count">
                                    {expense.items.length} items
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          ))}
      </div>
    </div>
  );
};

export default Expenses;
