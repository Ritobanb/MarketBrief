"use client";

import Link from "next/link";
import { useState } from "react";
import { InstrumentSearch } from "./InstrumentSearch";
import { createDefaultNotifications, DEFAULT_PREFERENCES, hasEnabledNotification, NOTIFICATION_OPTIONS, NotificationPreference, togglePreference } from "../../lib/preferences";
import { Instrument } from "../../lib/instruments";
import { FIXED_NOTIFICATION_SCHEDULES } from "../../lib/briefing";
import { isValidEmail } from "../../lib/subscriptions";

const marketOptions = ["Canadian markets", "US markets", "European markets", "Asia-Pacific markets"];
const contentOptions = [
  ["General market overview", "The essential overnight moves and opening context"],
  ["Top market-moving news", "The stories most likely to shape today’s session"],
  ["ETF ideas to watch", "An optional educational watchlist"],
  ["Day-trading opportunities", "An optional higher-risk section"],
] as const;

export default function SetupPage() {
  const [step, setStep] = useState(0);
  const [complete, setComplete] = useState(false);
  const [markets, setMarkets] = useState<string[]>([...DEFAULT_PREFERENCES.markets]);
  const [style, setStyle] = useState<string>(DEFAULT_PREFERENCES.style);
  const [experience, setExperience] = useState<string>(DEFAULT_PREFERENCES.experience);
  const [content, setContent] = useState<string[]>([...DEFAULT_PREFERENCES.content]);
  const [name, setName] = useState("");
  const [watchlist, setWatchlist] = useState<Instrument[]>([]);
  const [email, setEmail] = useState("");
  const [notifications, setNotifications] = useState<Record<string, NotificationPreference>>(createDefaultNotifications);
  const [timeZone, setTimeZone] = useState("America/Toronto");
  const [notificationError, setNotificationError] = useState("");
  const [emailError, setEmailError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const next = async () => {
    if (step === 2 && !hasEnabledNotification(notifications)) {
      setNotificationError("Choose at least one notification to continue.");
      return;
    }
    setNotificationError("");
    if (step !== 3) { setStep(value => value + 1); return; }
    if (!isValidEmail(email)) { setEmailError("Enter a valid email address to save your brief."); return; }
    setEmailError(""); setSubmitError(""); setSubmitting(true);
    try {
      const response = await fetch("/api/subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source: "personalized", email, name, markets, briefingStyle: style, experienceLevel: experience, contentToggles: content, timeZone,
          watchlistInstrumentIds: watchlist.map(item => item.instrumentId),
          notifications: Object.fromEntries(Object.entries(notifications).map(([id, preference]) => [id, preference.enabled])),
        }),
      });
      const result = await response.json() as { error?: string; fields?: Record<string, string> };
      if (!response.ok) { setEmailError(result.fields?.email || ""); throw new Error(result.error || "Unable to save your preferences."); }
      setComplete(true);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Unable to save your preferences. Please try again.");
    } finally { setSubmitting(false); }
  };

  const updateNotification = (id: string, changes: Partial<NotificationPreference>) => {
    setNotifications(previous => ({ ...previous, [id]: { ...previous[id], ...changes } }));
    setNotificationError("");
  };

  return <main className="setupPage">
    <nav className="setupNav shell">
      <Link className="brand" href="/">Morning Ledger<span>.</span></Link>
      <Link className="closeSetup" href="/" aria-label="Close personalization setup and return home"><span>Close</span><b aria-hidden="true">×</b></Link>
    </nav>
    <section className="setupWrap">
      {!complete ? <>
        <div className="progressMeta"><span>Personalize your brief</span><span>Step {step + 1} of 4</span></div>
        <div className="progressTrack"><div className="progressFill" style={{ width: `${((step + 1) / 4) * 100}%` }} /></div>

        {step === 0 && <>
          <h1>Set your market focus.</h1>
          <p className="setupLead">You can keep the defaults for clear, balanced coverage of Canada and the US.</p>
          <div className="defaultNotice"><span>Default setup</span><strong>Canada + US · Balanced · Beginner-friendly</strong></div>
          <fieldset className="setupFieldset"><legend>Markets</legend><div className="choices compactChoices">
            {marketOptions.map(label => { const selected = markets.includes(label); return <button type="button" key={label} aria-pressed={selected} className={`choice ${selected ? "selected" : ""}`} onClick={() => setMarkets(values => togglePreference(values, label))}><span className="check" aria-hidden="true">{selected ? "✓" : ""}</span><span className="choiceText"><strong>{label}</strong></span></button>; })}
          </div></fieldset>
          <div className="fieldGrid">
            <label className="setupField"><span>Briefing style</span><select value={style} onChange={event => setStyle(event.target.value)}><option>Balanced</option><option>Long-term investor</option><option>Active investor</option><option>Day trader</option></select></label>
            <label className="setupField"><span>Experience level</span><select value={experience} onChange={event => setExperience(event.target.value)}><option>Beginner-friendly</option><option>Intermediate</option><option>Advanced</option></select></label>
          </div>
        </>}

        {step === 1 && <>
          <h1>Choose what’s included.</h1>
          <p className="setupLead">The main sections are already included. Choose any extras you want.</p>
          <div className="choices toggleChoices" data-testid="content-options">
            {contentOptions.map(([label, detail]) => { const selected = content.includes(label); return <button type="button" key={label} aria-pressed={selected} className={`choice toggleChoice ${selected ? "selected" : ""}`} onClick={() => setContent(values => togglePreference(values, label))}><span className="choiceText"><strong>{label}</strong><small>{detail}</small></span><span className="switch" aria-hidden="true"><span /></span></button>; })}
          </div>
          <div className="fieldGrid optionalFields">
            <label className="setupField"><span>Name <small>Optional</small></span><input value={name} onChange={event => setName(event.target.value)} placeholder="How should we greet you?" /></label>
            <InstrumentSearch selected={watchlist} onChange={setWatchlist} />
          </div>
        </>}

        {step === 2 && <>
          <h1>Choose your notifications.</h1>
          <p className="setupLead">Choose the updates you want and when you want to receive them.</p>
          <div className="notificationList" data-testid="notification-options">
            {NOTIFICATION_OPTIONS.map(option => {
              const preference = notifications[option.id];
              return <div className={`notificationOption ${preference.enabled ? "selected" : ""}`} key={option.id}>
                <div className="notificationMain">
                  <span className="choiceText"><strong>{option.title}</strong><small>{option.schedule}</small></span>
                  <button type="button" className="switchButton" role="switch" aria-checked={preference.enabled} aria-label={`${option.title} notification`} onClick={() => updateNotification(option.id, { enabled: !preference.enabled })}><span className="switch" aria-hidden="true"><span /></span></button>
                </div>
                {preference.enabled && <div className="notificationTime"><span>Delivery time <small>Fixed for free edition</small></span><output aria-label={`${option.title} delivery time`}>{new Date(`2000-01-01T${preference.time}:00`).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}</output></div>}
              </div>;
            })}
          </div>
          <label className="setupField timeZoneField"><span>Time zone</span><select value={timeZone} onChange={event => setTimeZone(event.target.value)}><option>America/Toronto</option><option>America/Vancouver</option><option>America/New_York</option><option>Europe/London</option><option>Asia/Tokyo</option></select></label>
          {notificationError && <p className="validationError" role="alert">{notificationError}</p>}
        </>}

        {step === 3 && <>
          <h1>Your brief, at a glance.</h1>
          <p className="setupLead">Review your choices. Go back to make a change, or finish your setup.</p>
          <dl className="summaryList">
            <div><dt>Market coverage</dt><dd>{markets.length ? markets.join(" · ") : "General global markets"}</dd></div>
            <div><dt>Briefing style</dt><dd>{style}</dd></div>
            <div><dt>Experience</dt><dd>{experience}</dd></div>
            <div><dt>Included content</dt><dd>{content.length ? content.join(" · ") : "Core headlines only"}</dd></div>
            <div><dt>Optional details</dt><dd>{[name && `Name: ${name}`, watchlist.length && `Watchlist: ${watchlist.map(item => `${item.symbol} (${item.exchange})`).join(", ")}`].filter(Boolean).join(" · ") || "None provided"}</dd></div>
            <div><dt>Notifications</dt><dd className="notificationSummary">{NOTIFICATION_OPTIONS.filter(option => notifications[option.id].enabled).map(option => <span key={option.id}>{option.title} — {FIXED_NOTIFICATION_SCHEDULES[option.id].label}</span>)}</dd></div>
            <div><dt>Time zone</dt><dd>{timeZone}</dd></div>
          </dl>
          <label className="setupField summaryEmail"><span>Email address <small>Required</small></span><input type="email" inputMode="email" autoComplete="email" maxLength={254} required aria-invalid={Boolean(emailError)} aria-describedby="setup-email-error" value={email} onChange={event => { setEmail(event.target.value); setEmailError(""); setSubmitError(""); }} placeholder="you@company.com" /></label>
          {emailError && <p id="setup-email-error" className="validationError" role="alert">{emailError}</p>}
          {submitError && <p className="validationError" role="alert">{submitError}</p>}
        </>}

        <div className="setupActions"><button type="button" className="backButton" onClick={() => setStep(value => Math.max(0, value - 1))} disabled={step === 0 || submitting}>← Back</button><button type="button" className="nextButton" onClick={next} disabled={submitting}>{submitting ? "Saving…" : step === 3 ? "Finish setup" : "Continue →"}</button></div>
      </> : <div className="completion"><div className="completionMark">✓</div><p className="kicker">You&apos;re all set</p><h1>Your brief is ready.</h1><p className="setupLead">Your preferences are saved for {email}.</p><Link className="outlineButton" href="/">Return home →</Link></div>}
    </section>
  </main>;
}
