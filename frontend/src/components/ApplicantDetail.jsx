import React, { useEffect, useState } from "react";
import { api, API_PUBLIC } from '../config/api';
import {
  X, Mail, Briefcase, User, Send, Sparkles, ChevronRight,
  Phone, FileText, Loader2, AlertTriangle, Copy,
  GraduationCap, Radio, Wifi,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import ReactMarkdown from "react-markdown";
import { getFlags } from "../utils/flagUtils";

const HIRING_STAGES = ["Pre-screening", "Screening", "Interview", "Offer", "Accepted", "Rejected"];

const ALLOWED_STAGES = {
  "Pre-screening": new Set(["Pre-screening", "Screening", "Interview", "Offer", "Rejected"]),
  "Screening":     new Set(["Pre-screening", "Screening", "Interview", "Offer", "Rejected"]),
  "Interview":     new Set(["Pre-screening", "Screening", "Interview", "Offer", "Rejected"]),
  "Offer":         new Set(["Interview", "Offer", "Accepted", "Rejected"]),
};

function isStageAllowed(currentStatus, targetStage) {
  const allowed = ALLOWED_STAGES[currentStatus];
  return allowed ? allowed.has(targetStage) : true;
}

const NAVY       = "#1A3C6E";
const TEAL       = "#00AECC";
const TEAL_LIGHT = "#E6F7FB";

// ── Helpers ───────────────────────────────────────────────────────────────────

function getExperienceLabel(resumeScoreJson) {
  const exp = resumeScoreJson?.breakdown?.experience_signals ?? null;
  if (exp === null) return { label: "Unknown",  color: "text-slate-400" };
  if (exp >= 25)   return { label: "Strong",    color: "text-emerald-600" };
  if (exp >= 18)   return { label: "Good",      color: "text-blue-600" };
  if (exp >= 12)   return { label: "Moderate",  color: "text-amber-600" };
  return             { label: "Limited",    color: "text-rose-500" };
}

function getMatchColor(bucket) {
  if (bucket === "Highly Qualified")     return "text-emerald-600";
  if (bucket === "Moderately Qualified") return "text-teal-600";
  if (bucket === "Qualified")            return "text-blue-600";
  if (bucket === "For Review")           return "text-amber-600";
  if (bucket === "Needs Review")         return "text-amber-600";
  return "text-rose-500";
}

function getResumeColor(bucket) {
  if (bucket === "Strong")   return "text-emerald-600";
  if (bucket === "Good")     return "text-blue-600";
  if (bucket === "Moderate") return "text-amber-600";
  return "text-rose-500";
}

function getBucketBadge(bucket) {
  if (bucket === "Highly Qualified")     return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (bucket === "Moderately Qualified") return "bg-teal-50 text-teal-700 border-teal-200";
  if (bucket === "Qualified")            return "bg-blue-50 text-blue-700 border-blue-200";
  if (bucket === "For Review")           return "bg-amber-50 text-amber-700 border-amber-200";
  if (bucket === "Needs Review")         return "bg-amber-50 text-amber-700 border-amber-200";
  return "bg-rose-50 text-rose-600 border-rose-200";
}

// ── Sub-components ────────────────────────────────────────────────────────────

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

const Bar = ({ label, value, max = 1, color }) => {
  const pct     = max === 1 ? Math.round((value ?? 0) * 100) : Math.round(((value ?? 0) / max) * 100);
  const display = max === 1 ? `${pct}%` : `${value ?? 0}/${max}`;
  return (
    <div>
      <div className="flex justify-between text-xs text-slate-500 mb-1">
        <span>{label}</span>
        <span className="font-bold">{display}</span>
      </div>
      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, background: color || NAVY }}
        />
      </div>
    </div>
  );
};

// ── Role Suggestions ──────────────────────────────────────────────────────────

