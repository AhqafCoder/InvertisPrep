import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";

// ... (in ResumeBuilder component)

<div className="h-[calc(100vh-120px)] w-full">
  <ResizablePanelGroup direction="horizontal" className="rounded-lg border">
    
    {/* AI Sidebar */}
    {showAISidebar && (
      <>
        <ResizablePanel defaultSize={20} minSize={15} maxSize={30}>
          <AISidebar resume={resume} update={update} updatePersonal={updatePersonal} />
        </ResizablePanel>
        <ResizableHandle withHandle />
      </>
    )}

    {/* Editor */}
    <ResizablePanel defaultSize={40} minSize={30}>
      <div className="h-full overflow-y-auto p-5">
        <ResumeEditor resume={resume} update={update} updatePersonal={updatePersonal} />
      </div>
    </ResizablePanel>

    <ResizableHandle withHandle />

    {/* Preview */}
    <ResizablePanel defaultSize={40} minSize={30}>
      <div className="h-full overflow-y-auto bg-slate-200 p-5">
        <ResumePreview resume={resume} />
      </div>
    </ResizablePanel>

  </ResizablePanelGroup>
</div>
