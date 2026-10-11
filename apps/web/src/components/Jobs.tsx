"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { api, user, type Job, type User } from "@/lib/api";

type Recommendation = {
  score: number;
  label: string;
  matched_skills: { name: string }[];
  missing_skills: { name: string }[];
  skills_to_improve: { name: string }[];
  job: Job;
};

export default function Jobs() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [q, setQ] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [account, setAccount] = useState<User | null>(null);
  const [scores, setScores] = useState<Record<string, Recommendation>>({});

  async function load(query = "") {
    setLoading(true);
    setError("");
    try {
      const found = await api<Job[]>(`/api/v1/jobs${query ? `?q=${encodeURIComponent(query)}` : ""}`);
      setJobs(found);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load jobs");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const cached = user();
    setAccount(cached);
    void load();
    if (cached?.role === "job_seeker" && localStorage.getItem("jobai_token")) {
      api<Recommendation[]>("/api/v1/recommendations")
        .then((items) => setScores(Object.fromEntries(items.map((item) => [item.job.id, item]))))
        .catch(() => setScores({}));
    }
  }, []);

  const visibleJobs = useMemo(() => jobs, [jobs]);

  return <>
    <form className="row" onSubmit={(e) => { e.preventDefault(); void load(q); }}>
      <input className="search" placeholder="Search title, company or location" value={q} onChange={(e) => setQ(e.target.value)} />
      <button className="button" type="submit">Search</button>
    </form>
    {account?.role === "job_seeker" && <p className="muted">Signed in as a job seeker — your match scores are based on the skills saved in Profile &amp; Skills.</p>}
    {account?.role === "recruiter" && <p className="muted">Signed in as a recruiter — browse published jobs or post a new role to find matching candidates.</p>}
    {loading && <div className="status">Loading jobs…</div>}
    {error && <div className="status error">{error}</div>}
    {!loading && !error && !visibleJobs.length && <div className="status">No jobs published yet.</div>}
    {visibleJobs.map((j) => {
      const match = scores[j.id];
      return <article className="job" key={j.id}>
        <div className="jobtop">
          <div><h3>{j.title}</h3><p className="muted">{j.company} · {j.location} · {j.work_mode}</p></div>
          <span className="pill">{match ? `${match.score}% match` : `${j.skills.length} skills`}</span>
        </div>
        <p className="muted">{j.description}</p>
        {match && <p className="muted">{match.label}{match.matched_skills?.length ? ` · Matches: ${match.matched_skills.map((s) => s.name).join(", ")}` : ""}</p>}
        <div className="skills">{j.skills.map((s) => <span className="skill" key={s.name}>{s.name} · {s.weight}%</span>)}</div>
        {match?.missing_skills?.length ? <p className="muted">Skills to build: {match.missing_skills.map((s) => s.name).join(", ")}</p> : null}
        <p><Link className="button alt" href={`/jobs/${j.id}`}>View details</Link>{account?.role === "job_seeker" && <Link className="button mx-12" href={`/jobs/${j.id}`}>Apply / details</Link>}</p>
      </article>;
    })}
  </>;
}
