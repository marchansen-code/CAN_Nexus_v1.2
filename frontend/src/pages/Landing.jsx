import React from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { MapPin, Instagram, Facebook, Youtube, Linkedin } from "lucide-react";

const Landing = () => {
  const navigate = useNavigate();

  const handleLogin = () => {
    const redirectUrl = window.location.origin + "/dashboard";
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b bg-white sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <img 
                src="/nexus-logo.png" 
                alt="CANUSA Nexus - The Knowledge Hub" 
                className="h-16 object-contain"
              />
            </div>
            <Button 
              onClick={handleLogin} 
              className="bg-primary hover:bg-primary/90" 
              data-testid="login-btn"
            >
              Mit Google anmelden
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-28">
          <div className="text-center max-w-3xl mx-auto">
            <img 
              src="/nexus-logo.png" 
              alt="CANUSA Nexus" 
              className="h-56 object-contain mx-auto mb-8"
            />
            <p className="text-xl text-muted-foreground mb-8">
              Internes Wissensmanagement-System für Mitarbeiter der CANUSA Touristik GmbH & Co. KG und CU-Travel.
            </p>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-8 max-w-md mx-auto">
              <p className="text-amber-800 text-sm">
                <strong>Zugang nur für Mitarbeiter:</strong><br />
                Bitte melden Sie sich mit Ihrem @canusa.de oder @cu-travel.com Google-Account an.
              </p>
            </div>
            <Button 
              size="lg" 
              onClick={handleLogin}
              className="bg-primary hover:bg-primary/90 h-14 px-10 text-lg"
              data-testid="hero-login-btn"
            >
              Anmelden
            </Button>
          </div>
        </div>
      </section>

      {/* Company Info */}
      <section className="py-16 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-12">
            {/* CANUSA */}
            <div className="bg-white rounded-xl p-8 shadow-subtle">
              <h2 className="text-2xl font-bold text-canusa-dark-blue mb-4">CANUSA Touristik</h2>
              <p className="text-muted-foreground mb-6">
                Seit 1983 Ihr Spezialist für individuelle Reisen nach Kanada und in die USA. 
                Ein inhabergeführtes Familienunternehmen mit über 160 Reisebegeisterten.
              </p>
              <div className="flex items-center gap-2 text-muted-foreground mb-4">
                <MapPin className="w-5 h-5" />
                <span>Hamburg, Deutschland</span>
              </div>
              <div className="flex gap-4">
                <a href="https://www.instagram.com/canusa_touristik/" target="_blank" rel="noopener noreferrer" className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 transition-colors">
                  <Instagram className="w-5 h-5 text-slate-700" />
                </a>
                <a href="https://www.facebook.com/canusa.touristik" target="_blank" rel="noopener noreferrer" className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 transition-colors">
                  <Facebook className="w-5 h-5 text-slate-700" />
                </a>
                <a href="https://www.youtube.com/user/canusatouristik" target="_blank" rel="noopener noreferrer" className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 transition-colors">
                  <Youtube className="w-5 h-5 text-slate-700" />
                </a>
                <a href="https://www.linkedin.com/company/canusa-touristik/" target="_blank" rel="noopener noreferrer" className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 transition-colors">
                  <Linkedin className="w-5 h-5 text-slate-700" />
                </a>
              </div>
            </div>

            {/* CU-Travel */}
            <div className="bg-white rounded-xl p-8 shadow-subtle">
              <h2 className="text-2xl font-bold text-canusa-dark-blue mb-4">CU-Travel</h2>
              <p className="text-muted-foreground mb-6">
                Ihre Experten für Urlaubsreisen weltweit. 
                Qualität und persönliche Beratung stehen bei uns an erster Stelle.
              </p>
              <div className="flex items-center gap-2 text-muted-foreground mb-4">
                <MapPin className="w-5 h-5" />
                <span>Hamburg, Deutschland</span>
              </div>
              <div className="flex gap-4">
                <a href="https://www.instagram.com/cutravel.de/" target="_blank" rel="noopener noreferrer" className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 transition-colors">
                  <Instagram className="w-5 h-5 text-slate-700" />
                </a>
                <a href="https://www.facebook.com/cutravel.de" target="_blank" rel="noopener noreferrer" className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 transition-colors">
                  <Facebook className="w-5 h-5 text-slate-700" />
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8 bg-canusa-dark-blue text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="font-semibold">CANUSA Nexus</span>
              <span className="text-slate-400">|</span>
              <span className="text-sm text-slate-300">The Knowledge Hub</span>
            </div>
            <p className="text-sm text-slate-300">
              Nur für Mitarbeiter von CANUSA Touristik GmbH & Co. KG und CU-Travel
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
