"""Seed exactly 2,000 demo documents for the JobAI FastAPI + MongoDB project.

Run from apps/api with the project's virtualenv:
  .\\.venv\\Scripts\\python.exe scripts\\seed_demo_data.py

Demo-only accounts use the shared password printed in the summary. Do not use these
credentials in production. Only documents marked is_demo_seed=True are removed on rerun.
"""
from __future__ import annotations

import asyncio
import csv
import random
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

from bson import ObjectId
from pymongo import AsyncMongoClient
from pymongo.errors import DuplicateKeyError

# Make `app.*` imports work when invoked from apps/api.
API_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(API_DIR))
from app.core.config import settings  # noqa: E402
from app.security import hash_password  # noqa: E402

RNG = random.Random(20261011)
DEMO_PASSWORD = "Demo@12345"
N_SEEKERS = 800
N_RECRUITERS = 100
N_JOBS = 250
N_APPLICATIONS = 50

SKILLS = [
    "Python", "SQL", "MongoDB", "PostgreSQL", "MySQL", "FastAPI", "Django",
    "Flask", "JavaScript", "TypeScript", "React", "Next.js", "Node.js", "Express",
    "HTML", "CSS", "Tailwind CSS", "Java", "Spring Boot", "C++", "C#", ".NET",
    "AWS", "Azure", "Docker", "Kubernetes", "Git", "Linux", "REST API", "GraphQL",
    "Pandas", "NumPy", "scikit-learn", "TensorFlow", "PyTorch", "Data Analysis",
    "Power BI", "Tableau", "Excel", "Machine Learning", "Deep Learning", "NLP",
    "Computer Vision", "Statistics", "ETL", "Airflow", "Spark", "Hadoop", "Redis",
    "Figma", "UI/UX", "Selenium", "Playwright", "Jest", "Pytest", "CI/CD",
]
ROLES = [
    ("Frontend Developer", ["React", "TypeScript", "JavaScript", "HTML", "CSS", "Next.js", "Tailwind CSS", "Git"]),
    ("Backend Developer", ["Python", "FastAPI", "Node.js", "SQL", "MongoDB", "REST API", "Docker", "Git"]),
    ("Full Stack Developer", ["React", "TypeScript", "Node.js", "Python", "SQL", "MongoDB", "REST API", "Git"]),
    ("Data Analyst", ["SQL", "Python", "Excel", "Power BI", "Tableau", "Statistics", "Pandas", "Data Analysis"]),
    ("Data Scientist", ["Python", "SQL", "Pandas", "NumPy", "scikit-learn", "Statistics", "Machine Learning", "NLP"]),
    ("Machine Learning Engineer", ["Python", "SQL", "Machine Learning", "TensorFlow", "PyTorch", "Docker", "AWS", "Statistics"]),
    ("DevOps Engineer", ["Linux", "AWS", "Docker", "Kubernetes", "CI/CD", "Git", "Python", "Azure"]),
    ("QA Engineer", ["Selenium", "Playwright", "Pytest", "Jest", "Python", "JavaScript", "SQL", "Git"]),
    ("Cloud Engineer", ["AWS", "Azure", "Linux", "Docker", "Kubernetes", "Python", "CI/CD", "Networking"]),
    ("UI/UX Designer", ["Figma", "UI/UX", "HTML", "CSS", "JavaScript", "User Research"]),
]
CITIES = ["Chennai, Tamil Nadu", "Coimbatore, Tamil Nadu", "Bengaluru, Karnataka", "Hyderabad, Telangana", "Pune, Maharashtra", "Mumbai, Maharashtra", "Kochi, Kerala", "Delhi, India", "Noida, Uttar Pradesh", "Remote, India", "Gurugram, Haryana", "Ahmedabad, Gujarat"]
COMPANIES = [
    "BlueOrbit Technologies", "Nexora Systems", "BrightPath Digital", "CloudSpring Labs",
    "PixelForge Software", "DataVista Analytics", "VertexWorks", "NovaStack Solutions",
    "Greenfield AI", "Cobalt Tech", "Silverline Digital", "InfiCore Systems",
    "PrismByte Labs", "Skyward Apps", "AsterLoop Technologies", "QuantumLeaf",
    "Redwood Innovations", "CodeHarbor", "OrbitEdge", "MosaicWare",
]
FIRST_NAMES = ["Aarav", "Aadhya", "Aditya", "Ananya", "Arjun", "Diya", "Ishaan", "Kavya", "Krish", "Meera", "Nila", "Pranav", "Riya", "Sai", "Sanjay", "Shreya", "Tanvi", "Varun", "Vikram", "Zoya", "Rahul", "Priya", "Karthik", "Divya", "Harish", "Keerthi", "Manoj", "Naveen", "Pooja", "Roshan"]
LAST_NAMES = ["Sharma", "Patel", "Rao", "Iyer", "Nair", "Reddy", "Kumar", "Menon", "Singh", "Das", "Pillai", "Gupta", "Joshi", "Thomas", "Krishnan", "Bose", "Shah", "Verma", "Fernandes", "Mohan"]
DEGREES = ["B.Sc Computer Science", "B.E. Computer Science", "B.Tech Information Technology", "M.Sc Data Science", "MCA", "BCA", "B.Tech AI & Data Science", "M.Tech Computer Science", "B.Com + Analytics", "Diploma in Software Engineering"]
WORK_MODES = ["remote", "hybrid", "onsite"]


