import { StoryEditor } from "@/components/StoryEditor";
import { Button } from "@/components/ui/button";
import { Home } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import logo from "@/assets/logo.jpeg";

const Create = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as { story?: string; characters?: string[]; setting?: string; genre?: string } | null;
  const initialStory = state?.story;
  const storySetup = state?.characters ? { characters: state.characters, setting: state.setting!, genre: state.genre! } : undefined;

  return (
    <div className="min-h-screen">
      {/* Header with Logo */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-border sticky top-0 z-50 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <Button
            onClick={() => navigate("/")}
            variant="ghost"
            className="rounded-full"
          >
            <Home className="mr-2 h-5 w-5" />
            Home
          </Button>
          <img src={logo} alt="minivinci" className="h-12 md:h-16" />
          <div className="w-24" /> {/* Spacer for centering */}
        </div>
      </header>

      {/* Main Story Editor */}
      <StoryEditor initialStory={initialStory} storySetup={storySetup} />
    </div>
  );
};

export default Create;
