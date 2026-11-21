"use client";
import { useState, useEffect } from "react";
import { Controls } from "./controls";
import { Viewer } from "./viewer";
import { calm, isSettings } from "./data";
import type { Settings } from "./types";
import "./tidewater.css";
export default function Tidewater() {
  const [settings, setSettings] = useState(calm);
  const key = "playground:tidewater:v1";
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(key) || "null");
      if (isSettings(saved)) setSettings(saved);
    } catch {
      /* Use in-memory settings. */
    }
  }, []);
  function change(next: Settings) {
    setSettings(next);
    try {
      localStorage.setItem(key, JSON.stringify(next));
    } catch {
      /* Keep this session usable. */
    }
  }
  return (
    <main className="tw-shell">
      <header className="tw-heading">
        <h1>Tidewater</h1>
        <p>An interactive coastal water study.</p>
      </header>
      <div className="tw-workbench">
        <Viewer settings={settings} change={change} />
        <aside className="tw-desktop">
          <Controls s={settings} change={change} />
        </aside>
      </div>
    </main>
  );
}
