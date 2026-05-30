from pydantic import BaseModel, Field, HttpUrl
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
    trust: float = Field(..., description="Intensity (0.0 - 1.0) of security and family bonding stimulated", ge=0.0, le=1.0)
    insecurity: float = Field(..., description="Intensity (0.0 - 1.0) of FOMO or status insecurity stimulated", ge=0.0, le=1.0)
    urgency: float = Field(..., description="Intensity (0.0 - 1.0) of pushiness/scarcity stimulated", ge=0.0, le=1.0)

class StructuredMetadata(BaseModel):
    marketing_intent: str = Field(..., description="Intent eg: humor, nostalgia, aspiration, fear-mongering")
    target_demographic_inference: str = Field(..., description="Inferred segment eg: Urban Gen-Z, Rural Home-Makers, Corporate Professionals")
    emotional_vectors: EmotionalVectors
    cultural_anchors: List[str] = Field(..., description="Local Bangladeshi refs like 'Rickshaw Art', 'Tea-stall conversation', 'Pohela Boishakh'")
    bangla_codeswitching_ratio: float = Field(..., description="Percentage estimate of Banglish / code-switching language in asset")

class RedTeamSuggestion(BaseModel):
    alert_type: str = Field(..., description="Category: e.g., 'Religious Sentiment', 'Class Disrespect', 'Gender Bias', 'Dialect Misrepresentation'")
    severity: str = Field(..., description="Severity level: High, Medium, Low")
    issue_description: str = Field(..., description="What specific element might trigger negative backlash in Bangladesh")
    actionable_remedy: str = Field(..., description="How to modify the storyboard or script to preserve alignment")

class SimulationResults(BaseModel):
    success_rate: float = Field(..., description="Overall score showing predicted positive market engagement (0% - 100%)")
    safety_score: float = Field(..., description="Score where 100% is risk-free and lower score indicates critical PR risks")
    market_alignment_index: float = Field(..., description="Cultural resonance alignment factor for Bangladeshi audiences")
    red_team_suggestions: List[RedTeamSuggestion] = []

class CampaignCreate(BaseModel):
    title: str = Field(..., min_length=2, max_length=100)
    asset_type: AssetType
    brief_text: str = Field(..., description="Campaign details, voiceover scripts, or visual descriptions")

class CampaignResponse(BaseModel):
    id: str = Field(..., alias="_id")
    user_id: str
    title: str
    asset_url: Optional[str] = None
    asset_type: AssetType
    status: CampaignStatus
    structured_metadata: Optional[StructuredMetadata] = None
    simulation_results: Optional[SimulationResults] = None
    created_at: datetime

    class Config:
        populate_by_name = True
        json_encoders = {datetime: lambda v: v.isoformat()}

class SimulationLogSchema(BaseModel):
    campaign_id: str
    agent_name: str
    role: AgentRole
    message: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)
