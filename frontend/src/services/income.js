const API_URL = "http://127.0.0.1:8000";

const getAuthHeaders = () => {
  const token = localStorage.getItem("access_token");
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
};

export const getIncome = async (skip = 0, limit = 100) => {
  const response = await fetch(
    `${API_URL}/income?skip=${skip}&limit=${limit}`,
    {
      method: "GET",
      headers: getAuthHeaders(),
    }
  );

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error("401: Unauthorized");
    }
    throw new Error("Failed to fetch income");
  }

  const data = await response.json();
  return data;
};

export const getIncomeById = async (incomeId) => {
  const response = await fetch(`${API_URL}/income/${incomeId}`, {
    method: "GET",
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error("401: Unauthorized");
    }
    if (response.status === 404) {
      throw new Error("Income not found");
    }
    throw new Error("Failed to fetch income");
  }

  return response.json();
};

export const createIncome = async (incomeData) => {
  const response = await fetch(`${API_URL}/income`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(incomeData),
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error("401: Unauthorized");
    }
    const error = await response.json();
    throw new Error(error.detail || "Failed to create income");
  }

  return response.json();
};

export const updateIncome = async (incomeId, incomeData) => {
  const response = await fetch(`${API_URL}/income/${incomeId}`, {
    method: "PUT",
    headers: getAuthHeaders(),
    body: JSON.stringify(incomeData),
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error("401: Unauthorized");
    }
    const error = await response.json();
    throw new Error(error.detail || "Failed to update income");
  }

  return response.json();
};

export const deleteIncome = async (incomeId) => {
  const response = await fetch(`${API_URL}/income/${incomeId}`, {
    method: "DELETE",
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error("401: Unauthorized");
    }
    const error = await response.json();
    throw new Error(error.detail || "Failed to delete income");
  }

  return response.json();
};

export const getRecentIncome = async (limit = 5) => {
  const response = await fetch(`${API_URL}/income?skip=0&limit=${limit}`, {
    method: "GET",
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error("401: Unauthorized");
    }
    throw new Error("Failed to fetch recent income");
  }

  return response.json();
};
