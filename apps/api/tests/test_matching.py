from app.matching import match
from app.schemas import JobSkill, Skill
def test_match_100():
 r=match([JobSkill(name="Python",minimum_level=2,requirement_type="required",weight=100)],[Skill(name="Python",proficiency=4)])
 assert r["score"]==100
def test_missing_skill():
 r=match([JobSkill(name="React",minimum_level=3,requirement_type="required",weight=100)],[])
 assert r["score"]==0 and r["missing_skills"][0]["name"]=="React"
