"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { api, type Job, user } from "@/lib/api";
import JobActions from "@/components/JobActions";

export default function Page() {
  const params = useParams<{ jobId: string }>();
  const [job, setJob] = useState<Job | null>(null);
  const [error, setError] = useState("");
  const [role, setRole] = useState<"job_seeker" | "recruiter" | null>(null);

  useEffect(() => {
    setRole(user()?.role ?? null);
    api<Job>(`/api/v1/jobs/${params.jobId}`)
      .then(setJob)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Could not load this job."));
  }, [params.jobId]);

  if (error) return <main className="container"><div className="status error">{error}</div><Link href="/">Back to jobs</Link></main>;
  if (!job) return <main className="container"><div className="status">Loading…</div></main>;

  const showApply = role !== "recruiter";

  return (
    <main className="container">
      <header className="nav">
        <Link className="brand" href="/">Job<span>AI</span></Link>
        <Link href="/">← All jobs</Link>
      </header>
      <article className="panel">
        <span className="pill">{job.work_mode}</span>
        <h1 style={{ fontSize: 38 }}>{job.title}</h1>
        <h3>{job.company} · {job.location}</h3>
        <p className="muted">{job.description}</p>
        <div className="grid2">
          <div>
            <h3>Experience</h3>
            <p className="muted">{job.experience_min ?? 0}–{job.experience_max ?? 70} years</p>
          </div>
          {(job.salary_min != null || job.salary_max != null) && (
            <div>
              <h3>Salary range</h3>
              <p className="muted">{job.salary_min ?? "Not specified"} – {job.salary_max ?? "Not specified"}</p>
            </div>
          )}
        </div>
        <h2>Skills required</h2>
        {job.skills.map((skill) => (
          <div className="job" key={skill.name}>
            <strong>{skill.name}</strong>
            <p className="muted">Level {skill.minimum_level} · {skill.requirement_type} · {skill.weight}% weight</p>
          </div>
        ))}
        {showApply ? <JobActions id={job.id} /> : <div className="status" style={{ marginTop: 20 }}>You are viewing this job as a recruiter. Applying is available only to job seekers.</div>}
      </article>
    </main>
  );
}
