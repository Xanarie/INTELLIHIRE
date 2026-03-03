import React, { useEffect, useState } from "react";
import axios from "axios";
<<<<<<< HEAD
import {
  X, Mail, Briefcase, User, Send, Sparkles, ChevronRight,
  Phone, FileText, Loader2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import ReactMarkdown from "react-markdown";
=======
import { X, Mail, Briefcase, User, Send } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
>>>>>>> 05ef615b6d098f2c2a9b43995a0643c6bbcd19a2

const API_BASE_URL = "http://localhost:8000/api/admin";

const HIRING_STAGES = [
<<<<<<< HEAD
  "Pre-screening", "Screening", "Interview", "Offer", "Hired", "Rejected",
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getExperienceLabel(resumeScoreJson) {
  const exp = resumeScoreJson?.breakdown?.experience_signals ?? null;
  if (exp === null) return { label: "Unknown",  color: "text-slate-400" };
  if (exp >= 25)   return { label: "Strong",    color: "text-emerald-600" };
  if (exp >= 18)   return { label: "Good",      color: "text-blue-600" };
  if (exp >= 12)   return { label: "Moderate",  color: "text-amber-600" };
  return             { label: "Limited",    color: "text-rose-500" };
}

function getMatchColor(bucket) {
  if (bucket === "Highly Qualified") return "text-emerald-600";
  if (bucket === "Qualified")        return "text-blue-600";
  if (bucket === "Needs Review")     return "text-amber-600";
  return "text-rose-500";
}

function getResumeColor(bucket) {
  if (bucket === "Strong")   return "text-emerald-600";
  if (bucket === "Moderate") return "text-amber-600";
  return "text-rose-500";
}

function getBucketBadge(bucket) {
  if (bucket === "Highly Qualified") return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (bucket === "Qualified")        return "bg-blue-50 text-blue-700 border-blue-200";
  if (bucket === "Needs Review")     return "bg-amber-50 text-amber-700 border-amber-200";
  return "bg-rose-50 text-rose-600 border-rose-200";
}

// ─── Sub-components ───────────────────────────────────────────────────────────

const DetailItem = ({ label, value, icon }) => (
  <div className="flex items-start gap-3">
    <div className="mt-0.5 shrink-0">{icon}</div>
    <div>
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">{label}</p>
      <p className="text-sm font-semibold text-slate-800">{value || "—"}</p>
    </div>
  </div>
);

const InsightRow = ({ label, value, valueColor = "text-slate-800", subtext }) => (
  <div className="flex items-center justify-between py-3 border-b border-slate-100 last:border-0">
    <span className="text-sm text-slate-500 font-medium">{label}</span>
    <div className="text-right">
      <span className={`text-sm font-black ${valueColor}`}>{value}</span>
      {subtext && <p className="text-[10px] text-slate-400 mt-0.5">{subtext}</p>}
    </div>
  </div>
);

// ─── Score bar ────────────────────────────────────────────────────────────────

const Bar = ({ label, value, max = 1, color = "bg-[#2A5C9A]" }) => {
  const pct = max === 1
    ? Math.round((value ?? 0) * 100)
    : Math.round(((value ?? 0) / max) * 100);
  const display = max === 1 ? `${pct}%` : `${value ?? 0}/${max}`;
  return (
    <div>
      <div className="flex justify-between text-xs text-slate-500 mb-1">
        <span>{label}</span>
        <span className="font-bold">{display}</span>
      </div>
      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
};

// ─── Role Suggestions (inside breakdown modal) ────────────────────────────────

const RoleSuggestions = ({ applicantId }) => {
  const [loading, setLoading] = useState(true);
  const [suggestions, setSuggestions] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await axios.get(`${API_BASE_URL}/applicants/${applicantId}/role-suggestions`);
        if (!cancelled) setSuggestions(res.data.suggestions || []);
      } catch (e) {
        if (!cancelled) setError("Could not load role suggestions.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [applicantId]);

  if (loading) return (
    <div className="flex items-center gap-2 py-3 text-slate-400 text-xs">
      <Loader2 size={13} className="animate-spin" /> Comparing against open roles…
    </div>
  );

  if (error) return <p className="text-xs text-rose-400 py-2">{error}</p>;

  if (!suggestions.length) return (
    <p className="text-xs text-slate-400 py-2">No open jobs with descriptions to compare against.</p>
  );

  return (
    <div className="space-y-2 mt-1">
      {suggestions.map((s) => (
        <div
          key={s.job_id}
          className={`flex items-center justify-between p-3 rounded-xl border ${
            s.is_applied_position
              ? "border-[#2A5C9A]/30 bg-blue-50/50"
              : "border-slate-100 bg-white"
          }`}
        >
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-xs font-bold text-slate-800 truncate">{s.title}</p>
              {s.is_applied_position && (
                <span className="text-[9px] font-black uppercase tracking-wide text-[#2A5C9A] bg-blue-100 px-1.5 py-0.5 rounded-full shrink-0">
                  Applied
                </span>
              )}
              {s.knockout && (
                <span className="text-[9px] font-black uppercase tracking-wide text-rose-500 bg-rose-50 px-1.5 py-0.5 rounded-full shrink-0">
                  ⚠ Knockout
                </span>
              )}
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5">{s.department}</p>
          </div>
          <div className="text-right shrink-0 ml-3">
            <p className={`text-sm font-black ${getMatchColor(s.bucket)}`}>
              {Math.round(s.score)}<span className="text-xs font-normal text-slate-400">/100</span>
            </p>
            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${getBucketBadge(s.bucket)}`}>
              {s.bucket}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
};

// ─── Breakdown Modal ──────────────────────────────────────────────────────────

const BreakdownModal = ({ applicant, onClose }) => {
  const match  = applicant.ai_job_match_json;
  const resume = applicant.ai_resume_score_json;

  return (
    <div
      className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[200] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl w-full max-w-lg shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 max-h-[88vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-7 pt-6 pb-4 border-b border-slate-100 shrink-0">
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Score Breakdown</p>
            <p className="text-base font-bold text-slate-800 mt-0.5">
              {applicant.f_name} {applicant.l_name}
            </p>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-100 transition-colors">
            <X className="h-4 w-4 text-slate-500" />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="overflow-y-auto px-7 py-5 space-y-6">

          {/* Resume Quality */}
          {resume && (
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">
                Resume Quality — {Math.round(applicant.ai_resume_score ?? 0)}/100
              </p>
              <div className="space-y-2.5">
                <Bar label="Structure"  value={resume.breakdown?.structure}          max={30} />
                <Bar label="Experience" value={resume.breakdown?.experience_signals} max={30} />
                <Bar label="Impact"     value={resume.breakdown?.impact_signals}     max={25} />
                <Bar label="Clarity"    value={resume.breakdown?.clarity}            max={15} />
              </div>
              {resume.notes?.length > 0 && (
                <div className="mt-3 space-y-1">
                  {resume.notes.slice(0, 5).map((n, i) => (
                    <p key={i} className="text-[11px] text-slate-500">• {n}</p>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Job Match */}
          {match ? (
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">
                Job Match — {Math.round(applicant.ai_job_match_score ?? 0)}/100
              </p>
              <div className="space-y-2.5 mb-4">
                <Bar label="Keyword Coverage"    value={match.breakdown?.keyword_coverage}    color="bg-emerald-500" />
                <Bar label="Semantic Similarity" value={match.breakdown?.semantic_similarity}  color="bg-emerald-500" />
                <Bar label="Experience Fit"      value={match.breakdown?.experience_ratio}     color="bg-emerald-500" />
              </div>
              {(match.must_haves?.matched?.length > 0 || match.must_haves?.missing?.length > 0) && (
                <div className="space-y-2">
                  {match.must_haves.matched?.length > 0 && (
                    <div className="p-3 bg-emerald-50 rounded-xl">
                      <p className="text-[10px] font-black text-emerald-600 uppercase tracking-wide mb-1">✓ Matched Keywords</p>
                      <p className="text-xs text-emerald-700 leading-relaxed">{match.must_haves.matched.join(", ")}</p>
                    </div>
                  )}
                  {match.must_haves.missing?.length > 0 && (
                    <div className="p-3 bg-rose-50 rounded-xl">
                      <p className="text-[10px] font-black text-rose-500 uppercase tracking-wide mb-1">✗ Missing Keywords</p>
                      <p className="text-xs text-rose-600 leading-relaxed">{match.must_haves.missing.join(", ")}</p>
                    </div>
                  )}
                </div>
              )}
              {match.knockout && (
                <div className="mt-3 p-3 bg-rose-50 border border-rose-200 rounded-xl">
                  <p className="text-xs font-black text-rose-600">⚠ Knockout Flag</p>
                  <p className="text-xs text-rose-500 mt-0.5">Did not meet minimum must-have criteria for this role.</p>
                </div>
              )}
            </div>
          ) : (
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Job Match</p>
              <p className="text-xs text-slate-400">No job description was set when this applicant applied.</p>
            </div>
          )}

          {/* Role Suggestions */}
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
              Role Fit Across All Open Positions
            </p>
            <p className="text-[10px] text-slate-400 mb-3">
              Ranked by how well this candidate's resume matches each open job description.
            </p>
            <RoleSuggestions applicantId={applicant.id} />
          </div>

        </div>

        <div className="px-7 pb-6 pt-3 border-t border-slate-100 shrink-0">
          <button
            onClick={onClose}
            className="w-full h-11 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-bold transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── AI Match Insights (compact 4-row) ────────────────────────────────────────

const AIMatchInsights = ({ applicant, topRole }) => {
  const [showModal, setShowModal] = useState(false);

  const hasResumeScore = applicant.ai_resume_score != null;
  const hasJobMatch    = applicant.ai_job_match_score != null;

  if (!hasResumeScore && !hasJobMatch) {
    return (
      <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl">
        <p className="text-sm text-slate-400 text-center">No AI data yet. Click Rerun Prescreen to generate insights.</p>
      </div>
    );
  }

  const expData     = getExperienceLabel(applicant.ai_resume_score_json);
  const resumeColor = getResumeColor(applicant.ai_resume_bucket);
  const matchColor  = getMatchColor(applicant.ai_job_match_bucket);

  // Recommended role: highest scoring from suggestions, else applied position
  const recommendedTitle  = topRole?.title ?? applicant.applied_position ?? "—";
  const recommendedScore  = topRole ? Math.round(topRole.score) : null;
  const recommendedBucket = topRole?.bucket ?? null;
  const recColor          = recommendedBucket ? getMatchColor(recommendedBucket) : "text-slate-600";
  const isBestFitDiff     = topRole && topRole.title !== applicant.applied_position;

  return (
    <>
      <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-4 divide-y divide-slate-100">
          <InsightRow
            label="Resume Score"
            value={hasResumeScore ? `${Math.round(applicant.ai_resume_score)}/100` : "—"}
            valueColor={hasResumeScore ? resumeColor : "text-slate-400"}
            subtext={applicant.ai_resume_bucket ?? undefined}
          />
          <InsightRow
            label="Match Score"
            value={hasJobMatch ? `${Math.round(applicant.ai_job_match_score)}/100` : "N/A"}
            valueColor={hasJobMatch ? matchColor : "text-slate-400"}
            subtext={hasJobMatch ? (applicant.ai_job_match_bucket ?? undefined) : "No job description set"}
          />
          <InsightRow
            label="Experience"
            value={expData.label}
            valueColor={expData.color}
          />
          <InsightRow
            label="Recommended Role"
            value={recommendedTitle}
            valueColor={recColor}
            subtext={
              recommendedScore !== null
                ? `${recommendedScore}% match${isBestFitDiff ? " · Better fit than applied role" : ""}`
                : "See breakdown for all role comparisons"
            }
          />
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="w-full flex items-center justify-center gap-1.5 py-3 text-xs font-bold text-[#2A5C9A] hover:bg-slate-50 transition-colors border-t border-slate-100"
        >
          See Score Breakdown & Role Comparisons
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>

      {showModal && <BreakdownModal applicant={applicant} onClose={() => setShowModal(false)} />}
    </>
  );
};

// ─── Main Component ────────────────────────────────────────────────────────────

const ApplicantDetail = ({ applicantId, onClose, onRefresh }) => {
  const [applicant, setApplicant]           = useState(null);
  const [loading, setLoading]               = useState(true);
  const [saving, setSaving]                 = useState(false);
  const [selectedStatus, setSelectedStatus] = useState("");
  const [rerunning, setRerunning]           = useState(false);
  const [topRole, setTopRole]               = useState(null); // best matching role from suggestions
  const [recruiterNotes, setRecruiterNotes] = useState("");
  const [savingNotes, setSavingNotes]       = useState(false);
  const [notesSaved, setNotesSaved]         = useState(false);

  const fetchApplicant = async () => {
    if (!applicantId) return;
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE_URL}/applicants/${applicantId}`);
      setApplicant(res.data);
      setSelectedStatus(res.data.hiring_status || "Pre-screening");
      setRecruiterNotes(res.data.recruiter_notes || "");

      // If ai_recommended_role already stored in Firestore (new applicants), use it instantly.
      // For older records that don't have it yet, fall back to the suggestions API.
      const rec = res.data.ai_recommended_role;
      if (rec) {
        setTopRole({ title: rec, score: null, bucket: null });
      } else {
        // Background fallback — doesn't block the panel from rendering
        axios.get(`${API_BASE_URL}/applicants/${applicantId}/role-suggestions`)
          .then(r => {
            const suggestions = r.data.suggestions || [];
            if (suggestions.length > 0) setTopRole(suggestions[0]);
          })
          .catch(() => {}); // silent — not critical
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchApplicant(); }, [applicantId]);

  const handleSaveNotes = async () => {
    try {
      setSavingNotes(true);
      setNotesSaved(false);
      await axios.patch(`${API_BASE_URL}/applicants/${applicantId}/notes`, {
        recruiter_notes: recruiterNotes,
      });
      setNotesSaved(true);
      setTimeout(() => setNotesSaved(false), 2500);
    } catch (err) {
      console.error("Failed to save notes:", err);
    } finally {
      setSavingNotes(false);
    }
  };

  const handleConfirmMove = async () => {
    try {
      setSaving(true);
      await axios.patch(`${API_BASE_URL}/applicants/${applicantId}`, { hiring_status: selectedStatus });
      await onRefresh();
      setApplicant((prev) => ({ ...prev, hiring_status: selectedStatus }));
    } catch (err) {
      console.error("Move failed:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleRunPrescreen = async () => {
    try {
      setRerunning(true);
      await axios.post(`${API_BASE_URL}/applicants/${applicantId}/prescreen`);
      await fetchApplicant();
      await onRefresh();
    } catch (err) {
      console.error("Prescreen failed:", err);
    } finally {
      setRerunning(false);
    }
  };

  const handleViewResume = () => {
    window.open(`${API_BASE_URL}/applicants/${applicantId}/resume`, "_blank");
  };

  if (loading) return <div className="p-8 text-center text-slate-500">Loading candidate…</div>;
=======
  "Pre-screening",
  "Screening",
  "Interview",
  "Offer",
  "Hired",
  "Rejected",
];

const ApplicantDetail = ({ applicantId, onClose, onRefresh }) => {
  const [applicant, setApplicant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState("");

  useEffect(() => {
    if (!applicantId) return;
    setLoading(true);
    axios
      .get(`${API_BASE_URL}/applicants/${applicantId}`)
      .then((res) => {
        setApplicant(res.data);
        setSelectedStatus(res.data.hiring_status || "Pre-screening");
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, [applicantId]);

  const handleConfirmMove = async () => {
    try {
        setSaving(true);
        await axios.patch(`${API_BASE_URL}/applicants/${applicantId}`, {
            hiring_status: selectedStatus,
        });
      
        await onRefresh(); 
      
        setApplicant(prev => ({ ...prev, hiring_status: selectedStatus }));
        
        console.log("Move confirmed, board refreshed.");
    } catch (err) {
        console.error("Move failed:", err);
    } finally {
        setSaving(false);
    }
};

  if (loading) return <div className="p-8 text-center text-slate-500">Loading candidate...</div>;
>>>>>>> 05ef615b6d098f2c2a9b43995a0643c6bbcd19a2
  if (!applicant) return null;

  const hasChanged = selectedStatus !== applicant.hiring_status;

  return (
<<<<<<< HEAD
    // w-[480px] gives the side panel more room without crowding the kanban board
    <Card className="h-full w-full rounded-none border-0 shadow-none bg-white overflow-y-auto">
      <CardHeader className="flex flex-row items-center justify-between bg-slate-50/50 pb-6">
        <div className="space-y-1">
          <CardTitle className="text-xl font-bold text-slate-800">Candidate Profile</CardTitle>
          <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">ID: #{applicantId}</p>
=======
    <Card className="h-full rounded-none border-l shadow-2xl bg-white overflow-y-auto">
      <CardHeader className="flex flex-row items-center justify-between bg-slate-50/50 pb-6">
        <div className="space-y-1">
          <CardTitle className="text-xl font-bold text-slate-800">
            Candidate Profile
          </CardTitle>
          <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">
            ID: #{applicantId}
          </p>
>>>>>>> 05ef615b6d098f2c2a9b43995a0643c6bbcd19a2
        </div>
        <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full hover:bg-slate-200">
          <X className="h-5 w-5 text-slate-500" />
        </Button>
      </CardHeader>

      <CardContent className="space-y-8 pt-6">
<<<<<<< HEAD

        {/* Personal Info */}
        <div className="space-y-5">
          <DetailItem
            label="Full Name"
            value={`${applicant.f_name} ${applicant.l_name}`}
            icon={<User className="h-4 w-4 text-[#2A5C9A]" />}
          />
          <DetailItem
            label="Email Address"
            value={applicant.email}
            icon={<Mail className="h-4 w-4 text-[#2A5C9A]" />}
          />
          <DetailItem
            label="Phone Number"
            value={applicant.phone}
            icon={<Phone className="h-4 w-4 text-[#2A5C9A]" />}
          />
          <DetailItem
            label="Applied Position"
            value={applicant.applied_position}
            icon={<Briefcase className="h-4 w-4 text-[#2A5C9A]" />}
          />

          {/* See Resume */}
          <button
            onClick={handleViewResume}
            className="flex items-center gap-2 text-sm font-bold text-[#2A5C9A] hover:text-[#1e4470] hover:underline transition-colors"
          >
            <FileText className="h-4 w-4" />
            View Resume
          </button>
=======
        {/* READ-ONLY PERSONAL INFORMATION */}
        <div className="space-y-6">
          <DetailItem 
            label="Full Name" 
            value={`${applicant.f_name} ${applicant.l_name}`} 
            icon={<User className="h-4 w-4 text-[#2A5C9A]" />} 
          />
          <DetailItem 
            label="Email Address" 
            value={applicant.email} 
            icon={<Mail className="h-4 w-4 text-[#2A5C9A]" />} 
          />
          <DetailItem 
            label="Applied Position" 
            value={applicant.applied_position} 
            icon={<Briefcase className="h-4 w-4 text-[#2A5C9A]" />} 
          />
>>>>>>> 05ef615b6d098f2c2a9b43995a0643c6bbcd19a2
        </div>

        <Separator />

<<<<<<< HEAD
        {/* Hiring Stage */}
        <div className="space-y-4">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Move to Column</label>
          <Select value={selectedStatus} onValueChange={setSelectedStatus}>
            <SelectTrigger className="w-full h-12 border-2 border-slate-100 bg-slate-50 font-bold text-[#2A5C9A]">
              <SelectValue placeholder="Select stage…" />
            </SelectTrigger>
            <SelectContent className="z-[100]" position="popper" sideOffset={5}>
              {HIRING_STAGES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>

          {hasChanged && (
            <Button
=======
        {/* EDITABLE HIRING STAGE DROPDOWN */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
              Move to Column
            </label>
          </div>
          
          <Select 
            value={selectedStatus} 
            onValueChange={(value) => setSelectedStatus(value)} // Only updates local state
          >
            <SelectTrigger className="w-full h-12 border-2 border-slate-100 bg-slate-50 font-bold text-[#2A5C9A]">
              <SelectValue placeholder="Select stage..." />
            </SelectTrigger>
    
            <SelectContent className="z-[100]" position="popper" sideOffset={5}>
              {HIRING_STAGES.map((stage) => (
                <SelectItem key={stage} value={stage}>
                  {stage}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* NEW CONFIRM BUTTON: Only visible if a change is detected */}
          {hasChanged && (
            <Button 
>>>>>>> 05ef615b6d098f2c2a9b43995a0643c6bbcd19a2
              onClick={handleConfirmMove}
              disabled={saving}
              className="w-full h-12 bg-[#2A5C9A] hover:bg-[#1e4470] text-white font-bold rounded-xl shadow-lg transition-all animate-in slide-in-from-bottom-2"
            >
<<<<<<< HEAD
              {saving ? "Updating…" : <><Send className="mr-2 h-4 w-4" />Confirm Move to {selectedStatus}</>}
            </Button>
          )}

          <Button
            onClick={handleRunPrescreen}
            disabled={rerunning}
            className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-lg flex items-center gap-2"
          >
            <Sparkles size={16} />
            {rerunning ? "Running…" : "Rerun Prescreen"}
          </Button>

          <p className="text-[10px] text-slate-400 italic">
            * Applicant stays in their current column until you click "Confirm Move".
          </p>
        </div>

        <Separator />

        {/* AI Prescreening Summary */}
        <div className="space-y-2">
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
            IntelliHire AI Prescreening Summary
          </h3>
          {typeof applicant?.ai_prescreening_summary === "string" &&
           applicant.ai_prescreening_summary.trim().length > 0 ? (
            <div className="p-4 bg-white border border-slate-100 rounded-xl shadow-sm leading-relaxed">
              <ReactMarkdown>{applicant.ai_prescreening_summary}</ReactMarkdown>
            </div>
          ) : (
            <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl">
              <p className="text-sm text-slate-500">No prescreening summary yet.</p>
            </div>
          )}
        </div>

        {/* AI Match Insights */}
        <div className="space-y-2">
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
            IntelliHire AI Match Insights
          </h3>
          <AIMatchInsights applicant={applicant} topRole={topRole} />
        </div>

        <Separator />

        {/* Recruiter Notes */}
        <div className="space-y-3">
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
            Recruiter Notes
          </h3>
          <textarea
            rows={5}
            value={recruiterNotes}
            onChange={(e) => { setRecruiterNotes(e.target.value); setNotesSaved(false); }}
            placeholder="Add internal notes about this candidate — interview impressions, concerns, follow-ups..."
            className="w-full bg-slate-50 border-2 border-transparent focus:border-[#2A5C9A] rounded-xl px-4 py-3 text-sm text-slate-700 placeholder:text-slate-300 outline-none resize-none transition-all leading-relaxed"
          />
          <button
            onClick={handleSaveNotes}
            disabled={savingNotes}
            className="w-full py-3 rounded-xl bg-[#2A5C9A] text-white text-[10px] font-black uppercase tracking-widest hover:bg-[#1e4470] transition-all disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {savingNotes ? (
              <>
                <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                </svg>
                Saving…
              </>
            ) : notesSaved ? (
              "✓ Notes Saved"
            ) : (
              "Save Notes"
            )}
          </button>
        </div>

=======
              {saving ? (
                "Updating..."
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" /> 
                  Confirm Move to {selectedStatus}
                </>
              )}
            </Button>
          )}
          
          <p className="text-[10px] text-slate-400 italic">
            * Selected applicant will remain in their current column until you click "Confirm Move".
          </p>
        </div>
>>>>>>> 05ef615b6d098f2c2a9b43995a0643c6bbcd19a2
      </CardContent>
    </Card>
  );
};

<<<<<<< HEAD
=======
const DetailItem = ({ label, value, icon }) => (
  <div className="flex flex-col gap-1.5">
    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</span>
    <div className="flex items-center gap-3 p-3 bg-white border border-slate-100 rounded-xl shadow-sm">
      {icon}
      <span className="text-sm font-bold text-slate-700">{value || "N/A"}</span>
    </div>
  </div>
);

>>>>>>> 05ef615b6d098f2c2a9b43995a0643c6bbcd19a2
export default ApplicantDetail;