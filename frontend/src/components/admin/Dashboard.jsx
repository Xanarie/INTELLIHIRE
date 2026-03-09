// frontend/src/components/admin/Dashboard.jsx
// Pure SVG + CSS charts — no recharts dependency required.
import React, { useMemo, useState } from 'react';
import {
  Users, Briefcase, CheckCircle2, Sparkles,
  TrendingUp, Award, Clock, BarChart2,
} from 'lucide-react';

// ── Brand colours ─────────────────────────────────────────────────────────────
const BLUE   = '#2A5C9A';
const GREEN  = '#10B981';
const AMBER  = '#F59E0B';
const ROSE   = '#F43F5E';
const VIOLET = '#7C3AED';
const SLATE  = '#64748B';

const STAGE_ORDER = ['Pre-screening','Screening','Interview','Offer','Hired','Rejected'];
const STAGE_COLORS = {
  'Pre-screening': SLATE,
  'Screening':     BLUE,
  'Interview':     VIOLET,
  'Offer':         AMBER,
  'Hired':         GREEN,
  'Rejected':      ROSE,
};
const BUCKET_COLORS = {
  'Strong':       GREEN,
  'Good':         BLUE,
  'Needs Review': AMBER,
  'Weak':         ROSE,
};
const SOURCE_PALETTE = [BLUE, GREEN, VIOLET, AMBER, ROSE, SLATE, '#06B6D4', '#EC4899'];

// ── Panel wrapper ─────────────────────────────────────────────────────────────
const Panel = ({ title, icon: Icon, children, className = '' }) => (
  <div className={`bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden ${className}`}>
    <div className="flex items-center gap-2.5 px-6 pt-5 pb-4 border-b border-slate-50">
      <Icon size={14} className="text-slate-400" />
      <h2 className="text-xs font-black text-slate-600 uppercase tracking-widest">{title}</h2>
    </div>
    <div className="px-6 py-5">{children}</div>
  </div>
);

// ── Stat card ─────────────────────────────────────────────────────────────────
const StatCard = ({ label, value, sub, color, icon: Icon }) => (
  <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-6 flex items-start gap-4">
    <div className="p-3 rounded-2xl shrink-0" style={{ background: `${color}18` }}>
      <Icon size={20} style={{ color }} />
    </div>
    <div className="min-w-0">
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">{label}</p>
      <h3 className="text-3xl font-black text-slate-800 leading-none">{value}</h3>
      {sub && <p className="text-[11px] text-slate-400 mt-1.5 font-medium">{sub}</p>}
    </div>
  </div>
);

// ── Vertical bar chart (CSS only) ─────────────────────────────────────────────
const VerticalBarChart = ({ data, colorKey }) => {
  const [hovered, setHovered] = useState(null);
  const max = Math.max(...data.map(d => d.count), 1);
  return (
    <div className="flex items-end gap-2 h-44 pt-2">
      {data.map((d, i) => {
        const pct   = Math.round((d.count / max) * 100);
        const color = colorKey ? colorKey[d.stage] : BLUE;
        const isHov = hovered === i;
        return (
          <div
            key={i}
            className="flex-1 flex flex-col items-center gap-1 cursor-default"
            onMouseEnter={() => setHovered(i)}
            onMouseLeave={() => setHovered(null)}
          >
            {/* Count tooltip */}
            <div
              className="text-[10px] font-black px-2 py-0.5 rounded-lg transition-opacity duration-150"
              style={{
                color,
                background: `${color}15`,
                opacity: isHov ? 1 : 0,
              }}
            >
              {d.count}
            </div>
            {/* Bar */}
            <div className="w-full flex items-end" style={{ height: 108 }}>
              <div
                className="w-full rounded-t-lg transition-all duration-500"
                style={{
                  height: `${Math.max(pct, d.count > 0 ? 5 : 0)}%`,
                  background: color,
                  opacity: isHov ? 1 : 0.8,
                }}
              />
            </div>
            {/* Label */}
            <p className="text-[8px] font-bold text-slate-400 text-center leading-tight truncate w-full px-0.5">
              {d.stage}
            </p>
          </div>
        );
      })}
    </div>
  );
};

