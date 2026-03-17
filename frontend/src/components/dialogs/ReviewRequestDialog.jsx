import React, { useState, useEffect } from "react";
import axios from "axios";
import { API } from "@/App";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Search, User, X, Loader2, Mail } from "lucide-react";

const ReviewRequestDialog = ({ open, onClose, articleId, articleTitle }) => {
  const [users, setUsers] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [existingReviewers, setExistingReviewers] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (open) {
      loadData();
    }
  }, [open, articleId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [usersRes, reviewersRes] = await Promise.all([
        axios.get(`${API}/users`),
        axios.get(`${API}/notifications/article/${articleId}/reviewers`)
      ]);
      setUsers(usersRes.data.filter(u => !u.is_blocked));
      setExistingReviewers(reviewersRes.data.reviewers || []);
    } catch (error) {
      console.error("Failed to load data:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter(user => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        user.name?.toLowerCase().includes(query) ||
        user.email?.toLowerCase().includes(query)
      );
    }
    return true;
  });

  const isAlreadyReviewer = (userId) => {
    return existingReviewers.some(r => r.user_id === userId);
  };

  const toggleUser = (userId) => {
    setSelectedUsers(prev => 
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const handleSendRequests = async () => {
    if (selectedUsers.length === 0) {
      toast.error("Bitte wählen Sie mindestens einen Reviewer aus");
      return;
    }

    setSending(true);
    try {
      await axios.post(`${API}/notifications/review-request`, {
        article_id: articleId,
        reviewer_ids: selectedUsers
      });
      toast.success(`Review-Anfrage an ${selectedUsers.length} Benutzer gesendet`);
      setSelectedUsers([]);
      loadData(); // Refresh reviewers list
      onClose();
    } catch (error) {
      toast.error("Fehler beim Senden der Review-Anfragen");
    } finally {
      setSending(false);
    }
  };

  const handleRemoveReviewer = async (reviewerId) => {
    try {
      await axios.delete(`${API}/notifications/review-request/${articleId}/${reviewerId}`);
      toast.success("Reviewer entfernt");
      loadData();
    } catch (error) {
      toast.error("Fehler beim Entfernen des Reviewers");
    }
  };

  const getRoleBadge = (role) => {
    switch (role) {
      case "admin":
        return <Badge variant="destructive" className="text-[10px] px-1.5 py-0">Admin</Badge>;
      case "editor":
        return <Badge variant="default" className="text-[10px] px-1.5 py-0 bg-blue-500">Editor</Badge>;
      default:
        return <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Leser</Badge>;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5" />
            Review anfordern
          </DialogTitle>
          <DialogDescription>
            Wählen Sie Benutzer aus, die diesen Artikel überprüfen sollen. Sie erhalten eine E-Mail-Benachrichtigung und temporäre Leseberechtigung für den Entwurf.
          </DialogDescription>
        </DialogHeader>

        {existingReviewers.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium">Aktuelle Reviewer:</p>
            <div className="flex flex-wrap gap-2">
              {existingReviewers.map(reviewer => (
                <Badge key={reviewer.user_id} variant="secondary" className="gap-1 pr-1">
                  <User className="w-3 h-3" />
                  {reviewer.name}
                  <button
                    onClick={() => handleRemoveReviewer(reviewer.user_id)}
                    className="ml-1 hover:text-destructive rounded-full p-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Benutzer suchen..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : (
            <ScrollArea className="h-[250px] border rounded-md">
              <div className="p-2 space-y-1">
                {filteredUsers.map(user => {
                  const isReviewer = isAlreadyReviewer(user.user_id);
                  const isSelected = selectedUsers.includes(user.user_id);

                  return (
                    <div
                      key={user.user_id}
                      className={`flex items-center gap-3 p-2 rounded-md cursor-pointer transition-colors ${
                        isReviewer
                          ? "opacity-50 cursor-not-allowed bg-muted"
                          : isSelected
                          ? "bg-red-50 dark:bg-red-900/20"
                          : "hover:bg-accent"
                      }`}
                      onClick={() => !isReviewer && toggleUser(user.user_id)}
                    >
                      <Checkbox
                        checked={isSelected || isReviewer}
                        disabled={isReviewer}
                        className="data-[state=checked]:bg-red-500 data-[state=checked]:border-red-500"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm truncate">{user.name}</span>
                          {getRoleBadge(user.role)}
                        </div>
                        <span className="text-xs text-muted-foreground truncate block">
                          {user.email}
                        </span>
                      </div>
                      {isReviewer && (
                        <Badge variant="outline" className="text-[10px] shrink-0">
                          Bereits Reviewer
                        </Badge>
                      )}
                    </div>
                  );
                })}
                {filteredUsers.length === 0 && (
                  <p className="text-center text-muted-foreground py-4 text-sm">
                    Keine Benutzer gefunden
                  </p>
                )}
              </div>
            </ScrollArea>
          )}

          {selectedUsers.length > 0 && (
            <p className="text-sm text-muted-foreground">
              {selectedUsers.length} Benutzer ausgewählt
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={sending}>
            Abbrechen
          </Button>
          <Button
            onClick={handleSendRequests}
            disabled={sending || selectedUsers.length === 0}
            className="bg-red-500 hover:bg-red-600"
          >
            {sending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Sende...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Review-Anfrage senden
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ReviewRequestDialog;
