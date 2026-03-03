import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import ApplicantHub from './components/ApplicantHub';
import AdminHub from './components/AdminHub';
<<<<<<< HEAD
import JobPostingPage from './components/pages/JobPostingPage';
=======
>>>>>>> 05ef615b6d098f2c2a9b43995a0643c6bbcd19a2

function App() {
  return (
    <Router>
      <Routes>
<<<<<<< HEAD
        <Route path="/"            element={<ApplicantHub />} />
        <Route path="/admin"       element={<AdminHub />} />
        <Route path="/jobs/:jobId" element={<JobPostingPage />} />
=======
        {/* This makes ApplicantHub the main page at http://localhost:5173/ */}
        <Route path="/" element={<ApplicantHub />} />
        <Route path="/admin" element={<AdminHub />} />
>>>>>>> 05ef615b6d098f2c2a9b43995a0643c6bbcd19a2
      </Routes>
    </Router>
  );
}

export default App;