import { getServerSession } from "@/lib/session";
import { redirect } from "next/navigation";
import NewTripForm from "@/app/trips/new/NewTripForm";

export default async function AdminNewCashUpPage() {
  const user = await getServerSession();

  if (!user) {
    redirect("/auth/signin");
  }

  // Only admins can access this page
  if (user.role !== "ADMIN") {
    redirect("/trips");
  }

  return <NewTripForm />;
}
