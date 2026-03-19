import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import axios from "axios";
import { API } from "@/App";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Lock, Mail, BookOpen, Search, Users, FileText } from "lucide-react";

const Login = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [stayLoggedIn, setStayLoggedIn] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  // Check if user already has an active session
  useEffect(() => {
    const checkExistingSession = async () => {
      // Check for Google OAuth success
      const googleAuthStatus = searchParams.get('google_auth');
      const authError = searchParams.get('error');
      
      if (googleAuthStatus === 'success') {
        toast.success("Erfolgreich mit Google angemeldet!");
        navigate("/dashboard", { replace: true });
        return;
      }
      
      if (authError === 'google_auth_failed') {
        toast.error("Google-Anmeldung fehlgeschlagen. Bitte versuchen Sie es erneut.");
      }
      
      try {
        const response = await axios.get(`${API}/auth/me`);
        if (response.data && response.data.user_id) {
          // User is already logged in, redirect to dashboard
          navigate("/dashboard", { replace: true });
        }
      } catch (error) {
        // Not logged in, show login form
      } finally {
        setCheckingSession(false);
      }
    };

    checkExistingSession();
  }, [navigate, searchParams]);

  const handleLogin = async (e) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast.error("Bitte E-Mail und Passwort eingeben");
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(`${API}/auth/login`, {
        email,
        password,
        stay_logged_in: stayLoggedIn
      });
      
      toast.success(`Willkommen, ${response.data.name}!`);
      navigate("/dashboard", { state: { user: response.data }, replace: true });
    } catch (error) {
      console.error("Login failed:", error);
      const message = error.response?.data?.detail || "Anmeldung fehlgeschlagen";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    setGoogleLoading(true);
    // Redirect to Google OAuth login endpoint
    window.location.href = `${API}/auth/google/login`;
  };

  // Show loading while checking existing session
  if (checkingSession) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col">
      {/* Animated Background Pattern */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute top-1/2 -left-40 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse delay-1000" />
        <div className="absolute -bottom-40 right-1/3 w-72 h-72 bg-primary/10 rounded-full blur-3xl animate-pulse delay-500" />
      </div>

      {/* Header */}
      <header className="relative z-10 p-6">
        <div className="max-w-7xl mx-auto flex items-center">
          <img 
            src="/nexus-logo.png" 
            alt="CANUSA Nexus - The Knowledge Hub" 
            className="h-14 object-contain brightness-0 invert"
          />
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-5xl grid lg:grid-cols-2 gap-12 items-center">
          
          {/* Left Side - Branding */}
          <div className="hidden lg:block space-y-8">
            <div>
              <img 
                src="/nexus-logo.png" 
                alt="CANUSA Nexus" 
                className="h-32 object-contain brightness-0 invert mb-6"
              />
              <p className="text-lg text-slate-300">
                Ihre zentrale Wissensplattform für schnellen Zugriff auf alle wichtigen Informationen.
              </p>
            </div>

            {/* Feature Cards */}
            <div className="grid gap-4">
              <div className="flex items-start gap-4 p-4 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10">
                <div className="p-2 rounded-lg bg-primary/20">
                  <Search className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-white">Schnelle Suche</h3>
                  <p className="text-sm text-slate-400">Finden Sie Artikel in Sekundenschnelle mit der Live-Suche</p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10">
                <div className="p-2 rounded-lg bg-blue-500/20">
                  <BookOpen className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-white">Wissensartikel</h3>
                  <p className="text-sm text-slate-400">Strukturierte Artikel mit Kategorien und Tags</p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10">
                <div className="p-2 rounded-lg bg-emerald-500/20">
                  <FileText className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-white">PDF-Import</h3>
                  <p className="text-sm text-slate-400">Importieren Sie PDFs und wandeln Sie sie in Artikel um</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Side - Login Form */}
          <div className="w-full max-w-md mx-auto">
            <Card className="border-0 shadow-2xl shadow-black/50 bg-white/95 backdrop-blur-xl">
              <CardHeader className="space-y-1 pb-6">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center shadow-lg">
                    <Lock className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-2xl">Anmelden</CardTitle>
                    <CardDescription>CANUSA Nexus</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleLogin} className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-sm font-medium">
                      E-Mail-Adresse
                    </Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="name@canusa.de"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="pl-10 h-11 bg-slate-50 border-slate-200 focus:bg-white transition-colors"
                        data-testid="login-email"
                        autoComplete="email"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-sm font-medium">
                      Passwort
                    </Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <Input
                        id="password"
                        type="password"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="pl-10 h-11 bg-slate-50 border-slate-200 focus:bg-white transition-colors"
                        data-testid="login-password"
                        autoComplete="current-password"
                      />
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="stay-logged-in" 
                      checked={stayLoggedIn}
                      onCheckedChange={setStayLoggedIn}
                      data-testid="stay-logged-in"
                    />
                    <label 
                      htmlFor="stay-logged-in" 
                      className="text-sm text-slate-600 cursor-pointer select-none"
                    >
                      Angemeldet bleiben (30 Tage)
                    </label>
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full h-11 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-white font-medium shadow-lg shadow-primary/25 transition-all hover:shadow-primary/40"
                    disabled={loading}
                    data-testid="login-submit"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Wird angemeldet...
                      </>
                    ) : (
                      "Anmelden"
                    )}
                  </Button>
                </form>

                {/* Divider */}
                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-slate-200"></div>
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-white px-2 text-slate-500">oder</span>
                  </div>
                </div>

                {/* Google Login Button */}
                <Button
                  type="button"
                  variant="outline"
                  className="w-full h-11 border-slate-300 hover:bg-slate-50 transition-colors"
                  onClick={handleGoogleLogin}
                  disabled={googleLoading}
                  data-testid="google-login-button"
                >
                  {googleLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Verbinde mit Google...
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                        <path
                          fill="#4285F4"
                          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        />
                        <path
                          fill="#34A853"
                          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        />
                        <path
                          fill="#FBBC05"
                          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                        />
                        <path
                          fill="#EA4335"
                          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                        />
                      </svg>
                      Mit Google anmelden
                    </>
                  )}
                </Button>

                <div className="mt-6 pt-6 border-t">
                  <p className="text-xs text-center text-slate-500">
                    Zugang nur für autorisierte Mitarbeiter.<br />
                    Bei Problemen wenden Sie sich an Ihren Administrator.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 py-6 text-center">
        <p className="text-sm text-slate-500">
          CANUSA Touristik GmbH & Co. KG
        </p>
      </footer>
    </div>
  );
};

export default Login;
