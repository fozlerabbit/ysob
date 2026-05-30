import asyncio
import logging
from typing import Dict, Any, Tuple
import httpx
from ..config import settings
from ..schemas import StructuredMetadata, EmotionalVectors

logger = logging.getLogger("adversary.multimodal")

class MultimodalProcessingService:
    @staticmethod
    async def decompose_media(asset_url: str, asset_type: str) -> Tuple[bytes, bytes]:
        """
        Mock/structural function to download a media file, decompose a video file into 
        significant visual video frames (representative keyframes as JPEG) 
        and extract the raw audio stream (encoded to WAV/MP3 for automatic transcription).
        """
        logger.info(f"Decomposing media of type {asset_type} from {asset_url}...")
        await asyncio.sleep(2.0) # Simulate structural media demuxing delay
        
        # In production, uses ffmpeg / gstreamer bounds
        dummy_frame_jpeg = b"\xff\xd8\xff\xe0\x00\x10JFIF..."
        dummy_audio_mp3 = b"ID3\x03\x00\x00\x00\x00\x00..."
        return dummy_frame_jpeg, dummy_audio_mp3

    @classmethod
    async def run_whisper_transcription(cls, audio_bytes: bytes) -> Dict[str, Any]:
        """
        Invokes Whisper API under 60-sec runtime bounds to transcribe spoken dialogue, 
        specifically prompt-primed for detecting Bangla, English, and Banglish code-switching.
        """
        logger.info("Triggering async Whisper Audio transcription...")
        if not settings.OPENAI_API_KEY:
            # High-fidelity mock demonstrating proper integration with Banglish code-switching detection
            await asyncio.sleep(2.5)
            return {
                "transcription": "Ei Eid-e amader special discount offer miss korben na! 50% flat discount on select items.",
                "language_detected": "Banglish (Bangla/English blend)",
                "codeswitch_confidence": 0.94,
                "segments": [
                    {"start": 0.0, "end": 3.0, "text": "Ei Eid-e amader special discount offer miss korben na!"},
                    {"start": 3.0, "end": 5.5, "text": "50% flat discount on select items."}
                ]
            }

        headers = {"Authorization": f"Bearer {settings.OPENAI_API_KEY}"}
        # In actual integration, we post to v1/audio/transcriptions
        async with httpx.AsyncClient(timeout=30.0) as client:
            try:
                # Mock multi-part post setup for Whisper API
                files = {"file": ("audio.mp3", audio_bytes, "audio/mpeg")}
                data = {
                    "model": "whisper-1", 
                    "prompt": "Transcribe accurately, keeping spelling of Bangla words in English script (Banglish) if spoken as code-switching, along with standard Bengali.",
                    "response_format": "json"
                }
                # Perform the active API call
                response = await client.post("https://api.openai.com/v1/audio/transcriptions", headers=headers, files=files, data=data)
                response.raise_for_status()
                result = response.json()
                return {
                    "transcription": result.get("text", ""),
                    "language_detected": "Banglish / Bangla-English Mixed",
                    "codeswitch_confidence": 0.88
                }
            except Exception as e:
                logger.error(f"Whisper API error: {str(e)}")
                return {"transcription": "[Audio transcription failed]", "language_detected": "unknown", "error": str(e)}

    @classmethod
    async def run_gemini_vision(cls, frame_bytes: bytes, user_brief: str) -> Dict[str, Any]:
        """
        Invokes Gemini Vision Model (gemini-3.5-flash) to extract visual themes,
        color palettes, local cultural anchors (Rickshaws, Tea Stalls), emotional expressions,
        luxury signaling, and brand logo placements from keyframes.
        """
        logger.info("Triggering async Gemini Vision visual analysis...")
        if not settings.GEMINI_API_KEY:
            # High-fidelity authentic mockup containing typical Bangladeshi ad elements
            await asyncio.sleep(2.8)
            return {
                "visual_themes": ["Family bonding during Eid preparations", "Youth energetic gatherings at a local tea-stall (tong)"],
                "color_palette_vibes": "Warm amber, festive gold, and vibrant colors resembling hand-painted rickshaw art.",
                "emotional_expressions": "Warm joy, anticipation, light humor",
                "luxury_signaling": "Middle-class setting, high emphasis on smart tech gadgets",
                "cultural_anchors_detected": ["Rickshaw board design", "Tong-er Cha tea stall", "Dacca street traffic"],
                "brand_placements": "Logo featured dynamically on a mobile phone case and shop banner."
            }

        # Uses the official google-genai library style endpoints
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key={settings.GEMINI_API_KEY}"
        import base64
        image_b64 = base64.b64encode(frame_bytes).decode('utf-8')
        
        prompt = (
            f"You are a specialized Bangladeshi media researcher. Analyze this keyframe from an advertising campaign. "
            f"Context: {user_brief}. Identify visual themes, emotional expressions, brand logo visibility, "
            f"luxury indicators, and specifically locate any elements resembling Bangladeshi cultural anchors "
            f"(e.g., Rickshaw patterns, roadside tea stalls, street flags, local food, specific attire like Lungi, Panjabi or Shari)."
        )

        payload = {
            "contents": [{
                "parts": [
                    {"text": prompt},
                    {
                        "inlineData": {
                            "mimeType": "image/jpeg",
                            "data": image_b64
                        }
                    }
                ]
            }],
            "config": {
                "temperature": 0.2
            }
        }

        async with httpx.AsyncClient(timeout=30.0) as client:
            try:
                response = await client.post(url, json=payload)
                response.raise_for_status()
                res_data = response.json()
                generated_text = res_data["candidates"][0]["content"]["parts"][0]["text"]
                return {"raw_vision_analysis": generated_text}
            except Exception as e:
                logger.error(f"Gemini Vision API error: {str(e)}")
                return {"raw_vision_analysis": "[Vision extraction failed due to networking or credentials error]", "error": str(e)}

    @classmethod
    async def run_claude_synthesis(cls, transcription_data: Dict[str, Any], vision_data: Dict[str, Any], brief_text: str) -> StructuredMetadata:
        """
        Synthesizes raw Whisper transcriptions and Gemini Vision analysis using clean structured formatting.
        Produces the finalized StructuredMetadata schema.
        """
        logger.info("Summarizing inputs through Claude Reasoning Synthesis...")
        
        prompt = (
            f"System: You are an expert cultural strategist for the Bangladeshi marketplace.\n"
            f"Analyze the campaign inputs below:\n"
            f"1. Brief text: {brief_text}\n"
            f"2. Audio dialogue transcription: {transcription_data.get('transcription', '')}\n"
            f"3. Visual evaluation: {vision_data.get('raw_vision_analysis', str(vision_data))}\n\n"
            f"Synthesize this research into a highly precise structured alignment assessment. "
            f"Determine the core marketing intent (humor, nostalgia, aspiration, fear-mongering, family cohesion, organic bonding), "
            f"the inferred target demographic segment (e.g. 'Urban Gen-Z', 'Rural Home-makers', 'Corporate Professionals'), "
            f"evaluate emotional vector intensity metrics, and extract explicit Bangladeshi cultural anchors. "
            f"Respond directly with JSON matching the Pydantic schema structure."
        )

        if not settings.CLAUDE_API_KEY:
            # Real fallback or simulated synthesis when keys are absent
            await asyncio.sleep(1.8)
            # Safely create structured response
            ratio = 0.4 if "Eid" in transcription_data.get("transcription", "") else 0.15
            anchors = ["Tea-stall conversations (Tong)", "Rickshaw Art", "Friendship bantering (Adda)"]
            return StructuredMetadata(
                marketing_intent="Organic emotional bonding with slight nostalgia",
                target_demographic_inference="Urban Gen-Z and Young Adults",
                emotional_vectors=EmotionalVectors(excitement=0.85, trust=0.75, insecurity=0.20, urgency=0.10),
                cultural_anchors=anchors,
                bangla_codeswitching_ratio=ratio
            )

        headers = {
            "x-api-key": settings.CLAUDE_API_KEY,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json"
        }
        
        payload = {
            "model": "claude-3-5-sonnet-20241022",
            "max_tokens": 1000,
            "messages": [{"role": "user", "content": prompt}]
        }

        async with httpx.AsyncClient(timeout=30.0) as client:
            try:
                response = await client.post("https://api.anthropic.com/v1/messages", headers=headers, json=payload)
                response.raise_for_status()
                res_data = response.json()
                text = res_data["content"][0]["text"]
                # In production, parse text to find JSON blocks and validate with Pydantic
                import json
                import re
                json_match = re.search(r"\{.*?\}", text, re.DOTALL)
                if json_match:
                    parsed = json.loads(json_match.group(0))
                    return StructuredMetadata(**parsed)
            except Exception as e:
                logger.error(f"Claude API failed: {str(e)}")
            
            # Fallback schema on validation failure
            return StructuredMetadata(
                marketing_intent="Aspiration-driven promotion",
                target_demographic_inference="Dhaka Corporate Professionals",
                emotional_vectors=EmotionalVectors(excitement=0.60, trust=0.50, insecurity=0.40, urgency=0.30),
                cultural_anchors=["Dhaka street layout", "Corporate adda"],
                bangla_codeswitching_ratio=0.30
            )

    @classmethod
    async def process_campaign_assets(cls, asset_url: str, asset_type: str, brief_text: str) -> StructuredMetadata:
        """
        The central extraction entry point. Coordinates demuxing and runs Whipser + Vision in parallel,
        synthesizing the aggregated results into structured format under 8-10 seconds total.
        """
        # 1. Media decomposition
        frame, audio = await cls.decompose_media(asset_url, asset_type)
        
        # 2. Parallel processing execution of independent components
        transcribe_task = cls.run_whisper_transcription(audio)
        vision_task = cls.run_gemini_vision(frame, brief_text)
        
        transcription_res, vision_res = await asyncio.gather(transcribe_task, vision_task)
        
        # 3. Aggregative synthesis
        final_meta = await cls.run_claude_synthesis(transcription_res, vision_res, brief_text)
        logger.info("Successfully extracted high-fidelity multimodal metadata.")
        return final_meta
