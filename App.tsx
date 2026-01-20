import React, { useState, useCallback, useEffect } from 'react';
import { Plus, Sparkles, FileText, Trash2, Save, RefreshCw, FolderOpen } from 'lucide-react';
import { DailyColumn } from './components/DailyColumn';
import { AnalyticsDashboard } from './components/AnalyticsDashboard';
import { GeneratedReport } from './components/GeneratedReport';
import { generateReport } from './services/geminiService';
import { WeekData, Task, DayKey, ReportStatus } from './types';
import { INITIAL_WEEK_DATA, DAYS_OF_WEEK } from './constants';

export default function App() {
  const [weekData, setWeekData] = useState<WeekData>(INITIAL_WEEK_DATA);
  const [reportStatus, setReportStatus] = useState<ReportStatus>('idle');
  const [generatedContent, setGeneratedContent] = useState<string>('');
  const [activeTab, setActiveTab] = useState<DayKey>('Monday'); // Mobile tab state
  const [hasDraft, setHasDraft] = useState(false);

  // Check for saved draft on init
  useEffect(() => {
    const draft = localStorage.getItem('weekly_report_draft');
    if (draft) {
      setHasDraft(true);
    }
  }, []);

  // Task Management
  const addTask = useCallback((day: DayKey) => {
    setWeekData(prev => ({
      ...prev,
      [day]: [
        ...prev[day],
        { id: crypto.randomUUID(), content: '', status: 'completed', category: 'Dev' }
      ]
    }));
  }, []);

  const updateTask = useCallback((day: DayKey, taskId: string, updates: Partial<Task>) => {
    setWeekData(prev => ({
      ...prev,
      [day]: prev[day].map(task => 
        task.id === taskId ? { ...task, ...updates } : task
      )
    }));
  }, []);

  const deleteTask = useCallback((day: DayKey, taskId: string) => {
    setWeekData(prev => ({
      ...prev,
      [day]: prev[day].filter(task => task.id !== taskId)
    }));
  }, []);

  const clearAll = useCallback(() => {
    if (window.confirm('确定要清空所有内容吗？未保存的内容将丢失。')) {
      setWeekData(INITIAL_WEEK_DATA);
      setGeneratedContent('');
      setReportStatus('idle');
    }
  }, []);

  // Draft Management
  const handleSaveDraft = () => {
    try {
      localStorage.setItem('weekly_report_draft', JSON.stringify(weekData));
      setHasDraft(true);
      alert('草稿已保存到本地！');
    } catch (e) {
      console.error('Save failed', e);
      alert('保存失败，可能是存储空间不足。');
    }
  };

  const handleLoadDraft = () => {
    const draft = localStorage.getItem('weekly_report_draft');
    if (draft) {
      if (window.confirm('加载草稿将覆盖当前显示的内容，确定要继续吗？')) {
        try {
          const parsed = JSON.parse(draft);
          setWeekData(parsed);
        } catch (e) {
          console.error('Load failed', e);
          alert('草稿文件似乎已损坏。');
        }
      }
    }
  };

  // AI Generation
  const handleGenerateReport = async () => {
    // Check if there is any data
    const hasData = (Object.values(weekData) as Task[][]).some(tasks => tasks.length > 0 && tasks.some(t => t.content.trim() !== ''));
    
    if (!hasData) {
      alert("请先添加至少一项任务再生成周报。");
      return;
    }

    setReportStatus('loading');
    try {
      const result = await generateReport(weekData);
      setGeneratedContent(result);
      setReportStatus('success');
    } catch (error) {
      console.error("Failed to generate report:", error);
      setReportStatus('error');
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Left Panel: Input Area */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden bg-white border-r border-slate-200">
        <header className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-white z-10">
          <div>
            <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <FileText className="w-5 h-5 text-brand-600" />
              周报助手
            </h1>
            <p className="text-sm text-slate-500 hidden sm:block">记录每天的工作，AI 帮您整理。</p>
          </div>
          <div className="flex gap-2">
            {hasDraft && (
              <button 
                onClick={handleLoadDraft}
                className="p-2 text-slate-500 hover:text-brand-600 hover:bg-brand-50 rounded-full transition-colors relative group"
                title="加载草稿"
              >
                <FolderOpen className="w-5 h-5" />
                <span className="absolute top-full right-0 mt-1 w-max bg-slate-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity z-50 pointer-events-none">加载上次保存</span>
              </button>
            )}
             <button 
              onClick={handleSaveDraft}
              className="p-2 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded-full transition-colors"
              title="保存草稿"
            >
              <Save className="w-5 h-5" />
            </button>
             <button 
              onClick={clearAll}
              className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
              title="清空所有"
            >
              <Trash2 className="w-5 h-5" />
            </button>
            <div className="w-px h-6 bg-slate-200 mx-1 self-center"></div>
            <button 
              onClick={handleGenerateReport}
              disabled={reportStatus === 'loading'}
              className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg shadow-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {reportStatus === 'loading' ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
              {reportStatus === 'loading' ? '生成中...' : '一键生成周报'}
            </button>
          </div>
        </header>

        {/* Mobile Tabs */}
        <div className="md:hidden flex overflow-x-auto border-b border-slate-200 no-scrollbar">
          {DAYS_OF_WEEK.map((day) => (
            <button
              key={day}
              onClick={() => setActiveTab(day)}
              className={`flex-none px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === day 
                  ? 'border-brand-600 text-brand-600' 
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              {day.slice(0, 3)}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto bg-slate-50 p-4 md:p-6 scroll-smooth">
          
          {/* Analytics Dashboard (Visible only when there is data) */}
          <AnalyticsDashboard weekData={weekData} reportStatus={reportStatus} />

          {/* Desktop Grid */}
          <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {DAYS_OF_WEEK.map((day) => (
              <DailyColumn 
                key={day}
                day={day}
                tasks={weekData[day]}
                onAddTask={() => addTask(day)}
                onUpdateTask={(id, u) => updateTask(day, id, u)}
                onDeleteTask={(id) => deleteTask(day, id)}
              />
            ))}
          </div>
          
          {/* Mobile View */}
          <div className="md:hidden">
            <DailyColumn 
              day={activeTab}
              tasks={weekData[activeTab]}
              onAddTask={() => addTask(activeTab)}
              onUpdateTask={(id, u) => updateTask(activeTab, id, u)}
              onDeleteTask={(id) => deleteTask(activeTab, id)}
            />
          </div>
        </div>
      </div>

      {/* Right Panel: Output Area */}
      { (generatedContent || reportStatus === 'loading') && (
        <div className={`
          absolute inset-0 z-20 bg-white md:static md:w-[450px] lg:w-[600px] flex flex-col border-l border-slate-200 shadow-xl md:shadow-none transition-transform duration-300 transform
          ${generatedContent || reportStatus === 'loading' ? 'translate-x-0' : 'translate-x-full md:translate-x-0'}
        `}>
          <div className="h-full flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-white">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-500" />
                AI 生成周报
              </h2>
              <button 
                onClick={() => setGeneratedContent('')}
                className="md:hidden p-2 text-slate-500 hover:bg-slate-100 rounded-full"
              >
                关闭
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 bg-slate-50">
               <GeneratedReport 
                 content={generatedContent} 
                 isLoading={reportStatus === 'loading'} 
               />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}