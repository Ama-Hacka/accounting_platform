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

// Note: jsPDF and html2canvas are dynamically imported when needed for PDF generation

interface TaxesTabProps {
  user: any;
  profile: { first_name?: string; last_name?: string; preferred_language?: "en" | "es" } | null;
  engagementSigned: boolean;
  onEngagementSigned: () => void;
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
  engagementSigned,
  onEngagementSigned,
  questionnaireStatus,
  questionnaireProgress,
  onStatusChange,
}: TaxesTabProps) {
  const currentYear = new Date().getFullYear();
  const [activeSection, setActiveSection] = useState<TaxSection>("engagement");
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

  // Generate engagement letter HTML content with PDF-safe styles (no modern CSS color functions)
  const generateEngagementLetterHTML = async (sigData: SignatureData) => {
    const firmName = "IC Multi Services, LLC";
    const clientName = `${profile?.first_name} ${profile?.last_name}`;
    const isSpanish = profile?.preferred_language === "es";
    const signedDate = new Date(sigData.signedAt).toLocaleDateString(isSpanish ? "es-ES" : "en-US", { 
      year: "numeric", 
      month: "long", 
      day: "numeric" 
    });
    const signedTime = new Date(sigData.signedAt).toLocaleTimeString(isSpanish ? "es-ES" : "en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      timeZoneName: "short"
    });

    // Fetch and embed the SVG logo as base64 for PDF
    let logoDataUrl = "";
    try {
      const response = await fetch("/logo.svg");
      const svgText = await response.text();
      logoDataUrl = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svgText)))}`;
    } catch (e) {
      console.warn("Could not load logo:", e);
    }

    // Language-specific content
    const content = isSpanish ? {
      title: "Carta de Compromiso",
      taxYear: "Año Tributario",
      dateSigned: "Fecha de Firma",
      greeting: `Estimado/a ${clientName}:`,
      intro: `Gracias por elegir a ${firmName} ("la Firma", "nosotros" o "nuestro") para asistirle con la preparación y/o revisión de sus declaraciones de impuestos federales y estatales correspondientes al año tributario ${currentYear}. Esta carta confirma los términos de nuestra colaboración y describe la naturaleza y el alcance de los servicios que le proporcionaremos.`,
      scopeTitle: "Alcance de los Servicios:",
      scopeP1: "Revisaremos, prepararemos y/o modificaremos sus declaraciones de impuestos federales y estatales actuales, basándonos exclusivamente en la información que usted nos proporcione. Dependeremos de usted para suministrar información completa y precisa necesaria para realizar una evaluación adecuada y brindar recomendaciones. Podremos solicitar aclaraciones sobre ciertos puntos; sin embargo, no auditaremos ni verificaremos de otra manera la información que usted nos entregue.",
      scopeP2: "La revisión o modificación de declaraciones de años anteriores queda fuera del alcance de este compromiso, salvo que se acuerde expresamente por escrito, y podrá estar sujeta a cargos adicionales.",
      limitationsTitle: "Limitaciones del Compromiso:",
      limitationsP1: "Realizaremos únicamente los servicios necesarios para revisar, modificar o preparar sus declaraciones de impuestos. Nuestro trabajo no incluirá procedimientos destinados a detectar fraude, malversación de fondos u otras irregularidades. En consecuencia, no debe confiarse en este compromiso para revelar errores, fraudes u otros actos ilegales, aunque pueda ser necesario que usted aclare cierta información proporcionada. No obstante, le informaremos oportunamente de cualquier error material, fraude u otra irregularidad que lleguemos a identificar.",
      taxLawTitle: "Ley Tributaria, Estimaciones y Juicio Profesional:",
      taxLawP1: "Las leyes tributarias son complejas y están sujetas a cambios. La ley impone penalidades e intereses cuando los contribuyentes subestiman su obligación tributaria o no realizan los pagos correspondientes. Usted sigue siendo el único responsable de sus obligaciones fiscales. Por favor, contáctenos si tiene inquietudes relacionadas con pagos estimados de impuestos o posibles penalidades.",
      taxLawP2: "Si nos encontramos con áreas de la ley tributaria que sean poco claras o que permitan interpretaciones razonables diferentes, le explicaremos las opciones disponibles, así como los riesgos y consecuencias asociados. Procederemos conforme a la alternativa que usted autorice.",
      feesTitle: "Honorarios y Facturación:",
      feesP1: "Nuestros honorarios se basarán en el tiempo requerido para prestar los servicios, aplicando nuestras tarifas estándar por hora, más cualquier gasto incurrido. Las facturas deberán pagarse al momento de su presentación. En la medida permitida por la ley estatal, se podrá aplicar un cargo por intereses a todas las cuentas no pagadas dentro de un plazo de treinta (30) días.",
      recordsTitle: "Conservación de Registros:",
      recordsP1: "Le devolveremos sus documentos originales al finalizar este compromiso. Usted debe conservar de manera segura dichos documentos, junto con toda la documentación de respaldo, cheques cancelados, entre otros, ya que podrían ser necesarios en el futuro para demostrar la exactitud y completitud de una declaración. Conservaremos copias de sus documentos y de nuestros papeles de trabajo durante siete (7) años, después de lo cual podrán ser destruidos.",
      thirdPartyTitle: "Uso de Proveedores Externos y Personal en el Extranjero:",
      thirdPartyP1: `Para prestar nuestros servicios de manera eficiente, ${firmName} podrá utilizar profesionales externos capacitados y personal de apoyo, incluidos colaboradores ubicados fuera de los Estados Unidos, para asistir en la preparación de impuestos y funciones administrativas.`,
      conclusionTitle: "Conclusión del Compromiso y Responsabilidad de Presentación:",
      conclusionP1: "Al firmar esta carta de compromiso, usted autoriza y consiente la divulgación de su información tributaria a dichos proveedores, exclusivamente para fines relacionados con la preparación y el soporte de sus declaraciones de impuestos. Mantenemos acuerdos de confidencialidad y medidas razonables de seguridad de datos para proteger su información conforme a las leyes y normas profesionales aplicables.",
      conclusionP2: "Nuestro compromiso para preparar sus declaraciones de impuestos concluirá con la entrega de nuestro análisis, junto con cualquier aclaración o corrección recomendada. Si usted no ha seleccionado presentar electrónicamente sus declaraciones a través de nuestra oficina, será su exclusiva responsabilidad presentar las declaraciones ante las autoridades fiscales correspondientes. Revise cuidadosamente todos los documentos de la declaración antes de firmarlos.",
      acknowledgmentTitle: "Aceptación:",
      acknowledgmentP1: "Para confirmar que esta carta refleja correctamente su entendimiento y aceptación de los términos de este compromiso, por favor firme y devuelva una copia de la misma.",
      acknowledgmentP2: `Gracias por confiar a ${firmName} sus asuntos fiscales.`,
      signatureSection: "Firma Electrónica del Cliente",
      signedBy: "Firmado Por",
      signatureType: "Tipo de Firma",
      signatureTypeDrawn: "Firma Electrónica Dibujada a Mano",
      signatureTypeTyped: "Firma Electrónica Escrita",
      dateTime: "Fecha y Hora",
      verificationTitle: "Verificación de Firma Electrónica",
      documentId: "ID del Documento",
      timestamp: "Marca de Tiempo (UTC)",
      signer: "Firmante",
      signatureMethod: "Método de Firma",
      signatureMethodDrawn: "Firma dibujada mediante entrada táctil/ratón",
      signatureMethodTyped: "Firma escrita con consentimiento",
      device: "Dispositivo",
      verificationNote: "Este documento fue firmado electrónicamente y el firmante aceptó que su firma electrónica tiene la misma validez legal que una firma manuscrita según las leyes aplicables de firma electrónica.",
      footerTitle: `${firmName} - Servicios de Impuestos y Contabilidad`,
      footerNote: "Este es un documento electrónico legalmente vinculante. Conserve esta copia para sus registros."
    } : {
      title: "Engagement Letter",
      taxYear: "Tax Year",
      dateSigned: "Date Signed",
      greeting: `Dear ${clientName}:`,
      intro: `Thank you for choosing ${firmName} ("Firm," "we," "us," or "our") to assist you with your ${currentYear} federal and state income tax filings. This letter confirms the terms of our engagement and outlines the nature and scope of the services we will provide.`,
      scopeTitle: "Scope of Services:",
      scopeP1: "We will review your current federal and state income tax returns. We will depend on you to provide the information we need to complete an accurate assessment and provide recommendations. We may ask you to clarify some items but will not audit or otherwise verify the data you submit. Review or revision of prior year(s) returns is also available at an additional charge.",
      scopeP2: "Review or revision of prior-year tax returns is outside the scope of this engagement unless separately agreed to in writing and may be subject to additional fees.",
      limitationsTitle: "Limitations of Engagement:",
      limitationsP1: "We will perform services only as needed to review, revise or prepare your tax returns. Our work will not include procedures to find misappropriated funds or other irregularities. Accordingly, our engagement should not be relied upon to disclose errors, fraud, or other illegal acts, though it may be necessary for you to clarify some of the information you submit. We will, of course, inform you of any material errors, fraud, or other illegal acts we discover.",
      taxLawTitle: "Tax Law, Estimates, and Professional Judgment:",
      taxLawP1: "Tax laws are complex and subject to change. The law imposes penalties and interest when taxpayers underestimate their tax liability or fail to make required payments. You remain solely responsible for your tax obligations. Please contact us if you have concerns regarding estimated tax payments or potential penalties.",
      taxLawP2: "If we encounter areas of unclear tax law or differing reasonable interpretations, we will explain the available options, including the related risks and consequences. We will proceed based on the course of action you authorize.",
      feesTitle: "Fees and Billing:",
      feesP1: "Our fee will be based on the time required at the standard hourly billing rate plus any out-of-pocket expenses. Invoices are due and payable upon presentation. To the extent permitted by state law, an interest charge may be added to all accounts not paid within thirty (30) days.",
      recordsTitle: "Record Retention:",
      recordsP1: "We will return your original records to you at the end of this engagement. You should securely store these records, along with all supporting documents, canceled checks, etc., as these items may later be needed to prove accuracy and completeness of a return. We will retain copies of your records and our work papers for your engagement for seven years, after which these documents will be destroyed.",
      thirdPartyTitle: "Use of Third-Party and Overseas Service Providers:",
      thirdPartyP1: `To efficiently deliver our services, ${firmName} may utilize trained third-party professionals and support staff, including personnel located outside the United States, to assist with tax preparation and administrative functions.`,
      conclusionTitle: "Conclusion of Engagement and Filing Responsibility:",
      conclusionP1: "By signing this engagement letter, you authorize and consent to the disclosure of your tax return information to such service providers, solely for purposes of preparing and supporting your tax returns. We maintain confidentiality agreements and reasonable data-security measures to protect your information in accordance with applicable laws and professional standards.",
      conclusionP2: "Our engagement to prepare your tax returns will conclude with the delivery of our analysis of your return along with any recommended clarifications or corrections. If you have not selected to e-file your returns with our office, you will be solely responsible to file the returns with the appropriate taxing authorities. Review all tax-return documents carefully before signing them.",
      acknowledgmentTitle: "Acknowledgment:",
      acknowledgmentP1: "Please sign and return a copy of this letter to confirm that it accurately reflects your understanding of and agreement with the terms of this engagement.",
      acknowledgmentP2: `Thank you for entrusting ${firmName} with your tax matters.`,
      signatureSection: "Client Electronic Signature",
      signedBy: "Signed By",
      signatureType: "Signature Type",
      signatureTypeDrawn: "Hand-drawn Electronic Signature",
      signatureTypeTyped: "Typed Electronic Signature",
      dateTime: "Date & Time",
      verificationTitle: "Electronic Signature Verification",
      documentId: "Document ID",
      timestamp: "Timestamp (UTC)",
      signer: "Signer",
      signatureMethod: "Signature Method",
      signatureMethodDrawn: "Drawn signature via touch/mouse input",
      signatureMethodTyped: "Typed signature with consent",
      device: "Device",
      verificationNote: "This document was electronically signed and the signer agreed that their electronic signature has the same legal validity as a handwritten signature under applicable e-signature laws.",
      footerTitle: `${firmName} - Tax & Accounting Services`,
      footerNote: "This is a legally binding electronic document. Keep this copy for your records."
    };

    // IMPORTANT: Use only standard CSS colors (hex, rgb, rgba) - NOT oklch, lab, or other modern color functions
    // html2pdf.js uses html2canvas which doesn't support modern CSS color functions
    return `
