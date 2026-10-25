"use client";
import {useRouter} from "next/navigation";
import Landing from "./Landing";

export default function HomeClient({price}: {price: {amount: string; currency: string}}) {
  const router = useRouter();
  return <Landing price={price} onEnter={() => router.push("/login")} onLogin={() => router.push("/login")}/>;
}
