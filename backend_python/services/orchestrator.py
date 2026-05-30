import asyncio
import json
import logging
from datetime import datetime
from typing import Dict, Any, List
from ..config import settings, DatabaseProvider
from ..schemas import StructuredMetadata, SimulationResults, RedTeamSuggestion, CampaignStatus

logger = logging.getLogger("adversary.orchestrator")

class MarketSwarmOrchestrator:
    
    @staticmethod
    async def fetch_graphrag_context(demographics: str, cultural_anchors: List[str]) -> Dict[str, Any]:
        """
        Pre-fetch context to bypass database lookups during agent debates.
        Simulates querying historical Bangladeshi social sentiment, taboos, or trending events 
        (e.g., from a Neo4j Knowledge Graph connecting consumer backlash events, 
        religious sentiments, and target sensitivity variables).
        """
        logger.info(f"GraphRAG Graph Query: Fetching cultural sentiment nodes for '{demographics}' and anchors {cultural_anchors}...")
        await asyncio.sleep(1.2) # Avoid mid-debate lookups completely by caching this early
        
        # Highly relevant typical social flashpoints in the Bangladeshi market:
        context_responses = {
            "Urban Gen-Z": {
                "social_sentiment": "High resonance with authentic local memes, extreme intolerance for corporate 'cringe' or poorly constructed slang (overused Banglish). Actively criticizes tokenistic representations on Facebook/TikTok.",
                "taboos": "Do not fake accents or mock street vendors or rikshaw pullers, which causes immediate 'social privilege' backlash.",
                "recent_trends": "Rickshaw-aesthetic retro streetwear, deep affection for vintage local rock bands, addas at Dhanmondi/Banani coffee joints."
            },
            "Rural Home-makers": {
                "social_sentiment": "High priority on religious alignment, family-inclusive stories, and respect for conventional hierarchy and elders. Easily put off by perceived westernization.",
                "taboos": "Classism, mocking of local family values, disrespectful gestures by women or children, or provocative clothing.",
                "recent_trends": "Joint family household dynamics, regional pride, watching serial soap operas on YouTube or TV during spare hours."
            },
            "Corporate Professionals": {
                "social_sentiment": "Aspiration, time poverty, concerns about commuting, financial stability, and looking refined. Highly responsive to themes of 'hustle' matched with self-care.",
                "taboos": "Promoting unethical long work hours without compensation, mocking traditional professions, or using extremely raw rural dialects mockingly.",
                "recent_trends": "LinkedIn posting cultures, weekend escapes from Dhaka gridlock, digital payment platforms (MFS like bKash/Nagad) convenience."
            }
        }
        
        # Match or fallback
        segment_key = "Urban Gen-Z"
        for key in context_responses.keys():
            if key.lower() in demographics.lower():
                segment_key = key
                break
                
        return {
            "graphrag_knowledge_base_segment": context_responses[segment_key],
            "queried_anchors_cache_status": "HIT",
            "cross_referenced_backlashes": [
                "2024 Beverage campaign cancelled due to insensitive social satire",
                "2023 Eid drama backlash due to crude portrayal of rural migrants in Dhaka"
            ]
        }

    @classmethod
    async def run_agent_debate_simulation(
        cls, 
        campaign_id: str, 
        metadata: StructuredMetadata, 
        brief_text: str,
        graphrag_ctx: Dict[str, Any]
    ) -> CampaignStatus:
        """
        Runs the multi-agent debate stream simulating three distinct personas:
        1. Resident Consumer Persona (e.g., Sifat is a Dhaka 22-year-old, or Rabeya is a 45-year-old Rural mom)
        2. Strict Safety Inspector (Red-Teaming taboos: class-disrepute, religious sentiments, cultural misrepresentation)
        3. Judge/Cultural Synthesizer (Assesses scores and builds actionable alternatives)
        
        Streams raw updates directly to Redis pub/sub queue so the WebSockets server can broadcast to the UI immediately.
        """
        redis_inst = await DatabaseProvider.get_redis()
        mongo_db = DatabaseProvider.get_mongo_db()
        channel_name = f"sim_stream:{campaign_id}"
        
        logger.info(f"Initiating Agent Debate for Campaign: {campaign_id}")
        
        # Define the agent personas
        demographics = metadata.target_demographic_inference
        if "Rural" in demographics:
            consumer = {
                "name": "Rabeya (Rural Homemaker, 42, Jamalpur)",
                "prompt": "You are conservative, deep-seated family values, easily offended by provocative visual elements, value respect to elders."
            }
        elif "Corporate" in demographics:
            consumer = {
                "name": "Tanvir (Corporate Executive, 31, Dhaka)",
                "prompt": "You represent busy middle-class aspirational professionals. You value convenience, polished visuals, but dislike forced sentimentality."
            }
        else: # Default Gen-Z
            consumer = {
                "name": "Sifat (University Student, 21, Dhaka)",
                "prompt": "You are an outspoken Urban Gen-Z, love humor/memes, appreciate authentic regional aesthetics but hate when brands talk down to children or use fake trends."
            }
            
        safety_officer = {
            "name": "Shamsur Rahman (Strict Cultural & Legal Inspector)",
            "prompt": "Red-team the PR disaster risks. Watch for: negative depiction of minorities or underprivileged workers, religious insensitivities, classism, and copyright violations."
        }
        
        judge = {
            "name": "Ananya Chowdhury (Ad Executive & Audience Judge)",
            "prompt": "Synthesize debate logs, give rating indices (success rate, safety score, local alignment index), and compile solutions."
        }

        # Step-by-step debate flow mapping
        debate_steps = [
            (
                consumer["name"], 
                "customer_persona",
                f"Assessing campaign: '{brief_text}'. As {consumer['name']}, I think the overall feeling is..."
            ),
            (
                safety_officer["name"],
                "safety_inspector",
                f"Inspector Alert: Let me cross-verify this with typical Bangladeshi sensitivities. GraphRAG warns of '{graphrag_ctx['graphrag_knowledge_base_segment']['taboos']}'..."
            ),
            (
                consumer["name"],
                "customer_persona",
                "Interesting inspector! If that element is kept, we will face critical trolling. Most people in our community group would boycot..."
            ),
            (
                safety_officer["name"],
                "safety_inspector",
                "Based on the dialogue and transcription, the wording chosen is critical. The phrasing could be seen as condescending to rickshaw-pullers, which is a major class-disrespect disaster trigger in Dhaka."
            ),
            (
                judge["name"],
                "judge",
                "Synthesis complete. Calculating ultimate safety indexes and outlining actionable remedies to preserve core budget."
            )
        ]
        
        # Execute debate steps with incremental streaming simulating processing
        full_logs = []
        for i, (agent_name, role, msg_template) in enumerate(debate_steps):
            await asyncio.sleep(3.0) # Simulating active model deliberation
            
            # In production, we send prompt contents to Gemini / Claude Chat context
            msg_content = msg_template
            # Add dynamic context from metadata in simulation
            if i == 0:
                msg_content += f" The cultural anchors representing {metadata.cultural_anchors} feel reasonable, but the excitement index of {metadata.emotional_vectors.excitement} seems intense!"
            elif i == 4:
                msg_content += " Recommending safety changes to the script. Success rate estimate: 78%. Safety score: 65% due to classism concern. Changing dialogue to friendly banter raises Safety to 95%."

            log_entry = {
                "campaign_id": campaign_id,
                "agent_name": agent_name,
                "role": role,
                "message": msg_content,
                "timestamp": datetime.utcnow().isoformat()
            }
            
            # Save log to DB
            await mongo_db["simulation_logs"].insert_one(log_entry)
            
            # Publish to Redis Pub/Sub for WebSockets connection
            await redis_inst.publish(channel_name, json.dumps(log_entry))
            logger.info(f"Dispatched debate update to channel {channel_name} from {agent_name}")
            full_logs.append(log_entry)

        # 3. Calculate and compile the absolute results
        await asyncio.sleep(2.0)
        
        success = 72.0 if "Rural" in demographics else (84.0 if "Gen-Z" in demographics else 76.0)
        safety_s = 65.0 # Pre-remedy
        alignment = 90.0 if len(metadata.cultural_anchors) >= 2 else 70.0
        
        remedies = [
            RedTeamSuggestion(
                alert_type="Class Integration Insight",
                severity="High",
                issue_description="The roadside tea stall scene depicts the server as caricature, which risks evoking elitist classism backlash on Bangladeshi social media.",
                actionable_remedy="Revise script so the protagonist interacts respectfully (e.g. sharing mutual respect adda) with the roadside server to evoke warm trust."
            ),
            RedTeamSuggestion(
                alert_type="Code-Switching Redundancy",
                severity="Medium",
                issue_description="Overuse of heavy English tech terms like 'discount-retrieval optimization' makes the commercial look alienating and unrelatable.",
                actionable_remedy="Translate complex commercial terms into simple organic Banglish or colloquial standard Bangla terms like 'bepok chhar'."
            )
        ]
        
        sim_results = SimulationResults(
            success_rate=success,
            safety_score=safety_s,
            market_alignment_index=alignment,
            red_team_suggestions=remedies
        )

        # Update Campaign record inside MongoDB database
        await mongo_db["campaigns"].update_one(
            {"_id": campaign_id},
            {
                "$set": {
                    "status": CampaignStatus.COMPLETED,
                    "simulation_results": sim_results.model_dump(),
                    "updated_at": datetime.utcnow().isoformat()
                }
            }
        )
        
        # Publish completion notification
        completion_update = {
            "campaign_id": campaign_id,
            "agent_name": "System Orchestrator",
            "role": "judge",
            "message": "____FINISHED____",
            "timestamp": datetime.utcnow().isoformat()
        }
        await redis_inst.publish(channel_name, json.dumps(completion_update))
        
        logger.info(f"Campaign {campaign_id} simulation complete.")
        return CampaignStatus.COMPLETED
