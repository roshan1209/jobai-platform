"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";

type Candidate = {
  id: string;
  name: string;
  email: string;
  location?: string;
  education?: string;
  experience_years: number;
  preferred_work_mode?: string;
  profile_complete?: boolean;
  skills: { name: string; proficiency: number }[];
};
type SkillDetail = { name: string };
type Match = {
  score: number;
  label: string;
  explanation: string;
  experience_match: boolean;
  matched_skills: SkillDetail[];
  skills_to_improve: SkillDetail[];
  missing_skills: SkillDetail[];
  candidate: Candidate;
};
type Applicant = { id: string; status: string; applied_at?: string; candidate: Candidate };

export default function RecruiterJobCandidatesPage() {
  const params = useParams<{ jobId: string }>();
  const jobId = params.jobId;
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [applicantError, setApplicantError] = useState("");
  const [matchError, setMatchError] = useState("");
  const [applicantsLoading, setApplicantsLoading] = useState(true);
  const [matchesLoading, setMatchesLoading] = useState(true);

  const loadApplicants = useCallback(async () => {
    setApplicantsLoading(true);
    setApplicantError("");
    try {
      const result = await api<Applicant[]>(`/api/v1/recruiter/jobs/${jobId}/applications`);
      setApplicants(Array.isArray(result) ? result : []);
    } catch (error) {
      setApplicantError(error instanceof Error ? error.message : "Could not load applicants.");
    } finally {
      setApplicantsLoading(false);
    }
  }, [jobId]);

  const loadMatches = useCallback(async () => {
    setMatchesLoading(true);
    setMatchError("");
    try {
      const result = await api<Match[]>(`/api/v1/recruiter/jobs/${jobId}/matches`);
      setMatches(Array.isArray(result) ? result : []);
    } catch (error) {
      setMatchError(error instanceof Error ? error.message : "Could not load matching candidates.");
    } finally {
      setMatchesLoading(false);
    }
  }, [jobId]);

  useEffect(() => {
    if (!jobId) return;
    void loadApplicants();
    void loadMatches();
  }, [jobId, loadApplicants, loadMatches]);

  const renderCandidate = (candidate: Candidate) => (
    <>
      <p className="muted">
        {candidate.email} · {candidate.location || "Location not set"} · {candidate.experience_years ?? 0} years experience · {candidate.preferred_work_mode || "Work mode not set"}
      </p>
      {candidate.education && <p className="muted">{candidate.education}</p>}
      {candidate.skills?.length ? (
        <div className="skills">
          {candidate.skills.map((skill) => (
            <span className="skill" key={skill.name}>{skill.name}: {skill.proficiency}/4</span>
          ))}
        </div>
      ) : (
        <p className="muted">No skills saved in this candidate profile yet.</p>
      )}
    </>
  );

  return (
    <>
      <h1 style={{ fontSize: 34 }}>Applicants &amp; best matches</h1>
      <p className="muted">Applicants have applied to this job. Best matches are job seekers ranked by skill coverage, including seekers who have not applied. Match scores are not hiring probabilities.</p>

      <section aria-labelledby="best-matches-heading">
        <h2 id="best-matches-heading">Best skill matches ({matches.length})</h2>
        {matchesLoading && <div className="status">Finding matching candidates…</div>}
        {matchError && (
          <div className="status error">
            Could not load best matches: {matchError}. Confirm the latest FastAPI code is deployed and that this recruiter owns the job.
            <button className="button alt" type="button" onClick={() => void loadMatches()}>Retry matches</button>
          </div>
        )}
        {!matchesLoading && !matchError && matches.length === 0 && (
          <div className="status">No active job-seeker accounts found in this database yet. Add job seekers and profiles, then refresh.</div>
        )}
        {matches.map((item) => (
          <article className="job" key={item.candidate.id}>
            <div className="jobtop">
              <div>
                <h3>{item.candidate.name}</h3>
                <p className="muted">{item.candidate.education || "Education not added"}</p>
              </div>
              <span className="pill">{item.score}% · {item.label}</span>
            </div>
            {renderCandidate(item.candidate)}
            <p className="muted">{item.explanation} Experience range: {item.experience_match ? "matches" : "outside job range"}.</p>
            <div className="skills">
              {item.matched_skills.map((skill) => <span className="skill" key={`matched-${skill.name}`}>✓ {skill.name}</span>)}
              {item.skills_to_improve.map((skill) => <span className="skill" key={`improve-${skill.name}`}>Improve: {skill.name}</span>)}
              {item.missing_skills.map((skill) => <span className="skill" key={`missing-${skill.name}`}>Missing: {skill.name}</span>)}
            </div>
          </article>
        ))}
      </section>

      <section aria-labelledby="applicants-heading">
        <h2 id="applicants-heading">Applicants ({applicants.length})</h2>
        {applicantsLoading && <div className="status">Loading submitted applications…</div>}
        {applicantError && (
          <div className="status error">
            Could not load applicants: {applicantError}.
            <button className="button alt" type="button" onClick={() => void loadApplicants()}>Retry applicants</button>
          </div>
        )}
        {!applicantsLoading && !applicantError && applicants.length === 0 && (
          <div className="status">No one has applied to this job yet. The best matches above can still show job seekers who have not applied.</div>
        )}
        {applicants.map((item) => (
          <article className="job" key={item.id}>
            <div className="jobtop">
              <h3>{item.candidate.name}</h3>
              <span className="pill">{item.status}</span>
            </div>
            {renderCandidate(item.candidate)}
          </article>
        ))}
      </section>
    </>
  );
}
