import Anthropic from "@anthropic-ai/sdk";
import { logger } from "./logger";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const MODEL = "claude-sonnet-4-6";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

/** Общий метод: отправить сообщения и получить ответ */
export async function chat(
  messages: ChatMessage[],
  systemPrompt: string,
  maxTokens = 2048
): Promise<string> {
  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: maxTokens,
    system: systemPrompt,
    messages,
  });
  const block = response.content[0];
  if (block.type !== "text") throw new Error("Unexpected response type");
  return block.text;
}

/** Чат-бот по тех.заданию для субподрядчиков */
export async function chatWithDocument(
  question: string,
  documentText: string,
  history: ChatMessage[]
): Promise<string> {
  const system = `Ты — помощник по техническому заданию строительного проекта.
Отвечай ТОЛЬКО на основе предоставленного документа. Если информации нет в документе — так и скажи.
Отвечай на русском языке, чётко и по существу.

ТЕКСТ ТЕХНИЧЕСКОГО ЗАДАНИЯ:
${documentText.slice(0, 80000)}`;

  const messages: ChatMessage[] = [
    ...history.slice(-10),
    { role: "user", content: question },
  ];

  return chat(messages, system, 1024);
}

/** Проверка документа на соответствие СНиП/СП */
export async function checkSnip(
  documentText: string,
  selectedNorms: string[]
): Promise<string> {
  const normsList = selectedNorms.length
    ? selectedNorms.join(", ")
    : "СНиП 3.03.01-87, СП 70.13330.2012, СНиП 21-01-97, СП 112.13330.2011";

  const system = `Ты — эксперт по строительным нормам и правилам РФ и СНГ.
Проверь предоставленный документ на соответствие нормам: ${normsList}.
Отвечай СТРОГО в следующем JSON-формате:
{
  "summary": "краткое резюме",
  "checks": [
    {
      "norm": "название нормы",
      "status": "ok" | "warning" | "violation",
      "description": "что проверено",
      "detail": "подробности нарушения или замечания (если есть)"
    }
  ],
  "recommendations": ["список рекомендаций"]
}`;

  const messages: ChatMessage[] = [
    {
      role: "user",
      content: `Проверь следующий документ:\n\n${documentText.slice(0, 80000)}`,
    },
  ];

  return chat(messages, system, 4096);
}

/** Генерация технического задания по брифу */
export async function generateTZ(brief: string, projectType: string): Promise<string> {
  const system = `Ты — опытный инженер-проектировщик. Составь подробное техническое задание для строительного проекта.
Используй профессиональную терминологию, структурируй по разделам.
Учитывай требования строительных норм РФ и СНГ.`;

  const messages: ChatMessage[] = [
    {
      role: "user",
      content: `Тип проекта: ${projectType}\n\nБриф от заказчика:\n${brief}\n\nСоставь полное техническое задание.`,
    },
  ];

  return chat(messages, system, 4096);
}

/** Анализ и сравнение смет */
export async function analyzeEstimate(estimateText: string): Promise<string> {
  const system = `Ты — эксперт по строительным сметам (ГЭСН, ФЕР, ТЕР).
Проанализируй смету, найди:
1. Завышенные расценки (сравни с рыночными ценами)
2. Дублирующиеся позиции
3. Ошибки в объёмах работ
4. Отсутствующие необходимые работы
Отвечай в JSON:
{
  "totalAmount": число,
  "riskLevel": "low"|"medium"|"high",
  "summary": "краткое резюме",
  "issues": [{"type":"завышение"|"дубль"|"ошибка"|"пропуск","position":"название","detail":"описание","impact": число}],
  "recommendations": ["список рекомендаций"]
}`;

  const messages: ChatMessage[] = [
    { role: "user", content: `Проанализируй смету:\n\n${estimateText.slice(0, 80000)}` },
  ];

  return chat(messages, system, 4096);
}

/** Генерация акта КС-2 / КС-3 */
export async function generateAct(
  actType: "КС-2" | "КС-3",
  projectData: Record<string, unknown>,
  worksData: unknown[]
): Promise<string> {
  const system = `Ты — специалист по строительной документации.
Сформируй акт ${actType} в текстовом виде с правильной структурой согласно Постановлению Госкомстата РФ №71а.
Используй предоставленные данные точно, не придумывай.`;

  const messages: ChatMessage[] = [
    {
      role: "user",
      content: `Данные проекта: ${JSON.stringify(projectData, null, 2)}\n\nВыполненные работы: ${JSON.stringify(worksData, null, 2)}\n\nСформируй акт ${actType}.`,
    },
  ];

  return chat(messages, system, 4096);
}

