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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { SeedAvatar } from "@/components/seed-avatar";
import { cn } from "@/lib/utils";

// Sample code snippets for developer section
const CODE_SNIPPETS = {
  typescript: `import { chat } from "@trigger.dev/sdk/ai";
import { streamText } from "ai";
import { sandboxTools } from "./tools";

// Initialize autonomous multi-agent task runner
export const devTask = chat.agent({
  id: "genichiro-task-runner",
  run: async (messages, { tools }) => {
    return streamText({
      model: "custom/my-combo-9router",
      system: "You are an autonomous engineering agent with Daytona sandbox access.",
      messages,
      tools: { ...tools, ...sandboxTools },
      maxOutputTokens: 65536,
      stopWhen: stepCountIs(80),
    });
  },
});`,
  python: `from daytona_sdk import Daytona, CreateWorkspaceParams
import os

daytona = Daytona()
workspace = daytona.create(
    CreateWorkspaceParams(
        language="typescript",
        image="genichiro/agent-sandbox:latest",
    )
)

# Execute autonomous terminal instructions
result = workspace.process.execute_command(
    "git clone https://github.com/org/repo.git && npm install && npm test"
)
print("Agent test output:", result.result)`,
  curl: `curl https://genichiro.ai/api/v1/agents/chat \\
  -H "Authorization: Bearer gen_live_key_9router" \\
  -H "Content-Type: application/json" \\
  -d '{
    "chatId": "group_sec_audit_2026",
    "agent": "Ada",
    "instruction": "Inspect /home/daytona/uploads/payload.zip and run automated vulnerability analysis",
    "maxTokens": 65536,
    "maxToolSteps": 80
  }'`,
};