<!DOCTYPE html>
<html lang="${isSpanish ? 'es' : 'en'}">
<head>
  <meta charset="UTF-8">
  <title>${content.title} - ${currentYear}</title>
  <style>
    /* Reset and isolation - prevent inheritance of modern CSS color functions */
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    html, body {
      font-family: Arial, Helvetica, sans-serif;
      font-size: 12px;
      line-height: 1.6;
      color: #333333;
      background-color: #ffffff;
      -webkit-font-smoothing: antialiased;
    }
    body {
      max-width: 800px;
      margin: 40px auto;
      padding: 20px;
    }
    .logo-header {
      text-align: center;
      margin-bottom: 30px;
      padding-bottom: 20px;
      border-bottom: 2px solid #8B2323;
    }
    .logo-header img {
      max-width: 300px;
      height: auto;
    }
    .logo-header h2 {
      color: #8B2323;
      margin: 0;
      font-size: 24px;
    }
    h1 {
      text-align: center;
      color: #8B2323;
      margin-top: 20px;
      margin-bottom: 10px;
      font-size: 22px;
      font-weight: bold;
    }
    h2 {
      color: #8B2323;
      margin-top: 20px;
      margin-bottom: 8px;
      font-size: 14px;
      font-weight: bold;
    }
    h3 {
      color: #8B2323;
      font-size: 14px;
      font-weight: bold;
    }
    p {
      margin: 10px 0;
      text-align: justify;
      font-size: 12px;
      color: #333333;
    }
    strong {
      font-weight: bold;
      color: #333333;
    }
    .header-info {
      text-align: center;
      margin-bottom: 30px;
    }
    .header-info p {
      text-align: center;
    }
    .signature-section {
      margin-top: 40px;
      padding: 20px;
      border: 2px solid #8B2323;
      border-radius: 8px;
      background-color: #fafafa;
    }
    .signature-section h3 {
      margin: 0 0 15px 0;
      color: #8B2323;
    }
    .signature-image {
      max-width: 300px;
      height: auto;
      border-bottom: 2px solid #333333;
      padding-bottom: 10px;
    }
    .signature-details {
      margin-top: 20px;
    }
    .signature-details p {
      margin: 5px 0;
      font-size: 11px;
      color: #666666;
      text-align: left;
    }
    .verification-box {
      margin-top: 30px;
      padding: 15px;
      background-color: #f0f9ff;
      border: 1px solid #0284c7;
      border-radius: 8px;
    }
    .verification-box h3 {
      color: #0369a1;
      margin: 0 0 10px 0;
      font-size: 12px;
    }
    .verification-box p {
      font-size: 10px;
      color: #475569;
      margin: 3px 0;
      text-align: left;
    }
    .verification-note {
      margin-top: 10px;
      font-style: italic;
    }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #8B2323;
      text-align: center;
      font-size: 10px;
      color: #666666;
    }
    .footer img {
      max-width: 200px;
      height: auto;
      margin-bottom: 10px;
    }
    .footer p {
      text-align: center;
      color: #666666;
    }
    .footer-title {
      margin-top: 15px;
    }
  </style>
