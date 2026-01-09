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
import SignaturePad, { SignatureData } from "@/components/SignaturePad";

// Dynamic import for html2pdf.js (client-side only)
let html2pdf: any = null;
if (typeof window !== "undefined") {
  import("html2pdf.js").then((module) => {
    html2pdf = module.default;
  });
}

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
  const [signingEngagement, setSigningEngagement] = useState(false);
  const [showSignaturePad, setShowSignaturePad] = useState(false);
  const [signatureData, setSignatureData] = useState<SignatureData | null>(null);
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

  // Check if engagement letter is already signed
  useEffect(() => {
    const checkEngagementStatus = async () => {
      if (!user) return;
      
      try {
        const { data, error } = await supabase
          .from("user_documents")
          .select("id")
          .eq("user_id", user.id)
          .eq("doctype", "Engagement Letter")
          .eq("year", currentYear)
          .single();

        if (data && !error) {
          setEngagementSigned(true);
        }
      } catch (error) {
        // No engagement letter found, which is fine
        console.log("No engagement letter found yet");
      }
    };

    checkEngagementStatus();
  }, [user, currentYear]);

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

  // Open signature pad modal
  const handleOpenSignaturePad = () => {
    setShowSignaturePad(true);
  };

  // Handle signature submission from SignaturePad component
  const handleSignatureSubmit = async (sigData: SignatureData) => {
    setShowSignaturePad(false);
    setSignatureData(sigData);
    await saveSignedEngagementLetter(sigData);
  };

  // Generate engagement letter HTML content
  const generateEngagementLetterHTML = (sigData: SignatureData) => {
    const firmName = "IC Multi Services, LLC";
    const clientName = `${profile?.first_name} ${profile?.last_name}`;
    const signedDate = new Date(sigData.signedAt).toLocaleDateString("en-US", { 
      year: "numeric", 
      month: "long", 
      day: "numeric" 
    });
    const signedTime = new Date(sigData.signedAt).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      timeZoneName: "short"
    });

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Engagement Letter - ${currentYear}</title>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; max-width: 800px; margin: 40px auto; padding: 20px; color: #333; }
    h1 { text-align: center; color: #1a1a1a; border-bottom: 2px solid #e5e5e5; padding-bottom: 10px; }
    h2 { color: #2c2c2c; margin-top: 20px; font-size: 14px; }
    p { margin: 10px 0; text-align: justify; font-size: 12px; }
    .header-info { text-align: center; margin-bottom: 30px; }
    .signature-section { margin-top: 40px; padding: 20px; border: 2px solid #1a1a1a; border-radius: 8px; background: #fafafa; }
    .signature-image { max-width: 300px; height: auto; border-bottom: 2px solid #333; padding-bottom: 10px; }
    .signature-details { margin-top: 20px; }
    .signature-details p { margin: 5px 0; font-size: 11px; color: #666; }
    .verification-box { margin-top: 30px; padding: 15px; background: #f0f9ff; border: 1px solid #0284c7; border-radius: 8px; }
    .verification-box h3 { color: #0369a1; margin: 0 0 10px 0; font-size: 12px; }
    .verification-box p { font-size: 10px; color: #475569; margin: 3px 0; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e5e5; text-align: center; font-size: 10px; color: #666; }
  </style>
</head>
<body>
  <h1>Engagement Letter</h1>
  <div class="header-info">
    <p><strong>Tax Year:</strong> ${currentYear}</p>
    <p><strong>Date Signed:</strong> ${signedDate}</p>
  </div>
  
  <p>Dear ${clientName}:</p>
  
  <p>Thank you for choosing ${firmName} ("Firm," "we," "us," or "our") to assist you with your ${currentYear} federal and state income tax filings. This letter confirms the terms of our engagement and outlines the nature and scope of the services we will provide.</p>
  
  <h2>Scope of Services:</h2>
  <p>We will review your current federal and state income tax returns. We will depend on you to provide the information we need to complete an accurate assessment and provide recommendations. We may ask you to clarify some items but will not audit or otherwise verify the data you submit. Review or revision of prior year(s) returns is also available at an additional charge.</p>
  <p>Review or revision of prior-year tax returns is outside the scope of this engagement unless separately agreed to in writing and may be subject to additional fees.</p>
  
  <h2>Limitations of Engagement:</h2>
  <p>We will perform services only as needed to review, revise or prepare your tax returns. Our work will not include procedures to find misappropriated funds or other irregularities. Accordingly, our engagement should not be relied upon to disclose errors, fraud, or other illegal acts, though it may be necessary for you to clarify some of the information you submit. We will, of course, inform you of any material errors, fraud, or other illegal acts we discover.</p>
  
  <h2>Tax Law, Estimates, and Professional Judgment:</h2>
  <p>Tax laws are complex and subject to change. The law imposes penalties and interest when taxpayers underestimate their tax liability or fail to make required payments. You remain solely responsible for your tax obligations. Please contact us if you have concerns regarding estimated tax payments or potential penalties.</p>
  <p>If we encounter areas of unclear tax law or differing reasonable interpretations, we will explain the available options, including the related risks and consequences. We will proceed based on the course of action you authorize.</p>
  
  <h2>Fees and Billing:</h2>
  <p>Our fee will be based on the time required at the standard hourly billing rate plus any out-of-pocket expenses. Invoices are due and payable upon presentation. To the extent permitted by state law, an interest charge may be added to all accounts not paid within thirty (30) days.</p>
  <p>We will return your original records to you at the end of this engagement. You should securely store these records, along with all supporting documents, canceled checks, etc., as these items may later be needed to prove accuracy and completeness of a return. We will retain copies of your records and our work papers for your engagement for seven years, after which these documents will be destroyed.</p>
  
  <h2>Use of Third-Party and Overseas Service Providers:</h2>
  <p>To efficiently deliver our services, ${firmName} may utilize trained third-party professionals and support staff, including personnel located outside the United States, to assist with tax preparation and administrative functions.</p>
  
  <h2>Conclusion of Engagement and Filing Responsibility:</h2>
  <p>By signing this engagement letter, you authorize and consent to the disclosure of your tax return information to such service providers, solely for purposes of preparing and supporting your tax returns. We maintain confidentiality agreements and reasonable data-security measures to protect your information in accordance with applicable laws and professional standards.</p>
  <p>Our engagement to prepare your tax returns will conclude with the delivery of our analysis of your return along with any recommended clarifications or corrections. If you have not selected to e-file your returns with our office, you will be solely responsible to file the returns with the appropriate taxing authorities. Review all tax-return documents carefully before signing them.</p>
  
  <h2>Acknowledgment:</h2>
  <p>Please sign and return a copy of this letter to confirm that it accurately reflects your understanding of and agreement with the terms of this engagement.</p>
  <p>Thank you for entrusting ${firmName} with your tax matters.</p>
  
  <div class="signature-section">
    <h3 style="margin: 0 0 15px 0; color: #1a1a1a;">Client Electronic Signature</h3>
    <img src="${sigData.signatureImage}" alt="Client Signature" class="signature-image" />
    <div class="signature-details">
      <p><strong>Signed By:</strong> ${sigData.signerName}</p>
      <p><strong>Signature Type:</strong> ${sigData.signatureType === "draw" ? "Hand-drawn Electronic Signature" : "Typed Electronic Signature"}</p>
      <p><strong>Date & Time:</strong> ${signedDate} at ${signedTime}</p>
    </div>
  </div>

  <div class="verification-box">
    <h3>🔒 Electronic Signature Verification</h3>
    <p><strong>Document ID:</strong> ENG-${currentYear}-${user?.id.slice(0, 8).toUpperCase()}</p>
    <p><strong>Timestamp (UTC):</strong> ${sigData.signedAt}</p>
    <p><strong>Signer:</strong> ${sigData.signerName}</p>
    <p><strong>Signature Method:</strong> ${sigData.signatureType === "draw" ? "Drawn signature via touch/mouse input" : "Typed signature with consent"}</p>
    <p><strong>Device:</strong> ${sigData.userAgent.slice(0, 100)}...</p>
    <p style="margin-top: 10px; font-style: italic;">This document was electronically signed and the signer agreed that their electronic signature has the same legal validity as a handwritten signature under applicable e-signature laws.</p>
  </div>

  <div class="footer">
    <p>${firmName} • Tax & Accounting Services</p>
    <p>This is a legally binding electronic document. Keep this copy for your records.</p>
  </div>
</body>
</html>
    `;
  };

  // Handle engagement letter signing with verified signature
  const saveSignedEngagementLetter = async (sigData: SignatureData) => {
    if (!user || !profile) return;
    setSigningEngagement(true);

    try {
      const clientName = `${profile.first_name} ${profile.last_name}`;
      
      // Generate HTML content
      const engagementContent = generateEngagementLetterHTML(sigData);

      // Create a temporary container for PDF generation
      const container = document.createElement("div");
      container.innerHTML = engagementContent;
      container.style.position = "absolute";
      container.style.left = "-9999px";
      container.style.top = "0";
      document.body.appendChild(container);

      // Wait for html2pdf to be loaded
      if (!html2pdf) {
        const module = await import("html2pdf.js");
        html2pdf = module.default;
      }

      // Generate PDF
      const pdfOptions = {
        margin: [10, 10, 10, 10],
        filename: `${currentYear}_Engagement_Letter_${clientName.replace(/\s+/g, "_")}_signed.pdf`,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, allowTaint: true },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
      };

      // Get the body element from the container
      const bodyContent = container.querySelector("body") || container;

      const pdfBlob = await html2pdf()
        .set(pdfOptions)
        .from(bodyContent)
        .outputPdf("blob");

      // Clean up temporary container
      document.body.removeChild(container);

      const fileName = `${currentYear}_Engagement_Letter_${clientName.replace(/\s+/g, "_")}_signed.pdf`;
      const filePath = `${user.id}/${fileName}`;

      // Upload PDF to Supabase storage
      const { error: uploadError } = await supabase.storage
        .from("documents")
        .upload(filePath, pdfBlob, {
          contentType: "application/pdf",
          upsert: true
        });

      if (uploadError) throw uploadError;

      // Save document metadata to user_documents table
      const { error: dbError } = await supabase
        .from("user_documents")
        .insert({
          user_id: user.id,
          title: `${currentYear} Engagement Letter`,
          doctype: "Engagement Letter",
          year: currentYear,
          file_path: filePath,
          file_type: "application/pdf",
          size: pdfBlob.size
        });

      if (dbError) throw dbError;

      // Mark as signed
      setEngagementSigned(true);
      alert("Engagement letter signed and saved as PDF successfully!");
    } catch (error: any) {
      console.error("Error signing engagement letter:", error);
      alert("Error signing engagement letter: " + error.message);
    } finally {
      setSigningEngagement(false);
    }
  };

  // Download engagement letter as PDF
  const handleDownloadEngagement = async () => {
    if (!user) return;

    try {
      const { data: doc, error: docError } = await supabase
        .from("user_documents")
        .select("file_path, title")
        .eq("user_id", user.id)
        .eq("doctype", "Engagement Letter")
        .eq("year", currentYear)
        .single();

      if (docError) throw docError;

      // Download the file directly
      const { data: fileData, error: downloadError } = await supabase.storage
        .from("documents")
        .download(doc.file_path);
      
      if (downloadError) throw downloadError;
      if (fileData) {
        // Create a download link
        const url = URL.createObjectURL(fileData);
        const link = document.createElement("a");
        link.href = url;
        link.download = doc.file_path.split("/").pop() || `${currentYear}_Engagement_Letter.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }
    } catch (error: any) {
      console.error("Error downloading engagement letter:", error);
      alert("Error downloading engagement letter: " + error.message);
    }
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
                <div className="max-w-2xl mx-auto space-y-4 text-sm text-zinc-700 dark:text-zinc-300">
                  <p>Dear {profile?.first_name} {profile?.last_name}:</p>

                  <p>
                    Thank you for choosing <strong>IC Multi Services, LLC</strong> (&quot;Firm,&quot; &quot;we,&quot; &quot;us,&quot; or &quot;our&quot;) to assist you with your {currentYear} federal and state income tax filings. This letter confirms the terms of our engagement and outlines the nature and scope of the services we will provide.
                  </p>

                  <div>
                    <h4 className="font-semibold text-zinc-900 dark:text-white">Scope of Services:</h4>
                    <p className="mt-1">
                      We will review your current federal and state income tax returns. We will depend on you to provide the information we need to complete an accurate assessment and provide recommendations. We may ask you to clarify some items but will not audit or otherwise verify the data you submit. Review or revision of prior year(s) returns is also available at an additional charge.
                    </p>
                    <p className="mt-1">
                      Review or revision of prior-year tax returns is outside the scope of this engagement unless separately agreed to in writing and may be subject to additional fees.
                    </p>
                  </div>

                  <div>
                    <h4 className="font-semibold text-zinc-900 dark:text-white">Limitations of Engagement:</h4>
                    <p className="mt-1">
                      We will perform services only as needed to review, revise or prepare your tax returns. Our work will not include procedures to find misappropriated funds or other irregularities. Accordingly, our engagement should not be relied upon to disclose errors, fraud, or other illegal acts, though it may be necessary for you to clarify some of the information you submit. We will, of course, inform you of any material errors, fraud, or other illegal acts we discover.
                    </p>
                  </div>

                  <div>
                    <h4 className="font-semibold text-zinc-900 dark:text-white">Tax Law, Estimates, and Professional Judgment:</h4>
                    <p className="mt-1">
                      Tax laws are complex and subject to change. The law imposes penalties and interest when taxpayers underestimate their tax liability or fail to make required payments. You remain solely responsible for your tax obligations. Please contact us if you have concerns regarding estimated tax payments or potential penalties.
                    </p>
                    <p className="mt-1">
                      If we encounter areas of unclear tax law or differing reasonable interpretations, we will explain the available options, including the related risks and consequences. We will proceed based on the course of action you authorize.
                    </p>
                  </div>

                  <div>
                    <h4 className="font-semibold text-zinc-900 dark:text-white">Fees and Billing:</h4>
                    <p className="mt-1">
                      Our fee will be based on the time required at the standard hourly billing rate plus any out-of-pocket expenses. Invoices are due and payable upon presentation. To the extent permitted by state law, an interest charge may be added to all accounts not paid within thirty (30) days.
                    </p>
                    <p className="mt-1">
                      We will return your original records to you at the end of this engagement. You should securely store these records, along with all supporting documents, canceled checks, etc., as these items may later be needed to prove accuracy and completeness of a return. We will retain copies of your records and our work papers for your engagement for seven years, after which these documents will be destroyed.
                    </p>
                  </div>

                  <div>
                    <h4 className="font-semibold text-zinc-900 dark:text-white">Use of Third-Party and Overseas Service Providers:</h4>
                    <p className="mt-1">
                      To efficiently deliver our services, IC Multi Services, LLC may utilize trained third-party professionals and support staff, including personnel located outside the United States, to assist with tax preparation and administrative functions.
                    </p>
                  </div>

                  <div>
                    <h4 className="font-semibold text-zinc-900 dark:text-white">Conclusion of Engagement and Filing Responsibility:</h4>
                    <p className="mt-1">
                      By signing this engagement letter, you authorize and consent to the disclosure of your tax return information to such service providers, solely for purposes of preparing and supporting your tax returns. We maintain confidentiality agreements and reasonable data-security measures to protect your information in accordance with applicable laws and professional standards.
                    </p>
                    <p className="mt-1">
                      Our engagement to prepare your tax returns will conclude with the delivery of our analysis of your return along with any recommended clarifications or corrections. If you have not selected to e-file your returns with our office, you will be solely responsible to file the returns with the appropriate taxing authorities. Review all tax-return documents carefully before signing them.
                    </p>
                  </div>

                  <div>
                    <h4 className="font-semibold text-zinc-900 dark:text-white">Acknowledgment:</h4>
                    <p className="mt-1">
                      Please sign and return a copy of this letter to confirm that it accurately reflects your understanding of and agreement with the terms of this engagement.
                    </p>
                    <p className="mt-1">
                      Thank you for entrusting IC Multi Services, LLC with your tax matters.
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
                    onClick={handleOpenSignaturePad}
                    disabled={signingEngagement}
                    className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-pink-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-pink-500 disabled:opacity-50"
                  >
                    {signingEngagement ? (
                      <>
                        <Loader2 size={18} className="animate-spin" />
                        Processing Signature...
                      </>
                    ) : (
                      <>
                        <FileSignature size={18} />
                        E-Sign Document
                      </>
                    )}
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
                  <button 
                    onClick={handleDownloadEngagement}
                    className="ml-auto text-sm font-medium text-green-600 hover:text-green-700 dark:text-green-400 flex items-center gap-1"
                  >
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

      {/* Signature Pad Modal */}
      {showSignaturePad && profile && (
        <SignaturePad
          signerName={`${profile.first_name} ${profile.last_name}`}
          onSign={handleSignatureSubmit}
          onCancel={() => setShowSignaturePad(false)}
        />
      )}
    </div>
  );
}
