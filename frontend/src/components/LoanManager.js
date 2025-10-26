import React, { useState, useEffect } from "react";
import {
  getLoans,
  getLoanSummary,
  createLoan,
  updateLoan,
  deleteLoan,
  addLoanTransaction,
  deleteLoanTransaction,
} from "../services/expense";
import "./LoanManager.css";

const LoanManager = () => {
  const [loans, setLoans] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState({ type: "", status: "" });
  const [showAddLoan, setShowAddLoan] = useState(false);
  const [showAddTransaction, setShowAddTransaction] = useState(null);
  const [selectedLoan, setSelectedLoan] = useState(null);

  const [newLoan, setNewLoan] = useState({
    type: "given",
    person_name: "",
    person_contact: "",
    principal_amount: "",
    interest_rate: "0",
    loan_date: new Date().toISOString().split("T")[0],
    due_date: "",
    description: "",
  });

  const [newTransaction, setNewTransaction] = useState({
    transaction_type: "payment",
    amount: "",
    transaction_date: new Date().toISOString().split("T")[0],
    description: "",
  });

  useEffect(() => {
    loadLoans();
    loadSummary();
  }, [filter]);

  const loadLoans = async () => {
    try {
      setLoading(true);
      setError("");
      const loansData = await getLoans(filter.type || null, filter.status || null);
      setLoans(loansData);
    } catch (err) {
      setError("Failed to load loans");
      if (err.message.includes("401")) {
        localStorage.removeItem("access_token");
        window.location.href = "/login";
      }
    } finally {
      setLoading(false);
    }
  };

  const loadSummary = async () => {
    try {
      const summaryData = await getLoanSummary();
      setSummary(summaryData);
    } catch (err) {
      // Error already handled in loadLoans
    }
  };

  const handleCreateLoan = async (e) => {
    e.preventDefault();
    try {
      setError("");
      const loanData = {
        ...newLoan,
        principal_amount: parseFloat(newLoan.principal_amount),
        interest_rate: parseFloat(newLoan.interest_rate),
        due_date: newLoan.due_date || null,
      };
      
      await createLoan(loanData);
      setShowAddLoan(false);
      setNewLoan({
        type: "given",
        person_name: "",
        person_contact: "",
        principal_amount: "",
        interest_rate: "0",
        loan_date: new Date().toISOString().split("T")[0],
        due_date: "",
        description: "",
      });
      loadLoans();
      loadSummary();
    } catch (err) {
      setError(err.message || "Failed to create loan");
    }
  };

  const handleAddTransaction = async (e) => {
    e.preventDefault();
    try {
      setError("");
      const transactionData = {
        ...newTransaction,
        amount: parseFloat(newTransaction.amount),
      };

      await addLoanTransaction(showAddTransaction, transactionData);
      setShowAddTransaction(null);
      setNewTransaction({
        transaction_type: "payment",
        amount: "",
        transaction_date: new Date().toISOString().split("T")[0],
        description: "",
      });
      loadLoans();
      loadSummary();
    } catch (err) {
      setError(err.message || "Failed to add transaction");
    }
  };

  const handleDeleteLoan = async (loanId) => {
    if (window.confirm("Are you sure you want to delete this loan?")) {
      try {
        await deleteLoan(loanId);
        loadLoans();
        loadSummary();
      } catch (err) {
        setError(err.message || "Failed to delete loan");
      }
    }
  };

  const handleDeleteTransaction = async (loanId, transactionId) => {
    if (window.confirm("Are you sure you want to delete this transaction?")) {
      try {
        await deleteLoanTransaction(loanId, transactionId);
        loadLoans();
        loadSummary();
      } catch (err) {
        setError(err.message || "Failed to delete transaction");
      }
    }
  };

  const formatCurrency = (amount) => {
    return `LKR ${Number(amount).toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const getStatusColor = (status) => {
    const colors = {
      active: "active",
      completed: "completed",
      overdue: "overdue",
      cancelled: "cancelled",
    };
    return colors[status] || "default";
  };

  const getTypeIcon = (type) => {
    return type === "given" ? "💸" : "💰";
  };

  if (loading) {
    return (
      <div className="loan-manager-container">
        <div className="loading-state">
          <p>Loading loans...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="loan-manager-container">
      <div className="loan-header">
        <h1>💼 Loan Manager</h1>
        <p>Manage loans you've given and received</p>
      </div>

      {error && (
        <div className="error-message">
          <p>{error}</p>
          <button onClick={() => setError("")} className="close-error">
            ×
          </button>
        </div>
      )}

      {/* Summary Cards */}
      {summary && (
        <div className="loan-summary">
          <div className="summary-card given">
            <div className="card-header">
              <h3>💸 Loans Given</h3>
            </div>
            <div className="card-stats">
              <div className="stat">
                <span className="label">Total Lent</span>
                <span className="value">{formatCurrency(summary.total_loans_given)}</span>
              </div>
              <div className="stat">
                <span className="label">Outstanding</span>
                <span className="value">{formatCurrency(summary.total_outstanding_given)}</span>
              </div>
              <div className="stat">
                <span className="label">Active</span>
                <span className="value">{summary.active_loans_given}</span>
              </div>
              <div className="stat">
                <span className="label">Overdue</span>
                <span className="value overdue">{summary.overdue_loans_given}</span>
              </div>
            </div>
          </div>

          <div className="summary-card received">
            <div className="card-header">
              <h3>💰 Loans Received</h3>
            </div>
            <div className="card-stats">
              <div className="stat">
                <span className="label">Total Borrowed</span>
                <span className="value">{formatCurrency(summary.total_loans_received)}</span>
              </div>
              <div className="stat">
                <span className="label">Outstanding</span>
                <span className="value">{formatCurrency(summary.total_outstanding_received)}</span>
              </div>
              <div className="stat">
                <span className="label">Active</span>
                <span className="value">{summary.active_loans_received}</span>
              </div>
              <div className="stat">
                <span className="label">Overdue</span>
                <span className="value overdue">{summary.overdue_loans_received}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="loan-controls">
        <div className="filters">
          <select
            value={filter.type}
            onChange={(e) => setFilter({ ...filter, type: e.target.value })}
          >
            <option value="">All Types</option>
            <option value="given">Loans Given</option>
            <option value="received">Loans Received</option>
          </select>
          <select
            value={filter.status}
            onChange={(e) => setFilter({ ...filter, status: e.target.value })}
          >
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
            <option value="overdue">Overdue</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
        <button onClick={() => setShowAddLoan(true)} className="add-loan-btn">
          + Add New Loan
        </button>
      </div>

      {/* Loans List */}
      <div className="loans-list">
        {loans.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">💼</div>
            <h3>No loans found</h3>
            <p>Start by adding your first loan</p>
          </div>
        ) : (
          loans.map((loan) => (
            <div key={loan.id} className={`loan-card ${loan.type}`}>
              <div className="loan-card-header">
                <div className="loan-info">
                  <div className="loan-title">
                    <span className="loan-icon">{getTypeIcon(loan.type)}</span>
                    <h4>{loan.person_name}</h4>
                    <span className={`status-badge ${getStatusColor(loan.status)}`}>
                      {loan.status}
                    </span>
                  </div>
                  <div className="loan-contact">
                    {loan.person_contact && <span>📞 {loan.person_contact}</span>}
                  </div>
                </div>
                <div className="loan-actions">
                  <button
                    onClick={() => setShowAddTransaction(loan.id)}
                    className="add-payment-btn"
                    disabled={loan.status === "completed"}
                  >
                    Add Payment
                  </button>
                  <button
                    onClick={() => setSelectedLoan(selectedLoan === loan.id ? null : loan.id)}
                    className="details-btn"
                  >
                    {selectedLoan === loan.id ? "Hide" : "Details"}
                  </button>
                  <button
                    onClick={() => handleDeleteLoan(loan.id)}
                    className="delete-btn"
                  >
                    🗑️
                  </button>
                </div>
              </div>

              <div className="loan-amounts">
                <div className="amount-item">
                  <span className="label">Principal</span>
                  <span className="value">{formatCurrency(loan.principal_amount)}</span>
                </div>
                <div className="amount-item">
                  <span className="label">Current Balance</span>
                  <span className="value balance">{formatCurrency(loan.current_balance)}</span>
                </div>
                <div className="amount-item">
                  <span className="label">Interest Rate</span>
                  <span className="value">{loan.interest_rate}%</span>
                </div>
              </div>

              <div className="loan-dates">
                <div className="date-item">
                  <span className="label">Loan Date</span>
                  <span className="value">{new Date(loan.loan_date).toLocaleDateString()}</span>
                </div>
                {loan.due_date && (
                  <div className="date-item">
                    <span className="label">Due Date</span>
                    <span className="value">{new Date(loan.due_date).toLocaleDateString()}</span>
                  </div>
                )}
              </div>

              {loan.description && (
                <div className="loan-description">
                  <p>{loan.description}</p>
                </div>
              )}

              {/* Transaction Details */}
              {selectedLoan === loan.id && (
                <div className="loan-transactions">
                  <h5>Transaction History</h5>
                  {loan.transactions.length === 0 ? (
                    <p>No transactions yet</p>
                  ) : (
                    <div className="transactions-list">
                      {loan.transactions.map((transaction) => (
                        <div key={transaction.id} className="transaction-item">
                          <div className="transaction-info">
                            <span className={`transaction-type ${transaction.transaction_type}`}>
                              {transaction.transaction_type}
                            </span>
                            <span className="transaction-amount">
                              {formatCurrency(transaction.amount)}
                            </span>
                            <span className="transaction-date">
                              {new Date(transaction.transaction_date).toLocaleDateString()}
                            </span>
                          </div>
                          {transaction.description && (
                            <div className="transaction-description">
                              {transaction.description}
                            </div>
                          )}
                          <button
                            onClick={() => handleDeleteTransaction(loan.id, transaction.id)}
                            className="delete-transaction-btn"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Add Loan Modal */}
      {showAddLoan && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>Add New Loan</h3>
              <button onClick={() => setShowAddLoan(false)} className="close-btn">
                ×
              </button>
            </div>
            <form onSubmit={handleCreateLoan}>
              <div className="form-group">
                <label>Loan Type</label>
                <select
                  value={newLoan.type}
                  onChange={(e) => setNewLoan({ ...newLoan, type: e.target.value })}
                  required
                >
                  <option value="given">Money I Lent (Given)</option>
                  <option value="received">Money I Borrowed (Received)</option>
                </select>
              </div>
              <div className="form-group">
                <label>Person Name</label>
                <input
                  type="text"
                  value={newLoan.person_name}
                  onChange={(e) => setNewLoan({ ...newLoan, person_name: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Contact (Optional)</label>
                <input
                  type="text"
                  value={newLoan.person_contact}
                  onChange={(e) => setNewLoan({ ...newLoan, person_contact: e.target.value })}
                  placeholder="Phone number or email"
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Amount</label>
                  <input
                    type="number"
                    step="0.01"
                    value={newLoan.principal_amount}
                    onChange={(e) => setNewLoan({ ...newLoan, principal_amount: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Interest Rate (%)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={newLoan.interest_rate}
                    onChange={(e) => setNewLoan({ ...newLoan, interest_rate: e.target.value })}
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Loan Date</label>
                  <input
                    type="date"
                    value={newLoan.loan_date}
                    onChange={(e) => setNewLoan({ ...newLoan, loan_date: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Due Date (Optional)</label>
                  <input
                    type="date"
                    value={newLoan.due_date}
                    onChange={(e) => setNewLoan({ ...newLoan, due_date: e.target.value })}
                  />
                </div>
              </div>
              <div className="form-group">
                <label>Description (Optional)</label>
                <textarea
                  value={newLoan.description}
                  onChange={(e) => setNewLoan({ ...newLoan, description: e.target.value })}
                  rows="3"
                  placeholder="Additional notes about this loan"
                />
              </div>
              <div className="modal-actions">
                <button type="button" onClick={() => setShowAddLoan(false)}>
                  Cancel
                </button>
                <button type="submit">Create Loan</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Transaction Modal */}
      {showAddTransaction && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>Add Transaction</h3>
              <button onClick={() => setShowAddTransaction(null)} className="close-btn">
                ×
              </button>
            </div>
            <form onSubmit={handleAddTransaction}>
              <div className="form-group">
                <label>Transaction Type</label>
                <select
                  value={newTransaction.transaction_type}
                  onChange={(e) =>
                    setNewTransaction({ ...newTransaction, transaction_type: e.target.value })
                  }
                  required
                >
                  <option value="payment">Payment</option>
                  <option value="interest">Interest Added</option>
                  <option value="adjustment">Adjustment</option>
                </select>
              </div>
              <div className="form-group">
                <label>Amount</label>
                <input
                  type="number"
                  step="0.01"
                  value={newTransaction.amount}
                  onChange={(e) => setNewTransaction({ ...newTransaction, amount: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Date</label>
                <input
                  type="date"
                  value={newTransaction.transaction_date}
                  onChange={(e) =>
                    setNewTransaction({ ...newTransaction, transaction_date: e.target.value })
                  }
                  required
                />
              </div>
              <div className="form-group">
                <label>Description (Optional)</label>
                <textarea
                  value={newTransaction.description}
                  onChange={(e) =>
                    setNewTransaction({ ...newTransaction, description: e.target.value })
                  }
                  rows="2"
                  placeholder="Notes about this transaction"
                />
              </div>
              <div className="modal-actions">
                <button type="button" onClick={() => setShowAddTransaction(null)}>
                  Cancel
                </button>
                <button type="submit">Add Transaction</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default LoanManager;