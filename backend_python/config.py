import os
from pydantic_settings import BaseSettings, SettingsConfigDict
from motor.motor_asyncio import AsyncIOMotorClient
import redis.asyncio as aioredis
from typing import Optional

class Settings(BaseSettings):
    # MongoDB Config
    MONGO_URI: str = "mongodb://localhost:27017"
    DATABASE_NAME: str = "adversary_db"
    
    # Redis Config
    REDIS_URL: str = "redis://localhost:6379/0"
    
    # Supabase Configuration (JWT verification)
    SUPABASE_JWT_SECRET: str = "your-supabase-jwt-secret-key"
    
    # AI SDK Keys
    GEMINI_API_KEY: str = ""
    CLAUDE_API_KEY: str = ""
    WHISPER_API_KEY: str = "" # Optional if using Gemini or OpenAI for Whisper
    OPENAI_API_KEY: str = ""  
    
    # Cloud Storage (AWS S3 or Supabase Storage bucket)
    STORAGE_BUCKET_NAME: str = "adversary-multimodal-assets"
    AWS_ACCESS_KEY_ID: Optional[str] = None
    AWS_SECRET_ACCESS_KEY: Optional[str] = None
    AWS_REGION: str = "ap-southeast-1" # Southeast Asia close to Bangladesh
    
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

# Load settings singleton
settings = Settings()

# Motor (MongoDB) Clients Initialization
class DatabaseProvider:
    _mongo_client: Optional[AsyncIOMotorClient] = None
    _redis_client: Optional[aioredis.Redis] = None

    @classmethod
    def get_mongo_db(cls):
        if cls._mongo_client is None:
            cls._mongo_client = AsyncIOMotorClient(settings.MONGO_URI)
        return cls._mongo_client[settings.DATABASE_NAME]

    @classmethod
    async def get_redis(cls) -> aioredis.Redis:
        if cls._redis_client is None:
            cls._redis_client = await aioredis.from_url(
                settings.REDIS_URL, 
                encoding="utf-8", 
                decode_responses=True
            )
        return cls._redis_client

    @classmethod
    async def close_connections(cls):
        if cls._mongo_client:
            cls._mongo_client.close()
            cls._mongo_client = None
        if cls._redis_client:
            await cls._redis_client.close()
            cls._redis_client = None
