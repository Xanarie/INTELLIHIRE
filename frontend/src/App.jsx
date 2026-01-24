import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import ApplicantHub from './components/ApplicantHub';
import AdminHub from './components/AdminHub';

function App() {
  return (
    <Router>
      <Routes>
        {/* This makes ApplicantHub the main page at http://localhost:5173/ */}
        <Route path="/" element={<ApplicantHub />} />
        <Route path="/admin" element={<AdminHub />} />
      </Routes>
    </Router>
  );
}

export default App;