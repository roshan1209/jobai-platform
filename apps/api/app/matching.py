from app.schemas import JobSkill, Skill

def match(requirements: list[JobSkill], skills: list[Skill]):
    candidate={s.name.strip().casefold():s.proficiency for s in skills}; score=0.0; matched=[]; improve=[]; missing=[]
    for req in requirements:
        level=candidate.get(req.name.strip().casefold(),0); ratio=min(level/req.minimum_level,1.0) if level else 0.0; part=req.weight*ratio; score+=part
        item={"name":req.name,"required_level":req.minimum_level,"candidate_level":level or None,"requirement_type":req.requirement_type,"weight":req.weight,"contribution":round(part,2)}
        (missing if not level else improve if level<req.minimum_level else matched).append(item)
    score=round(score,2); label="Excellent match" if score>=85 else "Good match" if score>=70 else "Partial match" if score>=50 else "Low match"
    return {"score":score,"label":label,"matched_skills":matched,"skills_to_improve":improve,"missing_skills":missing,"explanation":f"{len(matched)} skills meet the minimum, {len(improve)} need improvement, {len(missing)} are missing. Score is weighted skill coverage, not a hiring probability."}
