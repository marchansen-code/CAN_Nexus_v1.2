import React, { useState, useEffect, useContext } from "react";
import axios from "axios";
import { API, AuthContext } from "@/App";
import { toast } from "sonner";
import {
  Users,
  Plus,
  Trash2,
  Edit,
  Loader2,
  Search,
  UserPlus,
  UserMinus
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

const Groups = () => {
  const { user } = useContext(AuthContext);
  const [groups, setGroups] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [createDialog, setCreateDialog] = useState(false);
  const [editDialog, setEditDialog] = useState({ open: false, group: null });
  const [deleteDialog, setDeleteDialog] = useState({ open: false, group: null });
  const [membersDialog, setMembersDialog] = useState({ open: false, group: null, members: [] });
  const [newGroup, setNewGroup] = useState({ name: "", description: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [groupsRes, usersRes] = await Promise.all([
        axios.get(`${API}/groups`),
        axios.get(`${API}/users`)
      ]);
      setGroups(groupsRes.data);
      setUsers(usersRes.data);
    } catch (error) {
      console.error("Failed to fetch data:", error);
      toast.error("Daten konnten nicht geladen werden");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGroup = async () => {
    if (!newGroup.name.trim()) {
      toast.error("Bitte Gruppennamen eingeben");
      return;
    }

    setSaving(true);
    try {
      const response = await axios.post(`${API}/groups`, newGroup);
      setGroups([...groups, response.data]);
      setCreateDialog(false);
      setNewGroup({ name: "", description: "" });
      toast.success("Gruppe erstellt");
    } catch (error) {
      toast.error(error.response?.data?.detail || "Gruppe konnte nicht erstellt werden");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateGroup = async () => {
    if (!editDialog.group) return;

    setSaving(true);
    try {
      const response = await axios.put(`${API}/groups/${editDialog.group.group_id}`, {
        name: editDialog.group.name,
        description: editDialog.group.description
      });
      setGroups(groups.map(g => g.group_id === editDialog.group.group_id ? response.data : g));
      setEditDialog({ open: false, group: null });
      toast.success("Gruppe aktualisiert");
    } catch (error) {
      toast.error("Gruppe konnte nicht aktualisiert werden");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteGroup = async () => {
    if (!deleteDialog.group) return;

    try {
      await axios.delete(`${API}/groups/${deleteDialog.group.group_id}`);
      setGroups(groups.filter(g => g.group_id !== deleteDialog.group.group_id));
      toast.success("Gruppe gelöscht");
    } catch (error) {
      toast.error("Gruppe konnte nicht gelöscht werden");
    } finally {
      setDeleteDialog({ open: false, group: null });
    }
  };

  const openMembersDialog = async (group) => {
    try {
      const response = await axios.get(`${API}/groups/${group.group_id}/members`);
      setMembersDialog({ open: true, group, members: response.data });
    } catch (error) {
      toast.error("Mitglieder konnten nicht geladen werden");
    }
  };

  const handleToggleUserInGroup = async (userId, isCurrentlyMember) => {
    const targetUser = users.find(u => u.user_id === userId);
    if (!targetUser || !membersDialog.group) return;

    const currentGroupIds = targetUser.group_ids || [];
    let newGroupIds;
    
    if (isCurrentlyMember) {
      newGroupIds = currentGroupIds.filter(id => id !== membersDialog.group.group_id);
    } else {
      newGroupIds = [...currentGroupIds, membersDialog.group.group_id];
    }

    try {
      await axios.put(`${API}/users/${userId}/groups`, { group_ids: newGroupIds });
      
      // Update local state
      setUsers(users.map(u => u.user_id === userId ? { ...u, group_ids: newGroupIds } : u));
      
      // Update members dialog
      if (isCurrentlyMember) {
        setMembersDialog(prev => ({
          ...prev,
          members: prev.members.filter(m => m.user_id !== userId)
        }));
      } else {
        setMembersDialog(prev => ({
          ...prev,
          members: [...prev.members, targetUser]
        }));
      }
      
      toast.success(isCurrentlyMember ? "Benutzer entfernt" : "Benutzer hinzugefügt");
    } catch (error) {
      toast.error("Änderung fehlgeschlagen");
    }
  };

  const getMemberCount = (groupId) => {
    return users.filter(u => (u.group_ids || []).includes(groupId)).length;
  };

  if (user?.role !== "admin") {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-lg font-semibold mb-2">Zugriff verweigert</h2>
            <p className="text-muted-foreground">
              Nur Administratoren können Gruppen verwalten.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fadeIn" data-testid="groups-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gruppen</h1>
          <p className="text-muted-foreground mt-1">
            Verwalten Sie Benutzergruppen für die Artikel-Sichtbarkeit
          </p>
        </div>
        <Button onClick={() => setCreateDialog(true)} className="bg-primary hover:bg-primary/90">
          <Plus className="w-4 h-4 mr-2" />
          Neue Gruppe
        </Button>
      </div>

      {/* Groups List */}
      {groups.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <Users className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
            <h3 className="font-medium text-lg mb-2">Keine Gruppen</h3>
            <p className="text-muted-foreground text-sm mb-4">
              Erstellen Sie Gruppen, um die Sichtbarkeit von Artikeln zu steuern.
            </p>
            <Button onClick={() => setCreateDialog(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Erste Gruppe erstellen
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {groups.map(group => (
            <Card key={group.group_id}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-lg bg-violet-100 dark:bg-violet-900 flex items-center justify-center">
                      <Users className="w-6 h-6 text-violet-600 dark:text-violet-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">{group.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {group.description || "Keine Beschreibung"}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <Badge variant="secondary">
                      {getMemberCount(group.group_id)} Mitglieder
                    </Badge>
                    
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => openMembersDialog(group)}
                      >
                        <UserPlus className="w-4 h-4 mr-2" />
                        Mitglieder
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => setEditDialog({ open: true, group: { ...group } })}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => setDeleteDialog({ open: true, group })}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={createDialog} onOpenChange={setCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Neue Gruppe erstellen</DialogTitle>
            <DialogDescription>
              Gruppen steuern die Sichtbarkeit von Artikeln.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="group-name">Name *</Label>
              <Input
                id="group-name"
                placeholder="z.B. Vertrieb, Marketing, IT"
                value={newGroup.name}
                onChange={(e) => setNewGroup({ ...newGroup, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="group-desc">Beschreibung</Label>
              <Input
                id="group-desc"
                placeholder="Optionale Beschreibung"
                value={newGroup.description}
                onChange={(e) => setNewGroup({ ...newGroup, description: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialog(false)}>
              Abbrechen
            </Button>
            <Button onClick={handleCreateGroup} disabled={saving} className="bg-primary hover:bg-primary/90">
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
              Erstellen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editDialog.open} onOpenChange={(open) => !open && setEditDialog({ open: false, group: null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Gruppe bearbeiten</DialogTitle>
          </DialogHeader>
          {editDialog.group && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input
                  value={editDialog.group.name}
                  onChange={(e) => setEditDialog(prev => ({ 
                    ...prev, 
                    group: { ...prev.group, name: e.target.value } 
                  }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Beschreibung</Label>
                <Input
                  value={editDialog.group.description || ""}
                  onChange={(e) => setEditDialog(prev => ({ 
                    ...prev, 
                    group: { ...prev.group, description: e.target.value } 
                  }))}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialog({ open: false, group: null })}>
              Abbrechen
            </Button>
            <Button onClick={handleUpdateGroup} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Speichern
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Members Dialog */}
      <Dialog open={membersDialog.open} onOpenChange={(open) => !open && setMembersDialog({ open: false, group: null, members: [] })}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Mitglieder: {membersDialog.group?.name}</DialogTitle>
            <DialogDescription>
              Benutzer zur Gruppe hinzufügen oder entfernen
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 max-h-96 overflow-y-auto">
            <div className="space-y-2">
              {users.map(u => {
                const isMember = (u.group_ids || []).includes(membersDialog.group?.group_id);
                return (
                  <div 
                    key={u.user_id} 
                    className={cn(
                      "flex items-center justify-between p-3 rounded-lg border",
                      isMember ? "bg-violet-50 dark:bg-violet-950 border-violet-200 dark:border-violet-800" : ""
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-sm font-medium">
                        {u.name?.charAt(0) || "?"}
                      </div>
                      <div>
                        <p className="font-medium">{u.name}</p>
                        <p className="text-sm text-muted-foreground">{u.email}</p>
                      </div>
                    </div>
                    <Button
                      variant={isMember ? "outline" : "default"}
                      size="sm"
                      onClick={() => handleToggleUserInGroup(u.user_id, isMember)}
                      className={isMember ? "" : "bg-violet-500 hover:bg-violet-600"}
                    >
                      {isMember ? (
                        <>
                          <UserMinus className="w-4 h-4 mr-2" />
                          Entfernen
                        </>
                      ) : (
                        <>
                          <UserPlus className="w-4 h-4 mr-2" />
                          Hinzufügen
                        </>
                      )}
                    </Button>
                  </div>
                );
              })}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialog.open} onOpenChange={(open) => !open && setDeleteDialog({ open: false, group: null })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Gruppe löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              Die Gruppe "{deleteDialog.group?.name}" wird gelöscht. Alle Benutzer werden aus der Gruppe entfernt
              und Artikel-Sichtbarkeitseinstellungen werden aktualisiert.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteGroup} className="bg-red-600 hover:bg-red-700">
              Löschen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Groups;
