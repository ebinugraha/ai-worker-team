"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRightIcon,
  TerminalIcon,
  MonitorIcon,
  UsersIcon,
  CopyIcon,
  CheckIcon,
  HardDriveIcon,
  ChevronRightIcon,
  CornerDownLeftIcon,
  BotIcon,
  MousePointerClickIcon,
  RefreshCwIcon,
  ShieldCheckIcon,
  ZapIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { SeedAvatar } from "@/components/seed-avatar";
import { HighlightedCode } from "@/components/ui/highlighted-code";
import { cn } from "@/lib/utils";

// Authentic code snippets showcasing Trigger.dev chat.agent & Daytona sandbox
const CODE_SNIPPETS = {
  typescript: `import { chat } from "@trigger.dev/sdk/ai";
import { streamText, stepCountIs } from "ai";
import { sandboxTools } from "./tools";
import { pruneMessageHistory } from "./context";

// Durable AI chat agent that survives network drops, redeploys, and crashes
export const devAgent = chat.agent({
  id: "agent-chat-worker",
  tools: sandboxTools,
  run: async ({ messages, tools, signal }) => {
    const result = streamText({
      model: "custom/my-combo-9router",
      system: "You are a Jarvis-grade autonomous engineer with Daytona sandbox access.",
      messages: pruneMessageHistory(messages),
      tools,
      stopWhen: stepCountIs(80),
      maxOutputTokens: 65536,
      temperature: 0.1,
      abortSignal: signal,
    });

    // Streams tokens to frontend in real-time and captures durable run state
    return chat.pipeAndCapture(result, { signal });
  },
});`,
  python: `from daytona_sdk import Daytona, CreateWorkspaceParams

# Initialize isolated containerized environment
daytona = Daytona()
workspace = daytona.create(
    CreateWorkspaceParams(
        language="typescript",
        image="genichiro/agent-sandbox:ubuntu-24.04",
    )
)

# Execute autonomous terminal instructions with root privileges
result = workspace.process.execute_command(
    "npm run lint && npm run build && npm test"
)
print("Agent verification:", result.result)`,
  curl: `curl https://genichiro.ai/api/v1/agents/chat \\
  -H "Authorization: Bearer gen_sec_2026" \\
  -H "Content-Type: application/json" \\
  -d '{
    "chatId": "group_sec_audit_2026",
    "agent": "Ada",
    "instruction": "Inspect /workspace/api and verify Next.js build integrity",
    "maxTokens": 65536,
    "maxToolSteps": 80
  }'`,
};

// 6 Proven Multi-Agent Architectural Patterns inspired by Trigger.dev
const AGENT_PATTERNS = [
  {
    title: "Autonomous Agents",
    icon: BotIcon,
    tag: "Goal-Driven ReAct",
    description:
      "Self-directed agents that break complex tasks into sub-steps, formulate hypotheses, execute terminal commands, and verify results without human micro-management.",
  },
  {
    title: "Multi-Agent Orchestrator",
    icon: UsersIcon,
    tag: "Dynamic Handoff",
    description:
      "Coordinate specialist agents in shared group threads with dynamic @mentions, allowing seamless delegation between security, fullstack, and research bots.",
  },
  {
    title: "Human-in-the-Loop (HITL)",
    icon: MousePointerClickIcon,
    tag: "Dual Control",
    description:
      "AI operates the virtual Linux desktop autonomously while human engineers can pause execution, approve sensitive actions, or take over keyboard and mouse directly.",
  },
  {
    title: "Durable Task Execution",
    icon: RefreshCwIcon,
    tag: "Zero Timeouts",
    description:
      "Runs survive browser tab closes, network drops, and worker redeployments. Powered by Trigger.dev durable task execution with zero timeout limits.",
  },
  {
    title: "Evaluator-Optimizer Loop",
    icon: ShieldCheckIcon,
    tag: "Continuous Verification",
    description:
      "Iterative feedback cycle applying 4-phase systematic root-cause debugging and verification test runs before signaling task completion.",
  },
  {
    title: "High-Throughput Binary Streaming",
    icon: ZapIcon,
    tag: "100 MB Ingestion",
    description:
      "Direct binary streaming pipeline bypassing multipart limits, allowing instant upload and automated extraction of ZIP codebases directly into the sandbox.",
  },
];

