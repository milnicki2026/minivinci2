import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Home, Trash2, BookOpen, Plus, ArrowLeft, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import logo from "@/assets/logo.jpeg";

export interface SavedProfile {
  id: string;
  name: string;
  savedAt: string;
  storyData: {
    pages: unknown[];
    storyTitle: string;
  };
}

const STORAGE_KEY = "minivinci_profiles";

export function loadProfiles(): SavedProfile[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

export function saveProfile(profile: SavedProfile) {
  const profiles = loadProfiles();
  const idx = profiles.findIndex((p) => p.id === profile.id);
  if (idx >= 0) {
    profiles[idx] = profile;
  } else {
    profiles.unshift(profile);
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(profiles));
}

export function deleteProfile(id: string) {
  const profiles = loadProfiles().filter((p) => p.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(profiles));
}

const PALETTE = [
  "from-pink/40 to-orange/30",
  "from-teal/40 to-lime/30",
  "from-yellow/40 to-orange/30",
  "from-indigo-200 to-purple-200",
  "from-sky-200 to-teal/30",
  "from-rose-200 to-pink/30",
];

function colorFor(id: string) {
  let hash = 0;
  for (const ch of id) hash = (hash * 31 + ch.charCodeAt(0)) & 0xff;
  return PALETTE[hash % PALETTE.length];
}

export default function Profiles() {
  const navigate = useNavigate();
  const [profiles, setProfiles] = useState<SavedProfile[]>([]);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  useEffect(() => {
    setProfiles(loadProfiles());
  }, []);

  const handleDelete = (id: string) => {
    deleteProfile(id);
    setProfiles(loadProfiles());
    setConfirmDelete(null);
  };

  const handleLoad = (profile: SavedProfile) => {
    navigate("/create", {
      state: {
        savedProfile: profile.storyData,
        storyTitle: profile.storyData.storyTitle,
      },
    });
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal/10 via-yellow/10 to-pink/10">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-border sticky top-0 z-50 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <Button onClick={() => navigate(-1)} variant="ghost" className="rounded-full">
            <ArrowLeft className="mr-2 h-5 w-5" />
            Back
          </Button>
          <img src={logo} alt="minivinci" className="h-12 md:h-16" />
          <Button onClick={() => navigate("/")} variant="ghost" className="rounded-full">
            <Home className="mr-2 h-5 w-5" />
            Home
          </Button>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-10">
        {/* Title */}
        <div className="mb-8 flex items-end justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">My Stories</h1>
            <p className="text-muted-foreground mt-1 text-sm">Pick up where you left off, or start something new.</p>
          </div>
          <Button
            onClick={() => navigate("/setup")}
            className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-full px-5 gap-2"
          >
            <Plus className="h-4 w-4" />
            New Story
          </Button>
        </div>

        {profiles.length === 0 ? (
          /* Empty state */
          <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
            <div className="w-20 h-20 rounded-full bg-yellow/20 flex items-center justify-center">
              <BookOpen className="h-9 w-9 text-orange" strokeWidth={1.5} />
            </div>
            <p className="text-lg font-semibold text-foreground">No saved stories yet</p>
            <p className="text-sm text-muted-foreground max-w-xs">
              Hit <span className="font-semibold text-indigo-500">Save</span> while editing to store a story here.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
            {profiles.map((profile) => (
              <div
                key={profile.id}
                className="bg-white rounded-3xl shadow-md border border-border overflow-hidden flex flex-col hover:shadow-lg transition-shadow"
              >
                {/* Color band */}
                <div className={cn("h-24 bg-gradient-to-br flex items-center justify-center", colorFor(profile.id))}>
                  <Star className="h-8 w-8 text-white/70" strokeWidth={1.5} />
                </div>

                {/* Body */}
                <div className="p-4 flex flex-col gap-3 flex-1">
                  <div>
                    <h2 className="font-bold text-foreground text-base leading-tight line-clamp-2">
                      {profile.name || "Untitled Story"}
                    </h2>
                    <p className="text-xs text-muted-foreground mt-0.5">Saved {formatDate(profile.savedAt)}</p>
                    <p className="text-xs text-muted-foreground">
                      {(profile.storyData.pages as unknown[]).length} page{(profile.storyData.pages as unknown[]).length !== 1 ? "s" : ""}
                    </p>
                  </div>

                  <div className="flex gap-2 mt-auto">
                    <Button
                      onClick={() => handleLoad(profile)}
                      className="flex-1 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground text-xs h-8"
                    >
                      Open
                    </Button>
                    {confirmDelete === profile.id ? (
                      <div className="flex gap-1">
                        <Button
                          variant="destructive"
                          onClick={() => handleDelete(profile.id)}
                          className="rounded-full text-xs h-8 px-3"
                        >
                          Delete
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => setConfirmDelete(null)}
                          className="rounded-full text-xs h-8 px-3"
                        >
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <Button
                        variant="outline"
                        onClick={() => setConfirmDelete(profile.id)}
                        className="rounded-full h-8 w-8 p-0 border-destructive/40 text-destructive hover:bg-destructive hover:text-white"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
