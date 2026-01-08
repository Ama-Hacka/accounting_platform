"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

// Dashboard Components
import DashboardNavbar from "@/components/dashboard/DashboardNavbar";
import DashboardTab from "@/components/dashboard/DashboardTab";
import ProfileTab from "@/components/dashboard/ProfileTab";
import TaxesTab from "@/components/dashboard/TaxesTab";
import DocumentsTab from "@/components/dashboard/DocumentsTab";

type TabType = "dashboard" | "profile" | "taxes" | "documents";

interface Profile {
  first_name?: string;
  last_name?: string;
  phone_number?: string;
  address?: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [email, setEmail] = useState("");

  // Tab state
  const [activeTab, setActiveTab] = useState<TabType>("dashboard");

  // Data states
  const [documents, setDocuments] = useState<any[]>([]);
  const [taxReturns, setTaxReturns] = useState<any[]>([]);

  // Questionnaire state
  const [questionnaireStatus, setQuestionnaireStatus] = useState<"not_started" | "in_progress" | "submitted">("not_started");
  const [questionnaireProgress, setQuestionnaireProgress] = useState(0);

  useEffect(() => {
    getProfile();
  }, []);

  useEffect(() => {
    if (user) {
      fetchDocuments(user.id);
      fetchTaxReturns(user.id);
    }
  }, [user]);

  async function getProfile() {
    try {
      setLoading(true);
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        router.push("/auth/signin");
        return;
      }

      setUser(user);
      setEmail(user.email || "");

      // Fetch profile data
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (profileData) {
        setProfile({
          first_name: profileData.first_name || "",
          last_name: profileData.last_name || "",
          phone_number: profileData.phone_number || "",
          address: profileData.address || "",
        });
      }
    } catch (error) {
      console.error("Error loading user data:", error);
    } finally {
      setLoading(false);
    }
  }

  async function fetchDocuments(userId: string) {
    const { data, error } = await supabase
      .from("user_documents")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (!error && data) {
      setDocuments(data);
    }
  }

  async function fetchTaxReturns(userId: string) {
    const { data, error } = await supabase
      .from("tax_returns")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (!error && data) {
      setTaxReturns(data);
    }
  }

  const handleUpdateProfile = async (data: {
    firstName: string;
    lastName: string;
    phoneNumber: string;
    address: string;
    newPassword?: string;
  }) => {
    if (!user) return;

    // Update Profile Table
    const { error: profileError } = await supabase.from("profiles").upsert({
      id: user.id,
      first_name: data.firstName,
      last_name: data.lastName,
      phone_number: data.phoneNumber,
      address: data.address,
      updated_at: new Date().toISOString(),
    });

    if (profileError) throw profileError;

    // Update Password if provided
    if (data.newPassword) {
      const { error: pwError } = await supabase.auth.updateUser({
        password: data.newPassword,
      });
      if (pwError) throw pwError;
    }

    // Update local state
    setProfile({
      first_name: data.firstName,
      last_name: data.lastName,
      phone_number: data.phoneNumber,
      address: data.address,
    });
  };

  const handleQuestionnaireStatusChange = useCallback(
    (status: "not_started" | "in_progress" | "submitted", progress: number) => {
      setQuestionnaireStatus(status);
      setQuestionnaireProgress(progress);
    },
    []
  );

  const handleDocumentUploaded = () => {
    if (user) {
      fetchDocuments(user.id);
    }
  };

  const handleNavigateToTaxes = () => {
    setActiveTab("taxes");
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-pink-600" />
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      {/* Custom Dashboard Navbar */}
      <DashboardNavbar
        activeTab={activeTab}
        onTabChange={(tab) => setActiveTab(tab as TabType)}
        user={user}
        profile={profile}
      />

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 pt-24 md:pt-20">
        {/* Dashboard Tab */}
        {activeTab === "dashboard" && (
          <DashboardTab
            user={user}
            profile={profile}
            onNavigateToTaxes={handleNavigateToTaxes}
            taxReturns={taxReturns}
            questionnaireStatus={questionnaireStatus}
            questionnaireProgress={questionnaireProgress}
          />
        )}

        {/* Profile Tab */}
        {activeTab === "profile" && (
          <ProfileTab
            user={user}
            profile={profile}
            email={email}
            onUpdateProfile={handleUpdateProfile}
          />
        )}

        {/* Taxes Tab */}
        {activeTab === "taxes" && (
          <TaxesTab
            user={user}
            profile={profile}
            questionnaireStatus={questionnaireStatus}
            questionnaireProgress={questionnaireProgress}
            onStatusChange={handleQuestionnaireStatusChange}
          />
        )}

        {/* Documents Tab */}
        {activeTab === "documents" && (
          <DocumentsTab
            user={user}
            documents={documents}
            taxReturns={taxReturns}
            onDocumentUploaded={handleDocumentUploaded}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-200 bg-white py-6 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              © {new Date().getFullYear()} IC Multi Services LLC. All rights reserved.
            </p>
            <div className="flex items-center gap-6">
              <a href="#" className="text-xs text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300">
                Privacy Policy
              </a>
              <a href="#" className="text-xs text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300">
                Terms of Service
              </a>
              <a href="/support" className="text-xs text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300">
                Support
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
