import { useState, useEffect, useRef } from "react";

const SYSTEM_PROMPT = `Eres un asistente de ventas de NUVIs, un sistema de automatización de leads con IA para WhatsApp e Instagram.

OBJETIVO:
Mostrar cómo funciona NUVIs respondiendo como si fueras el bot de un negocio real. Calificá al visitante y llevalo a agendar una demo con el equipo.

ESTILO:
- Cercano, directo, natural
- Mensajes cortos (máx 3 líneas)
- 1 sola pregunta por mensaje
- No decir que eres IA

PROCESO:
1. Saludá y preguntá a qué se dedica su negocio
2. Entendé su situación actual con leads/clientes
3. Preguntá qué quiere lograr
4. Proponé una demo personalizada de NUVIs para su rubro

CIERRE:
"por lo que me contás, NUVIs encajaría muy bien en tu negocio
¿querés ver una demo de 20 min adaptada a tu caso?"

Si acepta:
"perfecto 👌 agendá acá y te mostramos exactamente cómo funcionaría para vos:
👉 https://cal.com/nuvem-njqbue/demo-nuvis"
→ agregar [[DEMO_AGENDADA]]

DESCALIFICAR si no tiene negocio o no hay fit:
"entendido 👌 si en algún momento lo necesitás, acá estamos"
→ agregar [[NO_CALIFICA]]

EVENTOS (al final, ocultos):
[[DEMO_AGENDADA]] → agendó demo
[[NO_CALIFICA]] → no califica`;

const INITIAL_MESSAGE = {
  role: "assistant",
  content: "hola! vi que te interesó NUVIs 😊 a qué se dedica tu negocio?",
};

const MAX_MESSAGES = 10;

function parseEvents(text) {
  let clean = text;
  let event = null;
  if (text.includes("[[DEMO_AGENDADA]]")) {
    clean = text.replace("[[DEMO_AGENDADA]]", "").trim();
    event = "demo";
  } else if (text.includes("[[NO_CALIFICA]]")) {
    clean = text.replace("[[NO_CALIFICA]]", "").trim();
    event = "nocal";
  }
  return { clean, event };
}

function formatTime() {
  return new Date().toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });
}

