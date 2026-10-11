"use client";
import { useEffect, useState } from "react";
import { api, type Job } from "@/lib/api";

type JobApplication = { id: string; status: string; job: Job };

export default function Page() {
  const [items, setItems] = useState<JobApplication[]>([]);
  const [err, setErr] = useState("");

  useEffect(() => {
    api<JobApplication[]>("/api/v1/applications")
      .then(setItems)
      .catch((error: Error) => setErr(error.message));
  }, []);

  return (
    <>
      <h1 style={{ fontSize: 34 }}>My applications</h1>
      {err && <div className="status error">{err}</div>}
      {!items.length && !err && <div className="status">No applications yet.</div>}
      {items.map((item) => (
        <article className="job" key={item.id}>
          <h3>{item.job.title}</h3>
          <p className="muted">{item.job.company} · {item.job.location}</p>
          <span className="pill">{item.status}</span>
        </article>
      ))}
    </>
  );
}
