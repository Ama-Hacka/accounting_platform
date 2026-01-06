"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";

export default function AdminClientsPage() {
  const [clients, setClients] = useState<any[]>([]);
  const [query, setQuery] = useState("");
  const [filterType, setFilterType] = useState<"all" | "W2" | "1099" | "1040">("all");
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState<"all" | number>(currentYear);
  const years = Array.from({ length: 8 }, (_, i) => currentYear - i);
  const [returnsByClient, setReturnsByClient] = useState<Record<string, any[]>>({});
  const [docsByClient, setDocsByClient] = useState<Record<string, any[]>>({});

  useEffect(() => {
    load();
  }, [query, year, filterType]);

  async function load() {
    const { data: clientsData } = await supabase
      .from("profiles")
      .select("id, first_name, last_name, role, phone_number, updated_at")
      .eq("role", "client");
    const list = (clientsData || []).filter((c: any) => {
      if (!query) return true;
      const q = query.toLowerCase();
      const name = `${c.first_name || ""} ${c.last_name || ""}`.toLowerCase();
      const phone = (c.phone_number || "").toLowerCase();
      return name.includes(q) || phone.includes(q) || (c.id || "").includes(q);
    });
    setClients(list);
    const ids = list.map((c: any) => c.id);
    if (ids.length) {
      let trQuery = supabase.from("tax_returns").select("*").in("user_id", ids);
      if (year !== "all") trQuery = trQuery.eq("year", year);
      const { data: trData } = await trQuery;
      const byClient: Record<string, any[]> = {};
      (trData || []).forEach((r) => {
        byClient[r.user_id] = byClient[r.user_id] || [];
        byClient[r.user_id].push(r);
      });
      setReturnsByClient(byClient);
      let docQuery = supabase.from("user_documents").select("*").in("user_id", ids);
      if (year !== "all") docQuery = docQuery.eq("year", year);
      const { data: docData } = await docQuery;
      const docsClient: Record<string, any[]> = {};
      (docData || []).forEach((d) => {
        docsClient[d.user_id] = docsClient[d.user_id] || [];
        docsClient[d.user_id].push(d);
      });
      setDocsByClient(docsClient);
    } else {
      setReturnsByClient({});
      setDocsByClient({});
    }
  }

  function initials(c: any) {
    const f = (c.first_name || "").trim();
    const l = (c.last_name || "").trim();
    return `${f.slice(0, 1)}${l.slice(0, 1)}`.toUpperCase() || "CL";
  }

  function lastActiveText(c: any) {
    const list = returnsByClient[c.id] || [];
    const latest = list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
    const dt = new Date(latest?.created_at || c.updated_at || Date.now());
    const diff = Date.now() - dt.getTime();
    const d = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (d <= 0) return "Today";
    if (d === 1) return "1 day ago";
    return `${d} days ago`;
  }

  function status(c: any) {
    const list = returnsByClient[c.id] || [];
    const latest = list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
    return latest?.status || "Needs Review";
  }

  function docBadges(c: any) {
    const list = docsByClient[c.id] || [];
    const types = Array.from(new Set(list.map((d) => d.doctype)));
    return types;
  }

  function docBadgeColor(t: string) {
    const key = (t || "").toUpperCase();
    if (key.includes("W2")) return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300";
    if (key.includes("1099")) return "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300";
    if (key.includes("1040")) return "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300";
    return "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200";
  }

  function statusDotColor(s: string) {
    const key = (s || "").toLowerCase();
    if (key === "filed") return "bg-green-500";
    if (key === "pending") return "bg-yellow-500";
    return "bg-orange-500";
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Client Directory</h1>
          <p className="text-sm text-zinc-500">Manage client profiles, tax documents, and statuses.</p>
        </div>
        <Link href="/admin/clients/new" className="rounded-lg bg-pink-600 px-4 py-2 text-sm font-semibold text-white">
          Add New Client
        </Link>
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-zinc-900">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex-1">
            <div className="relative">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by client name, email, or ID..."
                className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm focus:border-pink-500 focus:ring-pink-500 dark:border-white/15 dark:bg-zinc-800"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-500">Filter by:</span>
            <button
              onClick={() => setFilterType("all")}
              className={`rounded-full px-3 py-1 text-xs ${filterType === "all" ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900" : "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"}`}
            >
              All Docs
            </button>
            <button
              onClick={() => setFilterType("W2")}
              className={`rounded-full px-3 py-1 text-xs ${filterType === "W2" ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900" : "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"}`}
            >
              W2
            </button>
            <button
              onClick={() => setFilterType("1099")}
              className={`rounded-full px-3 py-1 text-xs ${filterType === "1099" ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900" : "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"}`}
            >
              1099
            </button>
            <button
              onClick={() => setFilterType("1040")}
              className={`rounded-full px-3 py-1 text-xs ${filterType === "1040" ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900" : "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"}`}
            >
              1040
            </button>
            <select
              value={year}
              onChange={(e) => setYear(e.target.value === "all" ? "all" : Number(e.target.value))}
              className="rounded-lg border border-zinc-200 bg-white px-2 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-800"
            >
              <option value="all">All Years</option>
              {years.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-white/10 dark:bg-zinc-900">
        <div className="grid grid-cols-12 gap-4 border-b border-zinc-200 px-6 py-3 text-xs font-medium text-zinc-500 dark:border-white/10">
          <div className="col-span-3">Client Name</div>
          <div className="col-span-3">Entity</div>
          <div className="col-span-2">Contact Info</div>
          <div className="col-span-2">Last Active</div>
          <div className="col-span-1">Docs</div>
          <div className="col-span-1">Status</div>
        </div>
        <ul>
          {clients
            .filter((c) => {
              if (filterType === "all") return true;
              const docs = docsByClient[c.id] || [];
              const returns = returnsByClient[c.id] || [];
              const matchDocs = docs.some((d) => (d.title || "").toUpperCase().includes(filterType) || (d.doctype || "").toUpperCase().includes(filterType));
              const matchReturns = returns.some((r) => (r.form_type || "").toUpperCase() === filterType);
              return matchDocs || matchReturns;
            })
            .map((c) => (
            <li key={c.id} className="grid grid-cols-12 items-center gap-4 border-t border-zinc-100 px-6 py-4 dark:border-zinc-800">
              <div className="col-span-3 flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-100 text-xs font-semibold text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
                  {initials(c)}
                </div>
                <div>
                  <div className="text-sm font-semibold text-zinc-900 dark:text-white">
                    {c.first_name} {c.last_name}
                  </div>
                  <div className="text-xs text-zinc-500">{c.id}</div>
                </div>
              </div>
              <div className="col-span-3">
                <div className="text-sm text-zinc-700 dark:text-zinc-300">{c.entity || "—"}</div>
              </div>
              <div className="col-span-2">
                <div className="text-sm text-zinc-700 dark:text-zinc-300">
                  {c.email || "—"}
                </div>
                <div className="text-xs text-zinc-500">{c.phone_number || ""}</div>
              </div>
              <div className="col-span-2">
                <div className="text-sm text-zinc-700 dark:text-zinc-300">{lastActiveText(c)}</div>
              </div>
              <div className="col-span-1 flex items-center gap-2">
                {(() => {
                  const badges = docBadges(c);
                  const firstTwo = badges.slice(0, 2);
                  const extra = Math.max(0, badges.length - firstTwo.length);
                  return (
                    <>
                      {firstTwo.map((t) => (
                        <span key={t} className={`rounded-full px-2 py-0.5 text-xs ${docBadgeColor(t)}`}>
                          {t}
                        </span>
                      ))}
                      {extra > 0 && (
                        <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
                          +{extra}
                        </span>
                      )}
                    </>
                  );
                })()}
              </div>
              <div className="col-span-1 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`h-2 w-2 rounded-full ${statusDotColor(status(c))}`} />
                  <span className="text-sm text-zinc-700 dark:text-zinc-300 capitalize">{status(c)}</span>
                </div>
                <Link href={`/admin/clients/${c.id}`} className="rounded bg-zinc-100 px-2 py-1 text-xs text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700">
                  Open
                </Link>
              </div>
            </li>
          ))}
        </ul>
        <div className="flex items-center justify-between border-t border-zinc-100 px-6 py-3 text-xs text-zinc-500 dark:border-zinc-800">
          <div>Showing {Math.min(clients.length, 5)} of {clients.length} results</div>
          <div className="flex items-center gap-1">
            <button className="rounded bg-zinc-100 px-2 py-1">‹</button>
            <button className="rounded bg-blue-600 px-2 py-1 text-white">1</button>
            <button className="rounded bg-zinc-100 px-2 py-1">2</button>
            <button className="rounded bg-zinc-100 px-2 py-1">3</button>
            <button className="rounded bg-zinc-100 px-2 py-1">…</button>
            <button className="rounded bg-zinc-100 px-2 py-1">›</button>
          </div>
        </div>
      </div>
    </div>
  );
}
