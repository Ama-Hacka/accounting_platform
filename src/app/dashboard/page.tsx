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

  useEffect(() => {
    getProfile();
  }, []);

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

      // Fetch documents
      await fetchDocuments(user.id);

    } catch (error) {
      console.error("Error loading user data:", error);
    } finally {
      setLoading(false);
    }
  }

  async function fetchDocuments(userId: string) {
    const { data, error } = await supabase.storage
      .from("documents")
      .list(userId + "/"); // Assuming we organize files by folders matching user ID

    if (!error && data) {
      setDocuments(data);
    }
  }

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

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.files || e.target.files.length === 0) return;
    if (!user) return;

    let file = e.target.files[0];

    // 1. Prompt for file name
    const customName = window.prompt("Enter a name for this file:", file.name);
    if (!customName) return; // User cancelled

    setUploading(true);

    // Validation
    const MAX_SIZE_MB = 10;
    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
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

    // Compression for images
    if (file.type.startsWith("image/")) {
      try {
        const options = {
          maxSizeMB: 1,
          maxWidthOrHeight: 1920,
          useWebWorker: true,
        };
        const compressedFile = await imageCompression(file, options);
        // Only use compressed if it's actually smaller
        if (compressedFile.size < file.size) {
          file = compressedFile;
        }
      } catch (err) {
        console.warn("Image compression failed, using original.", err);
      }
    }

    const fileExt = file.name.split(".").pop();
    // Use the custom name + timestamp + original extension
    const safeName = customName.replace(/[^a-zA-Z0-9-_ ]/g, "").trim() || "file";
    const filePath = `${user.id}/${Date.now()}_${safeName}.${fileExt}`;

    try {
      const { error: uploadError } = await supabase.storage
        .from("documents")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      await fetchDocuments(user.id);
    } catch (error: any) {
      alert("Error uploading file: " + error.message);
    } finally {
      setUploading(false);
    }
  }

  const [previews, setPreviews] = useState<Record<string, string>>({});
  const [returnedDocuments, setReturnedDocuments] = useState<any[]>([]);

  // Helper to check if file is an image based on mimetype in metadata
  function isImage(mimeType: string) {
    return mimeType?.startsWith("image/");
  }

  useEffect(() => {
    // Generate signed URLs for images
    if (documents.length > 0 && user) {
      documents.forEach(async (doc) => {
        if (isImage(doc.metadata?.mimetype)) {
          const { data } = await supabase.storage
            .from("documents")
            .createSignedUrl(`${user.id}/${doc.name}`, 3600); // 1 hour expiry
          
          if (data?.signedUrl) {
            setPreviews((prev) => ({ ...prev, [doc.name]: data.signedUrl }));
          }
        }
      });
    }
  }, [documents, user]);

  useEffect(() => {
    // Fetch returned documents when user is loaded
    if (user) {
      fetchReturnedDocuments(user.id);
    }
  }, [user]);

  async function fetchReturnedDocuments(userId: string) {
    // Fetch files from 'returned_documents' bucket that start with userId
    const { data, error } = await supabase.storage
      .from("returned_documents")
      .list(userId + "/");

    if (!error && data) {
      setReturnedDocuments(data);
    }
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center pt-24">
        <Loader2 className="animate-spin text-zinc-500" />
      </main>
    );
  }

  return <DashboardContent 
    user={user} 
    firstName={firstName} setFirstName={setFirstName}
    lastName={lastName} setLastName={setLastName}
    email={email}
    phoneNumber={phoneNumber} setPhoneNumber={setPhoneNumber}
    newPassword={newPassword} setNewPassword={setNewPassword}
    handleUpdateProfile={handleUpdateProfile}
    saving={saving}
    uploading={uploading}
    handleFileUpload={handleFileUpload}
    documents={documents}
    previews={previews}
    returnedDocuments={returnedDocuments}
  />;
}

// Sub-component ...

