"use client";

import { useState, useEffect } from "react";
import {
  FileText,
  Download,
  Upload,
  Loader2,
  Search,
  Filter,
  CheckCircle,
  Clock,
  Eye,
  FolderOpen,
  Building2,
  User,
  Calendar,
  HardDrive,
  ShieldCheck,
  Check,
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import imageCompression from "browser-image-compression";

interface DocumentsTabProps {
  user: any;
  documents: any[];
  taxReturns: any[];
  onDocumentUploaded: () => void;
}

type DocCategory = "all" | "client" | "firm";

export default function DocumentsTab({
  user,
  documents,
  taxReturns,
  onDocumentUploaded,
}: DocumentsTabProps) {
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 8 }, (_, i) => currentYear - i);
  
  const [activeCategory, setActiveCategory] = useState<DocCategory>("all");
  const [selectedYear, setSelectedYear] = useState<number | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  // Upload form state
  const [uploadForm, setUploadForm] = useState({
    title: "",
    type: "Legal Docs",
    year: currentYear,
    file: null as File | null,
  });

  const docTypes = ["Legal Docs", "Banking Info", "Income", "Expenses", "Letters", "Tax Forms"];

  // Filter documents
  const filteredDocs = documents.filter((doc) => {
    const matchesYear = selectedYear === "all" || doc.year === selectedYear;
    const matchesSearch =
      searchQuery === "" ||
      doc.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.doctype?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesYear && matchesSearch;
  });

  // Filter tax returns (firm documents)
  const filteredTaxReturns = taxReturns.filter((tr) => {
    const matchesYear = selectedYear === "all" || tr.year === selectedYear;
    const matchesSearch =
      searchQuery === "" ||
      tr.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tr.form_type?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesYear && matchesSearch;
  });

  // Stats
  const totalDocs = documents.length + taxReturns.length;
  const verifiedDocs = taxReturns.filter((tr) => tr.status === "finalized").length;
  const totalStorage = [...documents, ...taxReturns].reduce((acc, doc) => acc + (doc.size || 0), 0);
  const storageUsedMB = (totalStorage / (1024 * 1024)).toFixed(1);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      setUploadForm((prev) => ({ ...prev, file, title: file.name.replace(/\.[^/.]+$/, "") }));
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setUploadForm((prev) => ({ ...prev, file, title: file.name.replace(/\.[^/.]+$/, "") }));
    }
  };

  const handleUpload = async () => {
    if (!uploadForm.file || !user) return;

    setUploading(true);
    let file = uploadForm.file;

    // Validation
    const MAX_SIZE_MB = 10;
    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];

    if (!allowedTypes.includes(file.type)) {
      alert("Invalid file type. Only PDF, JPG, PNG, and DOCX are allowed.");
      setUploading(false);
      return;
    }

    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      alert(`File too large. Maximum size is ${MAX_SIZE_MB}MB.`);
      setUploading(false);
      return;
    }

    // Compress if image
    if (file.type.startsWith("image/")) {
      try {
        const options = { maxSizeMB: 1, maxWidthOrHeight: 1920, useWebWorker: true };
        const compressed = await imageCompression(file, options);
        if (compressed.size < file.size) file = compressed;
      } catch (err) {
        console.warn("Compression failed", err);
      }
    }

    const fileExt = file.name.split(".").pop();
    const safeName = `${Date.now()}_${uploadForm.title.replace(/[^a-zA-Z0-9-_]/g, "")}.${fileExt}`;
    const filePath = `${user.id}/${safeName}`;

    try {
      const { error: uploadError } = await supabase.storage
        .from("documents")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { error: dbError } = await supabase.from("user_documents").insert({
        user_id: user.id,
        title: uploadForm.title,
        doctype: uploadForm.type,
        year: uploadForm.year,
        file_path: filePath,
        file_type: file.type,
        size: file.size,
      });

      if (dbError) throw dbError;

      // Reset form
      setUploadForm({
        title: "",
        type: "Legal Docs",
        year: currentYear,
        file: null,
      });

      onDocumentUploaded();
    } catch (error: any) {
      alert("Error uploading: " + error.message);
    } finally {
      setUploading(false);
    }
  };

  // Download document handler
  const handleDownload = async (doc: { file_path: string; title?: string }, bucket: string = "documents") => {
    try {
      const { data: fileData, error: downloadError } = await supabase.storage
        .from(bucket)
        .download(doc.file_path);
      
      if (downloadError) throw downloadError;
      if (fileData) {
        // Create a download link with proper filename
        const url = URL.createObjectURL(fileData);
        const link = document.createElement("a");
        link.href = url;
        link.download = doc.file_path.split("/").pop() || doc.title || "document";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }
    } catch (err: any) {
      alert("Error downloading file: " + err.message);
      console.error(err);
    }
  };

  const getFileIcon = (type: string) => {
    if (type?.includes("pdf")) return "📄";
    if (type?.includes("image")) return "🖼️";
    if (type?.includes("word") || type?.includes("document")) return "📝";
    return "📎";
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white sm:text-3xl">
            Client Document Repository
          </h1>
          <p className="mt-2 text-zinc-600 dark:text-zinc-400">
            Manage your financial records and official tax documents in one secure place.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value === "all" ? "all" : Number(e.target.value))}
            className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
          >
            <option value="all">All Fiscal Years</option>
            {years.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
        <input
          type="text"
          placeholder="Search documents..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full rounded-xl border border-zinc-200 bg-white pl-10 pr-4 py-3 text-sm placeholder:text-zinc-400 focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Firm Provided Documents */}
        <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-white/10 dark:bg-zinc-900">
          <div className="flex items-center justify-between p-6 border-b border-zinc-100 dark:border-zinc-800">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900/30">
                <ShieldCheck className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <h2 className="font-semibold text-zinc-900 dark:text-white">
                  Firm Provided (Returns & Statements)
                </h2>
                <p className="text-xs text-zinc-500">Official Records</p>
              </div>
            </div>
          </div>

          <div className="p-4 max-h-96 overflow-y-auto">
            {filteredTaxReturns.length > 0 ? (
              <div className="space-y-3">
                {filteredTaxReturns.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between rounded-xl border border-zinc-100 bg-zinc-50 p-4 hover:bg-zinc-100 transition-colors dark:border-zinc-800 dark:bg-zinc-800/50 dark:hover:bg-zinc-800"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-100 dark:bg-red-900/30">
                        <FileText className="h-5 w-5 text-red-600 dark:text-red-400" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-zinc-900 dark:text-white">
                          {doc.title}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                          <span>{doc.form_type}</span>
                          <span>•</span>
                          <span>{formatFileSize(doc.size || 0)}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <Calendar size={10} className="text-zinc-400" />
                          <span className="text-xs text-zinc-400">
                            {new Date(doc.created_at).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </span>
                          {doc.status === "finalized" && (
                            <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                              <CheckCircle size={10} />
                              Finalized
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <button 
                      onClick={() => handleDownload(doc, "tax_returns")}
                      className="p-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-700"
                      title="Download"
                    >
                      <Download size={18} />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800 mb-3">
                  <Building2 className="h-6 w-6 text-zinc-400" />
                </div>
                <p className="text-sm font-medium text-zinc-900 dark:text-white">No firm documents yet</p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                  Tax returns and statements will appear here
                </p>
              </div>
            )}
          </div>

          {filteredTaxReturns.length > 0 && (
            <div className="p-4 border-t border-zinc-100 dark:border-zinc-800">
              <button className="text-sm font-medium text-red-600 hover:text-red-700 dark:text-red-400">
                View All Firm Documents
              </button>
            </div>
          )}
        </div>

        {/* Client Uploaded Documents */}
        <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-white/10 dark:bg-zinc-900">
          <div className="flex items-center justify-between p-6 border-b border-zinc-100 dark:border-zinc-800">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <Upload className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h2 className="font-semibold text-zinc-900 dark:text-white">Uploaded by You</h2>
                <p className="text-xs text-zinc-500">Your Files</p>
              </div>
            </div>
          </div>

          <div className="p-4 max-h-96 overflow-y-auto">
            {filteredDocs.length > 0 ? (
              <div className="space-y-3">
                {filteredDocs.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between rounded-xl border border-zinc-100 bg-zinc-50 p-4 hover:bg-zinc-100 transition-colors dark:border-zinc-800 dark:bg-zinc-800/50 dark:hover:bg-zinc-800"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
                        <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-zinc-900 dark:text-white">
                          {doc.title}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                          <span>{doc.doctype}</span>
                          <span>•</span>
                          <span>{doc.year}</span>
                          <span>•</span>
                          <span>{formatFileSize(doc.size || 0)}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <Calendar size={10} className="text-zinc-400" />
                          <span className="text-xs text-zinc-400">
                            {new Date(doc.created_at).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </span>
                        </div>
                      </div>
                    </div>
                    <button 
                      onClick={() => handleDownload(doc)}
                      className="p-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-700"
                      title="Download"
                    >
                      <Download size={18} />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800 mb-3">
                  <FolderOpen className="h-6 w-6 text-zinc-400" />
                </div>
                <p className="text-sm font-medium text-zinc-900 dark:text-white">No documents uploaded</p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                  Upload files using the form below
                </p>
              </div>
            )}
          </div>

          {/* Upload Area */}
          <div className="p-4 border-t border-zinc-100 dark:border-zinc-800">
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              className={`relative rounded-xl border-2 border-dashed p-6 text-center transition-colors ${
                dragActive
                  ? "border-red-500 bg-red-50 dark:bg-red-900/10"
                  : uploadForm.file
                  ? "border-green-500 bg-green-50 dark:bg-green-900/10"
                  : "border-zinc-300 hover:border-zinc-400 dark:border-zinc-700 dark:hover:border-zinc-600"
              }`}
            >
              {uploadForm.file ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-center gap-2 text-green-600 dark:text-green-400">
                    <Check size={20} />
                    <span className="font-medium">{uploadForm.file.name}</span>
                  </div>
                  <div className="flex flex-wrap gap-2 justify-center">
                    <input
                      type="text"
                      placeholder="Document title"
                      value={uploadForm.title}
                      onChange={(e) => setUploadForm((prev) => ({ ...prev, title: e.target.value }))}
                      className="rounded-lg border border-zinc-200 px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-800"
                    />
                    <select
                      value={uploadForm.type}
                      onChange={(e) => setUploadForm((prev) => ({ ...prev, type: e.target.value }))}
                      className="rounded-lg border border-zinc-200 px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-800"
                    >
                      {docTypes.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                    <select
                      value={uploadForm.year}
                      onChange={(e) => setUploadForm((prev) => ({ ...prev, year: Number(e.target.value) }))}
                      className="rounded-lg border border-zinc-200 px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-800"
                    >
                      {years.map((y) => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex gap-2 justify-center">
                    <button
                      onClick={handleUpload}
                      disabled={uploading}
                      className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
                    >
                      {uploading ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Uploading...
                        </>
                      ) : (
                        <>
                          <Upload size={16} />
                          Upload
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => setUploadForm((prev) => ({ ...prev, file: null, title: "" }))}
                      className="rounded-lg px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <Upload className="mx-auto h-8 w-8 text-zinc-400" />
                  <p className="mt-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    Drag & drop files here
                  </p>
                  <p className="text-xs text-zinc-500">or click to browse from your computer</p>
                  <p className="mt-2 text-xs text-zinc-400">PDF, JPG, PNG up to 10MB</p>
                  <input
                    type="file"
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    accept=".pdf,.jpg,.jpeg,.png,.docx"
                    onChange={handleFileSelect}
                  />
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Stats Footer */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-zinc-900">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-100 dark:bg-red-900/30">
              <FileText className="h-5 w-5 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
                Total Documents
              </p>
              <p className="text-2xl font-bold text-zinc-900 dark:text-white">{totalDocs}</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-zinc-900">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900/30">
              <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
                Verified by Firm
              </p>
              <p className="text-2xl font-bold text-zinc-900 dark:text-white">{verifiedDocs}</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-zinc-900">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
              <HardDrive className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
                Storage Used
              </p>
              <p className="text-2xl font-bold text-zinc-900 dark:text-white">
                {storageUsedMB} MB
                <span className="text-sm font-normal text-zinc-400"> / 1 GB</span>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Notice */}
      <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
        <ShieldCheck size={14} />
        <span>End-to-end encrypted document storage.</span>
      </div>
    </div>
  );
}
