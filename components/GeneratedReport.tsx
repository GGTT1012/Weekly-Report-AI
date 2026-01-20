import React, { useRef, useState, useEffect, useMemo } from 'react';
import { Copy, Download, Check, Loader2, Palette, RefreshCcw } from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { StructuredReportData } from '../types';

interface GeneratedReportProps {
  content: string; // JSON string
  isLoading: boolean;
}

// Color Themes
const THEMES = [
  { name: '经典绿', primary: '#9bbb59', secondary: '#bfdcae', highlight: '#e5f0d9', border: '#64748b' },
  { name: '商务蓝', primary: '#3b82f6', secondary: '#93c5fd', highlight: '#eff6ff', border: '#64748b' },
  { name: '活力橙', primary: '#f97316', secondary: '#fdba74', highlight: '#fff7ed', border: '#64748b' },
  { name: '简约灰', primary: '#475569', secondary: '#94a3b8', highlight: '#f1f5f9', border: '#334155' },
];

export const GeneratedReport: React.FC<GeneratedReportProps> = ({ content, isLoading }) => {
  const [copied, setCopied] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  // --- Theme State ---
  const [currentTheme, setCurrentTheme] = useState(THEMES[0]);
  const [customPrimary, setCustomPrimary] = useState(THEMES[0].primary);

  // --- Data State (Editable) ---
  // We keep a local copy of the data to allow editing
  const [reportData, setReportData] = useState<StructuredReportData | null>(null);
  const [meta, setMeta] = useState({
    name: '您的姓名',
    role: '岗位名称',
    supervisor: '直属上级',
    dateRange: new Date().toLocaleDateString() + ' - ' + new Date(Date.now() + 5 * 86400000).toLocaleDateString()
  });

  // Parse incoming AI content only when it changes and we don't have local edits yet
  useEffect(() => {
    if (content) {
      try {
        const cleanContent = content.replace(/```json\n|\n```/g, '');
        const parsed = JSON.parse(cleanContent);
        setReportData(parsed);
      } catch (e) {
        console.error("Failed to parse report JSON", e);
      }
    }
  }, [content]);

  // --- Handlers for Color Customization ---
  const handleThemeChange = (theme: typeof THEMES[0]) => {
    setCurrentTheme(theme);
    setCustomPrimary(theme.primary);
  };

  const handleCustomColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const color = e.target.value;
    setCustomPrimary(color);
    setCurrentTheme({
      name: 'Custom',
      primary: color,
      secondary: adjustColorBrightness(color, 40), 
      highlight: adjustColorBrightness(color, 90), 
      border: '#64748b'
    });
  };

  const adjustColorBrightness = (hex: string, percent: number) => {
    let r = parseInt(hex.substring(1, 3), 16);
    let g = parseInt(hex.substring(3, 5), 16);
    let b = parseInt(hex.substring(5, 7), 16);

    r = Math.round(r + (255 - r) * (percent / 100));
    g = Math.round(g + (255 - g) * (percent / 100));
    b = Math.round(b + (255 - b) * (percent / 100));

    const rr = (r.toString(16).length === 1 ? '0' : '') + r.toString(16);
    const gg = (g.toString(16).length === 1 ? '0' : '') + g.toString(16);
    const bb = (b.toString(16).length === 1 ? '0' : '') + b.toString(16);

    return `#${rr}${gg}${bb}`;
  };

  // --- Handlers for Text Editing ---
  const updateReportField = (section: keyof StructuredReportData, index: number | null, subField: string | null, value: string) => {
    if (!reportData) return;
    const newData = { ...reportData };

    if (section === 'weeklySummary' || section === 'nextWeekAttention') {
        if (index !== null && Array.isArray(newData[section])) {
            (newData[section] as string[])[index] = value;
        }
    } else if (section === 'dailyLogs') {
         if (index !== null) newData.dailyLogs[index].content = value;
    } else if (section === 'problemsAndSolutions') {
         if (index !== null && subField) (newData.problemsAndSolutions[index] as any)[subField] = value;
    } else if (section === 'nextWeekPlan') {
         if (index !== null) newData.nextWeekPlan[index].content = value;
    } else if (section === 'finalSummary') {
        (newData as any)[section] = value;
    }

    setReportData(newData);
  };

  const handleCopy = async () => {
    try {
      if (reportData) {
        const textSummary = `本周总结:\n${reportData.weeklySummary.join('\n')}\n\n下周计划:\n${reportData.nextWeekPlan.map(p => `${p.day}: ${p.content}`).join('\n')}`;
        await navigator.clipboard.writeText(textSummary);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const handleDownloadPDF = async () => {
    if (!reportRef.current) return;
    
    setIsDownloading(true);
    try {
      // 1. Create a deep clone of the element to avoid messing up the UI during generation
      // We append it to a hidden container so it renders, but is off-screen
      const container = document.createElement('div');
      container.style.position = 'absolute';
      container.style.left = '-9999px';
      container.style.top = '0';
      container.style.width = '210mm'; // Fixed A4 width to ensure consistent rendering
      document.body.appendChild(container);

      const clone = reportRef.current.cloneNode(true) as HTMLElement;
      // Remove any fixed widths or max-widths that might conflict, ensure it fills the A4 container
      clone.style.minWidth = '100%';
      clone.style.width = '100%';

      // 2. CRITICAL STEP: Replace all <input> and <textarea> with <div>s containing the text.
      // html2canvas often fails to render form elements' values correctly, or cuts off scrollable content.
      // Replacing them with static text elements fixes 99% of "missing text" issues in PDFs.
      
      const originalInputs = reportRef.current.querySelectorAll('input, textarea');
      const clonedInputs = clone.querySelectorAll('input, textarea');

      // We traverse the ORIGINAL inputs to get the current value (user edits), 
      // because cloneNode might not capture the current .value state of uncontrolled inputs.
      originalInputs.forEach((input, index) => {
         const clonedInput = clonedInputs[index] as HTMLElement;
         const val = (input as HTMLInputElement | HTMLTextAreaElement).value;

         const textSpan = document.createElement('div');
         textSpan.innerText = val;
         // Copy relevant styles to make it look identical
         textSpan.style.whiteSpace = 'pre-wrap'; // Preserve line breaks
         textSpan.style.wordBreak = 'break-word';
         textSpan.style.fontFamily = getComputedStyle(input).fontFamily;
         textSpan.style.fontSize = getComputedStyle(input).fontSize;
         textSpan.style.fontWeight = getComputedStyle(input).fontWeight;
         textSpan.style.textAlign = getComputedStyle(input).textAlign;
         textSpan.style.color = getComputedStyle(input).color;
         textSpan.style.padding = '2px'; // Add slight padding for readablity
         textSpan.style.minHeight = getComputedStyle(input).height; // Ensure height matches
         textSpan.style.lineHeight = '1.4';
         
         if (clonedInput.parentNode) {
            clonedInput.parentNode.replaceChild(textSpan, clonedInput);
         }
      });

      container.appendChild(clone);

      // 3. Generate Canvas
      const canvas = await html2canvas(clone, {
        scale: 2, // High resolution
        backgroundColor: '#ffffff',
        logging: false,
        useCORS: true
      });

      // 4. Generate PDF
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const imgWidth = 210;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
      pdf.save('work_report.pdf');

      // 5. Cleanup
      document.body.removeChild(container);

    } catch (err) {
      console.error("PDF Generation failed:", err);
      alert("PDF 生成失败，请重试");
    } finally {
      setIsDownloading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4 animate-pulse">
        <div className="w-12 h-12 rounded-full bg-lime-100 flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-lime-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
        <p className="text-slate-500 font-medium">AI 正在整理数据并填报表格...</p>
      </div>
    );
  }

  if (!reportData) {
    return null;
  }

  // --- Styles ---
  const commonHeaderStyle = {
      backgroundColor: currentTheme.primary,
      borderColor: currentTheme.border
  };
  const subHeaderStyle = {
      backgroundColor: currentTheme.secondary,
      borderColor: currentTheme.border
  };
  const highlightCellStyle = {
      backgroundColor: currentTheme.highlight,
      borderColor: currentTheme.border
  };
  
  const cellInputClass = "w-full bg-transparent resize-none outline-none text-slate-700 placeholder:text-slate-300 overflow-hidden";
  
  return (
    <div className="space-y-4">
        {/* --- Toolbar --- */}
        <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between no-print">
            <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 text-sm text-slate-600 font-medium">
                    <Palette className="w-4 h-4" />
                    <span>主题配色:</span>
                </div>
                <div className="flex gap-2">
                    {THEMES.map(t => (
                        <button
                            key={t.name}
                            onClick={() => handleThemeChange(t)}
                            className={`w-6 h-6 rounded-full border-2 transition-transform hover:scale-110 ${currentTheme.name === t.name ? 'border-slate-800 scale-110' : 'border-transparent'}`}
                            style={{ backgroundColor: t.primary }}
                            title={t.name}
                        />
                    ))}
                     <div className="relative group flex items-center">
                        <input 
                            type="color" 
                            value={customPrimary}
                            onChange={handleCustomColorChange}
                            className="w-6 h-6 p-0 border-0 rounded-full overflow-hidden cursor-pointer"
                            title="自定义颜色"
                        />
                    </div>
                </div>
            </div>

            <div className="flex gap-2">
                 <button
                    onClick={handleDownloadPDF}
                    disabled={isDownloading}
                    className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors"
                >
                    {isDownloading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
                    下载 PDF
                </button>
                <button
                    onClick={handleCopy}
                    className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors"
                >
                    {copied ? <Check className="w-3 h-3 text-green-600" /> : <Copy className="w-3 h-3" />}
                    复制内容
                </button>
            </div>
        </div>
      
      {/* --- The Report Sheet --- */}
      <div className="overflow-x-auto pb-8">
        <div 
          ref={reportRef} 
          className="bg-white p-4 md:p-8 min-w-[800px] text-slate-800 mx-auto transition-colors duration-300"
          style={{ fontFamily: '"SimSun", "Songti SC", serif' }}
        >
          {/* Top Info Bar */}
          <div 
            className="text-white text-center py-2 text-xl font-bold border-t border-l border-r"
            style={commonHeaderStyle}
          >
            工 作 周 报
          </div>
          <div 
            className="flex justify-between px-4 py-1 text-white text-sm border-l border-r border-b mb-0.5"
            style={commonHeaderStyle}
          >
            <div>通用工作周报模板</div>
            <div className="flex items-center">
                日期: 
                <input 
                    value={meta.dateRange} 
                    onChange={e => setMeta({...meta, dateRange: e.target.value})} 
                    className="bg-transparent border-none text-white focus:outline-none w-48 text-right font-sans" 
                />
            </div>
          </div>

          <div className="grid grid-cols-4 gap-0 border" style={{ borderColor: currentTheme.border, backgroundColor: currentTheme.highlight }}>
            <div className="p-2 border-r font-bold text-sm" style={{ borderColor: currentTheme.border }}>姓名:</div>
            <div className="p-1 border-r" style={{ borderColor: currentTheme.border }}>
              <input value={meta.name} onChange={e => setMeta({...meta, name: e.target.value})} className="bg-transparent border-b border-slate-400 w-full text-center text-sm px-1 focus:outline-none focus:border-black" />
            </div>
            <div className="p-2 border-r font-bold text-sm text-right" style={{ borderColor: currentTheme.border }}>职位:</div>
            <div className="p-1">
              <input value={meta.role} onChange={e => setMeta({...meta, role: e.target.value})} className="bg-transparent border-b border-slate-400 w-full text-center text-sm px-1 focus:outline-none focus:border-black" />
            </div>
          </div>
          
          {/* Main Grid Structure */}
          <table className="w-full border-collapse border mt-0.5" style={{ borderColor: currentTheme.border }}>
            {/* Row 1: Headers for Summary/Next Week */}
            <thead>
              <tr>
                <th colSpan={2} className="text-center font-bold text-slate-800 p-2 border text-sm" style={subHeaderStyle}>本 周 工 作 总 结</th>
                <th colSpan={2} className="text-center font-bold text-slate-800 p-2 border text-sm" style={subHeaderStyle}>下 周 工 作 注 意 事 项</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="w-[10%] text-center font-bold p-2 border text-sm" style={highlightCellStyle}>任务</td>
                <td className="w-[40%] text-center font-bold p-2 border text-sm" style={highlightCellStyle}>本周完成主要工作</td>
                <td className="w-[10%] text-center font-bold p-2 border text-sm" style={highlightCellStyle}>任务</td>
                <td className="w-[40%] text-center font-bold p-2 border text-sm" style={highlightCellStyle}>下周主要事项</td>
              </tr>
              
              {[0, 1, 2].map((i) => (
                <tr key={`summary-${i}`}>
                  <td className="text-center font-bold p-1 border text-sm" style={{ borderColor: currentTheme.border }}>{i + 1}</td>
                  <td className="p-2 border text-xs md:text-sm text-slate-700 align-top" style={{ borderColor: currentTheme.border }}>
                      <textarea 
                        value={reportData.weeklySummary[i] || ''} 
                        onChange={(e) => updateReportField('weeklySummary', i, null, e.target.value)}
                        className={cellInputClass}
                        rows={2}
                      />
                  </td>
                  <td className="text-center font-bold p-1 border text-sm" style={{ borderColor: currentTheme.border }}>{i + 1}</td>
                  <td className="p-2 border text-xs md:text-sm text-slate-700 align-top" style={{ borderColor: currentTheme.border }}>
                       <textarea 
                        value={reportData.nextWeekAttention[i] || ''} 
                        onChange={(e) => updateReportField('nextWeekAttention', i, null, e.target.value)}
                        className={cellInputClass}
                        rows={2}
                      />
                  </td>
                </tr>
              ))}
              
              {/* Section: Weekly Log Header */}
              <tr>
                <th colSpan={2} className="text-center font-bold text-slate-800 p-2 border text-sm" style={subHeaderStyle}>本 周 工 作 记 录</th>
                <th colSpan={2} className="text-center font-bold text-slate-800 p-2 border text-sm" style={subHeaderStyle}>本周工作中存在问题及建议解决办法</th>
              </tr>

              {/* Sub-headers */}
              <tr>
                <td className="w-[10%] text-center font-bold p-1 border text-xs" style={highlightCellStyle}>具体时间</td>
                <td className="w-[40%] text-center font-bold p-1 border text-xs" style={highlightCellStyle}>工作内容记录</td>
                <td colSpan={2} className="p-0 border" style={{ borderColor: currentTheme.border }}>
                  <table className="w-full h-full border-collapse">
                    <tbody>
                      <tr>
                        <td className="w-[10%] text-center font-bold p-1 border-r text-xs" style={highlightCellStyle}>编号</td>
                        <td className="w-[45%] text-center font-bold p-1 border-r text-xs" style={highlightCellStyle}>存在问题</td>
                        <td className="w-[30%] text-center font-bold p-1 border-r text-xs" style={highlightCellStyle}>建议办法</td>
                        <td className="w-[15%] text-center font-bold p-1 text-xs" style={highlightCellStyle}>解决?</td>
                      </tr>
                    </tbody>
                  </table>
                </td>
              </tr>

              {/* Data Rows for Logs and Problems */}
              {['星期一', '星期二', '星期三', '星期四', '星期五', '星期六', '星期日'].map((dayName, index) => {
                const logIndex = reportData.dailyLogs.findIndex(l => l.day.includes(dayName) || l.day === dayName);
                const log = logIndex !== -1 ? reportData.dailyLogs[logIndex] : { date: '', content: '' };
                const problem = reportData.problemsAndSolutions[index];
                
                return (
                  <tr key={dayName}>
                    {/* Left Side: Daily Log */}
                    <td className="p-2 border text-center text-xs font-bold bg-slate-50" style={{ borderColor: currentTheme.border }}>
                      <div>{dayName}</div>
                      <div className="text-[10px] text-slate-500">{log.date}</div>
                    </td>
                    <td className="p-2 border text-xs text-slate-700" style={{ borderColor: currentTheme.border }}>
                      <textarea
                        value={log.content}
                        onChange={(e) => {
                             if(logIndex !== -1) updateReportField('dailyLogs', logIndex, null, e.target.value)
                        }}
                        className={cellInputClass}
                        rows={2}
                      />
                    </td>

                    {/* Right Side: Problems */}
                    <td colSpan={2} className="p-0 border align-top" style={{ borderColor: currentTheme.border }}>
                       <table className="w-full h-full border-collapse">
                        <tbody>
                          <tr>
                            <td className="w-[10%] text-center p-2 border-r text-xs h-full" style={{ borderColor: currentTheme.border }}>
                              {problem ? index + 1 : ''}
                            </td>
                            <td className="w-[45%] p-2 border-r text-xs" style={{ borderColor: currentTheme.border }}>
                              <textarea
                                value={problem?.problem || ''}
                                onChange={(e) => updateReportField('problemsAndSolutions', index, 'problem', e.target.value)}
                                className={cellInputClass}
                                rows={2}
                              />
                            </td>
                            <td className="w-[30%] p-2 border-r text-xs" style={{ borderColor: currentTheme.border }}>
                                <textarea
                                value={problem?.solution || ''}
                                onChange={(e) => updateReportField('problemsAndSolutions', index, 'solution', e.target.value)}
                                className={cellInputClass}
                                rows={2}
                              />
                            </td>
                            <td className="w-[15%] text-center p-2 text-xs">
                               <input
                                value={problem?.resolved || ''}
                                onChange={(e) => updateReportField('problemsAndSolutions', index, 'resolved', e.target.value)}
                                className={`${cellInputClass} text-center`}
                              />
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </td>
                  </tr>
                );
              })}

              {/* Section: Next Week Plan */}
              <tr>
                <th colSpan={4} className="text-center font-bold text-slate-800 p-2 border text-sm" style={subHeaderStyle}>下 周 工 作 计 划</th>
              </tr>
              <tr>
                 <td className="w-[10%] text-center font-bold p-1 border text-xs" style={highlightCellStyle}>具体时间</td>
                 <td colSpan={3} className="text-center font-bold p-1 border text-xs" style={highlightCellStyle}>工作内容记录</td>
              </tr>
              
              {reportData.nextWeekPlan.map((plan, i) => (
                 <tr key={plan.day}>
                   <td className="p-1 border text-center text-xs font-bold bg-slate-50" style={{ borderColor: currentTheme.border }}>{plan.day}</td>
                   <td colSpan={3} className="p-1 border text-xs text-slate-700 px-3" style={{ borderColor: currentTheme.border }}>
                       <textarea
                            value={plan.content}
                            onChange={(e) => updateReportField('nextWeekPlan', i, null, e.target.value)}
                            className={cellInputClass}
                            rows={1}
                        />
                   </td>
                 </tr>
              ))}

              {/* Footer */}
              <tr>
                <td colSpan={4} className="p-2 border text-xs" style={{ ...highlightCellStyle, borderColor: currentTheme.border }}>
                  <div className="flex gap-2">
                    <span className="font-bold whitespace-nowrap">本周工作总结: </span>
                     <textarea
                        value={reportData.finalSummary}
                        onChange={(e) => updateReportField('finalSummary', null, null, e.target.value)}
                        className={cellInputClass}
                        rows={1}
                    />
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
