from contextlib import asynccontextmanager
from datetime import datetime, timezone
from bson import ObjectId
from fastapi import FastAPI, Depends, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pymongo.errors import PyMongoError, DuplicateKeyError
from app.core.config import settings
from app.db import database, ping_database, close_database
from app.security import hash_password, verify_password, make_token
from app.dependencies import current_user, require_role
from app.schemas import Register, Login, ProfileUpdate, JobCreate, JobSkill, Skill
from app.matching import match
@asynccontextmanager
async def lifespan(app):
    try:
        await database.users.create_index("email",unique=True)
        await database.applications.create_index([("job_id",1),("user_id",1)],unique=True)
        await database.jobs.create_index([("status",1),("created_at",-1)])
    except PyMongoError: pass
    yield
    await close_database()
app=FastAPI(title=settings.app_name,version="1.0.0",lifespan=lifespan)
app.add_middleware(CORSMiddleware,allow_origins=settings.allowed_origins,allow_credentials=True,allow_methods=["GET","POST","PUT","DELETE","OPTIONS"],allow_headers=["Authorization","Content-Type"])
def oid(value):
    if not ObjectId.is_valid(value): raise HTTPException(400,"Invalid ID")
    return ObjectId(value)
def user_public(doc): return {"id":str(doc["_id"]),"name":doc["name"],"email":doc["email"],"role":doc["role"]}
def job_public(d): return {"id":str(d["_id"]),"title":d["title"],"company":d["company"],"location":d["location"],"work_mode":d["work_mode"],"description":d["description"],"salary_min":d.get("salary_min"),"salary_max":d.get("salary_max"),"experience_min":d.get("experience_min",0),"experience_max":d.get("experience_max",70),"skills":d["skills"],"created_at":d["created_at"],"recruiter_id":str(d["recruiter_id"])}
@app.get("/")
async def root(): return {"name":settings.app_name,"docs":"/docs"}
@app.get("/health")
async def health(): return {"status":"ok"}
@app.get("/health/db")
async def db_health():
    try: return await ping_database()
    except PyMongoError as e: raise HTTPException(503,"MongoDB unavailable; check URI, database user and Network Access") from e
@app.post("/api/v1/auth/register",status_code=201)
async def register(data:Register):
    doc={"name":data.name.strip(),"email":str(data.email).lower(),"password_hash":hash_password(data.password),"role":data.role,"is_active":True,"created_at":datetime.now(timezone.utc)}
    try: result=await database.users.insert_one(doc)
    except DuplicateKeyError as e: raise HTTPException(409,"Email already registered") from e
    doc["_id"]=result.inserted_id
    return {"access_token":make_token(str(result.inserted_id),data.role),"token_type":"bearer","user":user_public(doc)}
@app.post("/api/v1/auth/login")
async def login(data:Login):
    u=await database.users.find_one({"email":str(data.email).lower()})
    if not u or not u.get("is_active") or not verify_password(data.password,u["password_hash"]): raise HTTPException(401,"Incorrect email or password")
    return {"access_token":make_token(str(u["_id"]),u["role"]),"token_type":"bearer","user":user_public(u)}
@app.get("/api/v1/auth/me")
async def me(u=Depends(current_user)): return u
@app.get("/api/v1/profile")
async def get_profile(u=Depends(current_user)):
    p=await database.profiles.find_one({"user_id":ObjectId(u["id"])})
    if not p: return {"name":u["name"],"location":"","education":"","experience_years":0,"preferred_work_mode":"any","skills":[]}
    p.pop("_id",None);p.pop("user_id",None);return p
@app.put("/api/v1/profile")
async def put_profile(data:ProfileUpdate,u=Depends(require_role("job_seeker"))):
    v=data.model_dump();v["name"]=v["name"].strip();uid=ObjectId(u["id"])
    await database.users.update_one({"_id":uid},{"$set":{"name":v["name"]}})
    await database.profiles.update_one({"user_id":uid},{"$set":{**v,"user_id":uid,"updated_at":datetime.now(timezone.utc)}},upsert=True)
    return v
@app.get("/api/v1/jobs")
async def jobs(limit:int=Query(50,ge=1,le=100),skip:int=Query(0,ge=0),q:str|None=None):
    query={"status":"published"}
    if q: query["$or"]=[{k:{"$regex":q[:80],"$options":"i"}} for k in ("title","company","location")]
    cur=database.jobs.find(query).sort("created_at",-1).skip(skip).limit(limit)
    return [job_public(d) async for d in cur]
@app.post("/api/v1/jobs",status_code=201)
async def create_job(data:JobCreate,u=Depends(require_role("recruiter"))):
    d=data.model_dump();d.update({"recruiter_id":ObjectId(u["id"]),"status":"published","created_at":datetime.now(timezone.utc),"updated_at":datetime.now(timezone.utc)})
    r=await database.jobs.insert_one(d);d["_id"]=r.inserted_id;return job_public(d)
@app.get("/api/v1/jobs/{job_id}")
async def get_job(job_id:str):
    d=await database.jobs.find_one({"_id":oid(job_id),"status":"published"})
    if not d: raise HTTPException(404,"Job not found")
    return job_public(d)
@app.put("/api/v1/jobs/{job_id}")
async def update_job(job_id:str,data:JobCreate,u=Depends(require_role("recruiter"))):
    i=oid(job_id);d=await database.jobs.find_one({"_id":i})
    if not d: raise HTTPException(404,"Job not found")
    if str(d["recruiter_id"])!=u["id"]: raise HTTPException(403,"You can only edit your own jobs")
    await database.jobs.update_one({"_id":i},{"$set":{**data.model_dump(),"updated_at":datetime.now(timezone.utc)}})
    return job_public(await database.jobs.find_one({"_id":i}))
