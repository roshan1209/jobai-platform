"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Jobs from "@/components/Jobs";
import { api, logout, user, type User } from "@/lib/api";

export default function Home() {
  const router = useRouter();
  const [account, setAccount] = useState<User | null>(null);
  const [checkedSession, setCheckedSession] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function checkSession() {
      const token = localStorage.getItem("jobai_token");
      if (!token) {
        if (!cancelled) setCheckedSession(true);
        return;
      }
      try {
        const verified = await api<User>("/api/v1/auth/me");
        if (!cancelled) setAccount(verified);
      } catch {
        logout();
        if (!cancelled) setAccount(null);
      } finally {
        if (!cancelled) setCheckedSession(true);
      }
    }
    void checkSession();
    return () => { cancelled = true; };
  }, []);

  const dashboard = account?.role === "recruiter" ? "/recruiter/dashboard" : "/seeker/dashboard";
  const profile = account?.role === "recruiter" ? "/recruiter/jobs" : "/seeker/profile";

  return <>
    <header className="container nav">
      <a className="brand" href="/">Job<span>AI</span></a>
      <nav className="row">
        <a href="#jobs">Browse jobs</a>
        {checkedSession && account ? <>
          <span className="muted">Hi, {account.name}</span>
          <a className="button alt" href={profile}>{account.role === "recruiter" ? "My jobs" : "Profile & skills"}</a>
          <a className="button" href={dashboard}>Dashboard</a>
          <button className="button alt" onClick={() => { logout(); setAccount(null); router.refresh(); }}>Sign out</button>
        </> : <>
          <a className="button alt" href="/sign-in">Sign in</a>
          <a className="button" href="/sign-up">Create account</a>
        </>}
      </nav>
    </header>
    <main className="container">
      <section className="hero">
        <div>
          <span className="pill">SMARTER JOB SEARCH</span>
          <h1>{account?.role === "job_seeker" ? <>Your next role<br />starts with your skills.</> : <>Your skills.<br />Your next opportunity.</>}</h1>
          <p className="muted">{account?.role === "job_seeker" ? "Browse open roles and see how well they match your profile skills." : "Find roles that fit your skills, see why they match, and understand what to learn next."}</p>
          <div className="actions">
            <a className="button" href="#jobs">Browse jobs</a>
            {account ? <a className="button alt" href={dashboard}>Go to dashboard</a> : <a className="button alt" href="/sign-up">Create account</a>}
          </div>
        </div>
        <div className="panel">
          <span className="muted">Skill-based recommendations</span>
          <div className="metric">AI</div>
          <p className="muted">{account?.role === "job_seeker" ? "Your available profile skills are compared with each job's requirements." : "Compare job requirements with candidate skills to find a stronger fit."}</p>
          <div className="skills"><span className="skill">Skill match</span><span className="skill">Missing skills</span><span className="skill">Next steps</span></div>
        </div>
      </section>
      <section className="section">
        <h2>How JobAI helps</h2>
        <div className="cards">
          <article className="card"><h3>Match</h3><p className="muted">Compare skills with job requirements.</p></article>
          <article className="card"><h3>Analyze</h3><p className="muted">Find matched, weak and missing skills.</p></article>
          <article className="card"><h3>Improve</h3><p className="muted">Build a focused learning plan.</p></article>
        </div>
      </section>
      <section id="jobs" className="section">
        <div className="pagehead"><h2>Browse jobs</h2>{account?.role === "recruiter" ? <a className="button alt" href="/recruiter/jobs/new">Post a job</a> : account?.role === "job_seeker" ? <a className="button alt" href="/seeker/recommendations">View matched jobs</a> : <a className="button alt" href="/sign-up">Join JobAI</a>}</div>
        <Jobs />
      </section>
    </main>
    <footer><div className="container">JobAI · Portfolio MVP</div></footer>
  </>;
}
