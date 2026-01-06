"use client";

import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ChevronRight,
  Edit2,
  Upload,
  FileText,
  MoreHorizontal,
  Download,
  Check,
  Loader2,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Building,
  CreditCard,
  Eye,
  FileSpreadsheet,
  File as FileIcon,
  Trash2,
  X,
  Plus
} from "lucide-react";
import imageCompression from "browser-image-compression";

// Types
type ClientProfile = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone_number: string;
  role: string;
  entity: string;
  created_at: string;
  updated_at: string;
};

type UnifiedDoc = {
  id: string;
  title: string;
  date: string; // created_at
  type: string; // doctype or form_type
  status: string; // 'Completed', 'Reviewing', etc.
  size?: number;
  source: "doc" | "return";
  file_path: string;
  year?: number;
};

export default function ClientDetailPage() {
  const params = useParams() as { clientId: string };
  const clientId = params.clientId;
  const router = useRouter();

  // Data State
  const [profile, setProfile] = useState<ClientProfile | null>(null);
  const [docs, setDocs] = useState<UnifiedDoc[]>([]);
  const [loading, setLoading] = useState(true);

  // UI State
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [isUploadDocOpen, setIsUploadDocOpen] = useState(false);
  const [isUploadReturnOpen, setIsUploadReturnOpen] = useState(false);

  // Upload State (Regular Doc)
  const [uploadDocForm, setUploadDocForm] = useState({
    title: "",
    type: "Legal Docs",
    year: new Date().getFullYear(),
    file: null as File | null,
  });
  const [uploadingDoc, setUploadingDoc] = useState(false);

  // Upload State (Tax Return)
  const [uploadReturnForm, setUploadReturnForm] = useState({
    title: "",
    formType: "1040",
    year: new Date().getFullYear(),
    file: null as File | null,
  });
  const [uploadingReturn, setUploadingReturn] = useState(false);

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 8 }, (_, i) => currentYear - i);
  const docTypes = ["Legal Docs", "Banking Info", "Income", "Expenses", "Letters", "Other"];

  useEffect(() => {
    loadData();
  }, [clientId]);

  async function loadData() {
    setLoading(true);
    try {
      // 1. Fetch Profile
      const { data: p, error: pError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", clientId)
        .single();

      if (pError) console.error("Profile Error:", pError);
      setProfile(p);

      // 2. Fetch User Documents
      const { data: userDocs, error: dError } = await supabase
        .from("user_documents")
        .select("*")
        .eq("user_id", clientId);

      // 3. Fetch Tax Returns
      const { data: taxReturns, error: tError } = await supabase
        .from("tax_returns")
        .select("*")
        .eq("user_id", clientId);

      // 4. Merge
      const unified: UnifiedDoc[] = [];

      (userDocs || []).forEach((d: any) => {
        unified.push({
          id: d.id,
          title: d.title || d.name,
          date: d.created_at,
          type: d.doctype || "Document",
          status: "Uploaded", // User docs don't have status usually
          size: d.size,
          source: "doc",
          file_path: d.file_path,
          year: d.year,
        });
      });

      (taxReturns || []).forEach((t: any) => {
        unified.push({
          id: t.id,
          title: t.title,
          date: t.created_at,
          type: t.form_type || "Tax Return",
          status: t.status || "Filed",
          size: t.size, // if available
          source: "return",
          file_path: t.file_path,
          year: t.year,
        });
      });

      // Sort by date desc
      unified.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setDocs(unified);

    } catch (err) {
      console.error("Load Error:", err);
    } finally {
      setLoading(false);
    }
  }

  // --- Actions ---

  async function handleDownload(doc: UnifiedDoc) {
    try {
      const bucket = doc.source === "return" ? "tax_returns" : "documents";
      const { data, error } = await supabase.storage
        .from(bucket)
        .createSignedUrl(doc.file_path, 3600);
      
      if (error) throw error;
      if (data?.signedUrl) {
        window.open(data.signedUrl, "_blank");
      }
    } catch (err) {
      alert("Error downloading file");
      console.error(err);
    }
  }

  // --- Upload Handlers ---

  async function handleDocUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!uploadDocForm.file || !profile) return;
    setUploadingDoc(true);

    try {
      let file = uploadDocForm.file;
      // Simple compression for images
      if (file.type.startsWith("image/")) {
        try {
          const options = { maxSizeMB: 1, maxWidthOrHeight: 1920, useWebWorker: true };
          file = await imageCompression(file, options);
        } catch (err) { console.warn("Compression failed", err); }
      }

      const fileExt = file.name.split(".").pop();
      const safeName = `${Date.now()}_${uploadDocForm.title.replace(/[^a-zA-Z0-9-_]/g, "")}.${fileExt}`;
      const filePath = `${profile.id}/${safeName}`;

      // 1. Storage
      const { error: upErr } = await supabase.storage
        .from("documents")
        .upload(filePath, file);
      if (upErr) throw upErr;

      // 2. DB
      const { error: dbErr } = await supabase.from("user_documents").insert({
        user_id: profile.id,
        title: uploadDocForm.title,
        doctype: uploadDocForm.type,
        year: uploadDocForm.year,
        file_path: filePath,
        file_type: file.type,
        size: file.size,
      });
      if (dbErr) throw dbErr;

      // Success
      setUploadDocForm({ title: "", type: "Legal Docs", year: currentYear, file: null });
      setIsUploadDocOpen(false);
      await loadData();

    } catch (err: any) {
      alert("Upload failed: " + err.message);
    } finally {
      setUploadingDoc(false);
    }
  }

  async function handleReturnUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!uploadReturnForm.file || !profile) return;
    setUploadingReturn(true);

    try {
      const fd = new FormData();
      fd.append("client_id", profile.id);
      fd.append("title", uploadReturnForm.title);
      fd.append("form_type", uploadReturnForm.formType);
      fd.append("year", String(uploadReturnForm.year));
      fd.append("file", uploadReturnForm.file);

      const res = await fetch("/functions/v1/upload-tax-return", {
        method: "POST",
        headers: { authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token || ""}` },
        body: fd,
      });

      if (!res.ok) {
        const j = await res.json();
        throw new Error(j.error || "Upload failed");
      }

      // Success
      setUploadReturnForm({ title: "", formType: "1040", year: currentYear, file: null });
      setIsUploadReturnOpen(false);
      await loadData();

    } catch (err: any) {
      alert("Upload failed: " + err.message);
    } finally {
      setUploadingReturn(false);
    }
  }

  // --- Render Helpers ---

  function FileIconComponent({ type, className }: { type: string, className?: string }) {
    const t = type.toLowerCase();
    if (t.includes("pdf")) return <FileText className={`text-red-500 ${className}`} />;
    if (t.includes("xls") || t.includes("sheet") || t.includes("financial")) return <FileSpreadsheet className={`text-green-500 ${className}`} />;
    if (t.includes("image") || t.includes("jpg") || t.includes("png")) return <FileIcon className={`text-blue-500 ${className}`} />;
    return <FileIcon className={`text-zinc-400 ${className}`} />;
  }

  function StatusBadge({ status }: { status: string }) {
    const s = status.toLowerCase();
    let color = "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300";
    if (s === "completed" || s === "filed") color = "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300";
    if (s === "reviewing" || s === "pending") color = "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300";
    if (s === "archived") color = "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-500";
    if (s === "uploaded") color = "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300";

    return (
      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${color}`}>
        {status}
      </span>
    );
  }

  if (loading && !profile) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
      </div>
    );
  }

  if (!profile) return <div>Client not found</div>;

  return (
    <div className="space-y-6">
      {/* Breadcrumbs */}
      <nav className="flex items-center text-sm text-zinc-500">
        <Link href="/admin" className="hover:text-zinc-900 dark:hover:text-zinc-300">Home</Link>
        <ChevronRight className="mx-2 h-4 w-4" />
        <Link href="/admin/clients" className="hover:text-zinc-900 dark:hover:text-zinc-300">Clients</Link>
        <ChevronRight className="mx-2 h-4 w-4" />
        <span className="font-medium text-zinc-900 dark:text-white">{profile.first_name} {profile.last_name}</span>
      </nav>

      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-white">
            {profile.first_name} {profile.last_name}
          </h1>
          <div className="mt-2 flex items-center gap-3">
            <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-300">
              Active
            </span>
            <span className="text-sm text-zinc-500">
              {profile.entity || "Individual Client"}
            </span>
          </div>
        </div>
        <div className="flex gap-3">
          <button className="inline-flex items-center justify-center rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700">
            <Edit2 className="mr-2 h-4 w-4" />
            Edit Profile
          </button>
          <button
            onClick={() => setIsUploadDocOpen(true)}
            className="inline-flex items-center justify-center rounded-lg bg-white border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:bg-zinc-800 dark:border-zinc-700 dark:text-white dark:hover:bg-zinc-700"
          >
            <Upload className="mr-2 h-4 w-4" />
            Upload Document
          </button>
          <button
            onClick={() => setIsUploadReturnOpen(true)}
            className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 shadow-sm"
          >
            <Upload className="mr-2 h-4 w-4" />
            Upload Tax Return
          </button>
        </div>
      </div>

      {/* Top Cards */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Profile Card */}
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-zinc-900 lg:col-span-2">
          <div className="flex items-start justify-between">
            <div className="flex gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-zinc-100 text-xl font-bold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                {profile.first_name?.[0]}{profile.last_name?.[0]}
              </div>
              <div>
                <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">{profile.first_name} {profile.last_name}</h3>
                <p className="text-sm text-zinc-500">{profile.email}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="rounded bg-zinc-100 px-2 py-1 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">Tax Filing</span>
                  <span className="rounded bg-zinc-100 px-2 py-1 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">Bookkeeping</span>
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs font-medium uppercase text-zinc-500">Client ID</div>
              <div className="font-mono text-sm font-medium text-zinc-900 dark:text-white">#{profile.id.slice(0, 8)}</div>
            </div>
          </div>
        </div>

        {/* Stats Card */}
        <div className="space-y-6">
            <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-zinc-900">
                <div className="text-sm font-medium text-zinc-500">Client Since</div>
                <div className="mt-1 text-2xl font-bold text-zinc-900 dark:text-white">
                    {new Date(profile.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                </div>
            </div>
            <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-zinc-900">
                <div className="flex items-center justify-between">
                    <div>
                        <div className="text-sm font-medium text-zinc-500">Total Documents</div>
                        <div className="mt-1 text-2xl font-bold text-zinc-900 dark:text-white">{docs.length}</div>
                    </div>
                    <div className="rounded-full bg-green-100 p-2 text-green-600 dark:bg-green-900/30 dark:text-green-400">
                        <Check className="h-5 w-5" />
                    </div>
                </div>
            </div>
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Personal Info */}
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-zinc-900">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-semibold text-zinc-900 dark:text-white">Personal Information</h3>
            <button className="text-sm font-medium text-blue-600 hover:text-blue-500">Update</button>
          </div>
          <div className="grid grid-cols-2 gap-y-4">
            <div>
              <div className="text-xs font-medium uppercase text-zinc-500">Legal Name</div>
              <div className="mt-1 text-sm text-zinc-900 dark:text-white">{profile.first_name} {profile.last_name}</div>
            </div>
            <div>
              <div className="text-xs font-medium uppercase text-zinc-500">Date of Birth</div>
              <div className="mt-1 text-sm text-zinc-900 dark:text-white">—</div>
            </div>
            <div>
              <div className="text-xs font-medium uppercase text-zinc-500">Tax ID / SSN</div>
              <div className="mt-1 flex items-center gap-2 text-sm text-zinc-900 dark:text-white">
                ••••••
                <Eye className="h-3 w-3 text-zinc-400" />
              </div>
            </div>
            <div>
              <div className="text-xs font-medium uppercase text-zinc-500">Company Name</div>
              <div className="mt-1 text-sm text-zinc-900 dark:text-white">{profile.entity || "—"}</div>
            </div>
          </div>
        </div>

        {/* Contact Details */}
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-zinc-900">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-semibold text-zinc-900 dark:text-white">Contact Details</h3>
            <button className="text-sm font-medium text-blue-600 hover:text-blue-500">Update</button>
          </div>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="rounded bg-zinc-100 p-2 dark:bg-zinc-800">
                <Mail className="h-4 w-4 text-zinc-500" />
              </div>
              <div>
                <div className="text-xs font-medium uppercase text-zinc-500">Email Address</div>
                <div className="mt-0.5 text-sm text-zinc-900 dark:text-white">{profile.email}</div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="rounded bg-zinc-100 p-2 dark:bg-zinc-800">
                <Phone className="h-4 w-4 text-zinc-500" />
              </div>
              <div>
                <div className="text-xs font-medium uppercase text-zinc-500">Phone Number</div>
                <div className="mt-0.5 text-sm text-zinc-900 dark:text-white">{profile.phone_number || "—"}</div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="rounded bg-zinc-100 p-2 dark:bg-zinc-800">
                <MapPin className="h-4 w-4 text-zinc-500" />
              </div>
              <div>
                <div className="text-xs font-medium uppercase text-zinc-500">Billing Address</div>
                <div className="mt-0.5 text-sm text-zinc-900 dark:text-white">
                  —
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Documents Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-zinc-900 dark:text-white">Client Documents</h2>
          <div className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-white p-1 dark:border-zinc-700 dark:bg-zinc-900">
            <button
              onClick={() => setViewMode("list")}
              className={`rounded p-1.5 ${viewMode === "list" ? "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-white" : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"}`}
            >
              <MoreHorizontal className="h-4 w-4 rotate-90" />
            </button>
            <button
              onClick={() => setViewMode("grid")}
              className={`rounded p-1.5 ${viewMode === "grid" ? "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-white" : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"}`}
            >
              <div className="grid grid-cols-2 gap-0.5">
                <div className="h-1.5 w-1.5 rounded-sm bg-current" />
                <div className="h-1.5 w-1.5 rounded-sm bg-current" />
                <div className="h-1.5 w-1.5 rounded-sm bg-current" />
                <div className="h-1.5 w-1.5 rounded-sm bg-current" />
              </div>
            </button>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-white/10 dark:bg-zinc-900">
          <div className="grid grid-cols-12 gap-4 border-b border-zinc-200 px-6 py-3 text-xs font-medium text-zinc-500 dark:border-white/10">
            <div className="col-span-5 md:col-span-4">Document Name</div>
            <div className="col-span-3 hidden md:block">Date Uploaded</div>
            <div className="col-span-3 md:col-span-2">Type</div>
            <div className="col-span-2 hidden md:block">Status</div>
            <div className="col-span-4 md:col-span-1 text-right">Actions</div>
          </div>
          <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {docs.map((doc) => (
              <li key={doc.id} className="grid grid-cols-12 items-center gap-4 px-6 py-4 hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                <div className="col-span-5 flex items-center gap-3 md:col-span-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-100 dark:bg-zinc-800">
                    <FileIconComponent type={doc.title} className="h-5 w-5" />
                  </div>
                  <div className="overflow-hidden">
                    <div className="truncate text-sm font-medium text-zinc-900 dark:text-white">{doc.title}</div>
                    {doc.size && <div className="text-xs text-zinc-500">{(doc.size / 1024).toFixed(1)} KB</div>}
                  </div>
                </div>
                <div className="col-span-3 hidden text-sm text-zinc-600 dark:text-zinc-400 md:block">
                  {new Date(doc.date).toLocaleDateString()}
                </div>
                <div className="col-span-3 text-sm text-zinc-600 dark:text-zinc-400 md:col-span-2">
                  {doc.type}
                </div>
                <div className="col-span-2 hidden md:block">
                  <StatusBadge status={doc.status} />
                </div>
                <div className="col-span-4 flex justify-end gap-2 md:col-span-1">
                  <button
                    onClick={() => handleDownload(doc)}
                    className="rounded p-2 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
                    title="Download"
                  >
                    <Download className="h-4 w-4" />
                  </button>
                  <button className="rounded p-2 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-200">
                    <MoreHorizontal className="h-4 w-4" />
                  </button>
                </div>
              </li>
            ))}
            {docs.length === 0 && (
              <li className="px-6 py-8 text-center text-sm text-zinc-500">
                No documents found. Upload one to get started.
              </li>
            )}
          </ul>
        </div>
      </div>

      {/* --- Modals --- */}
      
      {/* Upload Regular Doc Modal */}
      {isUploadDocOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-zinc-900">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">Upload Client Document</h2>
              <button onClick={() => setIsUploadDocOpen(false)} className="text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleDocUpload} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Title</label>
                <input
                  required
                  className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
                  placeholder="e.g. Bank Statement"
                  value={uploadDocForm.title}
                  onChange={e => setUploadDocForm({...uploadDocForm, title: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Type</label>
                  <select
                    className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
                    value={uploadDocForm.type}
                    onChange={e => setUploadDocForm({...uploadDocForm, type: e.target.value})}
                  >
                    {docTypes.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Year</label>
                  <select
                    className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
                    value={uploadDocForm.year}
                    onChange={e => setUploadDocForm({...uploadDocForm, year: Number(e.target.value)})}
                  >
                    {years.map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">File</label>
                <input
                  type="file"
                  required
                  className="w-full text-sm text-zinc-500 file:mr-4 file:rounded-full file:border-0 file:bg-zinc-100 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-zinc-700 hover:file:bg-zinc-200 dark:file:bg-zinc-800 dark:file:text-zinc-300"
                  onChange={e => setUploadDocForm({...uploadDocForm, file: e.target.files?.[0] || null, title: uploadDocForm.title || e.target.files?.[0]?.name || ""})}
                />
              </div>
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={uploadingDoc}
                  className="flex w-full items-center justify-center rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-white dark:text-zinc-900"
                >
                  {uploadingDoc ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Upload Document"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Upload Tax Return Modal */}
      {isUploadReturnOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-zinc-900">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">Upload Tax Return</h2>
              <button onClick={() => setIsUploadReturnOpen(false)} className="text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleReturnUpload} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Title</label>
                <input
                  required
                  className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
                  placeholder="e.g. 2023 Tax Return"
                  value={uploadReturnForm.title}
                  onChange={e => setUploadReturnForm({...uploadReturnForm, title: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Form Type</label>
                  <select
                    className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
                    value={uploadReturnForm.formType}
                    onChange={e => setUploadReturnForm({...uploadReturnForm, formType: e.target.value})}
                  >
                    <option value="1040">1040</option>
                    <option value="W2">W2</option>
                    <option value="1099">1099</option>
                    <option value="1120">1120</option>
                    <option value="1065">1065</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Year</label>
                  <select
                    className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
                    value={uploadReturnForm.year}
                    onChange={e => setUploadReturnForm({...uploadReturnForm, year: Number(e.target.value)})}
                  >
                    {years.map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">File</label>
                <input
                  type="file"
                  required
                  className="w-full text-sm text-zinc-500 file:mr-4 file:rounded-full file:border-0 file:bg-zinc-100 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-zinc-700 hover:file:bg-zinc-200 dark:file:bg-zinc-800 dark:file:text-zinc-300"
                  onChange={e => setUploadReturnForm({...uploadReturnForm, file: e.target.files?.[0] || null, title: uploadReturnForm.title || e.target.files?.[0]?.name || ""})}
                />
              </div>
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={uploadingReturn}
                  className="flex w-full items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {uploadingReturn ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Upload Return"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
