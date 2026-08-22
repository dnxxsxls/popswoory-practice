import { AppShell } from "./app-shell";
import { Card, Skeleton } from "./ui";

/**
 * 탭을 누른 직후 서버 응답을 기다리는 동안 보여주는 뼈대.
 *
 * 이게 없으면 화면이 그대로 멈춰 있어 실제 지연보다 훨씬 느리게 느껴진다.
 * 로딩 경계가 생기면 Link 프리페치도 이 뼈대를 미리 받아둔다.
 */
export function PageSkeleton({ rows = 2 }: { rows?: number }) {
  return (
    <AppShell title={<Skeleton className="h-8 w-40" />}>
      {Array.from({ length: rows }, (_, i) => (
        <Card key={i}>
          <Skeleton className="h-5 w-1/2" />
          <Skeleton className="mt-3 h-4 w-3/4" />
          <Skeleton className="mt-2 h-4 w-1/3" />
        </Card>
      ))}
    </AppShell>
  );
}
