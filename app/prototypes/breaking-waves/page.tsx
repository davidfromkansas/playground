"use client";
import { useEffect, useState } from "react";
import { ArrowUpRight, SlidersHorizontal } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { defaults, paper, valid } from "./data";
import { Controls } from "./controls";
import { Viewer } from "./viewer";
import type { Settings } from "./types";
import "./breaking.css";
const key = "playground:breaking-waves:v1";
export default function BreakingWaves() {
  const [s, set] = useState(defaults),
    [resetId, bump] = useState(0);
  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(key) || "null");
      if (valid(stored)) set(stored);
    } catch {
      /* Use in-memory defaults. */
    }
  }, []);
  function change(next: Settings) {
    set(next);
    try {
      localStorage.setItem(key, JSON.stringify(next));
    } catch {
      /* Keep this session usable. */
    }
  }
  const panel = (
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
    <main className="bw-shell">
      <header className="bw-heading">
        <div>
          <h1>Breaking Waves</h1>
          <p>One animated cross-section, swept along a changing coastline.</p>
        </div>
        <a href={paper} target="_blank" rel="noreferrer">
          Hugh Malan · SIGGRAPH 2022 <ArrowUpRight size={15} />
        </a>
      </header>
      <div className="bw-mobile">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline">
              <SlidersHorizontal />
              Wave controls
            </Button>
          </SheetTrigger>
          <SheetContent
            side="bottom"
            aria-describedby={undefined}
            className="max-h-[85dvh] overflow-auto [&>button]:size-11"
          >
            <SheetTitle className="sr-only">Wave controls</SheetTitle>
            {panel}
          </SheetContent>
        </Sheet>
      </div>
      <div className="bw-layout">
        <Viewer s={s} resetId={resetId} />
        <aside>{panel}</aside>
      </div>
    </main>
  );
}
