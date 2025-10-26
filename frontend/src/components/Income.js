import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getIncome, deleteIncome, updateIncome } from "../services/income";
import AddIncome from "./AddIncome";
import "./Income.css";

const Income = () => {
  const navigate = useNavigate();
  const [income, setIncome] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [groupedIncome, setGroupedIncome] = useState({});
  const [showAddIncome, setShowAddIncome] = useState(false);
  const [editingIncome, setEditingIncome] = useState(null);
  const [editFormData, setEditFormData] = useState({});

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

  const getTotalAmount = () => {
    return income.reduce((sum, inc) => sum + parseFloat(inc.amount || 0), 0);
  };

  const getAverageAmount = () => {
    if (income.length === 0) return 0;
    return getTotalAmount() / income.length;
  };

  const getCurrentMonthTotal = () => {
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();

    return income
      .filter((incomeItem) => {
        const incomeDate = new Date(incomeItem.income_date);
        return (
          incomeDate.getMonth() === currentMonth &&
          incomeDate.getFullYear() === currentYear
        );
      })
      .reduce((sum, inc) => sum + parseFloat(inc.amount || 0), 0);
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

  const handleEditIncome = (incomeItem) => {
    setEditingIncome(incomeItem.id);
    setEditFormData({
      source: incomeItem.source || "",
      description: incomeItem.description,
      amount: incomeItem.amount,
      category: incomeItem.category,
      income_date: incomeItem.income_date,
    });
  };

  const handleCancelEdit = () => {
    setEditingIncome(null);
    setEditFormData({});
  };

  const handleSaveEdit = async () => {
    try {
      await updateIncome(editingIncome, editFormData);
      setEditingIncome(null);
      setEditFormData({});
      loadAllIncome(); // Refresh the list
    } catch (err) {
      setError("Failed to update income");
    }
  };

  const handleEditFormChange = (field, value) => {
    setEditFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
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
          <div className="summary-stats">
            <div className="stat-item">
              <span className="stat-label">Total Transactions:</span>
              <span className="stat-value">{income.length}</span>
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
                            {editingIncome === incomeItem.id ? (
                              // Edit mode
                              <div className="income-edit-form">
                                <div className="edit-row">
                                  <input
                                    type="text"
                                    placeholder="Description"
                                    value={editFormData.description || ""}
                                    onChange={(e) =>
                                      handleEditFormChange(
                                        "description",
                                        e.target.value
                                      )
                                    }
                                    className="edit-input"
                                  />
                                  <input
                                    type="text"
                                    placeholder="Source (optional)"
                                    value={editFormData.source || ""}
                                    onChange={(e) =>
                                      handleEditFormChange(
                                        "source",
                                        e.target.value
                                      )
                                    }
                                    className="edit-input"
                                  />
                                </div>
                                <div className="edit-row">
                                  <input
                                    type="number"
                                    placeholder="Amount"
                                    value={editFormData.amount || ""}
                                    onChange={(e) =>
                                      handleEditFormChange(
                                        "amount",
                                        e.target.value
                                      )
                                    }
                                    className="edit-input"
                                  />
                                  <select
                                    value={editFormData.category || ""}
                                    onChange={(e) =>
                                      handleEditFormChange(
                                        "category",
                                        e.target.value
                                      )
                                    }
                                    className="edit-input"
                                  >
                                    <option value="Salary">Salary</option>
                                    <option value="Freelance">Freelance</option>
                                    <option value="Business">Business</option>
                                    <option value="Investment">
                                      Investment
                                    </option>
                                    <option value="Gift">Gift</option>
                                    <option value="Other">Other</option>
                                  </select>
                                </div>
                                <div className="edit-row">
                                  <input
                                    type="date"
                                    value={editFormData.income_date || ""}
                                    onChange={(e) =>
                                      handleEditFormChange(
                                        "income_date",
                                        e.target.value
                                      )
                                    }
                                    className="edit-input"
                                  />
                                  <div className="edit-actions">
                                    <button
                                      onClick={handleSaveEdit}
                                      className="save-btn"
                                    >
                                      ✓ Save
                                    </button>
                                    <button
                                      onClick={handleCancelEdit}
                                      className="cancel-btn"
                                    >
                                      ✕ Cancel
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              // View mode
                              <>
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
                                      onClick={() =>
                                        handleEditIncome(incomeItem)
                                      }
                                      className="edit-btn"
                                      title="Edit income"
                                    >
                                      ✏️
                                    </button>
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
                              </>
                            )}
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
