import { cn } from "@/lib/utils";

interface ColorWheelProps {
  colors: { name: string; value: string }[];
  selectedColor: string;
  onColorSelect: (color: string) => void;
}

export const ColorWheel = ({ colors, selectedColor, onColorSelect }: ColorWheelProps) => {
  const radius = 120;
  const swatchSize = 48;
  
  return (
    <div className="relative w-[280px] h-[280px] mx-auto">
      {/* Center circle with text */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-32 h-32 rounded-full bg-white/90 backdrop-blur-sm border-2 border-border flex flex-col items-center justify-center shadow-lg">
          <span className="text-xs text-muted-foreground font-medium">THE RAINBOW</span>
          <span className="text-xs text-muted-foreground font-medium">IS YOURS</span>
          <span className="text-lg font-bold text-primary mt-1">Have fun!</span>
        </div>
      </div>
      
      {/* Color swatches arranged in a circle */}
      {colors.map((colorItem, index) => {
        const angle = (index / colors.length) * 2 * Math.PI - Math.PI / 2;
        const x = radius * Math.cos(angle) + 140 - swatchSize / 2;
        const y = radius * Math.sin(angle) + 140 - swatchSize / 2;
        
        const isSelected = selectedColor === colorItem.value;
        
        return (
          <button
            key={colorItem.value}
            onClick={() => onColorSelect(colorItem.value)}
            className={cn(
              "absolute rounded-full transition-all hover:scale-125",
              isSelected && "ring-4 ring-primary ring-offset-2 scale-125 z-10"
            )}
            style={{
              left: `${x}px`,
              top: `${y}px`,
              width: `${swatchSize}px`,
              height: `${swatchSize}px`,
              backgroundColor: colorItem.value,
              boxShadow: isSelected 
                ? `0 4px 20px ${colorItem.value}80`
                : "0 2px 8px rgba(0,0,0,0.15)",
              // Add paintbrush texture effect
              backgroundImage: `
                radial-gradient(circle at 30% 30%, ${colorItem.value}ee 0%, ${colorItem.value} 50%),
                radial-gradient(circle at 70% 60%, ${colorItem.value}dd 0%, transparent 50%)
              `,
            }}
            title={colorItem.name}
          >
            {isSelected && (
              <span className="absolute inset-0 flex items-center justify-center text-white text-xl font-bold drop-shadow-lg">
                ✓
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};
