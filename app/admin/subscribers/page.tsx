"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CYCLE_TYPES } from "../../../lib/briefing";
import { CONTENT_OPTIONS, EXPERIENCE_OPTIONS, MARKET_OPTIONS, STYLE_OPTIONS, TIME_ZONE_OPTIONS } from "../../../lib/subscriptions";

type Subscriber = {
  id: string; email: string; name: string | null; markets: string[]; briefingStyle: string; experienceLevel: string;
  contentToggles: string[]; timeZone: string; isActive: boolean; createdAt: string; updatedAt: string;
  notifications: Record<string, boolean>; watchlist: Array<{ stableInstrumentId: string; symbol: string; exchange: string }>;
};

const emptyForm = () => ({
  email: "", name: "", markets: ["Canadian markets", "US markets"], briefingStyle: "Balanced",
  experienceLevel: "Beginner-friendly", contentToggles: ["General market overview", "Top market-moving news"],
  timeZone: "America/Toronto", notifications: { daily: true, premarket: false, close: false, weekly: true },
  watchlistInstrumentIds: [] as string[],
});

export default function SubscriberAdminPage() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("");
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<Subscriber | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const headers = useCallback(() => ({ "Content-Type": "application/json" }), []);
  const load = useCallback(async (targetPage = page, filters = { query, active: activeFilter }) => {
    setLoading(true); setError("");
    try {
      const params = new URLSearchParams({ page: String(targetPage), ...(filters.query ? { q: filters.query } : {}), ...(filters.active ? { active: filters.active } : {}) });
      const response = await fetch(`/api/admin/subscribers?${params}`, { headers: headers(), cache: "no-store" });
      const data = await response.json() as { subscribers?: Subscriber[]; total?: number; error?: string };
      if (response.status === 401) { router.replace("/admin/login"); return; }
      if (!response.ok) throw new Error(data.error || "Unable to load subscribers.");
      setSubscribers(data.subscribers || []); setTotal(data.total || 0); setPage(targetPage);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Unable to load subscribers."); }
    finally { setLoading(false); }
  }, [activeFilter, headers, page, query, router]);

  useEffect(() => {
    const timer = window.setTimeout(() => { void load(1); }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const logout = async () => { await fetch("/api/admin/auth/logout", { method: "POST" }); router.replace("/admin/login"); router.refresh(); };

  const beginCreate = () => { setEditing(null); setForm(emptyForm()); setError(""); };
  const beginEdit = (subscriber: Subscriber) => {
    setEditing(subscriber);
    setForm({ email: subscriber.email, name: subscriber.name || "", markets: subscriber.markets, briefingStyle: subscriber.briefingStyle, experienceLevel: subscriber.experienceLevel, contentToggles: subscriber.contentToggles, timeZone: subscriber.timeZone, notifications: { daily: false, premarket: false, close: false, weekly: false, ...subscriber.notifications }, watchlistInstrumentIds: subscriber.watchlist.map(item => item.stableInstrumentId) });
  };
  const toggleList = (field: "markets" | "contentToggles", value: string) => setForm(current => ({ ...current, [field]: current[field].includes(value) ? current[field].filter(item => item !== value) : [...current[field], value] }));

  const save = async (event: FormEvent) => {
    event.preventDefault(); setSaving(true); setError("");
    try {
      const response = await fetch(editing ? `/api/admin/subscribers/${editing.id}` : "/api/admin/subscribers", { method: editing ? "PUT" : "POST", headers: headers(), body: JSON.stringify({ source: "personalized", ...form }) });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error || "Unable to save subscriber.");
      setEditing(null); setForm(emptyForm()); setQuery(""); setActiveFilter(""); await load(1, { query: "", active: "" });
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Unable to save subscriber."); }
    finally { setSaving(false); }
  };

  const setActive = async (subscriber: Subscriber) => {
    const response = await fetch(`/api/admin/subscribers/${subscriber.id}`, { method: "PATCH", headers: headers(), body: JSON.stringify({ isActive: !subscriber.isActive }) });
    if (response.ok) await load(page); else setError("Unable to update subscriber status.");
  };
  const remove = async (subscriber: Subscriber) => {
    if (!window.confirm(`Permanently delete ${subscriber.email}? This also removes their delivery history.`)) return;
    const response = await fetch(`/api/admin/subscribers/${subscriber.id}`, { method: "DELETE", headers: headers() });
    if (response.ok) { if (editing?.id === subscriber.id) beginCreate(); await load(page); } else setError("Unable to delete subscriber.");
  };

  return <main className="setupPage">
    <nav className="setupNav shell"><Link className="brand" href="/">Morning Ledger<span>.</span></Link><div className="adminNavLinks"><Link href="/admin/catalogue">Catalogue</Link><button type="button" onClick={logout}>Sign out</button><Link className="closeSetup" href="/" aria-label="Close subscriber admin and return home"><span>Close</span><b aria-hidden="true">×</b></Link></div></nav>
    <section className="adminSubscribers shell">
      <header className="adminHeader"><div><p className="kicker">Administration</p><h1>Subscribers.</h1><p>Manage profiles, notification subscriptions, and account status.</p></div><button type="button" className="nextButton" onClick={beginCreate}>New subscriber</button></header>
      <div className="adminToolbar"><input aria-label="Search subscribers" value={query} onChange={event => setQuery(event.target.value)} placeholder="Search email or name" /><select aria-label="Filter subscriber status" value={activeFilter} onChange={event => setActiveFilter(event.target.value)}><option value="">All statuses</option><option value="true">Active</option><option value="false">Inactive</option></select><button type="button" onClick={() => load(1)}>Search</button></div>
      {error && <p className="validationError" role="alert">{error}</p>}
      <div className="adminGrid">
        <div className="subscriberTableWrap"><table className="subscriberTable"><thead><tr><th>Subscriber</th><th>Subscriptions</th><th>Status</th><th>Updated</th><th>Actions</th></tr></thead><tbody>
          {subscribers.map(subscriber => <tr key={subscriber.id}><td><strong>{subscriber.email}</strong><small>{subscriber.name || "No name"}<br />{subscriber.watchlist.length} watchlist item{subscriber.watchlist.length === 1 ? "" : "s"}</small></td><td>{CYCLE_TYPES.filter(type => subscriber.notifications[type]).join(", ") || "None"}</td><td><span className={`statusPill ${subscriber.isActive ? "active" : ""}`}>{subscriber.isActive ? "Active" : "Inactive"}</span></td><td>{new Date(subscriber.updatedAt).toLocaleDateString()}</td><td><div className="rowActions"><button type="button" onClick={() => beginEdit(subscriber)}>Edit</button><button type="button" onClick={() => setActive(subscriber)}>{subscriber.isActive ? "Deactivate" : "Activate"}</button><button type="button" className="dangerAction" onClick={() => remove(subscriber)}>Delete</button></div></td></tr>)}
          {!loading && !subscribers.length && <tr><td colSpan={5}>No subscribers found.</td></tr>}
        </tbody></table><div className="pagination"><button type="button" disabled={page <= 1} onClick={() => load(page - 1)}>Previous</button><span>Page {page} · {total} total</span><button type="button" disabled={page * 25 >= total} onClick={() => load(page + 1)}>Next</button></div></div>
        <form className="subscriberEditor" onSubmit={save}><h2>{editing ? "Edit subscriber" : "Add subscriber"}</h2>
          <label><span>Email</span><input type="email" required maxLength={254} value={form.email} onChange={event => setForm(current => ({ ...current, email: event.target.value }))} /></label>
          <label><span>Name <small>Optional</small></span><input maxLength={80} value={form.name} onChange={event => setForm(current => ({ ...current, name: event.target.value }))} /></label>
          <div className="editorColumns"><label><span>Briefing style</span><select value={form.briefingStyle} onChange={event => setForm(current => ({ ...current, briefingStyle: event.target.value }))}>{STYLE_OPTIONS.map(item => <option key={item}>{item}</option>)}</select></label><label><span>Experience</span><select value={form.experienceLevel} onChange={event => setForm(current => ({ ...current, experienceLevel: event.target.value }))}>{EXPERIENCE_OPTIONS.map(item => <option key={item}>{item}</option>)}</select></label></div>
          <label><span>Time zone</span><select value={form.timeZone} onChange={event => setForm(current => ({ ...current, timeZone: event.target.value }))}>{TIME_ZONE_OPTIONS.map(item => <option key={item}>{item}</option>)}</select></label>
          <fieldset><legend>Markets</legend>{MARKET_OPTIONS.map(item => <label className="checkRow" key={item}><input type="checkbox" checked={form.markets.includes(item)} onChange={() => toggleList("markets", item)} />{item}</label>)}</fieldset>
          <fieldset><legend>Included content</legend>{CONTENT_OPTIONS.map(item => <label className="checkRow" key={item}><input type="checkbox" checked={form.contentToggles.includes(item)} onChange={() => toggleList("contentToggles", item)} />{item}</label>)}</fieldset>
          <fieldset><legend>Notifications</legend>{CYCLE_TYPES.map(item => <label className="checkRow" key={item}><input type="checkbox" checked={form.notifications[item]} onChange={event => setForm(current => ({ ...current, notifications: { ...current.notifications, [item]: event.target.checked } }))} />{item}</label>)}</fieldset>
          {editing?.watchlist.length ? <p className="editorNote">Watchlist preserved: {editing.watchlist.map(item => `${item.symbol} (${item.exchange})`).join(", ")}</p> : null}
          <div className="editorActions"><button type="submit" className="nextButton" disabled={saving}>{saving ? "Saving…" : "Save subscriber"}</button>{editing && <button type="button" onClick={beginCreate}>Cancel</button>}</div>
        </form>
      </div>
    </section>
  </main>;
}