function BotDemo() {
  const [messages, setMessages] = useState([{ ...INITIAL_MESSAGE, time: formatTime(), id: 0 }]);
  const [history, setHistory] = useState([INITIAL_MESSAGE]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [msgCount, setMsgCount] = useState(0);
  const [done, setDone] = useState(false);
  const [channel, setChannel] = useState("whatsapp");
  const isWA = channel === "whatsapp";
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const resetChat = (ch) => {
    setChannel(ch);
    setMessages([{ ...INITIAL_MESSAGE, time: formatTime(), id: 0 }]);
    setHistory([INITIAL_MESSAGE]);
    setInput("");
    setMsgCount(0);
    setDone(false);
  };

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || loading || done || msgCount >= MAX_MESSAGES) return;

    const userMsg = { role: "user", content: text, time: formatTime(), id: Date.now() };
    const newHistory = [...history, { role: "user", content: text }];
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ system: SYSTEM_PROMPT, messages: newHistory }),
      });
      const data = await res.json();
      const raw = data.content?.[0]?.text || "perdón, hubo un problema 😅";
      const { clean, event } = parseEvents(raw);

      setMessages((prev) => [...prev, { role: "assistant", content: clean, time: formatTime(), id: Date.now() + 1 }]);
      setHistory([...newHistory, { role: "assistant", content: clean }]);
      setMsgCount((c) => c + 1);

      if (event || msgCount + 1 >= MAX_MESSAGES) setDone(true);
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", content: "uy, algo falló 😅 intentá de nuevo", time: formatTime(), id: Date.now() + 1 }]);
    }

    setLoading(false);
    inputRef.current?.focus();
  };

  const handleKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  return (
    <div style={{ width: "100%", maxWidth: 370, borderRadius: 24, overflow: "hidden", display: "flex", flexDirection: "column", height: 520, border: "1px solid rgba(56,189,248,0.2)", boxShadow: "0 0 40px rgba(56,189,248,0.1), 0 20px 60px rgba(0,0,0,0.4)" }}>
      {/* Toggle canal */}
      <div style={{ background: "rgba(4,10,20,0.98)", padding: "10px 12px", borderBottom: "1px solid rgba(56,189,248,0.08)", display: "flex", gap: 6, flexShrink: 0 }}>
        {[["whatsapp", "💬 WhatsApp"], ["instagram", "📸 Instagram"]].map(([ch, label]) => (
          <button key={ch} onClick={() => resetChat(ch)} style={{ flex: 1, padding: "6px 0", borderRadius: 10, fontSize: 12, fontWeight: 600, border: "none", cursor: "pointer", transition: "all 0.2s", background: channel === ch ? (ch === "whatsapp" ? "#25d366" : "linear-gradient(135deg, #7928ca, #e1306c)") : "rgba(255,255,255,0.05)", color: channel === ch ? "white" : "rgba(255,255,255,0.35)" }}>{label}</button>
        ))}
      </div>
      {/* Header */}
      <div style={{ background: isWA ? "#1f2c33" : "#1a1a1a", padding: "12px 16px", display: "flex", alignItems: "center", gap: 10, borderBottom: `1px solid ${isWA ? "#2a3942" : "#2a2a2a"}`, flexShrink: 0 }}>
        <div style={{ width: 38, height: 38, borderRadius: "50%", background: isWA ? "linear-gradient(135deg, #25d366, #128c7e)" : "linear-gradient(135deg, #f09433, #bc1888)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0, boxShadow: isWA ? "0 0 12px rgba(37,211,102,0.4)" : "0 0 12px rgba(225,48,108,0.4)" }}>⚡</div>
        <div>
          <div style={{ color: "white", fontWeight: 700, fontSize: 14, letterSpacing: "-0.3px" }}>NUVIs · Demo en vivo</div>
          <div style={{ color: isWA ? "#25d366" : "#f09433", fontSize: 11, display: "flex", alignItems: "center", gap: 4 }}>
            <span style={{ width: 5, height: 5, borderRadius: "50%", background: isWA ? "#25d366" : "#f09433", display: "inline-block", animation: "pulse 2s infinite" }} />
            respondiendo ahora
          </div>
        </div>
        <div style={{ marginLeft: "auto", fontSize: 10, color: "rgba(255,255,255,0.35)", background: "rgba(255,255,255,0.05)", padding: "3px 8px", borderRadius: 20 }}>
          {MAX_MESSAGES - msgCount} msgs restantes
        </div>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: "auto", padding: "14px 12px", display: "flex", flexDirection: "column", gap: 8, background: isWA ? "#0b141a" : "#000" }}>
        {messages.map((msg) => {
          const isBot = msg.role === "assistant";
          return (
            <div key={msg.id} style={{ display: "flex", justifyContent: isBot ? "flex-start" : "flex-end", alignItems: "flex-end", gap: 6 }}>
              {isBot && (
                <div style={{ width: 24, height: 24, borderRadius: "50%", flexShrink: 0, marginBottom: 2, background: "linear-gradient(135deg, #0ea5e9, #2563eb)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, boxShadow: "0 0 8px rgba(14,165,233,0.4)" }}>⚡</div>
              )}
              <div style={{ maxWidth: "74%", padding: "8px 12px", borderRadius: isBot ? "16px 16px 16px 4px" : "16px 16px 4px 16px", background: isBot ? (isWA ? "#1f2c33" : "#262626") : (isWA ? "#005c4b" : "linear-gradient(135deg, #7928ca, #e1306c)"), color: "white", fontSize: 13, lineHeight: 1.5, border: "none" }}>
                {msg.content}
                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", textAlign: "right", marginTop: 3 }}>{msg.time}{!isBot && " ✓✓"}</div>
              </div>
            </div>
          );
        })}

        {loading && (
          <div style={{ display: "flex", alignItems: "flex-end", gap: 6 }}>
            <div style={{ width: 24, height: 24, borderRadius: "50%", background: "linear-gradient(135deg, #0ea5e9, #2563eb)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11 }}>⚡</div>
            <div style={{ padding: "10px 14px", borderRadius: "16px 16px 16px 4px", background: "rgba(14,30,60,0.9)", display: "flex", gap: 4, alignItems: "center", border: "1px solid rgba(56,189,248,0.1)" }}>
              {[0, 1, 2].map((i) => <div key={i} style={{ width: 6, height: 6, borderRadius: "50%", background: "#38bdf8", animation: "bounce 1.2s infinite", animationDelay: `${i * 0.2}s` }} />)}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{ background: isWA ? "#1f2c33" : "#1a1a1a", padding: "10px 12px", display: "flex", gap: 8, alignItems: "flex-end", borderTop: `1px solid ${isWA ? "#2a3942" : "#2a2a2a"}`, flexShrink: 0 }}>
        {done ? (
          <div style={{ flex: 1, textAlign: "center", fontSize: 12, color: "rgba(56,189,248,0.6)", padding: "8px 0" }}>demo completada — ¡gracias! 👌</div>
        ) : (
          <>
            <textarea ref={inputRef} value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={handleKey}
              placeholder="Escribí como si fueras un cliente..." rows={1}
              style={{ flex: 1, background: isWA ? "#2a3942" : "#262626", border: "none", borderRadius: 20, padding: "8px 14px", color: "white", fontSize: 13, resize: "none", outline: "none", lineHeight: 1.4, maxHeight: 70, overflowY: "auto", fontFamily: "inherit" }} />
            <button onClick={sendMessage} disabled={!input.trim() || loading}
              style={{ width: 36, height: 36, borderRadius: "50%", border: "none", cursor: input.trim() && !loading ? "pointer" : "not-allowed", background: input.trim() && !loading ? (isWA ? "#25d366" : "linear-gradient(135deg, #7928ca, #e1306c)") : "#333", color: "white", fontSize: 14, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s" }}>➤</button>
          </>
        )}
      </div>
    </div>
  );
}

export default function App() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div style={{ background: "#020810", color: "white", fontFamily: "'Syne', 'Helvetica Neue', sans-serif", minHeight: "100vh", overflowX: "hidden" }}>

      {/* Nav */}
      <nav style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 100, padding: "0 32px", height: 64, display: "flex", alignItems: "center", justifyContent: "space-between", background: scrolled ? "rgba(2,8,16,0.95)" : "transparent", backdropFilter: scrolled ? "blur(20px)" : "none", borderBottom: scrolled ? "1px solid rgba(56,189,248,0.08)" : "none", transition: "all 0.3s" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <img src="/logo.png" alt="NUVIs" style={{ width: 36, height: 36, borderRadius: "50%", objectFit: "cover" }} />
          <span style={{ fontWeight: 800, fontSize: 20, letterSpacing: "-0.5px", background: "linear-gradient(90deg, #38bdf8, #818cf8)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>NUVIs</span>
        </div>
        <a href="https://cal.com/nuvem-njqbue/demo-nuvis" target="_blank" rel="noreferrer"
          style={{ background: "linear-gradient(135deg, #0ea5e9, #2563eb)", color: "white", padding: "9px 20px", borderRadius: 24, fontSize: 13, fontWeight: 700, textDecoration: "none", boxShadow: "0 4px 16px rgba(14,165,233,0.3)", transition: "all 0.2s" }}
          onMouseOver={e => e.currentTarget.style.transform = "translateY(-1px)"}
          onMouseOut={e => e.currentTarget.style.transform = "translateY(0)"}>
          Agendar demo
        </a>
      </nav>

      {/* Hero */}
      <section style={{ minHeight: "100vh", display: "flex", alignItems: "center", padding: "90px 24px 60px", maxWidth: 1100, margin: "0 auto", position: "relative" }}>

        {/* Glow background */}
        <div style={{ position: "absolute", top: "20%", left: "10%", width: 400, height: 400, borderRadius: "50%", background: "radial-gradient(circle, rgba(14,165,233,0.08) 0%, transparent 70%)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", top: "40%", right: "5%", width: 300, height: 300, borderRadius: "50%", background: "radial-gradient(circle, rgba(129,140,248,0.06) 0%, transparent 70%)", pointerEvents: "none" }} />

        <div style={{ display: "flex", flexWrap: "wrap", gap: 64, alignItems: "center", justifyContent: "center", width: "100%" }}>

          {/* Left */}
          <div style={{ flex: "1 1 400px", maxWidth: 520 }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(56,189,248,0.08)", border: "1px solid rgba(56,189,248,0.2)", borderRadius: 20, padding: "5px 14px", fontSize: 12, color: "#38bdf8", marginBottom: 32, fontWeight: 600, letterSpacing: "0.5px" }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#38bdf8", display: "inline-block", animation: "pulse 2s infinite" }} />
              RESPUESTA INSTANTÁNEA CON IA
            </div>

            <h1 style={{ fontSize: "clamp(36px, 5.5vw, 58px)", fontWeight: 800, lineHeight: 1.05, letterSpacing: "-2px", margin: "0 0 24px" }}>
              Tus leads respondidos{" "}
              <span style={{ background: "linear-gradient(90deg, #38bdf8, #818cf8)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                en segundos.
              </span>
            </h1>

            <p style={{ fontSize: 17, color: "rgba(255,255,255,0.5)", lineHeight: 1.75, margin: "0 0 40px", maxWidth: 440 }}>
              El 78% de los clientes elige al primero que responde. Nosotros hacemos que siempre seas vos — sin que tu equipo esté pendiente del celular.
            </p>

            <div style={{ display: "flex", gap: 32, marginBottom: 44 }}>
              {[["< 60\"", "Primera respuesta"], ["3x", "Más conversiones"], ["24/7", "Sin horarios"]].map(([val, label]) => (
                <div key={label}>
                  <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: "-1px", background: "linear-gradient(90deg, #38bdf8, #818cf8)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>{val}</div>
                  <div style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", marginTop: 3, fontWeight: 500 }}>{label}</div>
                </div>
              ))}
            </div>

            <div style={{ display: "flex", gap: 8 }}>
              {["💬 WhatsApp", "📸 Instagram DM"].map(ch => (
                <div key={ch} style={{ background: "rgba(56,189,248,0.06)", border: "1px solid rgba(56,189,248,0.15)", borderRadius: 20, padding: "6px 14px", fontSize: 13, color: "rgba(255,255,255,0.5)", fontWeight: 500 }}>{ch}</div>
              ))}
            </div>
          </div>

          {/* Right — Bot */}
          <div style={{ flex: "1 1 320px", display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
            <BotDemo />
            <p style={{ fontSize: 12, color: "rgba(255,255,255,0.2)", textAlign: "center", fontWeight: 500 }}>
              ↑ Probá hablar como lo haría un cliente real
            </p>
          </div>
        </div>
      </section>

      {/* Beneficios */}
      <section style={{ padding: "80px 24px", maxWidth: 1000, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 60 }}>
          <div style={{ fontSize: 11, color: "#38bdf8", letterSpacing: "3px", textTransform: "uppercase", marginBottom: 14, fontWeight: 700 }}>Por qué NUVIs</div>
          <h2 style={{ fontSize: "clamp(26px, 4vw, 40px)", fontWeight: 800, letterSpacing: "-1.5px", margin: 0 }}>
            Todo lo que tu equipo no puede hacer.<br />
            <span style={{ background: "linear-gradient(90deg, #38bdf8, #818cf8)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>NUVIs sí.</span>
          </h2>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
          {[
            ["⚡", "Respuesta en menos de 60 segundos", "El lead no espera. El bot responde al instante, sin importar si es domingo a las 3am."],
            ["🎯", "Califica solo los leads que valen", "Filtra curiosos de compradores reales antes de que tu equipo pierda tiempo."],
            ["📅", "Agenda reuniones automáticamente", "Conecta con tu calendario y agenda la sesión sin intervención humana."],
            ["🔔", "Avisa cuando entra un lead calificado", "Tu equipo recibe una notificación con el contexto completo, listo para cerrar."],
            ["⏸️", "Se pausa cuando entra un humano", "Si tu equipo quiere tomar el control, el bot se detiene y cede el paso."],
            ["📊", "Aprende de cada conversación", "El prompt se ajusta con los casos reales para mejorar la conversión con el tiempo."],
          ].map(([icon, title, desc]) => (
            <div key={title} style={{ background: "rgba(10,20,40,0.6)", border: "1px solid rgba(56,189,248,0.08)", borderRadius: 16, padding: "24px", transition: "all 0.2s" }}
              onMouseOver={e => { e.currentTarget.style.border = "1px solid rgba(56,189,248,0.2)"; e.currentTarget.style.transform = "translateY(-2px)"; }}
              onMouseOut={e => { e.currentTarget.style.border = "1px solid rgba(56,189,248,0.08)"; e.currentTarget.style.transform = "translateY(0)"; }}>
              <div style={{ fontSize: 24, marginBottom: 12 }}>{icon}</div>
              <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 8, letterSpacing: "-0.3px" }}>{title}</div>
              <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 14, lineHeight: 1.6 }}>{desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Cómo funciona */}
      <section style={{ padding: "80px 24px", maxWidth: 800, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 56 }}>
          <div style={{ fontSize: 11, color: "#38bdf8", letterSpacing: "3px", textTransform: "uppercase", marginBottom: 14, fontWeight: 700 }}>El proceso</div>
          <h2 style={{ fontSize: "clamp(26px, 4vw, 38px)", fontWeight: 800, letterSpacing: "-1.5px", margin: 0 }}>Cómo funciona</h2>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
          {[
            ["01", "El cliente llega por WhatsApp o Instagram", "Desde un anuncio, una historia, una palabra clave o directo a tu perfil. El bot responde en segundos, sin importar el horario."],
            ["02", "Conversación adaptada a tu negocio", "El bot habla según el rubro — califica leads para agencias, toma pedidos para mayoristas, informa el menú para restaurantes, gestiona consultas para clínicas. Cada negocio tiene su propio flujo."],
            ["03", "Cierra, agenda o deriva según el caso", "Puede cerrar una venta, agendar una reunión, enviar un link de pago o pasarle el cliente a un humano con todo el contexto listo. Lo que necesite tu negocio."],
            ["04", "Tu equipo solo interviene cuando importa", "El bot maneja el volumen. Tu equipo se enfoca en los casos que realmente necesitan atención humana — sin perder tiempo en consultas repetitivas."],
          ].map(([num, title, desc], i, arr) => (
            <div key={num} style={{ display: "flex", gap: 20, padding: "28px 0", borderBottom: i < arr.length - 1 ? "1px solid rgba(56,189,248,0.06)" : "none" }}>
              <div style={{ fontSize: 11, color: "rgba(56,189,248,0.4)", fontWeight: 800, minWidth: 28, paddingTop: 3, letterSpacing: "1px" }}>{num}</div>
              <div style={{ width: 1, background: "linear-gradient(180deg, #38bdf8, transparent)", minHeight: 60, opacity: 0.2, flexShrink: 0 }} />
              <div>
                <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 6, letterSpacing: "-0.3px" }}>{title}</div>
                <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 14, lineHeight: 1.65 }}>{desc}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Integraciones */}
      <section style={{ padding: "60px 24px", maxWidth: 800, margin: "0 auto", textAlign: "center" }}>
        <div style={{ fontSize: 11, color: "#38bdf8", letterSpacing: "3px", textTransform: "uppercase", marginBottom: 14, fontWeight: 700 }}>Integraciones</div>
        <h2 style={{ fontSize: "clamp(22px, 3vw, 32px)", fontWeight: 800, letterSpacing: "-1px", marginBottom: 40 }}>Donde están tus clientes</h2>
        <div style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12, width: "100%", maxWidth: 800, margin: "0 auto" }}>
            {[
              ["💬", "WhatsApp Business", "#25d366"],
              ["📸", "Instagram DM", "#e1306c"],
              ["📅", "Agendamiento (Cal.com)", "#38bdf8"],
              ["🔔", "Alertas (Slack)", "#818cf8"],
              ["📦", "Inventario y stock", "#f59e0b"],
              ["🕐", "Horarios de atención", "#10b981"],
              ["🛍️", "Catálogo de productos", "#f97316"],
              ["💳", "Pasarelas de pago", "#6366f1"],
              ["📊", "Google Sheets", "#34d399"],
              ["🔗", "CRM y más", "#38bdf8"],
            ].map(([icon, name, color]) => (
              <div key={name} style={{ background: "rgba(10,20,40,0.6)", border: `1px solid ${color}22`, borderRadius: 14, padding: "14px 18px", display: "flex", alignItems: "center", gap: 10, transition: "all 0.2s" }}
                onMouseOver={e => { e.currentTarget.style.border = `1px solid ${color}44`; e.currentTarget.style.transform = "translateY(-1px)"; }}
                onMouseOut={e => { e.currentTarget.style.border = `1px solid ${color}22`; e.currentTarget.style.transform = "translateY(0)"; }}>
                <span style={{ fontSize: 18 }}>{icon}</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.6)" }}>{name}</span>
              </div>
            ))}
          </div>
          <p style={{ fontSize: 13, color: "rgba(255,255,255,0.2)", marginTop: 24 }}>Nuevas integraciones en desarrollo continuo</p>
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding: "80px 24px", textAlign: "center" }}>
        <div style={{ maxWidth: 560, margin: "0 auto", position: "relative" }}>
          <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: 400, height: 200, borderRadius: "50%", background: "radial-gradient(circle, rgba(14,165,233,0.1) 0%, transparent 70%)", pointerEvents: "none" }} />
          <h2 style={{ fontSize: "clamp(26px, 4vw, 40px)", fontWeight: 800, letterSpacing: "-1.5px", marginBottom: 16, position: "relative" }}>
            ¿Querés verlo en tu negocio?
          </h2>
          <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 16, lineHeight: 1.7, marginBottom: 36, position: "relative" }}>
            En 20 minutos te mostramos cómo funcionaría NUVIs con tus leads reales.
          </p>
          <a href="https://cal.com/nuvem-njqbue/demo-nuvis" target="_blank" rel="noreferrer"
            style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "linear-gradient(135deg, #0ea5e9, #2563eb)", color: "white", padding: "15px 36px", borderRadius: 32, fontSize: 16, fontWeight: 700, textDecoration: "none", boxShadow: "0 8px 32px rgba(14,165,233,0.35)", transition: "all 0.2s", position: "relative" }}
            onMouseOver={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 12px 40px rgba(14,165,233,0.5)"; }}
            onMouseOut={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 8px 32px rgba(14,165,233,0.35)"; }}>
            ⚡ Agendar demo gratis
          </a>
          <div style={{ marginTop: 14, fontSize: 13, color: "rgba(255,255,255,0.2)", fontWeight: 500 }}>Sin compromiso · 20 minutos · Adaptada a tu rubro</div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ borderTop: "1px solid rgba(56,189,248,0.06)", padding: "24px", textAlign: "center", color: "rgba(255,255,255,0.15)", fontSize: 13, fontWeight: 500 }}>
        © 2025 NUVIs · Powered by Nuvem · IA para leads que convierten
      </footer>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;700;800&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes bounce { 0%,60%,100%{transform:translateY(0)} 30%{transform:translateY(-4px)} }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(56,189,248,0.2); border-radius: 2px; }
      `}</style>
    </div>
  );
}
