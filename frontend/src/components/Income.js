import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getIncome, deleteIncome } from "../services/income";
import AddIncome from "./AddIncome";
import "./Income.css";

const Income = () => {
  const navigate = useNavigate();
  const [income, setIncome] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [groupedIncome, setGroupedIncome] = useState({});
  const [showAddIncome, setShowAddIncome] = useState(false);

  useEffect(() => {
    loadAllIncome();
  }, []);

  const loadAllIncome = async () => {
    try {
      setLoading(true);
      setError("");

      // Load all income (set a high limit to get all)
      const response = await getIncome(0, 10000); // Get up to 10,000 income records
      const incomeArray = response || [];

      setIncome(incomeArray);

      // Group income by month and then by day
      const grouped = groupIncomeByMonthAndDay(incomeArray);
      setGroupedIncome(grouped);
    } catch (err) {
      setError("Failed to load income");
    } finally {
      setLoading(false);
    }
  };

  const groupIncomeByMonthAndDay = (incomeList) => {
    const grouped = {};

    incomeList.forEach((incomeItem) => {
      const date = new Date(incomeItem.income_date);
      const monthYear = date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
      });
      const dayDate = date.toLocaleDateString();

      if (!grouped[monthYear]) {
        grouped[monthYear] = {};
      }

      if (!grouped[monthYear][dayDate]) {
        grouped[monthYear][dayDate] = [];
      }

      grouped[monthYear][dayDate].push(incomeItem);
    });

    return grouped;
  };

  const formatCurrency = (amount) => {
    // eslint-disable-next-line no-undef
    return new Intl.NumberFormat("en-LK", {
      style: "currency",
      currency: "LKR",
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const handleIncomeAdded = () => {
    // Refresh the income list
    loadAllIncome();
  };

  const handleDeleteIncome = async (incomeId) => {
    if (window.confirm("Are you sure you want to delete this income?")) {
      try {
        await deleteIncome(incomeId);
        await loadAllIncome(); // Refresh the list
      } catch (err) {
        setError("Failed to delete income");
      }
    }
  };

  if (loading) {
    return (
      <div className="income-container">
        <div className="income-header">
          <div className="header-left">
            <button
              className="back-btn"
              onClick={() => navigate("/dashboard")}
              title="Back to Dashboard"
            >
              ← Back
            </button>
            <h1>All Income</h1>
          </div>
        </div>
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading income...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="income-container">
        <div className="income-header">
          <div className="header-left">
            <button
              className="back-btn"
              onClick={() => navigate("/dashboard")}
              title="Back to Dashboard"
            >
              ← Back
            </button>
            <h1>All Income</h1>
          </div>
        </div>
        <div className="error-state">
          <p className="error-message">{error}</p>
          <button onClick={loadAllIncome} className="retry-btn">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="income-container">
      <div className="income-header">
        <div className="header-left">
          <button
            className="back-btn"
            onClick={() => navigate("/dashboard")}
            title="Back to Dashboard"
          >
            ← Back
          </button>
          <h1>All Income</h1>
        </div>
        <div className="header-right">
          <button
            className="add-income-btn"
            onClick={() => setShowAddIncome(!showAddIncome)}
          >
            {showAddIncome ? "✕ Cancel" : "+ Add Income"}
          </button>
        </div>
      </div>

      {income.length === 0 ? (
        <div className="empty-state">
          <p>No income records found</p>
          <p>Start by adding your first income!</p>
          <button
            className="add-first-income-btn"
            onClick={() => setShowAddIncome(true)}
          >
            + Add Your First Income
          </button>
        </div>
      ) : (
        <div className="income-summary">
          <p>Total: {income.length} income records</p>
          <p>
            Total Amount:{" "}
            {formatCurrency(
              income.reduce((sum, inc) => sum + parseFloat(inc.amount || 0), 0)
            )}
          </p>
        </div>
      )}

      {showAddIncome && (
        <AddIncome
          onIncomeAdded={handleIncomeAdded}
          onClose={() => setShowAddIncome(false)}
        />
      )}

      {income.length > 0 && (
        <div className="income-content">
          {Object.entries(groupedIncome)
            .sort(([a], [b]) => new Date(b) - new Date(a)) // Sort months descending
            .map(([monthYear, monthData]) => (
              <div key={monthYear} className="month-group">
                <h2 className="month-header">{monthYear}</h2>
                {Object.entries(monthData)
                  .sort(([a], [b]) => new Date(b) - new Date(a)) // Sort days descending
                  .map(([dayDate, dayIncome]) => (
                    <div key={dayDate} className="day-group">
                      <h3 className="day-header">
                        {formatDate(dayIncome[0].income_date)}
                        <span className="day-total">
                          {formatCurrency(
                            dayIncome.reduce(
                              (sum, inc) => sum + parseFloat(inc.amount || 0),
                              0
                            )
                          )}
                        </span>
                      </h3>
                      <div className="income-list">
                        {dayIncome.map((incomeItem) => (
                          <div key={incomeItem.id} className="income-item">
                            <div className="income-main">
                              <div className="income-description">
                                <h4>{incomeItem.description}</h4>
                                {incomeItem.source && (
                                  <p className="income-source">
                                    from {incomeItem.source}
                                  </p>
                                )}
                              </div>
                              <div className="income-amount">
                                {formatCurrency(incomeItem.amount)}
                              </div>
                            </div>
                            <div className="income-details">
                              <span className="income-category">
                                {incomeItem.category}
                              </span>
                              <div className="income-actions">
                                <button
                                  className="delete-btn"
                                  onClick={() =>
                                    handleDeleteIncome(incomeItem.id)
                                  }
                                  title="Delete income"
                                >
                                  🗑️
                                </button>
                              </div>
                            </div>
                            {incomeItem.items &&
                              incomeItem.items.length > 0 && (
                                <div className="income-items">
                                  <h5>Items:</h5>
                                  {incomeItem.items.map((item) => (
                                    <div
                                      key={item.id}
                                      className="income-item-detail"
                                    >
                                      <span>{item.description}</span>
                                      <span>
                                        {item.quantity} ×{" "}
                                        {formatCurrency(item.unit_price)} ={" "}
                                        {formatCurrency(item.line_total)}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
              </div>
            ))}
        </div>
      )}
    </div>
  );
};

export default Income;
