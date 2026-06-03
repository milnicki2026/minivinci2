import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, UserRound, Check, Plus, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";
import logo from "@/assets/logo.jpeg";

const USER_PROFILES_KEY = "minivinci_user_profiles";
const LAST_USED_KEY = "minivinci_active_profile_id";   // localStorage — persists
const SESSION_KEY   = "minivinci_session_profile";      // sessionStorage — clears on browser close

export interface UserProfile {
  id: string;
  name: string;
  color: string;
}

export function loadUserProfiles(): UserProfile[] {
  try {
    const stored = JSON.parse(localStorage.getItem(USER_PROFILES_KEY) || "[]");
    if (Array.isArray(stored) && stored.length > 0) return stored;
    // Migrate from old single-profile keys
    const oldName = localStorage.getItem("minivinci_user_name") || "";
    const oldColor = localStorage.getItem("minivinci_user_color") || "pink";
    if (oldName) return [{ id: "legacy", name: oldName, color: oldColor }];
    return [];
  } catch {
    return [];
  }
}

export function saveUserProfiles(profiles: UserProfile[]) {
  localStorage.setItem(USER_PROFILES_KEY, JSON.stringify(profiles));
}

// Logged-in session (clears when browser closes)
export function getActiveProfileId(): string | null {
  return sessionStorage.getItem(SESSION_KEY);
}

// Called on ProfileSelect when the user taps a profile card ("log in")
export function setActiveProfileId(id: string) {
  sessionStorage.setItem(SESSION_KEY, id);
  localStorage.setItem(LAST_USED_KEY, id); // remember for next visit's default selection
}

// Returns the last-used profile ID even before a new session is established
export function getLastUsedProfileId(): string | null {
  return sessionStorage.getItem(SESSION_KEY) || localStorage.getItem(LAST_USED_KEY);
}

// Returns the active profile's name (for welcome message, etc.)
export function loadUserName(): string {
  const profiles = loadUserProfiles();
  if (!profiles.length) return "";
  const activeId = getActiveProfileId();
  const active = profiles.find((p) => p.id === activeId) ?? profiles[0];
  return active.name || "";
}

export const COLORS = [
  { label: "Pink",   bg: "bg-pink/20",    border: "border-pink/50",    icon: "text-pink",       value: "pink"   },
  { label: "Teal",   bg: "bg-teal/20",    border: "border-teal/50",    icon: "text-teal",       value: "teal"   },
  { label: "Yellow", bg: "bg-yellow/20",  border: "border-yellow/50",  icon: "text-yellow",     value: "yellow" },
  { label: "Orange", bg: "bg-orange/20",  border: "border-orange/50",  icon: "text-orange",     value: "orange" },
  { label: "Indigo", bg: "bg-indigo-200", border: "border-indigo-300", icon: "text-indigo-400", value: "indigo" },
  { label: "Lime",   bg: "bg-lime/20",    border: "border-lime/50",    icon: "text-lime",       value: "lime"   },
];

const GREY = {
  bg: "bg-muted",
  border: "border-border",
  icon: "text-muted-foreground",
};

