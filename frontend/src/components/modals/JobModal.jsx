// Colour key:
//   Primary navy  #1A3C6E   (was #10B981 / emerald)
//   Hover navy    #0D2645
//   Teal accent   #00AECC   (was teal-500)
//   Light teal bg #E6F7FB

import React, { useState, useEffect, useCallback } from 'react';
import {
  X, ClipboardList, Star, Lightbulb, FileText,
  Link2, Code2, ExternalLink, Check,
} from 'lucide-react';

const DRAFT_KEY = 'intellihire_job_draft';

const DEPARTMENTS = ['Admin', 'Creative', 'Finance', 'HR', 'IT', 'Legal', 'Marketing', 'Operations', 'Sales'];
const WORK_TYPES  = ['Full-time','Part-time','Contract','Freelance','Internship'];

const NAVY = '#1A3C6E';
const NAVY_DARK = '#0D2645';
const TEAL = '#00AECC';
const TEAL_LIGHT = '#E6F7FB';

const SectionLabel = ({ icon: Icon, color, children }) => (
  <div className={`flex items-center gap-2 text-[10px] font-black uppercase tracking-widest ${color}`}>
    <Icon size={13} />
    {children}
  </div>
);

const JobTextArea = ({ value, onChange, placeholder, rows = 5, disabled }) => (
  <textarea
    rows={rows}
    disabled={disabled}
    className="w-full mt-1.5 bg-slate-50 border-2 border-transparent rounded-2xl px-4 py-3 text-sm transition-all outline-none resize-none disabled:opacity-60 leading-relaxed focus:border-[#00AECC]"
    value={value}
    onChange={onChange}
    placeholder={placeholder}
  />
);

