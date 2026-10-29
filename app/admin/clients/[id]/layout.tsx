import {notFound} from "next/navigation";
import {requireRole} from "@/lib/dal";
import {getClient} from "@/lib/store";

/* Unknown clients are a real 404: checked here, before the loading screen (loading.tsx) starts streaming. */
export default async function AdminClientLayout({children, params}: {children: React.ReactNode; params: Promise<{id: string}>}) {
  const [, client] = await Promise.all([requireRole("admin"), params.then(p => getClient(p.id))]);
  if (!client) notFound();
  return children;
}
