import { redirect } from "next/navigation";
import { getIdentity } from "@/lib/auth";

/** `/` in the open-source build: straight into the app. */
export default async function Home() {
  redirect((await getIdentity()) ? "/dashboard" : "/login");
}
