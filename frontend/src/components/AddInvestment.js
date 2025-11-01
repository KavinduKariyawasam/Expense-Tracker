import React, { useState } from "react";
import { createInvestment } from "../services/investment";
import "./AddInvestment.css";

const AddInvestment = ({ onInvestmentAdded, onClose }) => {
  const [formData, setFormData] = useState({
    name: "",
    type: "stocks",
    description: "",
    initial_amount: "",
    current_value: "",
    purchase_date: new Date().toISOString().split("T")[0],
    platform: "",
    currency: "LKR",
    status: "active",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const investmentTypes = [
    { value: "stocks", label: "Stocks" },
    { value: "bonds", label: "Bonds" },
    { value: "mutual_funds", label: "Mutual Funds" },
    { value: "etf", label: "ETF" },
    { value: "crypto", label: "Cryptocurrency" },
    { value: "real_estate", label: "Real Estate" },
    { value: "fixed_deposit", label: "Fixed Deposit" },
    { value: "other", label: "Other" },
  ];

  const currencies = [
    { value: "LKR", label: "Sri Lankan Rupee (LKR)" },
    { value: "USD", label: "US Dollar (USD)" },
    { value: "EUR", label: "Euro (EUR)" },
    { value: "GBP", label: "British Pound (GBP)" },
    { value: "INR", label: "Indian Rupee (INR)" },
    { value: "JPY", label: "Japanese Yen (JPY)" },
  ];

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    // Clear error and success message when user starts typing
    if (error) {
      setError("");
    }
    if (successMessage) {
      setSuccessMessage("");
    }
  };

  const validateForm = () => {
    if (!formData.name.trim()) {
      setError("Investment name is required");
      return false;
    }

    if (!formData.initial_amount || parseFloat(formData.initial_amount) <= 0) {
      setError("Please enter a valid initial amount greater than 0");
      return false;
    }

    if (formData.current_value && parseFloat(formData.current_value) < 0) {
      setError("Current value cannot be negative");
      return false;
    }

    if (!formData.purchase_date) {
      setError("Please select a purchase date");
      return false;
    }

    return true;
  };

  const handleSubmit = async (e, shouldClose = false) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setError("");
    setSuccessMessage("");

    try {
      const investmentData = {
        name: formData.name.trim(),
        type: formData.type,
        description: formData.description.trim() || null,
        initial_amount: parseFloat(formData.initial_amount),
        current_value: formData.current_value
          ? parseFloat(formData.current_value)
          : parseFloat(formData.initial_amount), // Default to initial amount
        purchase_date: formData.purchase_date,
        platform: formData.platform.trim() || null,
        currency: formData.currency,
        status: formData.status,
      };

      const newInvestment = await createInvestment(investmentData);

      // Show success message
      const message = shouldClose
        ? "Investment added successfully!"
        : "Investment added! Add another one below.";
      setSuccessMessage(message);

      // Notify parent component
      if (onInvestmentAdded) {
        onInvestmentAdded(newInvestment);
      }

      if (shouldClose) {
        // Close the form
        setTimeout(() => {
          if (onClose) onClose();
        }, 1000);
      } else {
        // Reset form for next entry
        setFormData({
          name: "",
          type: "stocks",
          description: "",
          initial_amount: "",
          current_value: "",
          purchase_date: new Date().toISOString().split("T")[0],
          platform: "",
          currency: "LKR",
          status: "active",
        });

        // Auto-focus name field for next entry
        setTimeout(() => {
          const nameInput = document.getElementById("investment-name");
          if (nameInput) nameInput.focus();
        }, 100);
      }
    } catch (err) {
      console.error("Error creating investment:", err);
      setError(err.message || "Failed to create investment");
    } finally {
      setLoading(false);
    }
  };

  const quickFillAmount = (amount) => {
    setFormData((prev) => ({
      ...prev,
      initial_amount: amount.toString(),
      current_value: amount.toString(),
    }));
  };

  const copyInitialToCurrent = () => {
    if (formData.initial_amount) {
      setFormData((prev) => ({
        ...prev,
        current_value: prev.initial_amount,
      }));
    }
  };

  const handleKeyDown = (e) => {
    // Ctrl+Enter to submit and continue
    if (e.ctrlKey && e.key === "Enter") {
      e.preventDefault();
      handleSubmit(e, false);
    }
    // Ctrl+Shift+Enter to submit and close
    else if (e.ctrlKey && e.shiftKey && e.key === "Enter") {
      e.preventDefault();
      handleSubmit(e, true);
    }
  };

  const handleCancel = () => {
    // Reset form
    setFormData({
      name: "",
      type: "stocks",
      description: "",
      initial_amount: "",
      current_value: "",
      purchase_date: new Date().toISOString().split("T")[0],
      platform: "",
      currency: "LKR",
      status: "active",
    });
    setError("");
    setSuccessMessage("");

    if (onClose) {
      onClose();
    }
  };

  return (
    <div className="add-investment-container">
      <div className="add-investment-header">
        <h3>Add New Investment</h3>
        <button
          type="button"
          className="close-btn"
          onClick={handleCancel}
          disabled={loading}
        >
          ✕
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}

      {successMessage && (
        <div className="success-message">{successMessage}</div>
      )}

      <form
        onSubmit={(e) => handleSubmit(e, false)}
        className="add-investment-form"
        onKeyDown={handleKeyDown}
      >
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="investment-name">Investment Name *</label>
            <input
              type="text"
              id="investment-name"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              placeholder="e.g., Apple Inc, Bitcoin, Real Estate Property"
              required
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="investment-type">Type *</label>
            <select
              id="investment-type"
              name="type"
              value={formData.type}
              onChange={handleInputChange}
              required
              disabled={loading}
            >
              {investmentTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="purchase-date">Purchase Date *</label>
            <input
              type="date"
              id="purchase-date"
              name="purchase_date"
              value={formData.purchase_date}
              onChange={handleInputChange}
              required
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="currency">Currency *</label>
            <select
              id="currency"
              name="currency"
              value={formData.currency}
              onChange={handleInputChange}
              disabled={loading}
            >
              {currencies.map((currency) => (
                <option key={currency.value} value={currency.value}>
                  {currency.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="platform">Platform/Broker (Optional)</label>
          <input
            type="text"
            id="platform"
            name="platform"
            value={formData.platform}
            onChange={handleInputChange}
            placeholder="e.g., Robinhood, Fidelity, Charles Schwab, CSE"
            disabled={loading}
          />
        </div>

        <div className="form-group">
          <label htmlFor="description">Description (Optional)</label>
          <textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={handleInputChange}
            placeholder="Additional details about this investment..."
            rows="3"
            disabled={loading}
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="initial-amount">
              Initial Amount ({formData.currency}) *
            </label>
            <div className="amount-input-group">
              <input
                type="number"
                id="initial-amount"
                name="initial_amount"
                value={formData.initial_amount}
                onChange={handleInputChange}
                placeholder="0.00"
                min="0"
                step="0.01"
                required
                disabled={loading}
              />
              <div className="quick-amounts">
                <button
                  type="button"
                  onClick={() => quickFillAmount(10000)}
                  disabled={loading}
                >
                  10K
                </button>
                <button
                  type="button"
                  onClick={() => quickFillAmount(50000)}
                  disabled={loading}
                >
                  50K
                </button>
                <button
                  type="button"
                  onClick={() => quickFillAmount(100000)}
                  disabled={loading}
                >
                  100K
                </button>
                <button
                  type="button"
                  onClick={() => quickFillAmount(500000)}
                  disabled={loading}
                >
                  500K
                </button>
              </div>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="current-value">
              Current Value ({formData.currency})
            </label>
            <div className="amount-input-group">
              <input
                type="number"
                id="current-value"
                name="current_value"
                value={formData.current_value}
                onChange={handleInputChange}
                placeholder="Leave empty to use initial amount"
                min="0"
                step="0.01"
                disabled={loading}
              />
              <button
                type="button"
                className="copy-initial-btn"
                onClick={copyInitialToCurrent}
                disabled={loading || !formData.initial_amount}
                title="Copy initial amount to current value"
              >
                📋 Copy Initial
              </button>
            </div>
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="status">Status</label>
          <select
            id="status"
            name="status"
            value={formData.status}
            onChange={handleInputChange}
            disabled={loading}
          >
            <option value="active">Active</option>
            <option value="sold">Sold</option>
            <option value="matured">Matured</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        <div className="form-actions">
          <button
            type="button"
            className="cancel-btn"
            onClick={handleCancel}
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="button"
            className="submit-btn continue-btn"
            disabled={loading}
            onClick={(e) => handleSubmit(e, false)}
          >
            {loading ? "Adding..." : "Add & Continue"}
          </button>
          <button
            type="button"
            className="submit-btn finish-btn"
            disabled={loading}
            onClick={(e) => handleSubmit(e, true)}
          >
            Add & Finish
          </button>
        </div>

        <div className="keyboard-shortcuts">
          <small>
            💡 Shortcuts: Ctrl+Enter = Add & Continue, Ctrl+Shift+Enter = Add &
            Finish
          </small>
        </div>
      </form>
    </div>
  );
};

export default AddInvestment;