def now_utc():
    return datetime.now(timezone.utc)


def person_name():
    return f"{RNG.choice(FIRST_NAMES)} {RNG.choice(LAST_NAMES)}"


def skill_proficiency(skill: str, preferred: set[str]) -> dict:
    # Profiles are deliberately varied so job matching results are not all identical.
    if skill in preferred:
        level = RNG.choices([2, 3, 4], weights=[20, 55, 25])[0]
    else:
        level = RNG.choices([1, 2, 3, 4], weights=[15, 40, 35, 10])[0]
    return {"name": skill, "proficiency": level}


def job_skill_list(role_skills: list[str]) -> list[dict]:
    chosen = list(dict.fromkeys(role_skills))
    extras = [s for s in SKILLS if s not in chosen]
    RNG.shuffle(extras)
    chosen = chosen[:RNG.randint(5, min(8, len(chosen)))]
    if len(chosen) < 5:
        chosen.extend(extras[:5 - len(chosen)])
    weights = [RNG.randint(8, 25) for _ in chosen]
    total = sum(weights)
    # Scale weights to exactly 100; last weight corrects floating-point drift.
    scaled = [round(w * 100 / total, 2) for w in weights]
    scaled[-1] = round(100 - sum(scaled[:-1]), 2)
    result = []
    for idx, (name, weight) in enumerate(zip(chosen, scaled)):
        result.append({
            "name": name,
            "minimum_level": RNG.choice([2, 3, 3, 4]),
            "requirement_type": "required" if idx < max(3, len(chosen) - 2) else "preferred",
            "weight": weight,
        })
    return result


