import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Register from "./components/Register";
import Login from "./components/Login";
import Dashboard from "./components/Dashboard";
import Expenses from "./components/Expenses";
import Income from "./components/Income";
import LoanManager from "./components/LoanManager";
import ReportsPage from "./components/ReportsPage";
import Settings from "./components/Settings";
import Layout from "./components/Layout";
import PrivateRoute from "./components/PrivateRoute";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/register" element={<Register />} />
        <Route path="/login" element={<Login />} />
        <Route
          path="/dashboard"
          element={
            <PrivateRoute>
              <Layout>
                <Dashboard />
              </Layout>
            </PrivateRoute>
          }
        />
        <Route
          path="/expenses"
          element={
            <PrivateRoute>
              <Layout>
                <Expenses />
              </Layout>
            </PrivateRoute>
          }
        />
        <Route
          path="/income"
          element={
            <PrivateRoute>
              <Layout>
                <Income />
              </Layout>
            </PrivateRoute>
          }
        />
        <Route
          path="/loans"
          element={
            <PrivateRoute>
              <Layout>
                <LoanManager />
              </Layout>
            </PrivateRoute>
          }
        />
        <Route
          path="/reports"
          element={
            <PrivateRoute>
              <Layout>
                <ReportsPage />
              </Layout>
            </PrivateRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <PrivateRoute>
              <Layout>
                <Settings />
              </Layout>
            </PrivateRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
