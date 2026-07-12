"use client";

import { KeyboardEvent, useEffect, useId, useRef, useState } from "react";
import { Instrument } from "../../lib/instruments";

type Props = {
  selected: Instrument[];
  onChange: (instruments: Instrument[]) => void;
};

export function InstrumentSearch({ selected, onChange }: Props) {
  const listboxId = useId();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Instrument[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const requestNumber = useRef(0);

  useEffect(() => {
    const clean = query.trim();
    if (clean.length < 1) return;
    const controller = new AbortController();
    const currentRequest = ++requestNumber.current;
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch(`/api/instruments/search?q=${encodeURIComponent(clean)}`, { signal: controller.signal });
        const data = await response.json() as { instruments: Instrument[] };
        if (currentRequest === requestNumber.current) {
          setResults(data.instruments);
          setOpen(true);
          setActiveIndex(data.instruments.length ? 0 : -1);
        }
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError")) setResults([]);
      } finally {
        if (currentRequest === requestNumber.current) setLoading(false);
      }
    }, 250);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [query]);

  const changeQuery = (value: string) => {
    setQuery(value);
    if (!value.trim()) { setResults([]); setOpen(false); setLoading(false); setActiveIndex(-1); }
    else setLoading(true);
  };

  const add = (instrument: Instrument) => {
    if (!selected.some(item => item.instrumentId === instrument.instrumentId)) onChange([...selected, instrument]);
    setQuery(""); setResults([]); setOpen(false); setActiveIndex(-1);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (!open || !results.length) return;
    if (event.key === "ArrowDown") { event.preventDefault(); setActiveIndex(index => Math.min(results.length - 1, index + 1)); }
    if (event.key === "ArrowUp") { event.preventDefault(); setActiveIndex(index => Math.max(0, index - 1)); }
    if (event.key === "Enter" && activeIndex >= 0) { event.preventDefault(); add(results[activeIndex]); }
    if (event.key === "Escape") { event.preventDefault(); setOpen(false); }
  };

  return <div className="instrumentSearch" data-testid="instrument-search">
    <label className="setupField" htmlFor="instrument-query"><span>Watchlist <small>Optional</small></span>
      <input id="instrument-query" role="combobox" autoComplete="off" value={query} onChange={event => changeQuery(event.target.value)} onKeyDown={onKeyDown} onFocus={() => results.length && setOpen(true)} aria-expanded={open} aria-controls={listboxId} aria-autocomplete="list" aria-activedescendant={activeIndex >= 0 ? `${listboxId}-${activeIndex}` : undefined} placeholder="Search ticker, company, ETF, or exchange" />
    </label>
    {open && <div className="instrumentResults" id={listboxId} role="listbox" aria-label="Instrument search results">
      {results.map((instrument, index) => <button id={`${listboxId}-${index}`} type="button" role="option" aria-selected={index === activeIndex} className={index === activeIndex ? "active" : ""} key={instrument.instrumentId} onMouseDown={event => event.preventDefault()} onClick={() => add(instrument)}>
        <span><strong>{instrument.symbol}</strong><small>{instrument.name}</small></span><span className="instrumentMeta">{instrument.exchange} · {instrument.currency}</span>
      </button>)}
      {!results.length && !loading && <p>No active instruments found.</p>}
    </div>}
    <p className="searchHint" role="status">{loading ? "Searching local catalogue…" : "Searches the local instrument catalogue."}</p>
    {selected.length > 0 && <div className="watchlistTags" aria-label="Selected watchlist instruments">{selected.map(instrument => <span className="watchlistTag" key={instrument.instrumentId}><span><strong>{instrument.symbol}</strong> · {instrument.exchange}</span><button type="button" aria-label={`Remove ${instrument.symbol} on ${instrument.exchange}`} onClick={() => onChange(selected.filter(item => item.instrumentId !== instrument.instrumentId))}>×</button></span>)}</div>}
  </div>;
}
