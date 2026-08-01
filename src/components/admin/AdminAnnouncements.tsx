import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Plus, Bell, Trash2, Pencil } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { BroadcastComposer } from "@/components/BroadcastComposer";

interface Announcement {
  id: string;
  title: string;
  content: string;
  type: string;
  is_active: boolean;
  show_until: string | null;
  target_audience: string | null;
  created_at: string;
  created_by: string;
}

export function AdminAnnouncements() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [newAnnouncement, setNewAnnouncement] = useState({
    title: "",
    content: "",
    type: "info",
    target_audience: "all",
  });
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  async function fetchAnnouncements() {
    try {
      const { data, error } = await supabase
        .from("admin_announcements")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching announcements:", error);
      } else {
        setAnnouncements(data || []);
      }
    } catch (err) {
      console.error("Error:", err);
    } finally {
      setLoading(false);
    }
  }

  async function createAnnouncement() {
    if (!newAnnouncement.title || !newAnnouncement.content || !user) return;

    try {
      const { error } = await supabase.from("admin_announcements").insert({
        title: newAnnouncement.title,
        content: newAnnouncement.content,
        type: newAnnouncement.type,
        target_audience: newAnnouncement.target_audience,
        created_by: user.id,
        is_active: true,
      });

      if (error) {
        toast({
          title: "Error",
          description: "Failed to create announcement",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Published",
          description: "Banner shown across the app and pushed to user notifications.",
        });
        setNewAnnouncement({ title: "", content: "", type: "info", target_audience: "all" });
        setIsCreating(false);
        fetchAnnouncements();
      }
    } catch (err) {
      console.error("Error:", err);
    }
  }

  async function toggleAnnouncement(id: string, currentValue: boolean) {
    const newValue = !currentValue;
    // Optimistic flip
    setAnnouncements((prev) =>
      prev.map((a) => (a.id === id ? { ...a, is_active: newValue } : a))
    );
    try {
      const { error } = await supabase
        .from("admin_announcements")
        .update({ is_active: newValue, updated_at: new Date().toISOString() })
        .eq("id", id);

      if (error) {
        // Roll back
        setAnnouncements((prev) =>
          prev.map((a) => (a.id === id ? { ...a, is_active: currentValue } : a))
        );
        toast({
          title: "Error",
          description: "Failed to update announcement",
          variant: "destructive",
        });
      } else {
        toast({
          title: newValue ? "Announcement enabled" : "Announcement disabled",
          description: newValue
            ? "Banner is now live across the app."
            : "Banner has been hidden.",
        });
      }
    } catch (err) {
      console.error("Error:", err);
    }
  }

  async function deleteAnnouncement(id: string) {
    try {
      const { error } = await supabase
        .from("admin_announcements")
        .delete()
        .eq("id", id);

      if (error) {
        toast({
          title: "Error",
          description: "Failed to delete announcement",
          variant: "destructive",
        });
      } else {
        setAnnouncements((prev) => prev.filter((a) => a.id !== id));
        toast({
          title: "Deleted",
          description: "Announcement has been removed",
        });
      }
    } catch (err) {
      console.error("Error:", err);
    }
  }

  const getTypeBadge = (type: string) => {
    switch (type) {
      case "warning":
        return <Badge variant="outline" className="border-yellow-500 text-yellow-500">Warning</Badge>;
      case "maintenance":
        return <Badge variant="outline" className="border-orange-500 text-orange-500">Maintenance</Badge>;
      case "update":
        return <Badge variant="outline" className="border-green-500 text-green-500">Update</Badge>;
      default:
        return <Badge variant="outline">Info</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Announcements</h2>
        <p className="text-muted-foreground">Broadcast messages to platform users</p>
      </div>

      <BroadcastComposer senderRole="admin" />

      <div className="flex items-center justify-between pt-4 border-t border-border">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Banner announcements</h3>
          <p className="text-sm text-muted-foreground">Persistent banners shown across the app</p>
        </div>
        <Dialog open={isCreating} onOpenChange={setIsCreating}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Announcement
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Announcement</DialogTitle>
              <DialogDescription>
                This will be shown to users on the platform
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Title</label>
                <Input
                  value={newAnnouncement.title}
                  onChange={(e) =>
                    setNewAnnouncement({ ...newAnnouncement, title: e.target.value })
                  }
                  placeholder="Announcement title"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Content</label>
                <Textarea
                  value={newAnnouncement.content}
                  onChange={(e) =>
                    setNewAnnouncement({ ...newAnnouncement, content: e.target.value })
                  }
                  placeholder="Write your announcement..."
                  rows={4}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Type</label>
                  <Select
                    value={newAnnouncement.type}
                    onValueChange={(v) => setNewAnnouncement({ ...newAnnouncement, type: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="info">Info</SelectItem>
                      <SelectItem value="update">Update</SelectItem>
                      <SelectItem value="warning">Warning</SelectItem>
                      <SelectItem value="maintenance">Maintenance</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">Audience</label>
                  <Select
                    value={newAnnouncement.target_audience}
                    onValueChange={(v) =>
                      setNewAnnouncement({ ...newAnnouncement, target_audience: v })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Users</SelectItem>
                      <SelectItem value="onboarded">Onboarded Only</SelectItem>
                      <SelectItem value="new">New Users Only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button onClick={createAnnouncement} className="w-full">
                Publish Announcement
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            All Announcements
          </CardTitle>
          <CardDescription>{announcements.length} announcements</CardDescription>
        </CardHeader>
        <CardContent>
          {announcements.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Audience</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {announcements.map((announcement) => (
                  <TableRow key={announcement.id}>
                    <TableCell className="font-medium max-w-xs truncate">
                      {announcement.title}
                    </TableCell>
                    <TableCell>{getTypeBadge(announcement.type)}</TableCell>
                    <TableCell className="capitalize">
                      {announcement.target_audience || "All"}
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={announcement.is_active}
                        onCheckedChange={() =>
                          toggleAnnouncement(announcement.id, announcement.is_active)
                        }
                      />
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {format(new Date(announcement.created_at), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-500"
                        onClick={() => deleteAnnouncement(announcement.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Bell className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No announcements yet</p>
              <p className="text-sm">Create one to notify users</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
