from bson import ObjectId
from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.db import database
from app.security import read_token
bearer = HTTPBearer(auto_error=False)


async def current_user(creds: HTTPAuthorizationCredentials | None = Depends(bearer)):
    if not creds:
        raise HTTPException(401, "Sign in required")
    payload = read_token(creds.credentials)
    uid = payload.get("sub", "")
    if not ObjectId.is_valid(uid):
        raise HTTPException(401, "Invalid token subject")
    user = await database.users.find_one({"_id": ObjectId(uid), "is_active": True})
    if not user:
        raise HTTPException(401, "User not found or disabled")
    return {"id": str(user["_id"]), "name": user["name"], "email": user["email"], "role": user["role"]}


def require_role(*roles):
    async def check(user=Depends(current_user)):
        if user["role"] not in roles:
            raise HTTPException(403, "Insufficient permissions")
        return user
    return check