async def main():
    client = AsyncMongoClient(settings.mongodb_uri, serverSelectionTimeoutMS=10000)
    db = client[settings.mongodb_database]
    await client.admin.command("ping")
    print(f"Connected to MongoDB database: {settings.mongodb_database}")

    # Make reruns safe: only delete records created by this seeder.
    await db.applications.delete_many({"is_demo_seed": True})
    await db.profiles.delete_many({"is_demo_seed": True})
    await db.jobs.delete_many({"is_demo_seed": True})
    await db.users.delete_many({"is_demo_seed": True})

    timestamp = now_utc()
    common_hash = hash_password(DEMO_PASSWORD)
    recruiters = []
    seekers = []
    accounts_for_csv = []

    for i in range(1, N_RECRUITERS + 1):
        uid = ObjectId()
        name = person_name()
        email = f"recruiter{i:04d}@jobai-demo.example.com"
        company = COMPANIES[(i - 1) % len(COMPANIES)]
        recruiters.append({
            "_id": uid, "name": name, "email": email, "password_hash": common_hash,
            "role": "recruiter", "is_active": True, "created_at": timestamp - timedelta(days=RNG.randint(1, 700)),
            "is_demo_seed": True, "demo_company": company,
        })
        accounts_for_csv.append({"role": "recruiter", "name": name, "email": email, "password": DEMO_PASSWORD, "company": company})

    for i in range(1, N_SEEKERS + 1):
        uid = ObjectId()
        name = person_name()
        email = f"seeker{i:04d}@jobai-demo.example.com"
        role_title, core_skills = RNG.choice(ROLES)
        profile_skills = list(core_skills)
        pool = [s for s in SKILLS if s not in profile_skills]
        RNG.shuffle(pool)
        profile_skills.extend(pool[:RNG.randint(2, 8)])
        skill_docs = [skill_proficiency(s, set(core_skills)) for s in profile_skills]
        seekers.append({
            "user": {
                "_id": uid, "name": name, "email": email, "password_hash": common_hash,
                "role": "job_seeker", "is_active": True,
                "created_at": timestamp - timedelta(days=RNG.randint(1, 700)), "is_demo_seed": True,
            },
            "profile": {
                "user_id": uid, "name": name, "location": RNG.choice(CITIES),
                "education": RNG.choice(DEGREES), "experience_years": round(RNG.uniform(0, 12), 1),
                "preferred_work_mode": RNG.choice(["any", "remote", "hybrid", "onsite"]),
                "skills": skill_docs, "target_role": role_title,
                "updated_at": timestamp, "is_demo_seed": True,
            },
            "target_role": role_title,
        })
        accounts_for_csv.append({"role": "job_seeker", "name": name, "email": email, "password": DEMO_PASSWORD, "target_role": role_title, "location": seekers[-1]["profile"]["location"]})

    jobs = []
    job_docs_for_csv = []
    for i in range(1, N_JOBS + 1):
        recruiter = recruiters[(i - 1) % len(recruiters)]
        role_title, core_skills = RNG.choice(ROLES)
        mode = RNG.choice(WORK_MODES)
        location = "Remote, India" if mode == "remote" else RNG.choice(CITIES)
        experience_min = RNG.choice([0, 0, 1, 2, 3, 4, 5])
        experience_max = min(15, experience_min + RNG.choice([2, 3, 4, 5, 6]))
        salary_min = RNG.randrange(300000, 1800000, 50000)
        salary_max = salary_min + RNG.randrange(200000, 1000000, 50000)
        skills = job_skill_list(core_skills)
        title_variants = [role_title, f"{role_title} I", f"Senior {role_title}", f"Junior {role_title}", f"{role_title} - Product Team"]
        job = {
            "_id": ObjectId(), "title": RNG.choice(title_variants),
            "company": recruiter["demo_company"], "location": location, "work_mode": mode,
            "description": f"We are looking for a {role_title} to join our {RNG.choice(['product', 'platform', 'data', 'engineering', 'innovation'])} team. You will collaborate with cross-functional colleagues, build reliable solutions, document your work, and contribute to code reviews and continuous improvement. This is a synthetic demo vacancy for testing JobAI skill-based matching.",
            "salary_min": salary_min, "salary_max": salary_max,
            "experience_min": experience_min, "experience_max": experience_max,
            "skills": skills, "recruiter_id": recruiter["_id"], "status": "published",
            "created_at": timestamp - timedelta(days=RNG.randint(0, 240)),
            "updated_at": timestamp, "is_demo_seed": True,
        }
        jobs.append(job)
        job_docs_for_csv.append({"job_id": str(job["_id"]), "title": job["title"], "company": job["company"], "location": job["location"], "work_mode": mode, "recruiter_email": recruiter["email"], "skills": "; ".join(s["name"] for s in skills), "salary_min_inr": salary_min, "salary_max_inr": salary_max})

    # 50 synthetic applications linked to valid seeker/job/recruiter IDs.
    applications = []
    used_pairs = set()
    while len(applications) < N_APPLICATIONS:
        seeker = RNG.choice(seekers)
        job = RNG.choice(jobs)
        pair = (job["_id"], seeker["user"]["_id"])
        if pair in used_pairs:
            continue
        used_pairs.add(pair)
        applications.append({
            "_id": ObjectId(), "job_id": job["_id"], "user_id": seeker["user"]["_id"],
            "recruiter_id": job["recruiter_id"], "status": RNG.choice(["submitted", "reviewing", "shortlisted"]),
            "applied_at": timestamp - timedelta(days=RNG.randint(0, 60)), "is_demo_seed": True,
        })

    # Insert records in dependency order.
    await db.users.insert_many(recruiters + [s["user"] for s in seekers], ordered=True)
    await db.profiles.insert_many([s["profile"] for s in seekers], ordered=True)
    await db.jobs.insert_many(jobs, ordered=True)
    await db.applications.insert_many(applications, ordered=True)

    # Export easy-to-use demo credentials and job overview beside this script.
    output_dir = API_DIR / "seed_output"
    output_dir.mkdir(parents=True, exist_ok=True)
    with (output_dir / "demo_accounts.csv").open("w", newline="", encoding="utf-8-sig") as f:
        writer = csv.DictWriter(f, fieldnames=sorted({k for row in accounts_for_csv for k in row.keys()}))
        writer.writeheader(); writer.writerows(accounts_for_csv)
    with (output_dir / "demo_jobs.csv").open("w", newline="", encoding="utf-8-sig") as f:
        writer = csv.DictWriter(f, fieldnames=list(job_docs_for_csv[0].keys()))
        writer.writeheader(); writer.writerows(job_docs_for_csv)

    counts = {
        "users": await db.users.count_documents({"is_demo_seed": True}),
        "profiles": await db.profiles.count_documents({"is_demo_seed": True}),
        "jobs": await db.jobs.count_documents({"is_demo_seed": True}),
        "applications": await db.applications.count_documents({"is_demo_seed": True}),
    }
    total = sum(counts.values())
    print("\nDemo seeding completed successfully.")
    print(f"Counts: {counts}")
    print(f"Total demo documents: {total} (target: 2,000)")
    print(f"Shared demo password: {DEMO_PASSWORD}")
    print("Sample seeker: seeker0001@jobai-demo.example.com")
    print("Sample recruiter: recruiter0001@jobai-demo.example.com")
    print(f"CSV exports: {output_dir}")
    print("WARNING: Demo accounts are synthetic and use a shared password. Development/testing only.")
    await client.close()


if __name__ == "__main__":
    asyncio.run(main())
