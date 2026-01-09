"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { Search, Trash2, UserPlus } from "lucide-react";

type Member = {
  id: string;
  name: string;
  email: string;
  role: "owner" | "admin" | "staff" | string;
  status: "active" | "invited" | "inactive" | string;
  invitedAt?: string | null;
  createdAt?: string | null;
};

function initialsFromName(name: string) {
  const parts = (name || "").trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] || "";
  const last = parts.length > 1 ? parts[parts.length - 1]?.[0] : "";
  const out = `${first}${last}`.toUpperCase();
  return out || "MB";
}

function roleBadge(role: string) {
  const r = (role || "").toLowerCase();
  if (r === "owner") return "bg-primary/15 text-primary";
  if (r === "admin") return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300";
  if (r === "staff") return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300";
  return "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200";
}

function statusDot(status: string) {
  const s = (status || "").toLowerCase();
  if (s === "active") return "bg-green-500";
  if (s === "invited") return "bg-yellow-500";
  return "bg-zinc-400";
}

export default function AdminMembersPage() {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  const [currentRole, setCurrentRole] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState<Member[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | "owner" | "admin" | "staff">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "invited" | "inactive">("all");

  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"staff" | "admin">("staff");
  const [inviting, setInviting] = useState(false);
  const [inviteMessage, setInviteMessage] = useState<string | null>(null);
  const [inviteVariant, setInviteVariant] = useState<"success" | "error">("success");

  const canRemove = currentRole === "owner";

  useEffect(() => {
    let cancelled = false;
    async function gate() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace("/auth/signin");
        return;
      }

      const isFirmEmail = (user.email || "").toLowerCase().endsWith("@icmultiservices.com");
      if (!isFirmEmail) {
        router.replace("/");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      const role = profile?.role || null;
      if (!role || !["owner", "admin"].includes(role)) {
        router.replace("/admin");
        return;
      }

      if (!cancelled) {
        setCurrentRole(role);
        setAuthorized(true);
      }
    }
    gate();
    return () => {
      cancelled = true;
    };
  }, [router]);

  async function loadMembers() {
    setLoading(true);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error("Not authenticated");

      const res = await fetch("/api/admin/members", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Failed to load members");

      setMembers((json?.members || []) as Member[]);
    } catch (e: any) {
      setMembers([]);
      setError(e?.message || "Failed to load members");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!authorized) return;
    loadMembers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authorized]);

  const filteredMembers = useMemo(() => {
    const q = query.trim().toLowerCase();
    return members
      .filter((m) => {
        if (roleFilter !== "all" && (m.role || "").toLowerCase() !== roleFilter) return false;
        if (statusFilter !== "all" && (m.status || "").toLowerCase() !== statusFilter) return false;
        if (!q) return true;
        return (
          (m.name || "").toLowerCase().includes(q) ||
          (m.email || "").toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        const ra = (a.role || "").toLowerCase();
        const rb = (b.role || "").toLowerCase();
        const order = (r: string) => (r === "owner" ? 0 : r === "admin" ? 1 : 2);
        return order(ra) - order(rb);
      });
  }, [members, query, roleFilter, statusFilter]);

  async function inviteMember() {
    setInviteMessage(null);
    setInviting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error("Not authenticated");

      const res = await fetch("/api/admin/invite-member", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Failed to invite member");

      setInviteVariant("success");
      setInviteMessage("Invite sent successfully.");
      setInviteEmail("");
      setInviteRole("staff");
      setInviteOpen(false);
      await loadMembers();
    } catch (e: any) {
      setInviteVariant("error");
      setInviteMessage(e?.message || "Failed to invite member");
    } finally {
      setInviting(false);
    }
  }

  async function removeMember(memberId: string) {
    if (!canRemove) return;
    const ok = window.confirm("Remove this member's access? This cannot be undone.");
    if (!ok) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error("Not authenticated");

      const res = await fetch("/api/admin/remove-member", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ memberId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Failed to remove member");

      await loadMembers();
    } catch (e: any) {
      alert(e?.message || "Failed to remove member");
    }
  }

  if (!authorized) return null;

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Member Management</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Invite team members and manage access to the admin panel.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setInviteMessage(null);
            setInviteOpen((v) => !v);
          }}
          className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
        >
          <UserPlus className="h-4 w-4" />
          Add New Member
        </button>
      </section>

      {inviteOpen && (
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-zinc-900">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-12 md:items-end">
            <div className="md:col-span-7">
              <label className="text-xs font-medium text-zinc-600 dark:text-zinc-300">Email</label>
              <input
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="name@icmultiservices.com"
                className="mt-1 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm focus:border-red-500 focus:ring-red-500 dark:border-white/15 dark:bg-zinc-800"
              />
            </div>
            <div className="md:col-span-3">
              <label className="text-xs font-medium text-zinc-600 dark:text-zinc-300">Role</label>
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as any)}
                className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm dark:border-white/15 dark:bg-zinc-800"
              >
                <option value="staff">Staff</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <button
                type="button"
                onClick={inviteMember}
                disabled={inviting || !inviteEmail.trim()}
                className="w-full rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100"
              >
                {inviting ? "Sending…" : "Send Invite"}
              </button>
            </div>
          </div>
          {inviteMessage && (
            <p
              className={
                "mt-3 text-sm " +
                (inviteVariant === "success" ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400")
              }
            >
              {inviteMessage}
            </p>
          )}
          <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
            Invited members receive an email to set their password.
          </p>
        </div>
      )}

      <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-zinc-900">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search members by name or email…"
              className="w-full rounded-xl border border-zinc-200 bg-zinc-50 py-2.5 pl-9 pr-3 text-sm focus:border-red-500 focus:ring-red-500 dark:border-white/15 dark:bg-zinc-800"
            />
          </div>

          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as any)}
            className="rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm dark:border-white/15 dark:bg-zinc-800"
          >
            <option value="all">Role: All</option>
            <option value="owner">Role: Owner</option>
            <option value="admin">Role: Admin</option>
            <option value="staff">Role: Staff</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm dark:border-white/15 dark:bg-zinc-800"
          >
            <option value="all">Status: All</option>
            <option value="active">Status: Active</option>
            <option value="invited">Status: Invited</option>
            <option value="inactive">Status: Inactive</option>
          </select>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-white/10 dark:bg-zinc-900">
        <div className="grid grid-cols-12 gap-4 border-b border-zinc-200 px-6 py-3 text-xs font-medium text-zinc-500 dark:border-white/10">
          <div className="col-span-4">NAME</div>
          <div className="col-span-4">EMAIL</div>
          <div className="col-span-2">ROLE</div>
          <div className="col-span-1">STATUS</div>
          <div className="col-span-1 text-right">ACTIONS</div>
        </div>

        {error && (
          <div className="px-6 py-4 text-sm text-red-600 dark:text-red-400">{error}</div>
        )}

        {!error && loading && (
          <div className="px-6 py-4 text-sm text-zinc-500 dark:text-zinc-400">Loading members…</div>
        )}

        {!error && !loading && filteredMembers.length === 0 && (
          <div className="px-6 py-4 text-sm text-zinc-500 dark:text-zinc-400">No members found.</div>
        )}

        <ul>
          {filteredMembers.map((m) => (
            <li
              key={m.id}
              className="grid grid-cols-12 items-center gap-4 border-t border-zinc-100 px-6 py-4 dark:border-zinc-800"
            >
              <div className="col-span-4 flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-100 text-xs font-semibold text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
                  {initialsFromName(m.name)}
                </div>
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-zinc-900 dark:text-white">{m.name}</div>
                  <div className="truncate text-xs text-zinc-500">{m.id}</div>
                </div>
              </div>

              <div className="col-span-4 truncate text-sm text-zinc-700 dark:text-zinc-300">{m.email}</div>

              <div className="col-span-2">
                <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${roleBadge(m.role)}`}>
                  {(m.role || "").charAt(0).toUpperCase() + (m.role || "").slice(1)}
                </span>
              </div>

              <div className="col-span-1">
                <div className="flex items-center gap-2">
                  <span className={`h-2 w-2 rounded-full ${statusDot(m.status)}`} />
                  <span className="text-xs font-semibold uppercase text-zinc-600 dark:text-zinc-300">
                    {m.status}
                  </span>
                </div>
              </div>

              <div className="col-span-1 flex justify-end">
                {canRemove && (m.role || "").toLowerCase() !== "owner" ? (
                  <button
                    type="button"
                    onClick={() => removeMember(m.id)}
                    className="rounded-lg border border-zinc-200 bg-white p-2 text-zinc-600 hover:bg-zinc-50 dark:border-white/10 dark:bg-zinc-950 dark:text-zinc-200 dark:hover:bg-zinc-900"
                    aria-label="Remove member"
                    title="Remove access"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                ) : (
                  <span className="text-xs text-zinc-400">—</span>
                )}
              </div>
            </li>
          ))}
        </ul>

        <div className="flex items-center justify-between border-t border-zinc-100 px-6 py-3 text-xs text-zinc-500 dark:border-zinc-800">
          <div>
            Showing {filteredMembers.length} of {members.length} members
          </div>
          <button
            type="button"
            onClick={loadMembers}
            className="rounded-lg bg-zinc-100 px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
          >
            Refresh
          </button>
        </div>
      </div>
    </div>
  );
}
