import { redirect } from "next/navigation";
import { cookies } from "next/headers";

export default async function Home() {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth-token");

  if (!token) {
    redirect("/auth/signin");
  }

  redirect("/trips/new");
}