</head>
<body>
  <div class="logo-header">
    ${logoDataUrl ? `<img src="${logoDataUrl}" alt="IC Multi Services Logo" />` : `<h2>IC Multi Services, LLC</h2>`}
  </div>

  <h1>${content.title}</h1>
  <div class="header-info">
    <p><strong>${content.taxYear}:</strong> ${currentYear}</p>
    <p><strong>${content.dateSigned}:</strong> ${signedDate}</p>
  </div>
  
  <p>${content.greeting}</p>
  
  <p>${content.intro}</p>
  
  <h2>${content.scopeTitle}</h2>
  <p>${content.scopeP1}</p>
  <p>${content.scopeP2}</p>
  
  <h2>${content.limitationsTitle}</h2>
  <p>${content.limitationsP1}</p>
  
  <h2>${content.taxLawTitle}</h2>
  <p>${content.taxLawP1}</p>
  <p>${content.taxLawP2}</p>
  
  <h2>${content.feesTitle}</h2>
  <p>${content.feesP1}</p>
  
  <h2>${content.recordsTitle}</h2>
  <p>${content.recordsP1}</p>
  
  <h2>${content.thirdPartyTitle}</h2>
  <p>${content.thirdPartyP1}</p>
  
  <h2>${content.conclusionTitle}</h2>
  <p>${content.conclusionP1}</p>
  <p>${content.conclusionP2}</p>
  
  <h2>${content.acknowledgmentTitle}</h2>
  <p>${content.acknowledgmentP1}</p>
  <p>${content.acknowledgmentP2}</p>
  
  <div class="signature-section">
    <h3>${content.signatureSection}</h3>
    <img src="${sigData.signatureImage}" alt="Client Signature" class="signature-image" />
    <div class="signature-details">
      <p><strong>${content.signedBy}:</strong> ${sigData.signerName}</p>
      <p><strong>${content.signatureType}:</strong> ${sigData.signatureType === "draw" ? content.signatureTypeDrawn : content.signatureTypeTyped}</p>
      <p><strong>${content.dateTime}:</strong> ${signedDate} ${isSpanish ? 'a las' : 'at'} ${signedTime}</p>
    </div>
  </div>

  <div class="verification-box">
    <h3>${content.verificationTitle}</h3>
    <p><strong>${content.documentId}:</strong> ENG-${currentYear}-${user?.id.slice(0, 8).toUpperCase()}</p>
    <p><strong>${content.timestamp}:</strong> ${sigData.signedAt}</p>
    <p><strong>${content.signer}:</strong> ${sigData.signerName}</p>
    <p><strong>${content.signatureMethod}:</strong> ${sigData.signatureType === "draw" ? content.signatureMethodDrawn : content.signatureMethodTyped}</p>
    <p><strong>${content.device}:</strong> ${sigData.userAgent.slice(0, 100)}...</p>
    <p class="verification-note">${content.verificationNote}</p>
  </div>

  <div class="footer">
    ${logoDataUrl ? `<img src="${logoDataUrl}" alt="IC Multi Services Logo" />` : ``}
    <p class="footer-title">${content.footerTitle}</p>
    <p>${content.footerNote}</p>
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
      
      // Generate HTML content (async to fetch logo)
      const engagementContent = await generateEngagementLetterHTML(sigData);

      // Import jsPDF and html2canvas directly for better control
      const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
        import("jspdf"),
        import("html2canvas")
      ]);

      // Create a completely isolated iframe using srcdoc for full style isolation
      const iframe = document.createElement("iframe");
      iframe.style.position = "absolute";
      iframe.style.left = "-9999px";
      iframe.style.top = "0";
      iframe.style.width = "800px";
      iframe.style.height = "1200px";
      iframe.style.border = "none";
      document.body.appendChild(iframe);

      // Use srcdoc for complete isolation
      await new Promise<void>((resolve, reject) => {
        iframe.onload = () => resolve();
        iframe.onerror = () => reject(new Error("Failed to load iframe"));
        iframe.srcdoc = engagementContent;
      });

      // Allow additional time for fonts and images to load
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Get the body from the iframe
      const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
      const iframeWindow = iframe.contentWindow;
      const bodyContent = iframeDoc?.body;

      if (!bodyContent || !iframeWindow) {
        throw new Error("Failed to create document for PDF generation");
      }

      // Use html2canvas with the iframe's window context to avoid inheriting parent styles
      const canvas = await html2canvas(bodyContent, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#ffffff",
        width: 800,
        windowWidth: 800,
        logging: false,
        // Pass the iframe's window to use its isolated style context
        // @ts-ignore - window option exists but may not be in types
        window: iframeWindow,
      });

      // Create PDF from canvas
      const imgData = canvas.toDataURL("image/jpeg", 0.98);
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 10;
      const contentWidth = pageWidth - (margin * 2);
      const imgWidth = contentWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      // Add image to PDF, handling multiple pages if needed
      let heightLeft = imgHeight;
      let position = margin;
      let page = 1;

      // First page
      pdf.addImage(imgData, "JPEG", margin, position, imgWidth, imgHeight);
      heightLeft -= (pageHeight - margin * 2);

      // Additional pages if content is longer than one page
      while (heightLeft > 0) {
        position = heightLeft - imgHeight + margin;
        pdf.addPage();
        pdf.addImage(imgData, "JPEG", margin, position, imgWidth, imgHeight);
        heightLeft -= (pageHeight - margin * 2);
        page++;
      }

      // Get PDF as blob
      const pdfBlob = pdf.output("blob");

      // Clean up iframe
      document.body.removeChild(iframe);

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

      // Check if engagement letter already exists for this user and year
      const { data: existingDoc, error: checkError } = await supabase
        .from("user_documents")
        .select("id")
        .eq("user_id", user.id)
        .eq("doctype", "Engagement Letter")
        .eq("year", currentYear)
        .maybeSingle();

      if (checkError) throw checkError;

      if (existingDoc) {
        // Update existing engagement letter
        const { error: updateError } = await supabase
          .from("user_documents")
          .update({
            title: `${currentYear} Engagement Letter`,
            file_path: filePath,
            file_type: "application/pdf",
            size: pdfBlob.size,
          })
          .eq("id", existingDoc.id);

        if (updateError) throw updateError;
      } else {
        // Insert new engagement letter record
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
      }

      // Notify parent to refresh engagement status from database
      onEngagementSigned();
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
    { id: "engagement" as TaxSection, label: profile?.preferred_language === "es" ? "Carta de Compromiso" : "Engagement Letter", icon: FileSignature, completed: engagementSigned },
    { id: "questionnaire" as TaxSection, label: profile?.preferred_language === "es" ? "Cuestionario" : "Questionnaire", icon: ClipboardList, completed: answers.filter(a => a.answer !== null).length === questionnaireQuestions.length },
    { id: "checklist" as TaxSection, label: profile?.preferred_language === "es" ? "Lista de Documentos" : "Document Checklist", icon: FolderCheck, completed: checklist.filter(c => c.required).every(c => c.status !== "pending") },
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
                  {currentYear}_{profile?.preferred_language === "es" ? "Carta_de_Compromiso" : "Engagement_Letter"}.pdf
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
                  {profile?.preferred_language === "es" ? (
                    <>
                      <p>Estimado/a {profile?.first_name} {profile?.last_name}:</p>

                      <p>
                        Gracias por elegir a <strong>IC Multi Services, LLC</strong> (&quot;la Firma&quot;, &quot;nosotros&quot; o &quot;nuestro&quot;) para asistirle con la preparación y/o revisión de sus declaraciones de impuestos federales y estatales correspondientes al año tributario {currentYear}. Esta carta confirma los términos de nuestra colaboración y describe la naturaleza y el alcance de los servicios que le proporcionaremos.
                      </p>

                      <div>
                        <h4 className="font-semibold text-zinc-900 dark:text-white">Alcance de los Servicios:</h4>
                        <p className="mt-1">
                          Revisaremos, prepararemos y/o modificaremos sus declaraciones de impuestos federales y estatales actuales, basándonos exclusivamente en la información que usted nos proporcione. Dependeremos de usted para suministrar información completa y precisa necesaria para realizar una evaluación adecuada y brindar recomendaciones. Podremos solicitar aclaraciones sobre ciertos puntos; sin embargo, no auditaremos ni verificaremos de otra manera la información que usted nos entregue.
                        </p>
                        <p className="mt-1">
                          La revisión o modificación de declaraciones de años anteriores queda fuera del alcance de este compromiso, salvo que se acuerde expresamente por escrito, y podrá estar sujeta a cargos adicionales.
                        </p>
                      </div>

                      <div>
                        <h4 className="font-semibold text-zinc-900 dark:text-white">Limitaciones del Compromiso:</h4>
                        <p className="mt-1">
                          Realizaremos únicamente los servicios necesarios para revisar, modificar o preparar sus declaraciones de impuestos. Nuestro trabajo no incluirá procedimientos destinados a detectar fraude, malversación de fondos u otras irregularidades. En consecuencia, no debe confiarse en este compromiso para revelar errores, fraudes u otros actos ilegales, aunque pueda ser necesario que usted aclare cierta información proporcionada. No obstante, le informaremos oportunamente de cualquier error material, fraude u otra irregularidad que lleguemos a identificar.
                        </p>
                      </div>

                      <div>
                        <h4 className="font-semibold text-zinc-900 dark:text-white">Ley Tributaria, Estimaciones y Juicio Profesional:</h4>
                        <p className="mt-1">
                          Las leyes tributarias son complejas y están sujetas a cambios. La ley impone penalidades e intereses cuando los contribuyentes subestiman su obligación tributaria o no realizan los pagos correspondientes. Usted sigue siendo el único responsable de sus obligaciones fiscales. Por favor, contáctenos si tiene inquietudes relacionadas con pagos estimados de impuestos o posibles penalidades.
                        </p>
                        <p className="mt-1">
                          Si nos encontramos con áreas de la ley tributaria que sean poco claras o que permitan interpretaciones razonables diferentes, le explicaremos las opciones disponibles, así como los riesgos y consecuencias asociados. Procederemos conforme a la alternativa que usted autorice.
                        </p>
                      </div>

                      <div>
                        <h4 className="font-semibold text-zinc-900 dark:text-white">Honorarios y Facturación:</h4>
                        <p className="mt-1">
                          Nuestros honorarios se basarán en el tiempo requerido para prestar los servicios, aplicando nuestras tarifas estándar por hora, más cualquier gasto incurrido. Las facturas deberán pagarse al momento de su presentación. En la medida permitida por la ley estatal, se podrá aplicar un cargo por intereses a todas las cuentas no pagadas dentro de un plazo de treinta (30) días.
                        </p>
                      </div>

                      <div>
                        <h4 className="font-semibold text-zinc-900 dark:text-white">Conservación de Registros:</h4>
                        <p className="mt-1">
                          Le devolveremos sus documentos originales al finalizar este compromiso. Usted debe conservar de manera segura dichos documentos, junto con toda la documentación de respaldo, cheques cancelados, entre otros, ya que podrían ser necesarios en el futuro para demostrar la exactitud y completitud de una declaración. Conservaremos copias de sus documentos y de nuestros papeles de trabajo durante siete (7) años, después de lo cual podrán ser destruidos.
                        </p>
                      </div>

                      <div>
                        <h4 className="font-semibold text-zinc-900 dark:text-white">Uso de Proveedores Externos y Personal en el Extranjero:</h4>
                        <p className="mt-1">
                          Para prestar nuestros servicios de manera eficiente, IC Multi Services, LLC podrá utilizar profesionales externos capacitados y personal de apoyo, incluidos colaboradores ubicados fuera de los Estados Unidos, para asistir en la preparación de impuestos y funciones administrativas.
                        </p>
                      </div>

                      <div>
                        <h4 className="font-semibold text-zinc-900 dark:text-white">Conclusión del Compromiso y Responsabilidad de Presentación:</h4>
                        <p className="mt-1">
                          Al firmar esta carta de compromiso, usted autoriza y consiente la divulgación de su información tributaria a dichos proveedores, exclusivamente para fines relacionados con la preparación y el soporte de sus declaraciones de impuestos. Mantenemos acuerdos de confidencialidad y medidas razonables de seguridad de datos para proteger su información conforme a las leyes y normas profesionales aplicables.
                        </p>
                        <p className="mt-1">
                          Nuestro compromiso para preparar sus declaraciones de impuestos concluirá con la entrega de nuestro análisis, junto con cualquier aclaración o corrección recomendada. Si usted no ha seleccionado presentar electrónicamente sus declaraciones a través de nuestra oficina, será su exclusiva responsabilidad presentar las declaraciones ante las autoridades fiscales correspondientes. Revise cuidadosamente todos los documentos de la declaración antes de firmarlos.
                        </p>
                      </div>

                      <div>
                        <h4 className="font-semibold text-zinc-900 dark:text-white">Aceptación:</h4>
                        <p className="mt-1">
                          Para confirmar que esta carta refleja correctamente su entendimiento y aceptación de los términos de este compromiso, por favor firme y devuelva una copia de la misma.
                        </p>
                        <p className="mt-1">
                          Gracias por confiar a IC Multi Services, LLC sus asuntos fiscales.
                        </p>
                      </div>

                      <div className="pt-4 border-t border-zinc-200 dark:border-zinc-700 flex justify-between items-end">
                        <div>
                          <p className="text-xs text-zinc-500 uppercase">Firma del Cliente</p>
                          <p className="italic text-zinc-400">
                            {engagementSigned ? `${profile?.first_name} ${profile?.last_name}` : "Firme electrónicamente a continuación..."}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-zinc-500 uppercase">Fecha</p>
                          <p>{new Date().toLocaleDateString("es-ES", { year: "numeric", month: "short", day: "numeric" })}</p>
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
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
                    </>
                  )}
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
                        {profile?.preferred_language === "es" ? "Procesando Firma..." : "Processing Signature..."}
                      </>
                    ) : (
                      <>
                        <FileSignature size={18} />
                        {profile?.preferred_language === "es" ? "Firmar Electrónicamente" : "E-Sign Document"}
                      </>
                    )}
                  </button>
                  <button className="px-6 py-3 text-sm font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white">
                    {profile?.preferred_language === "es" ? "Guardar Borrador" : "Save as Draft"}
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-3 rounded-lg bg-green-50 border border-green-200 p-4 dark:bg-green-900/20 dark:border-green-900">
                  <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                  <span className="text-sm font-medium text-green-700 dark:text-green-300">
                    {profile?.preferred_language === "es" 
                      ? `Documento firmado exitosamente el ${new Date().toLocaleDateString("es-ES")}`
                      : `Document signed successfully on ${new Date().toLocaleDateString()}`}
                  </span>
                  <button 
                    onClick={handleDownloadEngagement}
                    className="ml-auto text-sm font-medium text-green-600 hover:text-green-700 dark:text-green-400 flex items-center gap-1"
                  >
                    <Download size={14} />
                    {profile?.preferred_language === "es" ? "Descargar Copia" : "Download Copy"}
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
