const API_URL = "http://127.0.0.1:8000";

const getAuthHeaders = () => {
  const token = localStorage.getItem("access_token");
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
};

export const saveBillExpenses = async (billData) => {
  const response = await fetch(`${API_URL}/save-bill-expenses`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(billData),
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error("401: Unauthorized");
    }
    const error = await response.json();
    throw new Error(error.detail || "Failed to save expenses");
  }

  return response.json();
};

export const getExpenses = async (skip = 0, limit = 100) => {
  console.log(`Fetching expenses with skip=${skip}, limit=${limit}`); // Debug log

  const response = await fetch(
    `${API_URL}/expenses?skip=${skip}&limit=${limit}`,
    {
      method: "GET",
      headers: getAuthHeaders(),
    }
  );

  if (!response.ok) {
    console.log("Response not ok:", response.status, response.statusText); // Debug log
    if (response.status === 401) {
      throw new Error("401: Unauthorized");
    }
    throw new Error("Failed to fetch expenses");
  }

  const data = await response.json();
  console.log("getExpenses response data:", data); // Debug log
  return data;
};

export const getDashboardStats = async () => {
  const response = await fetch(`${API_URL}/dashboard-stats`, {
    method: "GET",
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error("401: Unauthorized");
    }
    throw new Error("Failed to fetch dashboard stats");
  }

  return response.json();
};

export const getRecentExpenses = async (limit = 5) => {
  const response = await fetch(`${API_URL}/expenses?skip=0&limit=${limit}`, {
    method: "GET",
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error("401: Unauthorized");
    }
    throw new Error("Failed to fetch recent expenses");
  }

  return response.json();
};

export const getCurrentUser = async () => {
  const response = await fetch(`${API_URL}/me`, {
    method: "GET",
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error("401: Unauthorized");
    }
    throw new Error("Failed to fetch user info");
  }

  return response.json();
};

export const createExpense = async (expenseData) => {
  const response = await fetch(`${API_URL}/expenses`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(expenseData),
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error("401: Unauthorized");
    }
    const error = await response.json();
    throw new Error(error.detail || "Failed to create expense");
  }

  return response.json();
};

export const updateExpense = async (expenseId, expenseData) => {
  const response = await fetch(`${API_URL}/expenses/${expenseId}`, {
    method: "PUT",
    headers: getAuthHeaders(),
    body: JSON.stringify(expenseData),
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error("401: Unauthorized");
    }
    const error = await response.json();
    throw new Error(error.detail || "Failed to update expense");
  }

  return response.json();
};

export const getYearlyStats = async (year) => {
  const response = await fetch(`${API_URL}/yearly-stats/${year}`, {
    method: "GET",
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error("401: Unauthorized");
    }
    throw new Error("Failed to fetch yearly statistics");
  }

  return response.json();
};

export const getAvailableYears = async () => {
  const response = await fetch(`${API_URL}/available-years`, {
    method: "GET",
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error("401: Unauthorized");
    }
    throw new Error("Failed to fetch available years");
  }

  return response.json();
};
