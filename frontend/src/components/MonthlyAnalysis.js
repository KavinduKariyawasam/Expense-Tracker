import React, { useState, useEffect } from "react";
import { getMonthlyStats, getAvailableYears } from "../services/expense";
import "./MonthlyAnalysis.css";

const MonthlyAnalysis = () => {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [availableYears, setAvailableYears] = useState([]);
  const [monthlyData, setMonthlyData] = useState(null);
  const [comparisonData, setComparisonData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const months = [
    { value: 1, name: "January", short: "Jan" },
    { value: 2, name: "February", short: "Feb" },
    { value: 3, name: "March", short: "Mar" },
    { value: 4, name: "April", short: "Apr" },
    { value: 5, name: "May", short: "May" },
    { value: 6, name: "June", short: "Jun" },
    { value: 7, name: "July", short: "Jul" },
    { value: 8, name: "August", short: "Aug" },
    { value: 9, name: "September", short: "Sep" },
    { value: 10, name: "October", short: "Oct" },
    { value: 11, name: "November", short: "Nov" },
    { value: 12, name: "December", short: "Dec" },
  ];

  useEffect(() => {
    loadAvailableYears();
  }, []);

  useEffect(() => {
    if (selectedYear && selectedMonth) {
      loadMonthlyData(selectedYear, selectedMonth);
    }
  }, [selectedYear, selectedMonth]);

  const loadAvailableYears = async () => {
    try {
      const response = await getAvailableYears();
      setAvailableYears(response.years);

      if (response.years.length > 0) {
        setSelectedYear(response.years[0]);
      }
    } catch (err) {
      setError("Failed to load available years");
    }
  };

  const loadMonthlyData = async (year, month) => {
    try {
      setLoading(true);
      setError("");

      // Load current month data and previous month for comparison
      const [currentMonth, previousMonth] = await Promise.all([
        getMonthlyStats(year, month),
        getPreviousMonthData(year, month),
      ]);

      setMonthlyData(currentMonth);
      setComparisonData(previousMonth);
    } catch (err) {
      setError("Failed to load monthly statistics");

      if (err.message.includes("401")) {
        localStorage.removeItem("access_token");
        window.location.href = "/login";
      }
    } finally {
      setLoading(false);
    }
  };

  const getPreviousMonthData = async (year, month) => {
    try {
      const prevMonth = month === 1 ? 12 : month - 1;
      const prevYear = month === 1 ? year - 1 : year;
      return await getMonthlyStats(prevYear, prevMonth);
    } catch (err) {
      return null; // Return null if previous month data is not available
    }
  };

  const formatCurrency = (amount) => {
    if (amount === null || amount === undefined || isNaN(amount)) {
      return "LKR 0.00";
    }
    return `LKR ${Number(amount).toFixed(2)}`;
  };

  const getPercentageChange = (current, previous) => {
    if (!previous || previous === 0) return null;
    const change = ((current - previous) / Math.abs(previous)) * 100;
    return {
      value: Math.abs(change).toFixed(1),
      isPositive: change > 0,
      isNegative: change < 0,
    };
  };

  const getSelectedMonthName = () => {
    return months.find((m) => m.value === selectedMonth)?.name || "";
  };

  const renderChangeIndicator = (current, previous) => {
    const change = getPercentageChange(current, previous);
    if (!change) return null;

    return (
      <div
        className={`change-indicator ${
          change.isPositive ? "positive" : "negative"
        }`}
      >
        <span className="change-icon">{change.isPositive ? "↗" : "↘"}</span>
        <span className="change-text">
          {change.value}% {change.isPositive ? "increase" : "decrease"} from
          last month
        </span>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="monthly-analysis-container">
        <div className="analysis-header">
          <h3>📈 Monthly Analysis</h3>
        </div>
        <div className="loading-state">
          <p>Loading monthly analysis...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="monthly-analysis-container">
        <div className="analysis-header">
          <h3>📈 Monthly Analysis</h3>
        </div>
        <div className="error-state">
          <p>{error}</p>
          <button onClick={() => loadMonthlyData(selectedYear, selectedMonth)}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="monthly-analysis-container">
      <div className="analysis-header">
        <h3>📈 Monthly Analysis</h3>
        <div className="header-controls">
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
            className="year-selector"
          >
            {availableYears.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
            className="month-selector"
          >
            {months.map((month) => (
              <option key={month.value} value={month.value}>
                {month.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {monthlyData && (
        <div className="analysis-content">
          {/* Month Overview */}
          <div className="month-overview">
            <h4>
              {getSelectedMonthName()} {selectedYear} Overview
            </h4>
            <div className="overview-cards">
              <div className="overview-card income">
                <div className="card-icon">💰</div>
                <div className="card-content">
                  <h5>Total Income</h5>
                  <div className="card-value">
                    {formatCurrency(monthlyData.total_income)}
                  </div>
                  {comparisonData &&
                    renderChangeIndicator(
                      monthlyData.total_income,
                      comparisonData.total_income
                    )}
                </div>
              </div>

              <div className="overview-card expense">
                <div className="card-icon">💸</div>
                <div className="card-content">
                  <h5>Total Expenses</h5>
                  <div className="card-value">
                    {formatCurrency(monthlyData.total_expenses)}
                  </div>
                  {comparisonData &&
                    renderChangeIndicator(
                      monthlyData.total_expenses,
                      comparisonData.total_expenses
                    )}
                </div>
              </div>

              <div className="overview-card net">
                <div className="card-icon">📊</div>
                <div className="card-content">
                  <h5>Net Amount</h5>
                  <div
                    className={`card-value ${
                      monthlyData.net_amount >= 0 ? "positive" : "negative"
                    }`}
                  >
                    {formatCurrency(monthlyData.net_amount)}
                  </div>
                  {comparisonData &&
                    renderChangeIndicator(
                      monthlyData.net_amount,
                      comparisonData.net_amount
                    )}
                </div>
              </div>

              <div className="overview-card transactions">
                <div className="card-icon">📈</div>
                <div className="card-content">
                  <h5>Total Transactions</h5>
                  <div className="card-value">
                    {(monthlyData.income_transactions || 0) +
                      (monthlyData.expense_transactions || 0)}
                  </div>
                  <small>
                    {monthlyData.income_transactions || 0} income,{" "}
                    {monthlyData.expense_transactions || 0} expenses
                  </small>
                </div>
              </div>
            </div>
          </div>

          {/* Daily Breakdown */}
          {monthlyData.daily_breakdown &&
            monthlyData.daily_breakdown.length > 0 && (
              <div className="daily-breakdown">
                <h4>Daily Breakdown</h4>
                <div className="daily-chart">
                  {monthlyData.daily_breakdown.map((day, index) => (
                    <div key={index} className="day-item">
                      <div className="day-header">
                        <span className="day-number">{day.day}</span>
                        <span className="day-total">
                          {formatCurrency(Math.abs(day.net_amount))}
                        </span>
                      </div>
                      <div className="day-bars">
                        <div
                          className="income-bar"
                          style={{
                            height: `${Math.max(
                              5,
                              (day.income /
                                Math.max(
                                  ...monthlyData.daily_breakdown.map(
                                    (d) => d.income
                                  )
                                )) *
                                100
                            )}px`,
                          }}
                          title={`Income: ${formatCurrency(day.income)}`}
                        ></div>
                        <div
                          className="expense-bar"
                          style={{
                            height: `${Math.max(
                              5,
                              (day.expenses /
                                Math.max(
                                  ...monthlyData.daily_breakdown.map(
                                    (d) => d.expenses
                                  )
                                )) *
                                100
                            )}px`,
                          }}
                          title={`Expenses: ${formatCurrency(day.expenses)}`}
                        ></div>
                      </div>
                      <div
                        className={`day-net ${
                          day.net_amount >= 0 ? "positive" : "negative"
                        }`}
                      >
                        {day.net_amount >= 0 ? "+" : "-"}
                        {formatCurrency(Math.abs(day.net_amount))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

          {/* Category Analysis */}
          {monthlyData.category_breakdown && (
            <div className="category-analysis">
              <h4>Category Breakdown</h4>
              <div className="category-sections">
                {monthlyData.category_breakdown.expenses && (
                  <div className="category-section">
                    <h5>💸 Expense Categories</h5>
                    <div className="category-list">
                      {monthlyData.category_breakdown.expenses.map(
                        (cat, index) => (
                          <div key={index} className="category-item expense">
                            <div className="category-info">
                              <span className="category-name">
                                {cat.category}
                              </span>
                              <span className="category-count">
                                {cat.count} transactions
                              </span>
                            </div>
                            <div className="category-amount">
                              {formatCurrency(cat.amount)}
                            </div>
                            <div className="category-bar">
                              <div
                                className="category-fill expense-fill"
                                style={{
                                  width: `${
                                    (cat.amount / monthlyData.total_expenses) *
                                    100
                                  }%`,
                                }}
                              ></div>
                            </div>
                          </div>
                        )
                      )}
                    </div>
                  </div>
                )}

                {monthlyData.category_breakdown.income && (
                  <div className="category-section">
                    <h5>💰 Income Categories</h5>
                    <div className="category-list">
                      {monthlyData.category_breakdown.income.map(
                        (cat, index) => (
                          <div key={index} className="category-item income">
                            <div className="category-info">
                              <span className="category-name">
                                {cat.category}
                              </span>
                              <span className="category-count">
                                {cat.count} transactions
                              </span>
                            </div>
                            <div className="category-amount">
                              {formatCurrency(cat.amount)}
                            </div>
                            <div className="category-bar">
                              <div
                                className="category-fill income-fill"
                                style={{
                                  width: `${
                                    (cat.amount / monthlyData.total_income) *
                                    100
                                  }%`,
                                }}
                              ></div>
                            </div>
                          </div>
                        )
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Weekly Summary */}
          {monthlyData.weekly_summary && (
            <div className="weekly-summary">
              <h4>Weekly Summary</h4>
              <div className="weekly-grid">
                {monthlyData.weekly_summary.map((week, index) => (
                  <div key={index} className="week-card">
                    <div className="week-header">
                      <h6>Week {week.week_number}</h6>
                      <span className="week-dates">{week.date_range}</span>
                    </div>
                    <div className="week-stats">
                      <div className="week-stat income">
                        <span className="stat-label">Income</span>
                        <span className="stat-value">
                          {formatCurrency(week.income)}
                        </span>
                      </div>
                      <div className="week-stat expense">
                        <span className="stat-label">Expenses</span>
                        <span className="stat-value">
                          {formatCurrency(week.expenses)}
                        </span>
                      </div>
                      <div
                        className={`week-stat net ${
                          week.net >= 0 ? "positive" : "negative"
                        }`}
                      >
                        <span className="stat-label">Net</span>
                        <span className="stat-value">
                          {formatCurrency(week.net)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default MonthlyAnalysis;
