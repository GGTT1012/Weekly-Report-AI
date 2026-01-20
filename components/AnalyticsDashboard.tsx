import React, { useMemo } from 'react';
import { WeekData, Task, DayKey, ReportStatus } from '../types';
import { DAYS_OF_WEEK } from '../constants';
import { CheckCircle2, Circle, Clock, TrendingUp, BarChart3, Calendar, Sparkles, Loader2, AlertCircle } from 'lucide-react';

interface AnalyticsDashboardProps {
  weekData: WeekData;
  reportStatus: ReportStatus;
}

export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({ weekData, reportStatus }) => {
  const stats = useMemo(() => {
    const allTasks = Object.values(weekData).flat();
    const total = allTasks.length;
    
    if (total === 0) return null;

    const completed = allTasks.filter(t => t.status === 'completed').length;
    const inProgress = allTasks.filter(t => t.status === 'in-progress').length;
    const pending = allTasks.filter(t => t.status === 'pending').length;
    
    const completionRate = Math.round((completed / total) * 100);

    // Find busiest day
    let maxTasks = 0;
    let busiestDay = '';
    const dailyCounts = DAYS_OF_WEEK.map(day => {
      const count = weekData[day].length;
      if (count > maxTasks) {
        maxTasks = count;
        busiestDay = day;
      }
      return { day, count };
    });

    return {
      total,
      completed,
      inProgress,
      pending,
      completionRate,
      dailyCounts,
      maxTasks,
      busiestDay
    };
  }, [weekData]);

  if (!stats) return null;

  const getStatusBadge = () => {
    switch (reportStatus) {
      case 'loading':
        return (
          <span className="flex items-center gap-1.5 text-xs font-medium text-brand-600 bg-brand-50 px-2.5 py-1 rounded-full border border-brand-100">
            <Loader2 className="w-3.5 h-3.5 animate-spin" /> 生成中...
          </span>
        );
      case 'success':
        return (
          <span className="flex items-center gap-1.5 text-xs font-medium text-green-600 bg-green-50 px-2.5 py-1 rounded-full border border-green-100">
            <CheckCircle2 className="w-3.5 h-3.5" /> 周报已就绪
          </span>
        );
      case 'error':
        return (
          <span className="flex items-center gap-1.5 text-xs font-medium text-red-600 bg-red-50 px-2.5 py-1 rounded-full border border-red-100">
            <AlertCircle className="w-3.5 h-3.5" /> 生成失败
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1.5 text-xs font-medium text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full border border-slate-200">
            <Sparkles className="w-3.5 h-3.5" /> 待生成
          </span>
        );
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 mb-6 animate-in fade-in slide-in-from-top-4 duration-500">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 text-slate-800 font-semibold">
          <BarChart3 className="w-5 h-5 text-brand-600" />
          <h2>本周进度看板</h2>
        </div>
        {getStatusBadge()}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card 1: Completion Rate */}
        <div className="flex items-center gap-4 bg-slate-50 rounded-lg p-4 border border-slate-100">
          <div className="relative w-16 h-16 flex-shrink-0">
            <svg className="w-full h-full transform -rotate-90">
              <circle
                cx="32"
                cy="32"
                r="28"
                stroke="currentColor"
                strokeWidth="6"
                fill="transparent"
                className="text-slate-200"
              />
              <circle
                cx="32"
                cy="32"
                r="28"
                stroke="currentColor"
                strokeWidth="6"
                fill="transparent"
                strokeDasharray={175.93} // 2 * PI * 28
                strokeDashoffset={175.93 - (175.93 * stats.completionRate) / 100}
                className="text-brand-500 transition-all duration-1000 ease-out"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center text-sm font-bold text-slate-700">
              {stats.completionRate}%
            </div>
          </div>
          <div>
            <div className="text-xs text-slate-500 uppercase tracking-wider font-semibold">总体完成率</div>
            <div className="text-2xl font-bold text-slate-800">{stats.completed}/{stats.total} <span className="text-sm font-normal text-slate-400">项任务</span></div>
          </div>
        </div>

        {/* Card 2: Status Breakdown */}
        <div className="flex flex-col justify-center bg-slate-50 rounded-lg p-4 border border-slate-100 gap-3">
           <div className="flex items-center justify-between text-sm">
             <div className="flex items-center gap-1.5">
               <CheckCircle2 className="w-4 h-4 text-green-500" />
               <span className="text-slate-600">已完成</span>
             </div>
             <span className="font-semibold text-slate-700">{stats.completed}</span>
           </div>
           <div className="flex items-center justify-between text-sm">
             <div className="flex items-center gap-1.5">
               <Clock className="w-4 h-4 text-blue-500" />
               <span className="text-slate-600">进行中</span>
             </div>
             <span className="font-semibold text-slate-700">{stats.inProgress}</span>
           </div>
           <div className="flex items-center justify-between text-sm">
             <div className="flex items-center gap-1.5">
               <Circle className="w-4 h-4 text-slate-400" />
               <span className="text-slate-600">待办</span>
             </div>
             <span className="font-semibold text-slate-700">{stats.pending}</span>
           </div>
           {/* Mini Stacked Bar */}
           <div className="flex h-1.5 w-full rounded-full overflow-hidden mt-1 bg-slate-200">
             <div style={{ width: `${(stats.completed/stats.total)*100}%` }} className="bg-green-500 transition-all duration-500" />
             <div style={{ width: `${(stats.inProgress/stats.total)*100}%` }} className="bg-blue-500 transition-all duration-500" />
           </div>
        </div>

        {/* Card 3: Daily Trend */}
        <div className="bg-slate-50 rounded-lg p-4 border border-slate-100 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
             <div className="text-xs text-slate-500 uppercase tracking-wider font-semibold">每日工作量趋势</div>
             <div className="flex items-center gap-1 text-xs text-slate-400">
                <TrendingUp className="w-3 h-3" />
                <span>最忙: {stats.busiestDay === 'Thursday' ? '周四' : stats.busiestDay === 'Wednesday' ? '周三' : stats.busiestDay === 'Tuesday' ? '周二' : stats.busiestDay === 'Monday' ? '周一' : '周五'}</span>
             </div>
          </div>
          <div className="flex items-end justify-between h-16 gap-2">
            {stats.dailyCounts.map((d) => {
              const heightPercentage = stats.maxTasks > 0 ? (d.count / stats.maxTasks) * 100 : 0;
              const isZero = d.count === 0;
              const isBusiest = d.day === stats.busiestDay && stats.maxTasks > 0;
              
              return (
                <div key={d.day} className="flex flex-col items-center gap-1 flex-1 group">
                  <div 
                    className={`w-full rounded-t-sm transition-all duration-500 ${
                      isZero 
                        ? 'bg-slate-200 h-[2px]' 
                        : isBusiest 
                          ? 'bg-brand-600 shadow-sm opacity-100' 
                          : 'bg-brand-300 hover:bg-brand-400 opacity-80'
                    }`}
                    style={{ height: isZero ? '2px' : `${Math.max(15, heightPercentage)}%` }}
                  ></div>
                  <span className={`text-[10px] font-medium ${isBusiest ? 'text-brand-600 font-bold' : 'text-slate-400'}`}>
                    {d.day.slice(0, 1)}
                  </span>
                  {/* Tooltip */}
                  {!isZero && (
                    <div className="absolute opacity-0 group-hover:opacity-100 bottom-full mb-2 bg-slate-800 text-white text-[10px] px-1.5 py-0.5 rounded transition-opacity whitespace-nowrap z-10 pointer-events-none">
                      {d.count} 项
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
