import axios from "axios";

// Create a customized Axios instance
const api = axios.create({
  baseURL: "http://localhost:5000/api", // Point to our Express backend
  withCredentials: true, // MUST be true to send/receive httpOnly cookies automatically
});

export default api;
