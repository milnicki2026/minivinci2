import { Button } from "@/components/ui/button";
import { BookOpen, Sparkles, Star } from "lucide-react";
import { useNavigate } from "react-router-dom";
import logo from "@/assets/logo.jpeg";
const Welcome = () => {
  const navigate = useNavigate();
  return <div className="min-h-screen bg-gradient-to-br from-teal/20 via-yellow/20 to-pink/20 relative overflow-hidden">
      {/* Top Banner with Logo */}
      <div className="bg-white shadow-md py-4 px-6 relative z-20">
        <img src={logo} alt="minivinci" className="h-12 md:h-16" />
      </div>

      {/* Decorative circles */}
      <div className="absolute top-20 left-10 w-32 h-32 bg-yellow/30 rounded-full blur-3xl animate-pulse" />
      <div className="absolute top-40 right-20 w-40 h-40 bg-pink/30 rounded-full blur-3xl animate-pulse delay-1000" />
      <div className="absolute bottom-20 left-1/4 w-36 h-36 bg-teal/30 rounded-full blur-3xl animate-pulse delay-500" />
      <div className="absolute bottom-40 right-1/3 w-28 h-28 bg-lime/30 rounded-full blur-3xl animate-pulse delay-700" />

      <div className="relative z-10 min-h-[calc(100vh-5rem)] flex flex-col items-center justify-center p-4">
        {/* Welcome Content */}
        <div className="max-w-2xl text-center space-y-6">
          <h1 className="text-4xl mb-2 font-extrabold md:text-5xl text-foreground">Welcome to minivinci</h1>
          

          <p className="text-xl md:text-2xl text-foreground/80 leading-relaxed">THIS IS AN AI GENERATED CHANGE TO THE EXPERIENCE.</p>

          {/* Features */}
          <div className="grid md:grid-cols-2 gap-4 mt-8 mb-8">
            <div 
              onClick={() => navigate("/create")}
              className="bg-white/80 backdrop-blur-sm rounded-3xl p-6 shadow-xl hover:scale-105 transition-transform cursor-pointer"
            >
              <div className="w-16 h-16 bg-teal rounded-full flex items-center justify-center mx-auto mb-4">
                <BookOpen className="h-8 w-8 text-white" />
              </div>
              <h3 className="font-bold text-lg mb-2">Write Stories</h3>
              <p className="text-muted-foreground">
                Use your imagination to create wonderful tales!
              </p>
            </div>

            <div 
              onClick={() => navigate("/create")}
              className="bg-white/80 backdrop-blur-sm rounded-3xl p-6 shadow-xl hover:scale-105 transition-transform cursor-pointer"
            >
              <div className="w-16 h-16 bg-pink rounded-full flex items-center justify-center mx-auto mb-4">
                <Sparkles className="h-8 w-8 text-white" />
              </div>
              <h3 className="font-bold text-lg mb-2">Create Pictures</h3>
              <p className="text-muted-foreground">
                Illustrate your story with colorful drawings!
              </p>
            </div>
          </div>

          {/* CTA Button */}
          <Button onClick={() => navigate("/create")} size="lg" className="bg-gradient-to-r from-teal to-lime hover:from-teal/90 hover:to-lime/90 text-white rounded-full px-12 py-6 text-xl font-bold shadow-2xl hover:scale-110 transition-all">
            <BookOpen className="mr-3 h-6 w-6" />
            Start Creating!
          </Button>

          <div className="mt-6 flex items-center justify-center gap-2 text-muted-foreground">
            <Star className="h-5 w-5 text-yellow" />
            <span className="text-sm">Every great story starts with a single word</span>
            <Star className="h-5 w-5 text-orange" />
          </div>
        </div>
      </div>
    </div>;
};
export default Welcome;