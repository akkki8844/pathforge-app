import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Loader2, Search, ChevronLeft, ChevronRight, Eye, Flag, User, Ban,
  AlertTriangle, Trash2, RotateCcw, Coins, Save, ShieldCheck, MoreVertical,
  Pencil,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { CountryCombobox } from "@/components/CountryCombobox";

interface UserSearchResult {
  user_id: string;
  email: string | null;
  username: string | null;
  created_at: string;
  grade: string | null;
  country: string | null;
  curriculum: string | null;
  intended_major: string | null;
  high_school_name: string | null;
  onboarding_completed: boolean | null;
  target_universities: string[] | null;
  is_flagged: boolean;
  active_flags: { type: string; reason: string }[] | null;
}

interface SearchResponse {
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
  users: UserSearchResult[] | null;
}

interface UserDetails {
  profile: any;
  role: string;
  onboarding: any;
  school: any;
  teacher_profile: any;
  credits: any;
  subscription: any;
  outcomes: any;
  journey: any;
  last_active_at: string | null;
  recent_activity: any[] | null;
  advisor_sessions: any[] | null;
  readiness_analyses: any[] | null;
  application_entries: any[] | null;
  flags: any[] | null;
  ai_usage: { total_requests: number; total_tokens: number; by_feature: { feature: string; count: number }[] | null };
  feedback: any[] | null;
}

type FlagType = "warning" | "suspension" | "ban";
type ConfirmKind = "ban" | "suspend" | "warn" | "delete" | "reset" | "unflag" | null;
type AdminPlan = "free" | "pro" | "enterprise";

const normalizeAdminPlan = (plan?: string | null): AdminPlan => {
  if (plan === "pro" || plan === "enterprise" || plan === "free") return plan;
  if (plan === "starter" || plan === "growth" || plan === "power") return "pro";
  return "free";
};

const formatPlanName = (plan?: string | null) => {
  const normalized = normalizeAdminPlan(plan);
  return normalized === "pro" ? "Pro" : normalized === "enterprise" ? "Enterprise" : "Free";
};

