import React, { useState, useEffect } from 'react';
import { X, FileText, Star, Info, Lightbulb, ClipboardList, Link2, Code2, ExternalLink, Check } from 'lucide-react';

const DRAFT_KEY = 'intellihire_job_draft';

const EMPTY_FORM = {
  title: '',
  department: 'IT',
  status: 'Draft',
  applicant_limit: 50,
  job_summary: '',
  key_responsibilities: '',
  required_qualifications: '',
  preferred_qualifications: '',
  key_competencies: '',
};

const JobModal = ({ isOpen, onClose, onSave, initialData }) => {
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [isSaving, setIsSaving] = useState(false);
  const [copied, setCopied] = useState(null); // 'link' | 'embed' | null

  const jobId = initialData?.id;
  const publicUrl = jobId ? `${window.location.origin}/jobs/${jobId}` : null;
  const embedCode = jobId
    ? `<iframe src="${window.location.origin}/jobs/${jobId}" width="100%" height="700" frameborder="0" style="border-radius:16px;border:1px solid #e2e8f0;"></iframe>`
    : null;

  const copyToClipboard = (text, key) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(null), 2000);
    });
  };

  // Load form: editing existing job → use its data; new job → try draft from localStorage
  useEffect(() => {
    if (!isOpen) return;

    if (initialData) {
      setFormData({
        title:                    initialData.title ?? '',
        department:               initialData.department ?? 'IT',
        status:                   initialData.status ?? 'Draft',
        applicant_limit:          initialData.applicant_limit ?? 50,
        job_summary:              initialData.job_summary ?? '',
        key_responsibilities:     initialData.key_responsibilities ?? '',
        required_qualifications:  initialData.required_qualifications ?? '',
        preferred_qualifications: initialData.preferred_qualifications ?? '',
        key_competencies:         initialData.key_competencies ?? '',
      });
    } else {
      // New job — restore draft if one exists
      try {
        const saved = localStorage.getItem(DRAFT_KEY);
        if (saved) setFormData({ ...EMPTY_FORM, ...JSON.parse(saved) });
        else setFormData(EMPTY_FORM);
      } catch {
        setFormData(EMPTY_FORM);
      }
    }
  }, [initialData, isOpen]);

  // Auto-save draft to localStorage whenever form changes (new jobs only)
  useEffect(() => {
    if (!isOpen || initialData) return;
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(formData));
    } catch { /* quota exceeded – silent */ }
  }, [formData, isOpen, initialData]);

  const set = (field) => (e) => setFormData((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSaving) return;
    setIsSaving(true);
    const payload = {
      ...formData,
      applicant_limit: Number.isFinite(Number(formData.applicant_limit))
        ? Number(formData.applicant_limit) : 50,
    };
    try {
      const ok = await onSave(payload, initialData?.id);
      if (ok) {
        if (!initialData) localStorage.removeItem(DRAFT_KEY); // clear draft on success
        onClose();
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    // Draft is already persisted in localStorage — just close
    onClose();
  };

  if (!isOpen) return null;

  const TextArea = ({ field, placeholder, rows = 5 }) => (
    <textarea
      rows={rows}
      disabled={isSaving}
      className="w-full mt-1.5 bg-slate-50 border-2 border-transparent focus:border-[#10B981] rounded-2xl px-4 py-3 text-sm transition-all outline-none resize-none disabled:opacity-60 leading-relaxed"
      value={formData[field]}
      onChange={set(field)}
      placeholder={placeholder}
    />
  );

  const SectionLabel = ({ icon: Icon, color, children }) => (
    <div className={`flex items-center gap-2 text-[10px] font-black uppercase tracking-widest ${color}`}>
      <Icon size={13} />
      {children}
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
      <div className="bg-white rounded-[2rem] w-[70vw] max-h-[92vh] shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col overflow-hidden">

        {/* Header */}
        <div className="bg-[#10B981] px-8 py-5 flex items-center justify-between shrink-0">
          <h2 className="text-white font-bold text-base uppercase tracking-wider">
            {initialData ? 'Edit Position' : 'New Job Posting'}
          </h2>
          {!initialData && (
            <span className="text-emerald-100 text-[10px] font-semibold">
              ● Draft auto-saved
            </span>
          )}
          <button type="button" onClick={handleClose} disabled={isSaving}
            className="text-white/80 hover:text-white transition-colors disabled:opacity-50">
            <X size={20} />
          </button>
        </div>

        {/* Scrollable form body */}
        <form onSubmit={handleSubmit} className="overflow-y-auto flex-1 p-8 space-y-6">

          {/* Row 1: Title + Limit + Dept */}
          <div className="grid grid-cols-[1fr_auto_auto] gap-4 items-end">
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Job Title</label>
              <input required disabled={isSaving}
                className="w-full mt-1.5 bg-slate-50 border-2 border-transparent focus:border-[#10B981] rounded-2xl px-5 py-3 text-sm transition-all outline-none disabled:opacity-60"
                value={formData.title} onChange={set('title')}
                placeholder="e.g. Senior Software Developer" />
            </div>
            <div className="w-28">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Limit</label>
              <input type="number" min="1" required disabled={isSaving}
                className="w-full mt-1.5 bg-slate-50 border-2 border-transparent focus:border-[#10B981] rounded-2xl px-4 py-3 text-sm outline-none disabled:opacity-60"
                value={formData.applicant_limit}
                onChange={(e) => setFormData((p) => ({ ...p, applicant_limit: parseInt(e.target.value, 10) || 0 }))} />
            </div>
            <div className="w-36">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Department</label>
              <select disabled={isSaving}
                className="w-full mt-1.5 bg-slate-50 border-2 border-transparent focus:border-[#10B981] rounded-2xl px-4 py-3 text-sm outline-none appearance-none disabled:opacity-60"
                value={formData.department} onChange={set('department')}>
                <option value="IT">IT</option>
                <option value="Creative">Creative</option>
                <option value="Marketing">Marketing</option>
                <option value="HR">HR</option>
                <option value="Operations">Operations</option>
              </select>
            </div>
          </div>

          {/* Job Description label */}
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-4">
              Job Description
            </p>

            {/* Job Summary — full width */}
            <div className="bg-slate-50 rounded-2xl p-4 border-2 border-transparent hover:border-slate-200 transition-colors mb-4">
              <SectionLabel icon={Info} color="text-[#2A5C9A]">Job Summary</SectionLabel>
              <TextArea field="job_summary" rows={3}
                placeholder="Brief overview of the role and its purpose within the organization..." />
            </div>

            {/* 2×2 grid */}
            <div className="grid grid-cols-2 gap-4">
              {/* Key Responsibilities */}
              <div className="bg-slate-50 rounded-2xl p-4 border-2 border-transparent hover:border-slate-200 transition-colors">
                <SectionLabel icon={ClipboardList} color="text-emerald-600">Key Responsibilities</SectionLabel>
                <TextArea field="key_responsibilities"
                  placeholder={"- Develop and maintain web applications\n- Collaborate with design teams\n- Write clean, testable code"} />
                <p className="text-[9px] text-slate-300 mt-1 text-right">{formData.key_responsibilities.length} chars</p>
              </div>

              {/* Required Qualifications */}
              <div className="bg-slate-50 rounded-2xl p-4 border-2 border-transparent hover:border-slate-200 transition-colors">
                <SectionLabel icon={Star} color="text-amber-500">Required Qualifications</SectionLabel>
                <TextArea field="required_qualifications"
                  placeholder={"- Bachelor's degree in Computer Science\n- 2+ years experience with React\n- Proficiency in Python or Node.js"} />
                <p className="text-[9px] text-slate-300 mt-1 text-right">{formData.required_qualifications.length} chars</p>
              </div>

              {/* Preferred Qualifications */}
              <div className="bg-slate-50 rounded-2xl p-4 border-2 border-transparent hover:border-slate-200 transition-colors">
                <SectionLabel icon={Lightbulb} color="text-violet-500">Preferred Qualifications</SectionLabel>
                <TextArea field="preferred_qualifications"
                  placeholder={"- Experience with Docker / Kubernetes\n- Familiarity with CI/CD pipelines\n- Open-source contributions"} />
                <p className="text-[9px] text-slate-300 mt-1 text-right">{formData.preferred_qualifications.length} chars</p>
              </div>

              {/* Key Competencies */}
              <div className="bg-slate-50 rounded-2xl p-4 border-2 border-transparent hover:border-slate-200 transition-colors">
                <SectionLabel icon={FileText} color="text-rose-500">Key Competencies</SectionLabel>
                <TextArea field="key_competencies"
                  placeholder={"- Strong problem-solving skills\n- Excellent written communication\n- Ability to work in an agile team"} />
                <p className="text-[9px] text-slate-300 mt-1 text-right">{formData.key_competencies.length} chars</p>
              </div>
            </div>
          </div>

          {/* Share / Embed — only shown for saved jobs */}
          {jobId && (
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-1.5">
                <Link2 size={10} /> Share & Embed
              </label>
              <div className="flex gap-2 mt-2">
                {/* Public link */}
                <button
                  type="button"
                  onClick={() => copyToClipboard(publicUrl, 'link')}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl border-2 text-[10px] font-black uppercase tracking-wider transition-all ${
                    copied === 'link'
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-600'
                      : 'border-slate-200 bg-slate-50 text-slate-500 hover:border-[#2A5C9A] hover:text-[#2A5C9A]'
                  }`}
                >
                  {copied === 'link' ? <Check size={12} /> : <Link2 size={12} />}
                  {copied === 'link' ? 'Copied!' : 'Copy Link'}
                </button>

                {/* Embed code */}
                <button
                  type="button"
                  onClick={() => copyToClipboard(embedCode, 'embed')}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl border-2 text-[10px] font-black uppercase tracking-wider transition-all ${
                    copied === 'embed'
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-600'
                      : 'border-slate-200 bg-slate-50 text-slate-500 hover:border-violet-400 hover:text-violet-600'
                  }`}
                >
                  {copied === 'embed' ? <Check size={12} /> : <Code2 size={12} />}
                  {copied === 'embed' ? 'Copied!' : 'Copy Embed'}
                </button>

                {/* Open in new tab */}
                <a
                  href={publicUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl border-2 border-slate-200 bg-slate-50 text-slate-500 hover:border-[#10B981] hover:text-[#10B981] text-[10px] font-black uppercase tracking-wider transition-all"
                >
                  <ExternalLink size={12} />
                  Preview
                </a>
              </div>
              {/* URL preview */}
              <div className="mt-2 px-3 py-2 bg-slate-50 rounded-xl border border-slate-100">
                <p className="text-[9px] text-slate-400 font-mono truncate">{publicUrl}</p>
              </div>
            </div>
          )}

          {/* Status toggle */}
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Status</label>
            <div className="flex bg-slate-100 rounded-2xl p-1.5 mt-1.5">
              {['Draft', 'Open', 'Closed'].map((opt) => (
                <button key={opt} type="button" disabled={isSaving}
                  onClick={() => setFormData((p) => ({ ...p, status: opt }))}
                  className={`flex-1 py-2 text-[10px] font-black uppercase rounded-xl transition-all disabled:opacity-60 ${
                    formData.status === opt ? 'bg-white text-[#10B981] shadow-sm' : 'text-slate-400 hover:text-slate-600'
                  }`}>
                  {opt}
                </button>
              ))}
            </div>
          </div>
        </form>

        {/* Footer actions — outside scroll area */}
        <div className="px-8 py-5 border-t border-slate-100 flex gap-3 shrink-0 bg-white">
          <button type="button" onClick={handleClose} disabled={isSaving}
            className="flex-1 px-6 py-4 rounded-2xl border-2 border-slate-100 text-slate-400 text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all disabled:opacity-60">
            Cancel
          </button>
          <button type="submit" form="" disabled={isSaving}
            onClick={handleSubmit}
            className="flex-[2] px-6 py-4 rounded-2xl bg-[#10B981] text-white text-[10px] font-black uppercase tracking-widest hover:bg-[#059669] shadow-lg shadow-emerald-100 transition-all disabled:opacity-60">
            {isSaving ? 'Saving…' : initialData ? 'Update Position' : 'Create Position'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default JobModal;