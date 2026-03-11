import React, { useState, useRef, useEffect } from "react";
import { useLocation } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  CheckCircle2, FileText, User, Globe, Briefcase,
  ChevronRight, Pencil, Loader2,
} from "lucide-react";

import { apiPublic } from '../config/api';

// ── Dropdown option lists ─────────────────────────────────────────────────────
const EDUCATION_OPTIONS = [
  "High School",
  "Vocational / Technical",
  "Some College",
  "Bachelor's Degree",
  "Master's Degree",
  "Doctorate",
];

const ISP_OPTIONS = [
  "PLDT",
  "Globe",
  "Converge",
  "Sky Broadband",
  "Smart",
  "DITO",
  "Other",
];

const SOURCE_OPTIONS = [
  "Facebook",
  "JobStreet",
  "LinkedIn",
  "Referral",
  "Walk-in",
  "Company Website",
  "Other",
];

// ── Shared select content style — fixes transparent dropdown bug ──────────────
const selectContentCls =
  "bg-white border border-slate-200 rounded-xl shadow-xl z-[9999]";

// ── Shared field label style ──────────────────────────────────────────────────
const LabelText = ({ children }) => (
  <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">
    {children}
  </Label>
);

// ── Shared primary button ─────────────────────────────────────────────────────
const PrimaryBtn = ({ onClick, disabled, children, className = "" }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`h-12 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2 transition-all disabled:opacity-60 bg-[#1A3C6E] hover:bg-[#0D2645] ${className}`}
  >
    {children}
  </button>
);

const FieldError = ({ msg }) =>
  msg ? <p className="text-xs text-rose-500 mt-1">{msg}</p> : null;

