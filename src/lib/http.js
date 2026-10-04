// Retry only safe reads once. Mutations are never replayed implicitly.
export async function fetchRead(input, init={}) {
  const response=await fetch(input,init);
  if(response.status!==429||(init.method||'GET')!=='GET')return response;
  const seconds=Math.min(5,Math.max(1,Number(response.headers.get('Retry-After'))||1));
  await new Promise((resolve,reject)=>{
    const abort=()=>{clearTimeout(timer);reject(new DOMException('Aborted','AbortError'))};
    const timer=setTimeout(()=>{init.signal?.removeEventListener('abort',abort);resolve()},seconds*1000+50);
    if(init.signal?.aborted)abort();else init.signal?.addEventListener('abort',abort,{once:true});
  });
  return fetch(input,init);
}
