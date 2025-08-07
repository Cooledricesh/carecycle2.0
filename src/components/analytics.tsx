'use client';

import { GoogleAnalytics } from '@next/third-parties/google';
import Script from 'next/script';

interface AnalyticsProps {
  gaId?: string;
  clarityId?: string;
}

export function Analytics({ gaId, clarityId }: AnalyticsProps) {
  return (
    <>
      {/* Google Analytics */}
      {gaId && <GoogleAnalytics gaId={gaId} />}
      
      {/* Microsoft Clarity */}
      {clarityId && (
        <Script
          id="clarity-script"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              (function(c,l,a,r,i,t,y){
                c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
                t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
                y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
              })(window, document, "clarity", "script", "${clarityId}");
            `,
          }}
        />
      )}
    </>
  );
}