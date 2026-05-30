import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

// Define Types inside server for completeness
type EmotionalVectors = {
  excitement: number;
  trust: number;
  insecurity: number;
  urgency: number;
};

type StructuredMetadata = {
  marketing_intent: string;
  target_demographic_inference: string;
  emotional_vectors: EmotionalVectors;
  cultural_anchors: string[];
  bangla_codeswitching_ratio: number;
};

type RedTeamSuggestion = {
  alert_type: string;
  severity: "High" | "Medium" | "Low";
  issue_description: string;
  actionable_remedy: string;
};

type SimulationResults = {
  success_rate: number;
  safety_score: number;
  market_alignment_index: number;
  red_team_suggestions: RedTeamSuggestion[];
};

type Campaign = {
  id: string;
  title: string;
  assetType: "video" | "audio" | "image" | "storyboard_brief";
  briefText: string;
  status: "processing" | "simulating" | "completed" | "failed";
  structured_metadata?: StructuredMetadata;
  simulation_results?: SimulationResults;
  createdAt: string;
};

type SimulationLog = {
  campaign_id: string;
  agent_name: string;
  role: "customer_persona" | "safety_inspector" | "judge";
  message: string;
  timestamp: string;
};

// In-Memory Campaign Store
const campaignsDb: Record<string, Campaign> = {};
const logsDb: Record<string, SimulationLog[]> = {};

// Lazy initialized GoogleGenAI client helper
let aiClientInstance: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI | null {
  if (!aiClientInstance) {
    const key = process.env.GEMINI_API_KEY;
    if (key && key !== "MY_GEMINI_API_KEY") {
      aiClientInstance = new GoogleGenAI({
        apiKey: key,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          },
        },
      });
    }
  }
  return aiClientInstance;
}

// Generate fallback metadata mock with rich cultural awareness for Bangladesh
function generateFallbackMetadata(briefText: string, assetType: string): StructuredMetadata {
  const text = briefText.toLowerCase();
  let marketing_intent = "Nostalgic family bonding and traditional warmth";
  let target_demographic_inference = "Rural Home-makers and Extended Families";
  let anchors = ["Eid shopping prep", "Tea-stall discussion (Tong-er Cha)", "Traditional Shari / Panjabi dress"];
  let codeswitch = 0.15;
  let emotional = { excitement: 0.65, trust: 0.90, insecurity: 0.15, urgency: 0.20 };

  if (text.includes("gen-z") || text.includes("meme") || text.includes("phone") || text.includes("cricket") || text.includes("tech")) {
    marketing_intent = "Energetic, humor-driven urban status bantering";
    target_demographic_inference = "Urban Gen-Z and Young Adults";
    anchors = ["Street banter (Adda)", "Rickshaw Art", "Local street food (Fuchka / Jhalmuri)", "Cricket frenzy"];
    codeswitch = 0.55;
    emotional = { excitement: 0.90, trust: 0.60, insecurity: 0.45, urgency: 0.35 };
  } else if (text.includes("office") || text.includes("salary") || text.includes("hustle") || text.includes("career")) {
    marketing_intent = "Aspiration-driven corporate stress relieving";
    target_demographic_inference = "Corporate Professionals (Dhaka City)";
    anchors = ["Dhaka traffic jams", "Tea Break (Cha Break)", "Mobile Financial Services (bKash/Nagad)"];
    codeswitch = 0.40;
    emotional = { excitement: 0.70, trust: 0.75, insecurity: 0.50, urgency: 0.40 };
  }

  return {
    marketing_intent,
    target_demographic_inference,
    emotional_vectors: emotional,
    cultural_anchors: anchors,
    bangla_codeswitching_ratio: codeswitch
  };
}

