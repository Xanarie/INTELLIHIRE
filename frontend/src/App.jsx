import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { useEffect } from 'react';
import ApplicantHub from './components/ApplicantHub';
import AdminHub from './components/AdminHub';
import JobPostingPage from './components/pages/JobPostingPage';
import Login from './components/AdminLogin';
import { API_PUBLIC } from './config/api';

function App() {
  useEffect(() => {
    // Keep Render awake by pinging every 10 minutes
    const interval = setInterval(() => {
      fetch(`${API_PUBLIC}/`).catch(() => {});
    }, 10 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <Router>
      <Routes>
        <Route path="/"            element={<ApplicantHub />} />
        <Route path="/admin"       element={<AdminHub />} />
        <Route path="/jobs/:jobId" element={<JobPostingPage />} />
        <Route path="/login"       element={<Login />} />
      </Routes>
    </Router>
  );
}

export default App;