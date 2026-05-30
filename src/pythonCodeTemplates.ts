export const PYTHON_TEMPLATES = {
  "config.py": `import os
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
`,

  "schemas.py": `from pydantic import BaseModel, Field, HttpUrl
from typing import List, Dict, Any, Optional
from datetime import datetime
from enum import Enum

class AssetType(str, Enum):
    VIDEO = "video"
    AUDIO = "audio"
    IMAGE = "image"
    STORYBOARD_BRIEF = "storyboard_brief"

class CampaignStatus(str, Enum):
    PROCESSING = "processing"
    SIMULATING = "simulating"
    COMPLETED = "completed"
    FAILED = "failed"

class AgentRole(str, Enum):
    CUSTOMER_PERSONA = "customer_persona"
    SAFETY_INSPECTOR = "safety_inspector"
    JUDGE = "judge"

class EmotionalVectors(BaseModel):
    excitement: float = Field(..., description="Intensity (0.0 - 1.0) of excitement stimulated", ge=0.0, le=1.0)
    trust: float = Field(..., description="Intensity (0.0 - 1.0) of security stimulated", ge=0.0, le=1.0)
    insecurity: float = Field(..., description="Intensity (0.0 - 1.0) of FOMO stimulated", ge=0.0, le=1.0)
    urgency: float = Field(..., description="Intensity (0.0 - 1.0) of pushiness stimulated", ge=0.0, le=1.0)

class StructuredMetadata(BaseModel):
    marketing_intent: str = Field(..., description="Intent eg: humor, nostalgia, aspiration, fear-mongering")
    target_demographic_inference: str = Field(..., description="Inferred segment eg: Urban Gen-Z, Rural Home-Makers")
    emotional_vectors: EmotionalVectors
    cultural_anchors: List[str] = Field(..., description="Local Bangladeshi refs like 'Rickshaw Art'")
    bangla_codeswitching_ratio: float = Field(...)

class RedTeamSuggestion(BaseModel):
    alert_type: str = Field(...)
    severity: str = Field(...)
    issue_description: str = Field(...)
    actionable_remedy: str = Field(...)

class SimulationResults(BaseModel):
    success_rate: float = Field(...)
    safety_score: float = Field(...)
    market_alignment_index: float = Field(...)
    red_team_suggestions: List[RedTeamSuggestion] = []

class CampaignCreate(BaseModel):
    title: str
    asset_type: AssetType
    brief_text: str

class CampaignResponse(BaseModel):
    id: str = Field(..., alias="_id")
    user_id: str
    title: str
    status: CampaignStatus
    structured_metadata: Optional[StructuredMetadata] = None
    simulation_results: Optional[SimulationResults] = None
    created_at: datetime
`,

  "services/multimodal.py": `import asyncio
import logging
from typing import Dict, Any, Tuple
import httpx
from ..config import settings
from ..schemas import StructuredMetadata, EmotionalVectors

logger = logging.getLogger("adversary.multimodal")

class MultimodalProcessingService:
    @staticmethod
    async def decompose_media(asset_url: str, asset_type: str) -> Tuple[bytes, bytes]:
        """Decomposes a video/audio file into frames and stream audio."""
        await asyncio.sleep(2.0)
        return b"frame_data", b"audio_data"

    @classmethod
    async def run_whisper_transcription(cls, audio_bytes: bytes) -> Dict[str, Any]:
        """Invokes Whisper API primed for detecting Bangla/Banglish."""
        if not settings.OPENAI_API_KEY:
            return {
                "transcription": "Ei Eid-e amader special discount offer miss korben na!",
                "language_detected": "Banglish (Bangla/English blend)"
            }
        # Production REST endpoint wrapper...
        return {"transcription": "transcribed_text"}

    @classmethod
    async def run_gemini_vision(cls, frame_bytes: bytes, user_brief: str) -> Dict[str, Any]:
        """Invokes Gemini Vision Model (gemini-3.5-flash) to extract visual anchors."""
        if not settings.GEMINI_API_KEY:
            return {"raw_vision_analysis": "Simulated rickshaw-aesthetic background"}
        # API post structured...
        return {"raw_vision_analysis": "gemini_frame_meta"}

    @classmethod
    async def run_claude_synthesis(cls, transcription_data: Dict[str, Any], vision_data: Dict[str, Any], brief_text: str) -> StructuredMetadata:
        """Synthesizes raw feeds through Claude reasoning system."""
        return StructuredMetadata(
            marketing_intent="Organic emotional bonding with slight nostalgia",
            target_demographic_inference="Urban Gen-Z",
            emotional_vectors=EmotionalVectors(excitement=0.85, trust=0.75, insecurity=0.20, urgency=0.10),
            cultural_anchors=["Tea-stall conversations (Tong)", "Rickshaw Art"],
            bangla_codeswitching_ratio=0.4
        )
`,

  "services/orchestrator.py": `import asyncio
import json
from datetime import datetime
from ..config import settings, DatabaseProvider
from ..schemas import StructuredMetadata, SimulationResults, RedTeamSuggestion, CampaignStatus

class MarketSwarmOrchestrator:
    @staticmethod
    async def fetch_graphrag_context(demographics: str, cultural_anchors: list) -> dict:
        """Pre-fetch Neo4j graph nodes early to eliminate mid-debate DB latency."""
        await asyncio.sleep(1.2)
        return {"taboos": "Do not fake accent or mock rickshaw pullers to avoid privilege backlash."}

    @classmethod
    async def run_agent_debate_simulation(cls, campaign_id: str, metadata: StructuredMetadata, brief_text: str, graphrag_ctx: dict):
        """Simulates debate swarms between Consumer Personas and Strict Safety Inspector."""
        redis_inst = await DatabaseProvider.get_redis()
        # Triggering debate steps and publishing updates to Redis channel sim_stream:campaign_id...
        pass
`,

  "routes.py": `from fastapi import APIRouter, UploadFile, File, Form, Depends, HTTPException, BackgroundTasks, WebSocket, WebSocketDisconnect
from .config import DatabaseProvider
from .schemas import CampaignStatus
from .services.multimodal import MultimodalProcessingService

router = APIRouter(prefix="/api/v1")

@router.post("/campaigns/upload")
async def upload_campaign_asset(background_tasks: BackgroundTasks, title: str = Form(...), brief_text: str = Form(...)):
    # Create draft campaign inside MongoDB and schedule async processing worker...
    return {"status": "Accepted", "campaign_id": "cmp_123"}

@router.websocket("/simulations/{campaign_id}/stream")
async def stream_simulation_logs(websocket: WebSocket, campaign_id: str):
    await websocket.accept()
    # Read live debate logs from Redis channel pubsub and broadcast to client...
    pass
`
};
