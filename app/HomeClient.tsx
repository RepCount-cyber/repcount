"use client";
import {useRouter} from "next/navigation";
import Landing from "./Landing";

export default function HomeClient({price}: {price: {amount: string; currency: string}}) {
  const router = useRouter();
  return <Landing price={price} onRegister={() => router.push("/register")} onLogin={() => router.push("/login")}/>;
}
