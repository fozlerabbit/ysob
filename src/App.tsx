import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Bot, ShieldCheck, AlertTriangle, Play, Sparkles, RefreshCw, 
  Check, Info, CheckCircle, ArrowRight, ShieldAlert, Users, 
  Flame, BookOpen, Key, Mail, Lock, Upload, FileText, Image as ImageIcon, 
  Video, Download, RotateCcw, AlertCircle, Sparkle, Film, Volume2, 
  Eye, EyeOff, Activity, Sliders, ListChecks, HelpCircle, HardDrive
} from "lucide-react";

// --- Types & Interfaces ---
interface MediaFile {
  name: string;
  size: string;
  type: "video" | "image";
  previewUrl: string;
}

interface MetricItem {
  label: string;
  value: number;
}

interface AnalysisResults {
  mediaType: "video" | "image";
  projectName: string;
  description: string;
  overallScore: number;
  
  // 1. Video Quality Categories
  videoQuality: {
    perfectionScore: number;
    resolution: number;
    lighting: number;
    stability: number;
    composition: number;
  };

  // 2. Audio Quality Categories
  audioQuality: {
    perfectionScore: number;
    clarity: number;
    noiseControl: number;
    volumeConsistency: number;
  } | null; // Null for Image analysis

  // 3. Visual Quality Categories
  visualQuality: {
    colorGrading: number;
    sharpness: number;
    exposure: number;
    contrast: number;
  };

  // 4. Content Quality Categories
  contentQuality: {
    storytelling: number;
    engagement: number;
    professionalism: number;
    creativity: number;
  };

  // Actionable tips
  suggestions: {
    title: string;
    description: string;
    category: "video" | "audio" | "visual" | "content";
    impact: "High" | "Medium";
  }[];
}

// --- Hardcoded Predefined Datasets ---
const PRESET_SUGGESTIONS = [
  {
    title: "Improve lighting setups",
    description: "Adjust your primary key light and increase fill ratios to minimize harsh shadows in low-light environments.",
    category: "video" as const,
    impact: "High" as const
  },
  {
    title: "Reduce background noise interference",
    description: "Implement a low-cut acoustic filter or soundproofing shields to isolate the principal vocal track.",
    category: "audio" as const,
    impact: "High" as const
  },
  {
    title: "Use smoother camera movements",
    description: "Incorporate a 3-axis stabilizer gimbal or use post-production electronic stabilization algorithms to avoid jitter.",
    category: "video" as const,
    impact: "Medium" as const
  },
  {
    title: "Increase video sharpness",
    description: "Examine lens focus calibration and elevate edge clarity index values slightly in the color grading workflow.",
    category: "visual" as const,
    impact: "Medium" as const
  },
  {
    title: "Enhance color correction",
    description: "Leverage standard cinematic LUT maps to balance highlights and expand general atmospheric contrast ratios.",
    category: "visual" as const,
    impact: "High" as const
  },
  {
    title: "Improve subject framing",
    description: "Keep critical components tightly aligned with the golden rule of thirds grid margins to raise visual interest.",
    category: "video" as const,
    impact: "Medium" as const
  },
  {
    title: "Add accurate subtitles",
    description: "Incorporate bold, stylized open-captions on mobile video frames to secure retention even when audio is muted.",
    category: "content" as const,
    impact: "High" as const
  },
  {
    title: "Improve audio balance",
    description: "Normalize the spoken dialogue range around -12dBFS and lower persistent ambient background sound levels.",
    category: "audio" as const,
    impact: "Medium" as const
  }
];

