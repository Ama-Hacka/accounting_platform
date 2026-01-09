"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";

export default function AdminHomePage() {
  const currentYear = new Date().getFullYear();
  const taxYear = currentYear - 1;
  const quarter = Math.floor(new Date().getMonth() / 3) + 1;
  const periodLabel = `FY ${currentYear}-Q${quarter}`;

  type Activity = {
    id: string;
    user_id: string;
    doctype: string;
    title: string;
    created_at: string;
  };

  const [loading, setLoading] = useState(true);
  const [totalClients, setTotalClients] = useState(0);
  const [pendingSignature, setPendingSignature] = useState(0);
  const [signedEngagement, setSignedEngagement] = useState(0);
  const [questionnaireCompleted, setQuestionnaireCompleted] = useState(0);
  const [docsUploaded, setDocsUploaded] = useState(0);
  const [completedAllThree, setCompletedAllThree] = useState(0);
  const [inProgress, setInProgress] = useState(0);
  const [filedClients, setFiledClients] = useState(0);
  const [recentActivity, setRecentActivity] = useState<Array<Activity & { name: string }>>([]);

  function displayNameFromProfile(p: any) {
    const name = `${p?.first_name || ""} ${p?.last_name || ""}`.trim();
    return name || p?.email || "Client";
  }

  function timeAgo(iso: string) {
    const dt = new Date(iso);
    const diffMs = Date.now() - dt.getTime();
    const minutes = Math.floor(diffMs / (1000 * 60));
    if (minutes < 1) return "just now";
    if (minutes === 1) return "1 minute ago";
    if (minutes < 60) return `${minutes} minutes ago`;
    const hours = Math.floor(minutes / 60);
    if (hours === 1) return "1 hour ago";
    if (hours < 24) return `${hours} hours ago`;
    const days = Math.floor(hours / 24);
    if (days === 1) return "1 day ago";
    return `${days} days ago`;
  }

  function activityText(doctype: string) {
    if (doctype === "Engagement Letter") return "signed Engagement Letter";
    if (doctype === "Tax Questionnaire") return "submitted Tax Questionnaire";
    return `uploaded ${doctype || "document"}`;
  }

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const { data: clientRows, error: clientErr } = await supabase
          .from("profiles")
          .select("id")
          .eq("role", "client");

        if (clientErr) throw clientErr;

        const clientIds = (clientRows || []).map((r: any) => r.id);
        const clientIdSet = new Set<string>(clientIds);
        const total = clientIds.length;

        const [engRes, qRes, otherDocsRes, trRes, activityRes] = await Promise.all([
          supabase
            .from("user_documents")
            .select("user_id")
            .eq("year", taxYear)
            .eq("doctype", "Engagement Letter"),
          supabase
            .from("user_documents")
            .select("user_id")
            .eq("year", taxYear)
            .eq("doctype", "Tax Questionnaire"),
          supabase
            .from("user_documents")
            .select("user_id")
            .eq("year", taxYear)
            .not("doctype", "in", '("Engagement Letter","Tax Questionnaire")'),
          supabase
            .from("tax_returns")
            .select("user_id")
            .eq("year", taxYear),
          supabase
            .from("user_documents")
            .select("id, user_id, doctype, title, created_at")
            .eq("year", taxYear)
            .order("created_at", { ascending: false })
            .limit(8),
        ]);

        if (engRes.error) throw engRes.error;
        if (qRes.error) throw qRes.error;
        if (otherDocsRes.error) throw otherDocsRes.error;
        if (trRes.error) throw trRes.error;
        if (activityRes.error) throw activityRes.error;

        const engagementSet = new Set<string>();
        for (const row of engRes.data || []) {
          if (clientIdSet.has((row as any).user_id)) engagementSet.add((row as any).user_id);
        }

        const questionnaireSet = new Set<string>();
        for (const row of qRes.data || []) {
          if (clientIdSet.has((row as any).user_id)) questionnaireSet.add((row as any).user_id);
        }

        const uploadedSet = new Set<string>();
        for (const row of otherDocsRes.data || []) {
          if (clientIdSet.has((row as any).user_id)) uploadedSet.add((row as any).user_id);
        }

        const filedSet = new Set<string>();
        for (const row of trRes.data || []) {
          if (clientIdSet.has((row as any).user_id)) filedSet.add((row as any).user_id);
        }

        let completed = 0;
        for (const clientId of clientIds) {
          if (engagementSet.has(clientId) && questionnaireSet.has(clientId) && uploadedSet.has(clientId)) {
            completed += 1;
          }
        }

        const inProg = Math.max(0, completed - filedSet.size);

        // Resolve names for recent activity
        const activity = (activityRes.data || []) as Activity[];
        const activityUserIds = Array.from(new Set(activity.map((a) => a.user_id))).filter((id) => clientIdSet.has(id));
        const { data: activityProfiles, error: activityProfilesErr } = await supabase
          .from("profiles")
          .select("id, first_name, last_name, email")
          .in("id", activityUserIds.length ? activityUserIds : ["00000000-0000-0000-0000-000000000000"]);
        if (activityProfilesErr) throw activityProfilesErr;

        const nameById = new Map<string, string>();
        for (const p of activityProfiles || []) {
          nameById.set((p as any).id, displayNameFromProfile(p));
        }

        const recent = activity
          .filter((a) => clientIdSet.has(a.user_id))
          .map((a) => ({ ...a, name: nameById.get(a.user_id) || "Client" }));

        if (cancelled) return;
        setTotalClients(total);
        setPendingSignature(Math.max(0, total - engagementSet.size));
        setSignedEngagement(engagementSet.size);
        setQuestionnaireCompleted(questionnaireSet.size);
        setDocsUploaded(uploadedSet.size);
        setCompletedAllThree(completed);
        setFiledClients(filedSet.size);
        setInProgress(inProg);
        setRecentActivity(recent);
      } catch (err) {
        console.error("Admin dashboard load error:", err);
        if (!cancelled) {
          setTotalClients(0);
          setPendingSignature(0);
          setSignedEngagement(0);
          setQuestionnaireCompleted(0);
          setDocsUploaded(0);
          setCompletedAllThree(0);
          setFiledClients(0);
          setInProgress(0);
          setRecentActivity([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [taxYear]);

  const filingPercent = useMemo(() => {
    if (!totalClients) return 0;
    return Math.round((filedClients / totalClients) * 100);
  }, [filedClients, totalClients]);

  const totalCircle = 2 * Math.PI * 80;
  const dashOffset = totalCircle * (1 - filingPercent / 100);

  return (
    <div className="space-y-8">
      <section>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold">Admin Performance Dashboard</h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Overview of firm operations and seasonal filing progress.
            </p>
          </div>
        </div>
      </section>

      <div className="space-y-8">
          <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-zinc-950">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-lg font-bold">Client Status Funnel</h2>
              <Link href="/admin/clients" className="text-sm font-semibold text-primary hover:underline">
                View All Clients
              </Link>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
              <div className="rounded-xl border border-zinc-100 bg-zinc-50 p-4 dark:border-white/10 dark:bg-zinc-900">
                <div className="mb-2 h-7 w-7 rounded-lg bg-primary/15" />
                <div className="text-[10px] font-bold uppercase text-zinc-500 dark:text-zinc-400">Pending Signature</div>
                <div className="text-xl font-bold">{pendingSignature}</div>
                <div className="mt-1 text-[10px] text-zinc-400">Engagement Letter</div>
              </div>

              <div className="rounded-xl border border-zinc-100 bg-zinc-50 p-4 dark:border-white/10 dark:bg-zinc-900">
                <div className="mb-2 h-7 w-7 rounded-lg bg-primary/15" />
                <div className="text-[10px] font-bold uppercase text-zinc-500 dark:text-zinc-400">Signed</div>
                <div className="text-xl font-bold">{signedEngagement}</div>
                <div className="mt-1 text-[10px] text-zinc-400">Engagement Letter</div>
              </div>

              <div className="rounded-xl border border-zinc-100 bg-zinc-50 p-4 dark:border-white/10 dark:bg-zinc-900">
                <div className="mb-2 h-7 w-7 rounded-lg bg-primary/15" />
                <div className="text-[10px] font-bold uppercase text-zinc-500 dark:text-zinc-400">Completed</div>
                <div className="text-xl font-bold">{questionnaireCompleted}</div>
                <div className="mt-1 text-[10px] text-zinc-400">Tax Questionnaire</div>
              </div>

              <div className="rounded-xl border border-zinc-100 bg-zinc-50 p-4 dark:border-white/10 dark:bg-zinc-900">
                <div className="mb-2 h-7 w-7 rounded-lg bg-primary/15" />
                <div className="text-[10px] font-bold uppercase text-zinc-500 dark:text-zinc-400">Uploaded</div>
                <div className="text-xl font-bold">{docsUploaded}</div>
                <div className="mt-1 text-[10px] text-zinc-400">Supporting Docs</div>
              </div>

              <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
                <div className="mb-2 h-7 w-7 rounded-lg bg-primary/20" />
                <div className="text-[10px] font-bold uppercase text-primary">In Progress</div>
                <div className="text-xl font-bold text-primary">{inProgress}</div>
                <div className="mt-1 text-[10px] text-primary/60">Firm Preparation</div>
              </div>
            </div>

            <div className="mt-4 text-xs text-zinc-500 dark:text-zinc-400">
              {loading ? "Loading metrics…" : `${completedAllThree} clients completed all 3 steps for ${taxYear}.`}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
            <div className="flex flex-col items-center rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-zinc-950">
              <div className="mb-4 w-full">
                <h2 className="text-lg font-bold">Tax Filing Progress</h2>
              </div>

              <div className="relative mb-4 flex h-48 w-48 items-center justify-center">
                <svg className="h-full w-full -rotate-90" viewBox="0 0 192 192" aria-hidden="true">
                  <circle
                    className="text-zinc-100 dark:text-zinc-800"
                    cx="96"
                    cy="96"
                    r="80"
                    fill="transparent"
                    stroke="currentColor"
                    strokeWidth="12"
                  />
                  <circle
                    className="text-primary"
                    cx="96"
                    cy="96"
                    r="80"
                    fill="transparent"
                    stroke="currentColor"
                    strokeWidth="12"
                    strokeDasharray={totalCircle}
                    strokeDashoffset={dashOffset}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <div className="text-3xl font-extrabold">{filingPercent}%</div>
                  <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Filed</div>
                </div>
              </div>

              <div className="text-center">
                <div className="text-sm font-medium">
                  {filedClients} of {totalClients} returns uploaded
                </div>
                <div className="mt-1 text-xs text-zinc-400">Current season: {taxYear}</div>
              </div>
            </div>

            <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-zinc-950">
              <h2 className="mb-4 text-lg font-bold">Recent Activity</h2>

              <div className="space-y-4">
                {recentActivity.length === 0 ? (
                  <div className="text-sm text-zinc-500 dark:text-zinc-400">
                    {loading ? "Loading activity…" : "No recent client activity for this season."}
                  </div>
                ) : (
                  recentActivity.map((a) => (
                    <div key={a.id} className="flex gap-3">
                      <div className="mt-1 flex h-8 w-8 items-center justify-center rounded-full bg-zinc-100 text-zinc-600 dark:bg-zinc-900 dark:text-zinc-300" />
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-bold">
                          {a.name}{" "}
                          <span className="font-normal text-zinc-500 dark:text-zinc-400">
                            {activityText(a.doctype)}
                          </span>
                        </div>
                        <div className="text-xs text-zinc-400">{timeAgo(a.created_at)}</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
      </div>
    </div>
  );
}