const RoleSuggestions = ({ applicantId }) => {
  const [loading,     setLoading]     = useState(true);
  const [suggestions, setSuggestions] = useState([]);
  const [error,       setError]       = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await api.get(`/applicants/${applicantId}/role-suggestions`);
        if (!cancelled) setSuggestions(res.data.suggestions || []);
      } catch {
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
  if (!suggestions.length) return <p className="text-xs text-slate-400 py-2">No open jobs with descriptions to compare against.</p>;

  return (
    <div className="space-y-2 mt-1">
      {suggestions.map(s => (
        <div
          key={s.job_id}
          className="flex items-center justify-between p-3 rounded-xl border"
          style={s.is_applied_position
            ? { borderColor: `${TEAL}50`, background: TEAL_LIGHT }
            : { borderColor: '#F1F5F9', background: '#fff' }
          }
        >
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-xs font-bold text-slate-800 truncate">{s.title}</p>
              {s.is_applied_position && (
                <span className="text-[9px] font-black uppercase tracking-wide px-1.5 py-0.5 rounded-full shrink-0" style={{ background: TEAL_LIGHT, color: NAVY }}>
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

// ── Breakdown Modal ───────────────────────────────────────────────────────────

const BreakdownModal = ({ applicant, onClose }) => {
  const match  = applicant.ai_job_match_json;
  const resume = applicant.ai_resume_score_json;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[200] flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-3xl w-full max-w-lg shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 max-h-[88vh]"
        onClick={e => e.stopPropagation()}
      >
        <div
          className="flex items-center justify-between px-7 pt-5 pb-4 shrink-0 text-white"
          style={{ background: `linear-gradient(135deg, ${NAVY} 0%, ${TEAL} 100%)` }}
        >
          <div>
            <p className="text-[10px] font-black text-white/60 uppercase tracking-widest">Score Breakdown</p>
            <p className="text-base font-bold mt-0.5">{applicant.f_name} {applicant.l_name}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-white/20 transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="overflow-y-auto px-7 py-5 space-y-6">
          {resume && (
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">
                Resume Quality — {Math.round(applicant.ai_resume_score ?? 0)}/100
              </p>
              <div className="space-y-2.5">
                <Bar label="Structure"            value={resume.breakdown?.structure}          max={30} color={TEAL} />
                <Bar label="Experience Signals"   value={resume.breakdown?.experience_signals} max={30} color={TEAL} />
                <Bar label="Impact & Achievement" value={resume.breakdown?.impact_signals}     max={25} color={TEAL} />
                <Bar label="Writing Clarity"      value={resume.breakdown?.clarity}            max={15} color={TEAL} />
              </div>
            </div>
          )}

          {match ? (
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">
                Job Match — {Math.round(applicant.ai_job_match_score ?? 0)}/100
              </p>
              <div className="space-y-2.5 mb-4">
                <Bar label="Keyword Coverage"    value={match.breakdown?.keyword_coverage}   color={NAVY} />
                <Bar label="Semantic Similarity" value={match.breakdown?.semantic_similarity} color={NAVY} />
                <Bar label="Experience Fit"      value={match.breakdown?.experience_ratio}    color={NAVY} />
              </div>
              {(match.must_haves?.matched?.length > 0 || match.must_haves?.missing?.length > 0) && (
                <div className="space-y-2">
                  {match.must_haves.matched?.length > 0 && (
                    <div className="p-3 rounded-xl" style={{ background: TEAL_LIGHT }}>
                      <p className="text-[10px] font-black uppercase tracking-wide mb-1" style={{ color: NAVY }}>✓ Matched Keywords</p>
                      <p className="text-xs leading-relaxed" style={{ color: NAVY }}>{match.must_haves.matched.join(", ")}</p>
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

          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Role Fit Across All Open Positions</p>
            <p className="text-[10px] text-slate-400 mb-3">Ranked by resume match against each open job description.</p>
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



// ── AI Match Insights ─────────────────────────────────────────────────────────

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

  const expData           = getExperienceLabel(applicant.ai_resume_score_json);
  const resumeColor       = getResumeColor(applicant.ai_resume_bucket);
  const matchColor        = getMatchColor(applicant.ai_job_match_bucket);
  const recommendedTitle  = topRole?.title ?? applicant.applied_position ?? "—";
  const recommendedScore  = topRole?.score != null ? Math.round(topRole.score) : null;
  const recommendedBucket = topRole?.bucket ?? null;
  const recColor          = recommendedBucket ? getMatchColor(recommendedBucket) : "text-slate-600";
  const isBestFitDiff     = topRole && topRole.title !== applicant.applied_position;

  return (
    <>
      <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-4 divide-y divide-slate-100">
          <InsightRow label="Resume Score" value={hasResumeScore ? `${Math.round(applicant.ai_resume_score)}/100` : "—"} valueColor={hasResumeScore ? resumeColor : "text-slate-400"} subtext={applicant.ai_resume_bucket ?? undefined} />
          <InsightRow label="Experience"   value={expData.label} valueColor={expData.color} />
          <InsightRow label="Match Score"  value={hasJobMatch ? `${Math.round(applicant.ai_job_match_score)}/100` : "N/A"} valueColor={hasJobMatch ? matchColor : "text-slate-400"} subtext={hasJobMatch ? (applicant.ai_job_match_bucket ?? undefined) : "No job description set"} />
          <InsightRow
            label="Recommended Role"
            value={recommendedTitle}
            valueColor={recColor}
            subtext={recommendedScore !== null ? `${recommendedScore}% match${isBestFitDiff ? " · Better fit than applied role" : ""}` : "See breakdown for all role comparisons"}
          />
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="w-full flex items-center justify-center gap-1.5 py-3 text-xs font-bold hover:bg-slate-50 transition-colors border-t border-slate-100"
          style={{ color: TEAL }}
        >
          See Score Breakdown &amp; Role Comparisons
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>
      {showModal && <BreakdownModal applicant={applicant} onClose={() => setShowModal(false)} />}
    </>
  );
};

// ── Main Component ────────────────────────────────────────────────────────────

const ApplicantDetail = ({ applicantId, jobs = [], onClose, onRefresh, flagMap = new Map() }) => {
  const [applicant,        setApplicant]        = useState(null);
  const [loading,          setLoading]          = useState(true);
  const [error,            setError]            = useState(false); // ← was missing
  const [saving,           setSaving]           = useState(false);
  const [selectedStatus,   setSelectedStatus]   = useState("");
  const [rerunning,        setRerunning]        = useState(false);
  const [topRole,          setTopRole]          = useState(null);
  const [recruiterNotes,   setRecruiterNotes]   = useState("");
  const [endorsedPosition, setEndorsedPosition] = useState("");
  const [savingNotes,      setSavingNotes]      = useState(false);
  const [notesSaved,       setNotesSaved]       = useState(false);
  const [showEndorsedRequiredModal, setShowEndorsedRequiredModal] = useState(false);
  const [cvText,             setCvText]             = useState(null);
  const [cvLoading,          setCvLoading]          = useState(false);

  const fetchApplicant = async () => {
    if (!applicantId) return;
    setLoading(true);
    try {
      setError(false); // ← inside try, safe to call now
      const res = await api.get(`/applicants/${applicantId}`);
      setApplicant(res.data);
      setSelectedStatus(res.data.hiring_status || "Pre-screening");
      setRecruiterNotes(res.data.recruiter_notes || "");
      setEndorsedPosition(res.data.endorsed_position || "");

      const rec = res.data.ai_recommended_role;
      if (rec) {
        setTopRole({ title: rec, score: null, bucket: null });
      } else {
        // Non-blocking — role suggestions are optional
        api.get(`/applicants/${applicantId}/role-suggestions`)
          .then(r => { const s = r.data.suggestions || []; if (s.length > 0) setTopRole(s[0]); })
          .catch(() => {});
      }
    } catch (err) {
      console.error('fetchApplicant failed:', err);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchApplicant(); }, [applicantId]);

  useEffect(() => {
    if (!applicant || applicant.resume_input_type !== "manual_cv") { setCvText(null); return; }
    let cancelled = false;
    (async () => {
      try {
        setCvLoading(true);
        const res = await api.get(`/applicants/${applicantId}/resume`, { responseType: "text" });
        if (!cancelled) setCvText(typeof res.data === "string" ? res.data : String(res.data));
      } catch {
        if (!cancelled) setCvText(null);
      } finally {
        if (!cancelled) setCvLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [applicant?.resume_input_type, applicantId]);

  const handleSaveNotes = async () => {
    try {
      setSavingNotes(true); setNotesSaved(false);
      await api.patch(`/applicants/${applicantId}/notes`, {
        recruiter_notes:   recruiterNotes,
        endorsed_position: endorsedPosition,
      });
      setNotesSaved(true);
      setTimeout(() => setNotesSaved(false), 2500);
    } catch (err) { console.error(err); }
    finally { setSavingNotes(false); }
  };

  const handleConfirmMove = async () => {
     if (
      applicant.hiring_status === 'Offer' &&
      (selectedStatus === 'Accepted' || selectedStatus === 'Rejected') &&
     (!endorsedPosition.trim() || endorsedPosition === '__none__')
    ) {
    setShowEndorsedRequiredModal(true);
    return;
  }
   try {
    setSaving(true);
    await api.patch(`/applicants/${applicantId}`, { hiring_status: selectedStatus });
    await fetchApplicant();
    if (onRefresh) onRefresh();
    } catch (err) { 
    console.error(err); 
   } finally { 
    setSaving(false); 
    }
  };

  const handleRunPrescreen = async () => {
    try {
      setRerunning(true);
      await api.post(`/applicants/${applicantId}/prescreen`);
      await fetchApplicant();
    } catch (err) { console.error(err); }
    finally { setRerunning(false); }
  };

  const handleViewResume = () => {
    window.open(`${API_PUBLIC}/api/admin/applicants/${applicantId}/resume`, "_blank");
  };

  if (loading) return <div className="p-8 text-center text-slate-500">Loading candidate…</div>;
  if (error)   return (
    <div className="p-8 text-center space-y-3">
      <p className="text-rose-400 text-sm font-semibold">Failed to load candidate.</p>
      <button
        onClick={fetchApplicant}
        className="text-xs font-bold px-4 py-2 rounded-xl text-white transition-all"
        style={{ background: NAVY }}
      >
        Try Again
      </button>
    </div>
  );
  if (!applicant) return null;

  const hasChanged = selectedStatus !== applicant.hiring_status;
  const flags      = getFlags(flagMap, applicantId);
  const hasAnyFlag = flags.isDuplicate || flags.isIncomplete;

  return (
    <Card className="h-full w-full rounded-none border-0 shadow-none bg-white overflow-y-auto">

      <CardHeader
        className="flex flex-row items-center justify-between pb-5 shrink-0 text-white"
        style={{ background: `linear-gradient(135deg, ${NAVY} 0%, ${TEAL} 100%)` }}
      >
        <div className="space-y-0.5">
          <CardTitle className="text-base font-black text-white">Candidate Profile</CardTitle>
          <p className="text-[10px] text-white/60 font-bold uppercase tracking-wider">ID: #{applicantId}</p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="rounded-full hover:bg-white/20 text-white"
        >
          <X className="h-5 w-5" />
        </Button>
      </CardHeader>

      <CardContent className="space-y-8 pt-6 pb-10">

        {hasAnyFlag && (
          <div className="p-4 rounded-xl border border-amber-200 bg-amber-50 space-y-2">
            <p className="text-[10px] font-black text-amber-700 uppercase tracking-widest flex items-center gap-1.5">
              <AlertTriangle size={11} /> Flags Requiring Review
            </p>
            <ul className="space-y-1.5">
              {flags.reasons.map((reason, i) => (
                <li key={i} className="flex items-start gap-1.5 text-xs text-amber-700">
                  <span className="mt-0.5 shrink-0 opacity-70">
                    {reason.toLowerCase().startsWith("duplicate") ? <Copy size={10} /> : "•"}
                  </span>
                  {reason}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="space-y-5">
          <DetailItem label="Full Name"        value={`${applicant.f_name} ${applicant.l_name}`}  icon={<User          className="h-4 w-4" style={{ color: TEAL }} />} />
          <DetailItem label="Email Address"    value={applicant.email}                             icon={<Mail          className="h-4 w-4" style={{ color: TEAL }} />} />
          <DetailItem label="Phone Number"     value={applicant.phone}                             icon={<Phone         className="h-4 w-4" style={{ color: TEAL }} />} />
          <DetailItem label="Applied Position" value={applicant.applied_position}                  icon={<Briefcase     className="h-4 w-4" style={{ color: TEAL }} />} />
          {applicant.education       && <DetailItem label="Highest Education" value={applicant.education}       icon={<GraduationCap className="h-4 w-4" style={{ color: TEAL }} />} />}
          {applicant.app_source      && <DetailItem label="How Did You Hear?" value={applicant.app_source}      icon={<Radio         className="h-4 w-4" style={{ color: TEAL }} />} />}
          {applicant.stable_internet && <DetailItem label="Stable Internet"   value={applicant.stable_internet} icon={<Wifi          className="h-4 w-4" style={{ color: TEAL }} />} />}
          {applicant.resume_input_type === "manual_cv" ? (
            <div className="space-y-2">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Application Letter</h3>
              {cvLoading ? (
                <div className="flex items-center gap-2 py-3 text-slate-400 text-xs">
                  <Loader2 size={13} className="animate-spin" /> Loading application letter…
                </div>
              ) : cvText ? (
                <div className="p-4 bg-white border border-slate-100 rounded-xl shadow-sm text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                  {cvText}
                </div>
              ) : (
                <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl">
                  <p className="text-sm text-slate-500">Could not load application letter.</p>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={handleViewResume}
              className="flex items-center gap-2 text-sm font-bold hover:underline transition-colors"
              style={{ color: TEAL }}
            >
              <FileText className="h-4 w-4" /> View Resume
            </button>
          )}
        </div>

        <Separator />

        <div className="space-y-4">
          <button
            onClick={handleRunPrescreen}
            disabled={rerunning}
            className="w-full h-12 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-60"
          >
            <Sparkles size={16} />
            {rerunning ? "Running…" : "Rerun Prescreen"}
          </button>
        </div>

        <Separator />

        <div className="space-y-2">
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">IntelliHire AI Prescreening Summary</h3>
          {typeof applicant?.ai_prescreening_summary === "string" && applicant.ai_prescreening_summary.trim().length > 0 ? (
            <div className="p-4 bg-white border border-slate-100 rounded-xl shadow-sm leading-relaxed">
              <ReactMarkdown>{applicant.ai_prescreening_summary}</ReactMarkdown>
            </div>
          ) : (
            <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl">
              <p className="text-sm text-slate-500">No prescreening summary yet.</p>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">IntelliHire AI Match Insights</h3>
          <AIMatchInsights applicant={applicant} topRole={topRole} />
        </div>

        <Separator />

        <div className="space-y-4">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Change Hiring Stage</label>
          <Select value={selectedStatus} onValueChange={setSelectedStatus}>
            <SelectTrigger className="w-full h-12 border-2 border-slate-100 bg-slate-50 font-bold" style={{ color: NAVY }}>
              <SelectValue placeholder="Select stage…" />
            </SelectTrigger>
            <SelectContent className="bg-white border border-slate-200 rounded-xl shadow-xl z-[200]" position="popper" sideOffset={5}>
              {HIRING_STAGES.map(s => (
                <SelectItem key={s} value={s} disabled={!isStageAllowed(applicant.hiring_status, s)}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {hasChanged && (
            <button
              onClick={handleConfirmMove}
              disabled={saving}
              className="w-full h-12 rounded-xl text-white font-bold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-60 animate-in slide-in-from-bottom-2"
              style={{ background: `linear-gradient(135deg, ${NAVY} 0%, ${TEAL} 100%)` }}
            >
              {saving ? "Updating…" : <><Send className="h-4 w-4" />Confirm Change to {selectedStatus}</>}
            </button>
          )}
        </div>

        <div className="space-y-3">
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Recruiter Notes</h3>
          <textarea
            rows={5}
            value={recruiterNotes}
            onChange={e => { setRecruiterNotes(e.target.value); setNotesSaved(false); }}
            placeholder="Add internal notes about this candidate — interview impressions, concerns, follow-ups..."
            className="w-full bg-slate-50 border-2 border-transparent rounded-xl px-4 py-3 text-sm text-slate-700 placeholder:text-slate-300 outline-none resize-none transition-all leading-relaxed"
            onFocus={e => e.target.style.borderColor = TEAL}
            onBlur={e  => e.target.style.borderColor = 'transparent'}
          />

          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest pt-1">
            Final Endorsed Position
          </h3>
          <Select
            value={endorsedPosition || "__none__"}
            onValueChange={v => setEndorsedPosition(v === "__none__" ? "" : v)}
          >
            <SelectTrigger
              className="w-full h-12 border-2 border-slate-100 bg-slate-50 font-bold"
              style={{ color: NAVY }}
            >
              <SelectValue placeholder="Select active position…" />
            </SelectTrigger>
            <SelectContent
              className="bg-white border border-slate-200 rounded-xl shadow-xl z-[200]"
              position="popper"
              sideOffset={5}
            >
              <SelectItem value="__none__">— None —</SelectItem>
              {jobs
                .filter(j => j.status === 'Open')
                .map(j => (
                  <SelectItem key={j.id} value={j.title}>{j.title}</SelectItem>
                ))
              }
            </SelectContent>
          </Select>

          <div className="space-y-3 pt-2">
            <p className="text-[10px] text-slate-400 italic">
              Saved together with recruiter notes.
            </p>
            <button
              onClick={handleSaveNotes}
              disabled={savingNotes}
              className="w-full py-3 rounded-xl text-white text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-60 flex items-center justify-center gap-2"
              style={{ background: `linear-gradient(135deg, ${NAVY} 0%, ${TEAL} 100%)` }}
            >
              {savingNotes ? (
                <>
                  <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                  Saving…
                </>
              ) : notesSaved ? "✓ Notes Saved" : "Save Notes"}
            </button>
          </div>

          {showEndorsedRequiredModal && (
            <div
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[300] flex items-center justify-center p-4"
              onClick={() => setShowEndorsedRequiredModal(false)}
            >
              <div
                className="bg-white rounded-3xl w-full max-w-sm shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
                onClick={e => e.stopPropagation()}
              >
                <div className="p-6 text-center">
                  <p className="text-sm font-bold text-rose-600 uppercase mb-2">Final Endorsed Position Required</p>
                  <p className="text-xs text-slate-600 mb-4">
                    You must select a Final Endorsed Position before moving this applicant to Accepted or Rejected.
                  </p>
                  <button
                    onClick={() => setShowEndorsedRequiredModal(false)}
                    className="px-4 py-2 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-bold text-xs transition-colors"
                  >
                    OK
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

      </CardContent>
    </Card>
  );
};

export default ApplicantDetail;