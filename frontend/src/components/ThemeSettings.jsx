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
  Check
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";

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
    colorScheme,
    setColorScheme,
    resetThemeSettings,
    saveThemeToServer,
    COLOR_PRESETS
  } = useTheme();
  
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [initialTheme] = useState(theme);
  const [initialScheme] = useState(colorScheme);

  // Track changes
  useEffect(() => {
    setHasChanges(theme !== initialTheme || colorScheme !== initialScheme);
  }, [theme, colorScheme, initialTheme, initialScheme]);

  const handleModeChange = (newMode) => {
    setTheme(newMode);
    setHasChanges(true);
  };

  const handlePresetSelect = (presetKey) => {
    setColorScheme(presetKey);
    setHasChanges(true);
    toast.success(`Farbschema "${COLOR_PRESETS[presetKey].name}" angewendet`);
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
    toast.success("Theme auf Standard zurückgesetzt");
    setHasChanges(false);
  };

  // Get hex color for preview
  const getPreviewColor = (presetKey) => {
    const preset = COLOR_PRESETS[presetKey];
    if (!preset) return '#e11d48';
    const hsl = parseHsl(preset.light.primary);
    return hslToHex(hsl.h, hsl.s, hsl.l);
  };

  // Get descriptions for presets
  const presetDescriptions = {
    'canusa': 'Das klassische CANUSA Rot',
    'ocean': 'Beruhigendes Blau',
    'forest': 'Natürliches Grün',
    'sunset': 'Warmes Orange',
    'lavender': 'Elegantes Violett',
    'midnight': 'Tiefes Dunkelblau'
  };

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
            Wählen Sie ein vordefiniertes Farbschema für die Benutzeroberfläche
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {Object.entries(COLOR_PRESETS).map(([key, preset]) => {
              const previewHex = getPreviewColor(key);
              const isSelected = colorScheme === key;
              
              return (
                <button
                  key={key}
                  onClick={() => handlePresetSelect(key)}
                  className={cn(
                    "relative flex flex-col items-start p-4 rounded-lg border-2 transition-all text-left hover:shadow-md",
                    isSelected 
                      ? "border-primary bg-primary/5 shadow-sm" 
                      : "border-muted hover:border-primary/50"
                  )}
                  data-testid={`color-preset-${key}`}
                >
                  {isSelected && (
                    <div className="absolute top-2 right-2">
                      <Check className="w-4 h-4 text-primary" />
                    </div>
                  )}
                  <div 
                    className="w-10 h-10 rounded-full mb-3 border-2 border-white shadow-md"
                    style={{ backgroundColor: previewHex }}
                  />
                  <span className="font-medium text-sm">{preset.name}</span>
                  <span className="text-xs text-muted-foreground">{presetDescriptions[key]}</span>
                </button>
              );
            })}
          </div>
          
          {/* Current color preview */}
          <div className="mt-6 p-4 rounded-lg bg-muted/50 flex items-center gap-4">
            <div 
              className="w-12 h-12 rounded-lg shadow-inner border"
              style={{ backgroundColor: getPreviewColor(colorScheme) }}
            />
            <div>
              <p className="font-medium text-sm">Aktuelle Primärfarbe</p>
              <p className="text-xs text-muted-foreground">{COLOR_PRESETS[colorScheme]?.name || 'CANUSA Standard'}</p>
            </div>
          </div>
          
          {/* Live Preview Box */}
          <div className="mt-6 p-4 rounded-lg border border-border bg-card">
            <p className="text-sm text-muted-foreground mb-3">Vorschau:</p>
            <div className="flex items-center gap-3">
              <div className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium">
                Primär-Button
              </div>
              <div className="px-4 py-2 rounded-md bg-accent text-accent-foreground text-sm border border-primary/30">
                Akzent-Element
              </div>
              <div className="w-3 h-3 rounded-full bg-primary animate-pulse" title="Aktiv-Indikator"></div>
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
