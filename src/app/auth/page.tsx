import { redirect } from "next/navigation";
import { AuthScreen } from "@/components/auth/AuthScreen";
import { createClient } from "@/lib/supabase/server";

export default async function AuthPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    redirect("/onboarding");
  }

  return <AuthScreen />;
}
