import HotelDashboard from "./HotelDashboard";
import { headers } from "next/headers";
import { requireChatGPTUser } from "./chatgpt-auth";

export const dynamic = "force-dynamic";

export default async function Home() {
  const requestHeaders = await headers();
  const host = requestHeaders.get("host") || "";
  const isLocal = host.startsWith("localhost") || host.startsWith("127.0.0.1");
  if (!isLocal) await requireChatGPTUser("/");
  return <HotelDashboard />;
}
