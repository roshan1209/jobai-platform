"use client";
import Link from "next/link";
import {useRouter} from "next/navigation";
import {useEffect,useState} from "react";
import {api,logout,user,saveSession,type User} from "@/lib/api";
export default function DashboardShell({role,children}:{role:"job_seeker"|"recruiter";children:React.ReactNode}){
 const router=useRouter();const [ready,setReady]=useState(false),[name,setName]=useState("");
 useEffect(()=>{let cancelled=false;async function check(){const cached=user();if(!cached){router.replace("/sign-in");return}try{const verified=await api<User>("/api/v1/auth/me");if(cancelled)return;if(verified.role!==role){router.replace(verified.role==="recruiter"?"/recruiter/dashboard":"/seeker/dashboard");return}const token=localStorage.getItem("jobai_token");if(token)saveSession(token,verified);setName(verified.name);setReady(true)}catch{logout();router.replace("/sign-in")}}void check();return()=>{cancelled=true}},[role,router]);
 if(!ready)return <main className="container"><div className="status">Checking your sign-in session…</div></main>;
 const links=role==="job_seeker"?[["/seeker/dashboard","Overview"],["/seeker/profile","Profile & skills"],["/seeker/recommendations","Matched jobs"],["/seeker/applications","Applications"]]:[["/recruiter/dashboard","Overview"],["/recruiter/jobs/new","Create job"],["/recruiter/jobs","My jobs"]];
 return <main className="container"><header className="nav"><Link className="brand" href="/">Job<span>AI</span></Link><div className="row"><span className="muted">Hi, {name}</span><button className="button alt" onClick={()=>{logout();router.replace("/sign-in")}}>Sign out</button></div></header><div className="layout"><aside className="side">{links.map(([h,l])=><Link key={h} href={h}>{l}</Link>)}<Link href="/">Browse jobs</Link></aside><section>{children}</section></div></main>
}
