import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const env = { ...process.env };
if (process.argv.includes('--isolated-db')) {
  for (const line of fs.readFileSync(path.join(root, 'backend/.env'), 'utf8').split(/\r?\n/)) {
    if (!line.trim() || line.trim().startsWith('#')) continue;
    const match = line.match(/^\s*([^=]+?)\s*=\s*(.*?)\s*$/);
    if (match) env[match[1]] = match[2].replace(/^['"]|['"]$/g, '');
  }
  if (!env.DB_URL || !env.DB_USERNAME || !env.DB_PASSWORD) throw new Error('Missing database test configuration.');
  env.TV5_TEST_JDBC_URL = env.DB_URL;
  env.TV5_TEST_JDBC_USER = env.DB_USERNAME;
  env.TV5_TEST_JDBC_PASSWORD = env.DB_PASSWORD;
  env.TV5_TEST_SCHEMA_ISOLATED = 'true';
}
const init = path.join(root, 'backend/build/community-check.gradle');
fs.mkdirSync(path.dirname(init), { recursive: true });
fs.writeFileSync(init, `allprojects {
  plugins.withId('java') {
    sourceSets.test.java.setIncludes(['com/vista/community/**/*.java', 'com/vista/auth/SecurityAuthorizationTest.java', 'com/vista/destination/service/DestinationServiceTest.java'])
  }
  plugins.withId('com.diffplug.spotless') {
    spotless.java {
      target 'src/main/java/com/vista/community/api/CommunityController.java', 'src/main/java/com/vista/community/api/CommunityModels.java', 'src/main/java/com/vista/community/application/CommunityService.java', 'src/main/java/com/vista/destination/service/DestinationService.java', 'src/test/java/com/vista/community/CommunityInteractionsControllerTest.java', 'src/test/java/com/vista/community/CommunityInteractionsPersistenceTest.java'
    }
  }
  tasks.withType(Test).configureEach {
    maxHeapSize = '256m'
    jvmArgs '-XX:TieredStopAtLevel=1', '-XX:ActiveProcessorCount=2'
    maxParallelForks = 1
    filter { includeTestsMatching 'com.vista.community.*'; includeTestsMatching 'com.vista.auth.SecurityAuthorizationTest'; includeTestsMatching 'com.vista.destination.service.DestinationServiceTest*' }
  }
}
`);
const args = ['spotlessJavaApply', 'test', '--init-script', init, '--offline', '--no-daemon', '--max-workers=1',
  '-Dorg.gradle.jvmargs=-Xms64m -Xmx256m -XX:MaxMetaspaceSize=192m -XX:ReservedCodeCacheSize=48m -XX:TieredStopAtLevel=1 -XX:ActiveProcessorCount=2 -XX:HeapBaseMinAddress=32g'];
const windows = process.platform === 'win32';
if (process.argv.includes('--package')) args.push('bootJar', 'spotlessJavaCheck');
const child = spawn(windows ? env.ComSpec || 'cmd.exe' : './gradlew', windows ? ['/c', path.join(root, 'backend/gradlew.bat'), ...args] : args,
  { cwd: path.join(root, 'backend'), env, stdio: 'inherit', windowsHide: true });
child.on('error', () => { console.error('Could not start community backend checks.'); process.exitCode = 1; });
child.on('exit', code => { process.exitCode = code ?? 1; });