function DashboardContent({
  user, firstName, setFirstName, lastName, setLastName, email, phoneNumber, setPhoneNumber,
  newPassword, setNewPassword, handleUpdateProfile, saving, uploading, handleFileUpload, documents, previews, returnedDocuments
}: any) {
  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold text-zinc-900 dark:text-white">Your Profile</h1>
      <p className="mt-2 text-zinc-600 dark:text-zinc-400">
        Manage your personal information and documents.
      </p>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Column: Uploaded Files (Takes 4 columns on large screens) */}
        <div className="lg:col-span-4 space-y-6">
          <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-zinc-900 h-fit">
            <h2 className="text-xl font-semibold text-zinc-900 dark:text-white mb-4">My Documents</h2>
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
                      {doc.metadata?.mimetype?.startsWith("image/") && previews[doc.name] ? (
                        <img
                          src={previews[doc.name]}
                          alt={doc.name}
                          className="h-10 w-10 rounded object-cover flex-shrink-0"
                        />
                      ) : (
                        <FileText className="h-8 w-8 flex-shrink-0 text-pink-600" />
                      )}
                      <div className="flex flex-col overflow-hidden">
                        <span className="truncate text-sm font-medium text-zinc-700 dark:text-zinc-300" title={doc.name.replace(/^\d+_/, "")}>
                          {doc.name.replace(/^\d+_/, "")}
                        </span>
                        <span className="text-xs text-zinc-400">
                          {(doc.metadata?.size / 1024).toFixed(1)} KB
                        </span>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Returned Documents Section */}
          <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-zinc-900 h-fit">
            <h2 className="text-xl font-semibold text-zinc-900 dark:text-white mb-4">Tax Returns</h2>
            {returnedDocuments.length === 0 ? (
              <p className="text-sm italic text-zinc-500">No documents returned yet.</p>
            ) : (
              <ul className="space-y-3">
                {returnedDocuments.map((doc: any) => (
                  <li
                    key={doc.id}
                    className="flex items-center justify-between rounded-lg border border-zinc-100 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-800/50"
                  >
                    <div className="flex items-center gap-3 overflow-hidden">
                      <FileText className="h-8 w-8 flex-shrink-0 text-green-600" />
                      <div className="flex flex-col overflow-hidden">
                        <span className="truncate text-sm font-medium text-zinc-700 dark:text-zinc-300" title={doc.name.replace(/^\d+_/, "")}>
                          {doc.name.replace(/^\d+_/, "")}
                        </span>
                        <span className="text-xs text-zinc-400">
                          {(doc.metadata?.size / 1024).toFixed(1)} KB
                        </span>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        {/* Right Column: Profile & Upload (Takes 8 columns on large screens) */}
        <div className="lg:col-span-8 space-y-6">
          {/* Profile Form */}
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

          {/* Upload Area */}
          <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-zinc-900">
            <h2 className="text-xl font-semibold text-zinc-900 dark:text-white">Upload New Document</h2>
            <p className="mt-1 text-sm text-zinc-500">
              Supported formats: PDF, JPG, PNG. Max 10MB.
            </p>
            <div className="mt-6">
              <label className="flex w-full cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-zinc-300 bg-zinc-50 py-12 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:border-zinc-500 dark:hover:bg-zinc-800">
                <div className="flex flex-col items-center justify-center pb-6 pt-5">
                  {uploading ? (
                    <Loader2 className="mb-3 h-12 w-12 animate-spin text-zinc-400" />
                  ) : (
                    <Upload className="mb-3 h-12 w-12 text-zinc-400" />
                  )}
                  <p className="mb-2 text-lg font-medium text-zinc-700 dark:text-zinc-300">
                    Click to upload or drag and drop
                  </p>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">PDF, PNG, JPG (MAX. 10MB)</p>
                </div>
                <input
                  type="file"
                  className="hidden"
                  onChange={handleFileUpload}
                  disabled={uploading}
                />
              </label>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
