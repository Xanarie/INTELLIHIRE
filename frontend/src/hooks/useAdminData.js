import { useState, useEffect, useCallback } from 'react';
import { api } from '../config/api';

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
        api.get('/applicants'),
        api.get('/employees').catch(err => {
          console.warn('Employees endpoint failed.', err?.response?.data ?? err);
          return { data: [] };
        }),
      ]);
        setApplicants(Array.isArray(appRes.data) ? appRes.data.filter(a => a.hiring_status !== 'Archived') : []);
        setEmployees(Array.isArray(empRes.data) ? empRes.data : []);
    } catch (err) {
      console.error('Critical data fetch failed', err?.response?.data ?? err);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleDeleteApplicant = useCallback(async (id) => {
    if (!window.confirm('Delete applicant?')) return { ok: false, message: 'Cancelled.' };
    try {
      await api.delete(`/applicants/${id}`);
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
      const res  = await api.post('/employees', employeeData);
      const saved = res.data;
      setEmployees(prev => [saved, ...prev]);
      return { ok: true, message: 'Employee saved successfully.', employee: saved };
    } catch (err) {
      const { message } = extractErrMessage(err, 'Failed to save employee.');
      console.error('Failed to save employee:', err?.response?.data ?? err);
      return { ok: false, message };
    }
  }, []);

  const handleDeleteEmployee = useCallback(async (id) => {
    if (!window.confirm('Delete this employee? This will also remove their login access.')) {
      return { ok: false, message: 'Cancelled.' };
    }
    try {
      await api.delete(`/employees/${id}`);
      setEmployees(prev => prev.filter(e => e.id !== id));
      return { ok: true, message: 'Employee deleted.' };
    } catch (err) {
      const { message } = extractErrMessage(err, 'Delete employee failed.');
      console.error('Delete employee failed:', err?.response?.data ?? err);
      return { ok: false, message };
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const updateApplicantChecklist = useCallback((id, checklist) => {
    setApplicants(prev => prev.map(a =>
      (a.id ?? a.applicantid) === id ? { ...a, onboarding_checklist: checklist } : a
    ));
  }, []);

  return {
    applicants,
    employees,
    loading,
    handleDeleteApplicant,
    handleSaveEmployee,
    handleDeleteEmployee,
    updateApplicantChecklist,
    refresh: fetchData,
  };
};