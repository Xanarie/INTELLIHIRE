import { useState, useEffect } from 'react';
import axios from 'axios';

const API_BASE_URL = "http://localhost:8000/api/admin";

export const useAdminData = () => {
    const [applicants, setApplicants] = useState([]);
    const [jobs, setJobs] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [appRes, jobRes] = await Promise.all([
                axios.get(`${API_BASE_URL}/applicants`),
                axios.get(`${API_BASE_URL}/jobs`)
            ]);
            setApplicants(appRes.data);
            setJobs(jobRes.data);
        } catch (err) {
            console.error("Data fetch failed", err);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveJob = async (jobData, editingId) => {
        try {
            if (editingId) await axios.put(`${API_BASE_URL}/jobs/${editingId}`, jobData);
            else await axios.post(`${API_BASE_URL}/jobs`, jobData);
            await fetchData(); // Refresh list
            return true;
        } catch (err) { 
            console.error("Save failed", err);
            return false; 
        }
    };

    const handleDeleteJob = async (id) => {
        if (!window.confirm("Delete permanently?")) return;
        try {
            await axios.delete(`${API_BASE_URL}/jobs/${id}`);
            setJobs(prev => prev.filter(j => j.id !== id));
        } catch (err) { console.error("Delete job failed", err); }
    };

    const handleDeleteApplicant = async (id) => {
        if (!window.confirm("Delete applicant?")) return;
        try {
            await axios.delete(`${API_BASE_URL}/applicants/${id}`);
            setApplicants(prev => prev.filter(a => (a.id || a.applicantid) !== id));
        } catch (err) { console.error("Delete applicant failed", err); }
    };

    useEffect(() => { fetchData(); }, []);

    return { 
        applicants, 
        jobs, 
        loading, 
        handleSaveJob, 
        handleDeleteJob, 
        handleDeleteApplicant, 
        refresh: fetchData 
    };
};