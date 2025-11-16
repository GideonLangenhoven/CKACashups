import { getServerSession } from "@/lib/session";
import { redirect } from "next/navigation";
import NewTripForm from "./NewTripForm";
import Link from "next/link";

export default async function NewTripPage() {
  const user = await getServerSession();

  if (!user) {
    redirect("/auth/signin");
  }

  // Admins should use the admin dashboard to create trips
  if (user.role === "ADMIN") {
    redirect("/admin");
  }

  return <NewTripForm />;
}
