import { useState, useEffect, useCallback } from 'react';
import { api } from '@/config/api';

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

export const useJobData = () => {
  const [jobs, setJobs]       = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchJobs = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/jobs');
      setJobs(res.data || []);
    } catch (err) {
      console.error('Failed to fetch jobs', err?.response?.data ?? err);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSaveJob = useCallback(async (updatedData, jobId) => {
    try {
      const payload = {
        title:                    (updatedData.title ?? '').toString(),
        department:               (updatedData.department ?? 'IT').toString(),
        status:                   (updatedData.status ?? 'Draft').toString(),
        applicant_limit:          Number.isFinite(Number(updatedData.applicant_limit))
                                    ? Number(updatedData.applicant_limit)
                                    : 50,
        job_summary:              (updatedData.job_summary ?? '').toString(),
        key_responsibilities:     (updatedData.key_responsibilities ?? '').toString(),
        required_qualifications:  (updatedData.required_qualifications ?? '').toString(),
        preferred_qualifications: (updatedData.preferred_qualifications ?? '').toString(),
        key_competencies:         (updatedData.key_competencies ?? '').toString(),
      };

      if (jobId) {
        const res = await api.put(`/jobs/${jobId}`, payload);
        const saved = res.data;
        setJobs(prev => prev.map(j => (j.id === jobId ? { ...j, ...saved } : j)));
        return { ok: true, message: 'Job updated successfully.', job: saved };
      } else {
        const res = await api.post('/jobs', payload);
        const saved = res.data;
        setJobs(prev => [saved, ...prev]);
        return { ok: true, message: 'Job created successfully.', job: saved };
      }
    } catch (err) {
      const { message } = extractErrMessage(err, 'Save job failed.');
      console.error('Save job failed:', err?.response?.data ?? err);
      return { ok: false, message };
    }
  }, []);

  const handleDeleteJob = useCallback(async (id) => {
    if (!window.confirm('Delete permanently?')) return { ok: false, message: 'Cancelled.' };
    try {
      await api.delete(`/jobs/${id}`);
      setJobs(prev => prev.filter(j => j.id !== id));
      return { ok: true, message: 'Job deleted.' };
    } catch (err) {
      const { message } = extractErrMessage(err, 'Delete job failed.');
      console.error('Delete job failed:', err?.response?.data ?? err);
      return { ok: false, message };
    }
  }, []);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  return {
    jobs,
    jobsLoading: loading,
    handleSaveJob,
    handleDeleteJob,
    refreshJobs: fetchJobs,
  };
};