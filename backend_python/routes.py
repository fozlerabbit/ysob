from fastapi import APIRouter, UploadFile, File, Form, Depends, HTTPException, BackgroundTasks, WebSocket, WebSocketDisconnect, status
from typing import Optional, Dict, Any
from datetime import datetime
import uuid
import json
import asyncio

from .config import DatabaseProvider
from .schemas import CampaignResponse, CampaignStatus, StructuredMetadata, SimulationResults
from .services.multimodal import MultimodalProcessingService
from .services.orchestrator import MarketSwarmOrchestrator

router = APIRouter(prefix="/api/v1")

# Placeholder: Simple JWT Validation dependency using Supabase/Auth secret
async def validate_supabase_jwt(token: Optional[str] = None) -> str:
    """
    Validates Supabase JWT Token from authorization header.
    Returns the user_id upon successful verification.
    """
    if not token:
        # For demonstration purposes, fallback to a mock authenticated user
        return "usr_bd_9918"
    # Actually perform jwt.decode(token, secret, algorithms=["HS256"]) in production
    return "usr_bd_9918"

async def background_campaign_pipeline(campaign_id: str, asset_url: str, asset_type: str, brief_text: str):
    """
    Asynchronous background worker executing:
    1. Multimodal core pipeline processing
    2. Context pre-fetch (GraphRAG)
    3. Multi-agent debate sim orchestration
    Outputs are persisted into MongoDB and streamed to listeners.
    """
    mongo_db = DatabaseProvider.get_mongo_db()
    try:
        # Step 1: Multimodal analysis extraction (Whisper + Gemini parallel processing)
        metadata: StructuredMetadata = await MultimodalProcessingService.process_campaign_assets(
            asset_url=asset_url,
            asset_type=asset_type,
            brief_text=brief_text
        )
        
        # Save structural metadata to campaign DB
        await mongo_db["campaigns"].update_one(
            {"_id": campaign_id},
            {
                "$set": {
                    "status": CampaignStatus.SIMULATING,
                    "structured_metadata": metadata.model_dump(),
                }
            }
        )

        # Step 2: Context Pre-Fetch (GraphRAG connecting trends and taboos)
        graphrag_ctx = await MarketSwarmOrchestrator.fetch_graphrag_context(
            demographics=metadata.target_demographic_inference,
            cultural_anchors=metadata.cultural_anchors
        )

        # Step 3: Run the Agent Swarm debate simulation (Streams real-time logs via Redis)
        await MarketSwarmOrchestrator.run_agent_debate_simulation(
            campaign_id=campaign_id,
            metadata=metadata,
            brief_text=brief_text,
            graphrag_ctx=graphrag_ctx
        )

    except Exception as e:
        await mongo_db["campaigns"].update_one(
            {"_id": campaign_id},
            {"$set": {"status": CampaignStatus.FAILED, "error_log": str(e)}}
        )

@router.post("/campaigns/upload", status_code=status.HTTP_202_ACCEPTED)
async def upload_campaign_asset(
    background_tasks: BackgroundTasks,
    title: str = Form(...),
    asset_type: str = Form("image"), # image, video, audio, storyboard_brief
    brief_text: str = Form(...),
    file: Optional[UploadFile] = File(None),
    user_id: str = Depends(validate_supabase_jwt)
):
    """
    Accepts campaign definitions and ad asset files.
    Saves campaign state, and triggers the background processing loop.
    Returns 202 ACCEPTED with campaign_id to prevent browser response timeouts.
    """
    campaign_id = str(uuid.uuid4())
    mongo_db = DatabaseProvider.get_mongo_db()
    
    # Simulate storing files onto Cloud Storage S3 / Supabase bucket
    asset_url = f"https://storage.googleapis.com/adversary-assets/{campaign_id}_{file.filename}" if file else "https://storage.googleapis.com/adversary-assets/default_brief.txt"
    
    # Save base draft campaign record back into DB
    campaign_doc = {
        "_id": campaign_id,
        "user_id": user_id,
        "title": title,
        "asset_url": asset_url,
        "asset_type": asset_type,
        "status": CampaignStatus.PROCESSING,
        "structured_metadata": None,
        "simulation_results": None,
        "created_at": datetime.utcnow().isoformat()
    }
    await mongo_db["campaigns"].insert_one(campaign_doc)
    
    # Trigger non-blocking async background workflow
    background_tasks.add_task(
        background_campaign_pipeline, 
        campaign_id=campaign_id,
        asset_url=asset_url, 
        asset_type=asset_type, 
        brief_text=brief_text
    )
    
    return {
        "status": "Accepted",
        "message": "Campaign asset upload initialized successfully. Multimodal extraction runs in parallel background processes.",
        "campaign_id": campaign_id,
        "estimated_duration_seconds": 30
    }

