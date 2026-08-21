import { redirect } from "next/navigation";
import { optionalMember } from "@/lib/guard";
import { JoinForm } from "@/components/join-form";
import { Splash } from "@/components/splash";

export default async function JoinPage() {
  if (await optionalMember()) redirect("/");

  return (
    <>
      <Splash />
      <JoinForm />
    </>
  );
}
