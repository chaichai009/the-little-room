"use client";

import { Canvas } from "@react-three/fiber";
import { Suspense, useCallback, useState } from "react";
import { BakeryScene } from "./BakeryScene";

export function BakeryExperience() {
  const [sceneReady, setSceneReady] = useState(false);
  const handleSceneReady = useCallback(() => setSceneReady(true), []);

  return (
    <main className="three-home">
      <header className="three-header">
        <div><span>the little room</span><h1>tiny bake shop</h1></div>
        <nav aria-label="Primary navigation">
          <a href="#about">about</a><a href="#projects">projects</a><a href="#notes">notes</a><a href="#archive">archive</a>
        </nav>
      </header>
      <section className="three-stage" aria-label="3D miniature toy bakery">
        <Canvas shadows="basic" dpr={[1, 1.5]} camera={{ position: [10.5, 7.6, 13.5], fov: 38, near: 0.1, far: 100 }} gl={{ antialias: true }} fallback={<div className="webgl-fallback">This miniature room needs WebGL.</div>}>
          <Suspense fallback={null}><BakeryScene onReady={handleSceneReady} /></Suspense>
        </Canvas>
        <div className={`scene-loading${sceneReady ? " is-hidden" : ""}`} role="status" aria-live="polite" aria-hidden={sceneReady}>
          <span className="scene-loading-bar" />
          <p>arranging the tiny bakery</p>
        </div>
      </section>
      <div className="scene-note"><span>tiny bake shop · 3D</span><p>drag gently to look around</p></div>
    </main>
  );
}
