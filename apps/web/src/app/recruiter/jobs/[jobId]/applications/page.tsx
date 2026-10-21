"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";

type Candidate = {
  id: string;
  name: string;
  email: string;
  location: string;
  education: string;
  experience_years: number;
  preferred_work_mode: string;
  skills: { name: string; proficiency: number }[];
};
type Match = {
  score: number;
  label: string;
  explanation: string;
  experience_match: boolean;
  matched_skills: { name: string }[];
  skills_to_improve: { name: string }[];
  missing_skills: { name: string }[];
  candidate: Candidate;
};
type MatchPage = {
  items: Match[];
  total: number;
  limit: number;
  offset: number;
  has_more: boolean;
};
type Applicant = { id: string; status: string; candidate: Candidate };

const PAGE_SIZE = 5;

export default function Page() {
  const params = useParams<{ jobId: string }>();
  const jobId = params.jobId;
  const [items, setItems] = useState<Applicant[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [totalMatches, setTotalMatches] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");

  const loadFirstPage = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [applicants, matchPage] = await Promise.all([
        api<Applicant[]>(`/api/v1/recruiter/jobs/${jobId}/applications`),
        api<MatchPage>(`/api/v1/recruiter/jobs/${jobId}/matches?limit=${PAGE_SIZE}&offset=0`),
      ]);
      setItems(applicants);
      setMatches(matchPage.items);
      setTotalMatches(matchPage.total);
      setHasMore(matchPage.has_more);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load candidate matches.");
    } finally {
      setLoading(false);
    }
  }, [jobId]);

  useEffect(() => {
    void loadFirstPage();
  }, [loadFirstPage]);

  async function loadMore() {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    setError("");
    try {
      const page = await api<MatchPage>(
        `/api/v1/recruiter/jobs/${jobId}/matches?limit=${PAGE_SIZE}&offset=${matches.length}`,
      );
      setMatches((current) => [...current, ...page.items]);
      setTotalMatches(page.total);
      setHasMore(page.has_more);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load more matches.");
    } finally {
      setLoadingMore(false);
    }
  }

  const renderCandidate = (candidate: Candidate) => (
    <>
      <p className="muted">
        {candidate.email} · {candidate.location || "Location not set"} ·{" "}
        {candidate.experience_years} years experience ·{" "}
        {candidate.preferred_work_mode || "Any work mode"}
      </p>
      <div className="skills">
        {candidate.skills.map((skill) => (
          <span className="skill" key={skill.name}>
            {skill.name}: {skill.proficiency}/4
          </span>
        ))}
      </div>
    </>
  );

  return (
    <>
      <h1 style={{ fontSize: 34 }}>Candidate matches</h1>
      <p className="muted">
        Candidates are ranked by skill coverage. Scores represent skill coverage,
        not hiring probability. The top five are loaded first.
      </p>
      {error && <div className="status error">{error}</div>}
      {loading && <div className="status">Finding the best candidates…</div>}

      <h2>Best skill matches ({totalMatches})</h2>
      {!loading && !matches.length && !error && (
        <div className="status">
          No job seekers found. Candidates appear here after they complete their profiles.
        </div>
      )}

      {matches.map((matchItem, index) => (
        <article className="job" key={matchItem.candidate.id}>
          <div className="jobtop">
            <div>
              <h3>
                {index + 1}. {matchItem.candidate.name}
              </h3>
              <p className="muted">
                {matchItem.candidate.education || "Education not added"}
              </p>
            </div>
            <span className="pill">
              {matchItem.score}% · {matchItem.label}
            </span>
          </div>
          {renderCandidate(matchItem.candidate)}
          <p className="muted">
            {matchItem.explanation} Experience range:{" "}
            {matchItem.experience_match ? "matches" : "outside job range"}.
          </p>
          <div className="skills">
            {matchItem.matched_skills.map((skill) => (
              <span className="skill" key={`matched-${skill.name}`}>
                ✓ {skill.name}
              </span>
            ))}
            {matchItem.skills_to_improve.map((skill) => (
              <span className="skill" key={`improve-${skill.name}`}>
                Improve: {skill.name}
              </span>
            ))}
            {matchItem.missing_skills.map((skill) => (
              <span className="skill" key={`missing-${skill.name}`}>
                Missing: {skill.name}
              </span>
            ))}
          </div>
        </article>
      ))}

      {!loading && hasMore && (
        <button className="button" type="button" onClick={loadMore} disabled={loadingMore}>
          {loadingMore ? "Loading…" : `Load 5 more (${matches.length} of ${totalMatches})`}
        </button>
      )}

      <h2>Applicants ({items.length})</h2>
      {!items.length && !loading && !error && (
        <div className="status">No applications submitted for this job yet.</div>
      )}
      {items.map((item) => (
        <article className="job" key={item.id}>
          <div className="jobtop">
            <h3>{item.candidate.name}</h3>
            <span className="pill">{item.status}</span>
          </div>
          {renderCandidate(item.candidate)}
        </article>
      ))}
    </>
  );
}
