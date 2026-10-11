"use client";
import {useEffect,useState} from "react";
import Link from "next/link";
import {api,type Job} from "@/lib/api";
type Recommendation={score:number;label:string;explanation:string;matched_skills:{name:string}[];missing_skills:{name:string}[];job:Job};
export default function Page(){const [jobs,SJ]=useState<Job[]>([]),[apps,SA]=useState<any[]>([]),[matches,SM]=useState<Recommendation[]>([]),[err,SE]=useState("");
 useEffect(()=>{Promise.all([api<Job[]>("/api/v1/jobs"),api<any[]>("/api/v1/applications"),api<Recommendation[]>("/api/v1/recommendations")]).then(([j,a,m])=>{SJ(j);SA(a);SM(m)}).catch(e=>SE(e.message))},[]);
 return <><span className="pill">JOB SEEKER</span><h1 style={{fontSize:34}}>Your dashboard</h1><p className="muted">Discover opportunities matched to your skills and track your applications.</p>{err&&<div className="status error">{err}</div>}<div className="cards"><article className="card"><div className="muted">Published jobs</div><div className="metric">{jobs.length}</div></article><article className="card"><div className="muted">Applications</div><div className="metric">{apps.length}</div></article><article className="card"><Link href="/seeker/profile">Update your profile & skills →</Link></article></div>
 <div className="pagehead"><h2>Jobs matched to your skills</h2><Link className="button alt" href="/seeker/recommendations">See all matches</Link></div>
 {!matches.length&&!err&&<div className="status">Add skills to your profile to calculate your job matches.</div>}
 {matches.slice(0,4).map(x=><article className="job" key={x.job.id}><div className="jobtop"><div><h3>{x.job.title}</h3><p className="muted">{x.job.company} · {x.job.location} · {x.job.work_mode}</p></div><span className="pill">{x.score}% match</span></div><p className="muted">{x.explanation}</p><div className="skills">{x.matched_skills.slice(0,5).map(s=><span className="skill" key={s.name}>✓ {s.name}</span>)}{x.missing_skills.slice(0,3).map(s=><span className="skill" key={s.name}>Missing: {s.name}</span>)}</div><Link className="button alt" href={`/jobs/${x.job.id}`}>View job</Link></article>)}
 <h2>Recent jobs</h2>{jobs.slice(0,5).map(j=><article className="job" key={j.id}><h3>{j.title}</h3><p className="muted">{j.company} · {j.location}</p><Link className="button alt" href={`/jobs/${j.id}`}>View job</Link></article>)}</>}
