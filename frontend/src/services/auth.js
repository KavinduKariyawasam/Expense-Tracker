import axios from "axios";

const API_URL = "http://127.0.0.1:8000";

export function register(username, email, password) {
  return axios.post(`${API_URL}/register`, { username, email, password });
}

export async function login(email, password) {
  console.log("Sending login request for:", email);
  
  const response = await fetch("http://127.0.0.1:8000/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ username: email, password }),
  });

  console.log("Response status:", response.status);
  console.log("Response ok:", response.ok);

  if (!response.ok) {
    const errorText = await response.text();
    console.log("Error response:", errorText);
    throw new Error("Invalid email or password");
  }

  const data = await response.json();
  console.log("Login response data:", data);
  return data;
}