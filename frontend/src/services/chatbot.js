import axios from "axios";

const API_BASE_URL = "http://127.0.0.1:8000";

// Get auth token from localStorage
const getAuthToken = () => {
  return localStorage.getItem("access_token");
};

// Create axios instance with auth headers
const apiClient = axios.create({
  baseURL: API_BASE_URL,
});

// Add auth token to requests
apiClient.interceptors.request.use((config) => {
  const token = getAuthToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Chatbot API service
export const chatbotService = {
  // Send message to chatbot
  sendMessage: async (message) => {
    try {
      const response = await apiClient.post("/chatbot/chat", {
        message: message,
      });
      return response.data;
    } catch (error) {
      if (error.response?.status === 401) {
        throw new Error("Please login to use the chatbot");
      }
      throw new Error(error.response?.data?.detail || "Failed to send message");
    }
  },

  // Check chatbot health
  checkHealth: async () => {
    try {
      const response = await apiClient.get("/chatbot/health");
      return response.data;
    } catch (error) {
      throw new Error("Chatbot service unavailable");
    }
  },
};

export default chatbotService;