const JobModal = ({ isOpen, onClose, onSave, initialData }) => {
  const jobId    = initialData?.id ?? null;
  const publicUrl = `${window.location.origin}/jobs/${jobId}`;
  const embedCode = `<iframe src="${publicUrl}" width="100%" height="800" frameborder="0"></iframe>`;

  const blank = {
    title: '', department: '', work_type: 'Full-time', status: 'Draft',
    applicant_limit: 50,
    job_summary: '',
    key_responsibilities: '',
    required_qualifications: '',
    preferred_qualifications: '',
    key_competencies: '',
  };

  const [formData, setFormData] = useState(blank);
  const [isSaving, setIsSaving] = useState(false);
  const [copied,   setCopied]   = useState(null);

  // Load draft or initial data
  useEffect(() => {
    if (!isOpen) return;
    if (initialData) {
      setFormData({
        title:                   initialData.title                   ?? '',
        department:              initialData.department              ?? '',
        work_type:               initialData.work_type               ?? 'Full-time',
        status:                  initialData.status                  ?? 'Draft',
        applicant_limit:         initialData.applicant_limit         ?? 50,
        job_summary:             initialData.job_summary             ?? '',
        key_responsibilities:    initialData.key_responsibilities    ?? '',
        required_qualifications: initialData.required_qualifications ?? '',
        preferred_qualifications:initialData.preferred_qualifications?? '',
        key_competencies:        initialData.key_competencies        ?? '',
      });
    } else {
      const draft = localStorage.getItem(DRAFT_KEY);
      setFormData(draft ? { ...blank, ...JSON.parse(draft) } : blank);
    }
  }, [isOpen, initialData]);

  // Auto-save draft (new jobs only)
  useEffect(() => {
    if (!isOpen || initialData) return;
    localStorage.setItem(DRAFT_KEY, JSON.stringify(formData));
  }, [formData, isOpen, initialData]);

  const set = field => e => setFormData(p => ({ ...p, [field]: e.target.value }));

  const copyToClipboard = (text, key) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(null), 2000);
    });
  };

  const handleSubmit = async e => {
    if (e) e.preventDefault();
    if (!formData.title.trim()) return alert('Job title is required.');
    setIsSaving(true);
    const payload = {
      ...formData,
      applicant_limit: formData.applicant_limit ? Number(formData.applicant_limit) : 50,
    };
    try {
      const ok = await onSave(payload, initialData?.id);
      if (ok) {
        if (!initialData) localStorage.removeItem(DRAFT_KEY);
        onClose();
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => onClose();

  if (!isOpen) return null;


  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
      <div className="bg-white rounded-[2rem] w-[70vw] max-h-[92vh] shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col overflow-hidden">

        {/* Header */}
        <div
          className="px-8 py-5 flex items-center justify-between shrink-0"
          style={{ background: `linear-gradient(135deg, ${NAVY} 0%, ${TEAL} 100%)` }}
        >
          <h2 className="text-white font-bold text-base uppercase tracking-wider">
            {initialData ? 'Edit Position' : 'New Job Posting'}
          </h2>
          {!initialData && (
            <span className="text-white/60 text-[10px] font-semibold">● Draft auto-saved</span>
          )}
          <button
            type="button"
            onClick={handleClose}
            disabled={isSaving}
            className="text-white/80 hover:text-white transition-colors disabled:opacity-50"
          >
            <X size={20} />
          </button>
        </div>

        {/* Scrollable form body */}
        <form onSubmit={handleSubmit} className="overflow-y-auto flex-1 p-8 space-y-6">

          {/* Row 1: Title + Limit + Dept */}
          <div className="grid grid-cols-[1fr_auto_auto] gap-4 items-end">
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Job Title</label>
              <input
                required
                disabled={isSaving}
                className="w-full mt-1.5 bg-slate-50 border-2 border-transparent focus:border-[#00AECC] rounded-2xl px-5 py-3 text-sm transition-all outline-none disabled:opacity-60"
                value={formData.title}
                onChange={set('title')}
                placeholder="e.g. Customer Support Associate"
              />
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Openings</label>
              <input
                type="number"
                min={1}
                disabled={isSaving}
                className="w-24 mt-1.5 bg-slate-50 border-2 border-transparent focus:border-[#00AECC] rounded-2xl px-4 py-3 text-sm transition-all outline-none disabled:opacity-60 text-center font-bold"
                value={formData.applicant_limit}
                onChange={set('applicant_limit')}
              />
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Department</label>
              <select
                disabled={isSaving}
                className="mt-1.5 bg-slate-50 border-2 border-transparent focus:border-[#00AECC] rounded-2xl px-4 py-3 text-sm transition-all outline-none disabled:opacity-60 appearance-none pr-8"
                value={formData.department}
                onChange={set('department')}
              >
                <option value="">Department</option>
                {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
          </div>

          {/* Work type */}
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Work Type</label>
            <div className="flex gap-2 mt-2 flex-wrap">
              {WORK_TYPES.map(t => (
                <button
                  key={t}
                  type="button"
                  disabled={isSaving}
                  onClick={() => setFormData(p => ({ ...p, work_type: t }))}
                  className="px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-wide border-2 transition-all disabled:opacity-60"
                  style={
                    formData.work_type === t
                      ? { background: TEAL_LIGHT, borderColor: TEAL, color: NAVY }
                      : { background: '#F8FAFC', borderColor: '#E2E8F0', color: '#94A3B8' }
                  }
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Job Summary */}
          <div className="bg-slate-50 rounded-2xl p-4 border-2 border-transparent hover:border-slate-200 transition-colors">
            <SectionLabel icon={FileText} color="text-slate-500">Job Summary</SectionLabel>
            <JobTextArea value={formData.job_summary} onChange={set('job_summary')} placeholder="Brief overview of the role and team..." rows={3} disabled={isSaving} />
          </div>

          {/* Description sections */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-50 rounded-2xl p-4 border-2 border-transparent hover:border-slate-200 transition-colors">
              <SectionLabel icon={ClipboardList} color="text-[#1A3C6E]">Key Responsibilities</SectionLabel>
              <JobTextArea value={formData.key_responsibilities} onChange={set('key_responsibilities')} placeholder="Manage applicant pipeline\n- Coordinate with hiring managers\n- Conduct initial screening calls" rows={3} disabled={isSaving} />
              <p className="text-[9px] text-slate-300 mt-1 text-right">{formData.key_responsibilities.length} chars</p>
            </div>
            <div className="bg-slate-50 rounded-2xl p-4 border-2 border-transparent hover:border-slate-200 transition-colors">
              <SectionLabel icon={Star} color="text-amber-500">Required Qualifications</SectionLabel>
              <JobTextArea value={formData.required_qualifications} onChange={set('required_qualifications')} placeholder="Bachelor's degree in any field\n- 2+ years in a similar role\n- Strong communication skills" rows={3} disabled={isSaving} />
              <p className="text-[9px] text-slate-300 mt-1 text-right">{formData.required_qualifications.length} chars</p>
            </div>
            <div className="bg-slate-50 rounded-2xl p-4 border-2 border-transparent hover:border-slate-200 transition-colors">
              <SectionLabel icon={Lightbulb} color="text-violet-500">Preferred Qualifications</SectionLabel>
              <JobTextArea value={formData.preferred_qualifications} onChange={set('preferred_qualifications')} placeholder="Experience with ATS tools\n- Knowledge of BPO industry\n- Fluency in another language" rows={3} disabled={isSaving} />
              <p className="text-[9px] text-slate-300 mt-1 text-right">{formData.preferred_qualifications.length} chars</p>
            </div>
            <div className="bg-slate-50 rounded-2xl p-4 border-2 border-transparent hover:border-slate-200 transition-colors">
              <SectionLabel icon={FileText} color="text-rose-500">Key Competencies</SectionLabel>
              <JobTextArea value={formData.key_competencies} onChange={set('key_competencies')} placeholder="- Strong problem-solving skills\n- Excellent written communication\n- Team player" rows={3} disabled={isSaving} />
              <p className="text-[9px] text-slate-300 mt-1 text-right">{formData.key_competencies.length} chars</p>
            </div>
          </div>

          {/* Share / Embed — only for saved jobs */}
          {jobId && (
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-1.5">
                <Link2 size={10} /> Share &amp; Embed
              </label>
              <div className="flex gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => copyToClipboard(publicUrl, 'link')}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl border-2 text-[10px] font-black uppercase tracking-wider transition-all"
                  style={
                    copied === 'link'
                      ? { borderColor: TEAL, background: TEAL_LIGHT, color: NAVY }
                      : { borderColor: '#E2E8F0', background: '#F8FAFC', color: '#94A3B8' }
                  }
                >
                  {copied === 'link' ? <Check size={12} /> : <Link2 size={12} />}
                  {copied === 'link' ? 'Copied!' : 'Copy Link'}
                </button>
                <button
                  type="button"
                  onClick={() => copyToClipboard(embedCode, 'embed')}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl border-2 text-[10px] font-black uppercase tracking-wider transition-all"
                  style={
                    copied === 'embed'
                      ? { borderColor: TEAL, background: TEAL_LIGHT, color: NAVY }
                      : { borderColor: '#E2E8F0', background: '#F8FAFC', color: '#94A3B8' }
                  }
                >
                  {copied === 'embed' ? <Check size={12} /> : <Code2 size={12} />}
                  {copied === 'embed' ? 'Copied!' : 'Copy Embed'}
                </button>
                <a
                  href={publicUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl border-2 border-slate-200 bg-slate-50 text-slate-500 hover:border-[#00AECC] hover:text-[#1A3C6E] text-[10px] font-black uppercase tracking-wider transition-all"
                >
                  <ExternalLink size={12} />
                  Preview
                </a>
              </div>
              <div className="mt-2 px-3 py-2 bg-slate-50 rounded-xl border border-slate-100">
                <p className="text-[9px] text-slate-400 font-mono truncate">{publicUrl}</p>
              </div>
            </div>
          )}

          {/* Status toggle */}
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Status</label>
            <div className="flex bg-slate-100 rounded-2xl p-1.5 mt-1.5">
              {['Draft', 'Open', 'Closed'].map(opt => (
                <button
                  key={opt}
                  type="button"
                  disabled={isSaving}
                  onClick={() => setFormData(p => ({ ...p, status: opt }))}
                  className="flex-1 py-2 text-[10px] font-black uppercase rounded-xl transition-all disabled:opacity-60"
                  style={
                    formData.status === opt
                      ? { background: '#fff', color: TEAL, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }
                      : { color: '#94A3B8' }
                  }
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="px-8 py-5 border-t border-slate-100 flex gap-3 shrink-0 bg-white">
          <button
            type="button"
            onClick={handleClose}
            disabled={isSaving}
            className="flex-1 px-6 py-4 rounded-2xl border-2 border-slate-100 text-slate-400 text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={isSaving}
            onClick={handleSubmit}
            className="flex-[2] px-6 py-4 rounded-2xl text-white text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-60"
            style={{ background: `linear-gradient(135deg, ${NAVY} 0%, ${TEAL} 100%)`, boxShadow: `0 4px 14px ${TEAL}40` }}
          >
            {isSaving ? 'Saving…' : initialData ? 'Update Position' : 'Create Position'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default JobModal;