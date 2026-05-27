import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

export interface Stamp {
  name: string;
  image: string;
}

interface StampPickerProps {
  selectedAnimal: string | null;
  onSelectAnimal: (stamp: Stamp | null) => void;
  stamps: Stamp[];
  loading?: boolean;
}

export const AnimalPicker = ({
  selectedAnimal,
  onSelectAnimal,
  stamps,
  loading,
}: StampPickerProps) => {
  return (
    <div className="flex flex-col gap-3">
      <span className="text-sm font-semibold text-center">Stamps</span>
      {loading ? (
        <div className="grid grid-cols-4 gap-2">
          {Array.from({ length: 9 }).map((_, i) => (
            <div
              key={i}
              className="w-12 h-12 rounded-lg border-2 border-border bg-muted flex items-center justify-center animate-pulse"
            >
              <Loader2 className="w-4 h-4 text-muted-foreground animate-spin" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          {stamps.map((stamp) => (
            <button
              key={stamp.name}
              onClick={() =>
                onSelectAnimal(selectedAnimal === stamp.name ? null : stamp)
              }
              className={cn(
                "relative w-12 h-12 rounded-lg border-2 transition-all hover:scale-105 flex items-center justify-center overflow-hidden",
                selectedAnimal === stamp.name
                  ? "border-teal bg-teal/10"
                  : "border-border bg-muted"
              )}
              title={stamp.name}
            >
              <img
                src={stamp.image}
                alt={stamp.name}
                className="w-full h-full object-cover rounded-md"
              />
              {selectedAnimal === stamp.name && (
                <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-teal rounded-full flex items-center justify-center">
                  <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
