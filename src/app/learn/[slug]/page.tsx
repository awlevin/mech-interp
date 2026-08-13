import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getModule, modules } from "@/lib/registry";
import { ModuleView } from "@/components/ModuleView";

export function generateStaticParams() {
  return modules.map((m) => ({ slug: m.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const mod = getModule(slug);
  return { title: mod ? `${mod.id} ${mod.title}` : "Module" };
}

export default async function ModuleRoute({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const mod = getModule(slug);
  if (!mod) notFound();
  return <ModuleView mod={mod} />;
}
