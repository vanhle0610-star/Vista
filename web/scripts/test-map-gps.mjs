// The actual hook under controlled browser/React APIs; this is a mock test, not device evidence.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
const code=ts.transpileModule(fs.readFileSync(new URL('../src/features/map-location/hooks/useGeolocation.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
const flush=async()=>{await Promise.resolve();await Promise.resolve();};
function harness(choice,permissionState='prompt',options,runtime={}) {
  const states=[],effects=[],fixes=[],storage=new Map(choice===undefined?[]:[['vista-map-location-opt-in',choice]]); let stateIndex=0,listener;
  const permission=new EventTarget();permission.state=permissionState;
  const document={visibilityState:'visible',addEventListener:(_name,cb)=>{listener=cb;},removeEventListener:()=>{}};
  const react={useState:(value)=>{const index=stateIndex++;states[index]=value;return [value,(update)=>{states[index]=typeof update==='function'?update(states[index]):update;}];},useRef:value=>({current:value}),useCallback:fn=>fn,useEffect:fn=>effects.push(fn)};
  const compiled={exports:{}};
  vm.runInNewContext(code,{module:compiled,exports:compiled.exports,require:()=>react,queueMicrotask,setTimeout,clearTimeout,window:{isSecureContext:runtime.secure!==false},document,localStorage:{getItem:key=>storage.get(key)??null,setItem:(key,value)=>storage.set(key,value)},navigator:{permissions:{query:async()=>permission},geolocation:runtime.unsupported?undefined:{getCurrentPosition:(success,error)=>fixes.push({success,error})}}});
  const hook=compiled.exports.useGeolocation(options); const cleanup=effects.map(effect=>effect());
  return {hook,states,fixes,storage,permission,document,visibility:()=>listener(),cleanup:()=>cleanup.forEach(fn=>fn?.())};
}
const position={coords:{latitude:16,longitude:108,accuracy:20},timestamp:Date.now()};
{
  const h=harness();await flush();assert.equal(h.fixes.length,0,'first visit cannot request OS permission');
  h.hook.requestCurrentPosition();assert.equal(h.fixes.length,1);h.fixes[0].success(position);assert.equal(h.states[0].coords.latitude,16);
  assert.equal(h.storage.get('vista-map-location-opt-in'),'true');assert.equal(h.storage.size,1,'persist only choice');
  h.permission.state='denied';h.permission.dispatchEvent(new Event('change'));assert.equal(h.states[0].coords,null);h.fixes[0].success(position);assert.equal(h.states[0].coords,null,'stale callback after revocation ignored');h.cleanup();
}
{
  const h=harness('true','granted');await flush();assert.equal(h.fixes.length,1,'remembered choice + current grant resumes once');
  h.fixes[0].success(position);h.document.visibilityState='hidden';h.visibility();assert.equal(h.states[0].coords,null);
  h.document.visibilityState='visible';h.visibility();await flush();assert.equal(h.fixes.length,2,'foreground rechecks and reacquires');
  h.hook.dismissPrompt();h.fixes[1].success(position);assert.equal(h.states[0].coords,null);assert.equal(h.storage.get('vista-map-location-opt-in'),'false');h.cleanup();
}
{
  const h=harness('false','granted');await flush();assert.equal(h.fixes.length,0,'defer does not request despite browser grant');h.cleanup();
}
console.log('PASS: initial opt-in, remembered grant, revoke/stale callback, foreground cleanup and opt-out. Browser APIs mocked.');

{
  const h=harness('false','granted',{transient:true});await flush();
  assert.equal(h.fixes.length,1,'community uses an existing permission without a prompt');
  h.hook.requestCurrentPosition();
  assert.equal(h.storage.get('vista-map-location-opt-in'),'false','community never changes map preference');
  h.cleanup();h.fixes.at(-1).success(position);assert.equal(h.states[0].coords,null,'closing picker ignores pending GPS fix');
}
{
  const h=harness(undefined,'denied',{transient:true});await flush();
  assert.equal(h.fixes.length,0,'community must not re-request a denied permission on open');
  assert.equal(h.storage.size,0);h.cleanup();
}
console.log('PASS: community transient GPS respects granted/denied permissions, ignores late fixes and preserves map preferences.');

{
  const h=harness(); await flush();
  const first=h.hook.requestCurrentPosition();
  const second=h.hook.requestCurrentPosition();
  assert.equal(h.fixes.length,1,'concurrent actions share one device request');
  h.fixes[0].success(position); await flush();
  assert.deepEqual(await first,await second);
  await h.hook.requestCurrentPosition();
  assert.equal(h.fixes.length,1,'fresh fix is reused');
  h.cleanup();
}
for (const [code,expected] of [[1,'denied'],[2,'unavailable'],[3,'timeout']]) {
  const h=harness();await flush();const result=h.hook.requestCurrentPosition();
  h.fixes[0].error({code});assert.equal(await result,null);assert.equal(h.states[0].status,expected);assert.equal(h.states[0].coords,null);h.cleanup();
}
{
  const h=harness();await flush();const result=h.hook.requestCurrentPosition();
  h.fixes[0].success({...position,timestamp:Date.now()-60000});
  assert.equal(await result,null);assert.equal(h.states[0].status,'unavailable');h.cleanup();
}
console.log('PASS: GPS deduplication, fresh fix reuse, denied/unavailable/timeout, stale fix rejection.');

for (const runtime of [{secure:false},{unsupported:true}]) {
  const h=harness(undefined,'prompt',undefined,runtime);await flush();
  assert.equal(await h.hook.requestCurrentPosition(),null);
  assert.equal(h.states[0].status,'unsupported');assert.equal(h.fixes.length,0);h.cleanup();
}
console.log('PASS: insecure origin and unsupported Geolocation return explicit errors without a device request.');
