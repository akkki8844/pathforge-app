import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Loader2, MessageSquare, Bug, Lightbulb, CheckCircle, Eye } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

interface Feedback {
  id: string;
  user_id: string;
  type: string;
  title: string;
  description: string;
  status: string;
  priority: string | null;
  admin_notes: string | null;
  resolved_at: string | null;
  created_at: string;
}

export function AdminFeedback() {
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("pending");
  const [selectedFeedback, setSelectedFeedback] = useState<Feedback | null>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    fetchFeedback();

    // Live updates: refresh when new feedback arrives or status changes
    const channel = supabase
      .channel("admin_feedback_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "admin_feedback" },
        () => {
          fetchFeedback();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function fetchFeedback() {
    try {
      const { data, error } = await supabase
        .from("admin_feedback")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching feedback:", error);
      } else {
        setFeedback(data || []);
      }
    } catch (err) {
      console.error("Error:", err);
    } finally {
      setLoading(false);
    }
  }

  async function resolveFeedback(id: string) {
    try {
      const { error } = await supabase
        .from("admin_feedback")
        .update({
          status: "resolved",
          admin_notes: adminNotes,
          resolved_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (error) {
        toast({
          title: "Error",
          description: "Failed to resolve feedback",
          variant: "destructive",
        });
      } else {
        setFeedback((prev) =>
          prev.map((f) =>
            f.id === id
              ? { ...f, status: "resolved", admin_notes: adminNotes, resolved_at: new Date().toISOString() }
              : f
          )
        );
        setSelectedFeedback(null);
        setAdminNotes("");
        toast({
          title: "Resolved",
          description: "Feedback has been marked as resolved",
        });
      }
    } catch (err) {
      console.error("Error:", err);
    }
  }

  const pendingFeedback = feedback.filter((f) => f.status === "pending");
  const resolvedFeedback = feedback.filter((f) => f.status === "resolved");

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "bug":
        return <Bug className="h-4 w-4 text-red-500" />;
      case "feature":
        return <Lightbulb className="h-4 w-4 text-yellow-500" />;
      default:
        return <MessageSquare className="h-4 w-4 text-blue-500" />;
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case "bug":
        return <Badge variant="destructive">Bug</Badge>;
      case "feature":
        return <Badge variant="outline" className="border-yellow-500 text-yellow-500">Feature</Badge>;
      default:
        return <Badge variant="outline">{type}</Badge>;
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
        <h2 className="text-2xl font-bold text-foreground">User Feedback</h2>
        <p className="text-muted-foreground">Bug reports, feature requests, and general feedback</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-2">
              <MessageSquare className="h-4 w-4 text-blue-500" />
              <span className="text-xs text-muted-foreground">Total</span>
            </div>
            <div className="text-2xl font-bold">{feedback.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-2">
              <Bug className="h-4 w-4 text-red-500" />
              <span className="text-xs text-muted-foreground">Bugs</span>
            </div>
            <div className="text-2xl font-bold">
              {feedback.filter((f) => f.type === "bug").length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-2">
              <Lightbulb className="h-4 w-4 text-yellow-500" />
              <span className="text-xs text-muted-foreground">Features</span>
            </div>
            <div className="text-2xl font-bold">
              {feedback.filter((f) => f.type === "feature").length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span className="text-xs text-muted-foreground">Resolved</span>
            </div>
            <div className="text-2xl font-bold">{resolvedFeedback.length}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="pending">Pending ({pendingFeedback.length})</TabsTrigger>
          <TabsTrigger value="resolved">Resolved ({resolvedFeedback.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Pending Feedback</CardTitle>
              <CardDescription>Requires attention</CardDescription>
            </CardHeader>
            <CardContent>
              {pendingFeedback.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingFeedback.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>{getTypeBadge(item.type)}</TableCell>
                        <TableCell className="font-medium max-w-xs truncate">{item.title}</TableCell>
                        <TableCell>
                          {item.priority ? (
                            <Badge variant={item.priority === "high" ? "destructive" : "outline"}>
                              {item.priority}
                            </Badge>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {format(new Date(item.created_at), "MMM d, yyyy")}
                        </TableCell>
                        <TableCell>
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSelectedFeedback(item);
                                  setAdminNotes(item.admin_notes || "");
                                }}
                              >
                                <Eye className="h-4 w-4 mr-1" />
                                View
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle className="flex items-center gap-2">
                                  {getTypeIcon(item.type)}
                                  {item.title}
                                </DialogTitle>
                                <DialogDescription>
                                  Submitted {format(new Date(item.created_at), "MMM d, yyyy h:mm a")}
                                </DialogDescription>
                              </DialogHeader>
                              <div className="space-y-4">
                                <div>
                                  <h4 className="font-medium mb-2">Description</h4>
                                  <p className="text-sm text-muted-foreground">{item.description}</p>
                                </div>
                                <div>
                                  <h4 className="font-medium mb-2">Admin Notes</h4>
                                  <Textarea
                                    value={adminNotes}
                                    onChange={(e) => setAdminNotes(e.target.value)}
                                    placeholder="Add notes about this feedback..."
                                    rows={3}
                                  />
                                </div>
                                <Button
                                  onClick={() => resolveFeedback(item.id)}
                                  className="w-full"
                                >
                                  <CheckCircle className="h-4 w-4 mr-2" />
                                  Mark as Resolved
                                </Button>
                              </div>
                            </DialogContent>
                          </Dialog>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500 opacity-50" />
                  <p>No pending feedback</p>
                  <p className="text-sm">All feedback has been addressed</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="resolved" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Resolved Feedback</CardTitle>
              <CardDescription>Previously addressed feedback</CardDescription>
            </CardHeader>
            <CardContent>
              {resolvedFeedback.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Resolved</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {resolvedFeedback.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>{getTypeBadge(item.type)}</TableCell>
                        <TableCell className="font-medium max-w-xs truncate">{item.title}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {format(new Date(item.created_at), "MMM d")}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {item.resolved_at ? format(new Date(item.resolved_at), "MMM d") : "-"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-center py-8 text-muted-foreground">No resolved feedback</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
