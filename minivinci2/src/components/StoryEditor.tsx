import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { DrawingCanvas } from "./DrawingCanvas";
import { BookOpen, Palette, ChevronLeft, ChevronRight, Plus, Eye, Printer, Sparkles, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { generateImage } from "@/lib/stabilityAI";
import { toast } from "sonner";
interface StoryPage {
  id: string;
  text: string;
  drawing?: string;
}
export const StoryEditor = ({ initialStory }: { initialStory?: string }) => {
  const [pages, setPages] = useState<StoryPage[]>([{
    id: "1",
    text: initialStory || "",
    drawing: undefined
  }]);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [storyTitle, setStoryTitle] = useState("My Amazing Story");
  const [mode, setMode] = useState<"write" | "draw">("write");
  const [isPreview, setIsPreview] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const currentPage = pages[currentPageIndex];
  const updatePageText = (text: string) => {
    const newPages = [...pages];
    newPages[currentPageIndex] = {
      ...currentPage,
      text
    };
    setPages(newPages);
  };
  const addNewPage = () => {
    const newPage: StoryPage = {
      id: Date.now().toString(),
      text: "",
      drawing: undefined
    };
    setPages([...pages, newPage]);
    setCurrentPageIndex(pages.length);
  };
  const goToNextPage = () => {
    if (currentPageIndex < pages.length - 1) {
      setCurrentPageIndex(currentPageIndex + 1);
    }
  };
  const goToPreviousPage = () => {
    if (currentPageIndex > 0) {
      setCurrentPageIndex(currentPageIndex - 1);
    }
  };
  const updatePageDrawing = (drawing: string) => {
    const newPages = [...pages];
    newPages[currentPageIndex] = { ...currentPage, drawing };
    setPages(newPages);
  };

  const handleGenerateIllustration = async () => {
    if (!currentPage.text.trim()) {
      toast.error("Write something first so the AI knows what to draw!");
      return;
    }
    setIsGenerating(true);
    try {
      const imageUrl = await generateImage(currentPage.text);
      updatePageDrawing(imageUrl);
      setMode("draw");
      toast.success("Illustration generated! You can now draw on top of it.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to generate illustration");
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    const pagesHtml = pages.map((page, index) => `
      <div class="page" style="page-break-after: always; padding: 40px; font-family: sans-serif;">
        <div style="color: #888; font-size: 14px; margin-bottom: 16px;">Page ${index + 1}</div>
        ${page.text ? `<p style="font-size: 18px; line-height: 1.8; white-space: pre-wrap;">${page.text}</p>` : ""}
        ${page.drawing ? `<img src="${page.drawing}" style="width: 100%; border-radius: 12px; margin-top: 16px;" />` : ""}
      </div>
    `).join("");
    printWindow.document.write(`
      <html><head><title>${storyTitle}</title>
      <style>@media print { .page:last-child { page-break-after: avoid; } }</style>
      </head><body style="margin:0;">${pagesHtml}</body></html>
    `);
    printWindow.document.close();
    printWindow.onload = () => { printWindow.print(); };
  };
  return <div className="min-h-screen bg-gradient-to-br from-teal/10 via-yellow/10 to-pink/10 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {!isPreview ? <>
            {/* Mode Toggle and Preview */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex gap-2 bg-white/80 backdrop-blur-sm p-2 rounded-full shadow-lg">
                <Button onClick={() => setMode("write")} className={cn("rounded-full px-6 transition-all", mode === "write" ? "bg-teal text-white shadow-md" : "bg-transparent text-foreground hover:bg-teal/10")}>
                  <BookOpen className="mr-2 h-5 w-5" />
                  Write
                </Button>
                <Button onClick={() => setMode("draw")} className={cn("rounded-full px-6 transition-all", mode === "draw" ? "bg-pink text-white shadow-md" : "bg-transparent text-foreground hover:bg-pink/10")}>
                  <Palette className="mr-2 h-5 w-5" />
                  Draw
                </Button>
              </div>
              <div className="flex gap-2">
                <Button onClick={handlePrint} className="bg-orange hover:bg-orange/90 text-white rounded-full px-6">
                  <Printer className="mr-2 h-5 w-5" />
                  Print
                </Button>
                <Button onClick={() => setIsPreview(!isPreview)} className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-full px-6">
                  <Eye className="mr-2 h-5 w-5" />
                  Preview
                </Button>
              </div>
            </div>

            {/* Editor Area */}
            <div className="bg-white rounded-3xl shadow-2xl p-6 md:p-8 mb-6">
              {mode === "write" ? <div className="space-y-4">
                  <div className="text-sm font-semibold text-muted-foreground">
                    Page {currentPageIndex + 1} of {pages.length}
                  </div>
                  <Textarea value={currentPage.text} onChange={e => updatePageText(e.target.value)} placeholder="Once upon a time..." className="min-h-[400px] text-lg border-2 border-border rounded-2xl resize-none focus-visible:ring-2 focus-visible:ring-primary" />
                  <Button
                    onClick={handleGenerateIllustration}
                    disabled={isGenerating || !currentPage.text.trim()}
                    className="bg-violet-500 hover:bg-violet-600 text-white rounded-full px-6"
                  >
                    {isGenerating
                      ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" />Generating...</>
                      : <><Sparkles className="mr-2 h-5 w-5" />Generate Illustration</>
                    }
                  </Button>
                </div> : <DrawingCanvas pageId={currentPage.id} initialImage={currentPage.drawing} />}
            </div>

            {/* Navigation */}
            <div className="flex items-center justify-between gap-4">
              <Button onClick={goToPreviousPage} disabled={currentPageIndex === 0} className="bg-orange hover:bg-orange/90 text-white rounded-full px-6 disabled:opacity-50">
                <ChevronLeft className="mr-2 h-5 w-5" />
                Previous
              </Button>

              <div className="flex gap-2 items-center">
                {pages.map((_, index) => <button key={index} onClick={() => setCurrentPageIndex(index)} className={cn("w-3 h-3 rounded-full transition-all", index === currentPageIndex ? "bg-primary w-8" : "bg-neutral hover:bg-primary/50")} />)}
                <Button onClick={addNewPage} size="sm" className="bg-lime hover:bg-lime/90 text-foreground rounded-full w-8 h-8 p-0">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              <Button onClick={goToNextPage} disabled={currentPageIndex === pages.length - 1} className="bg-orange hover:bg-orange/90 text-white rounded-full px-6 disabled:opacity-50">
                Next
                <ChevronRight className="ml-2 h-5 w-5" />
              </Button>
            </div>
          </> : (/* Preview Mode */
      <div className="space-y-6">
            {pages.map((page, index) => <div key={page.id} className="bg-white rounded-3xl shadow-2xl p-8 space-y-4">
                <div className="text-sm font-semibold text-muted-foreground">
                  Page {index + 1}
                </div>
                {page.text && <p className="text-lg leading-relaxed whitespace-pre-wrap">
                    {page.text}
                  </p>}
                {page.drawing && <div className="rounded-2xl overflow-hidden border-2 border-border">
                    <img src={page.drawing} alt={`Page ${index + 1} illustration`} className="w-full" />
                  </div>}
              </div>)}
          </div>)}
      </div>
    </div>;
};