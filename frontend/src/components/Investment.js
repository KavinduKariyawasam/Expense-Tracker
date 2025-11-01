import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  getInvestments,
  deleteInvestment,
  updateInvestment,
} from "../services/investment";
import AddInvestment from "./AddInvestment";
import "./Investment.css";

const Investment = () => {
  const navigate = useNavigate();
  const [investments, setInvestments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [groupedInvestments, setGroupedInvestments] = useState({});
  const [showAddInvestment, setShowAddInvestment] = useState(false);
  const [editingInvestment, setEditingInvestment] = useState(null);
  const [editFormData, setEditFormData] = useState({});
  const [expandedTypes, setExpandedTypes] = useState({});

  useEffect(() => {
    loadAllInvestments();
  }, []);

  const loadAllInvestments = async () => {
    try {
      setLoading(true);
      setError("");

      // Load all investments (set a high limit to get all)
      const response = await getInvestments(0, 10000);
      const investmentArray = response || [];

      setInvestments(investmentArray);

      // Group investments by type
      const grouped = groupInvestmentsByType(investmentArray);
      setGroupedInvestments(grouped);
    } catch (err) {
      setError("Failed to load investments");
    } finally {
      setLoading(false);
    }
  };

  const groupInvestmentsByType = (investmentList) => {
    const grouped = {};

    investmentList.forEach((investment) => {
      const type = investment.type;

      if (!grouped[type]) {
        grouped[type] = [];
      }

      grouped[type].push(investment);
    });

    return grouped;
  };

  const getTotalInvested = () => {
    return investments.reduce(
      (sum, inv) => sum + parseFloat(inv.initial_amount || 0),
      0
    );
  };

  const getCurrentTotalValue = () => {
    return investments.reduce(
      (sum, inv) => sum + parseFloat(inv.current_value || 0),
      0
    );
  };

  const getTotalGainLoss = () => {
    return getCurrentTotalValue() - getTotalInvested();
  };

  const getTotalGainLossPercentage = () => {
    const totalInvested = getTotalInvested();
    if (totalInvested === 0) return 0;
    return (getTotalGainLoss() / totalInvested) * 100;
  };

  const getActiveInvestmentsCount = () => {
    return investments.filter((inv) => inv.status === "active").length;
  };

  const formatCurrency = (amount, currency = "LKR") => {
    const currencySymbols = {
      LKR: "Rs. ",
      USD: "$",
      EUR: "€",
      GBP: "£",
      INR: "₹",
      JPY: "¥",
    };

    const symbol = currencySymbols[currency] || currency + " ";

    return new Intl.NumberFormat("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
      .format(amount)
      .replace(/^/, symbol);
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

  const getTypeDisplayName = (type) => {
    const typeNames = {
      stocks: "Stocks",
      bonds: "Bonds",
      mutual_funds: "Mutual Funds",
      etf: "ETFs",
      crypto: "Cryptocurrency",
      real_estate: "Real Estate",
      fixed_deposit: "Fixed Deposits",
      other: "Other",
    };
    return typeNames[type] || type;
  };

  const getStatusColor = (status) => {
    const colors = {
      active: "green",
      sold: "blue",
      matured: "purple",
      cancelled: "red",
    };
    return colors[status] || "gray";
  };

  const getGainLossColor = (gainLoss) => {
    if (gainLoss > 0) return "gain";
    if (gainLoss < 0) return "loss";
    return "neutral";
  };

  const handleInvestmentAdded = () => {
    // Refresh the investments list
    loadAllInvestments();
  };

  const handleDeleteInvestment = async (investmentId) => {
    if (window.confirm("Are you sure you want to delete this investment?")) {
      try {
        await deleteInvestment(investmentId);
        await loadAllInvestments(); // Refresh the list
      } catch (err) {
        setError("Failed to delete investment");
      }
    }
  };

  const handleEditInvestment = (investment) => {
    setEditingInvestment(investment.id);
    setEditFormData({
      name: investment.name || "",
      type: investment.type,
      description: investment.description || "",
      current_value: investment.current_value,
      platform: investment.platform || "",
      status: investment.status,
    });
  };

  const handleCancelEdit = () => {
    setEditingInvestment(null);
    setEditFormData({});
  };

  const handleSaveEdit = async () => {
    try {
      await updateInvestment(editingInvestment, editFormData);
      setEditingInvestment(null);
      setEditFormData({});
      loadAllInvestments(); // Refresh the list
    } catch (err) {
      setError("Failed to update investment");
    }
  };

  const handleEditFormChange = (field, value) => {
    setEditFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const toggleTypeExpansion = (type) => {
    setExpandedTypes((prev) => ({
      ...prev,
      [type]: !prev[type],
    }));
  };

  const isTypeExpanded = (type) => {
    // If no explicit state is set, expand all types by default
    if (expandedTypes[type] === undefined) {
      return true;
    }
    return expandedTypes[type];
  };

  if (loading) {
    return (
      <div className="investment-container">
        <div className="investment-header">
          <div className="header-left">
            <button
              className="back-btn"
              onClick={() => navigate("/dashboard")}
              title="Back to Dashboard"
            >
              ← Back
            </button>
            <h1>All Investments</h1>
          </div>
        </div>
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading investments...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="investment-container">
        <div className="investment-header">
          <div className="header-left">
            <button
              className="back-btn"
              onClick={() => navigate("/dashboard")}
              title="Back to Dashboard"
            >
              ← Back
            </button>
            <h1>All Investments</h1>
          </div>
        </div>
        <div className="error-state">
          <p className="error-message">{error}</p>
          <button onClick={loadAllInvestments} className="retry-btn">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="investment-container">
      <div className="investment-header">
        <div className="header-left">
          <button
            className="back-btn"
            onClick={() => navigate("/dashboard")}
            title="Back to Dashboard"
          >
            ← Back
          </button>
          <h1>All Investments</h1>
        </div>
        <div className="header-right">
          <button
            className="add-investment-btn"
            onClick={() => setShowAddInvestment(!showAddInvestment)}
          >
            {showAddInvestment ? "✕ Cancel" : "+ Add Investment"}
          </button>
        </div>
      </div>

      {investments.length === 0 ? (
        <div className="empty-state">
          <p>No investment records found</p>
          <p>Start by adding your first investment!</p>
          <button
            className="add-first-investment-btn"
            onClick={() => setShowAddInvestment(true)}
          >
            + Add Your First Investment
          </button>
        </div>
      ) : (
        <div className="investment-summary">
          <div className="summary-stats">
            <div className="stat-item">
              <span className="stat-label">Total Investments:</span>
              <span className="stat-value">{investments.length}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Active Investments:</span>
              <span className="stat-value">{getActiveInvestmentsCount()}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Total Invested:</span>
              <span className="stat-value">
                {formatCurrency(getTotalInvested())}
              </span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Current Value:</span>
              <span className="stat-value">
                {formatCurrency(getCurrentTotalValue())}
              </span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Total Gain/Loss:</span>
              <span
                className={`stat-value ${getGainLossColor(getTotalGainLoss())}`}
              >
                {formatCurrency(getTotalGainLoss())} (
                {getTotalGainLossPercentage() >= 0 ? "+" : ""}
                {getTotalGainLossPercentage().toFixed(2)}%)
              </span>
            </div>
          </div>
        </div>
      )}

      {showAddInvestment && (
        <AddInvestment
          onInvestmentAdded={handleInvestmentAdded}
          onClose={() => setShowAddInvestment(false)}
        />
      )}

      {investments.length > 0 && (
        <div className="investment-content">
          {Object.entries(groupedInvestments)
            .sort(([a], [b]) => a.localeCompare(b)) // Sort types alphabetically
            .map(([type, typeInvestments]) => (
              <div key={type} className="type-group">
                <div
                  className="type-header clickable"
                  onClick={() => toggleTypeExpansion(type)}
                >
                  <div className="type-header-left">
                    <span className="expand-icon">
                      {isTypeExpanded(type) ? "▼" : "▶"}
                    </span>
                    <h2>{getTypeDisplayName(type)}</h2>
                    <span className="type-count">
                      ({typeInvestments.length})
                    </span>
                  </div>
                  <div className="type-summary">
                    <span className="type-invested">
                      Invested:{" "}
                      {formatCurrency(
                        typeInvestments.reduce(
                          (sum, inv) =>
                            sum + parseFloat(inv.initial_amount || 0),
                          0
                        )
                      )}
                    </span>
                    <span className="type-current">
                      Current:{" "}
                      {formatCurrency(
                        typeInvestments.reduce(
                          (sum, inv) =>
                            sum + parseFloat(inv.current_value || 0),
                          0
                        )
                      )}
                    </span>
                  </div>
                </div>
                {isTypeExpanded(type) && (
                  <div className="type-content">
                    <div className="investment-list">
                      {typeInvestments
                        .sort(
                          (a, b) =>
                            new Date(b.purchase_date) -
                            new Date(a.purchase_date)
                        ) // Sort by purchase date descending
                        .map((investment) => {
                          const gainLoss =
                            parseFloat(investment.current_value) -
                            parseFloat(investment.initial_amount);
                          const gainLossPercentage =
                            parseFloat(investment.initial_amount) > 0
                              ? (gainLoss /
                                  parseFloat(investment.initial_amount)) *
                                100
                              : 0;

                          return (
                            <div
                              key={investment.id}
                              className="investment-item"
                            >
                              {editingInvestment === investment.id ? (
                                // Edit mode
                                <div className="investment-edit-form">
                                  <div className="edit-row">
                                    <input
                                      type="text"
                                      placeholder="Investment Name"
                                      value={editFormData.name || ""}
                                      onChange={(e) =>
                                        handleEditFormChange(
                                          "name",
                                          e.target.value
                                        )
                                      }
                                      className="edit-input"
                                    />
                                    <select
                                      value={editFormData.type || ""}
                                      onChange={(e) =>
                                        handleEditFormChange(
                                          "type",
                                          e.target.value
                                        )
                                      }
                                      className="edit-input"
                                    >
                                      <option value="stocks">Stocks</option>
                                      <option value="bonds">Bonds</option>
                                      <option value="mutual_funds">
                                        Mutual Funds
                                      </option>
                                      <option value="etf">ETF</option>
                                      <option value="crypto">
                                        Cryptocurrency
                                      </option>
                                      <option value="real_estate">
                                        Real Estate
                                      </option>
                                      <option value="fixed_deposit">
                                        Fixed Deposit
                                      </option>
                                      <option value="other">Other</option>
                                    </select>
                                  </div>
                                  <div className="edit-row">
                                    <input
                                      type="number"
                                      placeholder="Current Value"
                                      value={editFormData.current_value || ""}
                                      onChange={(e) =>
                                        handleEditFormChange(
                                          "current_value",
                                          e.target.value
                                        )
                                      }
                                      className="edit-input"
                                    />
                                    <input
                                      type="text"
                                      placeholder="Platform"
                                      value={editFormData.platform || ""}
                                      onChange={(e) =>
                                        handleEditFormChange(
                                          "platform",
                                          e.target.value
                                        )
                                      }
                                      className="edit-input"
                                    />
                                  </div>
                                  <div className="edit-row">
                                    <select
                                      value={editFormData.status || ""}
                                      onChange={(e) =>
                                        handleEditFormChange(
                                          "status",
                                          e.target.value
                                        )
                                      }
                                      className="edit-input"
                                    >
                                      <option value="active">Active</option>
                                      <option value="sold">Sold</option>
                                      <option value="matured">Matured</option>
                                      <option value="cancelled">
                                        Cancelled
                                      </option>
                                    </select>
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
                                  <div className="edit-row">
                                    <textarea
                                      placeholder="Description"
                                      value={editFormData.description || ""}
                                      onChange={(e) =>
                                        handleEditFormChange(
                                          "description",
                                          e.target.value
                                        )
                                      }
                                      className="edit-input edit-textarea"
                                      rows="2"
                                    />
                                  </div>
                                </div>
                              ) : (
                                // View mode
                                <>
                                  <div className="investment-main">
                                    <div className="investment-info">
                                      <h4>{investment.name}</h4>
                                      {investment.platform && (
                                        <p className="investment-platform">
                                          via {investment.platform}
                                        </p>
                                      )}
                                      {investment.description && (
                                        <p className="investment-description">
                                          {investment.description}
                                        </p>
                                      )}
                                    </div>
                                    <div className="investment-values">
                                      <div className="value-item">
                                        <span className="value-label">
                                          Invested:
                                        </span>
                                        <span className="value-amount">
                                          {formatCurrency(
                                            investment.initial_amount,
                                            investment.currency
                                          )}
                                        </span>
                                      </div>
                                      <div className="value-item">
                                        <span className="value-label">
                                          Current:
                                        </span>
                                        <span className="value-amount">
                                          {formatCurrency(
                                            investment.current_value,
                                            investment.currency
                                          )}
                                        </span>
                                      </div>
                                      <div className="value-item">
                                        <span className="value-label">
                                          Gain/Loss:
                                        </span>
                                        <span
                                          className={`value-amount ${getGainLossColor(
                                            gainLoss
                                          )}`}
                                        >
                                          {gainLoss >= 0 ? "+" : ""}
                                          {formatCurrency(
                                            gainLoss,
                                            investment.currency
                                          )}{" "}
                                          ({gainLossPercentage >= 0 ? "+" : ""}
                                          {gainLossPercentage.toFixed(2)}%)
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                  <div className="investment-details">
                                    <div className="investment-meta">
                                      <span
                                        className={`investment-status status-${investment.status}`}
                                      >
                                        {investment.status}
                                      </span>
                                      <span className="investment-date">
                                        {formatDate(investment.purchase_date)}
                                      </span>
                                    </div>
                                    <div className="investment-actions">
                                      <button
                                        onClick={() =>
                                          handleEditInvestment(investment)
                                        }
                                        className="edit-btn"
                                        title="Edit investment"
                                      >
                                        ✏️
                                      </button>
                                      <button
                                        className="delete-btn"
                                        onClick={() =>
                                          handleDeleteInvestment(investment.id)
                                        }
                                        title="Delete investment"
                                      >
                                        🗑️
                                      </button>
                                    </div>
                                  </div>
                                </>
                              )}
                            </div>
                          );
                        })}
                    </div>
                  </div>
                )}
              </div>
            ))}
        </div>
      )}
    </div>
  );
};

export default Investment;
