const API_URL = "http://127.0.0.1:8000";

const getAuthHeaders = () => {
  const token = localStorage.getItem("access_token");
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
};

export const getInvestments = async (skip = 0, limit = 100) => {
  const response = await fetch(
    `${API_URL}/investments?skip=${skip}&limit=${limit}`,
    {
      method: "GET",
      headers: getAuthHeaders(),
    }
  );

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error("401: Unauthorized");
    }
    throw new Error("Failed to fetch investments");
  }

  const data = await response.json();
  return data;
};

export const getInvestmentById = async (investmentId) => {
  const response = await fetch(`${API_URL}/investments/${investmentId}`, {
    method: "GET",
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error("401: Unauthorized");
    }
    if (response.status === 404) {
      throw new Error("Investment not found");
    }
    throw new Error("Failed to fetch investment");
  }

  return response.json();
};

export const createInvestment = async (investmentData) => {
  const response = await fetch(`${API_URL}/investments`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(investmentData),
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error("401: Unauthorized");
    }
    const error = await response.json();
    throw new Error(error.detail || "Failed to create investment");
  }

  return response.json();
};

export const updateInvestment = async (investmentId, investmentData) => {
  const response = await fetch(`${API_URL}/investments/${investmentId}`, {
    method: "PUT",
    headers: getAuthHeaders(),
    body: JSON.stringify(investmentData),
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error("401: Unauthorized");
    }
    const error = await response.json();
    throw new Error(error.detail || "Failed to update investment");
  }

  return response.json();
};

export const deleteInvestment = async (investmentId) => {
  const response = await fetch(`${API_URL}/investments/${investmentId}`, {
    method: "DELETE",
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error("401: Unauthorized");
    }
    const error = await response.json();
    throw new Error(error.detail || "Failed to delete investment");
  }

  return response.json();
};

export const getInvestmentSummary = async () => {
  const response = await fetch(`${API_URL}/investments/summary`, {
    method: "GET",
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error("401: Unauthorized");
    }
    throw new Error("Failed to fetch investment summary");
  }

  return response.json();
};

export const createInvestmentTransaction = async (
  investmentId,
  transactionData
) => {
  const response = await fetch(
    `${API_URL}/investments/${investmentId}/transactions`,
    {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(transactionData),
    }
  );

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error("401: Unauthorized");
    }
    const error = await response.json();
    throw new Error(error.detail || "Failed to create investment transaction");
  }

  return response.json();
};

export const getRecentInvestments = async (limit = 5) => {
  const response = await fetch(`${API_URL}/investments?skip=0&limit=${limit}`, {
    method: "GET",
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error("401: Unauthorized");
    }
    throw new Error("Failed to fetch recent investments");
  }

  return response.json();
};
