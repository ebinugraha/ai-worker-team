"use client";

import * as React from "react";
import { ChatHeader } from "@/components/chat-header";
import { DaytonaVncViewer } from "@/components/daytona-vnc-viewer";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";

export interface ChatResizableLayoutProps {
  botId: string;
  botName: string;
  botAvatar: string;
  botJob?: string;
  botInstruction?: string;
  sandboxId?: string | null;
  initialVncUrl?: string | null;
  children: React.ReactNode;
}

export function ChatResizableLayout({
  botId,
  botName,
  botAvatar,
  botJob = "",
  botInstruction = "",
  sandboxId,
  initialVncUrl,
  children,
}: ChatResizableLayoutProps) {
  const [isMonitorOpen, setIsMonitorOpen] = React.useState(false);
  const [isDragging, setIsDragging] = React.useState(false);

  React.useEffect(() => {
    if (!isDragging) return;
    const handlePointerUp = () => setIsDragging(false);
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("mouseup", handlePointerUp);
    return () => {
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("mouseup", handlePointerUp);
    };
  }, [isDragging]);

  return (
    <>
      {/* Invisible overlay during drag to prevent iframe from capturing pointer events */}
      {isDragging && (
        <div className="fixed inset-0 z-50 cursor-col-resize select-none pointer-events-auto" />
      )}

      <ResizablePanelGroup
        orientation="horizontal"
        className="flex-1 h-full min-h-0 min-w-0 w-full overflow-hidden"
      >
        {/* Left panel: Encapsulates ChatHeader and ChatContent */}
        <ResizablePanel
          id="chat-main"
          defaultSize={isMonitorOpen ? "50%" : "100%"}
          minSize="25%"
          maxSize="85%"
          className="flex flex-col h-full min-h-0 min-w-0 overflow-hidden"
        >
          <div className="flex flex-col h-full min-h-0 min-w-0 w-full overflow-hidden">
            <ChatHeader
              botId={botId}
              name={botName}
              avatar={botAvatar}
              job={botJob}
              instruction={botInstruction}
              isMonitorOpen={isMonitorOpen}
              onToggleMonitor={() => setIsMonitorOpen((prev) => !prev)}
            />
            <div className="flex-1 flex flex-col min-h-0 min-w-0 overflow-hidden">
              {children}
            </div>
          </div>
        </ResizablePanel>

        {/* Right panel: Resizable panel when monitor is toggled on */}
        {isMonitorOpen && (
          <>
            <ResizableHandle
              withHandle
              onPointerDown={() => setIsDragging(true)}
              className="cursor-col-resize select-none"
            />
            <ResizablePanel
              id="chat-monitor"
              defaultSize="50%"
              minSize="15%"
              maxSize="75%"
              className="flex flex-col h-full min-h-0 min-w-0 bg-background overflow-hidden"
            >
              <DaytonaVncViewer
                sandboxId={sandboxId}
                botName={botName}
                initialVncUrl={initialVncUrl}
              />
            </ResizablePanel>
          </>
        )}
      </ResizablePanelGroup>
    </>
  );
}

export default ChatResizableLayout;
