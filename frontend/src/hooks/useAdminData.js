import { useState, useEffect } from 'react';
import axios from 'axios';

const API_BASE_URL = "http://localhost:8000/api/admin";

export const useAdminData = () => {
    const [applicants, setApplicants] = useState([]);
    const [jobs, setJobs] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchData = async () => {
        try {
            setLoading(true);
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
                console.warn("Employees endpoint failed.");
                setEmployees([]);
            }
        } catch (err) {
            console.error("Critical data fetch failed", err);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveJob = async (updatedData, jobId) => {
        try {
            if (jobId) {
                // UPDATE existing job via Axios
                await axios.put(`${API_BASE_URL}/jobs/${jobId}`, {
                    title: updatedData.title,
                    department: updatedData.department,
                    status: updatedData.status,
                    applicant_limit: parseInt(updatedData.applicant_limit, 10) || 50
                });
            } else {
                // CREATE new job via Axios
                await axios.post(`${API_BASE_URL}/jobs`, {
                    ...updatedData,
                    applicant_limit: parseInt(updatedData.applicant_limit, 10) || 50
                });
            }
            await fetchData(); // Refresh list after saving
            return true;
        } catch (err) {
            console.error("Save job failed", err);
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
            await axios.post(`${API_BASE_URL}/employees`, employeeData);
            await fetchData(); 
            return true;
        } catch (error) {
            console.error("Failed to save employee:", error);
            return false;
        }
    };

    useEffect(() => { fetchData(); }, []);

    return { 
        applicants, 
        jobs, 
        employees, 
        loading, 
        handleSaveJob, 
        handleSaveEmployee, 
        handleDeleteJob, 
        handleDeleteApplicant, 
        refresh: fetchData 
    };
};