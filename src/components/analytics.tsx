'use client';

import { GoogleAnalytics } from '@next/third-parties/google';
import Script from 'next/script';

interface AnalyticsProps {
  gaId?: string;
  clarityId?: string;
}

/**
 * Conditionally integrates Google Analytics and Microsoft Clarity tracking based on provided IDs.
 *
 * Renders the Google Analytics component if `gaId` is supplied, and injects the Microsoft Clarity tracking script if `clarityId` is provided.
 *
 * @param gaId - Google Analytics tracking ID
 * @param clarityId - Microsoft Clarity project ID
 */
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