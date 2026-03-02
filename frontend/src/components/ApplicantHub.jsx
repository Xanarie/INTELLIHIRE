import React, { useState, useRef, useEffect } from "react";
import { useLocation } from "react-router-dom";
import axios from "axios";
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

const API_BASE_URL = "http://localhost:8000";

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
    axios.get(`${API_BASE_URL}/api/applicants/jobs`)
      .then(r => setAvailableJobs(r.data))
      .catch(console.error);
  }, []);

  const nextStep = () => setStep((s) => s + 1);
  const prevStep = () => setStep((s) => s - 1);

  const handleChange = (e) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  // Phone: strip any non-digit character before storing
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
      await axios.post(`${API_BASE_URL}/api/applicants/`, data, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setStep(5);
    } catch (err) {
      alert("Submission failed. Please check all fields.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4 py-10">
      <Card className="w-full max-w-2xl shadow-2xl border-none rounded-[2rem] overflow-hidden">
        <CardHeader className="bg-white pb-8 pt-10 text-center">
          {step < 5 && (
            <>
              <CardTitle className="text-2xl font-black text-slate-800 tracking-tight">
                {step === 1 && "Basic Information"}
                {step === 2 && "Application Source"}
                {step === 3 && "Position Selection"}
                {step === 4 && "Review Application"}
              </CardTitle>
              <div className="flex justify-center gap-2 mt-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className={`h-1.5 w-12 rounded-full transition-all duration-500 ${step >= i ? "bg-emerald-500" : "bg-slate-100"}`} />
                ))}
              </div>
            </>
          )}
        </CardHeader>

        <CardContent className="p-10 pt-0 space-y-8">

          {/* STEP 1 */}
          {step === 1 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>First Name</Label>
                  <Input name="f_name" placeholder="Enter first name" onChange={handleChange} value={formData.f_name} />
                </div>
                <div className="space-y-2">
                  <Label>Last Name</Label>
                  <Input name="l_name" placeholder="Enter last name" onChange={handleChange} value={formData.l_name} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Age</Label>
                  <Input name="age" type="number" placeholder="Enter age" onChange={handleChange} value={formData.age} />
                </div>
                <div className="space-y-2">
                  <Label>Email Address</Label>
                  <Input name="email" type="email" placeholder="email@example.com" onChange={handleChange} value={formData.email} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Contact Number</Label>
                  <Input
                    name="phone"
                    type="tel"
                    inputMode="numeric"
                    placeholder="09XXXXXXXXX"
                    onChange={handlePhoneChange}
                    value={formData.phone}
                    maxLength={11}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Highest Educational Attainment</Label>
                  <Select onValueChange={(v) => setFormData({ ...formData, education: v })} value={formData.education}>
                    <SelectTrigger><SelectValue placeholder="Select education level" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="High School Graduate">High School Graduate</SelectItem>
                      <SelectItem value="College Undergraduate">College Undergraduate</SelectItem>
                      <SelectItem value="Bachelor's Degree">Bachelor's Degree</SelectItem>
                      <SelectItem value="Master's Degree">Master's Degree</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Current City</Label>
                  <Input name="current_city" placeholder="e.g. Cebu City" onChange={handleChange} value={formData.current_city} />
                </div>
                <div className="space-y-2">
                  <Label>Current Province</Label>
                  <Input name="current_province" placeholder="e.g. Cebu" onChange={handleChange} value={formData.current_province} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Complete Home Address</Label>
                <Input name="home_address" placeholder="Unit/Street/Barangay" onChange={handleChange} value={formData.home_address} />
              </div>
              <div className="space-y-3">
                <Label>Gender</Label>
                <RadioGroup value={formData.gender} onValueChange={(v) => setFormData({ ...formData, gender: v })} className="flex gap-6">
                  <div className="flex items-center space-x-2"><RadioGroupItem value="Male" id="m" /><Label htmlFor="m" className="font-normal">Male</Label></div>
                  <div className="flex items-center space-x-2"><RadioGroupItem value="Female" id="f" /><Label htmlFor="f" className="font-normal">Female</Label></div>
                </RadioGroup>
              </div>
              <Button className="w-full bg-emerald-500 hover:bg-emerald-600 h-12 rounded-xl text-lg font-bold" onClick={nextStep}>
                Next Step
              </Button>
            </div>
          )}

          {/* STEP 2 */}
          {step === 2 && (
            <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
              <div className="space-y-4">
                <Label className="text-lg font-bold">Application Source</Label>
                <div className="space-y-2">
                  <Label className="text-slate-500">How did you find this job posting?</Label>
                  <Select onValueChange={(v) => setFormData({ ...formData, app_source: v })} value={formData.app_source}>
                    <SelectTrigger><SelectValue placeholder="Select source" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Facebook">Facebook</SelectItem>
                      <SelectItem value="LinkedIn">LinkedIn</SelectItem>
                      <SelectItem value="Indeed">Indeed</SelectItem>
                      <SelectItem value="Company Website">Company Website</SelectItem>
                      <SelectItem value="Referral">Referral</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Separator />
              <div className="space-y-6">
                <Label className="text-lg font-bold">Internet Capability</Label>
                <div className="space-y-3">
                  <Label className="text-slate-500">Do you have a stable home internet?</Label>
                  <RadioGroup value={formData.stable_internet} onValueChange={(v) => setFormData({ ...formData, stable_internet: v })} className="flex gap-6">
                    <div className="flex items-center space-x-2"><RadioGroupItem value="Yes" id="iy" /><Label htmlFor="iy" className="font-normal">Yes</Label></div>
                    <div className="flex items-center space-x-2"><RadioGroupItem value="No" id="in" /><Label htmlFor="in" className="font-normal">No</Label></div>
                  </RadioGroup>
                </div>
                {formData.stable_internet === "Yes" && (
                  <div className="space-y-2 animate-in zoom-in-95 duration-300">
                    <Label>Internet Provider</Label>
                    <Select onValueChange={(v) => setFormData({ ...formData, isp: v })} value={formData.isp}>
                      <SelectTrigger><SelectValue placeholder="Choose Provider" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Converge">Converge</SelectItem>
                        <SelectItem value="PLDT">PLDT</SelectItem>
                        <SelectItem value="Globe">Globe</SelectItem>
                        <SelectItem value="Starlink">Starlink</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
              <div className="flex gap-4">
                <Button variant="outline" className="flex-1 h-12 rounded-xl" onClick={prevStep}>Previous</Button>
                <Button className="flex-[2] bg-emerald-500 hover:bg-emerald-600 h-12 rounded-xl font-bold" onClick={nextStep}>Next Step</Button>
              </div>
            </div>
          )}

          {/* STEP 3 */}
          {step === 3 && (
            <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
              <div className="space-y-4">
                <Label className="text-lg font-bold">Position Selection</Label>
                <div className="space-y-2">
                  <Label className="text-slate-500">What position are you applying for?</Label>
                  <Select onValueChange={(v) => setFormData({ ...formData, applied_position: v })} value={formData.applied_position}>
                    <SelectTrigger><SelectValue placeholder="Select desired role" /></SelectTrigger>
                    <SelectContent>
                      {availableJobs.length > 0
                        ? availableJobs.map((job) => (
                          <SelectItem key={job.id} value={job.title}>{job.title}</SelectItem>
                        ))
                        : <SelectItem disabled value="none">No positions currently open</SelectItem>
                      }
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Separator />
              <div className="space-y-4">
                <Label className="text-lg font-bold">Resume Upload</Label>
                <div
                  onClick={() => fileInputRef.current.click()}
                  className="border-2 border-dashed border-slate-200 rounded-[1.5rem] p-10 text-center cursor-pointer hover:border-emerald-500 hover:bg-emerald-50/30 transition-all group"
                >
                  <input hidden ref={fileInputRef} type="file" accept=".pdf" onChange={handleFileChange} />
                  <FileText className="mx-auto h-10 w-10 text-slate-300 group-hover:text-emerald-500 group-hover:scale-110 transition-all mb-2" />
                  <p className="text-sm font-medium text-slate-600">
                    {formData.resume ? formData.resume.name : "Click to select your Resume (PDF)"}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">Maximum file size: 5MB</p>
                </div>
              </div>
              <div className="flex gap-4">
                <Button variant="outline" className="flex-1 h-12 rounded-xl" onClick={prevStep}>Previous</Button>
                <Button className="flex-[2] bg-emerald-500 hover:bg-emerald-600 h-12 rounded-xl font-bold" onClick={nextStep}>Review Application</Button>
              </div>
            </div>
          )}

          {/* STEP 4: REVIEW */}
          {step === 4 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
              <div className="bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100/50 flex items-center gap-3">
                <div className="bg-emerald-500 rounded-full p-1 text-white"><CheckCircle2 size={16} /></div>
                <p className="text-xs text-emerald-800 font-medium">Almost there! Please review your details before submitting.</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-8 bg-white border border-slate-100 p-6 rounded-[1.5rem] shadow-sm">
                <ReviewItem icon={User} label="Full Name" value={`${formData.f_name} ${formData.l_name}`} />
                <ReviewItem icon={Globe} label="Email Address" value={formData.email} />
                <ReviewItem icon={Briefcase} label="Applied Position" value={formData.applied_position} />
                <ReviewItem icon={Globe} label="Education" value={formData.education} />
                <ReviewItem icon={Globe} label="Internet" value={`${formData.stable_internet} (${formData.isp || 'N/A'})`} />
                <ReviewItem icon={FileText} label="Resume" value={formData.resume?.name} />
              </div>
              <div className="flex gap-4 mt-4">
                <Button variant="outline" className="flex-1 h-12 rounded-xl border-slate-200 text-slate-600 font-bold gap-2" onClick={() => setStep(1)}>
                  <Pencil size={16} /> Edit All
                </Button>
                <Button
                  disabled={submitting}
                  className="flex-[2] bg-emerald-500 hover:bg-emerald-600 h-12 rounded-xl font-black text-white shadow-lg shadow-emerald-500/20 gap-2 disabled:opacity-70"
                  onClick={handleSubmit}
                >
                  {submitting ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      Submitting…
                    </>
                  ) : (
                    <>
                      Confirm & Submit Application <ChevronRight size={18} />
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* STEP 5: SUCCESS */}
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