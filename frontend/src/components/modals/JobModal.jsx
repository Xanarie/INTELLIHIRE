import React, { useState, useEffect } from 'react';
import { X, FileText, Award, Star, Brain } from 'lucide-react';

const EMPTY_FORM = {
  title: '',
  department: 'IT',
  status: 'Draft',
  applicant_limit: 50,
  key_responsibilities: '',
  required_qualifications: '',
  preferred_qualifications: '',
  key_competencies: '',
};

const DEPARTMENTS = ['IT', 'Creative', 'Marketing', 'HR', 'Operations', 'Finance'];

const DescriptionField = ({ icon: Icon, label, hint, value, onChange, disabled, rows = 5 }) => (
  <div>
    <div className="flex items-center gap-2 mb-1.5">
      <Icon size={13} className="text-[#10B981]" />
      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{label}</label>
    </div>
    <textarea
      rows={rows}
      disabled={disabled}
      value={value}
      onChange={onChange}
      placeholder={hint}
      className="w-full bg-slate-50 border-2 border-transparent focus:border-[#10B981] rounded-2xl px-4 py-3 text-sm transition-all outline-none resize-none disabled:opacity-60 leading-relaxed"
    />
    <p className="text-[9px] text-slate-300 text-right mt-1 mr-1">{value?.length ?? 0} chars</p>
  </div>
);

const JobModal = ({ isOpen, onClose, onSave, initialData }) => {
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    if (initialData) {
      setFormData({
        title:                   initialData.title ?? '',
        department:              initialData.department ?? 'IT',
        status:                  initialData.status ?? 'Draft',
        applicant_limit:         initialData.applicant_limit ?? 50,
        key_responsibilities:    initialData.key_responsibilities ?? '',
        required_qualifications: initialData.required_qualifications ?? '',
        preferred_qualifications: initialData.preferred_qualifications ?? '',
        key_competencies:        initialData.key_competencies ?? '',
      });
    } else {
      setFormData(EMPTY_FORM);
    }
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const set = (field) => (e) => setFormData((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSaving) return;
    setIsSaving(true);
    const payload = {
      ...formData,
      applicant_limit: Number.isFinite(Number(formData.applicant_limit))
        ? Number(formData.applicant_limit)
        : 50,
    };
    try {
      const ok = await onSave(payload, initialData?.id);
      if (ok) onClose();
    } finally {
      setIsSaving(false);
    }
  };

  const isEditing = Boolean(initialData);

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
      {/* Modal — max-w-2xl gives plenty of room for 4 description fields */}
      <div className="bg-white rounded-[2rem] w-[70vw] max-h-[92vh] shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col overflow-hidden">

        {/* Header */}
        <div className="bg-[#10B981] px-8 py-5 flex items-center justify-between shrink-0">
          <h2 className="text-white font-black text-sm uppercase tracking-widest">
            {isEditing ? 'Edit Position' : 'New Job Posting'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="p-1.5 rounded-full text-white/80 hover:text-white hover:bg-white/20 transition-all disabled:opacity-50"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable body */}
        <form onSubmit={handleSubmit} className="flex flex-col overflow-hidden">
          <div className="overflow-y-auto px-8 py-6 space-y-6">

            {/* Row: Title */}
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase ml-1 tracking-widest">Job Title</label>
              <input
                required
                disabled={isSaving}
                className="w-full mt-1.5 bg-slate-50 border-2 border-transparent focus:border-[#10B981] rounded-2xl px-5 py-3 text-sm transition-all outline-none disabled:opacity-60"
                value={formData.title}
                onChange={set('title')}
                placeholder="e.g. Graphic Designer, Senior Software Developer"
              />
            </div>

            {/* Row: Limit + Department */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase ml-1 tracking-widest">Applicant Limit</label>
                <input
                  type="number"
                  min="1"
                  required
                  disabled={isSaving}
                  className="w-full mt-1.5 bg-slate-50 border-2 border-transparent focus:border-[#10B981] rounded-2xl px-5 py-3 text-sm transition-all outline-none disabled:opacity-60"
                  value={formData.applicant_limit}
                  onChange={(e) => setFormData((p) => ({ ...p, applicant_limit: parseInt(e.target.value, 10) || 0 }))}
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase ml-1 tracking-widest">Department</label>
                <select
                  disabled={isSaving}
                  className="w-full mt-1.5 bg-slate-50 border-2 border-transparent focus:border-[#10B981] rounded-2xl px-4 py-3 text-sm outline-none appearance-none transition-all disabled:opacity-60"
                  value={formData.department}
                  onChange={set('department')}
                >
                  {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
            </div>

            {/* Divider */}
            <div className="border-t border-slate-100 pt-2">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">
                Job Description
              </p>

              {/* 2-column grid for the 4 description sections */}
              <div className="grid grid-cols-2 gap-5">
                <DescriptionField
                  icon={FileText}
                  label="Key Responsibilities"
                  hint={"- Develop and maintain web applications\n- Collaborate with design teams\n- Write clean, testable code"}
                  value={formData.key_responsibilities}
                  onChange={set('key_responsibilities')}
                  disabled={isSaving}
                  rows={6}
                />
                <DescriptionField
                  icon={Award}
                  label="Required Qualifications"
                  hint={"- Bachelor's degree in Computer Science\n- 2+ years experience with React\n- Proficiency in Python or Node.js"}
                  value={formData.required_qualifications}
                  onChange={set('required_qualifications')}
                  disabled={isSaving}
                  rows={6}
                />
                <DescriptionField
                  icon={Star}
                  label="Preferred Qualifications"
                  hint={"- Experience with Docker / Kubernetes\n- Familiarity with CI/CD pipelines\n- Open-source contributions"}
                  value={formData.preferred_qualifications}
                  onChange={set('preferred_qualifications')}
                  disabled={isSaving}
                  rows={5}
                />
                <DescriptionField
                  icon={Brain}
                  label="Key Competencies"
                  hint={"- Strong problem-solving skills\n- Excellent written communication\n- Ability to work in an agile team"}
                  value={formData.key_competencies}
                  onChange={set('key_competencies')}
                  disabled={isSaving}
                  rows={5}
                />
              </div>
            </div>

            {/* Status toggle */}
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase ml-1 tracking-widest">Status</label>
              <div className="flex bg-slate-100 rounded-2xl p-1.5 mt-1.5">
                {['Draft', 'Open', 'Closed'].map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    disabled={isSaving}
                    onClick={() => setFormData((p) => ({ ...p, status: opt }))}
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
          </div>

          {/* Sticky footer */}
          <div className="flex gap-3 px-8 py-5 border-t border-slate-100 shrink-0 bg-white">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="flex-1 py-3.5 rounded-2xl border-2 border-slate-100 text-slate-400 text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="flex-2 px-10 py-3.5 rounded-2xl bg-[#10B981] text-white text-[10px] font-black uppercase tracking-widest hover:bg-[#059669] shadow-lg shadow-emerald-100 transition-all disabled:opacity-60 whitespace-nowrap"
            >
              {isSaving ? 'Saving…' : isEditing ? 'Update Position' : 'Create Position'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default JobModal;