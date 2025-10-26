import React, { useState } from "react";
import { createIncome } from "../services/income";
import { INCOME_CATEGORIES } from "../constants/categories";
import "./AddIncome.css";

const AddIncome = ({ onIncomeAdded, onClose }) => {
  const [formData, setFormData] = useState({
    source: "",
    description: "",
    amount: "",
    category: "Salary",
    income_date: new Date().toISOString().split("T")[0], // Today's date as default
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [bulkMode, setBulkMode] = useState(true); // Start with bulk mode by default
  const [lastIncome, setLastIncome] = useState(null); // Store last added income for quick copy
  const [bulkIncomes, setBulkIncomes] = useState([
    {
      id: 1,
      source: "",
      description: "",
      amount: "",
      category: "Salary",
    },
    {
      id: 2,
      source: "",
      description: "",
      amount: "",
      category: "Salary",
    },
    {
      id: 3,
      source: "",
      description: "",
      amount: "",
      category: "Salary",
    },
  ]);
  const [bulkDate, setBulkDate] = useState(
    new Date().toISOString().split("T")[0]
  );

  // Use shared income categories
  const categories = INCOME_CATEGORIES;

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
    if (!formData.description.trim()) {
      setError("Description is required");
      return false;
    }

    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      setError("Please enter a valid amount greater than 0");
      return false;
    }

    if (!formData.income_date) {
      setError("Please select a date");
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
      const incomeData = {
        source: formData.source.trim() || null,
        description: formData.description.trim(),
        amount: parseFloat(formData.amount),
        category: formData.category,
        income_date: formData.income_date,
        items: [], // Empty items array for manual income
      };

      const newIncome = await createIncome(incomeData);

      // Store last income for quick copy
      setLastIncome(incomeData);

      // Show success message
      const message = shouldClose
        ? "Income added successfully!"
        : bulkMode
        ? "Income added! Fields preserved for bulk entry."
        : "Income added! Add another one below.";
      setSuccessMessage(message);

      // Notify parent component
      if (onIncomeAdded) {
        onIncomeAdded(newIncome);
      }

      if (shouldClose) {
        // Close the form
        setTimeout(() => {
          if (onClose) onClose();
        }, 1000);
      } else {
        // Reset form but keep some fields for quick entry based on bulk mode
        if (bulkMode) {
          // In bulk mode: keep source, category, and date
          setFormData((prevData) => ({
            source: prevData.source, // Keep source for bulk entries
            description: "", // Clear description
            amount: "", // Clear amount
            category: prevData.category, // Keep category for bulk entries
            income_date: prevData.income_date, // Keep date for bulk entries
          }));
        } else {
          // In normal mode: reset everything to defaults
          setFormData({
            source: "",
            description: "",
            amount: "",
            category: "Salary",
            income_date: new Date().toISOString().split("T")[0],
          });
        }

        // Auto-focus description field for next entry
        setTimeout(() => {
          const descInput = document.getElementById("description");
          if (descInput) descInput.focus();
        }, 100);
      }
    } catch (err) {
      console.error("Error creating income:", err);
      setError(err.message || "Failed to create income");
    } finally {
      setLoading(false);
    }
  };

  const copyLastIncome = () => {
    if (lastIncome) {
      setFormData({
        source: lastIncome.source || "",
        description: lastIncome.description,
        amount: lastIncome.amount.toString(),
        category: lastIncome.category,
        income_date: lastIncome.income_date,
      });
      setSuccessMessage("");
      setError("");
    }
  };

  const quickFillAmount = (amount) => {
    setFormData((prev) => ({
      ...prev,
      amount: amount.toString(),
    }));
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

  // Bulk mode functions
  const addBulkIncomeRow = () => {
    const newId = Math.max(...bulkIncomes.map((e) => e.id)) + 1;
    setBulkIncomes((prev) => [
      ...prev,
      {
        id: newId,
        source: "",
        description: "",
        amount: "",
        category: "Salary",
      },
    ]);
  };

  const removeBulkIncomeRow = (id) => {
    if (bulkIncomes.length > 1) {
      setBulkIncomes((prev) => prev.filter((income) => income.id !== id));
    }
  };

  const updateBulkIncome = (id, field, value) => {
    setBulkIncomes((prev) =>
      prev.map((income) =>
        income.id === id ? { ...income, [field]: value } : income
      )
    );
  };

  const validateBulkIncomes = () => {
    if (!bulkDate) {
      setError("Please select a date for all incomes");
      return false;
    }

    const validIncomes = bulkIncomes.filter(
      (inc) =>
        inc.description.trim() && inc.amount && parseFloat(inc.amount) > 0
    );

    if (validIncomes.length === 0) {
      setError("Please add at least one income with description and amount");
      return false;
    }

    return true;
  };

  const handleBulkSubmit = async () => {
    if (!validateBulkIncomes()) {
      return;
    }

    setLoading(true);
    setError("");
    setSuccessMessage("");

    try {
      const validIncomes = bulkIncomes.filter(
        (inc) =>
          inc.description.trim() && inc.amount && parseFloat(inc.amount) > 0
      );

      const incomePromises = validIncomes.map((income) =>
        createIncome({
          source: income.source.trim() || null,
          description: income.description.trim(),
          amount: parseFloat(income.amount),
          category: income.category,
          income_date: bulkDate,
          items: [],
        })
      );

      const results = await Promise.all(incomePromises);

      // Clear the table and reset
      setBulkIncomes([
        {
          id: 1,
          source: "",
          description: "",
          amount: "",
          category: "Salary",
        },
        {
          id: 2,
          source: "",
          description: "",
          amount: "",
          category: "Salary",
        },
        {
          id: 3,
          source: "",
          description: "",
          amount: "",
          category: "Salary",
        },
      ]);

      setSuccessMessage(`Successfully added ${results.length} incomes!`);

      // Notify parent component for each income
      if (onIncomeAdded) {
        results.forEach((result) => onIncomeAdded(result));
      }
    } catch (err) {
      console.error("Error creating bulk incomes:", err);
      setError(err.message || "Failed to create incomes");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    // Reset form - respect bulk mode when available
    setFormData({
      source: "",
      description: "",
      amount: "",
      category: "Salary",
      income_date: new Date().toISOString().split("T")[0],
    });
    setError("");
    setSuccessMessage("");

    if (onClose) {
      onClose();
    }
  };

  return (
    <div className="add-income-container">
      <div className="add-income-header">
        <h3>{bulkMode ? "Add Multiple Incomes" : "Add New Income"}</h3>
        <div className="header-controls">
          <label className="bulk-mode-toggle">
            <input
              type="checkbox"
              checked={bulkMode}
              onChange={(e) => setBulkMode(e.target.checked)}
            />
            {bulkMode
              ? "Table Mode ✅ (Multiple entries)"
              : "Single Mode (One at a time)"}
          </label>
          <button
            type="button"
            className="close-btn"
            onClick={handleCancel}
            disabled={loading}
          >
            ✕
          </button>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      {successMessage && (
        <div className="success-message">{successMessage}</div>
      )}

      {bulkMode ? (
        // Bulk Mode - Table Interface
        <div className="bulk-income-container">
          <div className="bulk-date-selector">
            <label htmlFor="bulk-date">Date for all incomes *</label>
            <input
              type="date"
              id="bulk-date"
              value={bulkDate}
              onChange={(e) => setBulkDate(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          <div className="bulk-incomes-table">
            <div className="table-header">
              <span>Source</span>
              <span>Description *</span>
              <span>Amount (LKR) *</span>
              <span>Category</span>
              <span>Actions</span>
            </div>

            {bulkIncomes.map((income, index) => (
              <div key={income.id} className="table-row">
                <input
                  type="text"
                  placeholder="Income source"
                  value={income.source}
                  onChange={(e) =>
                    updateBulkIncome(income.id, "source", e.target.value)
                  }
                  disabled={loading}
                />
                <input
                  type="text"
                  placeholder="Description of income"
                  value={income.description}
                  onChange={(e) =>
                    updateBulkIncome(income.id, "description", e.target.value)
                  }
                  disabled={loading}
                  required
                />
                <input
                  type="number"
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                  value={income.amount}
                  onChange={(e) =>
                    updateBulkIncome(income.id, "amount", e.target.value)
                  }
                  disabled={loading}
                  required
                />
                <select
                  value={income.category}
                  onChange={(e) =>
                    updateBulkIncome(income.id, "category", e.target.value)
                  }
                  disabled={loading}
                >
                  {categories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
                <div className="row-actions">
                  {bulkIncomes.length > 1 && (
                    <button
                      type="button"
                      className="remove-row-btn"
                      onClick={() => removeBulkIncomeRow(income.id)}
                      disabled={loading}
                      title="Remove this income"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="bulk-table-actions">
            <button
              type="button"
              className="add-row-btn"
              onClick={addBulkIncomeRow}
              disabled={loading}
            >
              + Add Another Income
            </button>
          </div>

          <div className="bulk-form-actions">
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
              className="submit-btn bulk-submit-btn"
              onClick={handleBulkSubmit}
              disabled={loading}
            >
              {loading
                ? "Adding Incomes..."
                : `Add ${
                    bulkIncomes.filter((e) => e.description && e.amount).length
                  } Incomes`}
            </button>
          </div>
        </div>
      ) : (
        // Single Mode - Original Form
        <div>
          {lastIncome && (
            <div className="quick-actions">
              <button
                type="button"
                className="copy-last-btn"
                onClick={copyLastIncome}
                disabled={loading}
              >
                📋 Copy Last: {lastIncome.description} ({lastIncome.amount} LKR)
              </button>
            </div>
          )}

          <form
            onSubmit={(e) => handleSubmit(e, false)}
            className="add-income-form"
            onKeyDown={handleKeyDown}
          >
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="income_date">Date *</label>
                <input
                  type="date"
                  id="income_date"
                  name="income_date"
                  value={formData.income_date}
                  onChange={handleInputChange}
                  required
                  disabled={loading}
                />
              </div>

              <div className="form-group">
                <label htmlFor="category">Category *</label>
                <select
                  id="category"
                  name="category"
                  value={formData.category}
                  onChange={handleInputChange}
                  required
                  disabled={loading}
                >
                  {categories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="source">Source (Optional)</label>
              <input
                type="text"
                id="source"
                name="source"
                value={formData.source}
                onChange={handleInputChange}
                placeholder="e.g., Company Name, Client, Investment Platform"
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label htmlFor="description">Description *</label>
              <input
                type="text"
                id="description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder="e.g., Monthly Salary, Freelance Project, Dividend"
                required
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label htmlFor="amount">Amount (LKR) *</label>
              <div className="amount-input-group">
                <input
                  type="number"
                  id="amount"
                  name="amount"
                  value={formData.amount}
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
                    onClick={() => quickFillAmount(5000)}
                    disabled={loading}
                  >
                    5K
                  </button>
                  <button
                    type="button"
                    onClick={() => quickFillAmount(10000)}
                    disabled={loading}
                  >
                    10K
                  </button>
                  <button
                    type="button"
                    onClick={() => quickFillAmount(25000)}
                    disabled={loading}
                  >
                    25K
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
                </div>
              </div>
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
                💡 Shortcuts: Ctrl+Enter = Add & Continue, Ctrl+Shift+Enter =
                Add & Finish
              </small>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default AddIncome;
