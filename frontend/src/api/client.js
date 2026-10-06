import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';
export const UPLOADS_BASE_URL = import.meta.env.VITE_UPLOADS_URL || 'http://localhost:8000';

const client = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
});

export const api = {
  getStats: async () => {
    const res = await client.get('/stats');
    return res.data;
  },
  getAreaStats: async () => {
    const res = await client.get('/stats/areas');
    return res.data;
  },
  getIssues: async (params = {}) => {
    const res = await client.get('/issues', { params });
    return res.data;
  },
  getIssue: async (id) => {
    const res = await client.get(`/issues/${id}`);
    return res.data;
  },
  updateIssueStatus: async (id, statusData) => {
    const res = await client.patch(`/issues/${id}`, statusData);
    return res.data;
  },
  getIssueComplaint: async (id) => {
    const res = await client.post(`/issues/${id}/complaint`);
    return res.data;
  },
  submitReport: async (formData) => {
    const res = await client.post('/report', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return res.data;
  },
  resolveIssue: async (id, formData) => {
    const res = await client.post(`/issues/${id}/resolve`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return res.data;
  },
  reopenIssue: async (id) => {
    const res = await client.post(`/issues/${id}/reopen`);
    return res.data;
  },
  geocode: async (q) => {
    const res = await client.get('/geocode', { params: { q } });
    return res.data;
  }
};

export default client;
