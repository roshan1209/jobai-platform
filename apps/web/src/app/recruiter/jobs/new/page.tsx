"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";

type RequirementType = "required" | "preferred";
type JobSkillInput = { name: string; minimum_level: number; requirement_type: RequirementType; weight: number };
type CreatedJob = { id: string };

const levelOptions = [
  { value: 1, label: "1 — Beginner" },
  { value: 2, label: "2 — Intermediate" },
  { value: 3, label: "3 — Advanced" },
  { value: 4, label: "4 — Expert" },
];

export default function Page() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [company, setCompany] = useState("");
  const [location, setLocation] = useState("Chennai");
  const [mode, setMode] = useState<"hybrid" | "remote" | "onsite">("hybrid");
  const [description, setDescription] = useState("");
  const [skills, setSkills] = useState<JobSkillInput[]>([
    { name: "React", minimum_level: 3, requirement_type: "required", weight: 40 },
    { name: "TypeScript", minimum_level: 2, requirement_type: "required", weight: 35 },
    { name: "Git", minimum_level: 2, requirement_type: "preferred", weight: 25 },
  ]);
  const [newSkill, setNewSkill] = useState("");
  const [newLevel, setNewLevel] = useState(2);
  const [newType, setNewType] = useState<RequirementType>("required");
  const [newWeight, setNewWeight] = useState(0);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const weightTotal = skills.reduce((sum, skill) => sum + Number(skill.weight || 0), 0);
  const weightsValid = Math.abs(weightTotal - 100) < 0.01;

  function addSkill() {
    setError("");
    const name = newSkill.trim();
    if (!name) return;
    if (skills.some((skill) => skill.name.trim().toLowerCase() === name.toLowerCase())) {
      setError("That skill is already in the job requirements.");
      return;
    }
    setSkills((current) => [...current, { name, minimum_level: newLevel, requirement_type: newType, weight: newWeight }]);
    setNewSkill("");
    setNewLevel(2);
    setNewType("required");
    setNewWeight(0);
  }

  function updateSkill(index: number, changes: Partial<JobSkillInput>) {
    setSkills((current) => current.map((skill, i) => i === index ? { ...skill, ...changes } : skill));
  }

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    if (skills.length === 0) {
      setError("Add at least one skill requirement before publishing.");
      return;
    }
    if (!weightsValid) {
      setError(`Skill weights must total 100. Current total: ${weightTotal.toFixed(2)}.`);
      return;
    }
    setBusy(true);
    try {
      const job = await api<CreatedJob>("/api/v1/jobs", {
        method: "POST",
        body: JSON.stringify({ title, company, location, work_mode: mode, description, skills: skills.map((skill) => ({ ...skill, name: skill.name.trim(), weight: Number(skill.weight) })) }),
      });
      router.push(`/recruiter/jobs/${job.id}/applications`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not publish job");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <h1 style={{ fontSize: 34 }}>Create a job</h1>
      <p className="muted">Describe the role, then add each skill as a separate requirement. Skill weights must total 100%.</p>
      <form className="panel form" onSubmit={submit}>
        <div className="grid2">
          <div className="field"><label htmlFor="job-title">Job title</label><input id="job-title" required minLength={2} maxLength={120} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Frontend Developer" /></div>
          <div className="field"><label htmlFor="job-company">Company</label><input id="job-company" required minLength={2} maxLength={120} value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Company name" /></div>
        </div>
        <div className="grid2">
          <div className="field"><label htmlFor="job-location">Location</label><input id="job-location" required minLength={2} maxLength={120} value={location} onChange={(e) => setLocation(e.target.value)} /></div>
          <div className="field"><label htmlFor="job-work-mode">Work mode</label><select id="job-work-mode" value={mode} onChange={(e) => setMode(e.target.value as typeof mode)}><option value="hybrid">Hybrid</option><option value="remote">Remote</option><option value="onsite">On-site</option></select></div>
        </div>
        <div className="field"><label htmlFor="job-description">Job description</label><textarea id="job-description" required minLength={10} maxLength={10000} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Responsibilities, expectations, and what the candidate will work on…" /></div>

        <section aria-labelledby="requirements-heading" style={{ border: "1px solid #e5eaf2", borderRadius: 12, padding: 16, display: "grid", gap: 13 }}>
          <div className="jobtop">
            <div><h2 id="requirements-heading" style={{ margin: 0, fontSize: 20 }}>Skill requirements</h2><p className="muted" style={{ margin: "4px 0 0", fontSize: 13 }}>Set the minimum level, importance, and weight for every skill.</p></div>
            <span className="pill">{skills.length} skills</span>
          </div>

          <div style={{ display: "grid", gap: 10 }}>
            <div className="grid2">
              <div className="field"><label htmlFor="new-job-skill">Skill name</label><input id="new-job-skill" value={newSkill} onChange={(e) => setNewSkill(e.target.value)} maxLength={80} placeholder="e.g. React, Python, SQL" /></div>
              <div className="field"><label htmlFor="new-job-skill-level">Minimum proficiency</label><select id="new-job-skill-level" value={newLevel} onChange={(e) => setNewLevel(Number(e.target.value))}>{levelOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></div>
            </div>
            <div className="grid2">
              <div className="field"><label htmlFor="new-job-skill-type">Requirement type</label><select id="new-job-skill-type" value={newType} onChange={(e) => setNewType(e.target.value as RequirementType)}><option value="required">Required</option><option value="preferred">Preferred</option></select></div>
              <div className="field"><label htmlFor="new-job-skill-weight">Weight (%)</label><input id="new-job-skill-weight" type="number" min="0" max="100" step="1" value={newWeight} onChange={(e) => setNewWeight(Number(e.target.value))} /></div>
            </div>
            <div><button className="button alt" type="button" onClick={addSkill} disabled={!newSkill.trim()}>+ Add skill requirement</button></div>
          </div>

          {skills.length === 0 ? <div className="status" style={{ margin: 0 }}>No skill requirements yet. Add the skills needed for this role.</div> : (
            <div style={{ display: "grid", gap: 9 }}>
              {skills.map((skill, index) => (
                <div key={`${skill.name}-${index}`} style={{ display: "grid", gap: 10, border: "1px solid #e5eaf2", borderRadius: 10, padding: 12 }}>
                  <div className="jobtop">
                    <div><strong>{skill.name}</strong><div className="muted" style={{ fontSize: 12 }}>Requirement {index + 1}</div></div>
                    <button type="button" className="button alt" onClick={() => setSkills((current) => current.filter((_, i) => i !== index))} aria-label={`Remove ${skill.name}`}>Remove</button>
                  </div>
                  <div className="grid2">
                    <div className="field"><label htmlFor={`skill-level-${index}`}>Minimum proficiency</label><select id={`skill-level-${index}`} value={skill.minimum_level} onChange={(e) => updateSkill(index, { minimum_level: Number(e.target.value) })}>{levelOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></div>
                    <div className="field"><label htmlFor={`skill-type-${index}`}>Requirement type</label><select id={`skill-type-${index}`} value={skill.requirement_type} onChange={(e) => updateSkill(index, { requirement_type: e.target.value as RequirementType })}><option value="required">Required</option><option value="preferred">Preferred</option></select></div>
                    <div className="field"><label htmlFor={`skill-weight-${index}`}>Weight (%)</label><input id={`skill-weight-${index}`} type="number" min="0" max="100" step="1" value={skill.weight} onChange={(e) => updateSkill(index, { weight: Number(e.target.value) })} /></div>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="jobtop" style={{ padding: "10px 12px", borderRadius: 9, background: weightsValid ? "#e9f9ef" : "#fff6df", color: weightsValid ? "#17663a" : "#825600" }}>
            <strong>Total weight</strong><strong>{weightTotal.toFixed(0)}% / 100%</strong>
          </div>
          <p className="muted" style={{ margin: 0, fontSize: 12 }}>Level 1 = Beginner · 2 = Intermediate · 3 = Advanced · 4 = Expert. Adjust the weights above until the total is exactly 100%.</p>
        </section>

        {error && <div className="status error" role="alert">{error}</div>}
        <button className="button" type="submit" disabled={busy || skills.length === 0 || !weightsValid}>{busy ? "Publishing…" : "Publish job"}</button>
      </form>
    </>
  );
}
