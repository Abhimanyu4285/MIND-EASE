import { createFileRoute } from "@tanstack/react-router";

import { MindEaseApp } from "@/components/mindease/MindEaseApp";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "MindEase — Wellbeing Companion for Students" },
      { name: "description", content: "MindEase, a private, judgement-free AI companion for student wellbeing." },
      { property: "og:title", content: "MindEase — Wellbeing Companion for Students" },
      { property: "og:description", content: "A private, judgement-free companion for exam stress, loneliness, low motivation and tough days." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: MindEaseApp,
});