@router.get("/campaigns/{campaign_id}/status")
async def get_campaign_status(campaign_id: str, user_id: str = Depends(validate_supabase_jwt)):
    """
    Retrieves current analysis state of the Campaign.
    """
    mongo_db = DatabaseProvider.get_mongo_db()
    doc = await mongo_db["campaigns"].find_one({"_id": campaign_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Campaign not found")
    return {
        "campaign_id": campaign_id,
        "status": doc.get("status"),
        "has_metadata": doc.get("structured_metadata") is not None,
        "has_results": doc.get("simulation_results") is not None
    }

@router.get("/campaigns/{campaign_id}/dashboard")
async def get_campaign_dashboard(campaign_id: str, user_id: str = Depends(validate_supabase_jwt)):
    """
    Fetches the finalized evaluation parameters: Success Rate, Safety Score, Market Alignment Index,
    and associated actionable Red-team modifications from the database.
    """
    mongo_db = DatabaseProvider.get_mongo_db()
    doc = await mongo_db["campaigns"].find_one({"_id": campaign_id})
    if not doc:
         raise HTTPException(status_code=404, detail="Campaign not found")
         
    if doc.get("status") != CampaignStatus.COMPLETED:
        raise HTTPException(
            status_code=400, 
            detail=f"Campaign is not finalized yet. Current state is: '{doc.get('status')}'"
        )
        
    return {
        "campaign_id": campaign_id,
        "title": doc.get("title"),
        "asset_type": doc.get("asset_type"),
        "structured_metadata": doc.get("structured_metadata"),
        "simulation_results": doc.get("simulation_results"),
        "created_at": doc.get("created_at")
    }

@router.websocket("/simulations/{campaign_id}/stream")
async def stream_simulation_logs(websocket: WebSocket, campaign_id: str):
    """
    WebSocket server pushing agent-debate logs in real-time as they are broadcast
    from the MarketSwarmOrchestrator's execution loop.
    """
    await websocket.accept()
    redis_inst = await DatabaseProvider.get_redis()
    pubsub = redis_inst.pubsub()
    channel_name = f"sim_stream:{campaign_id}"
    
    await pubsub.subscribe(channel_name)
    logger.info(f"WebSocket client connected and subscribed to {channel_name}")
    
    try:
        # Pre-populate connection with existing DB logs if any
        mongo_db = DatabaseProvider.get_mongo_db()
        cursor = mongo_db["simulation_logs"].find({"campaign_id": campaign_id}).sort("timestamp", 1)
        async for log in cursor:
            # Send historic logs so page refresh is immune to message loss
            log["_id"] = str(log["_id"])
            await websocket.send_json(log)
            
        # Stream active incoming Redis messages
        while True:
            # Yield control short duration to prevent event loop choking
            message = await pubsub.get_message(ignore_subscribe_messages=True, timeout=1.0)
            if message:
                log_data = json.loads(message["data"])
                if log_data.get("message") == "____FINISHED____":
                    await websocket.send_json({"system": "Simulation completed successfully.", "done": True})
                    break
                await websocket.send_json(log_data)
            await asyncio.sleep(0.1)
            
    except WebSocketDisconnect:
        logger.info(f"WebSocket disconnected for Campaign: {campaign_id}")
    except Exception as e:
        logger.error(f"WebSocket failure: {str(e)}")
    finally:
        await pubsub.unsubscribe(channel_name)
        await websocket.close()
