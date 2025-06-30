import { z } from 'zod';

// タスクプランナーツール
export interface TaskStep {
  id: string;
  description: string;
  tool: string;
  args: any;
  dependsOn?: string[];
  completed?: boolean;
}

export interface TaskPlan {
  id: string;
  goal: string;
  steps: TaskStep[];
  currentStep?: number;
}

// メモリ内でタスクプランを管理
const taskPlans = new Map<string, TaskPlan>();

export const PlanTaskTool = {
  id: 'plan_task',
  description: 'Create a task plan with multiple steps to achieve a goal',
  inputSchema: z.object({
    goal: z.string().describe('The overall goal to achieve'),
    steps: z.array(z.object({
      description: z.string().describe('Description of what this step does'),
      tool: z.string().describe('The tool to use for this step'),
      args: z.any().describe('Arguments for the tool'),
      dependsOn: z.array(z.string()).optional().describe('IDs of steps that must complete before this one')
    })).describe('List of steps to execute')
  }),
  outputSchema: z.object({
    planId: z.string(),
    totalSteps: z.number()
  }),
  execute: async ({ goal, steps }: { goal: string; steps: any[] }) => {
    const planId = `plan_${Date.now()}`;
    const taskSteps: TaskStep[] = steps.map((step: any, index: number) => ({
      id: `step_${index + 1}`,
      description: step.description,
      tool: step.tool,
      args: step.args,
      dependsOn: step.dependsOn,
      completed: false
    }));

    const plan: TaskPlan = {
      id: planId,
      goal,
      steps: taskSteps,
      currentStep: 0
    };

    taskPlans.set(planId, plan);

    return {
      planId,
      totalSteps: steps.length
    };
  }
};

export const ExecutePlanTool = {
  id: 'execute_plan',
  description: 'Execute the next step in a task plan',
  inputSchema: z.object({
    planId: z.string().describe('The ID of the plan to execute')
  }),
  outputSchema: z.object({
    currentStep: z.number(),
    totalSteps: z.number(),
    stepDescription: z.string(),
    nextTool: z.string().optional(),
    nextArgs: z.any().optional(),
    completed: z.boolean()
  }),
  execute: async ({ planId }: { planId: string }) => {
    const plan = taskPlans.get(planId);
    if (!plan) {
      throw new Error(`Plan ${planId} not found`);
    }

    // 次の未完了ステップを探す
    const nextStepIndex = plan.steps.findIndex(step => !step.completed);

    if (nextStepIndex === -1) {
      // 全ステップ完了
      return {
        currentStep: plan.steps.length,
        totalSteps: plan.steps.length,
        stepDescription: 'All steps completed',
        completed: true
      };
    }

    const nextStep = plan.steps[nextStepIndex];

    // 依存関係をチェック
    if (nextStep.dependsOn && nextStep.dependsOn.length > 0) {
      const allDependenciesMet = nextStep.dependsOn.every(depId => {
        const depStep = plan.steps.find(s => s.id === depId);
        return depStep?.completed;
      });

      if (!allDependenciesMet) {
        throw new Error(`Dependencies not met for step ${nextStep.id}`);
      }
    }

    // このステップを返す（実行は呼び出し側で行う）
    return {
      currentStep: nextStepIndex + 1,
      totalSteps: plan.steps.length,
      stepDescription: nextStep.description,
      nextTool: nextStep.tool,
      nextArgs: nextStep.args,
      completed: false
    };
  }
};

export const CompleteStepTool = {
  id: 'complete_step',
  description: 'Mark a step as completed in the task plan',
  inputSchema: z.object({
    planId: z.string().describe('The ID of the plan'),
    stepNumber: z.number().describe('The step number to mark as completed (1-based)')
  }),
  outputSchema: z.object({
    success: z.boolean(),
    remainingSteps: z.number()
  }),
  execute: async ({ planId, stepNumber }: { planId: string; stepNumber: number }) => {
    const plan = taskPlans.get(planId);
    if (!plan) {
      throw new Error(`Plan ${planId} not found`);
    }

    if (stepNumber < 1 || stepNumber > plan.steps.length) {
      throw new Error(`Invalid step number: ${stepNumber}`);
    }

    plan.steps[stepNumber - 1].completed = true;
    const remainingSteps = plan.steps.filter(s => !s.completed).length;

    return {
      success: true,
      remainingSteps
    };
  }
};

export const GetPlanStatusTool = {
  id: 'get_plan_status',
  description: 'Get the current status of a task plan',
  inputSchema: z.object({
    planId: z.string().describe('The ID of the plan')
  }),
  outputSchema: z.object({
    goal: z.string(),
    totalSteps: z.number(),
    completedSteps: z.number(),
    currentStep: z.string().optional(),
    steps: z.array(z.object({
      id: z.string(),
      description: z.string(),
      completed: z.boolean()
    }))
  }),
  execute: async ({ planId }: { planId: string }) => {
    const plan = taskPlans.get(planId);
    if (!plan) {
      throw new Error(`Plan ${planId} not found`);
    }

    const completedSteps = plan.steps.filter(s => s.completed).length;
    const currentStepObj = plan.steps.find(s => !s.completed);

    return {
      goal: plan.goal,
      totalSteps: plan.steps.length,
      completedSteps,
      currentStep: currentStepObj?.description,
      steps: plan.steps.map(s => ({
        id: s.id,
        description: s.description,
        completed: s.completed || false
      }))
    };
  }
};