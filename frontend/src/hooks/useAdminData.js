import { useState, useEffect } from 'react';
import axios from 'axios';

const API_BASE_URL = "http://localhost:8000/api/admin";

export const useAdminData = () => {
    const [applicants, setApplicants] = useState([]);
    const [jobs, setJobs] = useState([]);
    const [employees, setEmployees] = useState([]); // Added state
    const [loading, setLoading] = useState(true);

    const fetchData = async () => {
    try {
        setLoading(true);
        // We fetch Applicants and Jobs first as we know they work
        const [appRes, jobRes] = await Promise.all([
            axios.get(`${API_BASE_URL}/applicants`),
            axios.get(`${API_BASE_URL}/jobs`),
        ]);
        setApplicants(appRes.data);
        setJobs(jobRes.data);
        try {
            const empRes = await axios.get(`${API_BASE_URL}/employees`);
            setEmployees(empRes.data);
        } catch (empErr) {
            console.warn("Employees endpoint failed, but Applicants are preserved.");
            // Optional: setEmployees([]) to ensure it's at least an empty array
        }

    } catch (err) {
        console.error("Critical data fetch failed", err);
    } finally {
        setLoading(false);
    }
};

    const handleSaveJob = async (jobData, editingId) => {
        try {
            if (editingId) await axios.put(`${API_BASE_URL}/jobs/${editingId}`, jobData);
            else await axios.post(`${API_BASE_URL}/jobs`, jobData);
            await fetchData(); 
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

    const handleSaveEmployee = async (employeeData) => {
    try {
        const newEntry = { ...employeeData, id: Date.now() };
        
        setEmployees(prev => [...prev, newEntry]);

        await axios.post(`${API_BASE_URL}/employees`, employeeData);
        
        await fetchData(); 
        return true;
    } catch (error) {
        console.error("Failed to save employee to database:", error);
        return false;
    }
    };

    useEffect(() => { fetchData(); }, []);

    return { 
        applicants, 
        jobs, 
        employees, // Added to return
        loading, 
        handleSaveJob, 
        handleSaveEmployee, // Added to return
        handleDeleteJob, 
        handleDeleteApplicant, 
        refresh: fetchData 
    };
};