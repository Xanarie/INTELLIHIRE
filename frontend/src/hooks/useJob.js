import { useState, useEffect } from 'react';
import axios from 'axios';

const API_BASE_URL = "http://localhost:8000/api/admin";

export const useJobs = () => {
    const [jobs, setJobs] = useState([]);
    const [loading, setLoading] = useState(false);

    const fetchJobs = async () => {
        try {
            const res = await axios.get(`${API_BASE_URL}/jobs`);
            setJobs(res.data);
        } catch (err) {
            console.error("Failed to fetch jobs", err);
        }
    };

    const handleSaveJob = async (jobData, editingJobId) => {
        try {
            if (editingJobId) {
                await axios.put(`${API_BASE_URL}/jobs/${editingJobId}`, jobData);
            } else {
                await axios.post(`${API_BASE_URL}/jobs`, jobData);
            }
            await fetchJobs(); // Refresh
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
        } catch (err) {
            console.error("Delete failed", err);
        }
    };

    useEffect(() => { fetchJobs(); }, []);

    return { jobs, handleSaveJob, handleDeleteJob, fetchJobs };
};