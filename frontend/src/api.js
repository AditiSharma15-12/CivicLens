import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000/api';
export const UPLOADS_BASE_URL = 'http://localhost:8000';

export const api = {
  getStats: async () => {
    const res = await axios.get(`${API_BASE_URL}/stats`);
    return res.data;
  },
  getAreaStats: async () => {
    const res = await axios.get(`${API_BASE_URL}/stats/areas`);
    return res.data;
  },
  getIssues: async (params = {}) => {
    const res = await axios.get(`${API_BASE_URL}/issues`, { params });
    return res.data;
  },
  getIssue: async (id) => {
    const res = await axios.get(`${API_BASE_URL}/issues/${id}`);
    return res.data;
  },
  updateIssueStatus: async (id, statusData) => {
    const res = await axios.patch(`${API_BASE_URL}/issues/${id}`, statusData);
    return res.data;
  },
  getIssueComplaint: async (id) => {
    const res = await axios.post(`${API_BASE_URL}/issues/${id}/complaint`);
    return res.data;
  },
  submitReport: async (formData) => {
    const res = await axios.post(`${API_BASE_URL}/report`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return res.data;
  },
  resolveIssue: async (id, formData) => {
    const res = await axios.post(`${API_BASE_URL}/issues/${id}/resolve`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return res.data;
  },
  reopenIssue: async (id) => {
    const res = await axios.post(`${API_BASE_URL}/issues/${id}/reopen`);
    return res.data;
  },
  geocode: async (q) => {
    const res = await axios.get(`${API_BASE_URL}/geocode`, { params: { q } });
    return res.data;
  }
};