export default function App() {
  // --- Authentication State ---
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return localStorage.getItem("studio_auth") === "true";
  });
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState("");
  const [isAuthLoading, setIsAuthLoading] = useState(false);

  // --- Workspace & Upload State ---
  const [projectName, setProjectName] = useState("");
  const [projectDescription, setProjectDescription] = useState("");
  const [improvementNeeds, setImprovementNeeds] = useState("");
  const [goalsExpectations, setGoalsExpectations] = useState("");
  const [uploadedFile, setUploadedFile] = useState<MediaFile | null>(null);
  const [dragActive, setDragActive] = useState(false);

  // --- Simulation & Analysis State ---
  const [analysisStatus, setAnalysisStatus] = useState<"idle" | "analyzing" | "completed">("idle");
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [loadingStepText, setLoadingStepText] = useState("Awaiting command...");
  const [results, setResults] = useState<AnalysisResults | null>(null);

  // File Input Ref
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- Authentication Handler ---
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    setIsAuthLoading(true);

    setTimeout(() => {
      if (email.trim() === "demo@example.com" && password === "123456") {
        setIsAuthenticated(true);
        localStorage.setItem("studio_auth", "true");
      } else {
        setAuthError("Invalid credentials. Please use demo@example.com / 123456.");
      }
      setIsAuthLoading(false);
    }, 800);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem("studio_auth");
    handleReset();
  };

  // --- File Upload Handlers ---
  const processSelectedFile = (file: File) => {
    if (!file) return;

    const isVideo = file.type.startsWith("video/");
    const isImage = file.type.startsWith("image/");

    if (!isVideo && !isImage) {
      alert("Invalid file format. Please upload an image or video file.");
      return;
    }

    // Format file size
    const sizeInMB = (file.size / (1024 * 1024)).toFixed(2);
    const sizeStr = `${sizeInMB} MB`;

    // Mock preview url
    const objectUrl = URL.createObjectURL(file);

    setUploadedFile({
      name: file.name,
      size: sizeStr,
      type: isVideo ? "video" : "image",
      previewUrl: objectUrl
    });

    // Auto fill project name if empty
    if (!projectName) {
      const dotIndex = file.name.lastIndexOf(".");
      const nameWithoutExt = dotIndex > -1 ? file.name.substring(0, dotIndex) : file.name;
      // Clean up special characters for professional display
      const formattedName = nameWithoutExt.replace(/[-_]/g, " ");
      setProjectName(formattedName.charAt(0).toUpperCase() + formattedName.slice(1));
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = () => {
    setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const triggerFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processSelectedFile(e.target.files[0]);
    }
  };

  // --- Trigger Simulation Pipeline ---
  const handleAnalyze = () => {
    if (!uploadedFile) {
      alert("Please upload a video or image file to begin analysis.");
      return;
    }
    if (!projectDescription.trim()) {
      alert("Please fill in what the project is about to guide the analysis.");
      return;
    }

    setAnalysisStatus("analyzing");
    setAnalysisProgress(0);

    const steps = [
      { progress: 10, text: "Demultiplexing container formats and verifying bitrates..." },
      { progress: 25, text: "Extracting structural keyframes and computing chroma values..." },
      { progress: 45, text: "Running lighting density evaluation models on matrix frames..." },
      { progress: 65, text: "Estimating jitter indexes and sub-pixel camera movement indices..." },
      { progress: 80, text: "Evaluating auditory vocal ranges and decibel variance profiles..." },
      { progress: 95, text: "Compiling red-team suggestions and final quality metrics..." },
      { progress: 100, text: "Simulation and reports successfully built!" }
    ];

    let currentStep = 0;
    const interval = setInterval(() => {
      if (currentStep < steps.length) {
        setAnalysisProgress(steps[currentStep].progress);
        setLoadingStepText(steps[currentStep].text);
        currentStep++;
      } else {
        clearInterval(interval);
        generateFakeResults();
      }
    }, 450);
  };

  const generateFakeResults = () => {
    if (!uploadedFile) return;

    // Helper to generate realistic random scores around an input-inspired sweet spot
    const hasBrief = projectDescription.toLowerCase();
    const isDemandingHigh = hasBrief.includes("cinematic") || hasBrief.includes("premium") || hasBrief.includes("high");
    
    const generateScore = (min: number, max: number) => {
      const base = Math.floor(Math.random() * (max - min + 1)) + min;
      return Math.min(100, Math.max(0, base + (isDemandingHigh ? 5 : 0)));
    };

    const isVideo = uploadedFile.type === "video";

    // Build specific score breakdowns
    const videoPerfection = generateScore(78, 92);
    const resolution = generateScore(85, 99);
    const lighting = generateScore(70, 88);
    const stability = isVideo ? generateScore(72, 90) : 100; // Stabilized completely if static image
    const composition = generateScore(75, 93);

    const audioPerfection = isVideo ? generateScore(75, 91) : 0;
    const voiceClarity = isVideo ? generateScore(78, 94) : 0;
    const noiseControl = isVideo ? generateScore(68, 86) : 0;
    const volumeConsistency = isVideo ? generateScore(74, 92) : 0;

    const colorGrading = generateScore(72, 90);
    const sharpness = generateScore(80, 95);
    const exposure = generateScore(74, 91);
    const contrast = generateScore(76, 92);

    const storytelling = generateScore(70, 89);
    const engagement = generateScore(72, 92);
    const professionalism = generateScore(78, 94);
    const creativity = generateScore(82, 96);

    // Compute aggregate overall index
    const totalComponents = isVideo ? 4 : 3;
    const overallScore = Math.floor(
      (videoPerfection + (isVideo ? audioPerfection : 0) + colorGrading + storytelling) / totalComponents
    );

    // Pick 3-5 unique recommendations based on weaker metrics
    const sortedCategories: { name: string; score: number }[] = [
      { name: "lighting", score: lighting },
      { name: "sharpness", score: sharpness },
      { name: "framing", score: composition },
      { name: "color", score: colorGrading }
    ];
    if (isVideo) {
      sortedCategories.push({ name: "noise", score: noiseControl });
      sortedCategories.push({ name: "audio_balance", score: volumeConsistency });
      sortedCategories.push({ name: "stability", score: stability });
    }
    sortedCategories.sort((a, b) => a.score - b.score);

    // Map sorted lowest metrics to preset suggestions
    const finalSuggestions = [];
    const usedPresets = new Set();

    for (const cat of sortedCategories) {
      let presetMatch = null;
      if (cat.name === "lighting") presetMatch = PRESET_SUGGESTIONS[0];
      else if (cat.name === "noise" && isVideo) presetMatch = PRESET_SUGGESTIONS[1];
      else if (cat.name === "stability" && isVideo) presetMatch = PRESET_SUGGESTIONS[2];
      else if (cat.name === "sharpness") presetMatch = PRESET_SUGGESTIONS[3];
      else if (cat.name === "color") presetMatch = PRESET_SUGGESTIONS[4];
      else if (cat.name === "framing") presetMatch = PRESET_SUGGESTIONS[5];
      else if (cat.name === "audio_balance" && isVideo) presetMatch = PRESET_SUGGESTIONS[7];
      
      if (presetMatch && !usedPresets.has(presetMatch.title)) {
        finalSuggestions.push(presetMatch);
        usedPresets.add(presetMatch.title);
      }
      if (finalSuggestions.length >= 4) break;
    }

    // Always add subtitle or storytelling suggestion if composition/creativity calls for it
    if (finalSuggestions.length < 4) {
      finalSuggestions.push(PRESET_SUGGESTIONS[6]); // Open subtitles
    }

    setResults({
      mediaType: uploadedFile.type,
      projectName: projectName || "Untitled Project Assets",
      description: projectDescription,
      overallScore,
      videoQuality: {
        perfectionScore: videoPerfection,
        resolution,
        lighting,
        stability,
        composition
      },
      audioQuality: isVideo ? {
        perfectionScore: audioPerfection,
        clarity: voiceClarity,
        noiseControl,
        volumeConsistency
      } : null,
      visualQuality: {
        colorGrading,
        sharpness,
        exposure,
        contrast
      },
      contentQuality: {
        storytelling,
        engagement,
        professionalism,
        creativity
      },
      suggestions: finalSuggestions
    });

    setAnalysisStatus("completed");
  };

  // --- Reset Application State ---
  const handleReset = () => {
    setUploadedFile(null);
    setProjectName("");
    setProjectDescription("");
    setImprovementNeeds("");
    setGoalsExpectations("");
    setAnalysisStatus("idle");
    setAnalysisProgress(0);
    setResults(null);
  };

  // --- Print/Export trigger PDF Report ---
  const handlePrintPDF = () => {
    window.print();
  };

  // CSV/TXT Plaintext download helper
  const handleDownloadReportText = () => {
    if (!results) return;

    let textReport = `====================================================\n`;
    textReport += `     MEDIA CONTENT QUALITY DIAGNOSTIC REPORT\n`;
    textReport += `====================================================\n\n`;
    textReport += `Asset Name ID: ${results.projectName}\n`;
    textReport += `Media Profile: ${results.mediaType.toUpperCase()}\n`;
    textReport += `Overall Content Score: ${results.overallScore}%\n`;
    textReport += `Date Analyzed: ${new Date().toLocaleDateString()}\n\n`;
    
    textReport += `--- PROJECT CONTEXT ---\n`;
    textReport += `Description: ${results.description}\n\n`;

    textReport += `--- COGNITIVE METRICS SUMMARY ---\n`;
    textReport += `[VIDEO QUALITY - ${results.videoQuality.perfectionScore}% perfection]\n`;
    textReport += `- Resolution Quality: ${results.videoQuality.resolution}%\n`;
    textReport += `- Lighting Quality: ${results.videoQuality.lighting}%\n`;
    textReport += `- Camera Stability: ${results.videoQuality.stability}%\n`;
    textReport += `- Frame Composition: ${results.videoQuality.composition}%\n\n`;

    if (results.audioQuality) {
      textReport += `[AUDIO QUALITY - ${results.audioQuality.perfectionScore}% perfection]\n`;
      textReport += `- Voice Clarity: ${results.audioQuality.clarity}%\n`;
      textReport += `- Background Noise Control: ${results.audioQuality.noiseControl}%\n`;
      textReport += `- Volume Consistency: ${results.audioQuality.volumeConsistency}%\n\n`;
    } else {
      textReport += `[AUDIO QUALITY]\n- Not applicable for static image assets.\n\n`;
    }

    textReport += `[VISUAL QUALITY]\n`;
    textReport += `- Color Grading: ${results.visualQuality.colorGrading}%\n`;
    textReport += `- Sharpness: ${results.visualQuality.sharpness}%\n`;
    textReport += `- Exposure: ${results.visualQuality.exposure}%\n`;
    textReport += `- Contrast: ${results.visualQuality.contrast}%\n\n`;

    textReport += `[CONTENT & RETENTION QUALITY]\n`;
    textReport += `- Storytelling Narrative: ${results.contentQuality.storytelling}%\n`;
    textReport += `- Engagement Potential: ${results.contentQuality.engagement}%\n`;
    textReport += `- Professional Execution: ${results.contentQuality.professionalism}%\n`;
    textReport += `- Creative Signature: ${results.contentQuality.creativity}%\n\n`;

    textReport += `====================================================\n`;
    textReport += `        PRESCRIBED REMEDIES & SUGGESTIONS\n`;
    textReport += `====================================================\n`;
    results.suggestions.forEach((tip, idx) => {
      textReport += `${idx + 1}. [${tip.category.toUpperCase()} - ${tip.impact} IMPACT] ${tip.title}\n`;
      textReport += `   Remedy Protocol: ${tip.description}\n\n`;
    });

    textReport += `Thank you for using Ad-Versary Studio Pro Media Analytics tool.`;

    const blob = new Blob([textReport], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${results.projectName.replace(/\s+/g, "_")}_diagnostic_report.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Circular gauge renderer
  const CircularScore = ({ score, label, accentColor = "#3B82F6", delay = 0 }: { score: number, label: string, accentColor?: string, delay?: number }) => {
    const radius = 35;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (score / 100) * circumference;

    return (
      <div className="flex flex-col items-center justify-center p-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.08] backdrop-blur-md shadow-lg transition hover:bg-white/[0.05]">
        <div className="relative w-18 h-18">
          <svg className="w-full h-full transform -rotate-90">
            <circle
              cx="36"
              cy="36"
              r={radius}
              className="stroke-slate-800"
              strokeWidth="5"
              fill="transparent"
            />
            <motion.circle
              cx="36"
              cy="36"
              r={radius}
              stroke={accentColor}
              strokeWidth="5"
              fill="transparent"
              strokeDasharray={circumference}
              initial={{ strokeDashoffset: circumference }}
              animate={{ strokeDashoffset: offset }}
              transition={{ duration: 1.2, ease: "easeOut", delay }}
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <motion.span 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: delay + 0.3 }}
              className="text-xs font-bold font-mono text-white"
            >
              {score}%
            </motion.span>
          </div>
        </div>
        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-2.5 text-center truncate w-full">
          {label}
        </span>
      </div>
    );
  };

  // Metric status bar renderer
  const MetricProgressBar = ({ label, score, colorClass = "bg-blue-500" }: { label: string, score: number, colorClass?: string }) => {
    return (
      <div className="space-y-1">
        <div className="flex justify-between items-center text-xs">
          <span className="text-slate-450 font-medium">{label}</span>
          <span className="font-bold text-white font-mono">{score}%</span>
        </div>
        <div className="h-2 w-full bg-slate-900 rounded-full overflow-hidden border border-slate-800/80">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${score}%` }}
            transition={{ duration: 1, ease: "easeOut" }}
            className={`h-full rounded-full ${colorClass}`}
          />
        </div>
      </div>
    );
  };

  // --- Auth View ---
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#090D1A] flex flex-col items-center justify-center p-4 relative overflow-hidden" id="auth-root">
        {/* Abstract Ambient Background Elements */}
        <div className="absolute top-10 left-10 w-72 h-72 rounded-full bg-blue-600/10 blur-[100px] pointer-events-none" />
        <div className="absolute bottom-10 right-10 w-96 h-96 rounded-full bg-emerald-600/10 blur-[120px] pointer-events-none" />

        {/* Auth Card with Glassmorphism */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md backdrop-blur-xl bg-slate-900/60 border border-slate-800/80 p-8 rounded-3xl shadow-3xl relative z-10"
        >
          {/* Header */}
          <div className="text-center mb-6">
            <div className="mx-auto w-12 h-12 bg-blue-600/20 border border-blue-500/40 rounded-2xl flex items-center justify-center mb-3 text-blue-400 shadow-lg shadow-blue-500/10">
              <Film className="w-6 h-6 animate-pulse" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white font-display">Ad-Versary Studio</h1>
            <p className="text-sm text-slate-400 mt-1.5 font-sans">Cognitive Ad Media and Content Quality Diagnostics</p>
          </div>

          {/* Preset Helper Credentials Box */}
          <div className="mb-6 p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] text-xs space-y-2 text-slate-350">
            <div className="flex items-center gap-1.5 text-blue-400 font-semibold uppercase tracking-wider text-[10px]">
              <Info className="w-3.5 h-3.5" />
              Developer Playground Credentials
            </div>
            <p className="leading-snug">Access the dashboard using the secure hardcoded master credentials:</p>
            <div className="grid grid-cols-2 gap-2 mt-2 font-mono bg-black/40 p-2.5 rounded-xl border border-white/[0.04] text-white">
              <div>
                <span className="text-[9px] text-slate-500 uppercase block">Email address</span>
                <span className="text-xs">demo@example.com</span>
              </div>
              <div>
                <span className="text-[9px] text-slate-500 uppercase block">Passphrase</span>
                <span className="text-xs">123456</span>
              </div>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            {authError && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="p-3 bg-red-950/40 border border-red-500/30 text-red-400 text-xs rounded-xl flex items-center gap-2"
              >
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{authError}</span>
              </motion.div>
            )}

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Corporate Email</label>
              <div className="relative">
                <input 
                  type="email" 
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="w-full pl-10 pr-4 py-2.5 text-slate-250 placeholder-slate-600 bg-slate-950/60 border border-slate-800 rounded-xl focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none text-sm transition"
                />
                <Mail className="absolute left-3.5 top-3.5 w-4 font-normal text-slate-500" />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Secure Password</label>
              <div className="relative">
                <input 
                  type={showPassword ? "text" : "password"} 
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••"
                  className="w-full pl-10 pr-10 py-2.5 text-slate-250 placeholder-slate-600 bg-slate-950/60 border border-slate-800 rounded-xl focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none text-sm transition font-mono"
                />
                <Lock className="absolute left-3.5 top-3.5 w-4 font-normal text-slate-500" />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-3.5 w-4 text-slate-500 hover:text-slate-350 transition"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isAuthLoading}
              className="w-full py-3 mt-2 rounded-xl text-xs font-semibold uppercase tracking-widest bg-blue-600 hover:bg-blue-500 active:scale-[0.98] text-white shadow-lg shadow-blue-500/10 border border-blue-500/25 transition flex items-center justify-center gap-1.5"
            >
              {isAuthLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-white" />
                  Decrypting Security Token...
                </>
              ) : (
                <>
                  <span>Begin Diagnostic Swarm</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  // --- Main Workspace Applet View ---
  return (
    <div id="studio-appbar-root" className="min-h-screen bg-[#070B14] text-slate-100 flex flex-col font-sans relative">
      {/* Printable Report View (Visible only during prints, hidden in UI) */}
      {results && (
        <div className="hidden print:block p-10 bg-white text-black text-sm space-y-6 min-h-screen">
          <div className="border-b-2 border-slate-900 pb-4">
            <h1 className="text-3xl font-extrabold text-slate-900">AD-VERSARY CONTENT INSPECTION</h1>
            <p className="text-xs text-slate-500 mt-1 uppercase tracking-widest font-mono">Cognitive Integrity Verification Certificate | {results.mediaType.toUpperCase()} MODE</p>
          </div>

          <div className="grid grid-cols-2 gap-4 pb-4 border-b border-slate-200">
            <div>
              <span className="text-slate-500 font-bold block text-[10px] uppercase">Review Target Name</span>
              <span className="text-lg font-bold">{results.projectName}</span>
            </div>
            <div>
              <span className="text-slate-500 font-bold block text-[10px] uppercase">Aggregate Index Score</span>
              <span className="text-2xl font-black text-blue-600">{results.overallScore}% Accuracy</span>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider bg-slate-100 px-2 py-1 text-slate-800">Media Content Description</h2>
              <p className="mt-2 text-slate-700 italic">"{results.description}"</p>
            </div>

            <div className="grid grid-cols-2 gap-6 pt-4">
              <div className="space-y-2">
                <h3 className="font-bold underline text-slate-800">Video Quality Metrics</h3>
                <ul className="space-y-1 text-xs">
                  <li>Video Perfection Index: <strong>{results.videoQuality.perfectionScore}%</strong></li>
                  <li>Spatial Resolution Quality: <strong>{results.videoQuality.resolution}%</strong></li>
                  <li>Atmospheric Lighting Index: <strong>{results.videoQuality.lighting}%</strong></li>
                  <li>Stabilized Camera Score: <strong>{results.videoQuality.stability}%</strong></li>
                  <li>Rule-of-Thirds Composition: <strong>{results.videoQuality.composition}%</strong></li>
                </ul>
              </div>

              <div className="space-y-2">
                <h3 className="font-bold underline text-slate-800">Visual Aesthetic Metrics</h3>
                <ul className="space-y-1 text-xs">
                  <li>Color Grading LUT Index: <strong>{results.visualQuality.colorGrading}%</strong></li>
                  <li>Optic Edge Sharpness: <strong>{results.visualQuality.sharpness}%</strong></li>
                  <li>Exposure Balance Index: <strong>{results.visualQuality.exposure}%</strong></li>
                  <li>Ratio Contrast Sharpness: <strong>{results.visualQuality.contrast}%</strong></li>
                </ul>
              </div>
            </div>

            {results.audioQuality && (
              <div className="pt-4 space-y-2">
                <h3 className="font-bold underline text-slate-800">Audio Quality Metrics</h3>
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>Voice Clarity Metric: <strong>{results.audioQuality.clarity}%</strong></div>
                  <div>Ambient Decibel Noise Control: <strong>{results.audioQuality.noiseControl}%</strong></div>
                  <div>Consistency Dynamic Range Score: <strong>{results.audioQuality.volumeConsistency}%</strong></div>
                </div>
              </div>
            )}

            <div className="pt-4">
              <h3 className="font-bold underline text-slate-800">Actionable Remediation Roadmap</h3>
              <div className="mt-2 space-y-3">
                {results.suggestions.map((tip, index) => (
                  <div key={index} className="text-xs border-l-4 border-slate-700 pl-3">
                    <span className="font-bold block text-slate-900">{index + 1}. {tip.title} ({tip.impact} Priority)</span>
                    <span className="text-slate-600 block leading-relaxed">{tip.description}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="border-t pt-8 mt-12 text-center text-[10px] text-slate-400 font-mono">
            Report finalized by Ad-Versary Studio Pro Swarm Sandbox environment. Signature not required.
          </div>
        </div>
      )}

      {/* HEADER BAR */}
      <header className="border-b border-white/[0.08] bg-[#0c1222]/90 sticky top-0 z-40 backdrop-blur-md" id="header-bar">
        <div className="max-w-7xl mx-auto px-6 py-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-blue-600/15 flex items-center justify-center border border-blue-500/30 shadow-md shadow-blue-500/5">
              <Bot className="h-6 w-6 text-blue-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-display text-lg font-bold tracking-tight text-white flex items-center gap-1.5">
                  Ad-Versary <span className="text-[10px] font-mono tracking-wider font-bold uppercase rounded px-1.5 py-0.5 bg-blue-500/10 border border-blue-500/20 text-blue-400">Sandbox v3.2</span>
                </h1>
              </div>
              <p className="text-[11px] text-slate-400 leading-tight">Pro Media & Quality Analyzer Swarm Framework</p>
            </div>
          </div>

          {/* User Actions & Stats */}
          <div className="flex items-center gap-4 flex-wrap md:flex-nowrap">
            <div className="hidden lg:flex items-center gap-4 text-xs text-slate-400 bg-slate-900/40 border border-white/[0.04] px-4 py-1.5 rounded-full">
              <span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />Cloud Node Connected </span>
            </div>
            
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-350 font-mono">demo@example.com</span>
              <button 
                onClick={handleLogout}
                className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-slate-800 border border-red-500/20 text-red-400 transition"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* WORKSPACE AREA */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 print:hidden">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* LEFT/SIDEBAR CONFIG PANEL: UPLOAD AND REQUIREMENTS INPUT (L-5 columns) */}
          <div className="lg:col-span-5 space-y-6" id="setup-panel">
            <div className="backdrop-blur-lg bg-[#111827]/70 border border-white/[0.08] rounded-2xl p-5 shadow-2xl space-y-5">
              <div className="flex items-center gap-2 pb-3.5 border-b border-white/[0.08]">
                <HardDrive className="h-5 w-5 text-blue-400" />
                <h2 className="font-display font-bold text-base text-white">Diagnostic Submissions</h2>
              </div>

              {/* Requirements 2: Upload Area */}
              <div className="space-y-2">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  1. Target Media Asset File (Video/Image)
                </label>
                
                <div 
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={triggerFileInput}
                  className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition flex flex-col items-center justify-center min-h-36 ${
                    dragActive 
                      ? "border-blue-500 bg-blue-500/5" 
                      : uploadedFile 
                        ? "border-emerald-500/40 bg-emerald-500/[0.01]" 
                        : "border-white/[0.1] hover:border-blue-500 bg-slate-950/20"
                  }`}
                >
                  <input 
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept="video/*,image/*"
                    className="hidden"
                  />
                  
                  {uploadedFile ? (
                    <div className="space-y-3 w-full">
                      <div className="mx-auto w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-400 border border-emerald-500/20">
                        {uploadedFile.type === "video" ? <Video className="w-6 h-6" /> : <ImageIcon className="w-6 h-6" />}
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs font-bold text-white max-w-[280px] mx-auto truncate text-center">{uploadedFile.name}</p>
                        <p className="text-[10px] text-slate-400 font-mono uppercase font-bold bg-white/[0.04] inline-block px-2 py-0.5 rounded border border-white/[0.05]">
                          {uploadedFile.type} Asset ({uploadedFile.size})
                        </p>
                      </div>
                      <p className="text-[10px] text-blue-400 hover:underline">Click or drag a different file to replace</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="mx-auto w-11 h-11 bg-slate-900 border border-white/[0.06] rounded-2xl flex items-center justify-center text-slate-400">
                        <Upload className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-slate-200">
                          Click to browse, or drag file here
                        </p>
                        <p className="text-[10px] text-slate-500 mt-1">
                          Supports high-definition Video or Image files
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Requirement 3: Project Title and Description Inputs */}
              <div className="space-y-4 pt-1">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                    2. Analysis Name / Identification
                  </label>
                  <input 
                    type="text"
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    placeholder="e.g. Classic Campaign Video Ad - Cinematic Cut"
                    className="w-full text-xs py-2.5 px-3 rounded-lg bg-slate-950/60 border border-white/[0.08] focus:border-blue-500 focus:outline-none text-slate-200 transition"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 flex justify-between">
                    <span>3. Brief Description (What the project is about)</span>
                    <span className="text-[9.5px] font-mono text-slate-500 lowercase">*Required</span>
                  </label>
                  <textarea 
                    rows={3}
                    required
                    value={projectDescription}
                    onChange={(e) => setProjectDescription(e.target.value)}
                    placeholder="Tell the analyzer are you filming a high-end commercial, social media vlog, family wedding storyboard, corporate interview panel..."
                    className="w-full text-xs p-3 rounded-lg bg-slate-950/60 border border-white/[0.08] focus:border-blue-500 focus:outline-none text-slate-200 transition leading-relaxed placeholder:text-slate-600"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                    4. Requested Improvements
                  </label>
                  <input 
                    type="text"
                    value={improvementNeeds}
                    onChange={(e) => setImprovementNeeds(e.target.value)}
                    placeholder="e.g. Reduce microphone dynamic distortions, repair ambient sunset lighting..."
                    className="w-full text-xs py-2.5 px-3 rounded-lg bg-slate-950/60 border border-white/[0.08] focus:border-blue-500 focus:outline-none text-slate-250 transition placeholder:text-slate-650"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                    5. Campaign Goals & Target Demographics
                  </label>
                  <input 
                    type="text"
                    value={goalsExpectations}
                    onChange={(e) => setGoalsExpectations(e.target.value)}
                    placeholder="e.g. High retention for urban Gen-Z demographic on TikTok..."
                    className="w-full text-xs py-2.5 px-3 rounded-lg bg-slate-950/60 border border-white/[0.08] focus:border-blue-500 focus:outline-none text-slate-250 transition placeholder:text-slate-650"
                  />
                </div>
              </div>

              {/* Requirement 4: Simulated submit triggers */}
              <button
                type="button"
                onClick={handleAnalyze}
                disabled={analysisStatus === "analyzing" || !uploadedFile}
                className={`w-full py-3.5 rounded-xl text-xs font-bold uppercase tracking-widest border transition flex items-center justify-center gap-2 ${
                  !uploadedFile 
                    ? "bg-slate-900 border-white/[0.04] text-slate-500 cursor-not-allowed"
                    : analysisStatus === "analyzing" 
                      ? "bg-slate-950 border-white/[0.05] text-slate-400" 
                      : "bg-blue-600 hover:bg-blue-500 text-white border-blue-500/20 shadow-lg shadow-blue-500/15"
                }`}
              >
                {analysisStatus === "analyzing" ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-blue-400" />
                    <span>Analyzing Asset Matrix...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 text-blue-300" />
                    <span>Initiate AI-Swarm Check</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* MAIN RESULTS DISPLAY AND DIAGNOSTICS DASHBOARD (L-7 columns) */}
          <div className="lg:col-span-7" id="metrics-panel">
            <AnimatePresence mode="wait">
              
              {/* State A: Idle display */}
              {analysisStatus === "idle" && (
                <motion.div 
                  key="idle-state"
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="h-full flex flex-col items-center justify-center text-center p-8 backdrop-blur-md bg-slate-900/20 border border-white/[0.05] rounded-3xl min-h-[500px]"
                >
                  <div className="w-16 h-16 bg-blue-600/5 border border-blue-500/10 rounded-2xl flex items-center justify-center text-blue-400 mb-4 shadow-inner">
                    <Activity className="w-8 h-8 opacity-60 animate-pulse" />
                  </div>
                  <h3 className="text-lg font-bold text-white">Diagnostics Monitoring Port</h3>
                  <p className="text-xs text-slate-400 max-w-[320px] mt-1.5 leading-relaxed">
                    Upload an audio-visual component asset on the left pane and submit to run the multi-agent cognitive simulation.
                  </p>
                  
                  {/* Prompt Guideline Card inside Empty State */}
                  <div className="mt-8 p-4 rounded-2xl bg-white/[0.01] border border-white/[0.04] text-left max-w-sm space-y-2 text-[11px] text-slate-450 leading-relaxed">
                    <div className="font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                      Automatic Feature Mapping
                    </div>
                    <p>The neural parser will inspect metadata parameters, frame sharpness, dynamic contrast range, signal stability, and vocal frequency harmonics to compose a fully tailored report.</p>
                  </div>
                </motion.div>
              )}

              {/* State B: Loading / Analyzing */}
              {analysisStatus === "analyzing" && (
                <motion.div 
                  key="loading-state"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="h-full flex flex-col items-center justify-center p-8 backdrop-blur-md bg-slate-900/20 border border-white/[0.05] rounded-3xl min-h-[500px]"
                >
                  <div className="w-20 h-20 relative flex items-center justify-center mb-6">
                    {/* Ring rotation */}
                    <div className="absolute inset-0 border-4 border-slate-900 rounded-full" />
                    <motion.div 
                      className="absolute inset-0 border-4 border-t-blue-500 border-r-transparent border-b-transparent border-l-transparent rounded-full"
                      animate={{ rotate: 360 }}
                      transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                    />
                    <Bot className="w-8 h-8 text-blue-400 animate-pulse" />
                  </div>

                  <h3 className="text-sm font-semibold tracking-wide text-white uppercase font-mono mb-2">Analyzing Node Assets ({analysisProgress}%)</h3>
                  
                  {/* Progress Line */}
                  <div className="w-full max-w-xs h-1.5 bg-slate-950 rounded-full overflow-hidden border border-white/[0.05] mb-4">
                    <div className="h-full bg-blue-500 rounded-full" style={{ width: `${analysisProgress}%` }} />
                  </div>
                  
                  <p className="text-xs text-slate-400 font-mono text-center max-w-[340px] px-2 italic h-10 flex items-center justify-center">
                    "{loadingStepText}"
                  </p>
                </motion.div>
              )}

              {/* State C: Complete Results Page */}
              {analysisStatus === "completed" && results && (
                <motion.div 
                  key="results-layout"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="space-y-6"
                >
                  <div className="p-5 backdrop-blur-lg bg-[#111827]/70 border border-white/[0.08] rounded-2xl shadow-2xl relative overflow-hidden">
                    {/* Atmospheric Glow */}
                    <div className="absolute -top-12 -right-12 w-40 h-40 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

                    {/* Results Top Header */}
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-white/[0.08] pb-4 mb-4">
                      <div>
                        <span className="text-[10px] font-mono tracking-widest text-slate-500 uppercase font-bold">
                          Campaign Analysis Verdict / {results.mediaType.toUpperCase()} ASSET
                        </span>
                        <h2 className="text-lg font-bold text-white font-display mt-0.5 truncate max-w-[360px]">
                          {results.projectName}
                        </h2>
                      </div>

                      {/* Overall Percentage circular chart */}
                      <div className="flex items-center gap-3 bg-white/[0.02] border border-white/[0.06] p-2.5 rounded-xl shadow-lg">
                        <div className="relative w-12 h-12">
                          <svg className="w-full h-full transform -rotate-90">
                            <circle cx="24" cy="24" r="20" className="stroke-slate-800" strokeWidth="4" fill="transparent" />
                            <motion.circle 
                              cx="24" 
                              cy="24" 
                              r="20" 
                              stroke="#10B981" 
                              strokeWidth="4" 
                              fill="transparent" 
                              strokeDasharray={2 * Math.PI * 25}
                              strokeDashoffset={(2 * Math.PI * 20) * (1 - results.overallScore / 100)}
                              strokeLinecap="round"
                            />
                          </svg>
                          <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-[11px] font-black text-emerald-400 font-mono">{results.overallScore}%</span>
                          </div>
                        </div>
                        <div>
                          <p className="text-[10px] uppercase font-bold tracking-widest text-[#10B981]">Total Impact</p>
                          <p className="text-[11px] text-slate-350 font-bold">Quality Standard Satisfied</p>
                        </div>
                      </div>
                    </div>

                    {/* Grid Category Cards with SVG Circular Charts and Progress Bars */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      
                      {/* CARD 1: Video Quality */}
                      <div className="rounded-xl border border-white/[0.06] bg-slate-950/20 p-4 space-y-3 shadow-inner">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5 font-display">
                            <Video className="w-4 h-4 text-blue-400" />
                            Video Calibration
                          </span>
                          <span className="text-xs font-bold text-blue-400 font-mono">{results.videoQuality.perfectionScore}% score</span>
                        </div>
                        <div className="space-y-2.5">
                          <MetricProgressBar label="Physical Resolution" score={results.videoQuality.resolution} colorClass="bg-blue-500" />
                          <MetricProgressBar label="Lighting Quality Setup" score={results.videoQuality.lighting} colorClass="bg-indigo-500" />
                          <MetricProgressBar label="Spatial Stabilization" score={results.videoQuality.stability} colorClass="bg-sky-500" />
                          <MetricProgressBar label="Framing & Composition" score={results.videoQuality.composition} colorClass="bg-indigo-400" />
                        </div>
                      </div>

                      {/* CARD 2: Visual Quality */}
                      <div className="rounded-xl border border-white/[0.06] bg-slate-950/20 p-4 space-y-3 shadow-inner">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5 font-display">
                            <Sliders className="w-4 h-4 text-emerald-400" />
                            Visual Aesthetics
                          </span>
                          <span className="text-xs font-bold text-emerald-400 font-mono">Verified indices</span>
                        </div>
                        <div className="space-y-2.5">
                          <MetricProgressBar label="LUT Color Correction" score={results.visualQuality.colorGrading} colorClass="bg-emerald-500" />
                          <MetricProgressBar label="Edge Sharpness Depth" score={results.visualQuality.sharpness} colorClass="bg-teal-500" />
                          <MetricProgressBar label="Global Exposure Level" score={results.visualQuality.exposure} colorClass="bg-green-500" />
                          <MetricProgressBar label="Dynamic Range Contrast" score={results.visualQuality.contrast} colorClass="bg-emerald-400" />
                        </div>
                      </div>

                      {/* CARD 3: Content Quality */}
                      <div className="rounded-xl border border-white/[0.06] bg-slate-950/20 p-4 space-y-3 shadow-inner">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5 font-display">
                            <Film className="w-4 h-4 text-amber-400" />
                            Social Engagement
                          </span>
                          <span className="text-xs font-bold text-amber-400 font-mono">Cognitive metrics</span>
                        </div>
                        <div className="space-y-2.5">
                          <MetricProgressBar label="Interactive Storytelling" score={results.contentQuality.storytelling} colorClass="bg-amber-500" />
                          <MetricProgressBar label="Retention & Hook Potential" score={results.contentQuality.engagement} colorClass="bg-orange-500" />
                          <MetricProgressBar label="Brand Professionalism" score={results.contentQuality.professionalism} colorClass="bg-amber-400" />
                          <MetricProgressBar label="Conceptual Originality" score={results.contentQuality.creativity} colorClass="bg-yellow-500" />
                        </div>
                      </div>

                      {/* CARD 4: Audio Quality (Omitted if Image uploaded, showing attention to criteria) */}
                      {results.audioQuality ? (
                        <div className="rounded-xl border border-white/[0.06] bg-slate-950/20 p-4 space-y-3 shadow-inner">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5 font-display">
                              <Volume2 className="w-4 h-4 text-purple-400" />
                              Sound Quality
                            </span>
                            <span className="text-xs font-bold text-purple-400 font-mono">{results.audioQuality.perfectionScore}% score</span>
                          </div>
                          <div className="space-y-2.5 block">
                            <MetricProgressBar label="Clarified Human Voice" score={results.audioQuality.clarity} colorClass="bg-purple-500" />
                            <MetricProgressBar label="Ambient Noise Elimination" score={results.audioQuality.noiseControl} colorClass="bg-fuchsia-500" />
                            <MetricProgressBar label="Volume Range Balance" score={results.audioQuality.volumeConsistency} colorClass="bg-indigo-500" />
                          </div>
                        </div>
                      ) : (
                        <div className="rounded-xl border border-dashed border-white/[0.06] bg-slate-950/40 p-4 flex flex-col justify-center items-center text-center space-y-2">
                          <Volume2 className="w-8 h-8 text-slate-600 opacity-60" />
                          <div>
                            <span className="text-[11px] font-bold text-slate-400 uppercase block tracking-wider">Audio Metrics Disabled</span>
                            <span className="text-[10px] text-slate-500 leading-normal max-w-[220px] block mt-0.5">
                              Audio signals are skipped because your selected asset was categorised as a static image.
                            </span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Circular Score Gauge Container */}
                    <div className="mt-5 border-t border-white/[0.08] pt-5">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-3.5">Cognitive Category Indexes</p>
                      <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 gap-3">
                        <CircularScore score={results.videoQuality.perfectionScore} label="Video Quality Score" accentColor="#3B82F6" delay={0.1} />
                        <CircularScore score={results.audioQuality ? results.audioQuality.perfectionScore : 100} label="Audio perfection score" accentColor="#A855F7" delay={0.2} />
                        <CircularScore score={results.visualQuality.colorGrading} label="Color grading (%)" accentColor="#10B981" delay={0.3} />
                        <CircularScore score={results.contentQuality.professionalism} label="Professionalism (%)" accentColor="#F59E0B" delay={0.4} />
                      </div>
                    </div>
                  </div>

                  {/* Requirements 6: Dynamic Prescribed Actionable Suggestions */}
                  <div className="backdrop-blur-lg bg-[#111827]/70 border border-white/[0.08] rounded-2xl p-5 shadow-2xl">
                    <div className="flex items-center gap-2 pb-3 border-b border-white/[0.08] mb-4">
                      <ListChecks className="h-5 w-5 text-indigo-400" />
                      <h3 className="font-display font-bold text-sm text-white">Recommended Remediation Steps</h3>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      {results.suggestions.map((tip, idx) => {
                        let colorBorder = "border-blue-500/30 bg-blue-500/[0.02]";
                        let prefixBadge = "bg-blue-500/10 text-blue-400 border-blue-500/20";
                        if (tip.category === "visual") {
                          colorBorder = "border-emerald-500/30 bg-emerald-500/[0.02]";
                          prefixBadge = "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
                        } else if (tip.category === "audio") {
                          colorBorder = "border-purple-500/30 bg-purple-500/[0.02]";
                          prefixBadge = "bg-purple-500/10 text-purple-400 border-purple-500/20";
                        } else if (tip.category === "content") {
                          colorBorder = "border-amber-500/30 bg-amber-500/[0.02]";
                          prefixBadge = "bg-amber-500/10 text-amber-400 border-amber-500/20";
                        }

                        return (
                          <div key={idx} className={`p-4 rounded-xl border ${colorBorder} space-y-2 flex flex-col justify-between`}>
                            <div className="space-y-1.5">
                              <div className="flex items-start justify-between gap-2.5">
                                <span className={`text-[9px] font-mono font-black uppercase tracking-widest px-2 py-0.5 rounded border ${prefixBadge}`}>
                                  {tip.category}
                                </span>
                                <span className={`text-[9px] font-mono uppercase tracking-wider ${tip.impact === "High" ? "text-red-400" : "text-amber-400"}`}>
                                  {tip.impact} impact
                                </span>
                              </div>
                              <h4 className="text-xs font-bold text-white mt-1 leading-snug">{tip.title}</h4>
                              <p className="text-[11px] text-slate-400 leading-normal">{tip.description}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Requirements 9: Reports and Controls */}
                  <div className="flex flex-col sm:flex-row items-center gap-3">
                    <button
                      onClick={handlePrintPDF}
                      className="w-full sm:w-auto px-5 py-3 rounded-xl text-xs font-semibold uppercase tracking-wider bg-indigo-600 hover:bg-indigo-500 active:scale-[0.98] text-white flex items-center justify-center gap-2 border border-indigo-500/20 transition shadow-lg shadow-indigo-500/10"
                    >
                      <Download className="w-4 h-4 text-white" />
                      <span>Print PDF Report</span>
                    </button>

                    <button
                      onClick={handleDownloadReportText}
                      className="w-full sm:w-auto px-5 py-3 rounded-xl text-xs font-semibold uppercase tracking-wider bg-slate-900 hover:bg-slate-800 active:scale-[0.98] text-slate-200 flex items-center justify-center gap-2 border border-white/[0.06] transition"
                    >
                      <FileText className="w-4 h-4 text-slate-400" />
                      <span>Download plain text file</span>
                    </button>

                    <button
                      onClick={handleReset}
                      className="w-full sm:w-auto sm:ml-auto px-5 py-3 p-1.5 rounded-xl text-xs font-semibold uppercase tracking-wider bg-transparent hover:bg-slate-900 text-slate-350 flex items-center justify-center gap-2 border border-white/[0.08] transition"
                    >
                      <RotateCcw className="w-4 h-4 text-slate-400" />
                      <span>Analyze Another File</span>
                    </button>
                  </div>

                </motion.div>
              )}
            </AnimatePresence>
          </div>

        </div>
      </main>

      {/* FOOTER BAR */}
      <footer className="border-t border-white/[0.06] bg-[#0c1222] py-5 mt-auto text-center text-xs text-slate-500 font-sans print:hidden" id="footer-credits">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <p>© 2026 Ad-Versary Studio. Designed by Staff Media Architect & AI swarm safety protocols. Content analysis simulated.</p>
          <div className="flex items-center gap-4 text-[10.5px]">
            <span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500 pulse-indicator inline-block" />CPU: 2.1%</span>
            <span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500 pulse-indicator inline-block" />Node Core: stable</span>
            <span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 text-blue-400 inline-block" />Mode: Sandbox Demo</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