// ── SVG donut chart ───────────────────────────────────────────────────────────
const DonutChart = ({ data, size = 130 }) => {
  const [hovered, setHovered] = useState(null);
  const cx = size / 2, cy = size / 2;
  const R_OUT = size * 0.37, R_IN = size * 0.23;
  const total = data.reduce((s, d) => s + d.value, 0) || 1;

  const slices = [];
  let cursor = -Math.PI / 2;
  data.forEach((d, i) => {
    const angle = (d.value / total) * 2 * Math.PI;
    if (angle < 0.01) { cursor += angle; return; }
    const exp = hovered === i ? 4 : 0;
    const ro = R_OUT + exp, ri = R_IN - exp / 2;
    const x1 = cx + ro * Math.cos(cursor);
    const y1 = cy + ro * Math.sin(cursor);
    const x2 = cx + ro * Math.cos(cursor + angle);
    const y2 = cy + ro * Math.sin(cursor + angle);
    const xi1 = cx + ri * Math.cos(cursor + angle);
    const yi1 = cy + ri * Math.sin(cursor + angle);
    const xi2 = cx + ri * Math.cos(cursor);
    const yi2 = cy + ri * Math.sin(cursor);
    const lg = angle > Math.PI ? 1 : 0;
    slices.push({
      key: i, fill: d.fill, name: d.name, value: d.value,
      path: `M${x1},${y1} A${ro},${ro} 0 ${lg} 1 ${x2},${y2} L${xi1},${yi1} A${ri},${ri} 0 ${lg} 0 ${xi2},${yi2} Z`,
    });
    cursor += angle;
  });

  const hov = hovered !== null ? data[hovered] : null;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ overflow: 'visible', flexShrink: 0 }}>
      {slices.map(s => (
        <path
          key={s.key}
          d={s.path}
          fill={s.fill}
          opacity={hovered === null || hovered === s.key ? 0.9 : 0.4}
          style={{ cursor: 'default', transition: 'opacity 0.2s, d 0.2s' }}
          onMouseEnter={() => setHovered(s.key)}
          onMouseLeave={() => setHovered(null)}
        />
      ))}
      <text x={cx} y={cy - 6} textAnchor="middle" fontSize="13" fontWeight="800" fill="#1e293b">
        {hov ? hov.value : total}
      </text>
      <text x={cx} y={cy + 8} textAnchor="middle" fontSize="7" fill="#94a3b8" fontWeight="600">
        {hov ? hov.name.slice(0, 10) : 'TOTAL'}
      </text>
    </svg>
  );
};

// ── Horizontal bar row ────────────────────────────────────────────────────────
const HorizontalBar = ({ label, count, max, color = BLUE }) => {
  const pct = max > 0 ? Math.round((count / max) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <p className="text-xs font-bold text-slate-600 w-32 shrink-0 truncate" title={label}>{label}</p>
      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="text-xs font-black text-slate-500 w-5 text-right shrink-0">{count}</span>
    </div>
  );
};

