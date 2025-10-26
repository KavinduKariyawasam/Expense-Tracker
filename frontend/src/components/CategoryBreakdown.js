import React, { useState, useEffect } from "react";
import { getCategoryStats, getAvailableYears } from "../services/expense";
import "./CategoryBreakdown.css";

const CategoryBreakdown = () => {
  const [categoryData, setCategoryData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [period, setPeriod] = useState("all");
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [availableYears, setAvailableYears] = useState([]);
  const [activeTab, setActiveTab] = useState("expenses");

  useEffect(() => {
    loadAvailableYears();
  }, []);

  useEffect(() => {
    loadCategoryData();
  }, [period, selectedYear, selectedMonth]);

  const loadAvailableYears = async () => {
    try {
      const response = await getAvailableYears();
      setAvailableYears(response.years);
    } catch (err) {
      console.error("Error loading available years:", err);
    }
  };

  const loadCategoryData = async () => {
    try {
      setLoading(true);
      setError("");

      const year =
        period === "year" || period === "month" ? selectedYear : null;
      const month = period === "month" ? selectedMonth : null;

      const data = await getCategoryStats(period, year, month);
      setCategoryData(data);
    } catch (err) {
      console.error("Error loading category data:", err);
      setError("Failed to load category breakdown");

      if (err.message.includes("401")) {
        localStorage.removeItem("access_token");
        window.location.href = "/login";
      }
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    if (amount === null || amount === undefined || isNaN(amount)) {
      return "LKR 0.00";
    }
    return `LKR ${Number(amount).toFixed(2)}`;
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const handlePeriodChange = (e) => {
    setPeriod(e.target.value);
  };

  const handleYearChange = (e) => {
    setSelectedYear(parseInt(e.target.value));
  };

  const handleMonthChange = (e) => {
    setSelectedMonth(parseInt(e.target.value));
  };

  const getPeriodTitle = () => {
    switch (period) {
      case "current_month":
        return "Current Month";
      case "current_year":
        return "Current Year";
      case "year":
        return `Year ${selectedYear}`;
      case "month":
        return `${new Date(selectedYear, selectedMonth - 1).toLocaleDateString(
          "en-US",
          { month: "long", year: "numeric" }
        )}`;
      default:
        return "All Time";
    }
  };

  if (loading) {
    return (
      <div className="category-breakdown-inline">
        <div className="breakdown-header">
          <h3>🏷️ Category Breakdown</h3>
        </div>
        <div className="loading-state">
          <p>Loading category analysis...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="category-breakdown-inline">
        <div className="breakdown-header">
          <h3>🏷️ Category Breakdown</h3>
        </div>
        <div className="error-state">
          <p>{error}</p>
          <button onClick={loadCategoryData}>Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div className="category-breakdown-inline">
      <div className="breakdown-header">
        <h3>🏷️ Category Breakdown</h3>
        <div className="header-controls">
          <select
            value={period}
            onChange={handlePeriodChange}
            className="period-selector"
          >
            <option value="all">All Time</option>
            <option value="current_month">Current Month</option>
            <option value="current_year">Current Year</option>
            <option value="year">Specific Year</option>
            <option value="month">Specific Month</option>
          </select>

          {(period === "year" || period === "month") && (
            <select
              value={selectedYear}
              onChange={handleYearChange}
              className="year-selector"
            >
              {availableYears.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          )}

          {period === "month" && (
            <select
              value={selectedMonth}
              onChange={handleMonthChange}
              className="month-selector"
            >
              {Array.from({ length: 12 }, (_, i) => (
                <option key={i + 1} value={i + 1}>
                  {new Date(2024, i).toLocaleDateString("en-US", {
                    month: "long",
                  })}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {categoryData && (
        <div className="breakdown-content">
          {/* Summary Cards */}
          <div className="summary-section">
            <h4>{getPeriodTitle()} Overview</h4>
            <div className="summary-cards">
              <div className="summary-card expense">
                <div className="card-icon">💸</div>
                <div className="card-info">
                  <h5>Total Expenses</h5>
                  <p className="card-value">
                    {formatCurrency(categoryData.totals.total_expenses)}
                  </p>
                  <small>
                    {categoryData.totals.expense_categories_count} categories
                  </small>
                </div>
              </div>

              <div className="summary-card income">
                <div className="card-icon">💰</div>
                <div className="card-info">
                  <h5>Total Income</h5>
                  <p className="card-value">
                    {formatCurrency(categoryData.totals.total_income)}
                  </p>
                  <small>
                    {categoryData.totals.income_categories_count} categories
                  </small>
                </div>
              </div>

              <div className="summary-card transactions">
                <div className="card-icon">📊</div>
                <div className="card-info">
                  <h5>Total Transactions</h5>
                  <p className="card-value">
                    {categoryData.totals.total_expense_transactions +
                      categoryData.totals.total_income_transactions}
                  </p>
                  <small>
                    {categoryData.totals.total_expense_transactions} expenses,{" "}
                    {categoryData.totals.total_income_transactions} income
                  </small>
                </div>
              </div>
            </div>
          </div>

          {/* Category Tabs */}
          <div className="category-tabs">
            <button
              className={`tab-btn ${activeTab === "expenses" ? "active" : ""}`}
              onClick={() => setActiveTab("expenses")}
            >
              💸 Expense Categories ({categoryData.expense_categories.length})
            </button>
            <button
              className={`tab-btn ${activeTab === "income" ? "active" : ""}`}
              onClick={() => setActiveTab("income")}
            >
              💰 Income Categories ({categoryData.income_categories.length})
            </button>
          </div>

          {/* Category Content */}
          <div className="category-content">
            {activeTab === "expenses" && (
              <div className="categories-section">
                {categoryData.expense_categories.length > 0 ? (
                  <div className="categories-grid">
                    {categoryData.expense_categories.map((category, index) => (
                      <div
                        key={category.category}
                        className="category-card expense-card"
                      >
                        <div className="category-header">
                          <div className="category-rank">#{index + 1}</div>
                          <div className="category-title">
                            <h5>{category.category}</h5>
                            <span className="category-percentage">
                              {category.percentage}%
                            </span>
                          </div>
                        </div>

                        <div className="category-stats">
                          <div className="stat-row">
                            <span className="stat-label">Total Amount:</span>
                            <span className="stat-value">
                              {formatCurrency(category.total_amount)}
                            </span>
                          </div>
                          <div className="stat-row">
                            <span className="stat-label">Transactions:</span>
                            <span className="stat-value">
                              {category.transaction_count}
                            </span>
                          </div>
                          <div className="stat-row">
                            <span className="stat-label">Average:</span>
                            <span className="stat-value">
                              {formatCurrency(category.avg_amount)}
                            </span>
                          </div>
                          <div className="stat-row">
                            <span className="stat-label">Range:</span>
                            <span className="stat-value">
                              {formatCurrency(category.min_amount)} -{" "}
                              {formatCurrency(category.max_amount)}
                            </span>
                          </div>
                          <div className="stat-row">
                            <span className="stat-label">Period:</span>
                            <span className="stat-value">
                              {formatDate(category.first_transaction)} to{" "}
                              {formatDate(category.last_transaction)}
                            </span>
                          </div>
                        </div>

                        <div className="category-bar">
                          <div
                            className="category-fill expense-fill"
                            style={{ width: `${category.percentage}%` }}
                          ></div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="no-data">
                    <p>No expense categories found for the selected period.</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === "income" && (
              <div className="categories-section">
                {categoryData.income_categories.length > 0 ? (
                  <div className="categories-grid">
                    {categoryData.income_categories.map((category, index) => (
                      <div
                        key={category.category}
                        className="category-card income-card"
                      >
                        <div className="category-header">
                          <div className="category-rank">#{index + 1}</div>
                          <div className="category-title">
                            <h5>{category.category}</h5>
                            <span className="category-percentage">
                              {category.percentage}%
                            </span>
                          </div>
                        </div>

                        <div className="category-stats">
                          <div className="stat-row">
                            <span className="stat-label">Total Amount:</span>
                            <span className="stat-value">
                              {formatCurrency(category.total_amount)}
                            </span>
                          </div>
                          <div className="stat-row">
                            <span className="stat-label">Transactions:</span>
                            <span className="stat-value">
                              {category.transaction_count}
                            </span>
                          </div>
                          <div className="stat-row">
                            <span className="stat-label">Average:</span>
                            <span className="stat-value">
                              {formatCurrency(category.avg_amount)}
                            </span>
                          </div>
                          <div className="stat-row">
                            <span className="stat-label">Range:</span>
                            <span className="stat-value">
                              {formatCurrency(category.min_amount)} -{" "}
                              {formatCurrency(category.max_amount)}
                            </span>
                          </div>
                          <div className="stat-row">
                            <span className="stat-label">Period:</span>
                            <span className="stat-value">
                              {formatDate(category.first_transaction)} to{" "}
                              {formatDate(category.last_transaction)}
                            </span>
                          </div>
                        </div>

                        <div className="category-bar">
                          <div
                            className="category-fill income-fill"
                            style={{ width: `${category.percentage}%` }}
                          ></div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="no-data">
                    <p>No income categories found for the selected period.</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Monthly Trends Section */}
          {Object.keys(categoryData.monthly_trends).length > 0 && (
            <div className="trends-section">
              <h4>Monthly Trends (Top 5 Expense Categories)</h4>
              <div className="trends-grid">
                {Object.entries(categoryData.monthly_trends).map(
                  ([category, trends]) => (
                    <div key={category} className="trend-card">
                      <h5>{category}</h5>
                      <div className="trend-chart">
                        {trends.slice(0, 6).map((trend) => (
                          <div
                            key={`${trend.year}-${trend.month}`}
                            className="trend-bar"
                          >
                            <div
                              className="trend-fill"
                              style={{
                                height: `${Math.max(
                                  10,
                                  (trend.total /
                                    Math.max(...trends.map((t) => t.total))) *
                                    100
                                )}px`,
                              }}
                              title={`${new Date(
                                trend.year,
                                trend.month - 1
                              ).toLocaleDateString("en-US", {
                                month: "short",
                                year: "numeric",
                              })}: ${formatCurrency(trend.total)}`}
                            ></div>
                            <span className="trend-label">
                              {new Date(
                                trend.year,
                                trend.month - 1
                              ).toLocaleDateString("en-US", { month: "short" })}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CategoryBreakdown;
