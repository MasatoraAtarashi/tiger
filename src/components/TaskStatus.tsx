import { Box, Text } from 'ink';
import React from 'react';

export interface Task {
  id: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  details?: string;
}

interface TaskStatusProps {
  tasks: Task[];
  currentAction?: string;
}

export const TaskStatus: React.FC<TaskStatusProps> = ({ tasks, currentAction }) => {
  if (tasks.length === 0 && !currentAction) {
    return null;
  }

  const getStatusIcon = (status: Task['status']) => {
    switch (status) {
      case 'pending':
        return '⏳';
      case 'in_progress':
        return '🔄';
      case 'completed':
        return '✅';
      case 'failed':
        return '❌';
    }
  };

  const getStatusColor = (status: Task['status']) => {
    switch (status) {
      case 'pending':
        return 'gray';
      case 'in_progress':
        return 'yellow';
      case 'completed':
        return 'green';
      case 'failed':
        return 'red';
    }
  };

  return (
    <Box flexDirection="column" marginBottom={1}>
      {currentAction && (
        <Box marginBottom={1}>
          <Text color="cyan" bold>
            🎯 現在の作業: 
          </Text>
          <Text color="yellow"> {currentAction}</Text>
        </Box>
      )}
      
      {tasks.length > 0 && (
        <Box flexDirection="column" borderStyle="single" borderColor="gray" padding={1}>
          <Text color="cyan" bold>
            📋 タスクリスト:
          </Text>
          <Box flexDirection="column" marginTop={1}>
            {tasks.map((task, index) => (
              <Box key={task.id} marginBottom={index < tasks.length - 1 ? 1 : 0}>
                <Text color={getStatusColor(task.status)}>
                  {getStatusIcon(task.status)} {task.description}
                </Text>
                {task.details && task.status === 'in_progress' && (
                  <Box marginLeft={3}>
                    <Text dimColor>
                      └─ {task.details}
                    </Text>
                  </Box>
                )}
              </Box>
            ))}
          </Box>
          
          {/* プログレスバー */}
          <Box marginTop={1}>
            <Text dimColor>
              進捗: {tasks.filter(t => t.status === 'completed').length}/{tasks.length} 完了
            </Text>
          </Box>
        </Box>
      )}
    </Box>
  );
};