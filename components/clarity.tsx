import Script from "next/script";

/**
 * Microsoft Clarity 태그. 세션 녹화·히트맵을 보려고 붙였다.
 *
 * 개발 중(next dev)에는 넣지 않는다. 내가 로컬에서 눌러보는 것까지
 * 통계에 섞이면 실제 사용자 흐름을 못 읽는다. `npm run serve`(NODE_ENV=production)
 * 로 띄운 배포본에서만 붙는다.
 *
 * 대시보드: https://clarity.microsoft.com/projects/view/y6q11zzu6r
 */
const PROJECT_ID = "y6q11zzu6r";

export function Clarity() {
  if (process.env.NODE_ENV !== "production") return null;

  return (
    <Script id="clarity" strategy="afterInteractive">
      {`(function(c,l,a,r,i,t,y){
    c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
    t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
    y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
})(window, document, "clarity", "script", "${PROJECT_ID}");`}
    </Script>
  );
}
