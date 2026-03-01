import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const API_BASE_URL = "http://localhost:8000/api/admin";

const extractErrMessage = (err, fallback) => {
  const status = err?.response?.status;
  const data = err?.response?.data;
  const message =
    (typeof data === 'string' && data) ||
    data?.detail ||
    data?.message ||
    err?.message ||
    fallback;
  return { status, data, message };
};

export const useAdminData = () => {
  const [applicants, setApplicants] = useState([]);
  const [jobs, setJobs]             = useState([]);
  const [employees, setEmployees]   = useState([]);
  const [loading, setLoading]       = useState(true);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [appRes, jobRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/applicants`),
        axios.get(`${API_BASE_URL}/jobs`),
      ]);
      setApplicants(appRes.data || []);
      setJobs(jobRes.data || []);

      try {
        const empRes = await axios.get(`${API_BASE_URL}/employees`);
        setEmployees(empRes.data || []);
      } catch (empErr) {
        console.warn("Employees endpoint failed.", empErr?.response?.data ?? empErr);
        setEmployees([]);
      }
    } catch (err) {
      console.error("Critical data fetch failed", err?.response?.data ?? err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Returns { ok, message, job? }
  const handleSaveJob = useCallback(async (updatedData, jobId) => {
    try {
      // Build payload with the 4 structured description fields
      const payload = {
        title:                    (updatedData.title ?? '').toString(),
        department:               (updatedData.department ?? 'IT').toString(),
        status:                   (updatedData.status ?? 'Draft').toString(),
        applicant_limit:          Number.isFinite(Number(updatedData.applicant_limit))
                                    ? Number(updatedData.applicant_limit)
                                    : 50,
        key_responsibilities:     (updatedData.key_responsibilities ?? '').toString(),
        required_qualifications:  (updatedData.required_qualifications ?? '').toString(),
        preferred_qualifications: (updatedData.preferred_qualifications ?? '').toString(),
        key_competencies:         (updatedData.key_competencies ?? '').toString(),
      };

      let res;
      if (jobId) {
        res = await axios.put(`${API_BASE_URL}/jobs/${jobId}`, payload);
        const saved = res.data;
        setJobs(prev => prev.map(j => (j.id === jobId ? { ...j, ...saved } : j)));
        return { ok: true, message: "Job updated successfully.", job: saved };
      } else {
        res = await axios.post(`${API_BASE_URL}/jobs`, payload);
        const saved = res.data;
        setJobs(prev => [saved, ...prev]);
        return { ok: true, message: "Job created successfully.", job: saved };
      }
    } catch (err) {
      const { status, data, message } = extractErrMessage(err, "Save job failed.");
      console.error("Save job failed:", status, data ?? err);
      return { ok: false, message };
    }
  }, []);

  // Returns { ok, message }
  const handleDeleteJob = useCallback(async (id) => {
    if (!window.confirm("Delete permanently?")) return { ok: false, message: "Cancelled." };
    try {
      await axios.delete(`${API_BASE_URL}/jobs/${id}`);
      setJobs(prev => prev.filter(j => j.id !== id));
      return { ok: true, message: "Job deleted." };
    } catch (err) {
      const { status, data, message } = extractErrMessage(err, "Delete job failed.");
      console.error("Delete job failed:", status, data ?? err);
      return { ok: false, message };
    }
  }, []);

  // Returns { ok, message }
  const handleDeleteApplicant = useCallback(async (id) => {
    if (!window.confirm("Delete applicant?")) return { ok: false, message: "Cancelled." };
    try {
      await axios.delete(`${API_BASE_URL}/applicants/${id}`);
      setApplicants(prev => prev.filter(a => (a.id ?? a.applicantid) !== id));
      return { ok: true, message: "Applicant deleted." };
    } catch (err) {
      const { status, data, message } = extractErrMessage(err, "Delete applicant failed.");
      console.error("Delete applicant failed:", status, data ?? err);
      return { ok: false, message };
    }
  }, []);

  // Returns { ok, message, employee? }
  const handleSaveEmployee = useCallback(async (employeeData) => {
    try {
      const res = await axios.post(`${API_BASE_URL}/employees`, employeeData);
      const saved = res.data;
      setEmployees(prev => [saved, ...prev]);
      return { ok: true, message: "Employee saved successfully.", employee: saved };
    } catch (err) {
      const { status, data, message } = extractErrMessage(err, "Failed to save employee.");
      console.error("Failed to save employee:", status, data ?? err);
      return { ok: false, message };
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    applicants,
    jobs,
    employees,
    loading,
    handleSaveJob,
    handleSaveEmployee,
    handleDeleteJob,
    handleDeleteApplicant,
    refresh: fetchData,
  };
};