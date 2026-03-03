import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import ApplicantHub from './components/ApplicantHub';
import AdminHub from './components/AdminHub';
import JobPostingPage from './components/pages/JobPostingPage';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/"            element={<ApplicantHub />} />
        <Route path="/admin"       element={<AdminHub />} />
        <Route path="/jobs/:jobId" element={<JobPostingPage />} />
      </Routes>
    </Router>
  );
}

export default App;