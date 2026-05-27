import { cn } from "@/lib/utils";
import alligatorImg from "@/assets/animals/alligator.svg";
import bearImg from "@/assets/animals/bear.svg";
import bunnyImg from "@/assets/animals/bunny.svg";
import catImg from "@/assets/animals/cat.svg";
import cheetahImg from "@/assets/animals/cheetah.svg";
import dogImg from "@/assets/animals/dog.svg";
import eagleImg from "@/assets/animals/eagle.svg";
import wolfImg from "@/assets/animals/wolf.svg";

interface Animal {
  name: string;
  image: string;
}

const ANIMALS: Animal[] = [
  { name: "Alligator", image: alligatorImg },
  { name: "Bear", image: bearImg },
  { name: "Bunny", image: bunnyImg },
  { name: "Cat", image: catImg },
  { name: "Cheetah", image: cheetahImg },
  { name: "Dog", image: dogImg },
  { name: "Eagle", image: eagleImg },
  { name: "Wolf", image: wolfImg },
];

interface AnimalPickerProps {
  selectedAnimal: string | null;
  onSelectAnimal: (animal: Animal | null) => void;
}

export const AnimalPicker = ({
  selectedAnimal,
  onSelectAnimal,
}: AnimalPickerProps) => {
  return (
    <div className="flex flex-col gap-3">
      <span className="text-sm font-semibold text-center">Animals</span>
      <div className="grid grid-cols-4 gap-2">
        {ANIMALS.map((animal) => (
          <button
            key={animal.name}
            onClick={() =>
              onSelectAnimal(selectedAnimal === animal.name ? null : animal)
            }
            className={cn(
              "relative w-12 h-12 rounded-lg border-2 transition-all hover:scale-105 flex items-center justify-center",
              selectedAnimal === animal.name
                ? "border-teal bg-teal/10"
                : "border-border bg-muted"
            )}
            title={animal.name}
          >
            <img
              src={animal.image}
              alt={animal.name}
              className="w-8 h-8 object-contain"
            />
            {selectedAnimal === animal.name && (
              <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-teal rounded-full flex items-center justify-center">
                <svg
                  className="w-3 h-3 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={3}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
};
