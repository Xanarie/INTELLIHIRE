import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';

const JobModal = ({ isOpen, onClose, onSave, initialData }) => {
  const [formData, setFormData] = useState({
    title: '',
    department: 'IT',
    status: 'Draft',
    applicant_limit: 50,
    job_description: '',
  });

  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    if (initialData) {
      setFormData({
        title: initialData.title ?? '',
        department: initialData.department ?? 'IT',
        status: initialData.status ?? 'Draft',
        applicant_limit: initialData.applicant_limit ?? 50,
        job_description: initialData.job_description ?? '',
      });
    } else {
      setFormData({
        title: '',
        department: 'IT',
        status: 'Draft',
        applicant_limit: 50,
        job_description: '',
      });
    }
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSaving) return;

    setIsSaving(true);

    const payload = {
      ...formData,
      applicant_limit: Number.isFinite(Number(formData.applicant_limit))
        ? Number(formData.applicant_limit)
        : 50,
      job_description: (formData.job_description ?? '').toString(),
    };

    try {
      // onSave MUST return boolean (true = success)
      const ok = await onSave(payload, initialData?.id);
      if (ok) onClose();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
      <div className="bg-white rounded-[2.5rem] w-full max-w-md shadow-2xl animate-in zoom-in duration-200 overflow-hidden">
        {/* Header */}
        <div className="bg-[#10B981] p-6 text-center relative">
          <h2 className="text-white font-bold text-lg uppercase tracking-wider">
            {initialData ? 'Edit Position' : 'New Job'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="absolute right-6 top-6 text-white/80 hover:text-white transition-colors disabled:opacity-50"
            aria-label="Close modal"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-5">
          {/* Job Title */}
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase ml-1 tracking-widest">
              Job Title
            </label>
            <input
              required
              disabled={isSaving}
              className="w-full bg-slate-50 border-2 border-transparent focus:border-[#10B981] rounded-2xl px-5 py-3 text-sm transition-all outline-none disabled:opacity-60"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g. Senior Software Developer"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Applicant Limit */}
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase ml-1 tracking-widest">
                Limit
              </label>
              <input
                type="number"
                min="1"
                required
                disabled={isSaving}
                className="w-full bg-slate-50 border-none rounded-2xl px-5 py-3 text-sm focus:ring-2 focus:ring-[#10B981] outline-none disabled:opacity-60"
                value={formData.applicant_limit}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    applicant_limit: parseInt(e.target.value, 10) || 0,
                  })
                }
              />
            </div>

            {/* Department */}
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase ml-1 tracking-widest">
                Dept
              </label>
              <select
                disabled={isSaving}
                className="w-full bg-slate-50 border-none rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-[#10B981] outline-none appearance-none disabled:opacity-60"
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
              >
                <option value="IT">IT</option>
                <option value="Creative">Creative</option>
                <option value="Marketing">Marketing</option>
                <option value="HR">HR</option>
              </select>
            </div>
          </div>

          {/* Job Description */}
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase ml-1 tracking-widest">
              Job Description
            </label>
            <textarea
              rows={10}
              disabled={isSaving}
              className="w-full bg-slate-50 border-2 border-transparent focus:border-[#10B981] rounded-2xl px-5 py-3 text-sm transition-all outline-none resize-y disabled:opacity-60"
              value={formData.job_description}
              onChange={(e) => setFormData({ ...formData, job_description: e.target.value })}
              placeholder="Paste the full job description here (responsibilities, requirements, tools, etc.)"
            />
            <div className="mt-1 text-[10px] text-slate-400 ml-1">
              {formData.job_description?.length ?? 0} characters
            </div>
          </div>

          {/* Status Toggle */}
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase ml-1 tracking-widest">
              Status
            </label>
            <div className="flex bg-slate-100 rounded-2xl p-1.5 mt-1">
              {['Draft', 'Open', 'Closed'].map((opt) => (
                <button
                  key={opt}
                  type="button"
                  disabled={isSaving}
                  onClick={() => setFormData({ ...formData, status: opt })}
                  className={`flex-1 py-2 text-[10px] font-black uppercase rounded-xl transition-all disabled:opacity-60 ${
                    formData.status === opt
                      ? 'bg-white text-[#10B981] shadow-sm'
                      : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="flex-1 px-6 py-4 rounded-2xl border-2 border-slate-100 text-slate-400 text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="flex-1 px-6 py-4 rounded-2xl bg-[#10B981] text-white text-[10px] font-black uppercase tracking-widest hover:bg-[#059669] shadow-lg shadow-emerald-100 transition-all disabled:opacity-60"
            >
              {isSaving ? 'Saving...' : initialData ? 'Update' : 'Confirm'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default JobModal;