// Specialist Agent Fleet
const AGENT_FLEET = [
  {
    name: "Ada",
    role: "Senior Security & Systems Researcher",
    avatar: "bot-ada",
    badge: "Cyber Defense & Binary Audit",
    description:
      "Defensive vulnerability analysis, binary inspection, secure architecture design, and real-time security remediation inside isolated Linux sandboxes.",
    tools: ["bash_exec", "file_system", "computer_use", "save_memory"],
  },
  {
    name: "Hemingway",
    role: "Lead Fullstack & Systems Architect",
    avatar: "bot-hemingway",
    badge: "Distributed Systems & Next.js",
    description:
      "Crafts high-performance distributed architectures, refactors mission-critical codebases, and drives automated headless verification suites.",
    tools: ["bash_exec", "file_system", "computer_use", "fetch_url"],
  },
  {
    name: "Wong",
    role: "Deep Research & Reconnaissance",
    avatar: "bot-wong",
    badge: "Scientific Synthesis & Web Recon",
    description:
      "Performs structured technical reconnaissance, documentation extraction, algorithmic verification, and literature synthesis across knowledge bases.",
    tools: ["fetch_url", "file_system", "bash_exec", "save_memory"],
  },
  {
    name: "BugBountySenior",
    role: "Penetration Lab & Automated Verification",
    avatar: "bot-bugbounty",
    badge: "Dynamic Fuzzing & Static Analysis",
    description:
      "Runs automated security regression testing, dependency audits, fuzz testing, and environment isolation checks in Daytona virtual machines.",
    tools: ["bash_exec", "computer_use", "file_system", "editFile"],
  },
];

