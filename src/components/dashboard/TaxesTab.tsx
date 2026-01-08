"use client";

import { useState, useEffect, useCallback } from "react";
import {
  FileSignature,
  ClipboardList,
  FolderCheck,
  CheckCircle2,
  Circle,
  Download,
  Upload,
  Loader2,
  ChevronRight,
  AlertCircle,
  MessageCircle,
  HelpCircle,
  Check,
  X,
  Minus,
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import imageCompression from "browser-image-compression";

interface TaxesTabProps {
  user: any;
  profile: { first_name?: string; last_name?: string } | null;
  questionnaireStatus: "not_started" | "in_progress" | "submitted";
  questionnaireProgress: number;
  onStatusChange: (status: "not_started" | "in_progress" | "submitted", progress: number) => void;
}

type TaxSection = "engagement" | "questionnaire" | "checklist";

interface QuestionnaireAnswer {
  questionId: string;
  answer: "yes" | "no" | "na" | null;
  notes?: string;
}

interface ChecklistItem {
  id: string;
  label: string;
  required: boolean;
  status: "pending" | "uploaded" | "na";
  fileId?: string;
}

// Sample questionnaire questions
const questionnaireQuestions = [
  {
    id: "q1",
    category: "Personal Information",
    question: "Did your marital status change during the tax year?",
    hasNotes: true,
  },
  {
    id: "q2",
    category: "Personal Information",
    question: "Did you have any dependents during the tax year?",
    hasNotes: true,
  },
  {
    id: "q3",
    category: "Income",
    question: "Did you receive W-2 wages from an employer?",
    hasNotes: false,
  },
  {
    id: "q4",
    category: "Income",
    question: "Did you receive any 1099 income (freelance, contract work)?",
    hasNotes: true,
  },
  {
    id: "q5",
    category: "Income",
    question: "Did you receive any rental income?",
    hasNotes: true,
  },
  {
    id: "q6",
    category: "Deductions",
    question: "Did you make any charitable contributions?",
    hasNotes: true,
  },
  {
    id: "q7",
    category: "Deductions",
    question: "Did you pay mortgage interest on your primary residence?",
    hasNotes: false,
  },
  {
    id: "q8",
    category: "Deductions",
    question: "Did you have any medical expenses exceeding 7.5% of your income?",
    hasNotes: true,
  },
  {
    id: "q9",
    category: "Credits",
    question: "Did you pay for childcare expenses?",
    hasNotes: true,
  },
  {
    id: "q10",
    category: "Credits",
    question: "Did you contribute to a retirement account (401k, IRA)?",
    hasNotes: true,
  },
];

// Document checklist items
const initialChecklist: ChecklistItem[] = [
  { id: "doc1", label: "W-2 Forms (all employers)", required: true, status: "pending" },
  { id: "doc2", label: "1099 Forms (freelance/contract income)", required: false, status: "pending" },
  { id: "doc3", label: "1099-INT / 1099-DIV (interest/dividends)", required: false, status: "pending" },
  { id: "doc4", label: "Government-issued ID (Driver's License or Passport)", required: true, status: "pending" },
  { id: "doc5", label: "Social Security Card", required: true, status: "pending" },
  { id: "doc6", label: "Last year's tax return", required: false, status: "pending" },
  { id: "doc7", label: "Mortgage Interest Statement (Form 1098)", required: false, status: "pending" },
  { id: "doc8", label: "Property tax statements", required: false, status: "pending" },
  { id: "doc9", label: "Charitable contribution receipts", required: false, status: "pending" },
  { id: "doc10", label: "Medical expense receipts", required: false, status: "pending" },
];

export default function TaxesTab({
  user,
  profile,
  questionnaireStatus,
  questionnaireProgress,
  onStatusChange,
}: TaxesTabProps) {
  const currentYear = new Date().getFullYear();
  const [activeSection, setActiveSection] = useState<TaxSection>("engagement");
  const [engagementSigned, setEngagementSigned] = useState(false);
  const [answers, setAnswers] = useState<QuestionnaireAnswer[]>([]);
  const [checklist, setChecklist] = useState<ChecklistItem[]>(initialChecklist);
  const [uploading, setUploading] = useState<string | null>(null);
  const [autoSaving, setAutoSaving] = useState(false);

  // Calculate progress based on completed items
  const calculateProgress = useCallback(() => {
    let completed = 0;
    let total = 0;

    // Engagement letter counts as 1 step
    total += 1;
    if (engagementSigned) completed += 1;

    // Each question counts
    total += questionnaireQuestions.length;
    completed += answers.filter((a) => a.answer !== null).length;

    // Each required checklist item counts
    const requiredDocs = checklist.filter((c) => c.required);
    total += requiredDocs.length;
    completed += requiredDocs.filter((c) => c.status !== "pending").length;

    return Math.round((completed / total) * 100);
  }, [engagementSigned, answers, checklist]);

  // Update parent component with progress changes
  useEffect(() => {
    const progress = calculateProgress();
    let status: "not_started" | "in_progress" | "submitted" = "not_started";
    
    if (progress === 100) {
      status = "submitted";
    } else if (progress > 0) {
      status = "in_progress";
    }
    
    onStatusChange(status, progress);
  }, [calculateProgress, onStatusChange]);

  // Auto-save answers (simulated)
  const handleAnswerChange = async (questionId: string, answer: "yes" | "no" | "na" | null, notes?: string) => {
    setAutoSaving(true);
    
    setAnswers((prev) => {
      const existing = prev.find((a) => a.questionId === questionId);
      if (existing) {
        return prev.map((a) =>
          a.questionId === questionId ? { ...a, answer, notes } : a
        );
      }
      return [...prev, { questionId, answer, notes }];
    });

    // Simulate auto-save delay
    setTimeout(() => setAutoSaving(false), 500);
  };

  // Handle document upload for checklist
  const handleChecklistUpload = async (itemId: string, file: File) => {
    if (!user) return;
    setUploading(itemId);

    try {
      // Compress if image
      let processedFile = file;
      if (file.type.startsWith("image/")) {
        const options = { maxSizeMB: 1, maxWidthOrHeight: 1920, useWebWorker: true };
        const compressed = await imageCompression(file, options);
        if (compressed.size < file.size) processedFile = compressed;
      }

      const fileExt = file.name.split(".").pop();
      const safeName = `${Date.now()}_checklist_${itemId}.${fileExt}`;
      const filePath = `${user.id}/${safeName}`;

      const { error: uploadError } = await supabase.storage
        .from("documents")
        .upload(filePath, processedFile);

      if (uploadError) throw uploadError;

      // Update checklist status
      setChecklist((prev) =>
        prev.map((item) =>
          item.id === itemId ? { ...item, status: "uploaded" as const, fileId: filePath } : item
        )
      );
    } catch (error: any) {
      alert("Error uploading: " + error.message);
    } finally {
      setUploading(null);
    }
  };

  // Mark checklist item as N/A
  const handleMarkNA = (itemId: string) => {
    setChecklist((prev) =>
      prev.map((item) =>
        item.id === itemId ? { ...item, status: "na" as const } : item
      )
    );
  };

  const sections = [
    { id: "engagement" as TaxSection, label: "Engagement Letter", icon: FileSignature, completed: engagementSigned },
    { id: "questionnaire" as TaxSection, label: "Questionnaire", icon: ClipboardList, completed: answers.filter(a => a.answer !== null).length === questionnaireQuestions.length },
    { id: "checklist" as TaxSection, label: "Document Checklist", icon: FolderCheck, completed: checklist.filter(c => c.required).every(c => c.status !== "pending") },
  ];

  // Group questions by category
  const groupedQuestions = questionnaireQuestions.reduce((acc, q) => {
    if (!acc[q.category]) acc[q.category] = [];
    acc[q.category].push(q);
    return acc;
  }, {} as Record<string, typeof questionnaireQuestions>);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white sm:text-3xl">
          {currentYear} Tax Questionnaire
        </h1>
        <p className="mt-2 text-zinc-600 dark:text-zinc-400">
          Complete the following steps to finalize your tax preparation documents.
        </p>
      </div>

      {/* Progress Steps */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-zinc-900">
        <div className="flex items-center justify-between">
          {sections.map((section, index) => {
            const Icon = section.icon;
            const isActive = activeSection === section.id;
            const isCompleted = section.completed;

            return (
              <div key={section.id} className="flex items-center flex-1">
                <button
                  onClick={() => setActiveSection(section.id)}
                  className={`flex flex-col items-center gap-2 flex-1 ${
                    isActive ? "opacity-100" : "opacity-60 hover:opacity-80"
                  }`}
                >
                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-full transition-colors ${
                      isCompleted
                        ? "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400"
                        : isActive
                        ? "bg-pink-100 text-pink-600 dark:bg-pink-900/30 dark:text-pink-400"
                        : "bg-zinc-100 text-zinc-400 dark:bg-zinc-800"
                    }`}
                  >
                    {isCompleted ? <CheckCircle2 size={24} /> : <Icon size={24} />}
                  </div>
                  <span
                    className={`text-sm font-medium ${
                      isActive ? "text-pink-600 dark:text-pink-400" : "text-zinc-600 dark:text-zinc-400"
                    }`}
                  >
                    {section.label}
                  </span>
                </button>
                {index < sections.length - 1 && (
                  <div className="hidden sm:block flex-1 h-0.5 bg-zinc-200 dark:bg-zinc-700 mx-4" />
                )}
              </div>
            );
          })}
        </div>

        {/* Overall Progress */}
        <div className="mt-6 pt-4 border-t border-zinc-100 dark:border-zinc-800">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-zinc-600 dark:text-zinc-400">Overall Progress</span>
            <span className="font-medium text-zinc-900 dark:text-white">{calculateProgress()}%</span>
          </div>
          <div className="h-2 w-full rounded-full bg-zinc-100 dark:bg-zinc-800">
            <div
              className="h-2 rounded-full bg-pink-600 transition-all duration-300"
              style={{ width: `${calculateProgress()}%` }}
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2">
          {/* Engagement Letter Section */}
          {activeSection === "engagement" && (
            <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-zinc-900">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">
                  {currentYear}_Engagement_Letter.pdf
                </h2>
                <div className="flex gap-2">
                  <button className="p-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300">
                    <Download size={18} />
                  </button>
                </div>
              </div>

              {/* Simulated Document Preview */}
              <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-8 dark:border-zinc-700 dark:bg-zinc-800/50 mb-6">
                <div className="max-w-lg mx-auto space-y-6 text-sm text-zinc-700 dark:text-zinc-300">
                  <h3 className="text-center text-lg font-bold text-zinc-900 dark:text-white">
                    ENGAGEMENT AGREEMENT
                  </h3>
                  <p className="text-center text-xs text-zinc-500">
                    Professional Tax Preparation Services • {currentYear} Fiscal Year
                  </p>

                  <p>
                    This agreement (the &quot;Agreement&quot;) confirms the terms and conditions under which{" "}
                    <strong>IC Multi Services</strong> (&quot;we&quot;, &quot;us&quot;, &quot;our&quot;) will provide
                    professional tax services to{" "}
                    <strong>
                      {profile?.first_name} {profile?.last_name}
                    </strong>{" "}
                    (&quot;you&quot;, &quot;your&quot;).
                  </p>

                  <div>
                    <h4 className="font-semibold text-zinc-900 dark:text-white">1. Scope of Services</h4>
                    <p className="mt-1">
                      We will prepare your federal and state individual income tax returns for the year ending
                      December 31, {currentYear}. This engagement is limited to the professional services outlined
                      herein and does not include auditing or review services.
                    </p>
                  </div>

                  <div>
                    <h4 className="font-semibold text-zinc-900 dark:text-white">2. Your Responsibilities</h4>
                    <p className="mt-1">
                      You are responsible for the completeness and accuracy of the information provided to us. You
                      should retain all documents, canceled checks, and other data that form the basis of income and
                      deductions.
                    </p>
                  </div>

                  <div>
                    <h4 className="font-semibold text-zinc-900 dark:text-white">3. Fees</h4>
                    <p className="mt-1">
                      Our fees for these services will be based on the complexity of your returns and the time
                      required by our professionals. An initial estimate has been provided in your portal dashboard.
                    </p>
                  </div>

                  <div className="pt-4 border-t border-zinc-200 dark:border-zinc-700 flex justify-between items-end">
                    <div>
                      <p className="text-xs text-zinc-500 uppercase">Client Signature</p>
                      <p className="italic text-zinc-400">
                        {engagementSigned ? `${profile?.first_name} ${profile?.last_name}` : "Sign electronically below..."}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-zinc-500 uppercase">Date</p>
                      <p>{new Date().toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Sign Button */}
              {!engagementSigned ? (
                <div className="flex gap-4">
                  <button
                    onClick={() => setEngagementSigned(true)}
                    className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-pink-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-pink-500"
                  >
                    <FileSignature size={18} />
                    E-Sign Document
                  </button>
                  <button className="px-6 py-3 text-sm font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white">
                    Save as Draft
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-3 rounded-lg bg-green-50 border border-green-200 p-4 dark:bg-green-900/20 dark:border-green-900">
                  <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                  <span className="text-sm font-medium text-green-700 dark:text-green-300">
                    Document signed successfully on {new Date().toLocaleDateString()}
                  </span>
                  <button className="ml-auto text-sm font-medium text-green-600 hover:text-green-700 dark:text-green-400 flex items-center gap-1">
                    <Download size={14} />
                    Download Copy
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Questionnaire Section */}
          {activeSection === "questionnaire" && (
            <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-zinc-900">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">Tax Questionnaire</h2>
                {autoSaving && (
                  <span className="flex items-center gap-2 text-xs text-zinc-500">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Auto-saving...
                  </span>
                )}
              </div>

              <div className="space-y-8">
                {Object.entries(groupedQuestions).map(([category, questions]) => (
                  <div key={category}>
                    <h3 className="text-sm font-semibold text-zinc-900 dark:text-white mb-4 pb-2 border-b border-zinc-100 dark:border-zinc-800">
                      {category}
                    </h3>
                    <div className="space-y-4">
                      {questions.map((q) => {
                        const currentAnswer = answers.find((a) => a.questionId === q.id);
                        return (
                          <div
                            key={q.id}
                            className="rounded-lg border border-zinc-100 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-800/50"
                          >
                            <p className="text-sm font-medium text-zinc-900 dark:text-white mb-3">
                              {q.question}
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {(["yes", "no", "na"] as const).map((option) => (
                                <button
                                  key={option}
                                  onClick={() => handleAnswerChange(q.id, option)}
                                  className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                                    currentAnswer?.answer === option
                                      ? option === "yes"
                                        ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                                        : option === "no"
                                        ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                                        : "bg-zinc-200 text-zinc-700 dark:bg-zinc-700 dark:text-zinc-300"
                                      : "bg-white border border-zinc-200 text-zinc-600 hover:bg-zinc-50 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-700"
                                  }`}
                                >
                                  {option === "yes" && <Check size={14} />}
                                  {option === "no" && <X size={14} />}
                                  {option === "na" && <Minus size={14} />}
                                  {option === "na" ? "N/A" : option.charAt(0).toUpperCase() + option.slice(1)}
                                </button>
                              ))}
                            </div>
                            {q.hasNotes && currentAnswer?.answer && currentAnswer.answer !== "na" && (
                              <div className="mt-3">
                                <textarea
                                  placeholder="Add notes or details (optional)"
                                  value={currentAnswer?.notes || ""}
                                  onChange={(e) =>
                                    handleAnswerChange(q.id, currentAnswer.answer, e.target.value)
                                  }
                                  rows={2}
                                  className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm placeholder:text-zinc-400 focus:border-pink-500 focus:outline-none focus:ring-2 focus:ring-pink-500/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white"
                                />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Document Checklist Section */}
          {activeSection === "checklist" && (
            <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-zinc-900">
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-white mb-6">
                Document Checklist
              </h2>

              <div className="space-y-3">
                {checklist.map((item) => (
                  <div
                    key={item.id}
                    className={`rounded-lg border p-4 transition-colors ${
                      item.status === "uploaded"
                        ? "border-green-200 bg-green-50 dark:border-green-900/50 dark:bg-green-900/10"
                        : item.status === "na"
                        ? "border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800/50"
                        : "border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-800"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className={`flex h-8 w-8 items-center justify-center rounded-full ${
                            item.status === "uploaded"
                              ? "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400"
                              : item.status === "na"
                              ? "bg-zinc-100 text-zinc-400 dark:bg-zinc-700"
                              : "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400"
                          }`}
                        >
                          {item.status === "uploaded" ? (
                            <CheckCircle2 size={18} />
                          ) : item.status === "na" ? (
                            <Minus size={18} />
                          ) : (
                            <Circle size={18} />
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-zinc-900 dark:text-white">
                            {item.label}
                            {item.required && (
                              <span className="ml-2 text-xs text-pink-600 dark:text-pink-400">Required</span>
                            )}
                          </p>
                          <p className="text-xs text-zinc-500 dark:text-zinc-400">
                            {item.status === "uploaded"
                              ? "Document uploaded"
                              : item.status === "na"
                              ? "Not applicable"
                              : "Pending upload"}
                          </p>
                        </div>
                      </div>

                      {item.status === "pending" && (
                        <div className="flex items-center gap-2">
                          <label className="inline-flex items-center gap-1.5 cursor-pointer rounded-lg bg-pink-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-pink-500">
                            {uploading === item.id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <Upload size={14} />
                            )}
                            Upload
                            <input
                              type="file"
                              className="hidden"
                              accept=".pdf,.jpg,.jpeg,.png,.docx"
                              onChange={(e) => {
                                if (e.target.files?.[0]) {
                                  handleChecklistUpload(item.id, e.target.files[0]);
                                }
                              }}
                              disabled={uploading === item.id}
                            />
                          </label>
                          {!item.required && (
                            <button
                              onClick={() => handleMarkNA(item.id)}
                              className="text-xs font-medium text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300"
                            >
                              Mark N/A
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Sidebar */}
        <div className="space-y-6">
          {/* Step Info */}
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-zinc-900">
            <h3 className="font-semibold text-zinc-900 dark:text-white mb-2">
              Step {sections.findIndex((s) => s.id === activeSection) + 1} of {sections.length}
            </h3>
            <div className="flex items-start gap-3 text-sm text-zinc-600 dark:text-zinc-400">
              <HelpCircle size={18} className="flex-shrink-0 mt-0.5" />
              <p>
                {activeSection === "engagement" &&
                  "The engagement letter defines the scope of our relationship and is required before we can start on your returns."}
                {activeSection === "questionnaire" &&
                  "Answer each question to the best of your knowledge. Your answers help us identify potential deductions and credits."}
                {activeSection === "checklist" &&
                  "Upload the required documents to complete your tax preparation. Mark items as N/A if they don't apply to you."}
              </p>
            </div>
          </div>

          {/* Need Help */}
          <div className="rounded-2xl border border-pink-200 bg-gradient-to-br from-pink-50 to-white p-6 shadow-sm dark:border-pink-900/50 dark:from-pink-900/20 dark:to-zinc-900">
            <h3 className="font-semibold text-zinc-900 dark:text-white mb-2">Need help?</h3>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
              Your dedicated tax professional is here to assist with any questions.
            </p>
            <button className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-white border border-zinc-200 px-4 py-2.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-700">
              <MessageCircle size={16} />
              Message Advisor
            </button>
          </div>

          {/* Activity Log */}
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-zinc-900">
            <h3 className="font-semibold text-zinc-900 dark:text-white mb-4">Activity Log</h3>
            <div className="space-y-4">
              <div className="flex gap-3">
                <div className="flex h-2 w-2 mt-2 rounded-full bg-pink-600" />
                <div>
                  <p className="text-sm font-medium text-zinc-900 dark:text-white">Session started</p>
                  <p className="text-xs text-zinc-500">
                    {new Date().toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                    , {new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                  </p>
                </div>
              </div>
              {engagementSigned && (
                <div className="flex gap-3">
                  <div className="flex h-2 w-2 mt-2 rounded-full bg-green-600" />
                  <div>
                    <p className="text-sm font-medium text-zinc-900 dark:text-white">Engagement signed</p>
                    <p className="text-xs text-zinc-500">
                      {new Date().toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
                      , {new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
