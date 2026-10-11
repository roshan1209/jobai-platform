"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { api, type Job } from "@/lib/api";

type SkillMatch = { name: string };
type Recommendation = {
  score: number;
  label: string;
  explanation: string;
  experience_match: boolean;
  matched_skills: SkillMatch[];
  skills_to_improve: SkillMatch[];
  missing_skills: SkillMatch[];
  job: Job;
};

export default function Page() {
  const [items, setItems] = useState<Recommendation[]>([]);
  const [err, setErr] = useState("");

  useEffect(() => {
    api<Recommendation[]>("/api/v1/recommendations")
      .then(setItems)
      .catch((error: Error) => setErr(error.message));
  }, []);

  return (
    <>
      <h1 style={{ fontSize: 34 }}>Recommended jobs</h1>
      <p className="muted">Ranked by weighted skill coverage, not hiring probability.</p>
      {err && <div className="status error">{err}</div>}
      {!items.length && !err && <div className="status">No recommendations yet. Add your skills and check back.</div>}
      {items.map((item) => (
        <article className="job" key={item.job.id}>
          <div className="jobtop">
            <div>
              <h3>{item.job.title}</h3>
              <p className="muted">{item.job.company} · {item.job.location}</p>
            </div>
            <span className="pill">{item.score}% · {item.label}</span>
          </div>
          <p className="muted">{item.explanation}</p>
          <div className="skills">
            {item.matched_skills.map((skill) => <span className="skill" key={skill.name}>✓ {skill.name}</span>)}
            {item.skills_to_improve.map((skill) => <span className="skill" key={skill.name}>Improve: {skill.name}</span>)}
            {item.missing_skills.map((skill) => <span className="skill" key={skill.name}>Missing: {skill.name}</span>)}
          </div>
          <p className="muted">Experience: {item.experience_match ? "within range" : "outside stated range"}</p>
          <Link className="button alt" href={`/jobs/${item.job.id}`}>View job</Link>
        </article>
      ))}
    </>
  );
}
