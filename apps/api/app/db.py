from pymongo import AsyncMongoClient
from app.core.config import settings
client = AsyncMongoClient(settings.mongodb_uri, serverSelectionTimeoutMS=7000)
database = client[settings.mongodb_database]
async def ping_database():
    await client.admin.command("ping")
    return {"connected": True, "database": settings.mongodb_database}
async def close_database(): await client.close()
