import { redirect } from "next/navigation";
import { optionalMember } from "@/lib/guard";
import { JoinForm } from "@/components/join-form";

export default async function JoinPage() {
  if (await optionalMember()) redirect("/");

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col px-5 pb-10 pt-[calc(env(safe-area-inset-top)+5rem)]">
      <h1 className="text-[30px] font-extrabold leading-[1.3]">
        시간표 한 번만 올리면
        <br />
        되는 시간을 찾아드려요
      </h1>

      <div className="mt-12">
        <JoinForm />
      </div>

      <p className="mt-auto pt-10 text-[13px] leading-relaxed text-muted">
        이메일·전화번호는 받지 않아요.
        <br />
        이름과 PIN만으로 서로를 구분해요.
      </p>
    </div>
  );
}