export function AdminUserManagement() {
  const { toast } = useToast();

  const [searchTerm, setSearchTerm] = useState("");
  const [filterCountry, setFilterCountry] = useState("");
  const [filterGrade, setFilterGrade] = useState("");
  const [filterRole, setFilterRole] = useState("");
  const [filterOnboarded, setFilterOnboarded] = useState("");
  const [sortBy, setSortBy] = useState("created_desc");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResponse | null>(null);

  // Detail dialog
  const [detailUserId, setDetailUserId] = useState<string | null>(null);
  const [detailEmail, setDetailEmail] = useState<string | null>(null);
  const [userDetails, setUserDetails] = useState<UserDetails | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Edit form
  const [editUsername, setEditUsername] = useState("");
  const [editRole, setEditRole] = useState<string>("");
  const [creditDelta, setCreditDelta] = useState("");
  const [creditReason, setCreditReason] = useState("");
  const [planChange, setPlanChange] = useState<string>("");
  const [planBonusCredits, setPlanBonusCredits] = useState<string>("");

  // Flag form
  const [flagReason, setFlagReason] = useState("");
  const [flagNotes, setFlagNotes] = useState("");

  // Confirm dialog
  const [confirmKind, setConfirmKind] = useState<ConfirmKind>(null);
  const [confirmFlagType, setConfirmFlagType] = useState<FlagType>("warning");
  const [actionLoading, setActionLoading] = useState(false);

  const searchUsers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc("admin_search_users", {
        search_term: searchTerm,
        filter_country: filterCountry || null,
        filter_grade: filterGrade || null,
        filter_major: null,
        filter_role: filterRole || null,
        filter_school_id: null,
        filter_onboarded: filterOnboarded || null,
        sort_by: sortBy,
        page_num: page,
        page_size: 20,
      } as any);
      if (error) throw error;
      setSearchResults(data as unknown as SearchResponse);
    } catch (err: any) {
      toast({ title: "Search failed", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const fetchUserDetails = async (userId: string) => {
    setLoadingDetails(true);
    try {
      const { data, error } = await supabase.rpc("admin_get_user_details", { target_user_id: userId });
      if (error) throw error;
      const d = data as unknown as UserDetails;
      setUserDetails(d);
      setEditUsername(d?.profile?.username || "");
      setEditRole(d?.role || "student");
      const normalizedPlan = normalizeAdminPlan(d?.credits?.plan);
      setPlanChange(normalizedPlan);
      setPlanBonusCredits(normalizedPlan === "free" ? "" : String(d?.credits?.bonus_credits ?? 100));
    } catch (err: any) {
      toast({ title: "Failed to load user", description: err.message, variant: "destructive" });
    } finally {
      setLoadingDetails(false);
    }
  };

  const openDetail = (userId: string, email: string | null) => {
    setDetailUserId(userId);
    setDetailEmail(email);
    setUserDetails(null);
    fetchUserDetails(userId);
  };

  const closeDetail = () => {
    setDetailUserId(null);
    setUserDetails(null);
    setCreditDelta("");
    setCreditReason("");
    setPlanChange("");
    setPlanBonusCredits("");
    setFlagReason("");
    setFlagNotes("");
  };

  useEffect(() => {
    searchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, sortBy]);

  const handleSearch = () => {
    setPage(1);
    searchUsers();
  };

  // ─── Action handlers ────────────────────────────────────────
  const runFlag = async (kind: FlagType) => {
    if (!detailUserId) return;
    if (!flagReason.trim()) {
      toast({ title: "Reason required", variant: "destructive" });
      return;
    }
    setActionLoading(true);
    try {
      const { error } = await supabase.rpc("admin_flag_user", {
        _target_user_id: detailUserId,
        _flag_type: kind,
        _reason: flagReason.trim(),
        _expires_at: null,
        _notes: flagNotes.trim() || null,
      } as any);
      if (error) throw error;
      toast({ title: `User ${kind === "ban" ? "banned" : kind === "suspension" ? "suspended" : "warned"}` });
      setFlagReason("");
      setFlagNotes("");
      await fetchUserDetails(detailUserId);
      await searchUsers();
    } catch (err: any) {
      toast({ title: "Action failed", description: err.message, variant: "destructive" });
    } finally {
      setActionLoading(false);
      setConfirmKind(null);
    }
  };

  const runUnflag = async (flagType?: string) => {
    if (!detailUserId) return;
    setActionLoading(true);
    try {
      const { error } = await supabase.rpc("admin_unflag_user", {
        _target_user_id: detailUserId,
        _flag_type: flagType ?? null,
      } as any);
      if (error) throw error;
      toast({ title: "Flag(s) cleared" });
      await fetchUserDetails(detailUserId);
      await searchUsers();
    } catch (err: any) {
      toast({ title: "Failed", description: err.message, variant: "destructive" });
    } finally {
      setActionLoading(false);
      setConfirmKind(null);
    }
  };

  const runDelete = async () => {
    if (!detailUserId) return;
    setActionLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-delete-user", {
        body: { target_user_id: detailUserId },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      toast({
        title: "Account deleted",
        description: (data as any)?.warning ?? "All user data has been removed.",
      });
      closeDetail();
      await searchUsers();
    } catch (err: any) {
      toast({ title: "Delete failed", description: err.message, variant: "destructive" });
    } finally {
      setActionLoading(false);
      setConfirmKind(null);
    }
  };

  const runReset = async () => {
    if (!detailUserId) return;
    setActionLoading(true);
    try {
      const { error } = await supabase.rpc("admin_reset_user_state", {
        _target_user_id: detailUserId,
      } as any);
      if (error) throw error;
      toast({ title: "User state reset" });
      await fetchUserDetails(detailUserId);
    } catch (err: any) {
      toast({ title: "Reset failed", description: err.message, variant: "destructive" });
    } finally {
      setActionLoading(false);
      setConfirmKind(null);
    }
  };

  const runSaveProfile = async () => {
    if (!detailUserId) return;
    setActionLoading(true);
    try {
      const { error } = await supabase.rpc("admin_update_user_profile", {
        _target_user_id: detailUserId,
        _username: editUsername.trim() || null,
        _role: editRole as any,
      } as any);
      if (error) throw error;
      toast({ title: "Profile updated" });
      await fetchUserDetails(detailUserId);
      await searchUsers();
    } catch (err: any) {
      toast({ title: "Save failed", description: err.message, variant: "destructive" });
    } finally {
      setActionLoading(false);
    }
  };

  const runAdjustCredits = async () => {
    if (!detailUserId) return;
    const delta = parseInt(creditDelta, 10);
    if (!Number.isFinite(delta) || delta === 0) {
      toast({ title: "Enter a non-zero amount", variant: "destructive" });
      return;
    }
    setActionLoading(true);
    try {
      const { error } = await supabase.rpc("admin_adjust_credits", {
        _target_user_id: detailUserId,
        _delta: delta,
        _reason: creditReason.trim() || null,
      } as any);
      if (error) throw error;
      toast({ title: `Credits ${delta > 0 ? "added" : "removed"}` });
      setCreditDelta("");
      setCreditReason("");
      await fetchUserDetails(detailUserId);
    } catch (err: any) {
      toast({ title: "Failed", description: err.message, variant: "destructive" });
    } finally {
      setActionLoading(false);
    }
  };

  const runChangePlan = async () => {
    if (!detailUserId || !planChange) return;
    setActionLoading(true);
    try {
      const normalizedPlan = normalizeAdminPlan(planChange);
      const parsedBonus = planBonusCredits.trim() === "" ? (normalizedPlan === "pro" ? 100 : null) : parseInt(planBonusCredits, 10);
      if (parsedBonus !== null && (Number.isNaN(parsedBonus) || parsedBonus < 0)) {
        toast({ title: "Invalid credits", description: "Bonus credits must be a non-negative number.", variant: "destructive" });
        setActionLoading(false);
        return;
      }
      const { error } = await supabase.rpc("admin_set_user_plan" as any, {
        _target_user_id: detailUserId,
        _plan: normalizedPlan,
        _bonus_credits: normalizedPlan === "free" ? null : parsedBonus,
      } as any);
      if (error) throw error;
      toast({ title: `Plan changed to ${formatPlanName(normalizedPlan)}`, description: parsedBonus !== null && normalizedPlan !== "free" ? `Granted ${parsedBonus} credits` : "Paid credits cleared" });
      await fetchUserDetails(detailUserId);
    } catch (err: any) {
      toast({ title: "Plan change failed", description: err.message, variant: "destructive" });
    } finally {
      setActionLoading(false);
    }
  };


  const confirmCopy: Record<Exclude<ConfirmKind, null>, { title: string; desc: string; cta: string }> = {
    ban: {
      title: "Ban this user?",
      desc: "They will be flagged with an active ban. This is the strictest action short of deletion.",
      cta: "Ban user",
    },
    suspend: {
      title: "Suspend this user?",
      desc: "Their account will be flagged as suspended until you lift the flag.",
      cta: "Suspend user",
    },
    warn: {
      title: "Issue a warning?",
      desc: "A warning flag will be added to their record.",
      cta: "Warn user",
    },
    delete: {
      title: "Permanently delete this account?",
      desc: "All profile, onboarding, outcomes, journey, sessions, credits, submissions, and the login itself will be erased. This cannot be undone.",
      cta: "Delete forever",
    },
    reset: {
      title: "Reset this user's state?",
      desc: "Outcomes, readiness, journey, advisor history and submissions will be wiped. Their account stays, but they'll need to onboard again.",
      cta: "Reset state",
    },
    unflag: {
      title: "Clear all active flags?",
      desc: "All warnings, suspensions, and bans on this user will be lifted.",
      cta: "Clear flags",
    },
  };

  const runConfirmed = () => {
    if (!confirmKind) return;
    if (confirmKind === "ban") return runFlag("ban");
    if (confirmKind === "suspend") return runFlag("suspension");
    if (confirmKind === "warn") return runFlag("warning");
    if (confirmKind === "delete") return runDelete();
    if (confirmKind === "reset") return runReset();
    if (confirmKind === "unflag") return runUnflag();
  };

  const roleBadgeVariant = (role: string) =>
    role === "admin" ? "destructive" : role === "counsellor" ? "default" : "secondary";

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">User Management</h2>
        <p className="text-muted-foreground">
          Search, inspect, moderate, and manage every user on the platform.
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6 space-y-3">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by email, username, or school..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              />
            </div>
            <Button onClick={handleSearch} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Search"}
            </Button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <Select value={filterRole || "all"} onValueChange={(v) => setFilterRole(v === "all" ? "" : v)}>
              <SelectTrigger><SelectValue placeholder="Role" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="student">Student</SelectItem>
                <SelectItem value="counsellor">Counsellor</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
            <CountryCombobox
              value={filterCountry}
              onChange={(v) => setFilterCountry(v)}
              placeholder="All Countries"
            />
            <Select value={filterGrade || "all"} onValueChange={(v) => setFilterGrade(v === "all" ? "" : v)}>
              <SelectTrigger><SelectValue placeholder="Grade" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Grades</SelectItem>
                <SelectItem value="9th Grade">9th Grade</SelectItem>
                <SelectItem value="10th Grade">10th Grade</SelectItem>
                <SelectItem value="11th Grade">11th Grade</SelectItem>
                <SelectItem value="12th Grade">12th Grade</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterOnboarded || "all"} onValueChange={(v) => setFilterOnboarded(v === "all" ? "" : v)}>
              <SelectTrigger><SelectValue placeholder="Onboarded" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="yes">Onboarded</SelectItem>
                <SelectItem value="no">Pending</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger><SelectValue placeholder="Sort" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="created_desc">Newest first</SelectItem>
                <SelectItem value="created_asc">Oldest first</SelectItem>
                <SelectItem value="ai_desc">Most AI usage</SelectItem>
                <SelectItem value="email_asc">Email A→Z</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      <Card>
        <CardHeader>
          <CardTitle>Users</CardTitle>
          <CardDescription>
            {searchResults ? `${searchResults.total} users found` : "Loading..."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-accent" />
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Grade</TableHead>
                    <TableHead>Country</TableHead>
                    <TableHead>Major</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {searchResults?.users?.length ? searchResults.users.map((user) => (
                    <TableRow key={user.user_id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {user.is_flagged && <Flag className="h-4 w-4 text-destructive" />}
                          <div>
                            <div className="font-medium">{user.email || "N/A"}</div>
                            {user.username && (
                              <div className="text-xs text-muted-foreground">@{user.username}</div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{user.grade || "-"}</TableCell>
                      <TableCell>{user.country || "-"}</TableCell>
                      <TableCell className="max-w-32 truncate">{user.intended_major || "-"}</TableCell>
                      <TableCell>
                        <Badge variant={user.onboarding_completed ? "default" : "secondary"}>
                          {user.onboarding_completed ? "Active" : "Pending"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => openDetail(user.user_id, user.email)}>
                              <Eye className="h-4 w-4 mr-2" /> View details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openDetail(user.user_id, user.email)}>
                              <Pencil className="h-4 w-4 mr-2" /> Edit user
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openDetail(user.user_id, user.email)}>
                              <Coins className="h-4 w-4 mr-2" /> Adjust credits
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => { setDetailUserId(user.user_id); setDetailEmail(user.email); fetchUserDetails(user.user_id); setTimeout(() => setConfirmKind("suspend"), 100); }}
                            >
                              <Ban className="h-4 w-4 mr-2" /> Suspend user
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={() => { setDetailUserId(user.user_id); setDetailEmail(user.email); fetchUserDetails(user.user_id); setTimeout(() => setConfirmKind("ban"), 100); }}
                            >
                              <Ban className="h-4 w-4 mr-2" /> Ban user
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={() => { setDetailUserId(user.user_id); setDetailEmail(user.email); fetchUserDetails(user.user_id); setTimeout(() => setConfirmKind("delete"), 100); }}
                            >
                              <Trash2 className="h-4 w-4 mr-2" /> Delete account
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  )) : (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                        No users found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>

              {searchResults && searchResults.total_pages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <p className="text-sm text-muted-foreground">
                    Page {searchResults.page} of {searchResults.total_pages}
                  </p>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}>
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm"
                      onClick={() => setPage((p) => Math.min(searchResults.total_pages, p + 1))}
                      disabled={page === searchResults.total_pages}>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={!!detailUserId} onOpenChange={(o) => !o && closeDetail()}>
        <DialogContent className="max-w-[81rem] max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              User Details
            </DialogTitle>
            <DialogDescription>{detailEmail}</DialogDescription>
          </DialogHeader>

          {loadingDetails || !userDetails ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-accent" />
            </div>
          ) : (
            <Tabs defaultValue="overview">
              <TabsList className="grid grid-cols-4 w-full">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="academics">Academics</TabsTrigger>
                <TabsTrigger value="activity">Activity</TabsTrigger>
                <TabsTrigger value="actions">Actions</TabsTrigger>
              </TabsList>

              {/* OVERVIEW */}
              <TabsContent value="overview" className="space-y-4 mt-4">
                {/* Identity card */}
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">Identity</CardTitle>
                      <Badge variant={roleBadgeVariant(userDetails.role)}>
                        {userDetails.role}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <Row label="Email" value={userDetails.profile?.email || detailEmail} />
                      <Row label="Username" value={userDetails.profile?.username || "Not set"} />
                      <Row label="Joined"
                        value={userDetails.profile?.created_at
                          ? format(new Date(userDetails.profile.created_at), "MMM d, yyyy")
                          : "-"} />
                      <Row label="Last active"
                        value={userDetails.last_active_at
                          ? `${formatDistanceToNow(new Date(userDetails.last_active_at))} ago`
                          : "Never"} />
                      <Row label="School"
                        value={userDetails.school?.name || userDetails.onboarding?.high_school_name || "-"} />
                      <Row label="Country" value={userDetails.onboarding?.country || "-"} />
                      <Row label="Grade" value={userDetails.onboarding?.grade || "-"} />
                      <Row label="Major" value={userDetails.onboarding?.intended_major || "-"} />
                    </div>
                  </CardContent>
                </Card>

                {/* Credits + subscription */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Coins className="h-4 w-4" /> Credits & Plan
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <Row label="Plan" value={formatPlanName(userDetails.credits?.plan)} />
                      <Row label="Used today"
                        value={`${userDetails.credits?.credits_used_today ?? 0} / ${userDetails.credits?.max_daily_credits ?? 5}`} />
                      <Row label="Bonus credits" value={String(userDetails.credits?.bonus_credits ?? 0)} />
                      <Row label="Subscription"
                        value={userDetails.subscription?.status
                          ? `${userDetails.subscription.status} (${userDetails.subscription.environment})`
                          : "None"} />
                    </div>
                  </CardContent>
                </Card>

                {/* Active flags */}
                {userDetails.flags && userDetails.flags.filter((f: any) => f.is_active).length > 0 && (
                  <Card className="border-destructive/40">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base text-destructive flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4" /> Active Flags
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {userDetails.flags.filter((f: any) => f.is_active).map((f: any) => (
                        <div key={f.id} className="p-3 rounded-md border border-destructive/30 bg-destructive/5">
                          <div className="flex items-center justify-between">
                            <Badge variant="destructive">{f.flag_type}</Badge>
                            <Button size="sm" variant="ghost"
                              onClick={() => runUnflag(f.flag_type)}
                              disabled={actionLoading}>
                              Lift
                            </Button>
                          </div>
                          <p className="text-sm mt-1">{f.reason}</p>
                          {f.notes && <p className="text-xs text-muted-foreground mt-1">{f.notes}</p>}
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* ACADEMICS */}
              <TabsContent value="academics" className="space-y-4 mt-4">
                <Card>
                  <CardHeader className="pb-3"><CardTitle className="text-base">Onboarding</CardTitle></CardHeader>
                  <CardContent>
                    {userDetails.onboarding ? (
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <Row label="Curriculum" value={userDetails.onboarding.curriculum} />
                        <Row label="GPA" value={userDetails.onboarding.gpa || userDetails.onboarding.gpa_range || "-"} />
                        <Row label="Application year" value={userDetails.onboarding.application_year} />
                        <Row label="Test type" value={userDetails.onboarding.standardized_test_type || "-"} />
                        <Row label="Test score" value={userDetails.onboarding.standardized_test_score || "-"} />
                        <Row label="Onboarded" value={userDetails.onboarding.onboarding_completed ? "Yes" : "No"} />
                      </div>
                    ) : <p className="text-sm text-muted-foreground">No onboarding data.</p>}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3"><CardTitle className="text-base">Journey progress</CardTitle></CardHeader>
                  <CardContent>
                    {userDetails.journey ? (
                      <div className="grid grid-cols-3 gap-3 text-sm">
                        <Row label="Overall" value={String(userDetails.journey.overall_score)} />
                        <Row label="Academics" value={String(userDetails.journey.academics_score)} />
                        <Row label="Activities" value={String(userDetails.journey.activities_score)} />
                        <Row label="Competitions" value={String(userDetails.journey.competitions_score)} />
                        <Row label="Leadership" value={String(userDetails.journey.leadership_score)} />
                        <Row label="Test prep" value={String(userDetails.journey.test_prep_score)} />
                      </div>
                    ) : <p className="text-sm text-muted-foreground">Journey not started.</p>}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3"><CardTitle className="text-base">Outcomes & submissions</CardTitle></CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <Row label="Courses logged" value={String(userDetails.outcomes?.courses?.length || 0)} />
                      <Row label="Competitions logged" value={String(userDetails.outcomes?.competitions?.length || 0)} />
                      <Row label="Projects" value={String(userDetails.outcomes?.projects?.length || 0)} />
                      <Row label="Leadership roles" value={String(userDetails.outcomes?.leadership_roles?.length || 0)} />
                      <Row label="Readiness analyses" value={String(userDetails.readiness_analyses?.length || 0)} />
                      <Row label="Application entries" value={String(userDetails.application_entries?.length || 0)} />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* ACTIVITY */}
              <TabsContent value="activity" className="space-y-4 mt-4">
                <Card>
                  <CardHeader className="pb-3"><CardTitle className="text-base">AI usage</CardTitle></CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <Row label="Total requests" value={String(userDetails.ai_usage?.total_requests || 0)} />
                      <Row label="Total tokens" value={String(userDetails.ai_usage?.total_tokens || 0)} />
                    </div>
                    {userDetails.ai_usage?.by_feature?.length ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {userDetails.ai_usage.by_feature.map((f) => (
                          <Badge key={f.feature} variant="outline">
                            {f.feature}: {f.count}
                          </Badge>
                        ))}
                      </div>
                    ) : null}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3"><CardTitle className="text-base">Recent activity</CardTitle></CardHeader>
                  <CardContent>
                    {userDetails.recent_activity?.length ? (
                      <ul className="space-y-2 text-sm">
                        {userDetails.recent_activity.map((r, i) => (
                          <li key={i} className="flex justify-between gap-3 border-b border-border last:border-0 pb-2 last:pb-0">
                            <div>
                              <span className="font-medium">{r.action_type}</span>
                              {r.page_path && <span className="text-muted-foreground ml-2">{r.page_path}</span>}
                            </div>
                            <span className="text-muted-foreground">
                              {formatDistanceToNow(new Date(r.created_at))} ago
                            </span>
                          </li>
                        ))}
                      </ul>
                    ) : <p className="text-sm text-muted-foreground">No recorded activity.</p>}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* ACTIONS */}
              <TabsContent value="actions" className="space-y-4 mt-4">
                {/* Edit profile */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4" /> Edit profile
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>Username</Label>
                        <Input value={editUsername} onChange={(e) => setEditUsername(e.target.value)} />
                      </div>
                      <div>
                        <Label>Role</Label>
                        <Select value={editRole} onValueChange={setEditRole}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="user">Student (user)</SelectItem>
                            <SelectItem value="teacher">Counsellor (teacher)</SelectItem>
                            <SelectItem value="moderator">Moderator</SelectItem>
                            <SelectItem value="admin">Admin</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <Button onClick={runSaveProfile} disabled={actionLoading} size="sm">
                      <Save className="h-4 w-4 mr-2" /> Save
                    </Button>
                  </CardContent>
                </Card>

                {/* Plan change */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4" /> Change plan
                    </CardTitle>
                    <CardDescription>
                      Assign Free, Pro, or Enterprise. Pro credits are configurable, so enter the exact credit pack to grant (for example 100 credits, 200 credits, or more). Free clears paid credits.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>Plan</Label>
                        <Select value={planChange} onValueChange={setPlanChange}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="free">Free</SelectItem>
                            <SelectItem value="pro">Pro</SelectItem>
                            <SelectItem value="enterprise">Enterprise</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>{planChange === "enterprise" ? "Enterprise credits" : "Pro credits"}</Label>
                        <Input
                          type="number"
                          min={0}
                          step={100}
                          placeholder={planChange === "free" ? "N/A" : planChange === "enterprise" ? "e.g. 10000" : "e.g. 100, 200, 500"}
                          value={planBonusCredits}
                          onChange={(e) => setPlanBonusCredits(e.target.value)}
                          disabled={planChange === "free"}
                        />
                      </div>
                    </div>
                    <Button
                      onClick={runChangePlan}
                      disabled={actionLoading || !planChange}
                      size="sm"
                    >
                      Apply plan
                    </Button>
                    <p className="text-xs text-muted-foreground">
                      Current: <span className="font-medium">{formatPlanName(userDetails.credits?.plan)}</span> · Paid credits: {userDetails.credits?.bonus_credits ?? 0}
                    </p>
                  </CardContent>
                </Card>

                {/* Credit adjust */}

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Coins className="h-4 w-4" /> Adjust bonus credits
                    </CardTitle>
                    <CardDescription>
                      Use a positive number to grant credits, negative to remove. Affects bonus pool only.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>Amount (delta)</Label>
                        <Input type="number" placeholder="e.g. 50 or -10"
                          value={creditDelta}
                          onChange={(e) => setCreditDelta(e.target.value)} />
                      </div>
                      <div>
                        <Label>Reason (optional)</Label>
                        <Input value={creditReason} onChange={(e) => setCreditReason(e.target.value)} />
                      </div>
                    </div>
                    <Button onClick={runAdjustCredits} disabled={actionLoading} size="sm">
                      Apply
                    </Button>
                  </CardContent>
                </Card>

                {/* Moderation */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Flag className="h-4 w-4" /> Moderation
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <Label>Reason (required for warn / suspend / ban)</Label>
                      <Input value={flagReason} onChange={(e) => setFlagReason(e.target.value)}
                        placeholder="e.g. Repeated TOS violations" />
                    </div>
                    <div>
                      <Label>Internal notes (optional)</Label>
                      <Textarea value={flagNotes} onChange={(e) => setFlagNotes(e.target.value)} rows={2} />
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" variant="outline"
                        onClick={() => setConfirmKind("warn")} disabled={actionLoading}>
                        <AlertTriangle className="h-4 w-4 mr-2" /> Warn
                      </Button>
                      <Button size="sm" variant="secondary"
                        onClick={() => setConfirmKind("suspend")} disabled={actionLoading}>
                        <Ban className="h-4 w-4 mr-2" /> Suspend
                      </Button>
                      <Button size="sm" variant="destructive"
                        onClick={() => setConfirmKind("ban")} disabled={actionLoading}>
                        <Ban className="h-4 w-4 mr-2" /> Ban
                      </Button>
                      <Button size="sm" variant="ghost"
                        onClick={() => setConfirmKind("unflag")} disabled={actionLoading}>
                        Clear all flags
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Danger zone */}
                <Card className="border-destructive/40">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base text-destructive">Danger zone</CardTitle>
                  </CardHeader>
                  <CardContent className="flex flex-wrap gap-2">
                    <Button size="sm" variant="outline"
                      onClick={() => setConfirmKind("reset")} disabled={actionLoading}>
                      <RotateCcw className="h-4 w-4 mr-2" /> Reset state
                    </Button>
                    <Button size="sm" variant="destructive"
                      onClick={() => setConfirmKind("delete")} disabled={actionLoading}>
                      <Trash2 className="h-4 w-4 mr-2" /> Delete account
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>

      {/* Confirmation */}
      <AlertDialog open={!!confirmKind} onOpenChange={(o) => !o && setConfirmKind(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmKind && confirmCopy[confirmKind].title}</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmKind && confirmCopy[confirmKind].desc}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={runConfirmed}
              disabled={actionLoading}
              className={confirmKind === "delete" || confirmKind === "ban"
                ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                : undefined}>
              {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : (confirmKind && confirmCopy[confirmKind].cta)}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="font-medium truncate">{value || "-"}</div>
    </div>
  );
}