@app.delete("/api/v1/jobs/{job_id}")
async def close_job(job_id:str,u=Depends(require_role("recruiter"))):
    i=oid(job_id);d=await database.jobs.find_one({"_id":i})
    if not d: raise HTTPException(404,"Job not found")
    if str(d["recruiter_id"])!=u["id"]: raise HTTPException(403,"You can only close your own jobs")
    await database.jobs.update_one({"_id":i},{"$set":{"status":"closed"}});return {"message":"Job closed"}
@app.get("/api/v1/recommendations")
async def recommendations(u=Depends(require_role("job_seeker"))):
    p=await database.profiles.find_one({"user_id":ObjectId(u["id"])}) or {"skills":[],"experience_years":0}
    results=[]
    async for d in database.jobs.find({"status":"published"}).sort("created_at",-1).limit(100):
        r=match([JobSkill.model_validate(s) for s in d["skills"]],[Skill.model_validate(s) for s in p.get("skills",[])])
        r["experience_match"]=d.get("experience_min",0)<=p.get("experience_years",0)<=d.get("experience_max",70);r["job"]=job_public(d);results.append(r)
    return sorted(results,key=lambda x:x["score"],reverse=True)
@app.post("/api/v1/jobs/{job_id}/match")
async def match_one(job_id:str,u=Depends(require_role("job_seeker"))):
    d=await database.jobs.find_one({"_id":oid(job_id),"status":"published"})
    if not d: raise HTTPException(404,"Job not found")
    p=await database.profiles.find_one({"user_id":ObjectId(u["id"])}) or {"skills":[]}
    return {"job":job_public(d),**match([JobSkill.model_validate(s) for s in d["skills"]],[Skill.model_validate(s) for s in p.get("skills",[])])}
@app.post("/api/v1/jobs/{job_id}/apply",status_code=201)
async def apply(job_id:str,u=Depends(require_role("job_seeker"))):
    i=oid(job_id);d=await database.jobs.find_one({"_id":i,"status":"published"})
    if not d: raise HTTPException(404,"Job not found")
    try: await database.applications.insert_one({"job_id":i,"user_id":ObjectId(u["id"]),"recruiter_id":d["recruiter_id"],"status":"submitted","applied_at":datetime.now(timezone.utc)})
    except DuplicateKeyError as e: raise HTTPException(409,"Already applied to this job") from e
    return {"message":"Application submitted","status":"submitted"}
@app.get("/api/v1/applications")
async def my_apps(u=Depends(require_role("job_seeker"))):
    out=[]
    async for a in database.applications.find({"user_id":ObjectId(u["id"])}).sort("applied_at",-1):
        j=await database.jobs.find_one({"_id":a["job_id"]})
        if j: out.append({"id":str(a["_id"]),"status":a["status"],"applied_at":a["applied_at"],"job":job_public(j)})
    return out
@app.get("/api/v1/recruiter/jobs")
async def my_jobs(u=Depends(require_role("recruiter"))):
    return [job_public(d) async for d in database.jobs.find({"recruiter_id":ObjectId(u["id"])}).sort("created_at",-1)]
@app.get("/api/v1/recruiter/jobs/{job_id}/applications")
async def applicants(job_id:str,u=Depends(require_role("recruiter"))):
    i=oid(job_id);j=await database.jobs.find_one({"_id":i,"recruiter_id":ObjectId(u["id"])})
    if not j: raise HTTPException(404,"Job not found or not owned by you")
    out=[]
    async for a in database.applications.find({"job_id":i}).sort("applied_at",-1):
        c=await database.users.find_one({"_id":a["user_id"]});p=await database.profiles.find_one({"user_id":a["user_id"]}) or {}
        if c: out.append({"id":str(a["_id"]),"status":a["status"],"candidate":{"name":c["name"],"email":c["email"],"location":p.get("location",""),"experience_years":p.get("experience_years",0),"skills":p.get("skills",[])}})
    return out

@app.get("/api/v1/recruiter/jobs/{job_id}/matches")
async def recruiter_job_matches(job_id:str,u=Depends(require_role("recruiter"))):
    """Rank job seekers by skill coverage for a job owned by the signed-in recruiter."""
    i=oid(job_id)
    job=await database.jobs.find_one({"_id":i,"recruiter_id":ObjectId(u["id"])})
    if not job: raise HTTPException(404,"Job not found or not owned by you")
    requirements=[JobSkill.model_validate(s) for s in job.get("skills",[])]
    out=[]
    async for candidate in database.users.find({"role":"job_seeker","is_active":True,"_id":{"$ne":ObjectId(u["id"])}}):
        profile=await database.profiles.find_one({"user_id":candidate["_id"]})
        if not profile: continue
        candidate_skills=[Skill.model_validate(s) for s in profile.get("skills",[])]
        result=match(requirements,candidate_skills)
        experience=float(profile.get("experience_years",0) or 0)
        exp_min=float(job.get("experience_min",0) or 0); exp_max=float(job.get("experience_max",70) or 70)
        result["experience_match"]=exp_min<=experience<=exp_max
        result["candidate"]={"id":str(candidate["_id"]),"name":candidate.get("name","Candidate"),"email":candidate.get("email",""),"location":profile.get("location",""),"education":profile.get("education",""),"experience_years":experience,"preferred_work_mode":profile.get("preferred_work_mode","any"),"skills":profile.get("skills",[])}
        out.append(result)
    return sorted(out,key=lambda x:(x["score"],x["experience_match"]),reverse=True)
