import React, { useState } from "react";
import { createExpense } from "../services/expense";
import { EXPENSE_CATEGORIES } from "../constants/categories";
import "./AddExpense.css";

const AddExpense = ({ onExpenseAdded, onClose }) => {
  const [formData, setFormData] = useState({
    vendor: "",
    description: "",
    amount: "",
    category: "Food & Dining",
    expense_date: new Date().toISOString().split("T")[0], // Today's date as default
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [bulkMode, setBulkMode] = useState(true); // Start with bulk mode by default
  const [lastExpense, setLastExpense] = useState(null); // Store last added expense for quick copy
  const [bulkExpenses, setBulkExpenses] = useState([
    {
      id: 1,
      vendor: "",
      description: "",
      amount: "",
      category: "Food & Dining",
    },
    {
      id: 2,
      vendor: "",
      description: "",
      amount: "",
      category: "Food & Dining",
    },
    {
      id: 3,
      vendor: "",
      description: "",
      amount: "",
      category: "Food & Dining",
    },
  ]);
  const [bulkDate, setBulkDate] = useState(
    new Date().toISOString().split("T")[0]
  );

  // Use shared expense categories
  const categories = EXPENSE_CATEGORIES;

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

    if (!formData.expense_date) {
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
      const expenseData = {
        vendor: formData.vendor.trim() || null,
        description: formData.description.trim(),
        amount: parseFloat(formData.amount),
        category: formData.category,
        expense_date: formData.expense_date,
        items: [], // Empty items array for manual expenses
      };

      const newExpense = await createExpense(expenseData);

      // Store last expense for quick copy
      setLastExpense(expenseData);

      // Show success message
      const message = shouldClose
        ? "Expense added successfully!"
        : bulkMode
        ? "Expense added! Fields preserved for bulk entry."
        : "Expense added! Add another one below.";
      setSuccessMessage(message);

      // Notify parent component
      if (onExpenseAdded) {
        onExpenseAdded(newExpense);
      }

      if (shouldClose) {
        // Close the form
        setTimeout(() => {
          if (onClose) onClose();
        }, 1000);
      } else {
        // Reset form but keep some fields for quick entry based on bulk mode
        if (bulkMode) {
          // In bulk mode: keep vendor, category, and date
          setFormData((prevData) => ({
            vendor: prevData.vendor, // Keep vendor for bulk entries
            description: "", // Clear description
            amount: "", // Clear amount
            category: prevData.category, // Keep category for bulk entries
            expense_date: prevData.expense_date, // Keep date for bulk entries
          }));
        } else {
          // In normal mode: reset everything to defaults
          setFormData({
            vendor: "",
            description: "",
            amount: "",
            category: "Food & Dining",
            expense_date: new Date().toISOString().split("T")[0],
          });
        }

        // Auto-focus description field for next entry
        setTimeout(() => {
          const descInput = document.getElementById("description");
          if (descInput) descInput.focus();
        }, 100);
      }
    } catch (err) {
      console.error("Error creating expense:", err);
      setError(err.message || "Failed to create expense");
    } finally {
      setLoading(false);
    }
  };

  const copyLastExpense = () => {
    if (lastExpense) {
      setFormData({
        vendor: lastExpense.vendor || "",
        description: lastExpense.description,
        amount: lastExpense.amount.toString(),
        category: lastExpense.category,
        expense_date: lastExpense.expense_date,
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
  const addBulkExpenseRow = () => {
    const newId = Math.max(...bulkExpenses.map((e) => e.id)) + 1;
    setBulkExpenses((prev) => [
      ...prev,
      {
        id: newId,
        vendor: "",
        description: "",
        amount: "",
        category: "Food & Dining",
      },
    ]);
  };

  const removeBulkExpenseRow = (id) => {
    if (bulkExpenses.length > 1) {
      setBulkExpenses((prev) => prev.filter((expense) => expense.id !== id));
    }
  };

  const updateBulkExpense = (id, field, value) => {
    setBulkExpenses((prev) =>
      prev.map((expense) =>
        expense.id === id ? { ...expense, [field]: value } : expense
      )
    );
  };

  const validateBulkExpenses = () => {
    if (!bulkDate) {
      setError("Please select a date for all expenses");
      return false;
    }

    const validExpenses = bulkExpenses.filter(
      (exp) =>
        exp.description.trim() && exp.amount && parseFloat(exp.amount) > 0
    );

    if (validExpenses.length === 0) {
      setError("Please add at least one expense with description and amount");
      return false;
    }

    return true;
  };

  const handleBulkSubmit = async () => {
    if (!validateBulkExpenses()) {
      return;
    }

    setLoading(true);
    setError("");
    setSuccessMessage("");

    try {
      const validExpenses = bulkExpenses.filter(
        (exp) =>
          exp.description.trim() && exp.amount && parseFloat(exp.amount) > 0
      );

      const expensePromises = validExpenses.map((expense) =>
        createExpense({
          vendor: expense.vendor.trim() || null,
          description: expense.description.trim(),
          amount: parseFloat(expense.amount),
          category: expense.category,
          expense_date: bulkDate,
          items: [],
        })
      );

      const results = await Promise.all(expensePromises);

      // Clear the table and reset
      setBulkExpenses([
        {
          id: 1,
          vendor: "",
          description: "",
          amount: "",
          category: "Food & Dining",
        },
        {
          id: 2,
          vendor: "",
          description: "",
          amount: "",
          category: "Food & Dining",
        },
        {
          id: 3,
          vendor: "",
          description: "",
          amount: "",
          category: "Food & Dining",
        },
      ]);

      setSuccessMessage(`Successfully added ${results.length} expenses!`);

      // Notify parent component for each expense
      if (onExpenseAdded) {
        results.forEach((result) => onExpenseAdded(result));
      }
    } catch (err) {
      console.error("Error creating bulk expenses:", err);
      setError(err.message || "Failed to create expenses");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    // Reset form - respect bulk mode when available
    setFormData({
      vendor: "",
      description: "",
      amount: "",
      category: "Food & Dining",
      expense_date: new Date().toISOString().split("T")[0],
    });
    setError("");
    setSuccessMessage("");

    if (onClose) {
      onClose();
    }
  };

  return (
    <div className="add-expense-container">
      <div className="add-expense-header">
        <h3>{bulkMode ? "Add Multiple Expenses" : "Add New Expense"}</h3>
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
        <div className="bulk-expense-container">
          <div className="bulk-date-selector">
            <label htmlFor="bulk-date">Date for all expenses *</label>
            <input
              type="date"
              id="bulk-date"
              value={bulkDate}
              onChange={(e) => setBulkDate(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          <div className="bulk-expenses-table">
            <div className="table-header">
              <span>Vendor</span>
              <span>Description *</span>
              <span>Amount (LKR) *</span>
              <span>Category</span>
              <span>Actions</span>
            </div>

            {bulkExpenses.map((expense, index) => (
              <div key={expense.id} className="table-row">
                <input
                  type="text"
                  placeholder="Store name"
                  value={expense.vendor}
                  onChange={(e) =>
                    updateBulkExpense(expense.id, "vendor", e.target.value)
                  }
                  disabled={loading}
                />
                <input
                  type="text"
                  placeholder="What did you buy?"
                  value={expense.description}
                  onChange={(e) =>
                    updateBulkExpense(expense.id, "description", e.target.value)
                  }
                  disabled={loading}
                  required
                />
                <input
                  type="number"
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                  value={expense.amount}
                  onChange={(e) =>
                    updateBulkExpense(expense.id, "amount", e.target.value)
                  }
                  disabled={loading}
                  required
                />
                <select
                  value={expense.category}
                  onChange={(e) =>
                    updateBulkExpense(expense.id, "category", e.target.value)
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
                  {bulkExpenses.length > 1 && (
                    <button
                      type="button"
                      className="remove-row-btn"
                      onClick={() => removeBulkExpenseRow(expense.id)}
                      disabled={loading}
                      title="Remove this expense"
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
              onClick={addBulkExpenseRow}
              disabled={loading}
            >
              + Add Another Expense
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
                ? "Adding Expenses..."
                : `Add ${
                    bulkExpenses.filter((e) => e.description && e.amount).length
                  } Expenses`}
            </button>
          </div>
        </div>
      ) : (
        // Single Mode - Original Form
        <div>
          {lastExpense && (
            <div className="quick-actions">
              <button
                type="button"
                className="copy-last-btn"
                onClick={copyLastExpense}
                disabled={loading}
              >
                📋 Copy Last: {lastExpense.description} ({lastExpense.amount}{" "}
                LKR)
              </button>
            </div>
          )}

          <form
            onSubmit={(e) => handleSubmit(e, false)}
            className="add-expense-form"
            onKeyDown={handleKeyDown}
          >
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="expense_date">Date *</label>
                <input
                  type="date"
                  id="expense_date"
                  name="expense_date"
                  value={formData.expense_date}
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
              <label htmlFor="vendor">Vendor/Store (Optional)</label>
              <input
                type="text"
                id="vendor"
                name="vendor"
                value={formData.vendor}
                onChange={handleInputChange}
                placeholder="e.g., Walmart, Amazon, Gas Station"
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
                placeholder="e.g., Grocery shopping, Gas fill-up, Lunch"
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
                    onClick={() => quickFillAmount(100)}
                    disabled={loading}
                  >
                    100
                  </button>
                  <button
                    type="button"
                    onClick={() => quickFillAmount(500)}
                    disabled={loading}
                  >
                    500
                  </button>
                  <button
                    type="button"
                    onClick={() => quickFillAmount(1000)}
                    disabled={loading}
                  >
                    1K
                  </button>
                  <button
                    type="button"
                    onClick={() => quickFillAmount(2000)}
                    disabled={loading}
                  >
                    2K
                  </button>
                  <button
                    type="button"
                    onClick={() => quickFillAmount(5000)}
                    disabled={loading}
                  >
                    5K
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

export default AddExpense;
