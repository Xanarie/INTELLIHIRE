import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { API_BASE } from '../config/api';

const extractErrMessage = (err, fallback) => {
  const data = err?.response?.data;
  const message =
    (typeof data === 'string' && data) ||
    data?.detail ||
    data?.message ||
    err?.message ||
    fallback;
  return { status: err?.response?.status, message };
};

export const useAdminData = () => {
  const [applicants, setApplicants] = useState([]);
  const [employees, setEmployees]   = useState([]);
  const [loading, setLoading]       = useState(true);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [appRes, empRes] = await Promise.all([
        axios.get(`${API_BASE}/applicants`),
        axios.get(`${API_BASE}/employees`).catch(err => {
          console.warn('Employees endpoint failed.', err?.response?.data ?? err);
          return { data: [] };
        }),
      ]);
      setApplicants(appRes.data || []);
      setEmployees(empRes.data || []);
    } catch (err) {
      console.error('Critical data fetch failed', err?.response?.data ?? err);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleDeleteApplicant = useCallback(async (id) => {
    if (!window.confirm('Delete applicant?')) return { ok: false, message: 'Cancelled.' };
    try {
      await axios.delete(`${API_BASE}/applicants/${id}`);
      setApplicants(prev => prev.filter(a => (a.id ?? a.applicantid) !== id));
      return { ok: true, message: 'Applicant deleted.' };
    } catch (err) {
      const { message } = extractErrMessage(err, 'Delete applicant failed.');
      console.error('Delete applicant failed:', err?.response?.data ?? err);
      return { ok: false, message };
    }
  }, []);

  const handleSaveEmployee = useCallback(async (employeeData) => {
    try {
      const res = await axios.post(`${API_BASE}/employees`, employeeData);
      const saved = res.data;
      setEmployees(prev => [saved, ...prev]);
      return { ok: true, message: 'Employee saved successfully.', employee: saved };
    } catch (err) {
      const { message } = extractErrMessage(err, 'Failed to save employee.');
      console.error('Failed to save employee:', err?.response?.data ?? err);
      return { ok: false, message };
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    applicants,
    employees,
    loading,
    handleDeleteApplicant,
    handleSaveEmployee,
    refresh: fetchData,
  };
};