# The Little Room

A cozy interactive 3D miniature bakery experience.

## Overview

The Little Room is a WebGL-based miniature space built as an interactive portfolio piece. Visitors can explore a pastel dollhouse bakery, move a dessert between the display shelf and café table, and meet a small animated hamster mascot that reacts to the scene.

The project focuses on gentle interaction, spatial storytelling, and a soft toy-like visual language rather than conventional website UI.

## Demo

[Open the live demo on GitHub Pages](https://chaichai009.github.io/the-little-room/)

## Features

- Interactive 3D room
- Hamster mascot with animation and scene reactions
- Dessert drag-and-drop interaction
- Reusable object placement and drop-zone system
- Cozy miniature bakery environment
- Responsive desktop and mobile presentation

## Tech Stack

- Next.js with App Router
- React
- TypeScript
- Three.js
- React Three Fiber
- React Three Drei
- Tailwind CSS
- GLB assets

## Product Design

The experience explores:

- Emotional interaction through small, low-pressure responses
- Mascot character design and environmental presence
- Spatial experience inside a miniature room
- Interactive prototype development for future object-based play
- A cohesive pastel toy-material and dollhouse art direction

## Development

Install dependencies and start the local development server:

```bash
pnpm install
pnpm dev
```

Run the 3D asset validation and production build before publishing:

```bash
pnpm run validate:3d
pnpm run build
```

The 3D assets used by the site are stored in `public/models/bakery/`. Their runtime URLs automatically include the configured deployment base path.

## Deployment

The site is deployed to GitHub Pages by the workflow in `.github/workflows/deploy-pages.yml`. Pushes to `main` validate the GLB assets, create a Next.js static export, and publish the generated `out/` directory.

Normal local builds keep the standard Next.js output. The GitHub Pages workflow enables the repository base path and static export only for the deployment build.