/** Автоматический отчёт о ходе строительства */
export async function generateProgressReport(
  projectData: Record<string, unknown>,
  period: string
): Promise<string> {
  const system = `Ты — менеджер строительного проекта. Составь профессиональный отчёт о ходе строительства за указанный период.
Включи: выполненные работы, финансовое состояние, риски, план на следующий период.
Используй только предоставленные данные.`;

  const messages: ChatMessage[] = [
    {
      role: "user",
      content: `Период: ${period}\nДанные проекта:\n${JSON.stringify(projectData, null, 2)}\n\nСоставь отчёт о ходе работ.`,
    },
  ];

  return chat(messages, system, 3000);
}

/** Анализ тендерной документации */
export async function analyzeTender(tenderText: string): Promise<string> {
  const system = `Ты — эксперт по государственным закупкам и строительным тендерам.
Проанализируй тендерную документацию и выдай структурированный анализ в JSON:
{
  "title": "название тендера",
  "customer": "заказчик",
  "budget": число или null,
  "deadline": "срок",
  "requirements": ["ключевые требования"],
  "risks": ["риски участия"],
  "advantages": ["преимущества"],
  "recommendation": "участвовать"|"не участвовать"|"изучить подробнее",
  "reasoning": "обоснование рекомендации",
  "checklist": [{"item":"что подготовить","done":false}]
}`;

  const messages: ChatMessage[] = [
    { role: "user", content: `Проанализируй тендер:\n\n${tenderText.slice(0, 80000)}` },
  ];

  return chat(messages, system, 3000);
}

/** Анализ фото с объекта строительства (Claude Vision) */
export async function analyzeConstructionPhotos(
  images: Array<{ base64: string; mediaType: string; name: string }>,
  projectName: string,
  context?: string
): Promise<string> {
  const content: Anthropic.MessageParam["content"] = [];

  for (const img of images.slice(0, 10)) {
    content.push({
      type: "image",
      source: {
        type: "base64",
        media_type: img.mediaType as "image/jpeg" | "image/png" | "image/webp",
        data: img.base64,
      },
    });
    content.push({ type: "text", text: `Фото: ${img.name}` });
  }

  content.push({
    type: "text",
    text: `Проект: ${projectName}\n${context ? `Контекст: ${context}\n` : ""}
Ты — инженер строительного надзора. Проанализируй фото с объекта и составь детальный отчёт:
1. Что выполнено (конкретные виды работ)
2. Качество выполнения (замечания если есть)
3. Нарушения техники безопасности (если видны)
4. Готовность этапа (в % примерно)
5. Рекомендации и следующие шаги

Отвечай на русском языке.`,
  });

  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 3000,
    messages: [{ role: "user", content }],
  });

  const block = response.content[0];
  if (block.type !== "text") throw new Error("Unexpected response type");
  return block.text;
}

/** Анализ рентабельности подрядчиков */
export async function analyzeContractors(
  contractors: unknown[],
  expenses: unknown[]
): Promise<string> {
  const system = `Ты — финансовый аналитик строительных проектов.
Проанализируй данные по подрядчикам и расходам, выдай структурированный JSON-анализ:
{
  "summary": "общее резюме",
  "contractors": [
    {
      "id": число,
      "name": "имя",
      "totalPaid": число,
      "contractAmount": число или null,
      "utilizationPct": число (% от суммы контракта),
      "riskLevel": "low"|"medium"|"high",
      "insight": "ключевое наблюдение"
    }
  ],
  "topRisks": ["риск 1", "риск 2"],
  "recommendations": ["рекомендация 1"]
}`;

  const messages: ChatMessage[] = [{
    role: "user",
    content: `Подрядчики:\n${JSON.stringify(contractors, null, 2)}\n\nРасходы:\n${JSON.stringify(expenses, null, 2)}`,
  }];

  return chat(messages, system, 3000);
}

/** Отправка уведомления в Telegram */
export async function sendTelegramMessage(chatId: string, text: string): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    logger.warn("TELEGRAM_BOT_TOKEN not set");
    return;
  }
  const url = `https://api.telegram.org/bot${token}/sendMessage`;
  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML" }),
  });
  if (!resp.ok) {
    const body = await resp.text();
    logger.error({ body }, "Telegram send failed");
  }
}
