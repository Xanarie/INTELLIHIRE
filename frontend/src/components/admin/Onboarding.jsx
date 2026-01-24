import React, { useState } from 'react';

const OnboardingTab = () => {
  const [formData, setFormData] = useState({
    applicantName: '',
    department: '',
    startDate: ''
  });

  const departments = ['Engineering', 'Marketing', 'Human Resources', 'Sales', 'Product'];

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log("Onboarding applicant:", formData);
    // Add your logic to move the applicant to the 'Employees' state/database
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-4">Applicant Onboarding</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium">Select Applicant</label>
          <input 
            type="text" 
            className="w-full border p-2 rounded"
            onChange={(e) => setFormData({...formData, applicantName: e.target.value})}
          />
        </div>

        <div>
          <label className="block text-sm font-medium">Assign Department</label>
          <select 
            className="w-full border p-2 rounded"
            onChange={(e) => setFormData({...formData, department: e.target.value})}
          >
            <option value="">Select a department...</option>
            {departments.map(dept => <option key={dept} value={dept}>{dept}</option>)}
          </select>
        </div>

        <button type="submit" className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700">
          Complete Onboarding
        </button>
      </form>
    </div>
  );
};

export default OnboardingTab;