import React, { useState, useEffect } from "react";
import { useTheme } from "@/components/ThemeProvider";
import { toast } from "sonner";
import {
  Sun,
  Moon,
  Monitor,
  Palette,
  RotateCcw,
  Save,
  Check,
  ChevronLeft,
  Paintbrush
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

// Predefined color presets
const COLOR_PRESETS = [
  {
    name: "CANUSA Standard",
    primary: "0 84% 50%",
    description: "Das klassische CANUSA Rot"
  },
  {
    name: "Ozean Blau",
    primary: "200 80% 45%",
    description: "Beruhigendes Blau"
  },
  {
    name: "Wald Grün",
    primary: "145 60% 40%",
    description: "Natürliches Grün"
  },
  {
    name: "Sonnenuntergang",
    primary: "30 95% 50%",
    description: "Warmes Orange"
  },
  {
    name: "Lavendel",
    primary: "270 60% 55%",
    description: "Elegantes Violett"
  },
  {
    name: "Mitternacht",
    primary: "220 70% 45%",
    description: "Tiefes Dunkelblau"
  }
];

// HSL color picker helper
const hslToHex = (h, s, l) => {
  s /= 100;
  l /= 100;
  const a = s * Math.min(l, 1 - l);
  const f = (n) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
};

const parseHsl = (hslString) => {
  const parts = hslString.split(' ').map(p => parseFloat(p));
  return { h: parts[0] || 0, s: parts[1] || 0, l: parts[2] || 50 };
};

const ThemeSettings = () => {
  const { 
    theme, 
    setTheme, 
    themeSettings, 
    updateThemeSettings, 
    resetThemeSettings,
    saveThemeToServer,
    defaultThemeSettings
  } = useTheme();
  
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState(null);
  const [customPrimary, setCustomPrimary] = useState(
    themeSettings?.colors?.primary || defaultThemeSettings.colors.primary
  );

  // Track changes
  useEffect(() => {
    const currentPrimary = themeSettings?.colors?.primary || defaultThemeSettings.colors.primary;
    setHasChanges(
      theme !== (themeSettings?.mode || 'light') ||
      currentPrimary !== defaultThemeSettings.colors.primary
    );
  }, [theme, themeSettings, defaultThemeSettings]);

  const handleModeChange = (newMode) => {
    setTheme(newMode);
    setHasChanges(true);
  };

  const handlePresetSelect = (preset) => {
    setSelectedPreset(preset.name);
    setCustomPrimary(preset.primary);
    
    // Update theme settings with new primary color
    updateThemeSettings({
      colors: {
        ...themeSettings.colors,
        primary: preset.primary
      },
      darkColors: {
        ...themeSettings.darkColors,
        primary: preset.primary
      }
    });
    
    // Apply CSS variable immediately
    document.documentElement.style.setProperty('--primary', preset.primary);
    setHasChanges(true);
    toast.success(`Farbschema "${preset.name}" angewendet`);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const success = await saveThemeToServer();
      if (success) {
        toast.success("Theme-Einstellungen gespeichert");
        setHasChanges(false);
      } else {
        toast.error("Speichern fehlgeschlagen");
      }
    } catch (error) {
      toast.error("Speichern fehlgeschlagen");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    resetThemeSettings();
    setSelectedPreset("CANUSA Standard");
    setCustomPrimary(defaultThemeSettings.colors.primary);
    document.documentElement.style.setProperty('--primary', defaultThemeSettings.colors.primary);
    toast.success("Theme auf Standard zurückgesetzt");
    setHasChanges(false);
  };

  const primaryHsl = parseHsl(customPrimary);
  const primaryHex = hslToHex(primaryHsl.h, primaryHsl.s, primaryHsl.l);

  return (
    <div className="space-y-6" data-testid="theme-settings">
      {/* Theme Mode Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Monitor className="w-5 h-5" />
            Erscheinungsbild
          </CardTitle>
          <CardDescription>
            Wählen Sie zwischen hellem und dunklem Modus
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RadioGroup value={theme} onValueChange={handleModeChange} className="grid grid-cols-3 gap-4">
            <div>
              <RadioGroupItem value="light" id="theme-light" className="peer sr-only" />
              <Label
                htmlFor="theme-light"
                className={cn(
                  "flex flex-col items-center justify-center rounded-lg border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground cursor-pointer transition-all",
                  theme === 'light' && "border-primary bg-primary/5"
                )}
              >
                <Sun className="w-8 h-8 mb-2 text-amber-500" />
                <span className="text-sm font-medium">Hell</span>
              </Label>
            </div>
            <div>
              <RadioGroupItem value="dark" id="theme-dark" className="peer sr-only" />
              <Label
                htmlFor="theme-dark"
                className={cn(
                  "flex flex-col items-center justify-center rounded-lg border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground cursor-pointer transition-all",
                  theme === 'dark' && "border-primary bg-primary/5"
                )}
              >
                <Moon className="w-8 h-8 mb-2 text-indigo-500" />
                <span className="text-sm font-medium">Dunkel</span>
              </Label>
            </div>
            <div>
              <RadioGroupItem value="system" id="theme-system" className="peer sr-only" />
              <Label
                htmlFor="theme-system"
                className={cn(
                  "flex flex-col items-center justify-center rounded-lg border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground cursor-pointer transition-all",
                  theme === 'system' && "border-primary bg-primary/5"
                )}
              >
                <Monitor className="w-8 h-8 mb-2 text-slate-500" />
                <span className="text-sm font-medium">Automatisch</span>
              </Label>
            </div>
          </RadioGroup>
        </CardContent>
      </Card>

      {/* Color Presets */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="w-5 h-5" />
            Farbschema
          </CardTitle>
          <CardDescription>
            Wählen Sie ein vordefiniertes Farbschema oder passen Sie die Farben an
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {COLOR_PRESETS.map((preset) => {
              const presetHsl = parseHsl(preset.primary);
              const presetHex = hslToHex(presetHsl.h, presetHsl.s, presetHsl.l);
              const isSelected = selectedPreset === preset.name || 
                (customPrimary === preset.primary && !selectedPreset);
              
              return (
                <button
                  key={preset.name}
                  onClick={() => handlePresetSelect(preset)}
                  className={cn(
                    "relative flex flex-col items-start p-4 rounded-lg border-2 transition-all text-left hover:shadow-md",
                    isSelected 
                      ? "border-primary bg-primary/5 shadow-sm" 
                      : "border-muted hover:border-primary/50"
                  )}
                >
                  {isSelected && (
                    <div className="absolute top-2 right-2">
                      <Check className="w-4 h-4 text-primary" />
                    </div>
                  )}
                  <div 
                    className="w-10 h-10 rounded-full mb-3 border-2 border-white shadow-md"
                    style={{ backgroundColor: presetHex }}
                  />
                  <span className="font-medium text-sm">{preset.name}</span>
                  <span className="text-xs text-muted-foreground">{preset.description}</span>
                </button>
              );
            })}
          </div>
          
          {/* Current color preview */}
          <div className="mt-6 p-4 rounded-lg bg-muted/50 flex items-center gap-4">
            <div 
              className="w-12 h-12 rounded-lg shadow-inner border"
              style={{ backgroundColor: primaryHex }}
            />
            <div>
              <p className="font-medium text-sm">Aktuelle Primärfarbe</p>
              <p className="text-xs text-muted-foreground font-mono">{primaryHex}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex items-center justify-between pt-4">
        <Button
          variant="outline"
          onClick={handleReset}
          className="gap-2"
        >
          <RotateCcw className="w-4 h-4" />
          Auf Standard zurücksetzen
        </Button>
        
        <Button
          onClick={handleSave}
          disabled={saving || !hasChanges}
          className="gap-2 bg-primary hover:bg-primary/90"
        >
          {saving ? (
            <>
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Speichern...
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              Einstellungen speichern
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

export default ThemeSettings;
