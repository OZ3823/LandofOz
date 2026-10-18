import { createFileRoute } from "@tanstack/react-router";
import { GematriaDesk } from "@/components/gematria-desk";

export const Route = createFileRoute("/")({
  component: Home,
});

function Home() {
  return <GematriaDesk />;
}
