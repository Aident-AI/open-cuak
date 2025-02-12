import { stripIndents } from 'common-tags';
import { useEffect } from 'react';
import { isDevelopment } from '~shared/env/environment';

export const useHeapAnalytics = (heapProjectId: string) => {
  useEffect(() => {
    if (!heapProjectId || heapProjectId.length < 1) {
      console.warn('Heap project ID is not set.');
      return;
    }
    if (isDevelopment()) return;

    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.async = true;
    script.innerHTML = stripIndents`
          window.heapReadyCb=window.heapReadyCb||[],window.heap=window.heap||[],heap.load=function(e,t){window.heap.envId=e,window.heap.clientConfig=t=t||{},window.heap.clientConfig.shouldFetchServerConfig=!1;var a=document.createElement("script");a.type="text/javascript",a.async=!0,a.src="https://cdn.us.heap-api.com/config/"+e+"/heap_config.js";var r=document.getElementsByTagName("script")[0];r.parentNode.insertBefore(a,r);var n=["init","startTracking","stopTracking","track","resetIdentity","identify","getSessionId","getUserId","getIdentity","addUserProperties","addEventProperties","removeEventProperty","clearEventProperties","addAccountProperties","addAdapter","addTransformer","addTransformerFn","onReady","addPageviewProperties","removePageviewProperty","clearPageviewProperties","trackPageview"],i=function(e){return function(){var t=Array.prototype.slice.call(arguments,0);window.heapReadyCb.push({name:e,fn:function(){heap[e]&&heap[e].apply(heap,t)}})}};for(var p=0;p<n.length;p++)heap[n[p]]=i(n[p])};
          heap.load("${heapProjectId}");
        `;

    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, [heapProjectId]);
};
