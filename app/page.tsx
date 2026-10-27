import {connection} from "next/server";
import {getSettings} from "@/lib/store";
import HomeClient from "./HomeClient";

export default async function Home() {
  await connection(); // price comes from the live settings, not the build
  const {price, currency} = await getSettings();
  return <HomeClient price={{amount: price, currency}}/>;
}
