import Anthropic from "@anthropic-ai/sdk";
import { getDatabase } from "@netlify/database";
import { listServices, listStaff, computeAvailability, createAppointment } from "./_lib/booking.mjs";

const MODEL = "claude-sonnet-5-5";
const MAX_TOOL_ROUNDS = 4;
const HISTORY_LIMIT = 20;

function centsToBRL(cents, isFrom) {
  if (cents == null) return "a combinar";
  const v = (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  return isFrom ? `a partir de ${v}` : v;
}

async function buildSystemPrompt(db) {
  const [services, staff] = await Promise.all([listServices(db), listStaff(db)]);

  const now = new Date();
  const fmt = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo", weekday: "long", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
  const agora = fmt.format(now);

  const servicesList = services
    .map((s) => `- [id ${s.id}] ${s.name} (${s.category}) — ${centsToBRL(s.price_cents, s.price_is_from)}, ${s.duration_minutes} min${s.required_staff_id ? " — só com o profissional id " + s.required_staff_id : ""}`)
    .join("\n");
  const staffList = staff.map((s) => `- [id ${s.id}] ${s.name}${s.role ? " (" + s.role + ")" : ""}`).join("\n");

  return `Você é o atendente virtual da Glaycom Marlons Barbearia, em Belo Horizonte (Alípio de Melo). Converse em português do Brasil, direto e cordial, frases curtas (é WhatsApp). No máximo 1 emoji por mensagem, só se fizer sentido.

Agora é: ${agora} (horário de Brasília).

Horário de funcionamento: segunda a sexta 09h-19h, sábado 09h-17h, domingo fechado.

Seu objetivo: tirar dúvidas sobre serviços/preços e agendar um horário. Use SEMPRE as ferramentas pra checar disponibilidade real — nunca invente horário livre nem confirme um agendamento sem checar antes com check_availability. Antes de chamar create_appointment, confirme com o cliente: serviço, data, horário e nome completo. Só crie o agendamento depois que o cliente confirmar explicitamente (ex.: "pode confirmar", "fechado", "sim").

O telefone do cliente já é conhecido pelo sistema — não precisa perguntar.

Serviços disponíveis:
${servicesList}

Profissionais:
${staffList}

Se o cliente pedir algo fora disso (ex. cancelar/remarcar um agendamento já feito, reclamação, assunto não relacionado), diga que vai encaminhar pra equipe humana e não tente resolver sozinho.`;
}

const tools = [
  {
    name: "check_availability",
    description: "Verifica os horários livres para um serviço em uma data específica.",
    input_schema: {
      type: "object",
      properties: {
        service_id: { type: "integer", description: "ID do serviço, da lista no system prompt" },
        date: { type: "string", description: "Data no formato YYYY-MM-DD" },
        staff_id: { type: "integer", description: "ID do profissional, se o cliente pediu alguém específico (opcional)" },
      },
      required: ["service_id", "date"],
    },
  },
  {
    name: "create_appointment",
    description: "Cria o agendamento. Só chame depois que o cliente confirmou serviço, data, horário (de um slot retornado por check_availability) e nome.",
    input_schema: {
      type: "object",
      properties: {
        service_id: { type: "integer" },
        staff_id: { type: "integer", description: "opcional, se o cliente pediu um profissional específico" },
        starts_at: { type: "string", description: "Data/hora ISO 8601 exata de um horário retornado por check_availability" },
        customer_name: { type: "string", description: "Nome do cliente" },
      },
      required: ["service_id", "starts_at", "customer_name"],
    },
  },
];

async function runTool(db, phone, name, input) {
  if (name === "check_availability") {
    const result = await computeAvailability(db, { date: input.date, serviceId: Number(input.service_id), staffId: input.staff_id ? Number(input.staff_id) : null });
    if (result.error) return { error: result.error };
    const slotsFormatted = (result.slots || []).map((iso) => ({
      iso,
      label: new Date(iso).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", weekday: "short", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }),
    }));
    return { slots: slotsFormatted, reason: result.reason };
  }
  if (name === "create_appointment") {
    const result = await createAppointment(db, {
      serviceId: Number(input.service_id),
      staffId: input.staff_id ? Number(input.staff_id) : null,
      customerName: String(input.customer_name || "").trim(),
      customerPhone: phone,
      customerEmail: null,
      startsAtIso: input.starts_at,
    });
    if (result.error) return { error: result.error };
    return { confirmado: true, agendamento: result.appointment };
  }
  return { error: "Ferramenta desconhecida." };
}

async function sendWhatsApp(remoteJid, text) {
  const url = `${process.env.EVOLUTION_API_URL}/message/sendText/${process.env.EVOLUTION_INSTANCE}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: process.env.EVOLUTION_API_KEY },
    // Usa o JID completo (inclui @lid/@s.whatsapp.net) — a Evolution API não aceita um número "pelado"
    // para contatos identificados por @lid (o Linked ID de privacidade do WhatsApp).
    body: JSON.stringify({ number: remoteJid, text }),
  });
  if (!res.ok) {
    console.error("Falha ao enviar WhatsApp:", res.status, await res.text().catch(() => ""));
  }
}

function extractIncoming(payload) {
  const data = payload?.data;
  if (!data || data.key?.fromMe) return null;
  const remoteJid = data.key?.remoteJid || "";
  const phone = remoteJid.split("@")[0];
  if (!phone || remoteJid.includes("@g.us")) return null; // ignora grupos
  const text = data.message?.conversation || data.message?.extendedTextMessage?.text || "";
  const messageId = data.key?.id || null;
  return { phone, remoteJid, text, messageId };
}

export default async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  let payload;
  try {
    payload = await req.json();
  } catch {
    return Response.json({ ok: true }); // ack mesmo em payload inválido, pra não gerar retry infinito
  }

  const incoming = extractIncoming(payload);
  if (!incoming || !incoming.text) {
    return Response.json({ ok: true, skipped: true });
  }

  // Trava de segurança: enquanto em teste num número pessoal, só responde a um número permitido
  // (evita o bot responder contatos reais do dono do número com conteúdo de barbearia).
  const allowlist = (process.env.WHATSAPP_TEST_ALLOWLIST || "").split(",").map((s) => s.trim()).filter(Boolean);
  if (allowlist.length && !allowlist.includes(incoming.phone)) {
    return Response.json({ ok: true, skipped: true, reason: "not_in_test_allowlist" });
  }

  const db = getDatabase();

  // Idempotência: se já processamos esse message id, não reprocessa (Evolution pode reenviar o webhook).
  if (incoming.messageId) {
    try {
      await db.sql`INSERT INTO whatsapp_messages (phone, role, content, external_id) VALUES (${incoming.phone}, 'user', ${incoming.text}, ${incoming.messageId})`;
    } catch (err) {
      return Response.json({ ok: true, duplicate: true });
    }
  } else {
    await db.sql`INSERT INTO whatsapp_messages (phone, role, content) VALUES (${incoming.phone}, 'user', ${incoming.text})`;
  }

  const history = await db.sql`
    SELECT role, content FROM whatsapp_messages
    WHERE phone = ${incoming.phone}
    ORDER BY created_at DESC
    LIMIT ${HISTORY_LIMIT}
  `;
  const messages = history.reverse().map((m) => ({ role: m.role, content: m.content }));

  const anthropic = new Anthropic();
  const system = await buildSystemPrompt(db);

  let finalText = "";
  try {
    for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
      const response = await anthropic.messages.create({
        model: MODEL,
        max_tokens: 1024,
        system,
        tools,
        messages,
      });

      const toolUses = response.content.filter((b) => b.type === "tool_use");
      const textBlocks = response.content.filter((b) => b.type === "text").map((b) => b.text);
      if (textBlocks.length) finalText = textBlocks.join("\n");

      if (response.stop_reason !== "tool_use" || !toolUses.length) break;

      messages.push({ role: "assistant", content: response.content });
      const toolResults = [];
      for (const use of toolUses) {
        const result = await runTool(db, incoming.phone, use.name, use.input);
        toolResults.push({ type: "tool_result", tool_use_id: use.id, content: JSON.stringify(result) });
      }
      messages.push({ role: "user", content: toolResults });
    }
  } catch (err) {
    console.error("Erro no agente:", err);
    finalText = "Desculpa, tive um problema aqui. Pode tentar de novo em instantes, ou chamar a gente mais tarde?";
  }

  if (!finalText) finalText = "Desculpa, não entendi direito. Pode reformular?";

  await db.sql`INSERT INTO whatsapp_messages (phone, role, content) VALUES (${incoming.phone}, 'assistant', ${finalText})`;
  await sendWhatsApp(incoming.remoteJid, finalText);

  return Response.json({ ok: true });
};

export const config = { path: "/api/whatsapp-webhook" };