const ApplicantHub = () => {
  const [step, setStep]       = useState(1);
  const location              = useLocation();
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef          = useRef(null);
  const [availableJobs, setAvailableJobs] = useState([]);

  useEffect(() => {
    document.title = 'Apply — IntelliHire | ProgressPro';
  }, []);

  useEffect(() => {
    const preselected = location?.state?.preselectedRole;
    if (preselected) setFormData(prev => ({ ...prev, applied_position: preselected }));
  }, [location?.state?.preselectedRole]);

  const [formData, setFormData] = useState({
    f_name: "", l_name: "", age: "", email: "", phone: "",
    current_city: "", current_province: "", education: "",
    home_address: "", gender: "Male",
    app_source: "", stable_internet: "No", isp: "",
    applied_position: "", resume: null, noResume: false, cover_letter: "",
  });

  useEffect(() => {
    apiPublic.get('/api/applicants/jobs')
      .then(r => setAvailableJobs(Array.isArray(r.data) ? r.data : []))
      .catch(console.error);
  }, []);

  const [errors, setErrors] = useState({});

  const validateStep = () => {
    const e = {};
    if (step === 1) {
      if (!formData.f_name.trim())              e.f_name    = 'Required';
      if (!formData.l_name.trim())              e.l_name    = 'Required';
      if (!formData.age || Number(formData.age) < 18) e.age = 'Must be 18+';
      if (!formData.email.trim())               e.email     = 'Required';
      if (!formData.phone.trim())               e.phone     = 'Required';
      if (!formData.education)                  e.education = 'Required';
    }
    if (step === 2) {
      if (!formData.current_city.trim())        e.current_city     = 'Required';
      if (!formData.current_province.trim())    e.current_province = 'Required';
      if (!formData.home_address.trim())        e.home_address     = 'Required';
      if (!formData.app_source)                 e.app_source       = 'Required';
    }
    if (step === 3) {
      if (!formData.applied_position)           e.applied_position = 'Please select a position';

      if (!formData.noResume && !formData.resume) e.resume = 'Please upload your resume or select "No Resume Available"';
      if (formData.noResume && !formData.cover_letter.trim()) e.cover_letter = 'Please provide your application letter or CV summary';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const nextStep = () => { if (validateStep()) { setErrors({}); setStep(s => s + 1); } };
  const prevStep = () => setStep(s => s - 1);

  const handleChange      = e => setFormData({ ...formData, [e.target.name]: e.target.value });
  const handlePhoneChange = e => setFormData({ ...formData, phone: e.target.value.replace(/\D/g, "") });
  const handleFileChange  = e => setFormData({ ...formData, resume: e.target.files[0] });

  const handleSubmit = async () => {
    if (!formData.noResume && !formData.resume) return alert("Please upload your resume");
    if (submitting) return;
    setSubmitting(true);
    const data = new FormData();
    Object.entries(formData).forEach(([k, v]) => { if (v !== null) data.append(k, v); });
    try {
      await apiPublic.post('/api/applicants/', data, {
          headers: { "Content-Type": "multipart/form-data" },
      });
      setStep(5);
    } catch (err) {
      alert("Submission failed. Please check all fields.");
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  // Step indicator dot
  const StepDot = ({ n }) => {
    const done    = step > n;
    const current = step === n;
    return (
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-black transition-all"
        style={
          current ? { background: "#00AECC", color: "#fff", transform: "scale(1.1)" }
          : done   ? { background: "rgba(255,255,255,0.3)", color: "#fff" }
                   : { background: "rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.6)" }
        }
      >
        {done ? "✓" : n}
      </div>
    );
  };

  return (
    // White/neutral background — clean, not distracting
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl shadow-xl border-0 rounded-3xl overflow-hidden">

        {/* ── Branded header (navy→teal) ─────────────────────────────────── */}
        <CardHeader
          className="px-8 py-6 text-white"
          style={{ background: "linear-gradient(135deg, #1A3C6E 0%, #00AECC 100%)" }}
        >
          <div className="flex items-center justify-between mb-5">
            <div>
              <CardTitle className="text-xl font-black tracking-tight">IntelliHire</CardTitle>
              <p className="text-sm font-medium mt-0.5 text-white/70">
                ProgressPro Services Inc. — Applicant Portal
              </p>
            </div>
            <div className="w-11 h-11 rounded-2xl bg-white/20 flex items-center justify-center">
              <Briefcase size={20} className="text-white" />
            </div>
          </div>

          {/* Step progress */}
          {step < 5 && (
            <div className="flex items-center gap-3">
              {[1, 2, 3, 4].map(n => (
                <React.Fragment key={n}>
                  <StepDot n={n} />
                  {n < 4 && (
                    <div
                      className="flex-1 h-0.5 rounded-full transition-all"
                      style={{ background: step > n ? "rgba(255,255,255,0.6)" : "rgba(255,255,255,0.2)" }}
                    />
                  )}
                </React.Fragment>
              ))}
            </div>
          )}
        </CardHeader>

        {/* ── White form body ────────────────────────────────────────────── */}
        <CardContent className="px-8 py-8 bg-white space-y-5">

          {/* ── STEP 1: Personal Info ──────────────────────────────────────── */}
          {step === 1 && (
            <div className="space-y-4 animate-in slide-in-from-right duration-300">
              <h2 className="text-lg font-black text-slate-800 flex items-center gap-2">
                <User size={18} className="text-[#00AECC]" /> Personal Information
              </h2>
              <Separator />

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <LabelText>First Name</LabelText>
                  <Input name="f_name" value={formData.f_name} onChange={handleChange} placeholder="Juan" className="rounded-xl h-11 bg-slate-50 border-slate-200" />
                  <FieldError msg={errors.f_name} />
                </div>
                <div>
                  <LabelText>Last Name</LabelText>
                  <Input name="l_name" value={formData.l_name} onChange={handleChange} placeholder="Dela Cruz" className="rounded-xl h-11 bg-slate-50 border-slate-200" />
                  <FieldError msg={errors.l_name} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <LabelText>Age</LabelText>
                  <Input name="age" type="number" value={formData.age} onChange={handleChange} placeholder="25" className="rounded-xl h-11 bg-slate-50 border-slate-200" />
                  <FieldError msg={errors.age} />
                </div>
                <div>
                  <LabelText>Gender</LabelText>
                  <RadioGroup
                    value={formData.gender}
                    onValueChange={v => setFormData({ ...formData, gender: v })}
                    className="flex gap-5 mt-3"
                  >
                    {["Male", "Female"].map(g => (
                      <div key={g} className="flex items-center gap-2">
                        <RadioGroupItem value={g} id={`gender-${g}`} />
                        <Label htmlFor={`gender-${g}`} className="text-sm font-medium cursor-pointer">{g}</Label>
                      </div>
                    ))}
                  </RadioGroup>
                </div>
              </div>

              <div>
                <LabelText>Email Address</LabelText>
                <Input name="email" type="email" value={formData.email} onChange={handleChange} placeholder="juan@email.com" className="rounded-xl h-11 bg-slate-50 border-slate-200" />
                <FieldError msg={errors.email} />
              </div>

              <div>
                <LabelText>Phone Number</LabelText>
                <Input name="phone" value={formData.phone} onChange={handlePhoneChange} placeholder="09XXXXXXXXX" className="rounded-xl h-11 bg-slate-50 border-slate-200" />
                <FieldError msg={errors.phone} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <LabelText>City</LabelText>
                  <Input name="current_city" value={formData.current_city} onChange={handleChange} placeholder="Cebu City" className="rounded-xl h-11 bg-slate-50 border-slate-200" />
                  <FieldError msg={errors.current_city} />
                </div>
                <div>
                  <LabelText>Province</LabelText>
                  <Input name="current_province" value={formData.current_province} onChange={handleChange} placeholder="Cebu" className="rounded-xl h-11 bg-slate-50 border-slate-200" />
                  <FieldError msg={errors.current_province} />
                </div>
              </div>

              <div>
                <LabelText>Home Address</LabelText>
                <Input name="home_address" value={formData.home_address} onChange={handleChange} placeholder="123 Main St, Brgy..." className="rounded-xl h-11 bg-slate-50 border-slate-200" />
                <FieldError msg={errors.home_address} />
              </div>

              {/* ── Education dropdown (restored) ────────────────────────── */}
              <div>
                <LabelText>Highest Education</LabelText>
                <Select
                  value={formData.education}
                  onValueChange={v => setFormData({ ...formData, education: v })}
                >
                  <SelectTrigger className="rounded-xl h-11 bg-slate-50 border-slate-200 text-slate-700">
                    <SelectValue placeholder="Select highest education" />
                  </SelectTrigger>
                  <SelectContent className={selectContentCls}>
                    {EDUCATION_OPTIONS.map(e => (
                      <SelectItem key={e} value={e}>{e}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FieldError msg={errors.education} />
              </div>

              <PrimaryBtn onClick={nextStep} className="w-full mt-2">
                Next: Background Info <ChevronRight size={17} />
              </PrimaryBtn>
            </div>
          )}

          {/* ── STEP 2: Background ────────────────────────────────────────── */}
          {step === 2 && (
            <div className="space-y-4 animate-in slide-in-from-right duration-300">
              <h2 className="text-lg font-black text-slate-800 flex items-center gap-2">
                <Globe size={18} className="text-[#00AECC]" /> Background Information
              </h2>
              <Separator />

              <div>
                <LabelText>How did you hear about us?</LabelText>
                <Select
                  value={formData.app_source}
                  onValueChange={v => setFormData({ ...formData, app_source: v })}
                >
                  <SelectTrigger className="rounded-xl h-11 bg-slate-50 border-slate-200 text-slate-700">
                    <SelectValue placeholder="Select source" />
                  </SelectTrigger>
                  <SelectContent className={selectContentCls}>
                    {SOURCE_OPTIONS.map(s => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FieldError msg={errors.app_source} />
              </div>

              <div>
                <LabelText>Do you have stable internet?</LabelText>
                <RadioGroup
                  value={formData.stable_internet}
                  onValueChange={v => setFormData({ ...formData, stable_internet: v })}
                  className="flex gap-6 mt-2"
                >
                  {["Yes", "No"].map(v => (
                    <div key={v} className="flex items-center gap-2">
                      <RadioGroupItem value={v} id={`internet-${v}`} />
                      <Label htmlFor={`internet-${v}`} className="text-sm font-medium cursor-pointer">{v}</Label>
                    </div>
                  ))}
                </RadioGroup>
                <FieldError msg={errors.stable_internet} />
              </div>

              {/* ── ISP dropdown — only shown when internet = Yes ─────────── */}
              {formData.stable_internet === "Yes" && (
                <div>
                  <LabelText>Internet Provider (ISP)</LabelText>
                  <Select
                    value={formData.isp}
                    onValueChange={v => setFormData({ ...formData, isp: v })}
                  >
                    <SelectTrigger className="rounded-xl h-11 bg-slate-50 border-slate-200 text-slate-700">
                      <SelectValue placeholder="Select your ISP" />
                    </SelectTrigger>
                    <SelectContent className={selectContentCls}>
                      {ISP_OPTIONS.map(s => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FieldError msg={errors.isp} />
                </div>
              )}

              <div className="flex gap-3 mt-2">
                <Button variant="outline" className="flex-1 h-12 rounded-xl border-slate-200 font-bold text-slate-600" onClick={prevStep}>
                  Back
                </Button>
                <PrimaryBtn onClick={nextStep} className="flex-[2]">
                  Next: Position &amp; Resume <ChevronRight size={17} />
                </PrimaryBtn>
              </div>
            </div>
          )}

          {/* ── STEP 3: Position & Resume ─────────────────────────────────── */}
          {step === 3 && (
            <div className="space-y-4 animate-in slide-in-from-right duration-300">
              <h2 className="text-lg font-black text-slate-800 flex items-center gap-2">
                <Briefcase size={18} className="text-[#00AECC]" /> Position &amp; Resume
              </h2>
              <Separator />

              <div>
                <LabelText>Applied Position</LabelText>
                <Select
                  value={formData.applied_position}
                  onValueChange={v => setFormData({ ...formData, applied_position: v })}
                >
                  <SelectTrigger className="rounded-xl h-11 bg-slate-50 border-slate-200 text-slate-700">
                    <SelectValue placeholder="Select a position" />
                  </SelectTrigger>
                  <SelectContent className={selectContentCls}>
                    {availableJobs.map(j => (
                      <SelectItem key={j.id || j.title} value={j.title}>{j.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FieldError msg={errors.applied_position} />
              </div>

              <div>
                <LabelText>Upload Resume (PDF / DOCX)</LabelText>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.docx"
                  onChange={handleFileChange}
                  className="hidden"
                />

                {!formData.noResume && (
                  <>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full h-28 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center gap-2 transition-all text-slate-400 hover:border-slate-400 hover:text-slate-600"
                      style={
                        formData.resume
                          ? { borderColor: "#00AECC", background: "#E6F7FB", color: "#1A3C6E" }
                          : { borderColor: "#CBD5E1" }
                      }
                    >
                      <FileText size={26} />
                      <span className="text-sm font-semibold">
                        {formData.resume ? formData.resume.name : "Click to upload resume"}
                      </span>
                      <span className="text-xs text-slate-400">
                        {formData.resume ? "Click to change file" : "PDF or DOCX accepted"}
                      </span>
                    </button>
                    <FieldError msg={errors.resume} />
                  </>
                )}

                {/* No Resume checkbox */}
                <label className="flex items-center gap-2.5 mt-3 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={formData.noResume}
                    onChange={e => setFormData({ ...formData, noResume: e.target.checked, resume: null, cover_letter: "" })}
                    className="w-4 h-4 rounded accent-[#00AECC]"
                  />
                  <span className="text-sm font-semibold text-slate-600">No Resume Available</span>
                </label>
                <p className="text-[11px] text-slate-400 mt-1 leading-relaxed ml-6">
                  If you don't have a resume file, you may paste or write your application letter or CV summary below instead. Note that applications without a resume file may receive a lower initial screening score.
                </p>

                {formData.noResume && (
                  <div className="mt-3">
                    <textarea
                      rows={8}
                      value={formData.cover_letter}
                      onChange={e => setFormData({ ...formData, cover_letter: e.target.value })}
                      placeholder="Write or paste your application letter, work experience, skills, and qualifications here…"
                      className="w-full bg-slate-50 border-2 border-transparent rounded-xl px-4 py-3 text-sm text-slate-700 placeholder:text-slate-300 outline-none resize-none leading-relaxed transition-all"
                      onFocus={e => e.target.style.borderColor = '#00AECC'}
                      onBlur={e  => e.target.style.borderColor = 'transparent'}
                    />
                    <FieldError msg={errors.cover_letter} />
                  </div>
                )}
              </div>

              <div className="flex gap-3 mt-2">
                <Button variant="outline" className="flex-1 h-12 rounded-xl border-slate-200 font-bold text-slate-600" onClick={prevStep}>
                  Back
                </Button>
                <PrimaryBtn onClick={nextStep} className="flex-[2]">
                  Review Application <ChevronRight size={17} />
                </PrimaryBtn>
              </div>
            </div>
          )}

          {/* ── STEP 4: Review ────────────────────────────────────────────── */}
          {step === 4 && (
            <div className="space-y-4 animate-in slide-in-from-right duration-300">
              <h2 className="text-lg font-black text-slate-800 flex items-center gap-2">
                <CheckCircle2 size={18} className="text-[#00AECC]" /> Review Your Application
              </h2>
              <Separator />

              <div className="bg-slate-50 rounded-2xl p-5 grid grid-cols-2 gap-4">
                <ReviewItem icon={User}      label="Full Name"       value={`${formData.f_name} ${formData.l_name}`} />
                <ReviewItem icon={User}      label="Age / Gender"    value={`${formData.age} / ${formData.gender}`} />
                <ReviewItem icon={Globe}     label="Email"           value={formData.email} />
                <ReviewItem icon={Globe}     label="Phone"           value={formData.phone} />
                <ReviewItem icon={Globe}     label="City / Province" value={`${formData.current_city}, ${formData.current_province}`} />
                <ReviewItem icon={Globe}     label="Education"       value={formData.education} />
                <ReviewItem icon={Briefcase} label="Position"        value={formData.applied_position} />
                <ReviewItem icon={FileText}  label="Resume"          value={formData.noResume ? "No file — application letter provided" : formData.resume?.name} />
              </div>

              <div className="flex gap-4 mt-4">
                <Button
                  variant="outline"
                  className="flex-1 h-12 rounded-xl border-slate-200 text-slate-600 font-bold gap-2"
                  onClick={() => setStep(1)}
                >
                  <Pencil size={15} /> Edit All
                </Button>
                <PrimaryBtn onClick={handleSubmit} disabled={submitting} className="flex-[2]">
                  {submitting
                    ? <><Loader2 size={17} className="animate-spin" /> Submitting…</>
                    : <>Confirm &amp; Submit <ChevronRight size={17} /></>
                  }
                </PrimaryBtn>
              </div>
            </div>
          )}

          {/* ── STEP 5: Success ───────────────────────────────────────────── */}
          {step === 5 && (
            <div className="text-center space-y-6 py-10 animate-in zoom-in duration-500">
              <div className="w-20 h-20 bg-[#E6F7FB] rounded-full flex items-center justify-center text-4xl mx-auto text-[#00AECC]">
                ✓
              </div>
              <h2 className="text-2xl font-black text-slate-800 tracking-tight">Application Submitted!</h2>
              <p className="text-slate-500 max-w-sm mx-auto leading-relaxed text-sm">
                Thank you for applying to ProgressPro Services Inc. Our recruitment team will review your
                profile and reach out via email if you're a great fit.
              </p>
              <Button
                variant="outline"
                className="rounded-xl px-8 h-11 font-bold"
                onClick={() => window.location.reload()}
              >
                Submit another application
              </Button>
            </div>
          )}

        </CardContent>
      </Card>
    </div>
  );
};

// ── Review summary row ────────────────────────────────────────────────────────
const ReviewItem = ({ icon: Icon, label, value }) => (
  <div className="space-y-0.5">
    <div className="flex items-center gap-1.5 text-slate-400">
      <Icon size={12} />
      <span className="text-[10px] font-black uppercase tracking-widest">{label}</span>
    </div>
    <p className="text-sm font-semibold text-slate-700 truncate">{value || "Not provided"}</p>
  </div>
);

export default ApplicantHub;