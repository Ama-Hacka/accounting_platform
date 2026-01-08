"use client";

import { useState } from "react";
import { 
  User, 
  Shield, 
  Settings, 
  Loader2,
  Eye,
  EyeOff,
  Mail,
  Phone,
  MapPin,
  Save
} from "lucide-react";

interface ProfileTabProps {
  user: any;
  profile: { 
    first_name?: string; 
    last_name?: string;
    phone_number?: string;
    address?: string;
  } | null;
  email: string;
  onUpdateProfile: (data: {
    firstName: string;
    lastName: string;
    phoneNumber: string;
    address: string;
    newPassword?: string;
  }) => Promise<void>;
}

type ProfileSection = "personal" | "security" | "preferences";

export default function ProfileTab({
  user,
  profile,
  email,
  onUpdateProfile,
}: ProfileTabProps) {
  const [activeSection, setActiveSection] = useState<ProfileSection>("personal");
  const [saving, setSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Form states
  const [firstName, setFirstName] = useState(profile?.first_name || "");
  const [lastName, setLastName] = useState(profile?.last_name || "");
  const [phoneNumber, setPhoneNumber] = useState(profile?.phone_number || "");
  const [address, setAddress] = useState(profile?.address || "");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Preferences
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [smsNotifications, setSmsNotifications] = useState(false);
  const [preferredLanguage, setPreferredLanguage] = useState("en");

  const sections = [
    { id: "personal" as ProfileSection, label: "Personal Information", icon: User },
    { id: "security" as ProfileSection, label: "Security", icon: Shield },
    { id: "preferences" as ProfileSection, label: "Preferences", icon: Settings },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (activeSection === "security" && newPassword && newPassword !== confirmPassword) {
      alert("Passwords do not match");
      return;
    }

    setSaving(true);
    setSuccessMessage(null);

    try {
      await onUpdateProfile({
        firstName,
        lastName,
        phoneNumber,
        address,
        newPassword: newPassword || undefined,
      });
      
      setSuccessMessage("Profile updated successfully!");
      setNewPassword("");
      setConfirmPassword("");
      
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error: any) {
      alert("Error updating profile: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white sm:text-3xl">
          Your Profile
        </h1>
        <p className="mt-2 text-zinc-600 dark:text-zinc-400">
          Manage your personal information and account settings.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Section Navigation - Sidebar */}
        <div className="lg:col-span-3">
          <nav className="rounded-2xl border border-zinc-200 bg-white p-2 shadow-sm dark:border-white/10 dark:bg-zinc-900">
            {sections.map((section) => {
              const Icon = section.icon;
              return (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={`w-full flex items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-medium transition-colors ${
                    activeSection === section.id
                      ? "bg-pink-50 text-pink-600 dark:bg-pink-900/20 dark:text-pink-400"
                      : "text-zinc-600 hover:bg-zinc-50 dark:text-zinc-400 dark:hover:bg-zinc-800"
                  }`}
                >
                  <Icon size={18} />
                  {section.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-9">
          <form onSubmit={handleSubmit}>
            <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-zinc-900">
              {/* Success Message */}
              {successMessage && (
                <div className="mb-6 rounded-lg bg-green-50 border border-green-200 p-4 text-sm text-green-700 dark:bg-green-900/20 dark:border-green-900 dark:text-green-400">
                  {successMessage}
                </div>
              )}

              {/* Personal Information Section */}
              {activeSection === "personal" && (
                <div className="space-y-6">
                  <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">
                    Personal Information
                  </h2>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                        First Name
                      </label>
                      <input
                        type="text"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm focus:border-pink-500 focus:outline-none focus:ring-2 focus:ring-pink-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                        placeholder="Enter first name"
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                        Last Name
                      </label>
                      <input
                        type="text"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm focus:border-pink-500 focus:outline-none focus:ring-2 focus:ring-pink-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                        placeholder="Enter last name"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                        <div className="flex items-center gap-2">
                          <Mail size={14} />
                          Email Address
                        </div>
                      </label>
                      <input
                        type="email"
                        value={email}
                        disabled
                        className="w-full cursor-not-allowed rounded-lg border border-zinc-200 bg-zinc-100 px-4 py-2.5 text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-800/50 dark:text-zinc-500"
                      />
                      <p className="mt-1 text-xs text-zinc-500">Contact support to change your email</p>
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                        <div className="flex items-center gap-2">
                          <Phone size={14} />
                          Phone Number
                        </div>
                      </label>
                      <input
                        type="tel"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        placeholder="(555) 123-4567"
                        className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm focus:border-pink-500 focus:outline-none focus:ring-2 focus:ring-pink-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                      <div className="flex items-center gap-2">
                        <MapPin size={14} />
                        Address
                      </div>
                    </label>
                    <input
                      type="text"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="Enter your full address"
                      className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm focus:border-pink-500 focus:outline-none focus:ring-2 focus:ring-pink-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                    />
                  </div>
                </div>
              )}

              {/* Security Section */}
              {activeSection === "security" && (
                <div className="space-y-6">
                  <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">
                    Security Settings
                  </h2>

                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/50 dark:bg-amber-900/20">
                    <p className="text-sm text-amber-800 dark:text-amber-200">
                      Leave password fields blank to keep your current password.
                    </p>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                      New Password
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Enter new password"
                        className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-2.5 pr-12 text-sm focus:border-pink-500 focus:outline-none focus:ring-2 focus:ring-pink-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                      Confirm New Password
                    </label>
                    <input
                      type={showPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm new password"
                      className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm focus:border-pink-500 focus:outline-none focus:ring-2 focus:ring-pink-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                    />
                    {newPassword && confirmPassword && newPassword !== confirmPassword && (
                      <p className="mt-1 text-xs text-red-500">Passwords do not match</p>
                    )}
                  </div>
                </div>
              )}

              {/* Preferences Section */}
              {activeSection === "preferences" && (
                <div className="space-y-6">
                  <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">
                    Communication Preferences
                  </h2>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-800">
                      <div>
                        <p className="text-sm font-medium text-zinc-900 dark:text-white">
                          Email Notifications
                        </p>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">
                          Receive updates about your tax filings via email
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setEmailNotifications(!emailNotifications)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          emailNotifications ? "bg-pink-600" : "bg-zinc-300 dark:bg-zinc-600"
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            emailNotifications ? "translate-x-6" : "translate-x-1"
                          }`}
                        />
                      </button>
                    </div>

                    <div className="flex items-center justify-between rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-800">
                      <div>
                        <p className="text-sm font-medium text-zinc-900 dark:text-white">
                          SMS Notifications
                        </p>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">
                          Receive important alerts via text message
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSmsNotifications(!smsNotifications)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          smsNotifications ? "bg-pink-600" : "bg-zinc-300 dark:bg-zinc-600"
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            smsNotifications ? "translate-x-6" : "translate-x-1"
                          }`}
                        />
                      </button>
                    </div>

                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                        Preferred Language
                      </label>
                      <select
                        value={preferredLanguage}
                        onChange={(e) => setPreferredLanguage(e.target.value)}
                        className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm focus:border-pink-500 focus:outline-none focus:ring-2 focus:ring-pink-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                      >
                        <option value="en">English</option>
                        <option value="es">Español</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* Save Button */}
              <div className="mt-8 pt-6 border-t border-zinc-200 dark:border-zinc-700">
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-lg bg-pink-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-pink-500 disabled:opacity-50"
                >
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save size={16} />
                      Save Changes
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
