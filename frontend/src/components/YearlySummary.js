import React, { useState, useEffect } from "react";
import { getYearlyStats, getAvailableYears } from "../services/expense";
import "./YearlySummary.css";

const YearlySummary = ({ onClose }) => {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [availableYears, setAvailableYears] = useState([]);
  const [yearlyData, setYearlyData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadAvailableYears();
  }, []);

  useEffect(() => {
    if (selectedYear) {
      loadYearlyData(selectedYear);
    }
  }, [selectedYear]);

  const loadAvailableYears = async () => {
    try {
      const response = await getAvailableYears();
      setAvailableYears(response.years);
      
      // Set the most recent year as default if available
      if (response.years.length > 0) {
        setSelectedYear(response.years[0]);
      }
    } catch (err) {
      console.error("Error loading available years:", err);
      setError("Failed to load available years");
    }
  };

  const loadYearlyData = async (year) => {
    try {
      setLoading(true);
      setError("");
      const data = await getYearlyStats(year);
      setYearlyData(data);
    } catch (err) {
      console.error("Error loading yearly data:", err);
      setError("Failed to load yearly statistics");
      
      if (err.message.includes("401")) {
        // Handle unauthorized access
        localStorage.removeItem("access_token");
        window.location.href = "/login";
      }
    } finally {
      setLoading(false);
    }
  };

  const handleYearChange = (e) => {
    setSelectedYear(parseInt(e.target.value));
  };

  const formatCurrency = (amount) => {
    return `LKR ${amount.toFixed(2)}`;
  };

  const getMonthlyChange = (currentMonth, previousMonth) => {
    if (!previousMonth.total) return null;
    
    const change = ((currentMonth.total - previousMonth.total) / previousMonth.total) * 100;
    return {
      percentage: change.toFixed(1),
      isPositive: change > 0,
      isNegative: change < 0
    };
  };

  if (loading) {
    return (
      <div className="yearly-summary-container">
        <div className="summary-header">
          <h3>📊 Yearly Summary</h3>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>
        <div className="loading-state">
          <p>Loading yearly statistics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="yearly-summary-container">
        <div className="summary-header">
          <h3>📊 Yearly Summary</h3>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>
        <div className="error-state">
          <p>{error}</p>
          <button onClick={() => loadYearlyData(selectedYear)}>Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div className="yearly-summary-container">
      <div className="summary-header">
        <h3>📊 Yearly Summary</h3>
        <div className="header-controls">
          <select 
            value={selectedYear} 
            onChange={handleYearChange}
            className="year-selector"
          >
            {availableYears.map(year => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>
      </div>

      {yearlyData && (
        <div className="summary-content">
          {/* Left Side - Year Overview Stats */}
          <div className="year-overview-section">
            <h4>Year Overview</h4>
            <div className="overview-stats">
              <div className="overview-card primary">
                <div className="card-icon">💰</div>
                <div className="card-info">
                  <h4>Total Expenses</h4>
                  <p className="card-value">{formatCurrency(yearlyData.year_total)}</p>
                </div>
              </div>
              
              <div className="overview-card secondary">
                <div className="card-icon">📊</div>
                <div className="card-info">
                  <h4>Average Monthly</h4>
                  <p className="card-value">{formatCurrency(yearlyData.avg_monthly)}</p>
                </div>
              </div>
              
              <div className="overview-card tertiary">
                <div className="card-icon">📈</div>
                <div className="card-info">
                  <h4>Transactions</h4>
                  <p className="card-value">{yearlyData.year_transactions}</p>
                </div>
              </div>
              
              <div className="overview-card quaternary">
                <div className="card-icon">🏷️</div>
                <div className="card-info">
                  <h4>Categories</h4>
                  <p className="card-value">{yearlyData.year_categories}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Middle - Monthly Breakdown */}
          <div className="monthly-breakdown-section">
            <h4>Monthly Breakdown</h4>
            <div className="months-grid">
              {yearlyData.monthly_breakdown.map((month, index) => {
                const previousMonth = index > 0 ? yearlyData.monthly_breakdown[index - 1] : null;
                const change = previousMonth ? getMonthlyChange(month, previousMonth) : null;
                
                return (
                  <div key={month.month} className="month-card">
                    <div className="month-header">
                      <span className="month-name">{month.month_name}</span>
                      {change && (
                        <span className={`month-change ${change.isPositive ? "positive" : change.isNegative ? "negative" : "neutral"}`}>
                          {change.isPositive ? "↗" : change.isNegative ? "↘" : "→"} {Math.abs(change.percentage)}%
                        </span>
                      )}
                    </div>
                    <div className="month-stats">
                      <div className="month-amount">{formatCurrency(month.total)}</div>
                      <div className="month-transactions">{month.transactions} transactions</div>
                    </div>
                    <div className="month-bar">
                      <div 
                        className="month-bar-fill"
                        style={{
                          width: `${yearlyData.year_total > 0 ? (month.total / yearlyData.year_total) * 100 : 0}%`
                        }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Side - Year Insights */}
          <div className="year-insights-section">
            <h4>Year Insights</h4>
            <div className="insights-grid">
              <div className="insight-card">
                <div className="insight-icon">🤑</div>
                <div className="insight-info">
                  <h6>Most Expensive Month</h6>
                  <p>
                    {yearlyData.monthly_breakdown.reduce((max, month) => 
                      month.total > max.total ? month : max
                    ).month_name}
                  </p>
                  <span className="insight-value">
                    {formatCurrency(Math.max(...yearlyData.monthly_breakdown.map(m => m.total)))}
                  </span>
                </div>
              </div>
              
              <div className="insight-card">
                <div className="insight-icon">💡</div>
                <div className="insight-info">
                  <h6>Most Active Month</h6>
                  <p>
                    {yearlyData.monthly_breakdown.reduce((max, month) => 
                      month.transactions > max.transactions ? month : max
                    ).month_name}
                  </p>
                  <span className="insight-value">
                    {Math.max(...yearlyData.monthly_breakdown.map(m => m.transactions))} transactions
                  </span>
                </div>
              </div>

              <div className="insight-card">
                <div className="insight-icon">📉</div>
                <div className="insight-info">
                  <h6>Lowest Spending Month</h6>
                  <p>
                    {yearlyData.monthly_breakdown.reduce((min, month) => 
                      month.total < min.total ? month : min
                    ).month_name}
                  </p>
                  <span className="insight-value">
                    {formatCurrency(Math.min(...yearlyData.monthly_breakdown.map(m => m.total)))}
                  </span>
                </div>
              </div>

              <div className="insight-card">
                <div className="insight-icon">💸</div>
                <div className="insight-info">
                  <h6>Average Transaction</h6>
                  <p>
                    {yearlyData.year_transactions > 0 
                      ? formatCurrency(yearlyData.year_total / yearlyData.year_transactions)
                      : "LKR 0.00"
                    }
                  </p>
                  <span className="insight-value">
                    per transaction
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default YearlySummary;
