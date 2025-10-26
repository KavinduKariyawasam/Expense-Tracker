import React, { useState } from "react";
import YearlySummary from "./YearlySummary";
import MonthlyAnalysis from "./MonthlyAnalysis";
import CategoryBreakdown from "./CategoryBreakdown";
import "./Reports.css";

const Reports = () => {
  const [activeTab, setActiveTab] = useState("yearly");

  return (
    <div className="reports-container">
      <div className="reports-header">
        <h1>📊 Financial Reports</h1>
        <p>Analyze your financial data with detailed reports and insights</p>
      </div>

      <div className="reports-tabs">
        <button
          className={`tab-button ${activeTab === "yearly" ? "active" : ""}`}
          onClick={() => setActiveTab("yearly")}
        >
          <span className="tab-icon">📅</span>
          Yearly Summary
        </button>
        <button
          className={`tab-button ${activeTab === "monthly" ? "active" : ""}`}
          onClick={() => setActiveTab("monthly")}
        >
          <span className="tab-icon">📈</span>
          Monthly Analysis
        </button>
        <button
          className={`tab-button ${activeTab === "category" ? "active" : ""}`}
          onClick={() => setActiveTab("category")}
        >
          <span className="tab-icon">🏷️</span>
          Category Breakdown
        </button>
        <button
          className={`tab-button ${activeTab === "trends" ? "active" : ""}`}
          onClick={() => setActiveTab("trends")}
        >
          <span className="tab-icon">📉</span>
          Trends
        </button>
      </div>

      <div className="reports-content">
        {activeTab === "yearly" && (
          <div className="report-section">
            <YearlySummary />
          </div>
        )}
        {activeTab === "monthly" && (
          <div className="report-section">
            <MonthlyAnalysis />
          </div>
        )}
        {activeTab === "category" && (
          <div className="report-section">
            <CategoryBreakdown />
          </div>
        )}
        {activeTab === "trends" && (
          <div className="coming-soon">
            <div className="coming-soon-icon">📈</div>
            <h3>Trends & Insights</h3>
            <p>Smart financial insights and trend analysis coming soon!</p>
            <small>
              This feature will provide AI-powered insights into your spending
              habits.
            </small>
          </div>
        )}
      </div>
    </div>
  );
};

export default Reports;
