"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const TABS = [
  { key: "profile", label: "Profil" },
  { key: "security", label: "Sécurité" },
  { key: "notifications", label: "Notifications" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

type MessageState =
  | {
      type: "success" | "error";
      text: string;
    }
  | null;

type NotificationOption = {
  id: string;
  label: string;
  description: string;
  defaultChecked: boolean;
  availability: "active" | "soon";
};

const NOTIFICATION_OPTIONS: NotificationOption[] = [
  {
    id: "order_updates",
    label: "Alertes commandes",
    description:
      "Recevez une alerte quand une commande avance ou doit être suivie.",
    defaultChecked: true,
    availability: "active",
  },
  {
    id: "delivery_alerts",
    label: "Alertes livraisons",
    description:
      "Recevez une alerte quand une livraison est en route ou arrive bientôt.",
    defaultChecked: true,
    availability: "active",
  },
  {
    id: "loan_updates",
    label: "Infos prêt / crédit",
    description:
      "Ces alertes ne sont pas encore disponibles dans le MVP actuel.",
    defaultChecked: false,
    availability: "soon",
  },
  {
    id: "promo_offers",
    label: "Promos fournisseurs",
    description:
      "Cette option sera ajoutée plus tard quand les offres seront disponibles.",
    defaultChecked: false,
    availability: "soon",
  },
];

function getMetadataString(
  metadata: Record<string, unknown> | null | undefined,
  keys: string[]
): string {
  for (const key of keys) {
    const value = metadata?.[key];
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }

  return "";
}

function buildDefaultNotificationPrefs(): Record<string, boolean> {
  return Object.fromEntries(
    NOTIFICATION_OPTIONS.map((option) => [option.id, option.defaultChecked])
  );
}

export default function SettingsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabKey>("profile");
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);

  const [storeName, setStoreName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [accountEmail, setAccountEmail] = useState("");
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMessage, setProfileMessage] = useState<MessageState>(null);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [securitySaving, setSecuritySaving] = useState(false);
  const [securityMessage, setSecurityMessage] = useState<MessageState>(null);

  const [notificationPrefs, setNotificationPrefs] = useState<Record<string, boolean>>(
    buildDefaultNotificationPrefs()
  );
  const [notifSaving, setNotifSaving] = useState(false);
  const [notifMessage, setNotifMessage] = useState<MessageState>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadUserSettings() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!isMounted) return;

      if (!user) {
        setIsLoadingProfile(false);
        return;
      }

      const metadata = (user.user_metadata ?? {}) as Record<string, unknown>;
      const savedPrefs = metadata.notification_preferences;

      setAccountEmail(user.email ?? "");
      setStoreName(
        getMetadataString(metadata, [
          "storeName",
          "store_name",
          "businessName",
          "business_name",
          "shopName",
          "shop_name",
        ])
      );
      setDisplayName(getMetadataString(metadata, ["display_name", "displayName"]));
      setPhoneNumber(
        getMetadataString(metadata, [
          "phone_number",
          "phone",
          "mobile",
          "mobile_number",
        ])
      );

      if (savedPrefs && typeof savedPrefs === "object" && !Array.isArray(savedPrefs)) {
        const savedPrefsRecord = savedPrefs as Record<string, unknown>;
        setNotificationPrefs(
          Object.fromEntries(
            NOTIFICATION_OPTIONS.map((option) => [
              option.id,
              typeof savedPrefsRecord[option.id] === "boolean"
                ? (savedPrefsRecord[option.id] as boolean)
                : option.defaultChecked,
            ])
          )
        );
      }

      setIsLoadingProfile(false);
    }

    void loadUserSettings();

    return () => {
      isMounted = false;
    };
  }, []);

  async function handleProfileSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setProfileMessage(null);

    if (!storeName.trim()) {
      setProfileMessage({
        type: "error",
        text: "Saisissez le nom de la boutique avant d’enregistrer.",
      });
      return;
    }

    setProfileSaving(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({
      data: {
        display_name: displayName.trim(),
        displayName: displayName.trim(),
        store_name: storeName.trim(),
        storeName: storeName.trim(),
        phone_number: phoneNumber.trim(),
        phone: phoneNumber.trim(),
      },
    });

    if (error) {
      setProfileMessage({
        type: "error",
        text: "Impossible d’enregistrer le profil. Réessayez.",
      });
    } else {
      setProfileMessage({
        type: "success",
        text: "Profil enregistré.",
      });
      router.refresh();
    }

    setProfileSaving(false);
  }

  async function handlePasswordChange(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSecurityMessage(null);

    if (!currentPassword) {
      setSecurityMessage({
        type: "error",
        text: "Saisissez votre mot de passe actuel.",
      });
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setSecurityMessage({
        type: "error",
        text: "Les nouveaux mots de passe ne correspondent pas.",
      });
      return;
    }

    if (newPassword.length < 8) {
      setSecurityMessage({
        type: "error",
        text: "Le nouveau mot de passe doit contenir au moins 8 caractères.",
      });
      return;
    }

    setSecuritySaving(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user?.email) {
      setSecurityMessage({
        type: "error",
        text: "Impossible de vérifier votre compte pour le moment.",
      });
      setSecuritySaving(false);
      return;
    }

    const { error: reAuthError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: currentPassword,
    });

    if (reAuthError) {
      setSecurityMessage({
        type: "error",
        text: "Le mot de passe actuel est incorrect.",
      });
      setSecuritySaving(false);
      return;
    }

    const { error } = await supabase.auth.updateUser({ password: newPassword });

    if (error) {
      setSecurityMessage({
        type: "error",
        text: "Impossible de modifier le mot de passe. Réessayez.",
      });
    } else {
      setSecurityMessage({
        type: "success",
        text: "Mot de passe modifié.",
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
    }

    setSecuritySaving(false);
  }

  async function handleNotifSave() {
    setNotifSaving(true);
    setNotifMessage(null);

    const supabase = createClient();
    const activePrefs = Object.fromEntries(
      NOTIFICATION_OPTIONS.filter((option) => option.availability === "active").map(
        (option) => [option.id, notificationPrefs[option.id] ?? option.defaultChecked]
      )
    );

    const { error } = await supabase.auth.updateUser({
      data: {
        notification_preferences: activePrefs,
      },
    });

    if (error) {
      setNotifMessage({
        type: "error",
        text: "Impossible d’enregistrer les notifications. Réessayez.",
      });
    } else {
      setNotifMessage({
        type: "success",
        text: "Notifications enregistrées.",
      });
      router.refresh();
    }

    setNotifSaving(false);
  }

  const inputClass =
    "w-full rounded-lg border border-border bg-surface px-4 py-2.5 text-sm text-primary placeholder:text-muted focus:border-accent/50 focus:outline-none focus:ring-1 focus:ring-accent/30 transition-colors disabled:cursor-not-allowed disabled:opacity-70";

  const messageClass = (message: Exclude<MessageState, null>) =>
    `rounded-lg border px-4 py-2.5 text-sm ${
      message.type === "error"
        ? "border-danger/20 bg-danger/5 text-danger"
        : "border-success/20 bg-success/5 text-success"
    }`;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold tracking-tight text-gradient">
          Paramètres
        </h1>
        <p className="mt-1 text-sm text-secondary">
          Gérez les informations de votre boutique, la sécurité du compte et les
          notifications utiles.
        </p>
      </div>

      <div className="flex gap-1 border-b border-border">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`-mb-px border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? "border-accent text-primary"
                : "border-transparent text-muted hover:text-secondary"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="glass-card max-w-xl rounded-xl p-6">
        {activeTab === "profile" && (
          <form onSubmit={handleProfileSave} className="space-y-5">
            <div>
              <h2 className="mb-1 font-heading text-base font-semibold text-primary">
                Profil
              </h2>
              <p className="text-xs text-muted">
                Gardez les informations pratiques de la boutique à jour.
              </p>
            </div>

            <div>
              <label
                htmlFor="storeName"
                className="mb-1.5 block text-xs font-medium text-secondary"
              >
                Nom de la boutique
              </label>
              <input
                id="storeName"
                type="text"
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                className={inputClass}
                placeholder="Ex. Boutique Nzambe"
                disabled={isLoadingProfile}
              />
            </div>

            <div>
              <label
                htmlFor="displayName"
                className="mb-1.5 block text-xs font-medium text-secondary"
              >
                Nom affiché
              </label>
              <input
                id="displayName"
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className={inputClass}
                placeholder="Ex. Maman Chantal"
                disabled={isLoadingProfile}
              />
            </div>

            <div>
              <label
                htmlFor="phoneNumber"
                className="mb-1.5 block text-xs font-medium text-secondary"
              >
                Numéro de téléphone
              </label>
              <input
                id="phoneNumber"
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className={inputClass}
                placeholder="Ex. +243 9XX XXX XXX"
                disabled={isLoadingProfile}
              />
            </div>

            <div>
              <label
                htmlFor="accountEmail"
                className="mb-1.5 block text-xs font-medium text-secondary"
              >
                Adresse e-mail
              </label>
              <input
                id="accountEmail"
                type="email"
                value={accountEmail}
                readOnly
                className={inputClass}
                placeholder="Votre adresse e-mail"
                disabled
              />
            </div>

            {profileMessage && <div className={messageClass(profileMessage)}>{profileMessage.text}</div>}

            <button
              type="submit"
              disabled={profileSaving || isLoadingProfile}
              className="accent-gradient btn-shine rounded-lg px-5 py-2 text-sm font-medium text-background disabled:cursor-not-allowed disabled:opacity-50"
            >
              {profileSaving ? "Enregistrement..." : "Enregistrer"}
            </button>
          </form>
        )}

        {activeTab === "security" && (
          <form onSubmit={handlePasswordChange} className="space-y-5">
            <div>
              <h2 className="mb-1 font-heading text-base font-semibold text-primary">
                Sécurité
              </h2>
              <p className="text-xs text-muted">
                Modifiez votre mot de passe pour protéger l’accès au compte.
              </p>
            </div>

            <div>
              <label
                htmlFor="currentPassword"
                className="mb-1.5 block text-xs font-medium text-secondary"
              >
                Mot de passe actuel
              </label>
              <input
                id="currentPassword"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className={inputClass}
                placeholder="Saisissez votre mot de passe actuel"
              />
            </div>

            <div>
              <label
                htmlFor="newPassword"
                className="mb-1.5 block text-xs font-medium text-secondary"
              >
                Nouveau mot de passe
              </label>
              <input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className={inputClass}
                placeholder="Au moins 8 caractères"
              />
            </div>

            <div>
              <label
                htmlFor="confirmNewPassword"
                className="mb-1.5 block text-xs font-medium text-secondary"
              >
                Confirmer le nouveau mot de passe
              </label>
              <input
                id="confirmNewPassword"
                type="password"
                value={confirmNewPassword}
                onChange={(e) => setConfirmNewPassword(e.target.value)}
                className={inputClass}
                placeholder="Retapez le nouveau mot de passe"
              />
            </div>

            {securityMessage && (
              <div className={messageClass(securityMessage)}>{securityMessage.text}</div>
            )}

            <button
              type="submit"
              disabled={securitySaving}
              className="accent-gradient btn-shine rounded-lg px-5 py-2 text-sm font-medium text-background disabled:cursor-not-allowed disabled:opacity-50"
            >
              {securitySaving ? "Mise à jour..." : "Modifier le mot de passe"}
            </button>
          </form>
        )}

        {activeTab === "notifications" && (
          <div className="space-y-5">
            <div>
              <h2 className="mb-1 font-heading text-base font-semibold text-primary">
                Notifications
              </h2>
              <p className="text-xs text-muted">
                Choisissez les alertes utiles pour suivre la boutique au quotidien.
              </p>
            </div>

            <div className="space-y-4">
              {NOTIFICATION_OPTIONS.map((option) => {
                const checked = notificationPrefs[option.id] ?? false;
                const disabled = option.availability === "soon";

                return (
                  <label
                    key={option.id}
                    className={`flex items-start gap-3 ${
                      disabled ? "cursor-default opacity-80" : "cursor-pointer group"
                    }`}
                  >
                    <div className="relative mt-0.5">
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={disabled}
                        onChange={(e) =>
                          setNotificationPrefs((prev) => ({
                            ...prev,
                            [option.id]: e.target.checked,
                          }))
                        }
                        className="sr-only"
                      />
                      <div
                        className={`flex h-4 w-4 items-center justify-center rounded border transition-colors ${
                          checked
                            ? "border-accent bg-accent"
                            : "border-border bg-surface"
                        } ${disabled ? "opacity-60" : ""}`}
                      >
                        <svg
                          className={`h-2.5 w-2.5 text-background transition-opacity ${
                            checked ? "opacity-100" : "opacity-0"
                          }`}
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={3}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="m4.5 12.75 6 6 9-13.5"
                          />
                        </svg>
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-primary">{option.label}</p>
                        {disabled && (
                          <span className="rounded-full border border-accent/20 bg-accent/10 px-2 py-0.5 text-[11px] font-medium text-accent">
                            Bientôt disponible
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 text-xs text-muted">{option.description}</p>
                    </div>
                  </label>
                );
              })}
            </div>

            {notifMessage && <div className={messageClass(notifMessage)}>{notifMessage.text}</div>}

            <button
              onClick={handleNotifSave}
              disabled={notifSaving}
              className="accent-gradient btn-shine rounded-lg px-5 py-2 text-sm font-medium text-background disabled:cursor-not-allowed disabled:opacity-50"
            >
              {notifSaving ? "Enregistrement..." : "Enregistrer"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
