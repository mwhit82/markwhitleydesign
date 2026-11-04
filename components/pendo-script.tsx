// Pendo install snippet, followed by the single app-entry initialize call.
// It runs once per page load, before any UI renders. The empty visitor id lets
// Pendo reuse a previously identified visitor; Pocket Rally drivers are
// identified later with pendo.identify (components/rally/pendo.ts).
const script = `
(function(apiKey){
    (function(p,e,n,d,o){var v,w,x,y,z;o=p[d]=p[d]||{};o._q=o._q||[];
    v=['initialize','identify','updateOptions','pageLoad','track', 'trackAgent'];for(w=0,x=v.length;w<x;++w)(function(m){
    o[m]=o[m]||function(){o._q[m===v[0]?'unshift':'push']([m].concat([].slice.call(arguments,0)));};})(v[w]);
    y=e.createElement(n);y.async=!0;y.src='https://cdn.pendo-dev.pendo-dev.com/agent/static/'+apiKey+'/pendo.js';
    z=e.getElementsByTagName(n)[0];z.parentNode.insertBefore(y,z);})(window,document,'script','pendo');
})('9d4a8cbb-b31d-4f1c-bb49-8085e0c6ca48');
pendo.initialize({ visitor: { id: '' } });
`;

export function PendoScript() {
  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}
