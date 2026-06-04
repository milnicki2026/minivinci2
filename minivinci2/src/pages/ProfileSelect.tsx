import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { UserRound, Plus, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";
import logo from "@/assets/logo.jpeg";
import {
  loadUserProfiles,
  setActiveProfileId,
  COLORS,
  type UserProfile,
} from "@/pages/UserProfile";

const GREY = { bg: "bg-white/60", border: "border-border", icon: "text-muted-foreground" };

function colorMeta(color: string) {
  return COLORS.find((c) => c.value === color) ?? null;
}

export default function ProfileSelect() {
  const navigate = useNavigate();
  const [profiles, setProfiles] = useState<UserProfile[]>([]);

  useEffect(() => {
    setProfiles(loadUserProfiles().filter((p) => p.name));
  }, []);

  const handleSelect = (profile: UserProfile) => {
    setActiveProfileId(profile.id);
    navigate("/home");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal/20 via-yellow/20 to-pink/20 relative overflow-hidden flex flex-col">
      {/* Ambient blobs */}
      <div className="absolute top-10 left-10 w-48 h-48 bg-teal/20 rounded-full blur-3xl animate-pulse" />
      <div className="absolute top-32 right-16 w-56 h-56 bg-pink/20 rounded-full blur-3xl animate-pulse delay-700" />
      <div className="absolute bottom-24 left-1/3 w-40 h-40 bg-yellow/20 rounded-full blur-3xl animate-pulse delay-300" />
      <div className="absolute bottom-10 right-1/4 w-36 h-36 bg-lime/20 rounded-full blur-3xl animate-pulse delay-1000" />

      {/* Header */}
      <header className="relative z-10 bg-white/80 backdrop-blur-sm border-b border-border shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-center">
          <img src={logo} alt="minivinci" className="h-12 md:h-16" />
        </div>
      </header>

      {/* Main content */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 pb-16 gap-10">
        <div className="text-center">
          <h1 className="text-3xl md:text-4xl font-extrabold text-foreground">
            Who's creating today? 🎨
          </h1>
          <p className="text-muted-foreground mt-2 text-base">
            {profiles.length > 0 ? "Tap your profile to start" : "Create your first profile to get started"}
          </p>
        </div>

        {/* Profile grid */}
        <div className="flex flex-wrap justify-center gap-8">
          {profiles.map((profile) => {
            const meta = colorMeta(profile.color);
            return (
              <div
                key={profile.id}
                className="group flex flex-col items-center gap-3 cursor-pointer"
                onClick={() => handleSelect(profile)}
              >
                <div className="relative">
                  <div
                    className={cn(
                      "w-28 h-28 rounded-full border-4 flex items-center justify-center shadow-lg transition-all duration-200 group-hover:scale-110 group-hover:shadow-xl",
                      meta ? meta.bg : GREY.bg,
                      meta ? meta.border : GREY.border
                    )}
                  >
                    <UserRound
                      className={cn("h-14 w-14", meta ? meta.icon : GREY.icon)}
                      strokeWidth={1.5}
                    />
                  </div>
                  {/* Edit pencil — visible on hover */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate("/profile");
                    }}
                    className="absolute -top-1 -right-1 w-7 h-7 rounded-full bg-white border-2 border-border shadow flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:border-primary"
                    title="Edit profile"
                  >
                    <Pencil className="h-3 w-3 text-muted-foreground" />
                  </button>
                </div>
                <span className="text-base font-bold text-foreground">{profile.name}</span>
              </div>
            );
          })}

          {/* Add Profile card */}
          <div
            className="group flex flex-col items-center gap-3 cursor-pointer"
            onClick={() => navigate("/profile")}
          >
            <div className="w-28 h-28 rounded-full border-4 border-dashed border-border bg-white/50 flex items-center justify-center shadow transition-all duration-200 group-hover:scale-110 group-hover:border-primary group-hover:shadow-xl">
              <Plus className="h-10 w-10 text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
            <span className="text-base font-semibold text-muted-foreground group-hover:text-foreground transition-colors">
              Add Profile
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
