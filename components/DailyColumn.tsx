import React, { useState } from 'react';
import { Plus, CheckCircle2, Circle, Clock, Wand2, Loader2, Trash2 } from 'lucide-react';
import { Task, DayKey, TaskStatus } from '../types';
import { refineTaskContent } from '../services/geminiService';

interface DailyColumnProps {
  day: DayKey;
  tasks: Task[];
  onAddTask: () => void;
  onUpdateTask: (taskId: string, updates: Partial<Task>) => void;
  onDeleteTask: (taskId: string) => void;
}

const statusIcons: Record<TaskStatus, React.ReactNode> = {
  completed: <CheckCircle2 className="w-4 h-4 text-green-500" />,
  'in-progress': <Clock className="w-4 h-4 text-blue-500" />,
  pending: <Circle className="w-4 h-4 text-slate-400" />
};

export const DailyColumn: React.FC<DailyColumnProps> = ({ 
  day, 
  tasks, 
  onAddTask, 
  onUpdateTask, 
  onDeleteTask 
}) => {
  const [refiningTaskId, setRefiningTaskId] = useState<string | null>(null);

  const handleRefine = async (task: Task) => {
    if (!task.content.trim() || refiningTaskId) return;
    
    setRefiningTaskId(task.id);
    try {
      const refined = await refineTaskContent(task.content);
      onUpdateTask(task.id, { content: refined });
    } catch (error) {
      console.error("Failed to refine task", error);
    } finally {
      setRefiningTaskId(null);
    }
  };

  return (
    <div className="flex flex-col h-full min-h-[300px] bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-shadow">
      <div className="bg-slate-50 px-4 py-3 border-b border-slate-100 flex justify-between items-center">
        <h3 className="font-semibold text-slate-700">{day}</h3>
        <span className="text-xs font-medium text-slate-400 bg-white px-2 py-0.5 rounded-full border border-slate-100">
          {tasks.length}
        </span>
      </div>
      
      <div className="flex-1 p-3 space-y-3 overflow-y-auto">
        {tasks.map((task) => (
          <div key={task.id} className="group relative bg-white border border-slate-100 rounded-lg p-3 hover:border-brand-200 transition-colors">
            <div className="flex items-start gap-3">
              <button 
                onClick={() => {
                  const nextStatus: Record<TaskStatus, TaskStatus> = {
                    'pending': 'in-progress',
                    'in-progress': 'completed',
                    'completed': 'pending'
                  };
                  onUpdateTask(task.id, { status: nextStatus[task.status] });
                }}
                className="mt-1 flex-shrink-0 hover:scale-110 transition-transform"
                title={`Status: ${task.status}`}
              >
                {statusIcons[task.status]}
              </button>
              
              <textarea
                value={task.content}
                onChange={(e) => onUpdateTask(task.id, { content: e.target.value })}
                placeholder="做了什么工作？"
                className="w-full text-sm bg-transparent resize-none focus:outline-none text-slate-700 placeholder:text-slate-300 h-auto min-h-[20px] pr-12"
                rows={task.content.length > 50 ? 3 : 1}
              />
            </div>
            
            {/* Action Buttons Group */}
            <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 backdrop-blur-sm rounded-md shadow-sm border border-slate-100 p-0.5">
              <button
                onClick={() => handleRefine(task)}
                disabled={!task.content.trim() || !!refiningTaskId}
                className={`p-1.5 rounded-md transition-all ${
                  refiningTaskId === task.id 
                    ? 'text-brand-500 bg-brand-50 cursor-not-allowed' 
                    : 'text-slate-400 hover:text-brand-600 hover:bg-brand-50'
                }`}
                title="AI 智能润色"
              >
                {refiningTaskId === task.id ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Wand2 className="w-3.5 h-3.5" />
                )}
              </button>
              <button
                onClick={() => onDeleteTask(task.id)}
                className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-all"
                title="删除"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}

        <button 
          onClick={onAddTask}
          className="w-full py-2 border-2 border-dashed border-slate-100 rounded-lg text-slate-400 hover:border-brand-300 hover:text-brand-500 hover:bg-brand-50 transition-all flex items-center justify-center gap-2 text-sm font-medium"
        >
          <Plus className="w-4 h-4" /> 添加任务
        </button>
      </div>
    </div>
  );
};
