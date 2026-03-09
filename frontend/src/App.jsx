import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import ApplicantHub from './components/ApplicantHub';
import AdminHub from './components/AdminHub';
import JobPostingPage from './components/pages/JobPostingPage';
import Login from './components/AdminLogin';
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;


function App() {
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