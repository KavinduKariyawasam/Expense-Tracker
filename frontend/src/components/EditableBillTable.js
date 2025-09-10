import React, { useState, useEffect } from "react";
import { EXPENSE_CATEGORIES } from "../constants/categories";
import "./EditableBillTable.css";

export default function EditableBillTable({ parsedData, onSave, onCancel }) {
  const [billData, setBillData] = useState({
    vendor: parsedData.vendor || "",
    invoice_date: parsedData.invoice_date || "",
    items: parsedData.items
      ? parsedData.items.map((item) => ({
          ...item,
          category: "Food & Dining", // Default category
          quantity: parseFloat(item.quantity) || 1,
          unit_price: parseFloat(item.unit_price) || 0,
          line_total: parseFloat(item.line_total) || 0,
        }))
      : [],
    invoice_total: 0,
  });

  const [editingItem, setEditingItem] = useState(null);

  // Use shared expense categories
  const categories = EXPENSE_CATEGORIES;

  // Calculate total whenever items change
  useEffect(() => {
    calculateTotal();
  }, [billData.items]);

  // Add new item
  const addItem = () => {
    const newItem = {
      id: Date.now(),
      description: "",
      quantity: 1.0,
      unit_price: 0.0,
      line_total: 0.0,
      category: "Others",
    };
    setBillData((prev) => ({
      ...prev,
      items: [...prev.items, newItem],
    }));
    setEditingItem(newItem.id);
  };

  // Remove item
  const removeItem = (index) => {
    setBillData((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  };

  // Update item with proper decimal handling
  const updateItem = (index, field, value) => {
    setBillData((prev) => {
      const updatedItems = [...prev.items];

      if (field === "quantity" || field === "unit_price") {
        // Handle decimal numbers properly
        const numericValue = value === "" ? 0 : parseFloat(value);
        updatedItems[index] = {
          ...updatedItems[index],
          [field]: isNaN(numericValue) ? 0 : numericValue,
        };

        // Recalculate line total with proper decimal precision
        const quantity = updatedItems[index].quantity;
        const unitPrice = updatedItems[index].unit_price;
        updatedItems[index].line_total = parseFloat(
          (quantity * unitPrice).toFixed(2)
        );
      } else {
        // For non-numeric fields (description, category)
        updatedItems[index] = {
          ...updatedItems[index],
          [field]: value,
        };
      }

      return {
        ...prev,
        items: updatedItems,
      };
    });
  };

  // Calculate total from all line totals with proper precision
  const calculateTotal = () => {
    setBillData((prev) => {
      const total = prev.items.reduce((sum, item) => {
        return sum + (parseFloat(item.line_total) || 0);
      }, 0);

      return {
        ...prev,
        invoice_total: parseFloat(total.toFixed(2)),
      };
    });
  };

  // Update bill info
  const updateBillInfo = (field, value) => {
    setBillData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  // Handle save with proper number formatting
  const handleSave = () => {
    // Ensure all numeric values are properly formatted before saving
    const formattedBillData = {
      ...billData,
      items: billData.items.map((item) => ({
        ...item,
        quantity: parseFloat(item.quantity) || 0,
        unit_price: parseFloat(item.unit_price) || 0,
        line_total: parseFloat(item.line_total) || 0,
      })),
      invoice_total: parseFloat(billData.invoice_total) || 0,
    };

    onSave(formattedBillData);
  };

  // Display currency with proper decimal places
  const formatCurrency = (amount) => {
    const numericAmount = parseFloat(amount) || 0;
    return numericAmount.toFixed(2);
  };

  // Format numbers for input display
  const formatForInput = (value) => {
    const num = parseFloat(value);
    return isNaN(num) ? "" : num.toString();
  };

  return (
    <div className="editable-bill-container">
      <div className="bill-header">
        <h3>📝 Edit Bill Details</h3>
        <div className="bill-actions">
          <button onClick={onCancel} className="cancel-btn">
            Cancel
          </button>
          <button onClick={handleSave} className="save-btn">
            Save Expenses
          </button>
        </div>
      </div>

      {/* Bill Information */}
      <div className="bill-info-section">
        <div className="bill-info-grid">
          <div className="info-field">
            <label>Vendor/Store:</label>
            <input
              type="text"
              value={billData.vendor}
              onChange={(e) => updateBillInfo("vendor", e.target.value)}
              placeholder="Enter vendor name"
              className="info-input"
            />
          </div>
          <div className="info-field">
            <label>Date:</label>
            <input
              type="date"
              value={billData.invoice_date}
              onChange={(e) => updateBillInfo("invoice_date", e.target.value)}
              className="info-input"
            />
          </div>
        </div>
      </div>

      {/* Items Table */}
      <div className="items-section">
        <div className="items-header">
          <h4>Items (Each item will be saved as a separate expense)</h4>
          <button onClick={addItem} className="add-item-btn">
            ➕ Add Item
          </button>
        </div>

        <div className="table-container">
          <table className="items-table">
            <thead>
              <tr>
                <th>Description</th>
                <th>Category</th>
                <th>Quantity</th>
                <th>Unit Price (LKR)</th>
                <th>Total (LKR)</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {billData.items.map((item, index) => (
                <tr
                  key={index}
                  className={editingItem === item.id ? "editing" : ""}
                >
                  <td>
                    <input
                      type="text"
                      value={item.description}
                      onChange={(e) =>
                        updateItem(index, "description", e.target.value)
                      }
                      placeholder="Item description"
                      className="table-input description-input"
                    />
                  </td>
                  <td>
                    <select
                      value={item.category}
                      onChange={(e) =>
                        updateItem(index, "category", e.target.value)
                      }
                      className="table-input category-select"
                    >
                      {categories.map((category) => (
                        <option key={category} value={category}>
                          {category}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <input
                      type="number"
                      value={formatForInput(item.quantity)}
                      onChange={(e) =>
                        updateItem(index, "quantity", e.target.value)
                      }
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      className="table-input quantity-input"
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      value={formatForInput(item.unit_price)}
                      onChange={(e) =>
                        updateItem(index, "unit_price", e.target.value)
                      }
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      className="table-input price-input"
                    />
                  </td>
                  <td>
                    <span className="line-total">
                      {formatCurrency(item.line_total)}
                    </span>
                  </td>
                  <td>
                    <button
                      onClick={() => removeItem(index)}
                      className="remove-btn"
                      title="Remove item"
                    >
                      🗑️
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {billData.items.length === 0 && (
          <div className="no-items">
            <p>No items added yet. Click "Add Item" to get started.</p>
          </div>
        )}
      </div>

      {/* Total Section */}
      <div className="total-section">
        <div className="total-calculation">
          <div className="calculation-row">
            <span className="calculation-label">Total Items:</span>
            <span className="calculation-value">{billData.items.length}</span>
          </div>
          <div className="calculation-row">
            <span className="calculation-label">Subtotal:</span>
            <span className="calculation-value">
              LKR {formatCurrency(billData.invoice_total)}
            </span>
          </div>
        </div>
        <div className="total-row">
          <span className="total-label">Total Amount:</span>
          <span className="total-amount">
            LKR {formatCurrency(billData.invoice_total)}
          </span>
        </div>
      </div>
    </div>
  );
}
