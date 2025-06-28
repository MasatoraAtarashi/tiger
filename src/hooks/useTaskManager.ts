import { useState, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';

import { Task } from '../components/TaskStatus.js';

export interface TaskManager {
  tasks: Task[];
  currentAction: string | undefined;
  addTask: (description: string) => string;
  updateTask: (id: string, updates: Partial<Task>) => void;
  setCurrentAction: (action: string | undefined) => void;
  clearTasks: () => void;
  parseAndAddTasks: (content: string) => void;
}

export const useTaskManager = (): TaskManager => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [currentAction, setCurrentAction] = useState<string | undefined>();

  const addTask = useCallback((description: string): string => {
    const id = uuidv4();
    setTasks(prev => [...prev, {
      id,
      description,
      status: 'pending'
    }]);
    return id;
  }, []);

  const updateTask = useCallback((id: string, updates: Partial<Task>) => {
    setTasks(prev => prev.map(task => 
      task.id === id ? { ...task, ...updates } : task
    ));
  }, []);

  const clearTasks = useCallback(() => {
    setTasks([]);
    setCurrentAction(undefined);
  }, []);

  const parseAndAddTasks = useCallback((content: string) => {
    // LLMのレスポンスからタスクリストを抽出
    const taskPatterns = [
      /(?:^|\n)\s*(?:\d+\.|[-*])\s+(.+)/gm,  // 1. タスク, - タスク, * タスク
      /(?:^|\n)\s*\[[ x]\]\s+(.+)/gm,         // [ ] タスク, [x] タスク
      /(?:^|\n)\s*タスク\d+[:：]\s*(.+)/gm,    // タスク1: 説明
    ];

    const extractedTasks: string[] = [];
    
    for (const pattern of taskPatterns) {
      const matches = content.matchAll(pattern);
      for (const match of matches) {
        if (match[1]) {
          extractedTasks.push(match[1].trim());
        }
      }
    }

    // 重複を除去
    const uniqueTasks = [...new Set(extractedTasks)];
    
    // タスクを追加
    uniqueTasks.forEach(task => {
      addTask(task);
    });
  }, [addTask]);

  return {
    tasks,
    currentAction,
    addTask,
    updateTask,
    setCurrentAction,
    clearTasks,
    parseAndAddTasks
  };
};