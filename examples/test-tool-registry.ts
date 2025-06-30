import { createToolRegistry } from './tools';

async function testToolRegistry() {
  console.log('Testing Tiger Tool Registry...\n');

  // 1. 全てのツールを取得
  const allTools = createToolRegistry();
  console.log('All available tools:');
  Object.keys(allTools).forEach(id => {
    console.log(`- ${id}: ${allTools[id].description}`);
  });

  // 2. coreToolsのみ
  console.log('\nCore tools only (ls, read_file, shell):');
  const coreTools = createToolRegistry({ coreTools: ['ls', 'read_file', 'shell'] });
  Object.keys(coreTools).forEach(id => {
    console.log(`- ${id}: ${coreTools[id].description}`);
  });

  // 3. excludeToolsでWebツールを除外
  console.log('\nExcluding web tools:');
  const noWebTools = createToolRegistry({ excludeTools: ['web_fetch'] });
  Object.keys(noWebTools).forEach(id => {
    console.log(`- ${id}: ${noWebTools[id].description}`);
  });

  // 4. 実際にツールを使ってみる
  console.log('\nTesting ls tool:');
  const lsResult = await allTools.ls.execute({ path: '.' });
  console.log('Files in current directory:', lsResult.files.slice(0, 5), '...');

  console.log('\nTesting memory tool:');
  await allTools.memory.execute({ action: 'set', key: 'test', value: 'Hello Tiger!' });
  const memResult = await allTools.memory.execute({ action: 'get', key: 'test' });
  console.log('Memory value:', memResult.value);
}

testToolRegistry().catch(console.error);