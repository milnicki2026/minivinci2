import { useState, useEffect } from "react";
import { StoryEditor } from "@/components/StoryEditor";
import { Button } from "@/components/ui/button";
import { Home, UserRound } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { loadUserName, loadUserProfiles, getActiveProfileId, COLORS } from "@/pages/UserProfile";
import { cn } from "@/lib/utils";
import logo from "@/assets/logo.jpeg";

const Create = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [userName, setUserName] = useState("");
  const [avatarColor, setAvatarColor] = useState("");

  useEffect(() => {
    setUserName(loadUserName());
    const activeId = getActiveProfileId();
    const profiles = loadUserProfiles();
    const active = profiles.find((p) => p.id === activeId) ?? profiles[0];
    setAvatarColor(active?.color || "");
  }, []);
  const state = location.state as { story?: string; characters?: string[]; setting?: string; genre?: string; savedProfile?: { pages: unknown[]; storyTitle: string } } | null;
  const initialStory = state?.story;
  const storySetup = state?.characters ? { characters: state.characters, setting: state.setting!, genre: state.genre! } : undefined;
  const savedProfile = state?.savedProfile;

  return (
    <div className="min-h-screen">
      {/* Header with Logo */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-border sticky top-0 z-50 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <Button
            onClick={() => navigate("/home")}
            variant="ghost"
            className="rounded-full"
          >
            <Home className="mr-2 h-5 w-5" />
            Home
          </Button>
          <img src={logo} alt="minivinci" className="h-12 md:h-16" />
          {userName ? (
            <button
              onClick={() => navigate("/")}
              className="flex items-center gap-2.5 hover:opacity-80 transition-opacity"
            >
              <p className="text-sm font-semibold text-muted-foreground">
                Welcome back <span className="text-foreground">{userName}</span> 👋
              </p>
              {(() => {
                const meta = COLORS.find((c) => c.value === avatarColor);
                return (
                  <div className={cn(
                    "w-8 h-8 rounded-full border-2 flex items-center justify-center shrink-0",
                    meta ? meta.bg : "bg-muted",
                    meta ? meta.border : "border-border"
                  )}>
                    <UserRound className={cn("h-4 w-4", meta ? meta.icon : "text-muted-foreground")} strokeWidth={1.5} />
                  </div>
                );
              })()}
            </button>
          ) : (
            <div className="w-24" />
          )}
        </div>
      </header>

      {/* Main Story Editor */}
      <StoryEditor initialStory={initialStory} storySetup={storySetup} savedProfile={savedProfile} />
    </div>
  );
};

export default Create;
