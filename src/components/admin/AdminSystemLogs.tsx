import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Activity } from "lucide-react";
import { format } from "date-fns";

interface ActivityLog {
  id: string;
  user_id: string;
  action_type: string;
  page_path: string | null;
  action_details: any;
  created_at: string;
}

interface EmailLog {
  id: string;
  recipient_email: string;
  template_name: string;
  status: string;
  error_message: string | null;
  created_at: string;
}

export function AdminSystemLogs() {
  const [activity, setActivity] = useState<ActivityLog[]>([]);
  const [emails, setEmails] = useState<EmailLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [{ data: a }, { data: e }] = await Promise.all([
        supabase.from("user_activity_logs").select("*").order("created_at", { ascending: false }).limit(100),
        supabase.from("email_send_log").select("*").order("created_at", { ascending: false }).limit(100),
      ]);
      setActivity((a as any) || []);
      setEmails((e as any) || []);
      setLoading(false);
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  const failedEmails = emails.filter((e) => e.status !== "sent" && e.status !== "queued").length;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Activity className="h-6 w-6" /> System Logs
        </h2>
        <p className="text-muted-foreground">
          {activity.length} recent user actions • {emails.length} email events • {failedEmails} email failures
        </p>
      </div>

      <Tabs defaultValue="activity">
        <TabsList>
          <TabsTrigger value="activity">User Activity</TabsTrigger>
          <TabsTrigger value="emails">Email Delivery</TabsTrigger>
        </TabsList>

        <TabsContent value="activity">
          <Card>
            <CardHeader><CardTitle className="text-base">Last 100 user actions</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Time</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Page</TableHead>
                    <TableHead>User</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activity.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell className="text-xs text-muted-foreground">
                        {format(new Date(a.created_at), "MMM d HH:mm:ss")}
                      </TableCell>
                      <TableCell><Badge variant="outline">{a.action_type}</Badge></TableCell>
                      <TableCell className="text-xs font-mono">{a.page_path || "—"}</TableCell>
                      <TableCell className="text-xs font-mono truncate max-w-[200px]">{a.user_id}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="emails">
          <Card>
            <CardHeader><CardTitle className="text-base">Email delivery log</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Time</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Template</TableHead>
                    <TableHead>Recipient</TableHead>
                    <TableHead>Error</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {emails.map((e) => (
                    <TableRow key={e.id}>
                      <TableCell className="text-xs text-muted-foreground">
                        {format(new Date(e.created_at), "MMM d HH:mm")}
                      </TableCell>
                      <TableCell>
                        <Badge variant={e.status === "sent" ? "default" : "destructive"}>{e.status}</Badge>
                      </TableCell>
                      <TableCell className="text-xs">{e.template_name}</TableCell>
                      <TableCell className="text-xs">{e.recipient_email}</TableCell>
                      <TableCell className="text-xs text-destructive max-w-[300px] truncate">
                        {e.error_message || "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
