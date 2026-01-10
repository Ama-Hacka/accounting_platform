"use client";

import { 
  ClipboardList, 
  ArrowRight, 
  FileText, 
  Download, 
  Bell, 
  Calendar,
  CheckCircle2,
  Clock,
  AlertCircle
} from "lucide-react";

interface DashboardTabProps {
  user: any;
  profile: { first_name?: string; last_name?: string } | null;
  onNavigateToTaxes: () => void;
  documents: any[];
  taxReturns: any[];
  questionnaireStatus: "not_started" | "in_progress" | "submitted";
  questionnaireProgress: number;
}

export default function DashboardTab({
  user,
  profile,
  onNavigateToTaxes,
  documents,
  taxReturns,
  questionnaireStatus,
  questionnaireProgress,
}: DashboardTabProps) {
  const currentYear = new Date().getFullYear();
  const taxYear = currentYear - 1;
  const displayName = profile?.first_name || user?.email?.split("@")[0] || "there";

  // Get last year's tax return if available
  const lastYearReturn = taxReturns.find((tr) => tr.year === currentYear - 1);

  // Combine documents and tax returns for recent documents view
  const allDocuments = [
    ...documents.map((doc) => ({
      id: doc.id,
      title: doc.title || doc.doctype,
      subtitle: `${doc.doctype} • ${doc.year}`,
      created_at: doc.created_at,
      type: "document" as const,
      url: doc.url,
    })),
    ...taxReturns.map((tr) => ({
      id: tr.id,
      title: tr.title,
      subtitle: `${tr.form_type} • ${tr.year}`,
      created_at: tr.created_at,
      type: "tax_return" as const,
      url: tr.file_url,
    })),
  ]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5);

  const statusConfig = {
    not_started: {
      label: "Not Started",
      color: "text-amber-600 bg-amber-50 dark:bg-amber-900/20 dark:text-amber-400",
      icon: AlertCircle,
      buttonText: "Start Questionnaire",
    },
    in_progress: {
      label: "In Progress",
      color: "text-blue-600 bg-blue-50 dark:bg-blue-900/20 dark:text-blue-400",
      icon: Clock,
      buttonText: "Continue Questionnaire",
    },
    submitted: {
      label: "Submitted",
      color: "text-green-600 bg-green-50 dark:bg-green-900/20 dark:text-green-400",
      icon: CheckCircle2,
      buttonText: "View Questionnaire",
    },
  };

  const status = statusConfig[questionnaireStatus];
  const StatusIcon = status.icon;

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white sm:text-3xl">
          Welcome back, {displayName}
        </h1>
        <p className="mt-2 text-zinc-600 dark:text-zinc-400">
          Here&apos;s what&apos;s happening with your accounts today.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Main Content - Left Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Tax Questionnaire Card - Primary CTA */}
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-zinc-900">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-4">
                  <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${status.color}`}>
                    <StatusIcon size={14} />
                    {status.label}
                  </span>
                </div>
                <h2 className="text-xl font-semibold text-zinc-900 dark:text-white">
                  {taxYear} Tax Questionnaire
                </h2>
                <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                  Complete your annual questionnaire to begin your tax filing process.
                </p>

                {/* Progress Bar */}
                {questionnaireStatus !== "not_started" && (
                  <div className="mt-4">
                    <div className="flex items-center justify-between text-sm mb-2">
                      <span className="text-zinc-600 dark:text-zinc-400">Progress</span>
                      <span className="font-medium text-zinc-900 dark:text-white">{questionnaireProgress}%</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-zinc-100 dark:bg-zinc-800">
                      <div 
                        className="h-2 rounded-full bg-red-600 transition-all duration-300"
                        style={{ width: `${questionnaireProgress}%` }}
                      />
                    </div>
                  </div>
                )}

                <button
                  onClick={onNavigateToTaxes}
                  className="mt-6 inline-flex items-center gap-2 rounded-lg bg-red-600 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-red-700"
                >
                  {status.buttonText}
                  <ArrowRight size={16} />
                </button>
              </div>
              <div className="hidden sm:block ml-6">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-red-100 dark:bg-red-900/30">
                  <ClipboardList className="h-8 w-8 text-red-600 dark:text-red-400" />
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-zinc-100 dark:border-zinc-800">
              <div className="flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400">
                <Calendar size={14} />
                <span>Due date: April 15, {taxYear + 1}</span>
              </div>
            </div>
          </div>

          {/* Recent Documents Card */}
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-zinc-900">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">
                Recent Documents
              </h2>
              <button 
                onClick={onNavigateToTaxes}
                className="text-sm font-medium text-red-600 hover:text-red-700 dark:text-red-400"
              >
                View All
              </button>
            </div>

            <div className="space-y-3">
              {allDocuments.length > 0 ? (
                allDocuments.map((doc) => (
                  <div 
                    key={`${doc.type}-${doc.id}`}
                    className="flex items-center justify-between rounded-lg border border-zinc-100 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-800/50"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                        doc.type === "document" 
                          ? "bg-blue-100 dark:bg-blue-900/30" 
                          : "bg-red-100 dark:bg-red-900/30"
                      }`}>
                        <FileText className={`h-5 w-5 ${
                          doc.type === "document" 
                            ? "text-blue-600 dark:text-blue-400" 
                            : "text-red-600 dark:text-red-400"
                        }`} />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-zinc-900 dark:text-white">
                          {doc.title}
                        </p>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">
                          {doc.subtitle}
                        </p>
                      </div>
                    </div>
                    {doc.url && (
                      <a 
                        href={doc.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="p-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
                      >
                        <Download size={16} />
                      </a>
                    )}
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800 mb-3">
                    <FileText className="h-6 w-6 text-zinc-400" />
                  </div>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    No documents available yet
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="space-y-6">
          {/* Important Notices */}
          <div className="rounded-2xl border border-red-200 bg-gradient-to-br from-red-50 to-white p-6 shadow-sm dark:border-red-900/50 dark:from-red-900/20 dark:to-zinc-900">
            <div className="flex items-center gap-2 mb-4">
              <Bell className="h-5 w-5 text-red-600 dark:text-red-400" />
              <h3 className="font-semibold text-zinc-900 dark:text-white">
                Important Notices
              </h3>
            </div>

            <div className="space-y-4">
              <div className="border-b border-red-100 pb-4 dark:border-red-900/30">
                <h4 className="text-sm font-medium text-zinc-900 dark:text-white">
                  New Tax Laws for {currentYear}
                </h4>
                <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
                  Review the changes that might impact your small business filings this year.
                </p>
                <button className="mt-2 text-xs font-medium text-red-600 hover:text-red-700 dark:text-red-400">
                  Read more
                </button>
              </div>

              <div>
                <h4 className="text-sm font-medium text-zinc-900 dark:text-white">
                  Holiday Hours
                </h4>
                <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
                  Our offices will be closed from December 24th to January 2nd.
                </p>
              </div>
            </div>
          </div>

          {/* Last Year's Summary */}
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-zinc-900">
            <div className="flex items-center gap-2 mb-4">
              <Clock className="h-5 w-5 text-zinc-400" />
              <h3 className="font-semibold text-zinc-900 dark:text-white">
                Last Year&apos;s Summary
              </h3>
            </div>

            {lastYearReturn ? (
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-zinc-600 dark:text-zinc-400">Tax Year</span>
                  <span className="text-sm font-medium text-zinc-900 dark:text-white">{currentYear - 1}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-zinc-600 dark:text-zinc-400">Total Refund</span>
                  <span className="text-sm font-medium text-green-600 dark:text-green-400">
                    +${lastYearReturn.refund_amount?.toLocaleString() || "0"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-zinc-600 dark:text-zinc-400">Status</span>
                  <span className="text-sm font-medium text-zinc-900 dark:text-white">Finalized</span>
                </div>

                <button className="mt-4 w-full flex items-center justify-center gap-2 rounded-lg border border-zinc-200 bg-white px-4 py-2.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700">
                  <Download size={16} />
                  Download {currentYear - 1} Tax Return PDF
                </button>
              </div>
            ) : (
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                No previous tax return data available.
              </p>
            )}
          </div>

          {/* Need Help Card */}
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-zinc-900">
            <h3 className="font-semibold text-red-600 dark:text-red-400 mb-2">
              Need help?
            </h3>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
              Your dedicated accountant is here to assist you with any questions.
            </p>
            <button className="w-full rounded-lg border-2 border-red-600 px-4 py-2.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 dark:border-red-500 dark:text-red-400 dark:hover:bg-red-900/20">
              Message Your Advisor
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