export default function UserProfilePage() {
  const navigate = useNavigate();
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState("");
  const [saved, setSaved] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loaded = loadUserProfiles();
    setProfiles(loaded);
    if (loaded.length > 0) {
      const savedActiveId = getLastUsedProfileId();
      const initial = loaded.find((p) => p.id === savedActiveId) ?? loaded[0];
      setActiveId(initial.id);
      setEditName(initial.name);
      setEditColor(initial.color);
    } else {
      // Start with one empty profile
      const id = `profile_${Date.now()}`;
      const empty: UserProfile = { id, name: "", color: "" };
      setProfiles([empty]);
      setActiveId(id);
    }
  }, []);

  // Close colour picker on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setShowColorPicker(false);
      }
    };
    if (showColorPicker) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showColorPicker]);

  const handleSelectProfile = (profile: UserProfile) => {
    setActiveId(profile.id);
    setEditName(profile.name);
    setEditColor(profile.color);
    setSaved(false);
    setShowColorPicker(false);
    setActiveProfileId(profile.id);
  };

  const handleAddProfile = () => {
    const id = `profile_${Date.now()}`;
    const fresh: UserProfile = { id, name: "", color: "" };
    const updated = [...profiles, fresh];
    setProfiles(updated);
    setActiveId(id);
    setEditName("");
    setEditColor("");
    setSaved(false);
    setShowColorPicker(false);
  };

  const handleSave = () => {
    if (!activeId || !editName.trim()) return;
    const updated = profiles.map((p) =>
      p.id === activeId ? { ...p, name: editName.trim(), color: editColor || "pink" } : p
    );
    setProfiles(updated);
    saveUserProfiles(updated);
    // Also sync editColor in case it defaulted
    setEditColor(editColor || "pink");
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  // Helpers to get avatar style for a given profile
  const avatarStyle = (profile: UserProfile, isActive: boolean) => {
    const color = isActive ? editColor : profile.color;
    const meta = COLORS.find((c) => c.value === color);
    return meta ?? null;
  };

  const savedProfiles = profiles.filter((p) => p.name);

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink/10 via-yellow/10 to-teal/10">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-border sticky top-0 z-50 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <Button onClick={() => navigate(-1)} variant="ghost" className="rounded-full">
            <ArrowLeft className="mr-2 h-5 w-5" />
            Back
          </Button>
          <img src={logo} alt="minivinci" className="h-12 md:h-16" />
          <div className="w-24" />
        </div>
      </header>

      <div className="max-w-md mx-auto px-4 py-16 flex flex-col items-center gap-8">

        {/* Active profile avatar only */}
        {(() => {
          const activeProfile = profiles.find((p) => p.id === activeId);
          const meta = activeProfile ? avatarStyle(activeProfile, true) : null;
          return (
            <div className="flex flex-col items-center gap-2">
              <div className="relative" ref={pickerRef}>
                <div className={cn(
                  "w-24 h-24 rounded-full border-4 flex items-center justify-center",
                  meta ? meta.bg : GREY.bg,
                  meta ? meta.border : GREY.border
                )}>
                  <UserRound className={cn("h-12 w-12", meta ? meta.icon : GREY.icon)} strokeWidth={1.5} />
                </div>
                <button
                  onClick={() => setShowColorPicker((v) => !v)}
                  className="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-white border-2 border-border shadow-sm flex items-center justify-center hover:border-primary hover:bg-muted transition-all"
                  title="Choose colour"
                >
                  <Pencil className="h-3 w-3 text-muted-foreground" />
                </button>
                {showColorPicker && (
                  <div className="absolute top-full mt-3 left-1/2 -translate-x-1/2 bg-white rounded-2xl shadow-xl border border-border p-3 z-50 flex gap-2">
                    {COLORS.map((c) => (
                      <button
                        key={c.value}
                        title={c.label}
                        onClick={() => { setEditColor(c.value); setShowColorPicker(false); }}
                        className={cn(
                          "w-7 h-7 rounded-full border-2 transition-all hover:scale-110",
                          c.bg,
                          editColor === c.value ? "border-foreground scale-110" : c.border
                        )}
                      />
                    ))}
                  </div>
                )}
              </div>
              {activeProfile?.name && (
                <p className="text-base font-bold text-foreground">{activeProfile.name}</p>
              )}
            </div>
          );
        })()}

        {/* Card */}
        <div className="w-full bg-white rounded-3xl shadow-md border border-border p-8 flex flex-col gap-6">
          {/* Editable name field */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold text-foreground" htmlFor="user-name">
              Your name
            </label>
            <input
              id="user-name"
              key={activeId ?? "empty"}
              type="text"
              placeholder="e.g. Mia"
              value={editName}
              onChange={(e) => { setEditName(e.target.value); setSaved(false); }}
              onKeyDown={(e) => e.key === "Enter" && handleSave()}
              className="w-full rounded-2xl border border-border bg-muted/40 px-4 py-3 text-base font-medium focus:outline-none focus:border-pink focus:ring-2 focus:ring-pink/20 transition-all placeholder:text-muted-foreground/40"
              autoFocus
            />
          </div>

          <div className="flex justify-end">
            <Button
              onClick={handleSave}
              disabled={!editName.trim()}
              className={`rounded-full px-5 h-9 text-sm font-semibold transition-all gap-2 ${
                saved
                  ? "bg-teal hover:bg-teal text-white"
                  : "bg-pink hover:bg-pink/90 text-white"
              }`}
            >
              {saved ? (
                <>
                  <Check className="h-3.5 w-3.5" />
                  Saved!
                </>
              ) : (
                "Save"
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
