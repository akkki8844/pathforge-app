import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, School, CheckCircle2, Trash2, UserPlus, Mail, Copy, KeyRound, Clock } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { CountryCombobox } from "@/components/CountryCombobox";
import { formatDistanceToNow } from "date-fns";

interface SchoolRow {
  id: string;
  name: string;
  country: string | null;
  city: string | null;
  domain: string | null;
  is_verified: boolean;
  student_count: number;
  counsellor_count: number;
}

interface Counsellor {
  user_id: string;
  email: string | null;
  username: string | null;
  title: string | null;
  school_id: string | null;
  school_name: string | null;
  verified: boolean;
  invite_status?: "pending" | "accepted" | null;
  invite_accepted_at?: string | null;
  onboarding_completed?: boolean | null;
  created_at?: string | null;
}

export function AdminSchools() {
  const { user } = useAuth();
  const [schools, setSchools] = useState<SchoolRow[]>([]);
  const [counsellors, setCounsellors] = useState<Counsellor[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [selectedSchoolId, setSelectedSchoolId] = useState<string>("");
  const [selectedCounsellor, setSelectedCounsellor] = useState<string>("");
  const [form, setForm] = useState({ name: "", country: "", city: "", domain: "" });

  // Add-counsellor (invite) dialog state
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteForm, setInviteForm] = useState({ name: "", email: "", school_id: "" });
  const [inviting, setInviting] = useState(false);
  const [invitedPassword, setInvitedPassword] = useState<string | null>(null);
  const [invitedEmail, setInvitedEmail] = useState<string | null>(null);
  const [emailDelivered, setEmailDelivered] = useState(true);

  const load = async () => {
    setLoading(true);
    const [{ data: s }, { data: c }] = await Promise.all([
      supabase.rpc("admin_list_schools_with_counts"),
      supabase.rpc("admin_list_counsellors"),
    ]);
    setSchools(((s as unknown) as SchoolRow[]) || []);
    setCounsellors(((c as unknown) as Counsellor[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const create = async () => {
    if (!user || !form.name.trim()) {
      toast.error("School name required");
      return;
    }
    const { error } = await supabase.from("schools").insert({
      name: form.name.trim(),
      country: form.country || null,
      city: form.city || null,
      domain: form.domain || null,
      is_verified: true,
      created_by: user.id,
    });
    if (error) toast.error(error.message);
    else {
      toast.success("School added");
      setOpen(false);
      setForm({ name: "", country: "", city: "", domain: "" });
      load();
    }
  };

  const verify = async (id: string, current: boolean) => {
    const { error } = await supabase
      .from("schools")
      .update({ is_verified: !current })
      .eq("id", id);
    if (error) toast.error(error.message);
    else load();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this school?")) return;
    const { error } = await supabase.from("schools").delete().eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Deleted");
      load();
    }
  };

  const resetCounsellorPassword = async (userId: string, label: string) => {
    if (!confirm(`Generate a new temporary password for "${label}"?\n\nThe old password will stop working immediately.`)) return;
    const { data, error } = await supabase.functions.invoke("admin-reset-counsellor-password", {
      body: { target_user_id: userId },
    });
    if (error || (data as any)?.error) {
      toast.error(error?.message || (data as any)?.error || "Failed to reset password");
      return;
    }
    setInvitedEmail((data as any).email);
    setInvitedPassword((data as any).temporary_password);
    setEmailDelivered(false); // Make it explicit: this was an admin-initiated reset, not an emailed invite.
    setInviteOpen(true);
    toast.success("New temporary password generated");
  };

  const removeCounsellor = async (userId: string, label: string) => {
    if (!confirm(`Permanently delete counsellor "${label}"?\n\nThis erases their account and all associated data. This cannot be undone.`)) return;
    const { data, error } = await supabase.functions.invoke("admin-delete-user", {
      body: { target_user_id: userId },
    });
    if (error) {
      toast.error(error.message || "Failed to delete counsellor");
      return;
    }
    if ((data as any)?.error) {
      toast.error((data as any).error);
      return;
    }
    toast.success((data as any)?.warning || "Counsellor deleted");
    load();
  };

  const assign = async () => {
    if (!selectedCounsellor || !selectedSchoolId) return;
    const { error } = await supabase.rpc("admin_assign_counsellor_to_school", {
      _teacher_user_id: selectedCounsellor,
      _school_id: selectedSchoolId,
    });
    if (error) toast.error(error.message);
    else {
      toast.success("Counsellor assigned");
      setAssignOpen(false);
      setSelectedCounsellor("");
      setSelectedSchoolId("");
      load();
    }
  };

  const inviteCounsellor = async () => {
    const email = inviteForm.email.trim().toLowerCase();
    if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      toast.error("Please enter a valid email address");
      return;
    }
    setInviting(true);
    setInvitedPassword(null);
    setInvitedEmail(null);
    try {
      const { data, error } = await supabase.functions.invoke("admin-create-counsellor", {
        body: {
          email,
          name: inviteForm.name.trim() || null,
          school_id: inviteForm.school_id || null,
        },
      });
      if (error) {
        // Try to surface server JSON error message
        let msg = error.message || "Failed to invite counsellor";
        try {
          const ctx = (error as any).context;
          if (ctx?.json) {
            const body = await ctx.json();
            if (body?.error) msg = body.error;
          }
        } catch { /* ignore */ }
        throw new Error(msg);
      }
      if ((data as any)?.error) throw new Error((data as any).error);

      const password = (data as any)?.temporary_password as string | undefined;
      const sent = !!(data as any)?.email_sent;
      setInvitedEmail(email);
      setInvitedPassword(password ?? null);
      setEmailDelivered(sent);

      toast.success(
        sent
          ? "Counsellor invited — welcome email sent"
          : "Counsellor created — share password manually (email not sent)",
      );
      setInviteForm({ name: "", email: "", school_id: "" });
      load();
    } catch (e: any) {
      toast.error(e?.message || "Failed to invite counsellor");
    } finally {
      setInviting(false);
    }
  };

  const closeInvite = () => {
    setInviteOpen(false);
    // Wipe sensitive material from memory after dialog closes.
    setTimeout(() => {
      setInvitedPassword(null);
      setInvitedEmail(null);
      setEmailDelivered(true);
    }, 300);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <School className="h-6 w-6 text-accent" /> School Management
          </h2>
          <p className="text-sm text-muted-foreground">
            Add and verify schools, assign counsellors, and view enrolment.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Dialog open={inviteOpen} onOpenChange={(o) => (o ? setInviteOpen(true) : closeInvite())}>
            <DialogTrigger asChild>
              <Button>
                <Mail className="h-4 w-4 mr-2" /> Add Counsellor
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {invitedPassword ? "Counsellor account created" : "Invite a counsellor"}
                </DialogTitle>
              </DialogHeader>

              {!invitedPassword ? (
                <div className="space-y-3">
                  <div>
                    <Label>Full name (optional)</Label>
                    <Input
                      value={inviteForm.name}
                      onChange={(e) => setInviteForm({ ...inviteForm, name: e.target.value })}
                      placeholder="Jane Doe"
                    />
                  </div>
                  <div>
                    <Label>Email *</Label>
                    <Input
                      type="email"
                      value={inviteForm.email}
                      onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                      placeholder="counsellor@school.edu"
                    />
                  </div>
                  <div>
                    <Label>Assign to school (optional)</Label>
                    <Select
                      value={inviteForm.school_id || "none"}
                      onValueChange={(v) =>
                        setInviteForm({ ...inviteForm, school_id: v === "none" ? "" : v })
                      }
                    >
                      <SelectTrigger><SelectValue placeholder="No school" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No school</SelectItem>
                        {schools.map((s) => (
                          <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    A secure password will be generated automatically and emailed
                    to the counsellor along with sign-in instructions.
                  </p>
                  <Button className="w-full" onClick={inviteCounsellor} disabled={inviting}>
                    {inviting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Mail className="h-4 w-4 mr-2" />}
                    Send invite
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="rounded-md border border-border bg-muted/40 p-3 text-sm">
                    <div className="text-xs text-muted-foreground mb-1">Email</div>
                    <div className="font-medium">{invitedEmail}</div>
                    <div className="text-xs text-muted-foreground mt-3 mb-1">Temporary password</div>
                    <div className="flex items-center gap-2">
                      <code className="font-mono px-2 py-1 rounded bg-background border border-border text-foreground">
                        {invitedPassword}
                      </code>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          navigator.clipboard.writeText(invitedPassword);
                          toast.success("Password copied");
                        }}
                      >
                        <Copy className="h-3.5 w-3.5 mr-1" /> Copy
                      </Button>
                    </div>
                  </div>
                  {emailDelivered ? (
                    <p className="text-xs text-muted-foreground">
                      A welcome email with these credentials has been queued for
                      delivery. Share this password securely as a backup if needed.
                    </p>
                  ) : (
                    <p className="text-xs text-destructive">
                      Email delivery failed. Please share these credentials with
                      the counsellor manually using a secure channel.
                    </p>
                  )}
                  <Button className="w-full" onClick={closeInvite}>Done</Button>
                </div>
              )}
            </DialogContent>
          </Dialog>

          <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <UserPlus className="h-4 w-4 mr-2" /> Assign Counsellor
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Assign Counsellor to School</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label>Counsellor</Label>
                  <Select value={selectedCounsellor} onValueChange={setSelectedCounsellor}>
                    <SelectTrigger><SelectValue placeholder="Pick counsellor" /></SelectTrigger>
                    <SelectContent>
                      {counsellors.map((c) => (
                        <SelectItem key={c.user_id} value={c.user_id}>
                          {c.username || c.email} {c.school_name ? `(${c.school_name})` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>School</Label>
                  <Select value={selectedSchoolId} onValueChange={setSelectedSchoolId}>
                    <SelectTrigger><SelectValue placeholder="Pick school" /></SelectTrigger>
                    <SelectContent>
                      {schools.map((s) => (
                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button className="w-full" onClick={assign}>Assign</Button>
              </div>
            </DialogContent>
          </Dialog>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" /> Add School
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add School</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label>Name *</Label>
                  <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                </div>
                <div>
                  <Label>Country</Label>
                  <CountryCombobox
                    value={form.country}
                    onChange={(v) => setForm({ ...form, country: v })}
                    placeholder="Search 195+ countries"
                  />
                </div>
                <div>
                  <Label>City</Label>
                  <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
                </div>
                <div>
                  <Label>Email domain (optional)</Label>
                  <Input
                    placeholder="example.edu"
                    value={form.domain}
                    onChange={(e) => setForm({ ...form, domain: e.target.value })}
                  />
                </div>
                <Button className="w-full" onClick={create}>Add</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Schools</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-accent" />
            </div>
          ) : schools.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No schools yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Students</TableHead>
                  <TableHead>Counsellors</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {schools.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {[s.city, s.country].filter(Boolean).join(", ") || "—"}
                    </TableCell>
                    <TableCell>{s.student_count}</TableCell>
                    <TableCell>{s.counsellor_count}</TableCell>
                    <TableCell>
                      {s.is_verified ? (
                        <Badge variant="default" className="gap-1">
                          <CheckCircle2 className="h-3 w-3" /> Verified
                        </Badge>
                      ) : (
                        <Badge variant="secondary">Pending</Badge>
                      )}
                    </TableCell>
                    <TableCell className="space-x-2">
                      <Button size="sm" variant="outline" onClick={() => verify(s.id, s.is_verified)}>
                        {s.is_verified ? "Unverify" : "Verify"}
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => remove(s.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Counsellors</CardTitle>
        </CardHeader>
        <CardContent>
          {counsellors.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">No counsellors yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>School</TableHead>
                  <TableHead>Invite</TableHead>
                  <TableHead>Verified</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {counsellors.map((c) => {
                  const accepted = c.invite_status === "accepted";
                  return (
                    <TableRow key={c.user_id}>
                      <TableCell>{c.username || "—"}</TableCell>
                      <TableCell className="text-sm">{c.email}</TableCell>
                      <TableCell>{c.school_name || <span className="text-muted-foreground">Unassigned</span>}</TableCell>
                      <TableCell>
                        {accepted ? (
                          <div className="flex flex-col gap-0.5">
                            <Badge variant="default" className="gap-1 w-fit">
                              <CheckCircle2 className="h-3 w-3" /> Accepted
                            </Badge>
                            {c.invite_accepted_at && (
                              <span className="text-[10px] text-muted-foreground">
                                {formatDistanceToNow(new Date(c.invite_accepted_at), { addSuffix: true })}
                              </span>
                            )}
                          </div>
                        ) : (
                          <Badge variant="secondary" className="gap-1 w-fit">
                            <Clock className="h-3 w-3" /> Pending
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {c.verified ? (
                          <Badge variant="default">Verified</Badge>
                        ) : (
                          <Badge variant="secondary">Pending</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right space-x-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          title="Generate new temporary password"
                          onClick={() => resetCounsellorPassword(c.user_id, c.username || c.email || c.user_id)}
                        >
                          <KeyRound className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          title="Delete counsellor"
                          onClick={() => removeCounsellor(c.user_id, c.username || c.email || c.user_id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
