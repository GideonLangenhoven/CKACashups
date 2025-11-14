import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/session";

export default async function Home() {
  const user = await getServerSession();

  if (!user) {
    redirect("/auth/signin");
  }

  // Redirect based on user role
  if (user.role === "ADMIN") {
    redirect("/admin");
  }

  redirect("/trips/new");
}

