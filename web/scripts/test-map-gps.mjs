// The actual hook under controlled browser/React APIs; this is a mock test, not device evidence.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
const code=ts.transpileModule(fs.readFileSync(new URL('../src/features/map-location/hooks/useGeolocation.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
const flush=async()=>{await Promise.resolve();await Promise.resolve();};
function harness(choice,permissionState='prompt') {
  const states=[],effects=[],fixes=[],storage=new Map(choice===undefined?[]:[['vista-map-location-opt-in',choice]]); let stateIndex=0,listener;
  const permission=new EventTarget();permission.state=permissionState;
  const document={visibilityState:'visible',addEventListener:(_name,cb)=>{listener=cb;},removeEventListener:()=>{}};
  const react={useState:(value)=>{const index=stateIndex++;states[index]=value;return [value,(update)=>{states[index]=typeof update==='function'?update(states[index]):update;}];},useRef:value=>({current:value}),useCallback:fn=>fn,useEffect:fn=>effects.push(fn)};
  const compiled={exports:{}};
  vm.runInNewContext(code,{module:compiled,exports:compiled.exports,require:()=>react,queueMicrotask,window:{isSecureContext:true},document,localStorage:{getItem:key=>storage.get(key)??null,setItem:(key,value)=>storage.set(key,value)},navigator:{permissions:{query:async()=>permission},geolocation:{getCurrentPosition:(success,error)=>fixes.push({success,error})}}});
  const hook=compiled.exports.useGeolocation(); const cleanup=effects.map(effect=>effect());
  return {hook,states,fixes,storage,permission,document,visibility:()=>listener(),cleanup:()=>cleanup.forEach(fn=>fn?.())};
}
const position={coords:{latitude:16,longitude:108,accuracy:20},timestamp:1};
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
