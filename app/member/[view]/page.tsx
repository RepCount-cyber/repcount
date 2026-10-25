import {notFound} from "next/navigation";
import {memberViews} from "@/lib/memberViews";

/* The member shell lives in the layout so state survives switching views; this page only validates the URL. */
export default async function MemberView({params}: {params: Promise<{view: string}>}) {
  const {view} = await params;
  if (!(memberViews as string[]).includes(view)) notFound();
  return null;
}