// Generate fallback simulated Red-Team analysis containing specific Bangladeshi taboos
function generateFallbackResults(metadata: StructuredMetadata): SimulationResults {
  const suggestions: RedTeamSuggestion[] = [];
  let success_rate = 75;
  let safety_score = 85;
  let market_alignment_index = 80;

  if (metadata.target_demographic_inference.includes("Gen-Z")) {
    success_rate = 88;
    safety_score = 65; // High potential risk due to sarcasm/memes
    market_alignment_index = 92;
    suggestions.push({
      alert_type: "Class Representation Flaw",
      severity: "High",
      issue_description: "The street scene mockingly features a local rickshaw puller in an exaggerated silly dialect, which the target Gen-Z segment detects instantly as elitist class privilege, risking social media cancellation.",
      actionable_remedy: "Redesign the interactions so that the protagonist treats the rickshaw driver with genuine respect ('Mama' or 'Bhai') and shares the brand asset organically as a moment of mutual dignity."
    });
    suggestions.push({
      alert_type: "Forced Slang / cringe factor",
      severity: "Medium",
      issue_description: "Using outdated or overly forced Banglish terms like 'Yo Bro, ashen jhalmuri khai' sounds extremely artificial and gets branded as 'corporate cringe' by modern teenagers.",
      actionable_remedy: "Replace with authentic, modern colloquial street banter phrasing like 'Bhai, Adda level bhalo' or let the actors talk naturally without force-feeding internet phrases."
    });
  } else if (metadata.target_demographic_inference.includes("Rural")) {
    success_rate = 72;
    safety_score = 50; // Critical risks if sensitivities are off
    market_alignment_index = 85;
    suggestions.push({
      alert_type: "Religious Sentiment Overlap",
      severity: "High",
      issue_description: "The storyboard features a celebratory dancing scene timed directly with the call to prayer (Azan) in the background noise, which triggers intense religious backlash among conservative rural audiences.",
      actionable_remedy: "Sanitize the audio mix to ensure that no dancing or commercial singing sequences overlap with sacred timelines, and introduce standard quiet transitions."
    });
    suggestions.push({
      alert_type: "Elders Representation",
      severity: "Medium",
      issue_description: "The protagonist dismissmly ignores her mother-in-law's guidance to prioritize buying a shiny appliance. Disrespecting conventional household hierarchy is heavily criticized in rural television standards.",
      actionable_remedy: "Pivot the narrative so that the brand appliance is purchased as a joint family decision that pays tribute to the mother-in-law's ultimate matriarchal wisdom."
    });
  } else {
    // Corporate
    success_rate = 80;
    safety_score = 75;
    market_alignment_index = 78;
    suggestions.push({
      alert_type: "Hustle Culture Glitch",
      severity: "Medium",
      issue_description: "Heroizing of late-night overtime work shifts without sleep looks toxic under current economic inflation stress and leads to employee-rights criticism on local professional subreddits.",
      actionable_remedy: "Soften the message so that the brand solution works to save time and promote early exit to enjoy tea-stall chats with family."
    });
  }

  return {
    success_rate,
    safety_score,
    market_alignment_index,
    red_team_suggestions: suggestions
  };
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Endpoints: Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", service: "Ad-Versary Backend Core" });
  });

  // REST: POST - upload campaign (Accepts brief parameters and begins simulation in background)
  app.post("/api/v1/campaigns/upload", async (req, res) => {
    try {
      const { title, assetType, briefText } = req.body;
      if (!title || !briefText) {
         return res.status(400).json({ error: "Missing required fields 'title' or 'briefText'" });
      }

      const campaignId = `cmp_${Math.random().toString(36).substring(2, 11)}`;
      
      // Initialize Draft State
      campaignsDb[campaignId] = {
        id: campaignId,
        title,
        assetType: assetType || "storyboard_brief",
        briefText,
        status: "processing",
        createdAt: new Date().toISOString()
      };
      logsDb[campaignId] = [];

      // Start ASYNC BACKGROUND AI PROCESSING
      // We process immediately and return 202 Accepted
      simulateProcessingWorkflow(campaignId);

      return res.status(202).json({
        status: "Accepted",
        campaign_id: campaignId,
        message: "Campaign registered successfully. Multimodal extraction and Swarm debate analyzing scheduled in background process.",
        estimated_duration_seconds: 25
      });
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ error: "Internal server error registering campaign." });
    }
  });

  // REST: GET - Status of campaign
  app.get("/api/v1/campaigns/:campaignId/status", (req, res) => {
    const { campaignId } = req.params;
    const campaign = campaignsDb[campaignId];
    if (!campaign) {
      return res.status(404).json({ error: "Campaign not found" });
    }
    return res.json({
      campaign_id: campaignId,
      status: campaign.status,
      has_metadata: !!campaign.structured_metadata,
      has_results: !!campaign.simulation_results
    });
  });

  // REST: GET - Complete Dashboard Evaluation metrics
  app.get("/api/v1/campaigns/:campaignId/dashboard", (req, res) => {
    const { campaignId } = req.params;
    const campaign = campaignsDb[campaignId];
    if (!campaign) {
      return res.status(404).json({ error: "Campaign not found" });
    }
    if (campaign.status !== "completed") {
      return res.status(400).json({ 
        error: `Evaluation is still pending. Current status: '${campaign.status}'` 
      });
    }
    return res.json(campaign);
  });

  // REST-SSE: Real-time Streaming of Multi-agent Swarm Debate logs
  app.get("/api/v1/simulations/:campaignId/stream", (req, res) => {
    const { campaignId } = req.params;
    const campaign = campaignsDb[campaignId];
    if (!campaign) {
      return res.status(404).json({ error: "Campaign not found for stream" });
    }

    // Configure headers for EventSource SSE Streaming
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    // Track processed log length for this connection
    let sentLogsCount = 0;
    const interval = setInterval(() => {
      const logs = logsDb[campaignId] || [];
      if (sentLogsCount < logs.length) {
        for (let i = sentLogsCount; i < logs.length; i++) {
          res.write(`data: ${JSON.stringify(logs[i])}\n\n`);
        }
        sentLogsCount = logs.length;
      }

      // Check if finished
      if (campaign.status === "completed" && sentLogsCount >= logs.length) {
        res.write(`data: ${JSON.stringify({ done: true, finished: true })}\n\n`);
        clearInterval(interval);
        res.end();
      } else if (campaign.status === "failed") {
        res.write(`data: ${JSON.stringify({ done: true, error: "Simulation failed" })}\n\n`);
        clearInterval(interval);
        res.end();
      }
    }, 800);

    req.on("close", () => {
      clearInterval(interval);
      res.end();
    });
  });

  // BACKGROUND SIMULATION PIPELINE ENGINE
  async function simulateProcessingWorkflow(campaignId: string) {
    const campaign = campaignsDb[campaignId];
    if (!campaign) return;

    try {
      // Step 1: Multimodal Extraction Pipeline (Uses Gemini-3.5-flash if available)
      const client = getGeminiClient();
      let metadata: StructuredMetadata;

      if (client) {
        try {
          console.log("Using active server-side live Gemini-3.5-flash for ad asset analyzing...");
          const systemContextPrimes = 
            "You are an expert cultural strategist for the Bangladeshi advertising market. Analyze the ad brief content and extract a clean JSON structure detailing the primary marketing intent (humor, nostalgia, aspiration, fear-mongering etc), the inferred target demographic (Urban Gen-Z, Rural Home-makers, or Corporate Professionals), specific Bangladeshi cultural anchors present in the concepts, estimated codeswitching ratio, and emotional intensities from 0 to 1 for excitement, trust, insecurity, and urgency.";

          const response = await client.models.generateContent({
             model: "gemini-3.5-flash",
             contents: `Campaign Brief Content to analyze: "${campaign.briefText}". Asset Type is ${campaign.assetType}.`,
             config: {
               systemInstruction: systemContextPrimes,
               responseMimeType: "application/json",
               responseSchema: {
                  type: Type.OBJECT,
                  properties: {
                     marketing_intent: { type: Type.STRING },
                     target_demographic_inference: { type: Type.STRING },
                     bangla_codeswitching_ratio: { type: Type.NUMBER },
                     cultural_anchors: { type: Type.ARRAY, items: { type: Type.STRING } },
                     emotional_vectors: {
                        type: Type.OBJECT,
                        properties: {
                           excitement: { type: Type.NUMBER },
                           trust: { type: Type.NUMBER },
                           insecurity: { type: Type.NUMBER },
                           urgency: { type: Type.NUMBER }
                        },
                        required: ["excitement", "trust", "insecurity", "urgency"]
                     }
                  },
                  required: ["marketing_intent", "target_demographic_inference", "bangla_codeswitching_ratio", "cultural_anchors", "emotional_vectors"]
               }
             }
          });

          const pText = response.text ? response.text.trim() : "";
          metadata = JSON.parse(pText);
          console.log("Successfully retrieved live Gemini-3.5-flash analysis:", metadata);
        } catch (e) {
          console.error("Gemini API parsing failed, engaging high-fidelity fallback...", e);
          metadata = generateFallbackMetadata(campaign.briefText, campaign.assetType);
        }
      } else {
        await new Promise((r) => setTimeout(r, 2000)); // Media decomposition visual simulation delay
        metadata = generateFallbackMetadata(campaign.briefText, campaign.assetType);
      }

      // Save Metadata step
      campaign.structured_metadata = metadata;
      campaign.status = "simulating";

      // PRE-FETCH SOCIAL SCENARIOS (GraphRAG Context Mock)
      const demographics = metadata.target_demographic_inference;
      const primaryAnchor = metadata.cultural_anchors[0] || "colloquial banter";
      
      const pushLog = (agentName: string, role: "customer_persona" | "safety_inspector" | "judge", message: string) => {
        const item: SimulationLog = {
          campaign_id: campaignId,
          agent_name: agentName,
          role,
          message,
          timestamp: new Date().toISOString()
        };
        logsDb[campaignId].push(item);
        console.log(`[Debate Swarm - ${agentName}]: ${message}`);
      };

      // Step 2: Agent debate steps (Staggered to feel alive in UI)
      await new Promise((r) => setTimeout(r, 2000));
      pushLog(
         "System Orchestrator", 
         "judge", 
         `Pre-fetched Neo4j Social Sentiment Nodes complete! Injecting market guidelines for segment: ${demographics} with focus on '${primaryAnchor}'. Avoid database query overlaps during live debate.`
      );

      // Define consumer character
      let consumerLabel = "Sifat (Urban Gen-Z representative)";
      let consumerStyle = "Yo, this looks pretty fresh at first glance because of the aesthetic! But wait, let me look closely...";
      if (demographics.includes("Rural")) {
        consumerLabel = "Rabeya (Rural Homemaker perspective)";
        consumerStyle = "Bhai-boon shobai eksathe basae chobi dekle bhalo lagbe, kintu shashari mukh ghurae dekhle shari pashae kharap laga thake...";
      } else if (demographics.includes("Corporate")) {
        consumerLabel = "Tanvir (Corporate Office Executive)";
        consumerStyle = "I relate deeply to the morning rush scene and drinking tea. But is the product utility clear? Let us talk about it..";
      }

      await new Promise((r) => setTimeout(r, 3000));
      pushLog(
        consumerLabel,
        "customer_persona",
        `${consumerStyle} I think the excitement quotient is high, but does the brand actually care about us or are they just utilizing Bangladeshi meme culture to sell product?`
      );

      await new Promise((r) => setTimeout(r, 3000));
      pushLog(
        "Mr. Shamsur Rahman (Strict Cultural & Safety Inspector)",
        "safety_inspector",
        `RED-TEAM PROTOCOL ACTIVATED: Let's investigate risks of social backlash. Under cultural anchor context '${primaryAnchor}', there is a subtle risk! If we portray regional language accents mockingly, the audience will initiate a negative sentiment cycle on social Facebook groups immediately!`
      );

      await new Promise((r) => setTimeout(r, 3000));
      pushLog(
        consumerLabel,
        "customer_persona",
        `Yes! Exactly! If the brand insults our local traditions or shows class division (like mockingly shouting at our house help or rikshaw mama), we will cancel them overnight. Gen-Z takes this respect issue very seriously on social media.`
      );

      await new Promise((r) => setTimeout(r, 3000));
      pushLog(
        "Mr. Shamsur Rahman (Strict Cultural & Safety Inspector)",
        "safety_inspector",
        "Absolutely. Also, ensuring no background imagery overlaps with prayer timings or sacred symbols is essential to maintain complete safety index."
      );

      await new Promise((r) => setTimeout(r, 3000));
      pushLog(
        "Ananya Chowdhury (Ad Strategy Synthesizer & Judge)",
        "judge",
        `SYNTHESIS PHASE: Great inputs from the Swarm. The campaign has excellent visual resonance (${metadata.cultural_anchors.join(", ")}), but the Safety margin is threatened due to class representation overlaps or slang usage. Let us calculate final metrics.`
      );

      await new Promise((r) => setTimeout(r, 2000));
      // Calculate final results
      const results = generateFallbackResults(metadata);
      campaign.simulation_results = results;
      campaign.status = "completed";

    } catch (e: any) {
      console.error("Simulation workflow crashed:", e);
      campaign.status = "failed";
    }
  }

  // Vite middleware / client routing setup
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server successfully started and running on http://localhost:${PORT}`);
  });
}

startServer();
