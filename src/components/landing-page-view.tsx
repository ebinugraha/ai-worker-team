"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRightIcon,
  TerminalIcon,
  MonitorIcon,
  UsersIcon,
  SparklesIcon,
  CopyIcon,
  CheckIcon,
  HardDriveIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
    badge: "Cyber Defense & Reverse Engineering",
    description:
      "Specializes in defensive vulnerability analysis, binary inspection, secure architecture design, and real-time security remediation inside isolated sandboxes.",
    tools: ["bash", "readFile", "openImage", "grepTool"],
  },
  {
    name: "Hemingway",
    role: "Lead Fullstack & Systems Architect",
    avatar: "bot-hemingway",
    badge: "Core Engineering & Scalability",
    description:
      "Crafts high-performance distributed systems, writes robust type-safe codebases, refactors complex architectures, and drives continuous integration suites.",
    tools: ["bash", "gitWorkflow", "testRunner", "packageAudit"],
  },
  {
    name: "Wong",
    role: "Deep Research & Knowledge Intelligence",
    avatar: "bot-wong",
    badge: "Scientific Synthesis & Recon",
    description:
      "Performs structured technical reconnaissance, documentation extraction, algorithmic analysis, and deep multi-source literature synthesis.",
    tools: ["webSearch", "pdfExtractor", "semanticIndex", "readFile"],
  },
  {
    name: "BugBountySenior",
    role: "Defensive Code Audit & Penetration Lab",
    avatar: "bot-bugbounty",
    badge: "Automated Lab Verification",
    description:
      "Runs automated security scanning, fuzz testing, dependency audits, and strict environment validation within educational containment sandboxes.",
    tools: ["sandboxBash", "networkScan", "logInspector", "diffViewer"],
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
    <div className="min-h-screen bg-black text-white selection:bg-white selection:text-black font-sans antialiased relative overflow-x-hidden">
      {/* Background ambient lighting */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[550px] bg-gradient-to-b from-neutral-800/20 via-neutral-900/10 to-transparent blur-3xl pointer-events-none -z-10" />

      {/* Floating Top Navigation Bar (x.ai style) */}
      <header className="sticky top-0 z-50 w-full border-b border-neutral-900/80 bg-black/75 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          {/* Brand Logo & Name */}
          <Link
            href="/landing"
            className="flex items-center gap-3 select-none hover:opacity-85 transition-opacity"
          >
            <Image
              src="/Logo.svg"
              alt="Genichiro Logo"
              width={26}
              height={24}
              className="h-5.5 w-auto object-contain shrink-0"
              priority
            />
            <span className="font-semibold text-base tracking-tight text-white">
              Genichiro
            </span>
          </Link>

          {/* Nav Links (Desktop) */}
          <nav className="hidden md:flex items-center gap-7 text-xs font-medium text-neutral-400">
            <a
              href="#capabilities"
              className="hover:text-white transition-colors"
            >
              Capabilities
            </a>
            <a href="#agents" className="hover:text-white transition-colors">
              Agents
            </a>
            <a href="#sandbox" className="hover:text-white transition-colors">
              Daytona Sandbox
            </a>
            <a href="#metrics" className="hover:text-white transition-colors">
              Architecture
            </a>
          </nav>

          {/* Action CTAs */}
          <div className="flex items-center gap-2.5">
            <Link href="/sign-in">
              <Button
                size="sm"
                className="h-8 rounded-full px-4 text-xs font-medium text-neutral-200 bg-neutral-900 hover:bg-neutral-800 hover:text-white border border-neutral-800 transition-colors cursor-pointer"
              >
                Sign In
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-20 pb-20 md:pt-28 md:pb-28 px-4 sm:px-6 max-w-7xl mx-auto text-center flex flex-col items-center">
        {/* Release / Announcement Pill */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full border border-neutral-800 bg-neutral-950/80 text-[11px] font-medium text-neutral-300 mb-8 backdrop-blur-md shadow-xs animate-in fade-in slide-in-from-top-4 duration-700">
          <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span>New · Autonomous Multi-Agent Sandbox Architecture</span>
        </div>

        {/* Hero Headline (x.ai typography style) */}
        <h1 className="text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-bold tracking-tight text-white max-w-5xl leading-[1.08] mb-6">
          Autonomous AI Workers{" "}
          <span className="text-neutral-400 font-medium block sm:inline">
            for everything you build & execute.
          </span>
        </h1>

        {/* Subtitle */}
        <p className="text-base sm:text-lg md:text-xl text-neutral-400 max-w-2xl mx-auto font-normal leading-relaxed mb-10">
          Reasoning, terminal execution, live VNC visual desktop, and multi-agent
          collaboration. Powered by dedicated Daytona Linux sandboxes and Trigger.dev.
        </p>

        {/* Hero Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-3.5 w-full sm:w-auto justify-center mb-16">
          <Link href="/sign-up" className="w-full sm:w-auto">
            <Button
              size="lg"
              className="w-full sm:w-auto h-11 px-7 rounded-full bg-white text-black font-semibold text-sm hover:bg-neutral-200 transition-colors cursor-pointer gap-2"
            >
              Start Building Free
              <ArrowRightIcon className="size-4" data-icon="inline-end" />
            </Button>
          </Link>
          <a href="#capabilities" className="w-full sm:w-auto">
            <Button
              variant="outline"
              size="lg"
              className="w-full sm:w-auto h-11 px-6 rounded-full border-neutral-800 bg-neutral-950/60 text-neutral-300 hover:text-white hover:bg-neutral-900 transition-colors cursor-pointer text-sm font-medium"
            >
              Explore Capabilities
            </Button>
          </a>
        </div>

        {/* Simulated Interactive Hero Console (Hero Artifact) */}
        <div className="w-full max-w-4xl rounded-2xl border border-neutral-800/90 bg-neutral-950/90 shadow-2xl overflow-hidden backdrop-blur-md text-left">
          {/* Window Bar */}
          <div className="h-10 px-4 border-b border-neutral-900 flex items-center justify-between bg-neutral-900/40">
            <div className="flex items-center gap-2">
              <div className="size-3 rounded-full bg-neutral-800" />
              <div className="size-3 rounded-full bg-neutral-800" />
              <div className="size-3 rounded-full bg-neutral-800" />
              <span className="text-xs font-mono text-neutral-500 ml-2">
                genichiro-workspace · 4 bots active
              </span>
            </div>
            <div className="flex items-center gap-2 text-[11px] font-mono text-neutral-400">
              <span className="size-2 rounded-full bg-emerald-500" />
              <span>Daytona Cloud Sandbox: Online</span>
            </div>
          </div>

          {/* Console Content Preview */}
          <div className="p-5 sm:p-6 font-mono text-xs sm:text-sm space-y-4 text-neutral-300">
            {/* User message */}
            <div className="flex items-start gap-3">
              <span className="text-neutral-500 select-none">user@genichiro:~$</span>
              <span className="text-white">
                Audit repositori layanan backend, jalankan vulnerability scan, dan verifikasi test suite di sandbox
              </span>
            </div>

            {/* Agent reasoning trace */}
            <div className="rounded-lg bg-neutral-900/60 border border-neutral-800/60 p-3 space-y-2">
              <div className="flex items-center gap-2 text-neutral-400 text-xs">
                <SparklesIcon className="size-3.5 text-amber-400" />
                <span className="font-semibold text-neutral-200">
                  Ada (Security & Systems Researcher)
                </span>
                <span className="text-neutral-500">· Thought for 1.4s</span>
              </div>
              <div className="text-neutral-400 text-xs pl-5.5 leading-relaxed">
                Mengakses sandbox Linux terisolasi. Melakukan static analysis terhadap codebase, memeriksa audit dependensi, dan menjalankan automated integration test.
              </div>
            </div>

            {/* Simulated Tool Execution */}
            <div className="rounded-lg bg-black/80 border border-neutral-800/80 p-3 text-xs space-y-1.5">
              <div className="text-neutral-400 flex items-center justify-between">
                <span>▸ bashTool: npm audit --audit-level=high && npm test</span>
                <span className="text-emerald-400">exitCode: 0</span>
              </div>
              <div className="text-neutral-500 text-[11px]">
                ✓ 48 test suites passed, 0 vulnerabilities found.<br />
                ✓ Sandbox container listening on http://localhost:3000<br />
                ✓ Live visual desktop active on display :0
              </div>
            </div>

            {/* Agent Final Output */}
            <div className="text-neutral-200 text-xs sm:text-sm pl-2 border-l-2 border-emerald-500/80">
              <p className="font-semibold text-white mb-1">
                Ada: Audit & Verifikasi Berhasil.
              </p>
              <p className="text-neutral-400 leading-relaxed">
                Seluruh 48 skenario pengujian berhasil dilewati tanpa celah keamanan. Service backend berjalan stabil di dalam sandbox Daytona dan siap untuk deployment.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Core Capabilities Bento Grid (x.ai style) */}
      <section id="capabilities" className="py-20 px-4 sm:px-6 max-w-7xl mx-auto">
        <div className="text-left mb-12">
          <Badge
            variant="outline"
            className="h-6 px-2.5 text-[11px] font-mono text-neutral-400 border-neutral-800 rounded-full mb-3"
          >
            Core Capabilities
          </Badge>
          <h2 className="text-3xl sm:text-5xl font-bold tracking-tight text-white mb-4">
            Autonomous execution. Zero compromise.
          </h2>
          <p className="text-neutral-400 text-base sm:text-lg max-w-2xl font-normal">
            Every AI agent is equipped with a real Linux cloud sandbox, high token
            budgets, and multimodal toolkits to deliver finished results.
          </p>
        </div>

        {/* Bento Grid Layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {/* Card 1: Multi-Agent Group Chat (Large) */}
          <div className="lg:col-span-2 rounded-2xl border border-neutral-800/80 bg-neutral-950/60 p-6 sm:p-8 flex flex-col justify-between hover:border-neutral-700 transition-colors group">
            <div>
              <div className="size-10 rounded-xl bg-neutral-900 border border-neutral-800 flex items-center justify-center text-white mb-5">
                <UsersIcon className="size-5" />
              </div>
              <h3 className="text-xl sm:text-2xl font-semibold text-white mb-2">
                Collaborative Multi-Agent Squads
              </h3>
              <p className="text-neutral-400 text-sm leading-relaxed mb-6 max-w-xl">
                Group chats where multiple agents (Researchers, Engineers, Architects)
                work together in the same thread. Hand off tasks or mention specific
                specialists to solve complex multidisciplinary problems.
              </p>
            </div>

            {/* Visual preview */}
            <div className="rounded-xl border border-neutral-800/80 bg-black/60 p-4 space-y-3 font-mono text-xs">
              <div className="flex items-center gap-2">
                <SeedAvatar seed="bot-ada" size={20} className="rounded-full" />
                <span className="font-semibold text-white">Ada</span>
                <span className="text-[10px] text-neutral-500">Security</span>
                <span className="text-neutral-400 ml-auto text-[11px]">
                  &quot;Memeriksa paket npm dependencies...&quot;
                </span>
              </div>
              <div className="flex items-center gap-2">
                <SeedAvatar seed="bot-hemingway" size={20} className="rounded-full" />
                <span className="font-semibold text-white">Hemingway</span>
                <span className="text-[10px] text-neutral-500">Engineering</span>
                <span className="text-neutral-400 ml-auto text-[11px]">
                  &quot;Optimalisasi Next.js Turbopack build selesai.&quot;
                </span>
              </div>
            </div>
          </div>

          {/* Card 2: Daytona Linux Cloud Sandboxes */}
          <div className="rounded-2xl border border-neutral-800/80 bg-neutral-950/60 p-6 sm:p-8 flex flex-col justify-between hover:border-neutral-700 transition-colors group">
            <div>
              <div className="size-10 rounded-xl bg-neutral-900 border border-neutral-800 flex items-center justify-center text-white mb-5">
                <TerminalIcon className="size-5" />
              </div>
              <h3 className="text-xl sm:text-2xl font-semibold text-white mb-2">
                Dedicated Daytona Sandboxes
              </h3>
              <p className="text-neutral-400 text-sm leading-relaxed mb-6">
                Each bot operates inside an isolated, containerized Linux environment
                with full bash, root access, filesystem read/write, and package managers.
              </p>
            </div>

            <div className="rounded-xl border border-neutral-800/80 bg-black/60 p-3.5 font-mono text-[11px] text-neutral-400">
              <div className="text-emerald-400 mb-1">$ daytona status --active</div>
              <div className="text-neutral-500">
                CONTAINER: running (Ubuntu 24.04)<br />
                STORAGE: /home/daytona/uploads<br />
                PORTS: 6080 (VNC Desktop)
              </div>
            </div>
          </div>

          {/* Card 3: VNC Visual Desktop Streaming */}
          <div className="rounded-2xl border border-neutral-800/80 bg-neutral-950/60 p-6 sm:p-8 flex flex-col justify-between hover:border-neutral-700 transition-colors group">
            <div>
              <div className="size-10 rounded-xl bg-neutral-900 border border-neutral-800 flex items-center justify-center text-white mb-5">
                <MonitorIcon className="size-5" />
              </div>
              <h3 className="text-xl sm:text-2xl font-semibold text-white mb-2">
                Live VNC Visual Desktop
              </h3>
              <p className="text-neutral-400 text-sm leading-relaxed mb-6">
                Watch agents interact with graphical applications, inspect screenshots
                in high resolution, and view live browser or GUI state via noVNC.
              </p>
            </div>

            <div className="rounded-xl border border-neutral-800/80 bg-black/60 p-3.5 flex items-center justify-between text-xs font-mono text-neutral-400">
              <span className="flex items-center gap-2">
                <span className="size-2 rounded-full bg-cyan-400 animate-pulse" />
                VNC Display :0 Active
              </span>
              <span className="text-[11px] text-neutral-500">60 FPS</span>
            </div>
          </div>

          {/* Card 4: Enterprise File Pipeline (Large) */}
          <div className="lg:col-span-2 rounded-2xl border border-neutral-800/80 bg-neutral-950/60 p-6 sm:p-8 flex flex-col justify-between hover:border-neutral-700 transition-colors group">
            <div>
              <div className="size-10 rounded-xl bg-neutral-900 border border-neutral-800 flex items-center justify-center text-white mb-5">
                <HardDriveIcon className="size-5" />
              </div>
              <h3 className="text-xl sm:text-2xl font-semibold text-white mb-2">
                100 MB Binary Streaming & Auto-Sync
              </h3>
              <p className="text-neutral-400 text-sm leading-relaxed mb-6 max-w-xl">
                Upload large ZIP codebases and documents up to 100 MB via direct binary
                streaming. Files are automatically extracted and replicated across every
                bot sandbox in the team.
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center font-mono text-xs">
              <div className="rounded-lg border border-neutral-800 bg-black/40 p-3">
                <span className="text-lg font-bold text-white block">100 MB</span>
                <span className="text-[10px] text-neutral-500">Direct Payload</span>
              </div>
              <div className="rounded-lg border border-neutral-800 bg-black/40 p-3">
                <span className="text-lg font-bold text-white block">200K</span>
                <span className="text-[10px] text-neutral-500">Doc Parse Chars</span>
              </div>
              <div className="rounded-lg border border-neutral-800 bg-black/40 p-3">
                <span className="text-lg font-bold text-white block">Auto-Sync</span>
                <span className="text-[10px] text-neutral-500">Multi-Sandbox</span>
              </div>
              <div className="rounded-lg border border-neutral-800 bg-black/40 p-3">
                <span className="text-lg font-bold text-white block">ZIP Unpack</span>
                <span className="text-[10px] text-neutral-500">Autonomous</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Developer Metrics & Architecture Section (x.ai style) */}
      <section id="metrics" className="py-20 px-4 sm:px-6 max-w-7xl mx-auto border-t border-neutral-900">
        <div className="text-left mb-12">
          <Badge
            variant="outline"
            className="h-6 px-2.5 text-[11px] font-mono text-neutral-400 border-neutral-800 rounded-full mb-3"
          >
            For Developers & Architects
          </Badge>
          <h2 className="text-3xl sm:text-5xl font-bold tracking-tight text-white mb-4">
            One Platform. Every Capability.
          </h2>
          <p className="text-neutral-400 text-base sm:text-lg max-w-2xl font-normal">
            Terminal, code editing, VNC visual desktop, and multi-agent coordination —
            orchestrated through Trigger.dev workflows.
          </p>
        </div>

        {/* Big Numbers Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-12">
          <div className="p-6 rounded-2xl border border-neutral-800/80 bg-neutral-950/40">
            <span className="text-4xl sm:text-5xl font-bold tracking-tight text-white font-mono block mb-1">
              65,536
            </span>
            <span className="text-xs sm:text-sm text-neutral-400">
              Max output token budget
            </span>
          </div>

          <div className="p-6 rounded-2xl border border-neutral-800/80 bg-neutral-950/40">
            <span className="text-4xl sm:text-5xl font-bold tracking-tight text-white font-mono block mb-1">
              80
            </span>
            <span className="text-xs sm:text-sm text-neutral-400">
              Max autonomous tool steps
            </span>
          </div>

          <div className="p-6 rounded-2xl border border-neutral-800/80 bg-neutral-950/40">
            <span className="text-4xl sm:text-5xl font-bold tracking-tight text-white font-mono block mb-1">
              &lt;200ms
            </span>
            <span className="text-xs sm:text-sm text-neutral-400">
              Median stream chunk latency
            </span>
          </div>

          <div className="p-6 rounded-2xl border border-neutral-800/80 bg-neutral-950/40">
            <span className="text-4xl sm:text-5xl font-bold tracking-tight text-white font-mono block mb-1">
              100%
            </span>
            <span className="text-xs sm:text-sm text-neutral-400">
              Isolated Linux environments
            </span>
          </div>
        </div>

        {/* Code Snippet Switcher (x.ai style) */}
        <div className="rounded-2xl border border-neutral-800 bg-neutral-950/90 overflow-hidden shadow-xl">
          <div className="h-11 px-4 border-b border-neutral-800 flex items-center justify-between bg-neutral-900/40">
            <div className="flex items-center gap-1 sm:gap-2">
              {(["typescript", "python", "curl"] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveCodeTab(tab)}
                  className={cn(
                    "px-3 py-1 rounded-md text-xs font-mono transition-colors cursor-pointer capitalize",
                    activeCodeTab === tab
                      ? "bg-neutral-800 text-white font-semibold"
                      : "text-neutral-400 hover:text-white"
                  )}
                >
                  {tab === "typescript" ? "TypeScript (AI SDK)" : tab}
                </button>
              ))}
            </div>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleCopyCode}
              className="h-7 px-2.5 text-xs font-mono text-neutral-400 hover:text-white gap-1.5 cursor-pointer"
            >
              {copied ? (
                <>
                  <CheckIcon className="size-3.5 text-emerald-400" />
                  <span>Copied</span>
                </>
              ) : (
                <>
                  <CopyIcon className="size-3.5" />
                  <span>Copy</span>
                </>
              )}
            </Button>
          </div>

          <pre className="p-5 sm:p-6 overflow-x-auto font-mono text-xs sm:text-sm text-neutral-300 leading-relaxed bg-black/60">
            <code>{CODE_SNIPPETS[activeCodeTab]}</code>
          </pre>
        </div>
      </section>

      {/* Specialist Agent Fleet Showcase */}
      <section id="agents" className="py-20 px-4 sm:px-6 max-w-7xl mx-auto border-t border-neutral-900">
        <div className="text-left mb-12">
          <Badge
            variant="outline"
            className="h-6 px-2.5 text-[11px] font-mono text-neutral-400 border-neutral-800 rounded-full mb-3"
          >
            Specialist Agents
          </Badge>
          <h2 className="text-3xl sm:text-5xl font-bold tracking-tight text-white mb-4">
            Meet the Agent Team.
          </h2>
          <p className="text-neutral-400 text-base sm:text-lg max-w-2xl font-normal">
            Each teammate has its own avatar, persona, job specialization, and
            execution habits. Create or customize your own bots in seconds.
          </p>
        </div>

        {/* Fleet Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {AGENT_FLEET.map((agent) => (
            <div
              key={agent.name}
              className="rounded-2xl border border-neutral-800/80 bg-neutral-950/50 p-6 flex flex-col justify-between hover:border-neutral-700 transition-colors group"
            >
              <div>
                <div className="flex items-center gap-3.5 mb-4">
                  <div className="size-11 rounded-xl overflow-hidden bg-neutral-900 border border-neutral-800 flex items-center justify-center shrink-0">
                    <SeedAvatar seed={agent.avatar} size={44} />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-white leading-tight">
                      {agent.name}
                    </h3>
                    <span className="text-xs text-neutral-400">
                      {agent.role}
                    </span>
                  </div>
                </div>

                <Badge
                  variant="secondary"
                  className="mb-4 text-[10px] font-mono font-normal rounded-full bg-neutral-900 text-neutral-300 border border-neutral-800"
                >
                  {agent.badge}
                </Badge>

                <p className="text-xs text-neutral-400 leading-relaxed mb-6 font-normal">
                  {agent.description}
                </p>
              </div>

              <div className="pt-4 border-t border-neutral-900 flex flex-wrap gap-1.5">
                {agent.tools.map((t) => (
                  <span
                    key={t}
                    className="px-2 py-0.5 rounded text-[10px] font-mono bg-neutral-900/80 text-neutral-400 border border-neutral-800"
                  >
                    {t}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Footer (x.ai style) */}
      <footer className="border-t border-neutral-900 py-12 px-4 sm:px-6 max-w-7xl mx-auto text-xs text-neutral-500">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6 mb-8">
          <div className="flex items-center gap-3">
            <Image
              src="/Logo.svg"
              alt="Genichiro"
              width={20}
              height={18}
              className="h-4.5 w-auto object-contain opacity-80"
            />
            <span className="font-semibold text-sm text-neutral-300">
              Genichiro
            </span>
            <span className="text-neutral-600">·</span>
            <span>AI Worker Team Workspace</span>
          </div>

          <div className="flex items-center gap-2 text-[11px] font-mono text-neutral-400">
            <span className="size-2 rounded-full bg-emerald-500" />
            <span>All Systems Operational</span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-neutral-900/60 text-[11px]">
          <p>© 2026 Genichiro AI Worker Team. All rights reserved.</p>
          <div className="flex items-center gap-5">
            <a href="#capabilities" className="hover:text-neutral-300 transition-colors">
              Capabilities
            </a>
            <a href="#agents" className="hover:text-neutral-300 transition-colors">
              Agents
            </a>
            <a href="#sandbox" className="hover:text-neutral-300 transition-colors">
              Daytona
            </a>
            <Link href="/settings" className="hover:text-neutral-300 transition-colors">
              Settings
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
