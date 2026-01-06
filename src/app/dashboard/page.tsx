"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Upload, FileText, Loader2, Check } from "lucide-react";
import { useRouter } from "next/navigation";
import imageCompression from "browser-image-compression";

export default function DashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [user, setUser] = useState<any>(null);

  // Form states
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [newPassword, setNewPassword] = useState("");
  
  // Document states
  const [uploading, setUploading] = useState(false);
  const [documents, setDocuments] = useState<any[]>([]);
  const [previews, setPreviews] = useState<Record<string, string>>({});
  const [taxReturns, setTaxReturns] = useState<any[]>([]);
  
  const [selectedYear, setSelectedYear] = useState<number | "all">("all");
  const [uploadForm, setUploadForm] = useState<{
    title: string;
    type: string;
    year: number;
    file: File | null;
  }>({
    title: "",
    type: "Legal Docs",
    year: new Date().getFullYear(),
    file: null,
  });

  const docTypes = ["Legal Docs", "Banking Info", "Income", "Expenses", "Letters"];
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 8 }, (_, i) => currentYear - i);

  useEffect(() => {
    getProfile();
  }, []);

  useEffect(() => {
    if (user) {
      fetchDocuments(user.id);
    }
  }, [user, selectedYear]); 

  async function getProfile() {
    try {
      setLoading(true);
      const { data: { user }, error: userError } = await supabase.auth.getUser();

      if (userError || !user) {
        router.push("/auth/signin");
        return;
      }

      setUser(user);
      setEmail(user.email || "");

      // Fetch profile data
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (profile) {
        setFirstName(profile.first_name || "");
        setLastName(profile.last_name || "");
        setPhoneNumber(profile.phone_number || "");
      }

      // Fetch documents (initial load handled by separate effect now, but good to keep order if needed. 
      // Actually, removing it from here prevents double fetch since the new useEffect will trigger when 'user' is set.)
      // await fetchDocuments(user.id); 
      
      await fetchTaxReturns(user.id);

    } catch (error) {
      console.error("Error loading user data:", error);
    } finally {
      setLoading(false);
    }
  }

  async function fetchDocuments(userId: string) {
    let query = supabase
      .from("user_documents")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (selectedYear !== "all") {
      query = query.eq("year", selectedYear);
    }

    const { data, error } = await query;

    if (!error && data) {
      setDocuments(data);
    }
  }

  async function fetchTaxReturns(userId: string) {
    let query = supabase
      .from("tax_returns")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (selectedYear !== "all") {
      query = query.eq("year", selectedYear);
    }
    const { data, error } = await query;
    if (!error && data) {
      setTaxReturns(data);
    }
  }

  // Helper to check if file is an image based on mimetype in metadata
  function isImage(mimeType: string) {
    return mimeType?.startsWith("image/");
  }

  useEffect(() => {
    // Generate signed URLs for images
    if (documents.length > 0 && user) {
      documents.forEach(async (doc) => {
        if (isImage(doc.file_type) || isImage(doc.metadata?.mimetype)) {
          const path = doc.file_path || `${user.id}/${doc.name}`;
          const { data } = await supabase.storage
            .from("documents")
            .createSignedUrl(path, 3600); // 1 hour expiry
          
          if (data?.signedUrl) {
            setPreviews((prev) => ({ ...prev, [doc.title || doc.name]: data.signedUrl }));
          }
        }
      });
    }
  }, [documents, user]);

  async function handleUpdateProfile(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      if (!user) return;

      // 1. Update Profile Table
      const { error: profileError } = await supabase
        .from("profiles")
        .upsert({
          id: user.id,
          first_name: firstName,
          last_name: lastName,
          phone_number: phoneNumber,
          updated_at: new Date().toISOString(),
        });

      if (profileError) throw profileError;

      // 2. Update Password if provided
      if (newPassword) {
        const { error: pwError } = await supabase.auth.updateUser({
          password: newPassword,
        });
        if (pwError) throw pwError;
        setNewPassword(""); // Clear after success
      }

      alert("Profile updated successfully!");
    } catch (error: any) {
      alert("Error updating profile: " + error.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    setUploadForm((prev) => ({ ...prev, file, title: file.name }));
  }

  async function handleUploadSubmit(e: React.FormEvent) {
    e.preventDefault();
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

    // Compression
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
      // 1. Upload to Storage
      const { error: uploadError } = await supabase.storage
        .from("documents")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // 2. Insert Metadata to DB
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
      
      await fetchDocuments(user.id);
    } catch (error: any) {
      alert("Error uploading: " + error.message);
    } finally {
      setUploading(false);
    }
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center pt-24">
        <Loader2 className="animate-spin text-zinc-500" />
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold text-zinc-900 dark:text-white">Your Profile</h1>
      <p className="mt-2 text-zinc-600 dark:text-zinc-400">
        Manage your personal information and documents.
      </p>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Column: Uploaded Files */}
        <div className="lg:col-span-4 space-y-6">
          <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-zinc-900 h-fit">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-zinc-900 dark:text-white">My Documents</h2>
              {/* Year Filter */}
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value === "all" ? "all" : Number(e.target.value))}
                className="rounded-lg border border-zinc-200 bg-white px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-800"
              >
                <option value="all">All Years</option>
                {years.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
            {documents.length === 0 ? (
              <p className="text-sm italic text-zinc-500">No documents uploaded yet.</p>
            ) : (
              <ul className="space-y-3">
                {documents.map((doc: any) => (
                  <li
                    key={doc.id}
                    className="flex items-center justify-between rounded-lg border border-zinc-100 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-800/50"
                  >
                    <div className="flex items-center gap-3 overflow-hidden">
                      {(doc.file_type?.startsWith("image/") || doc.metadata?.mimetype?.startsWith("image/")) && previews[doc.title || doc.name] ? (
                         <img
                          src={previews[doc.title || doc.name]}
                          alt={doc.title || doc.name}
                          className="h-10 w-10 rounded object-cover flex-shrink-0"
                        />
                      ) : (
                        <FileText className="h-8 w-8 flex-shrink-0 text-pink-600" />
                      )}
                      <div className="flex flex-col overflow-hidden">
                        <span className="truncate text-sm font-medium text-zinc-700 dark:text-zinc-300" title={doc.title || doc.name}>
                          {doc.title || doc.name}
                        </span>
                        <div className="flex gap-2 text-xs text-zinc-400">
                          <span>{doc.doctype || "Document"}</span>
                          <span>•</span>
                          <span>{doc.year || "N/A"}</span>
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Tax Returns Section */}
          <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-zinc-900 h-fit">
            <h2 className="text-xl font-semibold text-zinc-900 dark:text-white mb-4">Tax Returns</h2>
            {taxReturns.length === 0 ? (
              <p className="text-sm italic text-zinc-500">No tax returns yet.</p>
            ) : (
              <ul className="space-y-3">
                {taxReturns.map((tr: any) => (
                  <li
                    key={tr.id}
                    className="flex items-center justify-between rounded-lg border border-zinc-100 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-800/50"
                  >
                    <div className="flex items-center gap-3 overflow-hidden">
                      <FileText className="h-8 w-8 flex-shrink-0 text-green-600" />
                      <div className="flex flex-col overflow-hidden">
                        <span className="truncate text-sm font-medium text-zinc-700 dark:text-zinc-300" title={tr.title}>
                          {tr.title} · {tr.form_type} · {tr.year}
                        </span>
                        <span className="text-xs text-zinc-400">
                          {(tr.size / 1024).toFixed(1)} KB
                        </span>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        {/* Right Column: Profile & Upload */}
        <div className="lg:col-span-8 space-y-6">
          <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-zinc-900">
            <h2 className="text-xl font-semibold text-zinc-900 dark:text-white">Personal Information</h2>
            <form onSubmit={handleUpdateProfile} className="mt-6 space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    First Name
                  </label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm focus:border-pink-500 focus:ring-pink-500 dark:border-white/15 dark:bg-zinc-800"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    Last Name
                  </label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm focus:border-pink-500 focus:ring-pink-500 dark:border-white/15 dark:bg-zinc-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={email}
                    disabled
                    className="w-full cursor-not-allowed rounded-lg border border-zinc-200 bg-zinc-100 px-3 py-2 text-sm text-zinc-500 dark:border-white/15 dark:bg-zinc-800/50 dark:text-zinc-500"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="(555) 123-4567"
                    className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm focus:border-pink-500 focus:ring-pink-500 dark:border-white/15 dark:bg-zinc-800"
                  />
                </div>
              </div>

              <div className="pt-2">
                <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Change Password
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password to update"
                  className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm focus:border-pink-500 focus:ring-pink-500 dark:border-white/15 dark:bg-zinc-800"
                />
                <p className="mt-1 text-xs text-zinc-500">Leave blank to keep current password.</p>
              </div>

              <div className="pt-4">
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex w-full items-center justify-center rounded-lg bg-pink-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-pink-500 disabled:opacity-50 sm:w-auto"
                >
                  {saving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Changes"
                  )}
                </button>
              </div>
            </form>
          </section>

          <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-zinc-900">
            <h2 className="text-xl font-semibold text-zinc-900 dark:text-white">Upload New Document</h2>
            <p className="mt-1 text-sm text-zinc-500">
              Supported formats: PDF, JPG, PNG. Max 10MB.
            </p>
            
            <form onSubmit={handleUploadSubmit} className="mt-6 space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    Document Title
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 2024 Tax Return"
                    value={uploadForm.title}
                    onChange={(e) => setUploadForm({ ...uploadForm, title: e.target.value })}
                    className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm focus:border-pink-500 focus:ring-pink-500 dark:border-white/15 dark:bg-zinc-800"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    Document Type
                  </label>
                  <select
                    value={uploadForm.type}
                    onChange={(e) => setUploadForm({ ...uploadForm, type: e.target.value })}
                    className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm focus:border-pink-500 focus:ring-pink-500 dark:border-white/15 dark:bg-zinc-800"
                  >
                    {docTypes.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Tax Year
                </label>
                <select
                  value={uploadForm.year}
                  onChange={(e) => setUploadForm({ ...uploadForm, year: Number(e.target.value) })}
                  className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm focus:border-pink-500 focus:ring-pink-500 dark:border-white/15 dark:bg-zinc-800"
                >
                  {years.map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className={`flex w-full cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed transition-colors ${
                  uploadForm.file ? "border-pink-500 bg-pink-50 dark:bg-pink-900/10" : "border-zinc-300 bg-zinc-50 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-800"
                } py-8`}>
                  <div className="flex flex-col items-center justify-center pb-4 pt-4">
                    {uploading ? (
                      <Loader2 className="mb-2 h-10 w-10 animate-spin text-zinc-400" />
                    ) : uploadForm.file ? (
                      <Check className="mb-2 h-10 w-10 text-pink-600" />
                    ) : (
                      <Upload className="mb-2 h-10 w-10 text-zinc-400" />
                    )}
                    
                    {uploadForm.file ? (
                      <p className="text-sm font-medium text-pink-600">{uploadForm.file.name}</p>
                    ) : (
                      <>
                        <p className="mb-1 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                          Click to select or drag file
                        </p>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">PDF, PNG, JPG (MAX. 10MB)</p>
                      </>
                    )}
                  </div>
                  <input
                    type="file"
                    className="hidden"
                    onChange={handleFileSelect}
                    disabled={uploading}
                  />
                </label>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={uploading || !uploadForm.file}
                  className="inline-flex w-full items-center justify-center rounded-lg bg-pink-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-pink-500 disabled:opacity-50 sm:w-auto"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    "Upload Document"
                  )}
                </button>
              </div>
            </form>
          </section>
        </div>
      </div>
    </main>
  );
}
