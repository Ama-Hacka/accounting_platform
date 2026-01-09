"use client";

import { useState, useRef, useEffect } from "react";
import SignatureCanvas from "react-signature-canvas";
import { Pen, Type, Eraser, Check, X, RotateCcw } from "lucide-react";

interface SignaturePadProps {
  onSign: (signatureData: SignatureData) => void;
  onCancel: () => void;
  signerName: string;
}

export interface SignatureData {
  signatureImage: string; // Base64 PNG image
  signatureType: "draw" | "type";
  signerName: string;
  signedAt: string; // ISO timestamp
  ipAddress?: string;
  userAgent: string;
}

// Handwriting-style fonts (using Google Fonts)
const SIGNATURE_FONTS = [
  { name: "Dancing Script", value: "'Dancing Script', cursive" },
  { name: "Great Vibes", value: "'Great Vibes', cursive" },
  { name: "Pacifico", value: "'Pacifico', cursive" },
  { name: "Caveat", value: "'Caveat', cursive" },
];

export default function SignaturePad({ onSign, onCancel, signerName }: SignaturePadProps) {
  const [mode, setMode] = useState<"draw" | "type">("draw");
  const [typedName, setTypedName] = useState(signerName);
  const [selectedFont, setSelectedFont] = useState(SIGNATURE_FONTS[0]);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [isEmpty, setIsEmpty] = useState(true);
  const signatureRef = useRef<SignatureCanvas>(null);
  const canvasContainerRef = useRef<HTMLDivElement>(null);

  // Load Google Fonts for typed signatures
  useEffect(() => {
    const link = document.createElement("link");
    link.href = "https://fonts.googleapis.com/css2?family=Dancing+Script:wght@700&family=Great+Vibes&family=Pacifico&family=Caveat:wght@700&display=swap";
    link.rel = "stylesheet";
    document.head.appendChild(link);
    return () => {
      document.head.removeChild(link);
    };
  }, []);

  // Resize canvas on window resize
  useEffect(() => {
    const handleResize = () => {
      if (signatureRef.current && canvasContainerRef.current) {
        const canvas = signatureRef.current.getCanvas();
        const container = canvasContainerRef.current;
        canvas.width = container.offsetWidth;
        canvas.height = container.offsetHeight;
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [mode]);

  const clearSignature = () => {
    if (signatureRef.current) {
      signatureRef.current.clear();
      setIsEmpty(true);
    }
  };

  const handleDrawEnd = () => {
    if (signatureRef.current) {
      setIsEmpty(signatureRef.current.isEmpty());
    }
  };

  // Generate signature image from typed name
  const generateTypedSignature = (): string => {
    const canvas = document.createElement("canvas");
    canvas.width = 400;
    canvas.height = 150;
    const ctx = canvas.getContext("2d");
    
    if (ctx) {
      ctx.fillStyle = "white";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "#1a1a1a";
      ctx.font = `48px ${selectedFont.value}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(typedName, canvas.width / 2, canvas.height / 2);
    }
    
    return canvas.toDataURL("image/png");
  };

  const handleSubmit = async () => {
    if (!agreedToTerms) {
      alert("Please agree to the terms before signing.");
      return;
    }

    let signatureImage: string;

    if (mode === "draw") {
      if (signatureRef.current?.isEmpty()) {
        alert("Please draw your signature.");
        return;
      }
      signatureImage = signatureRef.current?.toDataURL("image/png") || "";
    } else {
      if (!typedName.trim()) {
        alert("Please type your name.");
        return;
      }
      signatureImage = generateTypedSignature();
    }

    const signatureData: SignatureData = {
      signatureImage,
      signatureType: mode,
      signerName: mode === "type" ? typedName : signerName,
      signedAt: new Date().toISOString(),
      userAgent: navigator.userAgent,
    };

    onSign(signatureData);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl dark:bg-zinc-900 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-pink-600 to-pink-500 px-6 py-4">
          <h2 className="text-xl font-bold text-white">Electronic Signature</h2>
          <p className="text-pink-100 text-sm mt-1">
            Sign using your finger, mouse, or type your name
          </p>
        </div>

        {/* Mode Toggle */}
        <div className="flex border-b border-zinc-200 dark:border-zinc-700">
          <button
            onClick={() => setMode("draw")}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
              mode === "draw"
                ? "bg-pink-50 text-pink-600 border-b-2 border-pink-600 dark:bg-pink-900/20 dark:text-pink-400"
                : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
            }`}
          >
            <Pen size={18} />
            Draw Signature
          </button>
          <button
            onClick={() => setMode("type")}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
              mode === "type"
                ? "bg-pink-50 text-pink-600 border-b-2 border-pink-600 dark:bg-pink-900/20 dark:text-pink-400"
                : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
            }`}
          >
            <Type size={18} />
            Type Signature
          </button>
        </div>

        {/* Signature Area */}
        <div className="p-6">
          {mode === "draw" ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  Sign in the box below using your finger or mouse
                </p>
                <button
                  onClick={clearSignature}
                  className="flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
                >
                  <Eraser size={16} />
                  Clear
                </button>
              </div>
              <div
                ref={canvasContainerRef}
                className="relative h-40 w-full rounded-xl border-2 border-dashed border-zinc-300 bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-800"
              >
                <SignatureCanvas
                  ref={signatureRef}
                  penColor="#1a1a1a"
                  canvasProps={{
                    className: "absolute inset-0 w-full h-full rounded-xl touch-none",
                  }}
                  onEnd={handleDrawEnd}
                />
                {isEmpty && (
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                    <p className="text-zinc-400 dark:text-zinc-500">Sign here</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                  Type your full legal name
                </label>
                <input
                  type="text"
                  value={typedName}
                  onChange={(e) => setTypedName(e.target.value)}
                  className="w-full rounded-lg border border-zinc-200 px-4 py-3 text-lg dark:border-zinc-700 dark:bg-zinc-800"
                  placeholder="Your Full Name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                  Select signature style
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {SIGNATURE_FONTS.map((font) => (
                    <button
                      key={font.name}
                      onClick={() => setSelectedFont(font)}
                      className={`rounded-lg border-2 px-4 py-3 text-xl transition-all ${
                        selectedFont.name === font.name
                          ? "border-pink-500 bg-pink-50 dark:bg-pink-900/20"
                          : "border-zinc-200 hover:border-zinc-300 dark:border-zinc-700"
                      }`}
                      style={{ fontFamily: font.value }}
                    >
                      {typedName || "Your Name"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Preview */}
              <div className="rounded-xl border-2 border-dashed border-zinc-300 bg-zinc-50 p-6 dark:border-zinc-600 dark:bg-zinc-800">
                <p className="text-xs text-zinc-500 mb-2 text-center">Signature Preview</p>
                <p
                  className="text-4xl text-center text-zinc-900 dark:text-white"
                  style={{ fontFamily: selectedFont.value }}
                >
                  {typedName || "Your Signature"}
                </p>
              </div>
            </div>
          )}

          {/* Legal Agreement */}
          <div className="mt-6 rounded-lg bg-amber-50 border border-amber-200 p-4 dark:bg-amber-900/20 dark:border-amber-800">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={agreedToTerms}
                onChange={(e) => setAgreedToTerms(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-zinc-300 text-pink-600 focus:ring-pink-500"
              />
              <span className="text-sm text-amber-800 dark:text-amber-200">
                I, <strong>{signerName}</strong>, understand that by signing this document electronically, 
                I am providing my legal consent and agree that my electronic signature has the same 
                legal validity as a handwritten signature. I confirm that I am authorized to sign this document.
              </span>
            </label>
          </div>

          {/* Verification Info */}
          <div className="mt-4 rounded-lg bg-zinc-100 p-3 dark:bg-zinc-800">
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              <strong>Signature Verification:</strong> This signature will be recorded with a timestamp, 
              device information, and stored securely. A copy will be available in your documents.
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 border-t border-zinc-200 bg-zinc-50 px-6 py-4 dark:border-zinc-700 dark:bg-zinc-800/50">
          <button
            onClick={onCancel}
            className="flex-1 flex items-center justify-center gap-2 rounded-lg border border-zinc-300 px-4 py-3 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-700"
          >
            <X size={18} />
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!agreedToTerms || (mode === "draw" && isEmpty) || (mode === "type" && !typedName.trim())}
            className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-pink-600 px-4 py-3 text-sm font-semibold text-white hover:bg-pink-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Check size={18} />
            Sign Document
          </button>
        </div>
      </div>
    </div>
  );
}
