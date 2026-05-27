import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Home, Loader2, Wand2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { generateStory } from "@/lib/claudeAI";
import { toast } from "sonner";
import logo from "@/assets/logo.jpeg";

const SETTINGS = [
  { id: "forest", label: "Enchanted Forest", emoji: "🌲" },
  { id: "ocean", label: "Underwater Kingdom", emoji: "🌊" },
  { id: "space", label: "Outer Space", emoji: "🚀" },
];

const CHARACTER_NAMES = [
  "Pip", "Luna", "Jasper", "Zara", "Finn",
  "Cleo", "Brix", "Nola", "Theo", "Suki",
];

const GENRES = [
  { id: "adventure", label: "Magical Adventure", emoji: "🌟" },
  { id: "comedy", label: "Silly Comedy", emoji: "🤣" },
  { id: "mystery", label: "Mystery", emoji: "🔍" },
  { id: "fairy-tale", label: "Fairy Tale", emoji: "🧚" },
  { id: "superhero", label: "Superhero", emoji: "🦸" },
  { id: "animals", label: "Animal Friends", emoji: "🐾" },
  { id: "magic-school", label: "Magic School", emoji: "🧙" },
  { id: "time-travel", label: "Time Travel", emoji: "⏰" },
  { id: "treasure", label: "Treasure Hunt", emoji: "💎" },
  { id: "monsters", label: "Monster Friendship", emoji: "👾" },
];

const StorySetup = () => {
  const navigate = useNavigate();
  const [selectedSetting, setSelectedSetting] = useState<string | null>(null);
  const [selectedNames, setSelectedNames] = useState<string[]>([]);
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const toggleName = (name: string) => {
    if (selectedNames.includes(name)) {
      setSelectedNames(selectedNames.filter(n => n !== name));
    } else if (selectedNames.length < 3) {
      setSelectedNames([...selectedNames, name]);
    }
  };

  const canGenerate = selectedSetting && selectedNames.length === 3 && selectedGenre;

  const handleGenerate = async () => {
    if (!canGenerate) return;
    setIsGenerating(true);
    try {
      const setting = SETTINGS.find(s => s.id === selectedSetting)!.label;
      const genre = GENRES.find(g => g.id === selectedGenre)!.label;
      const story = await generateStory(setting, selectedNames, genre);
      navigate("/create", { state: { story } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to generate story");
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal/10 via-yellow/10 to-pink/10">
      <header className="bg-white/80 backdrop-blur-sm border-b border-border sticky top-0 z-50 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <Button onClick={() => navigate("/")} variant="ghost" className="rounded-full">
            <Home className="mr-2 h-5 w-5" />
            Home
          </Button>
          <img src={logo} alt="minivinci" className="h-12 md:h-16" />
          <div className="w-24" />
        </div>
      </header>

      <div className="max-w-4xl mx-auto p-6 space-y-10">
        <div className="text-center pt-4">
          <h1 className="text-3xl font-extrabold text-foreground mb-2">Let's build your story! ✨</h1>
          <p className="text-muted-foreground text-lg">Make your choices below, then we'll write it for you.</p>
        </div>

        {/* Setting */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <span className="bg-teal text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold">1</span>
            Where does your story take place?
          </h2>
          <div className="grid grid-cols-3 gap-4">
            {SETTINGS.map(setting => (
              <button
                key={setting.id}
                onClick={() => setSelectedSetting(setting.id)}
                className={cn(
                  "rounded-3xl p-6 border-4 transition-all hover:scale-105 text-center bg-white/80 shadow-md",
                  selectedSetting === setting.id
                    ? "border-teal bg-teal/10 shadow-xl scale-105"
                    : "border-transparent hover:border-teal/40"
                )}
              >
                <div className="text-5xl mb-3">{setting.emoji}</div>
                <div className="font-bold text-base">{setting.label}</div>
              </button>
            ))}
          </div>
        </section>

        {/* Character Names */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <span className="bg-pink text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold">2</span>
            Pick 3 characters
            <span className="text-sm font-normal text-muted-foreground ml-1">
              ({selectedNames.length}/3 selected)
            </span>
          </h2>
          <div className="flex flex-wrap gap-3">
            {CHARACTER_NAMES.map(name => {
              const isSelected = selectedNames.includes(name);
              const isDisabled = !isSelected && selectedNames.length >= 3;
              return (
                <button
                  key={name}
                  onClick={() => toggleName(name)}
                  disabled={isDisabled}
                  className={cn(
                    "px-5 py-2.5 rounded-full font-semibold text-base border-2 transition-all",
                    isSelected
                      ? "bg-pink text-white border-pink shadow-lg scale-105"
                      : isDisabled
                      ? "bg-white/40 text-muted-foreground border-border opacity-40 cursor-not-allowed"
                      : "bg-white/80 border-border hover:border-pink/50 hover:scale-105"
                  )}
                >
                  {name}
                </button>
              );
            })}
          </div>
        </section>

        {/* Genre */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <span className="bg-orange text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold">3</span>
            What kind of story?
          </h2>
          <div className="flex flex-wrap gap-3">
            {GENRES.map(genre => (
              <button
                key={genre.id}
                onClick={() => setSelectedGenre(genre.id)}
                className={cn(
                  "px-5 py-2.5 rounded-full font-semibold text-base border-2 transition-all hover:scale-105 flex items-center gap-2",
                  selectedGenre === genre.id
                    ? "bg-orange text-white border-orange shadow-lg scale-105"
                    : "bg-white/80 border-border hover:border-orange/50"
                )}
              >
                <span>{genre.emoji}</span>
                {genre.label}
              </button>
            ))}
          </div>
        </section>

        {/* Generate Button */}
        <div className="pb-10 flex justify-center">
          <Button
            onClick={handleGenerate}
            disabled={!canGenerate || isGenerating}
            size="lg"
            className="bg-gradient-to-r from-violet-500 to-pink text-white rounded-full px-12 py-6 text-xl font-bold shadow-2xl hover:scale-110 transition-all disabled:opacity-50 disabled:scale-100 disabled:cursor-not-allowed"
          >
            {isGenerating
              ? <><Loader2 className="mr-3 h-6 w-6 animate-spin" />Writing your story...</>
              : <><Wand2 className="mr-3 h-6 w-6" />Write Me a Story!</>
            }
          </Button>
        </div>
      </div>
    </div>
  );
};

export default StorySetup;
