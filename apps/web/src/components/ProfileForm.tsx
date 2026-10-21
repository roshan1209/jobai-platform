"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, type Skill } from "@/lib/api";

type Profile = {
  name: string;
  location: string;
  education: string;
  experience_years: number;
  preferred_work_mode: "onsite" | "hybrid" | "remote" | "any";
  skills: Skill[];
};

const emptyProfile: Profile = {
  name: "",
  location: "",
  education: "",
  experience_years: 0,
  preferred_work_mode: "any",
  skills: [],
};

const levelLabels: Record<number, string> = {
  1: "Beginner",
  2: "Intermediate",
  3: "Advanced",
  4: "Expert",
};

export default function ProfileForm() {
  const router = useRouter();
  const [onboarding, setOnboarding] = useState(false);
  const [profile, setProfile] = useState<Profile>(emptyProfile);
  const [skillName, setSkillName] = useState("");
  const [skillLevel, setSkillLevel] = useState(2);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setOnboarding(new URLSearchParams(window.location.search).get("setup") === "1");
    api<Profile>("/api/v1/profile")
      .then((data) => setProfile({ ...emptyProfile, ...data, skills: data.skills ?? [] }))
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Could not load profile"))
      .finally(() => setLoading(false));
  }, []);

  function update<K extends keyof Profile>(key: K, value: Profile[K]) {
    setProfile((current) => ({ ...current, [key]: value }));
  }

  function addSkill() {
    setError("");
    const name = skillName.trim();
    if (!name) return;
    if (profile.skills.some((skill) => skill.name.trim().toLowerCase() === name.toLowerCase())) {
      setError("That skill is already in your list. Edit its level or choose another skill.");
      return;
    }
    update("skills", [...profile.skills, { name, proficiency: skillLevel }]);
    setSkillName("");
    setSkillLevel(2);
  }

  function updateSkill(index: number, changes: Partial<Skill>) {
    update("skills", profile.skills.map((skill, i) => (i === index ? { ...skill, ...changes } : skill)));
  }

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage("");
    setError("");
    setSaving(true);
    try {
      const saved = await api<Profile>("/api/v1/profile", {
        method: "PUT",
        body: JSON.stringify({ ...profile, skills: profile.skills.map((s) => ({ name: s.name.trim(), proficiency: Number(s.proficiency) })) }),
      });
      setProfile({ ...emptyProfile, ...saved, skills: saved.skills ?? [] });
      setMessage("Profile and skills saved successfully.");
      if (onboarding) router.replace("/seeker/recommendations");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save profile");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="panel muted">Loading your profile…</div>;

  return (
    <form className="panel form" onSubmit={submit}>
      <div>
        <h2 style={{ marginTop: 0, marginBottom: 5 }}>Profile & skills</h2>
        <p className="muted" style={{ margin: 0 }}>Add your skills individually so JobAI can find jobs that fit your experience.</p>
      </div>

      <div className="field">
        <label htmlFor="profile-name">Full name</label>
        <input id="profile-name" required minLength={2} value={profile.name} onChange={(e) => update("name", e.target.value)} />
      </div>
      <div className="grid2">
        <div className="field">
          <label htmlFor="profile-location">Location</label>
          <input id="profile-location" value={profile.location} onChange={(e) => update("location", e.target.value)} placeholder="e.g. Chennai, India" />
        </div>
        <div className="field">
          <label htmlFor="profile-education">Education</label>
          <input id="profile-education" value={profile.education} onChange={(e) => update("education", e.target.value)} placeholder="e.g. B.Sc Computer Science" />
        </div>
      </div>
      <div className="grid2">
        <div className="field">
          <label htmlFor="profile-experience">Experience (years)</label>
          <input id="profile-experience" type="number" min="0" max="70" step="0.5" value={profile.experience_years} onChange={(e) => update("experience_years", Number(e.target.value))} />
        </div>
        <div className="field">
          <label htmlFor="profile-workmode">Preferred work mode</label>
          <select id="profile-workmode" value={profile.preferred_work_mode} onChange={(e) => update("preferred_work_mode", e.target.value as Profile["preferred_work_mode"])}>
            <option value="any">Any</option><option value="remote">Remote</option><option value="hybrid">Hybrid</option><option value="onsite">On-site</option>
          </select>
        </div>
      </div>

      <section aria-labelledby="skills-heading" style={{ border: "1px solid #e5eaf2", borderRadius: 12, padding: 16, display: "grid", gap: 12 }}>
        <div className="jobtop">
          <div>
            <h3 id="skills-heading" style={{ margin: 0 }}>Your skills</h3>
            <p className="muted" style={{ margin: "4px 0 0", fontSize: 13 }}>Choose a proficiency level for each skill.</p>
          </div>
          <span className="pill">{profile.skills.length} added</span>
        </div>

        <div className="grid2" style={{ alignItems: "end" }}>
          <div className="field">
            <label htmlFor="new-skill">Skill name</label>
            <input id="new-skill" value={skillName} onChange={(e) => setSkillName(e.target.value)} placeholder="e.g. React, Python, SQL" maxLength={80} />
          </div>
          <div className="field">
            <label htmlFor="new-skill-level">Proficiency</label>
            <select id="new-skill-level" value={skillLevel} onChange={(e) => setSkillLevel(Number(e.target.value))}>
              <option value={1}>1 — Beginner</option><option value={2}>2 — Intermediate</option><option value={3}>3 — Advanced</option><option value={4}>4 — Expert</option>
            </select>
          </div>
          <div><button className="button alt" type="button" onClick={addSkill} disabled={!skillName.trim()}>+ Add skill</button></div>
        </div>

        {profile.skills.length === 0 ? (
          <div className="status" style={{ margin: 0 }}>No skills added yet. Add skills above to improve your job recommendations.</div>
        ) : (
          <div style={{ display: "grid", gap: 8 }}>
            {profile.skills.map((skill, index) => (
              <div key={`${skill.name}-${index}`} style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(150px, 200px) auto", gap: 10, alignItems: "center", border: "1px solid #e5eaf2", borderRadius: 10, padding: 10 }}>
                <div style={{ minWidth: 0 }}>
                  <strong style={{ overflowWrap: "anywhere" }}>{skill.name}</strong>
                  <div className="muted" style={{ fontSize: 12 }}>{levelLabels[skill.proficiency] ?? "Intermediate"}</div>
                </div>
                <select aria-label={`${skill.name} proficiency`} value={skill.proficiency} onChange={(e) => updateSkill(index, { proficiency: Number(e.target.value) })}>
                  <option value={1}>1 — Beginner</option><option value={2}>2 — Intermediate</option><option value={3}>3 — Advanced</option><option value={4}>4 — Expert</option>
                </select>
                <button type="button" className="button alt" aria-label={`Remove ${skill.name}`} onClick={() => update("skills", profile.skills.filter((_, i) => i !== index))}>Remove</button>
              </div>
            ))}
          </div>
        )}
      </section>

      {message && <div className="status ok" role="status">{message}</div>}
      {error && <div className="status error" role="alert">{error}</div>}
      <button className="button" type="submit" disabled={saving}>{saving ? "Saving profile…" : "Save profile"}</button>
    </form>
  );
}
