"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

// ─── Types ────────────────────────────────────────────────────────────────────

interface AffiliateConfig {
  shopee_affiliate_id: string;
  shopee_partner_id: string;
  shopee_partner_key: string;
  lazada_app_key: string;
  lazada_tracking_id: string;
  shopee_enabled: string;
  lazada_enabled: string;
}

interface Analytics {
  totalClicks: number;
  todayClicks: number;
  byPlatform: { source: string; count: number }[];
  topProducts: { title: string; count: number }[];
  topSearches: { query: string; count: number }[];
  recentClicks: { id: number; product_title: string; source: string; timestamp: string }[];
}

type Tab = "affiliate" | "analytics" | "security";

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  icon,
  color = "blue",
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  color?: "blue" | "orange" | "purple" | "green";
}) {
  const colors = {
    blue: "bg-blue-50 text-blue-600",
    orange: "bg-orange-50 text-orange-500",
    purple: "bg-purple-50 text-purple-600",
    green: "bg-green-50 text-green-600",
  };
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${colors[color]}`}>
        {icon}
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-900">{value.toLocaleString()}</p>
        <p className="text-sm text-gray-500">{label}</p>
      </div>
    </div>
  );
}

function Toast({ msg, type }: { msg: string; type: "success" | "error" }) {
  return (
    <div
      className={`fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-medium animate-slide-up ${
        type === "success"
          ? "bg-green-600 text-white"
          : "bg-red-600 text-white"
      }`}
    >
      {type === "success" ? (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      ) : (
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
        </svg>
      )}
      {msg}
    </div>
  );
}

// ─── Affiliate Config Tab ─────────────────────────────────────────────────────

function AffiliateTab() {
  const [config, setConfig] = useState<AffiliateConfig>({
    shopee_affiliate_id: "",
    shopee_partner_id: "",
    shopee_partner_key: "",
    lazada_app_key: "",
    lazada_tracking_id: "",
    shopee_enabled: "true",
    lazada_enabled: "true",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  const showToast = (msg: string, type: "success" | "error") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    fetch("/api/admin/config")
      .then((r) => r.json())
      .then((d) => setConfig(d))
      .catch(() => showToast("Failed to load config", "error"))
      .finally(() => setLoading(false));
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/admin/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      if (res.ok) {
        showToast("Affiliate config saved successfully!", "success");
      } else {
        const d = await res.json();
        showToast(d.error ?? "Save failed", "error");
      }
    } catch {
      showToast("Network error", "error");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <>
      {toast && <Toast msg={toast.msg} type={toast.type} />}
      <form onSubmit={handleSave} className="max-w-2xl space-y-6">
        {/* ── Platform Toggles ── */}
        <div>
          <h3 className="text-lg font-semibold text-gray-800 mb-1">Platform Settings</h3>
          <p className="text-sm text-gray-500 mb-4">
            Enable or disable scraping for each platform. Disabled platforms are skipped entirely during search.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Shopee toggle */}
            <div className="flex items-center justify-between bg-white border border-gray-100 rounded-2xl px-5 py-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-shopee flex items-center justify-center text-white font-extrabold text-sm">S</div>
                <div>
                  <p className="font-semibold text-gray-800 text-sm">Shopee</p>
                  <p className={`text-xs font-medium ${config.shopee_enabled === "true" ? "text-green-500" : "text-gray-400"}`}>
                    {config.shopee_enabled === "true" ? "Enabled" : "Disabled"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setConfig((c) => ({ ...c, shopee_enabled: c.shopee_enabled === "true" ? "false" : "true" }))}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-shopee ${
                  config.shopee_enabled === "true" ? "bg-shopee" : "bg-gray-200"
                }`}
                aria-label="Toggle Shopee"
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${
                    config.shopee_enabled === "true" ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>

            {/* Lazada toggle */}
            <div className="flex items-center justify-between bg-white border border-gray-100 rounded-2xl px-5 py-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-lazada flex items-center justify-center text-white font-extrabold text-sm">L</div>
                <div>
                  <p className="font-semibold text-gray-800 text-sm">Lazada</p>
                  <p className={`text-xs font-medium ${config.lazada_enabled === "true" ? "text-green-500" : "text-gray-400"}`}>
                    {config.lazada_enabled === "true" ? "Enabled" : "Disabled"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setConfig((c) => ({ ...c, lazada_enabled: c.lazada_enabled === "true" ? "false" : "true" }))}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-lazada ${
                  config.lazada_enabled === "true" ? "bg-lazada" : "bg-gray-200"
                }`}
                aria-label="Toggle Lazada"
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${
                    config.lazada_enabled === "true" ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* ── Affiliate IDs ── */}
        <div>
          <h3 className="text-lg font-semibold text-gray-800 mb-1">Affiliate IDs</h3>
          <p className="text-sm text-gray-500 mb-6">
            These values are stored in the database and override any .env settings.
            All product links are automatically converted using these IDs.
          </p>
        </div>

        {/* Shopee */}
        <div className="bg-shopee-light border border-shopee/20 rounded-2xl p-6 space-y-5">
          {/* Header + mode badge */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-shopee flex items-center justify-center text-white font-extrabold">S</div>
              <div>
                <p className="font-bold text-shopee">Shopee Thailand</p>
                <p className="text-xs text-gray-500">shopee.co.th</p>
              </div>
            </div>
            {/* Show current mode: API or Browser */}
            {config.shopee_partner_id && config.shopee_partner_key ? (
              <span className="inline-flex items-center gap-1.5 bg-green-50 text-green-700 border border-green-200 text-xs font-semibold px-3 py-1 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
                Open Platform API
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 bg-amber-50 text-amber-700 border border-amber-200 text-xs font-semibold px-3 py-1 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block" />
                Browser fallback
              </span>
            )}
          </div>

          {/* Affiliate ID (for link generation) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Affiliate ID
              <span className="ml-1.5 text-xs text-gray-400 font-normal">(used in affiliate links)</span>
            </label>
            <input
              type="text"
              value={config.shopee_affiliate_id}
              onChange={(e) => setConfig((c) => ({ ...c, shopee_affiliate_id: e.target.value }))}
              placeholder="e.g. 15351330080"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-shopee focus:border-transparent text-sm font-mono"
            />
            <p className="text-xs text-gray-400 mt-1.5">
              Get yours at{" "}
              <a href="https://affiliate.shopee.co.th" target="_blank" rel="noopener noreferrer" className="text-shopee underline">
                affiliate.shopee.co.th
              </a>
            </p>
          </div>

          {/* Open Platform credentials */}
          <div className="border-t border-shopee/10 pt-4">
            <p className="text-sm font-semibold text-gray-700 mb-1">
              Open Platform API
              <span className="ml-2 text-xs font-normal text-gray-400">(optional — enables faster, official search)</span>
            </p>
            <p className="text-xs text-gray-500 mb-3">
              Register at{" "}
              <a href="https://open.shopee.com" target="_blank" rel="noopener noreferrer" className="text-shopee underline">
                open.shopee.com
              </a>{" "}
              to get a Partner ID and Partner Key. When configured, the scraper will use the official API instead of browser automation.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Partner ID</label>
                <input
                  type="text"
                  value={config.shopee_partner_id}
                  onChange={(e) => setConfig((c) => ({ ...c, shopee_partner_id: e.target.value }))}
                  placeholder="e.g. 1234567"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-shopee focus:border-transparent text-sm font-mono"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Partner Key</label>
                <input
                  type="password"
                  value={config.shopee_partner_key}
                  onChange={(e) => setConfig((c) => ({ ...c, shopee_partner_key: e.target.value }))}
                  placeholder="Your partner key / secret"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-shopee focus:border-transparent text-sm font-mono"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Lazada */}
        <div className="bg-lazada-light border border-lazada/20 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-lazada flex items-center justify-center text-white font-extrabold">L</div>
            <div>
              <p className="font-bold text-lazada">Lazada Thailand</p>
              <p className="text-xs text-gray-500">affiliate.lazada.co.th</p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">App Key</label>
              <input
                type="text"
                value={config.lazada_app_key}
                onChange={(e) => setConfig((c) => ({ ...c, lazada_app_key: e.target.value }))}
                placeholder="e.g. 123456"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-lazada focus:border-transparent text-sm font-mono"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Tracking ID</label>
              <input
                type="text"
                value={config.lazada_tracking_id}
                onChange={(e) => setConfig((c) => ({ ...c, lazada_tracking_id: e.target.value }))}
                placeholder="e.g. your_tracking_id"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-lazada focus:border-transparent text-sm font-mono"
              />
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-2">
            Get yours at{" "}
            <a href="https://affiliate.lazada.co.th" target="_blank" rel="noopener noreferrer" className="text-lazada underline">
              affiliate.lazada.co.th
            </a>
          </p>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="flex items-center gap-2 bg-blue-600 text-white font-semibold px-6 py-3 rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {saving ? (
            <>
              <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 12 0 12 0v4a8 8 0 00-8 8H4z" />
              </svg>
              Saving...
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Save Changes
            </>
          )}
        </button>
      </form>
    </>
  );
}

// ─── Analytics Tab ────────────────────────────────────────────────────────────

function AnalyticsTab() {
  const [data, setData] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/admin/analytics")
      .then((r) => r.json())
      .then(setData)
      .catch(() => setError("Failed to load analytics"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }
  if (error || !data) {
    return <p className="text-red-500 py-10">{error || "No data"}</p>;
  }

  const shopeeClicks = data.byPlatform.find((p) => p.source === "Shopee")?.count ?? 0;
  const lazadaClicks = data.byPlatform.find((p) => p.source === "Lazada")?.count ?? 0;

  return (
    <div className="space-y-8">
      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Clicks"
          value={data.totalClicks}
          color="blue"
          icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5" /></svg>}
        />
        <StatCard
          label="Clicks Today"
          value={data.todayClicks}
          color="green"
          icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>}
        />
        <StatCard
          label="Shopee Clicks (30d)"
          value={shopeeClicks}
          color="orange"
          icon={<svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /></svg>}
        />
        <StatCard
          label="Lazada Clicks (30d)"
          value={lazadaClicks}
          color="purple"
          icon={<svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><rect x="2" y="5" width="20" height="14" rx="2" /></svg>}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Products */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h3 className="font-semibold text-gray-800 mb-4">Top Clicked Products (30d)</h3>
          {data.topProducts.length === 0 ? (
            <p className="text-gray-400 text-sm">No clicks yet</p>
          ) : (
            <ol className="space-y-2">
              {data.topProducts.map((p, i) => (
                <li key={i} className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-gray-100 text-gray-500 text-xs font-bold flex items-center justify-center flex-shrink-0">
                    {i + 1}
                  </span>
                  <span className="text-sm text-gray-700 flex-1 truncate">{p.title || "(unknown)"}</span>
                  <span className="text-sm font-semibold text-blue-600">{p.count}</span>
                </li>
              ))}
            </ol>
          )}
        </div>

        {/* Top Searches */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h3 className="font-semibold text-gray-800 mb-4">Top Searches (30d)</h3>
          {data.topSearches.length === 0 ? (
            <p className="text-gray-400 text-sm">No searches yet</p>
          ) : (
            <ol className="space-y-2">
              {data.topSearches.map((s, i) => (
                <li key={i} className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-gray-100 text-gray-500 text-xs font-bold flex items-center justify-center flex-shrink-0">
                    {i + 1}
                  </span>
                  <span className="text-sm text-gray-700 flex-1 truncate">{s.query}</span>
                  <span className="text-sm font-semibold text-green-600">{s.count}</span>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>

      {/* Recent Clicks */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <h3 className="font-semibold text-gray-800 mb-4">Recent Clicks</h3>
        {data.recentClicks.length === 0 ? (
          <p className="text-gray-400 text-sm">No clicks recorded yet</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left text-gray-500 font-medium pb-2">Product</th>
                  <th className="text-left text-gray-500 font-medium pb-2">Platform</th>
                  <th className="text-left text-gray-500 font-medium pb-2">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {data.recentClicks.map((c) => (
                  <tr key={c.id}>
                    <td className="py-2 pr-4 text-gray-700 max-w-xs truncate">{c.product_title || "—"}</td>
                    <td className="py-2 pr-4">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${
                          c.source === "Shopee"
                            ? "bg-shopee-light text-shopee"
                            : "bg-lazada-light text-lazada"
                        }`}
                      >
                        {c.source}
                      </span>
                    </td>
                    <td className="py-2 text-gray-400 text-xs whitespace-nowrap">
                      {new Date(c.timestamp).toLocaleString("th-TH", {
                        dateStyle: "short",
                        timeStyle: "short",
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Security Tab ─────────────────────────────────────────────────────────────

function SecurityTab() {
  const [form, setForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  const showToast = (msg: string, type: "success" | "error") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (form.newPassword !== form.confirmPassword) {
      showToast("New passwords do not match", "error");
      return;
    }
    if (form.newPassword.length < 8) {
      showToast("New password must be at least 8 characters", "error");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/admin/password", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: form.currentPassword,
          newPassword: form.newPassword,
        }),
      });
      const d = await res.json();
      if (res.ok) {
        showToast("Password changed successfully!", "success");
        setForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      } else {
        showToast(d.error ?? "Failed to change password", "error");
      }
    } catch {
      showToast("Network error", "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      {toast && <Toast msg={toast.msg} type={toast.type} />}
      <div className="max-w-md">
        <h3 className="text-lg font-semibold text-gray-800 mb-1">Change Password</h3>
        <p className="text-sm text-gray-500 mb-6">
          Choose a strong password of at least 8 characters.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {[
            { key: "currentPassword", label: "Current Password", placeholder: "Your current password" },
            { key: "newPassword", label: "New Password", placeholder: "At least 8 characters" },
            { key: "confirmPassword", label: "Confirm New Password", placeholder: "Repeat new password" },
          ].map(({ key, label, placeholder }) => (
            <div key={key}>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
              <input
                type="password"
                value={form[key as keyof typeof form]}
                onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                placeholder={placeholder}
                required
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              />
            </div>
          ))}

          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 bg-blue-600 text-white font-semibold px-6 py-3 rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors mt-2"
          >
            {saving ? (
              <>
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 12 0 12 0v4a8 8 0 00-8 8H4z" />
                </svg>
                Saving...
              </>
            ) : (
              "Update Password"
            )}
          </button>
        </form>

        {/* Session info */}
        <div className="mt-8 p-4 bg-amber-50 border border-amber-200 rounded-xl">
          <p className="text-sm text-amber-800 font-medium">Security note</p>
          <p className="text-xs text-amber-700 mt-1">
            Sessions last 24 hours. After changing your password, existing sessions
            remain valid until they expire. Log out and back in to use the new password.
          </p>
        </div>
      </div>
    </>
  );
}

// ─── Dashboard Shell ──────────────────────────────────────────────────────────

export default function AdminDashboard() {
  const [tab, setTab] = useState<Tab>("affiliate");
  const [loggingOut, setLoggingOut] = useState(false);
  const router = useRouter();

  const handleLogout = useCallback(async () => {
    setLoggingOut(true);
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin");
  }, [router]);

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    {
      id: "affiliate",
      label: "Affiliate Config",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
        </svg>
      ),
    },
    {
      id: "analytics",
      label: "Analytics",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
    },
    {
      id: "security",
      label: "Security",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Top header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z" />
              </svg>
            </div>
            <span className="font-bold text-gray-800">PriceWise TH</span>
            <span className="text-gray-300">|</span>
            <span className="text-sm text-gray-500">Admin Panel</span>
          </div>

          <div className="flex items-center gap-3">
            <a
              href="/"
              target="_blank"
              className="text-sm text-gray-500 hover:text-blue-600 transition-colors flex items-center gap-1"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              View Site
            </a>
            <button
              onClick={handleLogout}
              disabled={loggingOut}
              className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-red-600 transition-colors disabled:opacity-50"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              {loggingOut ? "Logging out..." : "Log out"}
            </button>
          </div>
        </div>
      </header>

      <div className="flex flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 gap-8">
        {/* Sidebar */}
        <aside className="w-52 flex-shrink-0 hidden md:block">
          <nav className="space-y-1 sticky top-22">
            {tabs.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors text-left ${
                  tab === t.id
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                {t.icon}
                {t.label}
              </button>
            ))}
          </nav>
        </aside>

        {/* Mobile tab bar */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 flex z-30">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 flex flex-col items-center gap-1 py-3 text-xs font-medium transition-colors ${
                tab === t.id ? "text-blue-600" : "text-gray-400"
              }`}
            >
              {t.icon}
              {t.label.split(" ")[0]}
            </button>
          ))}
        </div>

        {/* Main content */}
        <main className="flex-1 min-w-0 pb-20 md:pb-0">
          <div className="mb-6">
            <h1 className="text-xl font-bold text-gray-900">
              {tabs.find((t) => t.id === tab)?.label}
            </h1>
          </div>

          {tab === "affiliate" && <AffiliateTab />}
          {tab === "analytics" && <AnalyticsTab />}
          {tab === "security" && <SecurityTab />}
        </main>
      </div>
    </div>
  );
}
