"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CatalogueRefreshStatus } from "../../../lib/instruments";

export default function CatalogueAdminPage() {
  const [status, setStatus] = useState<CatalogueRefreshStatus | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    let active = true;
    fetch("/api/admin/instruments/status").then(response => response.json()).then(data => { if (active) setStatus(data); });
    return () => { active = false; };
  }, []);

  const refresh = async () => {
    setRefreshing(true);
    await fetch("/api/admin/instruments/refresh", { method: "POST" });
    const response = await fetch("/api/admin/instruments/status");
    setStatus(await response.json());
    setRefreshing(false);
  };

  return <main className="setupPage">
    <nav className="setupNav shell"><Link className="brand" href="/">Morning Ledger<span>.</span></Link><Link className="closeSetup" href="/" aria-label="Close catalogue admin and return home"><span>Close</span><b aria-hidden="true">×</b></Link></nav>
    <section className="setupWrap adminCatalogue">
      <p className="kicker">Catalogue admin</p><h1>Instrument refresh status.</h1>
      <p className="setupLead">The application searches this local catalogue. The free provider adapter refreshes it once per day.</p>
      {status ? <dl className="summaryList">
        <div><dt>Status</dt><dd>{status.status}</dd></div>
        <div><dt>Last successful refresh</dt><dd>{status.lastSuccessfulRefreshAt ? new Date(status.lastSuccessfulRefreshAt).toLocaleString() : "Not yet refreshed"}</dd></div>
        <div><dt>Active instruments</dt><dd>{status.activeCount}</dd></div>
        <div><dt>Inactive instruments</dt><dd>{status.inactiveCount}</dd></div>
        <div><dt>Last error</dt><dd>{status.lastError || "None"}</dd></div>
      </dl> : <p>Loading catalogue status…</p>}
      <button type="button" className="nextButton adminRefreshButton" onClick={refresh} disabled={refreshing}>{refreshing ? "Refreshing…" : "Refresh free catalogue"}</button>
    </section>
  </main>;
}
