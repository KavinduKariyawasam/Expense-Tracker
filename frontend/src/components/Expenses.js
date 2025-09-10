import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getExpenses } from "../services/expense";
import "./Expenses.css";

const Expenses = () => {
  const navigate = useNavigate();
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [groupedExpenses, setGroupedExpenses] = useState({});

  useEffect(() => {
    loadAllExpenses();
  }, []);

  const loadAllExpenses = async () => {
    try {
      setLoading(true);
      setError("");

      // Load all expenses (set a high limit to get all, or we could implement pagination)
      const response = await getExpenses(0, 10000); // Get up to 10,000 expenses
      console.log("API Response:", response); // Debug log
      console.log("Response.expenses:", response.expenses); // Debug log
      console.log("Response.expenses length:", response.expenses?.length); // Debug log

      const expensesArray = response.expenses || response || []; // Try different response structures
      console.log("Final expenses array:", expensesArray); // Debug log
      console.log("Final expenses array length:", expensesArray.length); // Debug log

      setExpenses(expensesArray);

      // Group expenses by month and then by day
      const grouped = groupExpensesByMonthAndDay(expensesArray);
      setGroupedExpenses(grouped);
    } catch (err) {
      console.error("Error loading expenses:", err);
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

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-LK", {
      style: "currency",
      currency: "LKR",
      minimumFractionDigits: 2,
    }).format(amount);
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
        <div className="expenses-summary">
          <p>Total: {expenses.length} transactions</p>
          <p>
            Amount:{" "}
            {formatCurrency(
              expenses.reduce(
                (sum, exp) => sum + parseFloat(exp.amount || 0),
                0
              )
            )}
          </p>
        </div>
      </div>

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
