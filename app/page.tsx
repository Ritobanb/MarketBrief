"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { createHomepageSubscription, isValidEmail } from "../lib/subscriptions";

export default function Home() {
  const [signupComplete, setSignupComplete] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [signupError, setSignupError] = useState("");

  const handleSignup = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") || "");
    if (!isValidEmail(email)) { setSignupError("Enter a valid email address."); return; }
    setSubmitting(true); setSignupError("");
    try {
      const response = await fetch("/api/subscriptions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(createHomepageSubscription(email)) });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error || "Unable to save your email.");
      setSignupComplete(true);
    } catch (error) {
      setSignupError(error instanceof Error ? error.message : "Unable to save your email. Please try again.");
    } finally { setSubmitting(false); }
  };

  return (
    <main>
      <nav className="nav shell" aria-label="Main navigation">
        <Link className="brand" href="/">Morning Ledger<span>.</span></Link>
        <Link className="navLink" href="/setup">Personalize your brief <span aria-hidden="true">↗</span></Link>
      </nav>

      <section className="hero shell">
        <aside className="heroMarketVisual" aria-hidden="true">
          <div className="visualHeader"><span>Morning signal</span><small>07:00</small></div>
          <div className="signalBars"><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /></div>
          <p className="visualCaption">One clear view before the opening bell.</p>
          <dl><div><dt>Markets</dt><dd>Canada + US</dd></div><div><dt>Context</dt><dd>What moved &amp; why</dd></div><div><dt>Watchlist</dt><dd>Your tickers</dd></div></dl>
        </aside>
        <div className="eyebrow"><span className="liveDot" /> Weekdays · 7:00 AM</div>
        <h1>The market, made<br />clear before coffee.</h1>
        <p className="heroCopy">Your markets, your watchlist, one simple daily brief. Clear context without the noise.</p>

        <form className="signup" onSubmit={handleSignup} data-testid="signup-form" noValidate>
          <label className="srOnly" htmlFor="email">Work email</label>
          <input id="email" name="email" type="email" inputMode="email" autoComplete="email" maxLength={254} aria-invalid={Boolean(signupError)} aria-describedby="signup-status" placeholder="you@company.com" onChange={() => setSignupError("")} required />
          <button type="submit" disabled={signupComplete || submitting}>{signupComplete ? "You’re on the list ✓" : submitting ? "Saving…" : <>Get your daily brief <span aria-hidden="true">→</span></>}</button>
        </form>
        <p id="signup-status" className={signupError ? "finePrint validationError" : "finePrint"} role={signupError ? "alert" : "status"}>{signupError || (signupComplete ? "Thanks — your weekday brief preferences are saved." : "Free weekday delivery. Unsubscribe anytime.")}</p>
        <div className="heroPersonalize" aria-label="Personalized market brief">
          <div><span className="personalizeLabel">Recommended</span><strong>Want a brief built around you?</strong><p>Choose your markets, watchlist tickers, experience level, and the updates you want to receive.</p></div>
          <Link href="/setup">Personalize my brief <span aria-hidden="true">→</span></Link>
        </div>
      </section>

      <section className="briefPreview shell" aria-labelledby="inside-title">
        <div className="sectionIntro">
          <div className="readingStamp" aria-hidden="true"><strong>05</strong><span>minute<br />read</span></div>
          <div className="openingMotif" aria-hidden="true"><span className="openingSun" /><span className="openingLine" /><i /><i /><i /></div>
          <p className="kicker">Inside each edition</p>
          <h2 id="inside-title">Signal over volume.</h2>
          <p>Built to be read in under five minutes, with the context you need to start the day informed.</p>
        </div>
        <div className="featureGrid">
          <article><span>01</span><h3>Overnight moves</h3><p>The essential action across equities, rates, currencies, and commodities.</p></article>
          <article><span>02</span><h3>The why behind it</h3><p>A plain-language take on the stories shaping today&apos;s session.</p></article>
          <article><span>03</span><h3>Your watchlist</h3><p>Choose the markets and sectors you care about for a more relevant read.</p></article>
        </div>
        <article className="sampleBrief" aria-label="Sample daily market brief" data-testid="sample-brief">
          <header className="sampleBriefHeader">
            <div><p className="kicker">Sample edition</p><h3>Tuesday morning brief</h3></div>
            <span>5 min read</span>
          </header>
          <div className="marketPulse">
            <div><small>US markets</small><strong>Mixed</strong></div>
            <div><small>Canada</small><strong>Positive</strong></div>
            <div><small>Market risk</small><strong>Moderate</strong></div>
          </div>
          <div className="sampleStories">
            <div><span>01</span><p><strong>Technology futures are lower</strong> before several major chip companies report earnings.</p></div>
            <div><span>02</span><p><strong>Oil prices moved higher,</strong> supporting Canadian energy companies and the TSX.</p></div>
            <div><span>03</span><p><strong>Inflation data is today’s main event.</strong> Bond investors expect a measured response from central banks.</p></div>
          </div>
        </article>
      </section>

      <section className="personalize shell">
        <div><p className="kicker">Make it yours</p><h2>A brief that knows<br />what you follow.</h2></div>
        <div><p>Select your markets, sectors, and reading style. We&apos;ll shape each edition around your interests.</p><Link className="outlineButton" href="/setup">Set up my brief <span aria-hidden="true">→</span></Link></div>
      </section>

      <footer className="footer shell"><Link className="brand" href="/">Morning Ledger<span>.</span></Link><p>Clarity for the opening bell.</p><p>© 2026 Morning Ledger</p></footer>
    </main>
  );
}
