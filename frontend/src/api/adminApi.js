import axios from "axios";

const API_BASE_URL = "http://127.0.0.1:8000/api/admin";

// Applicants
export const getAllApplicants = async () => {
  const res = await axios.get(`${API_BASE_URL}/applicants`);
  return res.data;
};

export const getApplicant = async (id) => {
  const res = await axios.get(`${API_BASE_URL}/applicants/${id}`);
  return res.data;
};

export const updateApplicant = async (id, data) => {
  const res = await axios.put(`${API_BASE_URL}/applicants/${id}`, data);
  return res.data;
};

// Statuses
export const getApplicantStatuses = async (id) => {
  const res = await axios.get(`${API_BASE_URL}/status/${id}`);
  return res.data;
};

export const createApplicantStatus = async (id, data) => {
  const res = await axios.post(`${API_BASE_URL}/status/${id}`, data);
  return res.data;
};
