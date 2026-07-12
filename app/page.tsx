"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";

export default function Home() {
  const [signupComplete, setSignupComplete] = useState(false);

  const handleSignup = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSignupComplete(true);
  };

  return (
    <main>
      <nav className="nav shell" aria-label="Main navigation">
        <Link className="brand" href="/">Morning Ledger<span>.</span></Link>
        <Link className="navLink" href="/setup">Personalize your brief <span aria-hidden="true">↗</span></Link>
      </nav>

      <section className="hero shell">
        <div className="eyebrow"><span className="liveDot" /> Weekdays · 7:00 AM</div>
        <h1>The market, made<br />clear before coffee.</h1>
        <p className="heroCopy">A concise daily read on what moved, why it matters, and what to watch next. No noise. No hot takes.</p>

        <form className="signup" onSubmit={handleSignup} data-testid="signup-form">
          <label className="srOnly" htmlFor="email">Work email</label>
          <input id="email" name="email" type="email" placeholder="you@company.com" required />
          <button type="submit" disabled={signupComplete}>{signupComplete ? "You’re on the list ✓" : <>Get the daily brief <span aria-hidden="true">→</span></>}</button>
        </form>
        <p className="finePrint" role="status">{signupComplete ? "Thanks — your weekday brief is reserved. Email delivery will be connected later." : "Free weekday delivery. Unsubscribe anytime."}</p>
      </section>

      <section className="briefPreview shell" aria-labelledby="inside-title">
        <div className="sectionIntro">
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
