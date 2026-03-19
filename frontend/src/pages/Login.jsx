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
import { Loader2, Lock, Mail } from "lucide-react";

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
      await axios.post(`${API}/auth/login`, {
        email,
        password,
        stay_logged_in: stayLoggedIn
      });
      
      toast.success("Erfolgreich angemeldet!");
      navigate("/dashboard", { replace: true });
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
    window.location.href = `${API}/auth/google/login`;
  };

  // Show loading while checking existing session
  if (checkingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{
        backgroundImage: 'url(/login-bg.jpg)',
        backgroundSize: 'cover',
        backgroundPosition: 'center'
      }}>
        <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen flex flex-col"
      style={{
        backgroundImage: 'url(/login-bg.jpg)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed'
      }}
    >
      {/* Overlay for better readability */}
      <div className="absolute inset-0 bg-black/20" />

      {/* Main Content */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-4xl grid lg:grid-cols-2 gap-6 items-stretch">
          
          {/* Left Side - Logo & Slogan Card */}
          <Card className="hidden lg:flex flex-col items-center justify-center border-0 bg-white/75 backdrop-blur-sm p-8 shadow-[0_20px_50px_rgba(0,0,0,0.3)]">
            <img 
              src="/nexus-logo-transparent.png" 
              alt="CANUSA Nexus" 
              className="h-48 object-contain mb-8"
            />
            <p className="text-lg text-slate-600 text-center max-w-sm">
              Deine zentrale Wissensplattform für schnellen Zugriff auf alle wichtigen Informationen.
            </p>
          </Card>

          {/* Right Side - Login Form */}
          <div className="w-full">
            {/* Mobile Logo - Text only */}
            <div className="lg:hidden flex justify-center mb-6">
              <span className="text-2xl font-bold">
                <span className="text-red-600">CANUSA</span>
                <span className="text-slate-700 ml-2">Nexus</span>
              </span>
            </div>
            
            <Card className="border-0 bg-white/75 backdrop-blur-sm shadow-[0_20px_50px_rgba(0,0,0,0.3)]">
              <CardHeader className="space-y-1 pb-6">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg shadow-primary/20">
                    <Lock className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-2xl text-slate-800">Anmelden</CardTitle>
                    <CardDescription>CANUSA Nexus</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-slate-700">E-Mail-Adresse</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="name@canusa.de"
                        className="pl-10 h-11 border-slate-200 focus:border-primary bg-white"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        data-testid="email-input"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-slate-700">Passwort</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                      <Input
                        id="password"
                        type="password"
                        placeholder="••••••••"
                        className="pl-10 h-11 border-slate-200 focus:border-primary bg-white"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        data-testid="password-input"
                      />
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="stayLoggedIn"
                      checked={stayLoggedIn}
                      onCheckedChange={setStayLoggedIn}
                      className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                      data-testid="stay-logged-in"
                    />
                    <Label 
                      htmlFor="stayLoggedIn" 
                      className="text-sm text-slate-600 cursor-pointer"
                    >
                      Angemeldet bleiben (30 Tage)
                    </Label>
                  </div>

                  <Button
                    type="submit"
                    className="w-full h-11 bg-primary hover:bg-primary/90 text-white font-medium shadow-lg shadow-primary/20"
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
                <div className="relative">
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
                  className="w-full h-11 border-slate-200 hover:bg-slate-50 transition-colors bg-white"
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

                {/* Footer Notice */}
                <p className="text-center text-xs text-slate-500 mt-4">
                  Zugang nur für autorisierte Mitarbeiter.<br />
                  Bei Problemen wenden Sie sich an Ihren Administrator.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 py-4 text-center">
        <p className="text-sm text-white/80 drop-shadow-lg">
          CANUSA Touristik GmbH & Co. KG
        </p>
      </footer>
    </div>
  );
};

export default Login;
