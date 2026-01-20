import { GoogleGenAI } from "@google/genai";
import { WeekData, StructuredReportData } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateReport = async (weekData: WeekData): Promise<string> => {
  const prompt = `
    你是一位专业的行政助手。请将以下工作日志转换为结构化的 JSON 数据，用于填充一份标准的“传统工作周报”。

    原始数据:
    ${JSON.stringify(weekData, null, 2)}

    **任务要求**:
    请分析数据，并严格按照以下 JSON 格式输出。不要输出 Markdown，只输出纯 JSON 字符串。
    
    你需要推断或生成以下内容：
    1. **weeklySummary**: 从本周所有任务中提炼 3-5 点主要工作成果。
    2. **nextWeekAttention**: 基于本周未完成的任务或常规逻辑，提出下周需要注意的 2-3 点事项。
    3. **dailyLogs**: 将每天的任务合并为一段通顺的文字。如果没有具体日期，请根据 WeekData 的 Key (Monday, Tuesday...) 生成。
    4. **problemsAndSolutions**: 分析本周遇到的困难（如未完成的任务、卡点），提出问题和建议解决办法。如果没有明显问题，请根据行业惯例生成 1-2 条通用的优化建议（例如：流程优化、文档沉淀）。
    5. **nextWeekPlan**: 根据本周进度，规划下周每天的大致内容。
    6. **finalSummary**: 一句精炼的总结语，评价本周表现（如：工作饱和，按时达成目标）。

    **输出 JSON 结构 (Schema)**:
    {
      "weeklySummary": ["工作项1", "工作项2"...],
      "nextWeekAttention": ["注意事项1"...],
      "dailyLogs": [
        { "day": "星期一", "date": "MM.DD", "content": "1. ..." },
        { "day": "星期二", "date": "MM.DD", "content": "..." },
        ... (确保周一到周五都有，周六日可选)
      ],
      "problemsAndSolutions": [
        { "problem": "...", "solution": "...", "resolved": "是/否/推进中" }
      ],
      "nextWeekPlan": [
        { "day": "星期一", "content": "..." },
        ...
      ],
      "finalSummary": "..."
    }

    **注意**: 
    - date 字段请根据当前日期推算本周的具体日期（例如 10.24）。
    - 语言风格：简洁、专业、行政公文风。
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: 'application/json'
      }
    });
    
    return response.text || "{}";
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw new Error("无法连接到 AI 服务生成周报。");
  }
};

export const refineTaskContent = async (originalContent: string): Promise<string> => {
  if (!originalContent.trim()) return originalContent;

  const prompt = `
    角色：你是一位专业的职场写作助理。
    任务：将用户输入的简短工作记录改写为一句专业、简洁、结果导向的工作日志。
    语言：简体中文。
    限制：保持在一句话以内（不超过30字），不要使用引号。
    
    输入: "${originalContent}"
    输出:
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    
    return response.text?.trim() || originalContent;
  } catch (error) {
    console.error("Task Refine Error:", error);
    return originalContent;
  }
};
