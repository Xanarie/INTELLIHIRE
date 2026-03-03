// frontend/src/components/ApplicantHub.jsx
import React, { useState, useRef, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { apiPublic } from "@/config/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { CheckCircle2, FileText, User, Globe, Briefcase, ChevronRight, Pencil, Loader2 } from "lucide-react";

const ApplicantHub = () => {
  const [step, setStep] = useState(1);
  const location = useLocation();
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef(null);
  const [availableJobs, setAvailableJobs] = useState([]);

  // Pre-select role when arriving from a job posting page
  useEffect(() => {
    const preselected = location?.state?.preselectedRole;
    if (preselected) {
      setFormData(prev => ({ ...prev, applied_position: preselected }));
    }
  }, [location?.state?.preselectedRole]);

  const [formData, setFormData] = useState({
    f_name: "", l_name: "", age: "", email: "", phone: "",
    current_city: "", current_province: "", education: "",
    home_address: "", gender: "Male",
    app_source: "", stable_internet: "No", isp: "",
    applied_position: "", resume: null,
  });

  useEffect(() => {
    apiPublic.get('/api/applicants/jobs')
      .then(r => setAvailableJobs(r.data))
      .catch(console.error);
  }, []);

  const nextStep = () => setStep((s) => s + 1);
  const prevStep = () => setStep((s) => s - 1);

  const handleChange = (e) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  const handlePhoneChange = (e) => {
    const digits = e.target.value.replace(/\D/g, "");
    setFormData({ ...formData, phone: digits });
  };

  const handleFileChange = (e) =>
    setFormData({ ...formData, resume: e.target.files[0] });

  const handleSubmit = async () => {
    if (!formData.resume) return alert("Please upload your resume");
    if (submitting) return;

    setSubmitting(true);
    const data = new FormData();
    Object.entries(formData).forEach(([k, v]) => {
      if (v !== null) data.append(k, v);
    });

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

  const StepDot = ({ n }) => (
    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black transition-all ${
      step === n ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/30 scale-110"
      : step > n  ? "bg-emerald-100 text-emerald-600"
                  : "bg-slate-100 text-slate-400"
    }`}>{step > n ? "✓" : n}</div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50/30 to-slate-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl shadow-2xl border-0 rounded-3xl overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white px-8 py-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <CardTitle className="text-2xl font-black tracking-tight">IntelliHire</CardTitle>
              <p className="text-emerald-100 text-sm font-medium mt-0.5">Applicant Portal</p>
            </div>
            <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
              <Briefcase size={22} className="text-white" />
            </div>
          </div>
          {step < 5 && (
            <div className="flex items-center gap-3">
              {[1, 2, 3, 4].map(n => (
                <React.Fragment key={n}>
                  <StepDot n={n} />
                  {n < 4 && <div className={`flex-1 h-0.5 rounded-full transition-all ${step > n ? "bg-emerald-300" : "bg-white/20"}`} />}
                </React.Fragment>
              ))}
            </div>
          )}
        </CardHeader>

        <CardContent className="px-8 py-7">

          {/* STEP 1: Personal Info */}
          {step === 1 && (
            <div className="space-y-4 animate-in slide-in-from-right duration-300">
              <h2 className="text-xl font-black text-slate-800 flex items-center gap-2"><User size={20} className="text-emerald-500" /> Personal Information</h2>
              <Separator />
              <div className="grid grid-cols-2 gap-4">
                <div><Label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">First Name</Label><Input name="f_name" value={formData.f_name} onChange={handleChange} placeholder="Juan" className="rounded-xl h-11" /></div>
                <div><Label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">Last Name</Label><Input name="l_name" value={formData.l_name} onChange={handleChange} placeholder="Dela Cruz" className="rounded-xl h-11" /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">Age</Label><Input name="age" type="number" value={formData.age} onChange={handleChange} placeholder="25" className="rounded-xl h-11" /></div>
                <div>
                  <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">Gender</Label>
                  <RadioGroup value={formData.gender} onValueChange={v => setFormData({...formData, gender: v})} className="flex gap-6 mt-3">
                    {["Male","Female"].map(v => (
                      <div key={v} className="flex items-center gap-2">
                        <RadioGroupItem value={v} id={`gender-${v}`} />
                        <Label htmlFor={`gender-${v}`} className="text-sm font-medium cursor-pointer">{v}</Label>
                      </div>
                    ))}
                  </RadioGroup>
                </div>
              </div>
              <div><Label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">Email Address</Label><Input name="email" type="email" value={formData.email} onChange={handleChange} placeholder="juan@email.com" className="rounded-xl h-11" /></div>
              <div><Label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">Phone Number</Label><Input name="phone" value={formData.phone} onChange={handlePhoneChange} placeholder="09XXXXXXXXX" className="rounded-xl h-11" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">City</Label><Input name="current_city" value={formData.current_city} onChange={handleChange} placeholder="Cebu City" className="rounded-xl h-11" /></div>
                <div><Label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">Province</Label><Input name="current_province" value={formData.current_province} onChange={handleChange} placeholder="Cebu" className="rounded-xl h-11" /></div>
              </div>
              <div><Label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">Home Address</Label><Input name="home_address" value={formData.home_address} onChange={handleChange} placeholder="123 Main St, Brgy..." className="rounded-xl h-11" /></div>
              <div>
                <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">Education</Label>
                <Select value={formData.education} onValueChange={v => setFormData({...formData, education: v})}>
                  <SelectTrigger className="rounded-xl h-11"><SelectValue placeholder="Select highest education" /></SelectTrigger>
                  <SelectContent>
                    {["High School","Vocational/Technical","Some College","Bachelor's Degree","Master's Degree","Doctorate"].map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <Button className="w-full bg-emerald-500 hover:bg-emerald-600 h-12 rounded-xl font-black text-white shadow-lg shadow-emerald-500/20 gap-2 mt-2" onClick={nextStep}>
                Next: Background Info <ChevronRight size={18} />
              </Button>
            </div>
          )}

          {/* STEP 2: Background */}
          {step === 2 && (
            <div className="space-y-4 animate-in slide-in-from-right duration-300">
              <h2 className="text-xl font-black text-slate-800 flex items-center gap-2"><Globe size={20} className="text-emerald-500" /> Background Information</h2>
              <Separator />
              <div>
                <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">How did you hear about us?</Label>
                <Select value={formData.app_source} onValueChange={v => setFormData({...formData, app_source: v})}>
                  <SelectTrigger className="rounded-xl h-11"><SelectValue placeholder="Select source" /></SelectTrigger>
                  <SelectContent>
                    {["Facebook","JobStreet","LinkedIn","Referral","Walk-in","Company Website","Other"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">Do you have stable internet?</Label>
                <RadioGroup value={formData.stable_internet} onValueChange={v => setFormData({...formData, stable_internet: v})} className="flex gap-6 mt-2">
                  {["Yes","No"].map(v => (
                    <div key={v} className="flex items-center gap-2">
                      <RadioGroupItem value={v} id={`internet-${v}`} />
                      <Label htmlFor={`internet-${v}`} className="text-sm font-medium cursor-pointer">{v}</Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>
              {formData.stable_internet === "Yes" && (
                <div><Label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">ISP Provider</Label><Input name="isp" value={formData.isp} onChange={handleChange} placeholder="PLDT, Globe, Sky..." className="rounded-xl h-11" /></div>
              )}
              <div className="flex gap-3 mt-2">
                <Button variant="outline" className="flex-1 h-12 rounded-xl border-slate-200 font-bold" onClick={prevStep}>Back</Button>
                <Button className="flex-[2] bg-emerald-500 hover:bg-emerald-600 h-12 rounded-xl font-black text-white shadow-lg shadow-emerald-500/20 gap-2" onClick={nextStep}>Next: Position & Resume <ChevronRight size={18} /></Button>
              </div>
            </div>
          )}

          {/* STEP 3: Position & Resume */}
          {step === 3 && (
            <div className="space-y-4 animate-in slide-in-from-right duration-300">
              <h2 className="text-xl font-black text-slate-800 flex items-center gap-2"><Briefcase size={20} className="text-emerald-500" /> Position & Resume</h2>
              <Separator />
              <div>
                <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">Applied Position</Label>
                <Select value={formData.applied_position} onValueChange={v => setFormData({...formData, applied_position: v})}>
                  <SelectTrigger className="rounded-xl h-11"><SelectValue placeholder="Select a position" /></SelectTrigger>
                  <SelectContent>
                    {availableJobs.map(j => <SelectItem key={j.id || j.title} value={j.title}>{j.title}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">Upload Resume (PDF)</Label>
                <input ref={fileInputRef} type="file" accept=".pdf,.doc,.docx" onChange={handleFileChange} className="hidden" />
                <button onClick={() => fileInputRef.current?.click()} className={`w-full h-28 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center gap-2 transition-all ${formData.resume ? "border-emerald-400 bg-emerald-50 text-emerald-700" : "border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/50 text-slate-400"}`}>
                  <FileText size={28} />
                  <span className="text-sm font-bold">{formData.resume ? formData.resume.name : "Click to upload resume"}</span>
                  <span className="text-xs">{formData.resume ? "Click to change file" : "PDF, DOC, DOCX accepted"}</span>
                </button>
              </div>
              <div className="flex gap-3 mt-2">
                <Button variant="outline" className="flex-1 h-12 rounded-xl border-slate-200 font-bold" onClick={prevStep}>Back</Button>
                <Button className="flex-[2] bg-emerald-500 hover:bg-emerald-600 h-12 rounded-xl font-black text-white shadow-lg shadow-emerald-500/20 gap-2" onClick={nextStep}>Review Application <ChevronRight size={18} /></Button>
              </div>
            </div>
          )}

          {/* STEP 4: Review */}
          {step === 4 && (
            <div className="space-y-4 animate-in slide-in-from-right duration-300">
              <h2 className="text-xl font-black text-slate-800 flex items-center gap-2"><CheckCircle2 size={20} className="text-emerald-500" /> Review Your Application</h2>
              <Separator />
              <div className="bg-slate-50 rounded-2xl p-5 grid grid-cols-2 gap-4">
                <ReviewItem icon={User}      label="Full Name"       value={`${formData.f_name} ${formData.l_name}`} />
                <ReviewItem icon={User}      label="Age / Gender"    value={`${formData.age} / ${formData.gender}`} />
                <ReviewItem icon={Globe}     label="Email"           value={formData.email} />
                <ReviewItem icon={Globe}     label="Phone"           value={formData.phone} />
                <ReviewItem icon={Globe}     label="City / Province" value={`${formData.current_city}, ${formData.current_province}`} />
                <ReviewItem icon={Globe}     label="Education"       value={formData.education} />
                <ReviewItem icon={Briefcase} label="Position"        value={formData.applied_position} />
                <ReviewItem icon={FileText}  label="Resume"          value={formData.resume?.name} />
              </div>
              <div className="flex gap-4 mt-4">
                <Button variant="outline" className="flex-1 h-12 rounded-xl border-slate-200 text-slate-600 font-bold gap-2" onClick={() => setStep(1)}>
                  <Pencil size={16} /> Edit All
                </Button>
                <Button
                  className="flex-[2] bg-emerald-500 hover:bg-emerald-600 h-12 rounded-xl font-black text-white shadow-lg shadow-emerald-500/20 gap-2"
                  onClick={handleSubmit}
                  disabled={submitting}
                >
                  {submitting ? (
                    <><Loader2 size={18} className="animate-spin" /> Submitting…</>
                  ) : (
                    <>Confirm & Submit Application <ChevronRight size={18} /></>
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* STEP 5: Success */}
          {step === 5 && (
            <div className="text-center space-y-6 py-10 animate-in zoom-in duration-500">
              <div className="w-24 h-24 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center text-5xl mx-auto mb-4">✓</div>
              <h2 className="text-3xl font-black text-slate-800 tracking-tight">Application Submitted!</h2>
              <p className="text-slate-500 max-w-sm mx-auto leading-relaxed">
                Thank you for applying. Our recruitment team will review your profile and reach out via email if you're a good fit.
              </p>
              <Button variant="outline" className="rounded-xl px-8 h-12 font-bold" onClick={() => window.location.reload()}>
                Submit another application
              </Button>
            </div>
          )}

        </CardContent>
      </Card>
    </div>
  );
};

const ReviewItem = ({ icon: Icon, label, value }) => (
  <div className="space-y-1">
    <div className="flex items-center gap-2 text-slate-400">
      <Icon size={14} />
      <span className="text-[10px] font-black uppercase tracking-widest">{label}</span>
    </div>
    <p className="text-sm font-bold text-slate-700 truncate">{value || "Not provided"}</p>
  </div>
);

export default ApplicantHub;  