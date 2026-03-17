import React, { useState, useEffect, useContext } from "react";
import axios from "axios";
import { API, AuthContext } from "@/App";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Bell, Mail, Star, UserCog, AtSign, Loader2, Send } from "lucide-react";

const NotificationSettings = () => {
  const { user } = useContext(AuthContext);
  const [preferences, setPreferences] = useState({
    mentions: true,
    favorite_updates: false,
    reviews: true,
    status_changes: true
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      const response = await axios.get(`${API}/notifications/preferences`);
      setPreferences(response.data);
    } catch (error) {
      console.error("Failed to load preferences:", error);
    } finally {
      setLoading(false);
    }
  };

  const updatePreference = async (key, value) => {
    const newPrefs = { ...preferences, [key]: value };
    setPreferences(newPrefs);
    setSaving(true);

    try {
      await axios.put(`${API}/notifications/preferences`, newPrefs);
      toast.success("Einstellungen gespeichert");
    } catch (error) {
      // Revert on error
      setPreferences(preferences);
      toast.error("Fehler beim Speichern");
    } finally {
      setSaving(false);
    }
  };

  const sendTestEmail = async () => {
    setSendingTest(true);
    try {
      const response = await axios.post(`${API}/notifications/test-email`);
      toast.success(`Test-E-Mail gesendet an ${response.data.recipient}`);
    } catch (error) {
      const detail = error.response?.data?.detail || "Fehler beim Senden";
      toast.error(detail);
    } finally {
      setSendingTest(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="w-5 h-5" />
          E-Mail-Benachrichtigungen
        </CardTitle>
        <CardDescription>
          Wählen Sie, welche E-Mail-Benachrichtigungen Sie erhalten möchten.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AtSign className="w-5 h-5 text-blue-500" />
            <div>
              <Label htmlFor="mentions" className="font-medium">@-Erwähnungen</Label>
              <p className="text-sm text-muted-foreground">
                Benachrichtigung, wenn Sie in einem Artikel erwähnt werden
              </p>
            </div>
          </div>
          <Switch
            id="mentions"
            checked={preferences.mentions}
            onCheckedChange={(checked) => updatePreference("mentions", checked)}
            disabled={saving}
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Star className="w-5 h-5 text-yellow-500" />
            <div>
              <Label htmlFor="favorite_updates" className="font-medium">Favoriten-Updates</Label>
              <p className="text-sm text-muted-foreground">
                Benachrichtigung bei Änderungen an favorisierten Artikeln
              </p>
            </div>
          </div>
          <Switch
            id="favorite_updates"
            checked={preferences.favorite_updates}
            onCheckedChange={(checked) => updatePreference("favorite_updates", checked)}
            disabled={saving}
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Mail className="w-5 h-5 text-green-500" />
            <div>
              <Label htmlFor="reviews" className="font-medium">Review-Anfragen</Label>
              <p className="text-sm text-muted-foreground">
                Benachrichtigung bei neuen Review-Anfragen
              </p>
            </div>
          </div>
          <Switch
            id="reviews"
            checked={preferences.reviews}
            onCheckedChange={(checked) => updatePreference("reviews", checked)}
            disabled={saving}
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <UserCog className="w-5 h-5 text-purple-500" />
            <div>
              <Label htmlFor="status_changes" className="font-medium">Statusänderungen</Label>
              <p className="text-sm text-muted-foreground">
                Benachrichtigung bei Änderungen an Ihrer Rolle oder Ihrem Konto
              </p>
            </div>
          </div>
          <Switch
            id="status_changes"
            checked={preferences.status_changes}
            onCheckedChange={(checked) => updatePreference("status_changes", checked)}
            disabled={saving}
          />
        </div>

        {/* Test Email Button - Admin only */}
        {user?.role === "admin" && (
          <div className="pt-4 border-t">
            <Button
              onClick={sendTestEmail}
              disabled={sendingTest}
              variant="outline"
              className="w-full"
            >
              {sendingTest ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Sende Test-E-Mail...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Test-E-Mail senden
                </>
              )}
            </Button>
            <p className="text-xs text-muted-foreground mt-2 text-center">
              Sendet eine Test-E-Mail an Ihre E-Mail-Adresse
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default NotificationSettings;