export function LandingPageView() {
  const [activeCodeTab, setActiveCodeTab] =
    React.useState<keyof typeof CODE_SNIPPETS>("typescript");
  const [copied, setCopied] = React.useState(false);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(CODE_SNIPPETS[activeCodeTab]);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-black text-neutral-100 selection:bg-neutral-100 selection:text-neutral-950 font-sans antialiased relative overflow-x-hidden">
      {/* Top Ambient Light Depth */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1100px] h-[450px] bg-gradient-to-b from-neutral-800/15 via-neutral-900/5 to-transparent blur-3xl pointer-events-none -z-10" />

      {/* Subtle Engineering Grid Background */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none -z-10" />

      {/* Floating Minimalist Header (x.ai pattern) */}
      <header className="sticky top-0 z-50 w-full border-b border-neutral-900/80 bg-black/75 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          {/* Brand Logo & Title */}
          <Link
            href="/landing"
            className="flex items-center gap-2.5 select-none hover:opacity-85 transition-opacity"
          >
            <Image
              src="/Logo.svg"
              alt="Genichiro Logo"
              width={22}
              height={20}
              className="size-5.5 object-contain shrink-0"
              priority
            />
            <span className="font-semibold text-sm tracking-tight text-white">
              Genichiro
            </span>
            <span className="text-neutral-700 font-mono text-xs">/</span>
            <span className="text-[11px] font-mono text-neutral-400 hidden sm:inline">
              ai-worker-team
            </span>
          </Link>

          {/* Nav Anchor Links */}
          <nav className="hidden md:flex items-center gap-6 text-xs font-mono text-neutral-400">
            <a href="#patterns" className="hover:text-white transition-colors">
              patterns
            </a>
            <a href="#preview" className="hover:text-white transition-colors">
              workstation
            </a>
            <a href="#capabilities" className="hover:text-white transition-colors">
              primitives
            </a>
            <a href="#architecture" className="hover:text-white transition-colors">
              specs
            </a>
            <a href="#agents" className="hover:text-white transition-colors">
              fleet
            </a>
          </nav>

          {/* Single Minimal Sign In Action Pill */}
          <div className="flex items-center gap-2">
            <Link href="/sign-in">
              <Button
                variant="outline"
                size="sm"
                className="h-8 rounded-full px-4 text-xs font-mono border-neutral-800 bg-neutral-900/80 hover:bg-neutral-800 text-neutral-200 cursor-pointer transition-colors"
              >
                Sign In
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-16 pb-16 md:pt-24 md:pb-24 px-4 sm:px-6 max-w-7xl mx-auto text-center flex flex-col items-center">
        {/* Release Pill with Emerald Pulse Dot */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-neutral-800 bg-neutral-900/80 text-[11px] font-mono text-neutral-300 mb-6 shadow-xs select-none">
          <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span>Powered by Trigger.dev v4 &amp; Daytona Linux Sandboxes</span>
          <ChevronRightIcon className="size-3 text-neutral-500" />
        </div>

        {/* Hero Editorial Headline */}
        <h1 className="text-4xl sm:text-6xl md:text-7xl font-bold tracking-tight text-white max-w-5xl leading-[1.08] mb-6">
          Build &amp; Run Durable AI Agent Squads{" "}
          <span className="text-neutral-500 font-normal block sm:inline">
            with Native Linux Workstations.
          </span>
        </h1>

        {/* Subtitle */}
        <p className="text-sm sm:text-base md:text-lg text-neutral-400 max-w-3xl mx-auto leading-relaxed mb-8 font-normal">
          Durable execution that survives browser refreshes, network drops, and redeployments. Real autonomous engineers with dedicated Daytona cloud sandboxes, 65,536 output tokens, and 60 FPS live visual desktop.
        </p>

        {/* Pill-Shaped Control Ergonomics (Solid White Primary & Outline Secondary) */}
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto justify-center mb-14">
          <Link href="/sign-up" className="w-full sm:w-auto">
            <Button
              size="lg"
              className="w-full sm:w-auto h-10 px-6 rounded-full bg-white text-black font-semibold text-xs hover:bg-neutral-200 cursor-pointer gap-2 shadow-xs transition-colors"
            >
              <span>Initialize Workspace</span>
              <ArrowRightIcon className="size-3.5" />
            </Button>
          </Link>
          <a href="#preview" className="w-full sm:w-auto">
            <Button
              variant="outline"
              size="lg"
              className="w-full sm:w-auto h-10 px-5 rounded-full border-neutral-800 bg-neutral-950/60 text-neutral-300 hover:text-white hover:bg-neutral-900 cursor-pointer text-xs font-mono transition-colors"
            >
              Inspect Trigger.dev Agent Architecture
            </Button>
          </a>
        </div>

        {/* Simulated IDE Workstation Console Window (Hero Console Artifact) */}
        <div
          id="preview"
          className="w-full max-w-5xl rounded-2xl border border-neutral-800 bg-black shadow-2xl overflow-hidden text-left mb-16"
        >
          {/* Top IDE Window Bar */}
          <div className="h-10 px-4 border-b border-neutral-900 bg-neutral-950 flex items-center justify-between text-xs font-mono select-none">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="size-2 rounded-full bg-emerald-500 shrink-0" />
              <span className="text-neutral-300 font-medium truncate">
                genichiro-fleet · 4 agents initialized · Trigger.dev Realtime
              </span>
              <span className="text-neutral-700 hidden sm:inline">|</span>
              <span className="text-neutral-500 text-[11px] hidden sm:inline">
                sandbox:daytona-isolated-c2
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-full text-[10px] bg-neutral-900 border border-neutral-800 text-neutral-400">
                ⌘K Navigator
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-950/60 border border-emerald-800/50 text-emerald-400 font-semibold">
                LIVE 60 FPS
              </span>
            </div>
          </div>

          {/* Split Screen Layout: Left Chat & Trace | Right VNC Workstation */}
          <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[460px]">
            {/* Left Column: ReAct CoT Thought & Tool Execution Trace (7 cols) */}
            <div className="lg:col-span-7 p-4 sm:p-5 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-neutral-900 bg-black">
              <div className="space-y-3.5">
                {/* User Prompt Box */}
                <div className="flex justify-end">
                  <div className="max-w-[85%] rounded-2xl rounded-tr-xs bg-neutral-900 border border-neutral-800 px-3.5 py-2.5 text-xs font-mono text-neutral-200">
                    <span className="text-neutral-500 mr-2 select-none">&gt;</span>
                    Inspect /workspace/api, run security audit, and verify Next.js build.
                  </div>
                </div>

                {/* AI Thought Stream */}
                <div className="space-y-1.5 text-xs">
                  <div className="flex items-center gap-2 text-neutral-400 font-mono text-[11px]">
                    <SeedAvatar seed="bot-ada" size={16} className="rounded" />
                    <span className="font-semibold text-neutral-200">Ada</span>
                    <span className="text-neutral-700">·</span>
                    <span className="text-neutral-500 tabular-nums">thought for 0.4s</span>
                  </div>
                  <p className="text-neutral-400 leading-relaxed pl-6 text-xs font-normal">
                    Accessing isolated container filesystem via Daytona. Running automated security audit on incoming routes, checking dependency boundaries, and compiling Next.js 16 build.
                  </p>
                </div>

                {/* Tool Trace 1: bash_exec */}
                <div className="pl-6 space-y-1">
                  <div className="rounded-xl border border-neutral-800 bg-[#08080a] p-2.5 font-mono text-xs space-y-1.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <div className="flex items-center gap-1.5 text-neutral-300">
                        <span className="text-emerald-400 font-bold">✓</span>
                        <span className="text-neutral-300 font-semibold">bash_exec</span>
                        <span className="text-neutral-500 truncate max-w-[220px]">
                          npm run lint &amp;&amp; npm run build
                        </span>
                      </div>
                      <span className="text-neutral-500 tabular-nums">1.2s</span>
                    </div>
                    <div className="p-2 rounded-lg bg-black border border-neutral-900 text-[10px] text-neutral-400 leading-normal">
                      &gt; ready in 340ms · 0 type errors detected · exit code 0
                    </div>
                  </div>
                </div>

                {/* Tool Trace 2: computer_use */}
                <div className="pl-6 space-y-1">
                  <div className="rounded-xl border border-neutral-800 bg-[#08080a] p-2.5 font-mono text-xs space-y-1.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <div className="flex items-center gap-1.5 text-neutral-300">
                        <span className="text-emerald-400 font-bold">✓</span>
                        <span className="text-neutral-300 font-semibold">computer_use</span>
                        <span className="text-neutral-500">CLICK (640, 380) on Chromium</span>
                      </div>
                      <span className="text-neutral-500 tabular-nums">0.6s</span>
                    </div>
                  </div>
                </div>

                {/* AI Structured Verification Notice */}
                <div className="pl-6 border-l-2 border-emerald-500/80 pt-1 text-xs space-y-1">
                  <span className="font-mono text-emerald-400 text-[11px] font-semibold">
                    ✓ VERIFICATION PASSED
                  </span>
                  <p className="text-neutral-300 leading-relaxed font-sans text-xs">
                    All test suites passed. Sandbox display :1 verified headless GUI rendering without anomalies.
                  </p>
                </div>
              </div>

              {/* Simulated Command Bar Input */}
              <div className="mt-4 pt-3 border-t border-neutral-900">
                <div className="w-full rounded-xl border border-neutral-800 bg-neutral-950 p-2.5 flex items-center justify-between text-xs font-mono">
                  <div className="flex items-center gap-2 text-neutral-500">
                    <TerminalIcon className="size-3.5 text-neutral-400" />
                    <span>Command @Ada...</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-neutral-500">Enter</span>
                    <CornerDownLeftIcon className="size-3 text-neutral-400" />
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Virtual Workstation Console (5 cols) */}
            <div className="lg:col-span-5 bg-[#050505] flex flex-col justify-between p-4">
              {/* Workstation Header */}
              <div className="flex items-center justify-between pb-2.5 border-b border-neutral-900 text-xs font-mono select-none">
                <div className="flex items-center gap-2">
                  <MonitorIcon className="size-3.5 text-neutral-400" />
                  <span className="text-neutral-200 font-semibold">VNC Framebuffer</span>
                </div>
                <div className="flex items-center gap-1.5 text-[10px] text-neutral-500">
                  <span className="size-1.5 rounded-full bg-emerald-500" />
                  <span>1024×768 @ 60Hz</span>
                </div>
              </div>

              {/* Virtual Screen Viewport */}
              <div className="my-3 rounded-xl border border-neutral-800/80 bg-black p-3.5 font-mono text-xs space-y-2 relative overflow-hidden flex-1 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="h-6 rounded-lg bg-neutral-950 border border-neutral-900 px-2.5 flex items-center justify-between text-[10px] text-neutral-400">
                    <span className="flex items-center gap-1.5">
                      <span className="size-1.5 rounded-full bg-neutral-600" />
                      <span>X11 Desktop / Chromium v126</span>
                    </span>
                    <span className="text-neutral-600">display :1</span>
                  </div>

                  <div className="p-3 rounded-lg bg-neutral-950/80 border border-neutral-900 text-[11px] text-neutral-300 space-y-1">
                    <div className="text-emerald-400 font-semibold">
                      $ curl -I http://localhost:3000
                    </div>
                    <div className="text-neutral-500 text-[10px] leading-relaxed">
                      HTTP/1.1 200 OK<br />
                      X-Powered-By: Next.js 16 (Turbopack)<br />
                      Content-Type: text/html; charset=utf-8
                    </div>
                  </div>
                </div>

                {/* Active Simulated Cursor & Coordinate Overlay */}
                <div className="flex items-center justify-between pt-2 border-t border-neutral-900 text-[10px] text-neutral-500 font-mono">
                  <span>cursor: (640, 380)</span>
                  <span className="text-emerald-400">takeover: ready</span>
                </div>

                {/* Visual red dot click marker */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none flex items-center justify-center">
                  <div className="size-5 rounded-full border border-rose-500/80 bg-rose-500/20 flex items-center justify-center animate-ping" />
                  <div className="size-2 rounded-full bg-rose-500 absolute" />
                </div>
              </div>

              {/* Workstation Controls */}
              <div className="flex items-center justify-between pt-2.5 border-t border-neutral-900 text-[11px] font-mono text-neutral-400">
                <span className="flex items-center gap-1.5">
                  <span className="size-1.5 rounded-full bg-neutral-600" />
                  <span>Mode: AI Control</span>
                </span>
                <span className="text-neutral-500 text-[10px]">Virtual Display Bridge</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 6 Multi-Agent Architectural Patterns Section (Inspired by Trigger.dev AI Agent patterns) */}
      <section id="patterns" className="py-20 px-4 sm:px-6 max-w-7xl mx-auto border-t border-neutral-900">
        <div className="text-left mb-12">
          <span className="text-xs font-mono text-neutral-400 uppercase tracking-wider block mb-2">
            Architectural Patterns
          </span>
          <h2 className="text-3xl sm:text-5xl font-bold tracking-tight text-white mb-3">
            6 Proven Patterns for Durable Multi-Agent Systems.
          </h2>
          <p className="text-neutral-400 text-sm sm:text-base max-w-2xl font-normal">
            Inspired by Trigger.dev agent patterns, tailored for autonomous developer teams executing inside isolated Linux environments.
          </p>
        </div>

        {/* 6 Pattern Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {AGENT_PATTERNS.map((pattern) => {
            const Icon = pattern.icon;
            return (
              <div
                key={pattern.title}
                className="rounded-2xl border border-neutral-800/80 bg-neutral-950/80 p-6 flex flex-col justify-between space-y-5 hover:border-neutral-700/80 transition-all duration-200"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="size-9 rounded-xl bg-neutral-900 border border-neutral-800 flex items-center justify-center text-neutral-300">
                      <Icon className="size-4.5" />
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-neutral-900 text-neutral-400 border border-neutral-800">
                      {pattern.tag}
                    </span>
                  </div>
                  <h3 className="text-base font-semibold text-white">
                    {pattern.title}
                  </h3>
                  <p className="text-xs text-neutral-400 leading-relaxed font-normal">
                    {pattern.description}
                  </p>
                </div>

                <div className="pt-3 border-t border-neutral-900 font-mono text-[11px] text-neutral-500 flex items-center gap-1.5">
                  <span className="size-1.5 rounded-full bg-neutral-600" />
                  <span>runtime: native-ts</span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Bento Grid Showcase: Asymmetric Cards (ai-saas-landing-pages pattern) */}
      <section id="capabilities" className="py-20 px-4 sm:px-6 max-w-7xl mx-auto border-t border-neutral-900">
        <div className="text-left mb-12">
          <span className="text-xs font-mono text-neutral-400 uppercase tracking-wider block mb-2">
            Engineering Primitives
          </span>
          <h2 className="text-3xl sm:text-5xl font-bold tracking-tight text-white mb-3">
            Built for Autonomous Execution.
          </h2>
          <p className="text-neutral-400 text-sm sm:text-base max-w-xl font-normal">
            Every agent operates with real Linux kernels, high token execution budgets, and full browser control.
          </p>
        </div>

        {/* Asymmetric Bento Grid: 2-col and 1-col cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Card 1 (Span 2 cols): Multi-Agent Squads & Dynamic Handoff */}
          <div className="md:col-span-2 rounded-2xl border border-neutral-800/80 bg-neutral-950/80 p-6 flex flex-col justify-between space-y-6 hover:border-neutral-700/80 transition-all duration-200">
            <div className="space-y-3">
              <div className="size-9 rounded-xl bg-neutral-900 border border-neutral-800 flex items-center justify-center text-neutral-300">
                <UsersIcon className="size-4.5" />
              </div>
              <h3 className="text-lg font-semibold text-white">
                Multi-Agent Squads &amp; Autonomous Handoff
              </h3>
              <p className="text-xs sm:text-sm text-neutral-400 leading-relaxed max-w-xl font-normal">
                Shared group thread where specialist bots collaborate, mention colleagues via @mentions, and hand off tasks autonomously without human intermediary.
              </p>
            </div>

            {/* Interactive Multi-Agent Preview Snippet */}
            <div className="rounded-xl border border-neutral-800/80 bg-black/80 p-3.5 space-y-2.5 font-mono text-xs">
              <div className="flex items-center gap-2 text-[11px] text-neutral-400">
                <SeedAvatar seed="bot-ada" size={18} className="rounded" />
                <span className="text-neutral-200 font-semibold">Ada</span>
                <span className="text-neutral-600">→</span>
                <span className="text-purple-400 bg-purple-950/40 px-1.5 py-0.5 rounded border border-purple-800/40">@Hemingway</span>
                <span className="text-neutral-500">Security audit complete, staging refactor to main.</span>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-neutral-400 pl-4 border-l border-neutral-800">
                <SeedAvatar seed="bot-hemingway" size={18} className="rounded" />
                <span className="text-neutral-200 font-semibold">Hemingway</span>
                <span className="text-neutral-500">Acknowledged. Running Turbopack compile &amp; verification.</span>
              </div>
            </div>

            <div className="pt-3 border-t border-neutral-900 flex items-center justify-between font-mono text-[11px] text-neutral-500">
              <span>protocol: agent-mention</span>
              <span className="text-neutral-400">zero-context-loss</span>
            </div>
          </div>

          {/* Card 2 (Span 1 col): Daytona Sandboxes */}
          <div className="rounded-2xl border border-neutral-800/80 bg-neutral-950/80 p-6 flex flex-col justify-between space-y-6 hover:border-neutral-700/80 transition-all duration-200">
            <div className="space-y-3">
              <div className="size-9 rounded-xl bg-neutral-900 border border-neutral-800 flex items-center justify-center text-neutral-300">
                <TerminalIcon className="size-4.5" />
              </div>
              <h3 className="text-lg font-semibold text-white">
                Daytona Sandboxes
              </h3>
              <p className="text-xs sm:text-sm text-neutral-400 leading-relaxed font-normal">
                Dedicated containerized Ubuntu 24.04 runtime with root bash, package management, and persistent mounts.
              </p>
            </div>

            <div className="rounded-xl border border-neutral-800/80 bg-black/80 p-3 font-mono text-xs text-neutral-400">
              <span className="text-emerald-400 font-bold">$ </span>
              <span className="text-neutral-200">uname -a</span>
              <div className="text-[10px] text-neutral-500 mt-1">
                Linux daytona-c2 7.0.0-38 #1 SMP x86_64 GNU/Linux
              </div>
            </div>

            <div className="pt-3 border-t border-neutral-900 font-mono text-[11px] text-neutral-500">
              runtime: isolated-c2
            </div>
          </div>

          {/* Card 3 (Span 1 col): 100 MB Binary Streaming */}
          <div className="rounded-2xl border border-neutral-800/80 bg-neutral-950/80 p-6 flex flex-col justify-between space-y-6 hover:border-neutral-700/80 transition-all duration-200">
            <div className="space-y-3">
              <div className="size-9 rounded-xl bg-neutral-900 border border-neutral-800 flex items-center justify-center text-neutral-300">
                <HardDriveIcon className="size-4.5" />
              </div>
              <h3 className="text-lg font-semibold text-white">
                100 MB File Ingestion
              </h3>
              <p className="text-xs sm:text-sm text-neutral-400 leading-relaxed font-normal">
                Stream ZIP codebases and large datasets directly into sandbox filesystems with auto-extraction.
              </p>
            </div>

            <div className="rounded-xl border border-neutral-800/80 bg-black/80 p-3 font-mono text-xs text-neutral-400 space-y-1">
              <div className="flex items-center justify-between text-[10px]">
                <span className="text-neutral-300">repo-archive.zip</span>
                <span className="text-emerald-400 font-semibold">100%</span>
              </div>
              <div className="w-full bg-neutral-900 rounded-full h-1.5 overflow-hidden">
                <div className="bg-emerald-500 h-full w-full rounded-full" />
              </div>
            </div>

            <div className="pt-3 border-t border-neutral-900 font-mono text-[11px] text-neutral-500">
              pipeline: direct-binary
            </div>
          </div>

          {/* Card 4 (Span 2 cols): Live VNC Visual Desktop & Computer Use */}
          <div className="md:col-span-2 rounded-2xl border border-neutral-800/80 bg-neutral-950/80 p-6 flex flex-col justify-between space-y-6 hover:border-neutral-700/80 transition-all duration-200">
            <div className="space-y-3">
              <div className="size-9 rounded-xl bg-neutral-900 border border-neutral-800 flex items-center justify-center text-neutral-300">
                <MonitorIcon className="size-4.5" />
              </div>
              <h3 className="text-lg font-semibold text-white">
                Live VNC Graphical Desktop &amp; Computer Use
              </h3>
              <p className="text-xs sm:text-sm text-neutral-400 leading-relaxed max-w-xl font-normal">
                Real-time graphical desktop with mouse and keyboard control, coordinate mapping (0-1000), screenshot capture, and seamless user takeover.
              </p>
            </div>

            <div className="rounded-xl border border-neutral-800/80 bg-black/80 p-3.5 flex items-center justify-between font-mono text-xs">
              <div className="flex items-center gap-2">
                <span className="size-2 rounded-full bg-emerald-500" />
                <span className="text-neutral-200 font-semibold">novnc-stream</span>
                <span className="text-neutral-500 text-[11px]">1024×768 @ 60 FPS</span>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-neutral-900 border border-neutral-800 text-neutral-300">
                Dual Control Ready
              </span>
            </div>

            <div className="pt-3 border-t border-neutral-900 flex items-center justify-between font-mono text-[11px] text-neutral-500">
              <span>stream: novnc-websocket</span>
              <span className="text-emerald-400">low-latency</span>
            </div>
          </div>
        </div>
      </section>

      {/* Developer Architecture & Code Section ("One Platform. Every Capability.") */}
      <section id="architecture" className="py-20 px-4 sm:px-6 max-w-7xl mx-auto border-t border-neutral-900">
        <div className="text-left mb-12">
          <span className="text-xs font-mono text-neutral-400 uppercase tracking-wider block mb-2">
            System Specifications
          </span>
          <h2 className="text-3xl sm:text-5xl font-bold tracking-tight text-white mb-3">
            Engineered for Deep Workloads.
          </h2>
          <p className="text-neutral-400 text-sm sm:text-base max-w-xl font-normal">
            High throughput metrics and clean programmatic APIs powered by Trigger.dev and the Vercel AI SDK.
          </p>
        </div>

        {/* Monospace Metric Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 mb-10">
          <div className="p-5 rounded-2xl border border-neutral-800/80 bg-neutral-950/80">
            <span className="text-3xl sm:text-4xl font-bold tracking-tight text-white font-mono block mb-1 tabular-nums">
              65,536
            </span>
            <span className="text-xs text-neutral-400 font-mono">
              Max output token budget
            </span>
          </div>

          <div className="p-5 rounded-2xl border border-neutral-800/80 bg-neutral-950/80">
            <span className="text-3xl sm:text-4xl font-bold tracking-tight text-white font-mono block mb-1 tabular-nums">
              80
            </span>
            <span className="text-xs text-neutral-400 font-mono">
              Max autonomous tool turns
            </span>
          </div>

          <div className="p-5 rounded-2xl border border-neutral-800/80 bg-neutral-950/80">
            <span className="text-3xl sm:text-4xl font-bold tracking-tight text-white font-mono block mb-1 tabular-nums">
              &lt;200ms
            </span>
            <span className="text-xs text-neutral-400 font-mono">
              Median stream chunk latency
            </span>
          </div>

          <div className="p-5 rounded-2xl border border-neutral-800/80 bg-neutral-950/80">
            <span className="text-3xl sm:text-4xl font-bold tracking-tight text-white font-mono block mb-1 tabular-nums">
              Zero
            </span>
            <span className="text-xs text-neutral-400 font-mono">
              Timeout limits on background tasks
            </span>
          </div>
        </div>

        {/* Code Snippet Switcher with Shiki Highlighting & Copy Button */}
        <div className="rounded-2xl border border-neutral-800/80 bg-neutral-950 overflow-hidden shadow-xl">
          <div className="h-11 px-4 border-b border-neutral-900 flex items-center justify-between bg-black/90">
            <div className="flex items-center gap-1 sm:gap-2">
              {(["typescript", "python", "curl"] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveCodeTab(tab)}
                  className={cn(
                    "px-3 py-1 rounded-full text-xs font-mono transition-colors cursor-pointer capitalize",
                    activeCodeTab === tab
                      ? "bg-neutral-800 text-white font-semibold"
                      : "text-neutral-500 hover:text-neutral-300"
                  )}
                >
                  {tab === "typescript" ? "TypeScript (Trigger.dev)" : tab}
                </button>
              ))}
            </div>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleCopyCode}
              className="h-7 px-2.5 text-xs font-mono text-neutral-400 hover:text-white gap-1.5 cursor-pointer rounded-full"
            >
              {copied ? (
                <>
                  <CheckIcon className="size-3 text-emerald-400" />
                  <span>Copied</span>
                </>
              ) : (
                <>
                  <CopyIcon className="size-3" />
                  <span>Copy</span>
                </>
              )}
            </Button>
          </div>

          <div className="p-5 overflow-x-auto font-mono text-xs text-neutral-300 leading-relaxed bg-[#050505]">
            <HighlightedCode
              code={CODE_SNIPPETS[activeCodeTab]}
              language={activeCodeTab === "curl" ? "bash" : activeCodeTab}
            />
          </div>
        </div>
      </section>

      {/* Specialist Agent Fleet Showcase */}
      <section id="agents" className="py-20 px-4 sm:px-6 max-w-7xl mx-auto border-t border-neutral-900">
        <div className="text-left mb-12">
          <span className="text-xs font-mono text-neutral-400 uppercase tracking-wider block mb-2">
            Roster &amp; Profiles
          </span>
          <h2 className="text-3xl sm:text-5xl font-bold tracking-tight text-white mb-3">
            Autonomous Teammates.
          </h2>
          <p className="text-neutral-400 text-sm sm:text-base max-w-xl font-normal">
            Each teammate has its own avatar, persona, job specialization, and tool capabilities.
          </p>
        </div>

        {/* Fleet Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {AGENT_FLEET.map((agent) => (
            <div
              key={agent.name}
              className="rounded-2xl border border-neutral-800/80 bg-neutral-950/80 p-5 flex flex-col justify-between hover:border-neutral-700/80 transition-all duration-200"
            >
              <div>
                <div className="flex items-center gap-3 mb-3.5">
                  <div className="size-10 rounded-xl overflow-hidden bg-neutral-900 border border-neutral-800 flex items-center justify-center shrink-0">
                    <SeedAvatar seed={agent.avatar} size={40} />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold text-white truncate">
                      {agent.name}
                    </h3>
                    <span className="text-[11px] text-neutral-400 font-mono block truncate">
                      {agent.role}
                    </span>
                  </div>
                </div>

                <div className="mb-3.5">
                  <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-neutral-900 text-neutral-300 border border-neutral-800 inline-block">
                    {agent.badge}
                  </span>
                </div>

                <p className="text-xs text-neutral-400 leading-relaxed mb-5 font-normal">
                  {agent.description}
                </p>
              </div>

              <div className="pt-3.5 border-t border-neutral-900 flex flex-wrap gap-1.5">
                {agent.tools.map((t) => (
                  <span
                    key={t}
                    className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-black text-neutral-400 border border-neutral-800/80"
                  >
                    {t}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Operational Footer (x.ai pattern) */}
      <footer className="border-t border-neutral-900 py-12 px-4 sm:px-6 max-w-7xl mx-auto text-xs font-mono text-neutral-500">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-2.5">
            <Image
              src="/Logo.svg"
              alt="Genichiro"
              width={18}
              height={16}
              className="size-4.5 object-contain opacity-80"
            />
            <span className="font-semibold text-xs text-neutral-300">
              Genichiro
            </span>
            <span className="text-neutral-700">·</span>
            <span>AI Worker Team Workspace</span>
          </div>

          <div className="flex items-center gap-2 text-[11px] text-neutral-400">
            <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>All Systems Operational</span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-6 border-t border-neutral-900 text-[11px]">
          <p>© 2026 Genichiro. All rights reserved.</p>
          <div className="flex items-center gap-5 text-neutral-400">
            <a href="#patterns" className="hover:text-white transition-colors">
              patterns
            </a>
            <a href="#preview" className="hover:text-white transition-colors">
              workstation
            </a>
            <a href="#capabilities" className="hover:text-white transition-colors">
              primitives
            </a>
            <a href="#architecture" className="hover:text-white transition-colors">
              specs
            </a>
            <a href="#agents" className="hover:text-white transition-colors">
              fleet
            </a>
            <Link href="/settings" className="hover:text-white transition-colors">
              settings
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
