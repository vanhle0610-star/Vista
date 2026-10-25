import { access } from 'node:fs/promises';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const mobile = fileURLToPath(new URL('../', import.meta.url));
const android = path.join(mobile, 'android');
const wrapper = path.join(android, 'gradle/wrapper/gradle-wrapper.jar');
await access(wrapper).catch(() => {
  throw new Error('Generate Android first: npx expo prebuild --platform android --no-install');
});
const architecture = process.argv[2] ?? 'arm64-v8a';
if (!['arm64-v8a', 'x86_64', 'arm64-v8a,x86_64'].includes(architecture)) {
  throw new Error('Choose arm64-v8a, x86_64, or arm64-v8a,x86_64');
}
const cache = path.join(mobile, 'node_modules/.cache');
const java = process.env.JAVA_HOME
  ? path.join(process.env.JAVA_HOME, 'bin', process.platform === 'win32' ? 'java.exe' : 'java')
  : 'java';
const probe = spawnSync(java, ['-version'], { encoding: 'utf8' });
if (probe.error) throw probe.error;
const version = Number(`${probe.stdout}\n${probe.stderr}`.match(/version "(\d+)/)?.[1] ?? 0);
if (version < 17 || version > 21) {
  throw new Error(`Use JDK 17 for the Android build (detected Java ${version || 'unknown'}). Set JAVA_HOME before retrying.`);
}
// Launch the wrapper directly: PowerShell can split unquoted -P/-D names at dots.
// Keep the project cache separate from IDE imports; native output paths stay standard.
const child = spawn(java, ['-Xmx64m', '-Xms64m', '-jar', wrapper,
  'assembleDebug', `-PreactNativeArchitectures=${architecture}`,
  `--project-cache-dir=${path.join(cache, 'tv5-native-gradle')}`,
  '-Pkotlin.incremental=false', '-Pkotlin.compiler.execution.strategy=in-process',
  '-Dorg.gradle.internal.http.socketTimeout=20000',
  '-Dorg.gradle.internal.http.connectionTimeout=20000',
  '-Dorg.gradle.jvmargs=-Xmx2048m -XX:MaxMetaspaceSize=1024m -Dfile.encoding=UTF-8',
  '--max-workers=2', '--console=plain', '--no-daemon',
], {
  cwd: android,
  stdio: 'inherit',
  env: {
    ...process.env,
    NODE_ENV: process.env.NODE_ENV ?? 'development',
    GRADLE_USER_HOME: process.env.GRADLE_USER_HOME ?? path.join(cache, 'tv5-gradle-home'),
    'ORG_GRADLE_PROJECT_kotlin.incremental': 'false',
    'ORG_GRADLE_PROJECT_kotlin.compiler.execution.strategy': 'in-process',
  },
});
child.on('error', error => { console.error(error.message); process.exitCode = 1; });
child.on('exit', code => { process.exitCode = code ?? 1; });
