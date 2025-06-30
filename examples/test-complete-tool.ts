import { CompleteTool } from '../src/tools';

async function testCompleteTool() {
  console.log('Testing Complete Tool...\n');

  // テストケース1: 成功したタスク
  const result1 = await CompleteTool.execute({
    task: 'Create a new React component',
    summary: 'Created a new Button component with TypeScript types and basic styling',
    files_modified: [
      'src/components/Button.tsx',
      'src/components/Button.css',
      'src/components/index.ts'
    ],
    commands_executed: [
      'mkdir -p src/components',
      'npm run typecheck'
    ],
    result: 'success'
  });

  console.log('Test 1 - Success case:');
  console.log(result1.report);
  console.log('\n');

  // テストケース2: 部分的に成功したタスク
  const result2 = await CompleteTool.execute({
    task: 'Set up database connection',
    summary: 'Database connection established but migration failed',
    files_modified: [
      '.env',
      'src/db/config.ts'
    ],
    commands_executed: [
      'npm install pg',
      'npm run db:migrate'
    ],
    result: 'partial'
  });

  console.log('Test 2 - Partial success:');
  console.log(result2.report);
  console.log('\n');

  // テストケース3: 失敗したタスク
  const result3 = await CompleteTool.execute({
    task: 'Deploy to production',
    summary: 'Deployment failed due to authentication error',
    files_modified: [],
    commands_executed: [
      'npm run build',
      'npm run deploy'
    ],
    result: 'failed'
  });

  console.log('Test 3 - Failed task:');
  console.log(result3.report);
}

testCompleteTool().catch(console.error);