// Specialist Agent Fleet
const AGENT_FLEET = [
  {
    name: "Ada",
    role: "Senior Security & Systems Researcher",
    avatar: "bot-ada",
    badge: "Cyber Defense & Binary Audit",
    description:
      "Defensive vulnerability analysis, binary inspection, secure architecture design, and real-time security remediation inside isolated Linux sandboxes.",
    tools: ["bash_exec", "file_system", "computer_use", "finish_task"],
  },
  {
    name: "Hemingway",
    role: "Lead Fullstack & Systems Architect",
    avatar: "bot-hemingway",
    badge: "Distributed Systems & Next.js",
    description:
      "Crafts high-performance distributed architectures, refactors mission-critical codebases, and drives automated headless verification suites.",
    tools: ["bash_exec", "file_system", "computer_use", "wait"],
  },
  {
    name: "Wong",
    role: "Deep Research & Reconnaissance",
    avatar: "bot-wong",
    badge: "Scientific Synthesis & Web Recon",
    description:
      "Performs structured technical reconnaissance, documentation extraction, algorithmic verification, and literature synthesis across knowledge bases.",
    tools: ["web_search", "file_system", "bash_exec", "finish_task"],
  },
  {
    name: "BugBountySenior",
    role: "Penetration Lab & Automated Verification",
    avatar: "bot-bugbounty",
    badge: "Dynamic Fuzzing & Static Analysis",
    description:
      "Runs automated security regression testing, dependency audits, fuzz testing, and environment isolation checks in Daytona virtual machines.",
    tools: ["bash_exec", "computer_use", "file_system", "handoff"],
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
    <div className="min-h-screen bg-[#09090b] text-zinc-100 selection:bg-zinc-100 selection:text-zinc-950 font-sans antialiased relative overflow-x-hidden">
      {/* Structural Engineering Grid Background */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none -z-10" />

      {/* Top Header Bar */}
      <header className="sticky top-0 z-50 w-full border-b border-zinc-800 bg-[#09090b]/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-12 flex items-center justify-between">
          {/* Brand Logo & Name */}
          <Link
            href="/landing"
            className="flex items-center gap-2.5 select-none hover:opacity-85 transition-opacity"
          >
            <Image
              src="/Logo.svg"
              alt="Genichiro Logo"
              width={22}
              height={20}
              className="h-5 w-auto object-contain shrink-0"
              priority
            />
            <span className="font-semibold text-sm tracking-tight text-zinc-100">
              Genichiro
            </span>
            <span className="text-zinc-600 font-mono text-xs">/</span>
            <span className="text-[11px] font-mono text-zinc-400 hidden sm:inline">
              ai-worker-team
            </span>
          </Link>

          {/* Nav Links */}
          <nav className="hidden md:flex items-center gap-6 text-xs font-mono text-zinc-400">
            <a href="#capabilities" className="hover:text-zinc-100 transition-colors">
              capabilities
            </a>
            <a href="#preview" className="hover:text-zinc-100 transition-colors">
              ide-workstation
            </a>
            <a href="#agents" className="hover:text-zinc-100 transition-colors">
              agent-fleet
            </a>
            <a href="#architecture" className="hover:text-zinc-100 transition-colors">
              specs
            </a>
          </nav>

          {/* Action CTAs */}
          <div className="flex items-center gap-2">
            <Link href="/sign-in">
              <Button
                variant="outline"
                size="sm"
                className="h-7 rounded-md px-3 text-xs font-mono border-zinc-800 bg-zinc-900/80 hover:bg-zinc-800 text-zinc-200 cursor-pointer"
              >
                Sign In
              </Button>
            </Link>
            <Link href="/sign-up">
              <Button
                size="sm"
                className="h-7 rounded-md px-3 text-xs font-mono font-medium bg-zinc-100 text-zinc-950 hover:bg-white border border-zinc-200 cursor-pointer"
              >
                Deploy Fleet
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-16 pb-16 md:pt-24 md:pb-24 px-4 sm:px-6 max-w-7xl mx-auto text-center flex flex-col items-center">
        {/* Release Pill */}
        <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md border border-zinc-800 bg-zinc-900/90 text-[11px] font-mono text-zinc-300 mb-6 shadow-xs select-none">
          <span className="size-1.5 rounded-full bg-zinc-400" />
          <span>v2.4.0 · Autonomous Cloud Sandbox & Virtual Display</span>
          <ChevronRightIcon className="size-3 text-zinc-500" />
        </div>

        {/* Hero Headline */}
        <h1 className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight text-zinc-100 max-w-5xl leading-[1.08] mb-5">
          High-Craft Autonomous Agents{" "}
          <span className="text-zinc-500 font-normal block sm:inline">
            with Native Linux Workstations.
          </span>
        </h1>

        {/* Subtitle */}
        <p className="text-sm sm:text-base md:text-lg text-zinc-400 max-w-2xl mx-auto leading-relaxed mb-8 font-normal">
          Not conversational chatbot toys. Real autonomous engineers with dedicated Daytona cloud sandboxes, live VNC display capture, and high token limits.
        </p>

        {/* Hero Actions */}
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto justify-center mb-12">
          <Link href="/sign-up" className="w-full sm:w-auto">
            <Button
              size="lg"
              className="w-full sm:w-auto h-9 px-5 rounded-md bg-zinc-100 text-zinc-950 font-mono text-xs font-medium hover:bg-white border border-zinc-200 cursor-pointer gap-2 shadow-xs"
            >
              <span>Initialize Workspace</span>
              <ArrowRightIcon className="size-3.5" />
            </Button>
          </Link>
          <a href="#preview" className="w-full sm:w-auto">
            <Button
              variant="outline"
              size="lg"
              className="w-full sm:w-auto h-9 px-4 rounded-md border-zinc-800 bg-zinc-900/60 text-zinc-300 hover:text-white hover:bg-zinc-800/80 cursor-pointer text-xs font-mono"
            >
              Inspect IDE Architecture
            </Button>
          </a>
        </div>

        {/* Interactive Split-Screen IDE Preview Mockup */}
        <div
          id="preview"
          className="w-full max-w-5xl rounded-lg border border-zinc-800 bg-[#09090b] shadow-lg overflow-hidden text-left"
        >
          {/* Top IDE Window Bar */}
          <div className="h-9 px-3 border-b border-zinc-800 bg-zinc-950 flex items-center justify-between text-xs font-mono select-none">
            <div className="flex items-center gap-2 min-w-0">
              <span className="size-2 rounded-full bg-emerald-500 shrink-0" />
              <span className="text-zinc-400 font-medium truncate">
                genichiro-fleet · 4 agents initialized
              </span>
              <span className="text-zinc-600 hidden sm:inline">|</span>
              <span className="text-zinc-500 text-[11px] hidden sm:inline">
                sandbox:daytona-isolated-c2
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-1.5 py-0.5 rounded text-[10px] bg-zinc-900 border border-zinc-800 text-zinc-400">
                ⌘K Navigator
              </span>
              <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-950/60 border border-emerald-800/50 text-emerald-400 font-semibold">
                LIVE 60 FPS
              </span>
            </div>
          </div>

          {/* Split Screen Layout: Left Chat & Trace | Hairline Divider | Right VNC Workstation */}
          <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[440px]">
            {/* Left Column: Chat & Tool Execution Trace (7 cols) */}
            <div className="lg:col-span-7 p-4 sm:p-5 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-zinc-800/80 bg-[#09090b]">
              <div className="space-y-3.5">
                {/* User Prompt Box */}
                <div className="flex justify-end">
                  <div className="max-w-[85%] rounded-md bg-zinc-900 border border-zinc-800 px-3 py-2 text-xs font-mono text-zinc-200">
                    <span className="text-zinc-500 mr-2 select-none">&gt;</span>
                    Inspect /workspace/api, run security fuzzer, and verify Next.js build.
                  </div>
                </div>

                {/* AI Thought Stream */}
                <div className="space-y-1.5 text-xs">
                  <div className="flex items-center gap-2 text-zinc-400 font-mono text-[11px]">
                    <SeedAvatar seed="bot-ada" size={16} className="rounded" />
                    <span className="font-semibold text-zinc-200">Ada</span>
                    <span className="text-zinc-600">·</span>
                    <span className="text-zinc-500 tabular-nums">thought for 0.4s</span>
                  </div>
                  <p className="text-zinc-400 leading-relaxed pl-6 text-xs">
                    Accessing isolated container filesystem. Running static security analysis on incoming routes, verifying dependency boundaries, and triggering Turbopack compile.
                  </p>
                </div>

                {/* Compact Tool Trace 1: bash_exec */}
                <div className="pl-6 space-y-1">
                  <div className="rounded-md border border-zinc-800 bg-[#050505] p-2 font-mono text-xs space-y-1.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <div className="flex items-center gap-1.5 text-zinc-300">
                        <span className="text-emerald-400 font-bold">✓</span>
                        <span className="text-zinc-400 font-semibold">bash_exec</span>
                        <span className="text-zinc-500 truncate max-w-[220px]">
                          npm run lint &amp;&amp; npx tsc --noEmit
                        </span>
                      </div>
                      <span className="text-zinc-500 tabular-nums">1.2s</span>
                    </div>
                    <div className="p-1.5 rounded bg-black border border-zinc-800/60 text-[10px] text-zinc-400 leading-normal">
                      &gt; ready in 340ms · 0 type errors detected · exit code 0
                    </div>
                  </div>
                </div>

                {/* Compact Tool Trace 2: computer_use */}
                <div className="pl-6 space-y-1">
                  <div className="rounded-md border border-zinc-800 bg-[#050505] p-2 font-mono text-xs space-y-1.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <div className="flex items-center gap-1.5 text-zinc-300">
                        <span className="text-emerald-400 font-bold">✓</span>
                        <span className="text-zinc-400 font-semibold">computer_use</span>
                        <span className="text-zinc-500">CLICK (640, 380) on Chromium</span>
                      </div>
                      <span className="text-zinc-500 tabular-nums">0.6s</span>
                    </div>
                  </div>
                </div>

                {/* AI Structured Output */}
                <div className="pl-6 border-l border-emerald-500/60 pt-1 text-xs space-y-1">
                  <span className="font-mono text-emerald-400 text-[11px] font-semibold">
                    ✓ VERIFICATION PASSED
                  </span>
                  <p className="text-zinc-300 leading-relaxed font-sans text-xs">
                    All 24 test suites passed. Sandbox display :1 verified headless GUI rendering without anomalies.
                  </p>
                </div>
              </div>

              {/* Simulated Command Bar Input */}
              <div className="mt-4 pt-3 border-t border-zinc-800/60">
                <div className="w-full rounded-md border border-zinc-800 bg-zinc-900/60 p-2 flex items-center justify-between text-xs font-mono">
                  <div className="flex items-center gap-2 text-zinc-500">
                    <TerminalIcon className="size-3.5 text-zinc-400" />
                    <span>Command @Ada...</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-zinc-500">Enter</span>
                    <CornerDownLeftIcon className="size-3 text-zinc-400" />
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Virtual Workstation Console (5 cols) */}
            <div className="lg:col-span-5 bg-[#050505] flex flex-col justify-between p-3 sm:p-4">
              {/* Workstation Header */}
              <div className="flex items-center justify-between pb-2 border-b border-zinc-800/60 text-xs font-mono select-none">
                <div className="flex items-center gap-2">
                  <MonitorIcon className="size-3.5 text-zinc-400" />
                  <span className="text-zinc-300 font-semibold">VNC Framebuffer</span>
                </div>
                <div className="flex items-center gap-1.5 text-[10px] text-zinc-500">
                  <span className="size-1.5 rounded-full bg-emerald-500" />
                  <span>1024×768 @ 60Hz</span>
                </div>
              </div>

              {/* Virtual Screen Viewport */}
              <div className="my-3 rounded-md border border-zinc-800 bg-black p-3 font-mono text-xs space-y-2 relative overflow-hidden flex-1 flex flex-col justify-between">
                {/* Synthetic GUI Desktop state */}
                <div className="space-y-2">
                  <div className="h-5 rounded bg-zinc-900 border border-zinc-800 px-2 flex items-center justify-between text-[10px] text-zinc-400">
                    <span className="flex items-center gap-1.5">
                      <span className="size-1.5 rounded-full bg-zinc-600" />
                      <span>X11 Desktop / Chromium v126</span>
                    </span>
                    <span className="text-zinc-600">display :1</span>
                  </div>

                  <div className="p-2.5 rounded bg-zinc-950 border border-zinc-800/80 text-[11px] text-zinc-300 space-y-1">
                    <div className="text-emerald-400 font-semibold">
                      $ curl -I http://localhost:3000
                    </div>
                    <div className="text-zinc-500 text-[10px]">
                      HTTP/1.1 200 OK<br />
                      X-Powered-By: Next.js 16 (Turbopack)<br />
                      Content-Type: text/html; charset=utf-8
                    </div>
                  </div>
                </div>

                {/* Active Simulated Cursor & Coordinate Overlay */}
                <div className="flex items-center justify-between pt-2 border-t border-zinc-900 text-[10px] text-zinc-500 font-mono">
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
              <div className="flex items-center justify-between pt-2 border-t border-zinc-800/60 text-[11px] font-mono text-zinc-400">
                <span className="flex items-center gap-1.5">
                  <span className="size-1.5 rounded-full bg-zinc-600" />
                  <span>Mode: AI Control</span>
                </span>
                <span className="text-zinc-500 text-[10px]">Virtual Display Bridge</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Core Architectural Capabilities Grid */}
      <section id="capabilities" className="py-16 px-4 sm:px-6 max-w-7xl mx-auto border-t border-zinc-800">
        <div className="text-left mb-10">
          <span className="text-xs font-mono text-zinc-400 uppercase tracking-wider block mb-2">
            Engineering Primitives
          </span>
          <h2 className="text-2xl sm:text-4xl font-bold tracking-tight text-zinc-100 mb-3">
            Built for Autonomous Execution.
          </h2>
          <p className="text-zinc-400 text-sm max-w-xl">
            Every agent operates with real Linux kernels, high token execution budgets, and full browser control.
          </p>
        </div>

        {/* 4 Technical Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-md border border-zinc-800 bg-[#121215] flex flex-col justify-between space-y-4">
            <div className="space-y-2">
              <div className="size-8 rounded-md bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-300">
                <UsersIcon className="size-4" />
              </div>
              <h3 className="text-sm font-semibold text-zinc-200">
                Multi-Agent Squads
              </h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Shared group thread where specialist bots collaborate, mention colleagues, and hand off tasks autonomously.
              </p>
            </div>
            <div className="pt-2 border-t border-zinc-800/60 font-mono text-[10px] text-zinc-500">
              protocol: agent-mention
            </div>
          </div>

          <div className="p-4 rounded-md border border-zinc-800 bg-[#121215] flex flex-col justify-between space-y-4">
            <div className="space-y-2">
              <div className="size-8 rounded-md bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-300">
                <TerminalIcon className="size-4" />
              </div>
              <h3 className="text-sm font-semibold text-zinc-200">
                Daytona Sandboxes
              </h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Dedicated containerized Ubuntu 24.04 runtime with full bash, package management, and persistent mounts.
              </p>
            </div>
            <div className="pt-2 border-t border-zinc-800/60 font-mono text-[10px] text-zinc-500">
              runtime: isolated-c2
            </div>
          </div>

          <div className="p-4 rounded-md border border-zinc-800 bg-[#121215] flex flex-col justify-between space-y-4">
            <div className="space-y-2">
              <div className="size-8 rounded-md bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-300">
                <MonitorIcon className="size-4" />
              </div>
              <h3 className="text-sm font-semibold text-zinc-200">
                Live VNC Desktop
              </h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Real-time graphical desktop with manual user takeover, coordinate click markers, and 60 FPS streaming.
              </p>
            </div>
            <div className="pt-2 border-t border-zinc-800/60 font-mono text-[10px] text-zinc-500">
              stream: novnc-websocket
            </div>
          </div>

          <div className="p-4 rounded-md border border-zinc-800 bg-[#121215] flex flex-col justify-between space-y-4">
            <div className="space-y-2">
              <div className="size-8 rounded-md bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-300">
                <HardDriveIcon className="size-4" />
              </div>
              <h3 className="text-sm font-semibold text-zinc-200">
                100 MB File Ingestion
              </h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Stream ZIP codebases and large documents directly into sandbox filesystems with auto-extraction.
              </p>
            </div>
            <div className="pt-2 border-t border-zinc-800/60 font-mono text-[10px] text-zinc-500">
              pipeline: direct-binary
            </div>
          </div>
        </div>
      </section>

      {/* Developer Architecture & Code Section */}
      <section id="architecture" className="py-16 px-4 sm:px-6 max-w-7xl mx-auto border-t border-zinc-800">
        <div className="text-left mb-10">
          <span className="text-xs font-mono text-zinc-400 uppercase tracking-wider block mb-2">
            System Specifications
          </span>
          <h2 className="text-2xl sm:text-4xl font-bold tracking-tight text-zinc-100 mb-3">
            Engineered for Deep Workloads.
          </h2>
          <p className="text-zinc-400 text-sm max-w-xl">
            High throughput metrics and clean programmatic APIs powered by Trigger.dev and the Vercel AI SDK.
          </p>
        </div>

        {/* Technical Metric Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-10">
          <div className="p-4 rounded-md border border-zinc-800 bg-[#121215]">
            <span className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-100 font-mono block mb-1 tabular-nums">
              65,536
            </span>
            <span className="text-xs text-zinc-400 font-mono">
              Max output token budget
            </span>
          </div>

          <div className="p-4 rounded-md border border-zinc-800 bg-[#121215]">
            <span className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-100 font-mono block mb-1 tabular-nums">
              80
            </span>
            <span className="text-xs text-zinc-400 font-mono">
              Max autonomous tool turns
            </span>
          </div>

          <div className="p-4 rounded-md border border-zinc-800 bg-[#121215]">
            <span className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-100 font-mono block mb-1 tabular-nums">
              &lt;200ms
            </span>
            <span className="text-xs text-zinc-400 font-mono">
              Median stream chunk latency
            </span>
          </div>

          <div className="p-4 rounded-md border border-zinc-800 bg-[#121215]">
            <span className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-100 font-mono block mb-1 tabular-nums">
              100%
            </span>
            <span className="text-xs text-zinc-400 font-mono">
              Isolated Linux environments
            </span>
          </div>
        </div>

        {/* Code Snippet Switcher */}
        <div className="rounded-md border border-zinc-800 bg-[#121215] overflow-hidden shadow-xs">
          <div className="h-9 px-3 border-b border-zinc-800 flex items-center justify-between bg-zinc-950">
            <div className="flex items-center gap-1 sm:gap-2">
              {(["typescript", "python", "curl"] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveCodeTab(tab)}
                  className={cn(
                    "px-2.5 py-1 rounded text-xs font-mono transition-colors cursor-pointer capitalize",
                    activeCodeTab === tab
                      ? "bg-zinc-800 text-zinc-100 font-semibold"
                      : "text-zinc-500 hover:text-zinc-300"
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
              className="h-6 px-2 text-xs font-mono text-zinc-400 hover:text-zinc-100 gap-1.5 cursor-pointer rounded"
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

          <pre className="p-4 sm:p-5 overflow-x-auto font-mono text-xs text-zinc-300 leading-relaxed bg-[#050505]">
            <code>{CODE_SNIPPETS[activeCodeTab]}</code>
          </pre>
        </div>
      </section>

      {/* Specialist Agent Fleet Showcase */}
      <section id="agents" className="py-16 px-4 sm:px-6 max-w-7xl mx-auto border-t border-zinc-800">
        <div className="text-left mb-10">
          <span className="text-xs font-mono text-zinc-400 uppercase tracking-wider block mb-2">
            Roster &amp; Profiles
          </span>
          <h2 className="text-2xl sm:text-4xl font-bold tracking-tight text-zinc-100 mb-3">
            Autonomous Teammates.
          </h2>
          <p className="text-zinc-400 text-sm max-w-xl">
            Each teammate has its own avatar, persona, job specialization, and tool capabilities.
          </p>
        </div>

        {/* Fleet Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {AGENT_FLEET.map((agent) => (
            <div
              key={agent.name}
              className="rounded-md border border-zinc-800 bg-[#121215] p-4 flex flex-col justify-between hover:border-zinc-700 transition-colors"
            >
              <div>
                <div className="flex items-center gap-3 mb-3">
                  <div className="size-9 rounded-md overflow-hidden bg-zinc-900 border border-zinc-800 flex items-center justify-center shrink-0">
                    <SeedAvatar seed={agent.avatar} size={36} />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-xs font-semibold text-zinc-100 truncate">
                      {agent.name}
                    </h3>
                    <span className="text-[11px] text-zinc-400 font-mono block truncate">
                      {agent.role}
                    </span>
                  </div>
                </div>

                <div className="mb-3">
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-900 text-zinc-300 border border-zinc-800">
                    {agent.badge}
                  </span>
                </div>

                <p className="text-xs text-zinc-400 leading-relaxed mb-4">
                  {agent.description}
                </p>
              </div>

              <div className="pt-3 border-t border-zinc-800/60 flex flex-wrap gap-1">
                {agent.tools.map((t) => (
                  <span
                    key={t}
                    className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-zinc-950 text-zinc-400 border border-zinc-800"
                  >
                    {t}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-800 py-10 px-4 sm:px-6 max-w-7xl mx-auto text-xs font-mono text-zinc-500">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-2.5">
            <Image
              src="/Logo.svg"
              alt="Genichiro"
              width={18}
              height={16}
              className="h-4 w-auto object-contain opacity-80"
            />
            <span className="font-semibold text-xs text-zinc-300">
              Genichiro
            </span>
            <span className="text-zinc-700">·</span>
            <span>AI Worker Team Workspace</span>
          </div>

          <div className="flex items-center gap-2 text-[11px] text-zinc-400">
            <span className="size-1.5 rounded-full bg-emerald-500" />
            <span>Systems Online</span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-zinc-800/60 text-[11px]">
          <p>© 2026 Genichiro. All rights reserved.</p>
          <div className="flex items-center gap-4 text-zinc-400">
            <a href="#capabilities" className="hover:text-zinc-200 transition-colors">
              capabilities
            </a>
            <a href="#preview" className="hover:text-zinc-200 transition-colors">
              workstation
            </a>
            <a href="#agents" className="hover:text-zinc-200 transition-colors">
              agents
            </a>
            <Link href="/settings" className="hover:text-zinc-200 transition-colors">
              settings
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