// ── Main dashboard ────────────────────────────────────────────────────────────
const DashboardTab = ({ applicants = [], jobs = [] }) => {

  const stats = useMemo(() => {
    const total       = applicants.length;
    const hired       = applicants.filter(a => (a.hiring_status || '').toLowerCase() === 'hired').length;
    const prescreened = applicants.filter(a => a.ai_resume_score != null).length;
    const openJobs    = jobs.filter(j => j.status === 'Open').length;
    const passRate    = total > 0 ? Math.round((hired / total) * 100) : 0;
    return { total, hired, prescreened, openJobs, passRate };
  }, [applicants, jobs]);

  const pipelineData = useMemo(() => {
    const counts = Object.fromEntries(STAGE_ORDER.map(s => [s, 0]));
    applicants.forEach(a => {
      const s = a.hiring_status || 'Pre-screening';
      if (s in counts) counts[s]++;
      else counts['Pre-screening']++;
    });
    return STAGE_ORDER.map(stage => ({ stage, count: counts[stage] }));
  }, [applicants]);

  const sourceData = useMemo(() => {
    const counts = {};
    applicants.forEach(a => {
      const src = a.app_source || 'Unknown';
      counts[src] = (counts[src] || 0) + 1;
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([name, value], i) => ({ name, value, fill: SOURCE_PALETTE[i % SOURCE_PALETTE.length] }));
  }, [applicants]);

  const positionData = useMemo(() => {
    const counts = {};
    applicants.forEach(a => {
      const pos = a.applied_position || 'Unknown';
      counts[pos] = (counts[pos] || 0) + 1;
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([label, count]) => ({ label, count }));
  }, [applicants]);

  const maxPosition = positionData[0]?.count || 1;

  const bucketData = useMemo(() => {
    const counts = { Strong: 0, Good: 0, 'Needs Review': 0, Weak: 0 };
    applicants.forEach(a => {
      const b = a.ai_resume_bucket;
      if (b && b in counts) counts[b]++;
    });
    return counts;
  }, [applicants]);

  const bucketTotal = Object.values(bucketData).reduce((s, v) => s + v, 0);

  const jobPerformance = useMemo(() =>
    jobs
      .map(job => {
        const count   = applicants.filter(a => a.applied_position === job.title).length;
        const limit   = parseInt(job.applicant_limit, 10) || 50;
        const fillPct = Math.round((count / limit) * 100);
        return { ...job, applicantCount: count, fillPct };
      })
      .sort((a, b) => b.applicantCount - a.applicantCount),
  [jobs, applicants]);

  if (applicants.length === 0 && jobs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-32">
        <BarChart2 size={40} className="mb-4 text-slate-300" />
        <p className="text-sm font-bold text-slate-400">No data yet</p>
        <p className="text-xs text-slate-300 mt-1">Stats will appear once applicants and jobs are added</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 md:gap-4">
        <StatCard label="Total Applicants"  value={stats.total}
          sub="All time" color={BLUE} icon={Users} />
        <StatCard label="Open Positions" value={stats.openJobs}
          sub={`${jobs.length} total jobs`} color={GREEN} icon={Briefcase} />
        <StatCard label="Hired" value={stats.hired}
          sub={`${stats.passRate}% pass-through rate`} color={AMBER} icon={CheckCircle2} />
        <StatCard label="AI Prescreened" value={stats.prescreened}
          sub={`${stats.total > 0 ? Math.round((stats.prescreened / stats.total) * 100) : 0}% of applicants`}
          color={VIOLET} icon={Sparkles} />
      </div>

      {/* Pipeline + Sources */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 md:gap-6">
        <Panel title="Hiring Pipeline" icon={TrendingUp}>
          {pipelineData.every(d => d.count === 0)
            ? <p className="text-xs text-slate-400 text-center py-8">No applicants yet</p>
            : <VerticalBarChart data={pipelineData} colorKey={STAGE_COLORS} />
          }
        </Panel>

        <Panel title="Application Sources" icon={Award}>
          {sourceData.length === 0
            ? <p className="text-xs text-slate-400 text-center py-8">No source data yet</p>
            : (
              <div className="flex flex-col sm:flex-row items-center gap-4 md:gap-6">
                <DonutChart data={sourceData} size={130} />
                <div className="flex-1 space-y-2 min-w-0 w-full">
                  {sourceData.slice(0, 6).map((s, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ background: s.fill }} />
                      <span className="text-[11px] font-bold text-slate-600 truncate flex-1">{s.name}</span>
                      <span className="text-[11px] font-black text-slate-400 shrink-0">{s.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )
          }
        </Panel>
      </div>

      {/* Top Positions + AI Quality */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 md:gap-6">
        <Panel title="Top Applied Positions" icon={BarChart2}>
          {positionData.length === 0
            ? <p className="text-xs text-slate-400 text-center py-8">No position data yet</p>
            : (
              <div className="space-y-3">
                {positionData.map((d, i) => (
                  <HorizontalBar key={i} label={d.label} count={d.count}
                    max={maxPosition} color={SOURCE_PALETTE[i % SOURCE_PALETTE.length]} />
                ))}
              </div>
            )
          }
        </Panel>

        <Panel title="AI Resume Quality" icon={Sparkles}>
          {bucketTotal === 0
            ? <p className="text-xs text-slate-400 text-center py-8">Run prescreen on applicants to see quality data</p>
            : (
              <div className="space-y-3 py-1">
                {['Strong', 'Good', 'Needs Review', 'Weak'].map(bucket => {
                  const count = bucketData[bucket] || 0;
                  const pct   = Math.round((count / bucketTotal) * 100);
                  return (
                    <div key={bucket}>
                      <div className="flex justify-between items-center mb-1.5">
                        <span className="text-xs font-bold text-slate-600">{bucket}</span>
                        <span className="text-xs font-black" style={{ color: BUCKET_COLORS[bucket] }}>
                          {count} <span className="text-slate-400 font-medium">({pct}%)</span>
                        </span>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-700"
                          style={{ width: `${pct}%`, background: BUCKET_COLORS[bucket] }} />
                      </div>
                    </div>
                  );
                })}
                <p className="text-[10px] text-slate-400 pt-2">Based on {bucketTotal} prescreened applicants</p>
              </div>
            )
          }
        </Panel>
      </div>

      {/* Job Performance Table */}
      <Panel title="Job Posting Performance" icon={Clock}>
        {jobPerformance.length === 0
          ? <p className="text-xs text-slate-400 text-center py-8">No jobs created yet</p>
          : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-100">
                    {[['Job Title','left'],['Dept','left'],['Status','left'],['Applicants','right'],['Limit','right'],['Fill Rate','left']].map(([h, align]) => (
                      <th key={h} className={`text-[10px] font-black text-slate-400 uppercase tracking-widest pb-3 pr-4 text-${align}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {jobPerformance.map(job => (
                    <tr key={job.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-3 pr-4 font-bold text-slate-800 truncate max-w-[160px]">{job.title}</td>
                      <td className="py-3 pr-4 text-slate-500">{job.department || '—'}</td>
                      <td className="py-3 pr-4">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-black ${
                          job.status === 'Open'   ? 'bg-emerald-50 text-emerald-600' :
                          job.status === 'Closed' ? 'bg-rose-50 text-rose-500' :
                                                    'bg-slate-100 text-slate-500'
                        }`}>{job.status}</span>
                      </td>
                      <td className="py-3 pr-4 text-right font-black text-slate-700">{job.applicantCount}</td>
                      <td className="py-3 pr-4 text-right text-slate-400">{job.applicant_limit || 50}</td>
                      <td className="py-3">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden min-w-[60px]">
                            <div className="h-full rounded-full transition-all duration-500" style={{
                              width: `${Math.min(job.fillPct, 100)}%`,
                              background: job.fillPct >= 90 ? ROSE : job.fillPct >= 60 ? AMBER : GREEN,
                            }} />
                          </div>
                          <span className={`text-[10px] font-black w-8 text-right ${
                            job.fillPct >= 90 ? 'text-rose-500' :
                            job.fillPct >= 60 ? 'text-amber-500' : 'text-emerald-600'
                          }`}>{Math.min(job.fillPct, 100)}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        }
      </Panel>

    </div>
  );
};

export default DashboardTab;