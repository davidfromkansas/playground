"use client";
import { useEffect, useState } from "react";
import { ArrowUpRight, SlidersHorizontal } from "lucide-react";
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { defaults, valid } from "./data";
import { TankView } from "./tank-view";
import { Controls } from "./controls";
import type { Settings } from "./types";
import "./wave.css";
const key = "playground:wave-particles:v1";
export default function WaveParticles() {
  const [s, set] = useState(defaults),
    [revision, bump] = useState(0);
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(key) || "null");
      if (valid(saved)) set(saved);
    } catch {
      /* In-memory defaults. */
    }
  }, []);
  function change(next: Settings) {
    set(next);
    try {
      localStorage.setItem(key, JSON.stringify(next));
    } catch {
      /* Keep session settings. */
    }
  }
  const controls = (
    <Controls
      s={s}
      change={change}
      reset={() => {
        change(defaults);
        bump((n) => n + 1);
      }}
    />
  );
  return (
    <main className="wp-shell">
      <header className="wp-heading">
        <div>
          <h1>Wave Particles</h1>
          <p>An interactive wave tank after Yuksel, House &amp; Keyser.</p>
        </div>
        <a
          href="https://www.cemyuksel.com/research/waveparticles/waveparticles.pdf"
          target="_blank"
          rel="noreferrer"
        >
          SIGGRAPH 2007 paper <ArrowUpRight size={15} />
        </a>
      </header>
      <div className="wp-mobile">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline">
              <SlidersHorizontal />
              Tank controls
            </Button>
          </SheetTrigger>
          <SheetContent
            side="bottom"
            aria-describedby={undefined}
            className="max-h-[85dvh] overflow-auto [&>button]:size-11"
          >
            <SheetTitle className="sr-only">Tank controls</SheetTitle>
            {controls}
          </SheetContent>
        </Sheet>
      </div>
      <div className="wp-layout">
        <TankView s={s} revision={revision} />
        <aside>{controls}</aside>
      </div>
    </main>
  );
}
