import {notFound} from "next/navigation";
import {requireRole} from "@/lib/dal";
import {getClient} from "@/lib/store";

/*
 * Checks the member is assigned to this trainer before the loading screen (loading.tsx) starts streaming,
 * so anyone else's member is a real 404 rather than a 200 with a not-found page. The pages check again.
 */
export default async function TrainerMemberLayout({children, params}: {children: React.ReactNode; params: Promise<{id: string}>}) {
  const [user, client] = await Promise.all([requireRole("trainer"), params.then(p => getClient(p.id))]);
  if (!client || client.trainerId !== user.id) notFound();
  return children;
}
