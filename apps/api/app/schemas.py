from typing import Literal
from pydantic import BaseModel, EmailStr, Field, model_validator
Role=Literal["job_seeker","recruiter"]
class Register(BaseModel):
    name:str=Field(min_length=2,max_length=100); email:EmailStr; password:str=Field(min_length=8,max_length=128); role:Role
class Login(BaseModel): email:EmailStr; password:str=Field(min_length=1,max_length=128)
class Skill(BaseModel): name:str=Field(min_length=1,max_length=80); proficiency:int=Field(ge=1,le=4)
class ProfileUpdate(BaseModel):
    name:str=Field(min_length=2,max_length=100); location:str=""; education:str=""; experience_years:float=Field(default=0,ge=0,le=70); preferred_work_mode:Literal["onsite","hybrid","remote","any"]="any"; skills:list[Skill]=Field(default_factory=list,max_length=100)
    @model_validator(mode="after")
    def unique(self):
        names=[s.name.strip().casefold() for s in self.skills]
        if len(names)!=len(set(names)): raise ValueError("Skill names must be unique")
        return self
class JobSkill(BaseModel): name:str=Field(min_length=1,max_length=80); minimum_level:int=Field(ge=1,le=4); requirement_type:Literal["required","preferred"]="required"; weight:float=Field(ge=0,le=100)
class JobCreate(BaseModel):
    title:str=Field(min_length=2,max_length=120); company:str=Field(min_length=2,max_length=120); location:str=Field(min_length=2,max_length=120); work_mode:Literal["onsite","hybrid","remote"]="onsite"; description:str=Field(min_length=10,max_length=10000); salary_min:int|None=Field(default=None,ge=0); salary_max:int|None=Field(default=None,ge=0); experience_min:float=Field(default=0,ge=0,le=70); experience_max:float=Field(default=70,ge=0,le=70); skills:list[JobSkill]=Field(min_length=1,max_length=50)
    @model_validator(mode="after")
    def validate_job(self):
        if abs(sum(s.weight for s in self.skills)-100)>0.01: raise ValueError("Skill weights must sum to 100")
        names=[s.name.strip().casefold() for s in self.skills]
        if len(names)!=len(set(names)): raise ValueError("Skill names must be unique")
        if self.salary_min is not None and self.salary_max is not None and self.salary_min>self.salary_max: raise ValueError("Minimum salary exceeds maximum")
        if self.experience_min>self.experience_max: raise ValueError("Minimum experience exceeds maximum")
        return self
