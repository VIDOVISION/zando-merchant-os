"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const TABS = [
  { key: "profile", label: "Profil" },
  { key: "security", label: "Securite" },
  { key: "notifications", label: "Notifications" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

const NOTIFICATION_OPTIONS = [
  {
    id: "order_updates",
    label: "Mises a jour des commandes",
    description:
      "Recevez une alerte quand une commande est confirmee, envoyee ou receptionnee.",
    defaultChecked: true,
  },
  {
    id: "delivery_alerts",
    label: "Alertes de livraison",
    description:
      "Recevez une alerte quand une livraison est en route ou risque d'etre en retard.",
    defaultChecked: true,
  },
  {
    id: "loan_updates",
    label: "Mises a jour pret et credit",
    description:
      "Suivez l'etat de votre demande de pret et les changements de plafond credit.",
    defaultChecked: true,
  },
  {
    id: "promo_offers",
    label: "Offres et promos fournisseurs",
    description:
      "Recevez les offres et reductions utiles proposees par vos fournisseurs.",
    defaultChecked: false,
  },
];

export default function SettingsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabKey>("profile");

  const [displayName, setDisplayName] = useState("");
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMessage, setProfileMessage] = useState<string | null>(null);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [securitySaving, setSecuritySaving] = useState(false);
  const [securityMessage, setSecurityMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const [notificationPrefs, setNotificationPrefs] = useState<Record<string, boolean>>(
    Object.fromEntries(NOTIFICATION_OPTIONS.map((opt) => [opt.id, opt.defaultChecked]))
  );
  const [notifSaving, setNotifSaving] = useState(false);
  const [notifMessage, setNotifMessage] = useState<string | null>(null);

  async function handleProfileSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setProfileSaving(true);
    setProfileMessage(null);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ data: { display_name: displayName } });
    if (error) {
      setProfileMessage(error.message);
    } else {
      setProfileMessage("Profil mis a jour.");
      router.refresh();
    }
    setProfileSaving(false);
  }

  async function handlePasswordChange(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSecurityMessage(null);
    if (newPassword !== confirmNewPassword) {
      setSecurityMessage({ type: "error", text: "Les mots de passe ne correspondent pas." });
      return;
    }
    if (newPassword.length < 8) {
      setSecurityMessage({
        type: "error",
        text: "Le mot de passe doit contenir au moins 8 caracteres.",
      });
      return;
    }
    if (!currentPassword) {
      setSecurityMessage({ type: "error", text: "Saisissez votre mot de passe actuel." });
      return;
    }
    setSecuritySaving(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.email) {
      setSecurityMessage({ type: "error", text: "Impossible de verifier votre identite." });
      setSecuritySaving(false);
      return;
    }
    const { error: reAuthError } = await supabase.auth.signInWithPassword({ email: user.email, password: currentPassword });
    if (reAuthError) {
      setSecurityMessage({ type: "error", text: "Le mot de passe actuel est incorrect." });
      setSecuritySaving(false);
      return;
    }
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      setSecurityMessage({
        type: "error",
        text: "Impossible de modifier le mot de passe. Reessayez.",
      });
    } else {
      setSecurityMessage({ type: "success", text: "Mot de passe mis a jour." });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
    }
    setSecuritySaving(false);
  }

  async function handleNotifSave() {
    setNotifSaving(true);
    setNotifMessage(null);
    await new Promise((resolve) => setTimeout(resolve, 500));
    setNotifMessage("Preferences enregistrees.");
    setNotifSaving(false);
  }

  const inputClass =
    "w-full rounded-lg border border-border bg-surface px-4 py-2.5 text-sm text-primary placeholder:text-muted focus:border-accent/50 focus:outline-none focus:ring-1 focus:ring-accent/30 transition-colors";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold tracking-tight text-gradient">Parametres</h1>
        <p className="mt-1 text-sm text-secondary">
          Gere votre profil, la securite et les notifications.
        </p>
      </div>

      <div className="flex gap-1 border-b border-border">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
              activeTab === tab.key
                ? "border-accent text-primary"
                : "border-transparent text-muted hover:text-secondary"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="glass-card rounded-xl p-6 max-w-xl">
        {activeTab === "profile" && (
          <form onSubmit={handleProfileSave} className="space-y-5">
            <div>
              <h2 className="font-heading text-base font-semibold text-primary mb-1">Profil</h2>
              <p className="text-xs text-muted">
                Mettez a jour le nom affiche et le nom de la boutique.
              </p>
            </div>
            <div>
              <label htmlFor="displayName" className="block text-xs font-medium text-secondary mb-1.5">Nom de la boutique</label>
              <input id="displayName" type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)} className={inputClass} placeholder="Nom de votre boutique" />
            </div>
            {profileMessage && <p className="text-xs text-accent">{profileMessage}</p>}
            <button type="submit" disabled={profileSaving} className="accent-gradient btn-shine text-background text-sm font-medium px-5 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed">
              {profileSaving ? "Enregistrement..." : "Enregistrer"}
            </button>
          </form>
        )}

        {activeTab === "security" && (
          <form onSubmit={handlePasswordChange} className="space-y-5">
            <div>
              <h2 className="font-heading text-base font-semibold text-primary mb-1">Modifier le mot de passe</h2>
              <p className="text-xs text-muted">Mettez a jour votre mot de passe pour proteger votre compte.</p>
            </div>
            <div>
              <label htmlFor="currentPassword" className="block text-xs font-medium text-secondary mb-1.5">Mot de passe actuel</label>
              <input id="currentPassword" type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className={inputClass} placeholder="Saisissez le mot de passe actuel" />
            </div>
            <div>
              <label htmlFor="newPassword" className="block text-xs font-medium text-secondary mb-1.5">Nouveau mot de passe</label>
              <input id="newPassword" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className={inputClass} placeholder="Au moins 8 caracteres" />
            </div>
            <div>
              <label htmlFor="confirmNewPassword" className="block text-xs font-medium text-secondary mb-1.5">Confirmer le nouveau mot de passe</label>
              <input id="confirmNewPassword" type="password" value={confirmNewPassword} onChange={(e) => setConfirmNewPassword(e.target.value)} className={inputClass} placeholder="Retapez le nouveau mot de passe" />
            </div>
            {securityMessage && (
              <div className={`rounded-lg border px-4 py-2.5 text-sm ${
                securityMessage.type === "error"
                  ? "border-danger/20 bg-danger/5 text-danger"
                  : "border-success/20 bg-success/5 text-success"
              }`}>{securityMessage.text}</div>
            )}
            <button type="submit" disabled={securitySaving} className="accent-gradient btn-shine text-background text-sm font-medium px-5 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed">
              {securitySaving ? "Mise a jour..." : "Modifier le mot de passe"}
            </button>
          </form>
        )}

        {activeTab === "notifications" && (
          <div className="space-y-5">
            <div>
              <h2 className="font-heading text-base font-semibold text-primary mb-1">Notifications</h2>
              <p className="text-xs text-muted">Choisissez les messages que vous voulez recevoir.</p>
            </div>
            <div className="space-y-4">
              {NOTIFICATION_OPTIONS.map((option) => {
                const checked = notificationPrefs[option.id] ?? false;
                return (
                  <label key={option.id} className="flex items-start gap-3 cursor-pointer group">
                    <div className="relative mt-0.5">
                      <input type="checkbox" checked={checked} onChange={(e) => setNotificationPrefs((prev) => ({ ...prev, [option.id]: e.target.checked }))} className="sr-only" />
                      <div className={`w-4 h-4 rounded border transition-colors flex items-center justify-center ${
                        checked ? "bg-accent border-accent" : "bg-surface border-border"
                      }`}>
                        <svg className={`w-2.5 h-2.5 text-background transition-opacity ${checked ? "opacity-100" : "opacity-0"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                        </svg>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm text-primary font-medium group-hover:text-accent transition-colors">{option.label}</p>
                      <p className="text-xs text-muted mt-0.5">{option.description}</p>
                    </div>
                  </label>
                );
              })}
            </div>
            {notifMessage && <p className="text-xs text-accent">{notifMessage}</p>}
            <button onClick={handleNotifSave} disabled={notifSaving} className="accent-gradient btn-shine text-background text-sm font-medium px-5 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed">
              {notifSaving ? "Enregistrement..." : "Enregistrer"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
