import React, { useState, useEffect } from "react";
import { getExpenses, getYearlyStats, getAvailableYears } from "../services/expense";
import { EXPENSE_CATEGORIES } from "../constants/categories";
import "./Reports.css";

const Reports = ({ onClose }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expenses, setExpenses] = useState([]);
  const [selectedPeriod, setSelectedPeriod] = useState("this-year");
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [availableYears, setAvailableYears] = useState([]);
  const [reportData, setReportData] = useState(null);

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (selectedPeriod || selectedYear) {
      generateReport();
    }
  }, [selectedPeriod, selectedYear, expenses]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      const [expensesData, yearsData] = await Promise.all([
        getExpenses(0, 1000), // Get more expenses for analysis
        getAvailableYears()
      ]);

      setExpenses(expensesData);
      setAvailableYears(yearsData.years);
      
      if (yearsData.years.length > 0) {
        setSelectedYear(yearsData.years[0]);
      }
    } catch (err) {
      console.error("Error loading data:", err);
      setError("Failed to load expense data");
    } finally {
      setLoading(false);
    }
  };

  const generateReport = () => {
    if (!expenses.length) return;

    const filteredExpenses = filterExpensesByPeriod(expenses);
    const categoryAnalysis = analyzeCategoriesByPeriod(filteredExpenses);
    const monthlyTrends = analyzeMonthlyTrends(filteredExpenses);
    const topExpenses = getTopExpenses(filteredExpenses);
    const spending = calculateSpendingMetrics(filteredExpenses);

    setReportData({
      categoryAnalysis,
      monthlyTrends,
      topExpenses,
      spending,
      totalExpenses: filteredExpenses.length,
      periodLabel: getPeriodLabel()
    });
  };

  const filterExpensesByPeriod = (expenses) => {
    const now = new Date();
    
    switch (selectedPeriod) {
      case "this-month":
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();
        return expenses.filter(exp => {
          const expDate = new Date(exp.expense_date);
          return expDate.getMonth() === currentMonth && expDate.getFullYear() === currentYear;
        });
        
      case "last-month":
        const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1);
        return expenses.filter(exp => {
          const expDate = new Date(exp.expense_date);
          return expDate.getMonth() === lastMonth.getMonth() && 
                 expDate.getFullYear() === lastMonth.getFullYear();
        });
        
      case "last-3-months":
        const threeMonthsAgo = new Date(now.setMonth(now.getMonth() - 3));
        return expenses.filter(exp => new Date(exp.expense_date) >= threeMonthsAgo);
        
      case "this-year":
        return expenses.filter(exp => 
          new Date(exp.expense_date).getFullYear() === new Date().getFullYear()
        );
        
      case "custom-year":
        return expenses.filter(exp => 
          new Date(exp.expense_date).getFullYear() === selectedYear
        );
        
      default:
        return expenses;
    }
  };

  const analyzeCategoriesByPeriod = (expenses) => {
    const categoryData = {};
    
    EXPENSE_CATEGORIES.forEach(category => {
      categoryData[category] = {
        total: 0,
        count: 0,
        percentage: 0
      };
    });

    expenses.forEach(expense => {
      const category = expense.category || "Others";
      if (categoryData[category]) {
        categoryData[category].total += expense.amount;
        categoryData[category].count += 1;
      }
    });

    const totalAmount = expenses.reduce((sum, exp) => sum + exp.amount, 0);

    // Calculate percentages and sort
    const categoryArray = Object.entries(categoryData)
      .map(([category, data]) => ({
        category,
        ...data,
        percentage: totalAmount > 0 ? (data.total / totalAmount * 100) : 0
      }))
      .filter(item => item.total > 0)
      .sort((a, b) => b.total - a.total);

    return { categoryArray, totalAmount };
  };

  const analyzeMonthlyTrends = (expenses) => {
    const monthlyData = {};
    
    expenses.forEach(expense => {
      const date = new Date(expense.expense_date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = {
          month: date.toLocaleString("default", { month: "long", year: "numeric" }),
          total: 0,
          count: 0
        };
      }
      
      monthlyData[monthKey].total += expense.amount;
      monthlyData[monthKey].count += 1;
    });

    return Object.values(monthlyData).sort((a, b) => a.month.localeCompare(b.month));
  };

  const getTopExpenses = (expenses) => {
    return expenses
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 10)
      .map(expense => ({
        ...expense,
        date: new Date(expense.expense_date).toLocaleDateString()
      }));
  };

  const calculateSpendingMetrics = (expenses) => {
    if (!expenses.length) return null;

    const amounts = expenses.map(exp => exp.amount);
    const total = amounts.reduce((sum, amount) => sum + amount, 0);
    const average = total / expenses.length;
    const max = Math.max(...amounts);
    const min = Math.min(...amounts);

    // Calculate median
    const sortedAmounts = [...amounts].sort((a, b) => a - b);
    const median = sortedAmounts.length % 2 === 0
      ? (sortedAmounts[sortedAmounts.length / 2 - 1] + sortedAmounts[sortedAmounts.length / 2]) / 2
      : sortedAmounts[Math.floor(sortedAmounts.length / 2)];

    return { total, average, median, max, min };
  };

  const getPeriodLabel = () => {
    switch (selectedPeriod) {
      case "this-month": return "This Month";
      case "last-month": return "Last Month";
      case "last-3-months": return "Last 3 Months";
      case "this-year": return "This Year";
      case "custom-year": return `Year ${selectedYear}`;
      default: return "All Time";
    }
  };

  const formatCurrency = (amount) => {
    return `LKR ${amount.toFixed(2)}`;
  };

  if (loading) {
    return (
      <div className="reports-container">
        <div className="reports-header">
          <h3>📊 Expense Reports</h3>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>
        <div className="loading-state">
          <p>Loading reports...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="reports-container">
        <div className="reports-header">
          <h3>📊 Expense Reports</h3>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>
        <div className="error-state">
          <p>{error}</p>
          <button onClick={loadInitialData}>Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div className="reports-container">
      <div className="reports-header">
        <h3>📊 Expense Reports</h3>
        <div className="header-controls">
          <select 
            value={selectedPeriod} 
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="period-selector"
          >
            <option value="this-month">This Month</option>
            <option value="last-month">Last Month</option>
            <option value="last-3-months">Last 3 Months</option>
            <option value="this-year">This Year</option>
            <option value="custom-year">Custom Year</option>
          </select>
          
          {selectedPeriod === "custom-year" && (
            <select 
              value={selectedYear} 
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="year-selector"
            >
              {availableYears.map(year => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          )}
          
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>
      </div>

      {reportData && (
        <div className="reports-content">
          {/* Left Side - Summary */}
          <div className="summary-section">
            <h4>Summary for {reportData.periodLabel}</h4>
            <div className="summary-cards">
              <div className="summary-card primary">
                <div className="card-icon">💰</div>
                <div className="card-info">
                  <h5>Total Spending</h5>
                  <p>{formatCurrency(reportData.spending?.total || 0)}</p>
                </div>
              </div>
              
              <div className="summary-card secondary">
                <div className="card-icon">📊</div>
                <div className="card-info">
                  <h5>Average Expense</h5>
                  <p>{formatCurrency(reportData.spending?.average || 0)}</p>
                </div>
              </div>
              
              <div className="summary-card tertiary">
                <div className="card-icon">📈</div>
                <div className="card-info">
                  <h5>Total Transactions</h5>
                  <p>{reportData.totalExpenses}</p>
                </div>
              </div>
              
              <div className="summary-card quaternary">
                <div className="card-icon">🎯</div>
                <div className="card-info">
                  <h5>Highest Expense</h5>
                  <p>{formatCurrency(reportData.spending?.max || 0)}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Three Column Layout */}
          <div className="reports-grid">
            {/* Left Column - Additional Summary Metrics */}
            <div className="summary-metrics-section">
              <h4>Additional Metrics</h4>
              <div className="metrics-cards">
                {reportData.spending && (
                  <>
                    <div className="metric-card">
                      <div className="metric-label">Median Expense</div>
                      <div className="metric-value">{formatCurrency(reportData.spending.median)}</div>
                    </div>
                    <div className="metric-card">
                      <div className="metric-label">Smallest Expense</div>
                      <div className="metric-value">{formatCurrency(reportData.spending.min)}</div>
                    </div>
                    <div className="metric-card">
                      <div className="metric-label">Categories Used</div>
                      <div className="metric-value">{reportData.categoryAnalysis.categoryArray.length}</div>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Middle Column - Top 5 Expenses */}
            <div className="top-expenses-section">
              <h4>Top 5 Expenses</h4>
              <div className="top-expenses-list">
                {reportData.topExpenses.slice(0, 5).map((expense, index) => (
                  <div key={expense.id} className="expense-item">
                    <div className="expense-rank">#{index + 1}</div>
                    <div className="expense-details">
                      <div className="expense-description">
                        {expense.vendor ? `${expense.vendor} - ${expense.description}` : expense.description}
                      </div>
                      <div className="expense-meta">
                        <span className="expense-category">{expense.category}</span>
                        <span className="expense-date">{expense.date}</span>
                      </div>
                    </div>
                    <div className="expense-amount">
                      {formatCurrency(expense.amount)}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Column - Category Analysis */}
            <div className="category-analysis-section">
              <h4>Category Analysis</h4>
              <div className="category-chart">
                {reportData.categoryAnalysis.categoryArray.map(category => (
                  <div key={category.category} className="category-item">
                    <div className="category-header">
                      <span className="category-name">{category.category}</span>
                      <span className="category-amount">{formatCurrency(category.total)}</span>
                    </div>
                    <div className="category-bar">
                      <div 
                        className="category-bar-fill"
                        style={{ width: `${category.percentage}%` }}
                      ></div>
                    </div>
                    <div className="category-details">
                      <span className="category-percentage">{category.percentage.toFixed(1)}%</span>
                      <span className="category-count">{category.count} transactions</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Reports;
