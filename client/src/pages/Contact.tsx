import { useState } from "react";
import { Link } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Home, Wrench, Paintbrush, MessageCircle,
  CheckCircle2, Zap, ClipboardCheck, ShieldCheck,
} from "lucide-react";

type Step = 1 | 2 | 3 | 4;

const SERVICES = [
  { v: "build",   icon: Home,         name: "Строительство дома",    hint: "Проект, фундамент, коробка, под ключ" },
  { v: "repair",  icon: Wrench,       name: "Ремонт / реконструкция", hint: "Капитальный ремонт, перепланировка" },
  { v: "finish",  icon: Paintbrush,   name: "Отделка помещений",      hint: "Черновая и чистовая отделка" },
  { v: "consult", icon: MessageCircle, name: "Консультация",            hint: "Смета, проект, материалы" },
];

const BENEFITS = [
  { icon: CheckCircle2, text: "Бесплатный выезд на объект" },
  { icon: Zap, text: "Смета за 24 часа" },
  { icon: ClipboardCheck, text: "Фиксированная цена в договоре" },
  { icon: ShieldCheck, text: "Гарантия на все виды работ" },
];

const CONTACT_METHODS = ["Звонок", "WhatsApp", "Telegram", "Email"];
const CALL_TIMES = ["Утром 9–12", "Днём 12–17", "Вечером 17–20", "В любое время"];

const s = {
  wrap:   { fontFamily: "'Geologica','Segoe UI',sans-serif", minHeight: "100vh", background: "#F7F4EF", display: "flex" as const },
  left:   { background: "#262B36", padding: "4rem 3rem", width: 380, flexShrink: 0 as const, display: "flex" as const, flexDirection: "column" as const, justifyContent: "space-between" },
  right:  { flex: 1, padding: "3.5rem 3rem", maxWidth: 560 },
  logo:   { fontSize: 13, fontWeight: 600, letterSpacing: ".14em", textTransform: "uppercase" as const, color: "rgba(255,255,255,.45)" },
  h1:     { color: "#fff", fontSize: 32, fontWeight: 700, lineHeight: 1.25, marginTop: "2rem", letterSpacing: "-.03em" },
  accent: { width: 36, height: 3, background: "#F47B25", borderRadius: 2, margin: "1.25rem 0" },
  desc:   { color: "rgba(255,255,255,.6)", fontSize: 14, lineHeight: 1.7, maxWidth: 280 },
  ben:    { display: "flex" as const, flexDirection: "column" as const, gap: 14, marginTop: "2rem" },
  benRow: { display: "flex" as const, gap: 12, alignItems: "flex-start" },
  benIcon:{ width: 32, height: 32, borderRadius: "50%", background: "rgba(244,123,37,.16)", color: "#F47B25", display: "flex" as const, alignItems: "center", justifyContent: "center", flexShrink: 0 as const },
  benTxt: { color: "rgba(255,255,255,.7)", fontSize: 13, lineHeight: 1.5 },
  foot:   { color: "rgba(255,255,255,.3)", fontSize: 12, lineHeight: 1.6 },

  tab:      { flex: 1, textAlign: "center" as const, padding: "10px 6px", fontSize: 11, borderRight: "1px solid #DDD8CF", cursor: "pointer", background: "#EEE8DF", color: "#888", transition: "all .2s" },
  tabA:     { background: "#fff", color: "#1A1A1A", fontWeight: 600 },
  tabD:     { background: "#FDEBDD", color: "#C2410C" },
  progress: { display: "flex" as const, borderRadius: 10, overflow: "hidden", border: "1px solid #DDD8CF", marginBottom: "2.5rem" },

  card:  { border: "1.5px solid #DDD8CF", borderRadius: 12, padding: "1rem 1.1rem", cursor: "pointer", transition: "all .18s", background: "#fff", display: "flex" as const, gap: 12, alignItems: "flex-start" },
  cardOn:{ border: "1.5px solid #F47B25", background: "#FEF0E2" },
  cards: { display: "grid" as const, gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: "2rem" },
  svcIcon:  { width: 36, height: 36, borderRadius: 8, background: "rgba(244,123,37,.12)", color: "#F47B25", display: "flex" as const, alignItems: "center", justifyContent: "center", flexShrink: 0 as const },
  svcIconOn:{ background: "#F47B25", color: "#fff" },

  label: { fontSize: 13, fontWeight: 500, color: "#6B6B6B", display: "block", marginBottom: 6 },
  input: { width: "100%", fontSize: 14, padding: "10px 14px", border: "1.5px solid #DDD8CF", borderRadius: 8, background: "#FDFCFA", color: "#1A1A1A", fontFamily: "inherit", outline: "none" },
  row:   { display: "grid" as const, gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 },

  pill:  { padding: "7px 16px", borderRadius: 50, fontSize: 13, cursor: "pointer", border: "1.5px solid #DDD8CF", color: "#888", background: "#fff", transition: "all .15s", userSelect: "none" as const, fontFamily: "inherit" },
  pillOn:{ background: "#262B36", borderColor: "#262B36", color: "#fff" },
  pills: { display: "flex" as const, flexWrap: "wrap" as const, gap: 8, marginTop: 4, marginBottom: 14 },

  btnB:  { padding: "11px 20px", border: "1.5px solid #DDD8CF", borderRadius: 8, fontSize: 14, cursor: "pointer", background: "transparent", color: "#888", fontFamily: "inherit", fontWeight: 500 },
  btnN:  { flex: 1, padding: "12px 24px", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: "pointer", background: "#F47B25", color: "#fff", fontFamily: "inherit", letterSpacing: ".01em" },
  btns:  { display: "flex" as const, gap: 10, marginTop: "2rem" },
  err:   { fontSize: 12, color: "#C0392B", marginTop: 4 },
  req:   { color: "#F47B25" },
  note:  { fontSize: 12, color: "#888", lineHeight: 1.6, marginTop: "1.25rem" },
  sec:   { fontSize: 22, fontWeight: 700, marginBottom: 4, letterSpacing: "-.02em" },
  sub:   { color: "#888", fontSize: 14, marginBottom: "2rem" },
};

export default function ContactPage() {
  const isMobile = useIsMobile();
  const wrap = isMobile ? { ...s.wrap, flexDirection: "column" as const } : s.wrap;
  const left = isMobile
    ? { ...s.left, width: "auto", padding: "2.5rem 1.5rem" }
    : s.left;
  const right = isMobile
    ? { ...s.right, padding: "2rem 1.5rem", maxWidth: "100%" }
    : s.right;
  const grid1 = isMobile ? { gridTemplateColumns: "1fr" } : {};
  const [step, setStep] = useState<Step>(1);
  const [services, setServices] = useState<string[]>([]);
  const [objType, setObjType] = useState("");
  const [area, setArea] = useState("");
  const [budget, setBudget] = useState("");
  const [timeline, setTimeline] = useState("");
  const [city, setCity] = useState("");
  const [desc, setDesc] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [methods, setMethods] = useState<string[]>(["Звонок"]);
  const [times, setTimes] = useState<string[]>(["Вечером 17–20"]);
  const [source, setSource] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const toggleArr = (arr: string[], v: string) =>
    arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v];

  const go = (n: Step) => {
    if (n === 2 && !services.length) {
      setErrors({ services: "Выберите хотя бы один тип услуги" });
      return;
    }
    setErrors({});
    setStep(n);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const submit = async () => {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = "Укажите имя";
    if (!phone.trim() || phone.replace(/\D/g, "").length < 10) e.phone = "Укажите телефон";
    if (Object.keys(e).length) { setErrors(e); return; }
    setLoading(true);
    try {
      await apiRequest("POST", "/api/leads", {
        services: JSON.stringify(services),
        objectType: objType || null,
        area: area && !isNaN(Number(area)) ? Number(area) : null,
        budget: budget || null,
        timeline: timeline || null,
        city: city || null,
        description: desc || null,
        name, phone,
        email: email || null,
        contactMethods: JSON.stringify(methods),
        callTimes: JSON.stringify(times),
        source: source || null,
      });
      setStep(4);
    } catch {
      alert("Ошибка при отправке. Пожалуйста, позвоните нам напрямую.");
    } finally {
      setLoading(false);
    }
  };

  const tabStyle = (n: number) => ({
    ...s.tab,
    ...(step === n ? s.tabA : {}),
    ...(step > n ? s.tabD : {}),
    ...(n === 3 ? { borderRight: "none" } : {}),
  });

  const inp = (err?: string) => ({
    ...s.input,
    ...(err ? { borderColor: "#C0392B" } : {}),
  });

  const pills = (arr: string[], val: string, setter: (v: string[]) => void) => ({
    style: { ...s.pill, ...(arr.includes(val) ? s.pillOn : {}) },
    onClick: () => setter(toggleArr(arr, val)),
  });

  if (step === 4) return (
    <div style={{ ...s.wrap, alignItems: "center", justifyContent: "center", flexDirection: "column", textAlign: "center", padding: "2rem" }}>
      <div style={{ width: 72, height: 72, borderRadius: "50%", background: "rgba(244,123,37,.12)", color: "#F47B25", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
        <CheckCircle2 size={36} />
      </div>
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 12 }} data-testid="text-lead-success">Заявка отправлена!</h1>
      <p style={{ color: "#6B6B6B", fontSize: 16, lineHeight: 1.7, maxWidth: 360 }}>
        Спасибо! Мы получили вашу анкету и свяжемся с вами в течение рабочего дня.
      </p>
      <Link href="/">
        <span style={{ ...s.btnB, display: "inline-block", marginTop: 24, cursor: "pointer" }} data-testid="link-home">← На главную</span>
      </Link>
    </div>
  );

  return (
    <div style={wrap}>
      {/* ── LEFT ── */}
      <div style={left}>
        <div>
          <div style={s.logo}>● Дома Юга</div>
          <h1 style={s.h1}>Оставить<br />заявку</h1>
          <div style={s.accent} />
          <p style={s.desc}>Расскажите о проекте — бесплатно рассчитаем стоимость и выедем на осмотр.</p>
          <div style={s.ben}>
            {BENEFITS.map(({ icon: Icon, text }) => (
              <div key={text} style={s.benRow}>
                <div style={s.benIcon}><Icon size={15} /></div>
                <div style={s.benTxt}>{text}</div>
              </div>
            ))}
          </div>
        </div>
        <div style={s.foot}>
          © 2025 Дома Юга<br />
          <a href="tel:+78001234567" style={{ color: "rgba(255,255,255,.5)", textDecoration: "none" }}>+7 (800) 123-45-67</a>
        </div>
      </div>

      {/* ── RIGHT ── */}
      <div style={right}>
        {/* Progress */}
        <div style={s.progress}>
          {["1Услуга", "2Проект", "3Контакты"].map((t, i) => (
            <div key={t} style={tabStyle(i + 1)}>
              <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 2 }}>{t[0]}</div>
              {t.slice(1)}
            </div>
          ))}
        </div>

        {/* Step 1 */}
        {step === 1 && (
          <div>
            <div style={s.sec}>Чем мы можем помочь?</div>
            <div style={s.sub}>Можно выбрать несколько вариантов</div>
            <div style={{ ...s.cards, ...grid1 }}>
              {SERVICES.map((svc) => {
                const Icon = svc.icon;
                const active = services.includes(svc.v);
                return (
                  <div key={svc.v}
                    data-testid={`card-service-${svc.v}`}
                    style={{ ...s.card, ...(active ? s.cardOn : {}) }}
                    onClick={() => setServices(toggleArr(services, svc.v))}>
                    <div style={{ ...s.svcIcon, ...(active ? s.svcIconOn : {}) }}><Icon size={18} /></div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 3,
                        color: active ? "#C2410C" : "#1A1A1A" }}>{svc.name}</div>
                      <div style={{ fontSize: 12, color: "#888", lineHeight: 1.4 }}>{svc.hint}</div>
                    </div>
                  </div>
                );
              })}
            </div>
            {errors.services && <p style={s.err}>{errors.services}</p>}
            <div style={s.btns}>
              <button style={s.btnN} onClick={() => go(2)} data-testid="button-step1-next">Далее →</button>
            </div>
          </div>
        )}

        {/* Step 2 */}
        {step === 2 && (
          <div>
            <div style={s.sec}>Расскажите о проекте</div>
            <div style={s.sub}>Чем подробнее — тем точнее расчёт</div>

            <div style={{ ...s.row, ...grid1 }}>
              <div><label style={s.label}>Тип объекта</label>
                <select style={s.input} value={objType} onChange={(e) => setObjType(e.target.value)} data-testid="select-object-type">
                  <option value="">Выберите...</option>
                  {["Частный дом", "Дача / коттедж", "Квартира", "Коммерческое здание", "Другое"].map((o) => <option key={o}>{o}</option>)}
                </select>
              </div>
              <div><label style={s.label}>Площадь, м²</label>
                <input style={s.input} type="number" placeholder="Например, 120" value={area} onChange={(e) => setArea(e.target.value)} data-testid="input-area" />
              </div>
            </div>

            <div style={{ ...s.row, ...grid1 }}>
              <div><label style={s.label}>Бюджет</label>
                <select style={s.input} value={budget} onChange={(e) => setBudget(e.target.value)} data-testid="select-budget">
                  <option value="">Не определился</option>
                  {["До 1 млн ₽", "1–3 млн ₽", "3–5 млн ₽", "5–10 млн ₽", "Свыше 10 млн ₽"].map((o) => <option key={o}>{o}</option>)}
                </select>
              </div>
              <div><label style={s.label}>Сроки начала</label>
                <select style={s.input} value={timeline} onChange={(e) => setTimeline(e.target.value)} data-testid="select-timeline">
                  <option value="">Не важно</option>
                  {["Сейчас", "До 3 месяцев", "До года", "Планирую"].map((o) => <option key={o}>{o}</option>)}
                </select>
              </div>
            </div>

            <div style={{ marginBottom: 14 }}><label style={s.label}>Город / регион</label>
              <input style={s.input} placeholder="Например, Краснодар" value={city} onChange={(e) => setCity(e.target.value)} data-testid="input-city" />
            </div>

            <div><label style={s.label}>Описание проекта</label>
              <textarea style={{ ...s.input, minHeight: 88, resize: "vertical", lineHeight: 1.6 }}
                placeholder="Что хотите построить или отремонтировать, пожелания, особенности участка..."
                value={desc} onChange={(e) => setDesc(e.target.value)} data-testid="input-description" />
            </div>

            <div style={s.btns}>
              <button style={s.btnB} onClick={() => setStep(1)} data-testid="button-step2-back">← Назад</button>
              <button style={s.btnN} onClick={() => go(3)} data-testid="button-step2-next">Далее →</button>
            </div>
          </div>
        )}

        {/* Step 3 */}
        {step === 3 && (
          <div>
            <div style={s.sec}>Контактные данные</div>
            <div style={s.sub}>Как с вами связаться?</div>

            <div style={{ ...s.row, ...grid1 }}>
              <div>
                <label style={s.label}>Имя <span style={s.req}>*</span></label>
                <input style={inp(errors.name)} placeholder="Ваше имя" value={name} onChange={(e) => { setName(e.target.value); setErrors((p) => ({ ...p, name: "" })); }} data-testid="input-name" />
                {errors.name && <p style={s.err}>{errors.name}</p>}
              </div>
              <div>
                <label style={s.label}>Телефон <span style={s.req}>*</span></label>
                <input style={inp(errors.phone)} type="tel" placeholder="+7 (___) ___-__-__" value={phone} onChange={(e) => { setPhone(e.target.value); setErrors((p) => ({ ...p, phone: "" })); }} data-testid="input-phone" />
                {errors.phone && <p style={s.err}>{errors.phone}</p>}
              </div>
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={s.label}>Email</label>
              <input style={s.input} type="email" placeholder="mail@example.com" value={email} onChange={(e) => setEmail(e.target.value)} data-testid="input-email" />
            </div>

            <div>
              <label style={s.label}>Способ связи</label>
              <div style={s.pills}>
                {CONTACT_METHODS.map((m) => <button key={m} {...pills(methods, m, setMethods)} data-testid={`pill-method-${m}`}>{m}</button>)}
              </div>
            </div>

            <div>
              <label style={s.label}>Удобное время для звонка</label>
              <div style={s.pills}>
                {CALL_TIMES.map((t) => <button key={t} {...pills(times, t, setTimes)} data-testid={`pill-time-${t}`}>{t}</button>)}
              </div>
            </div>

            <div style={{ marginBottom: 4 }}>
              <label style={s.label}>Откуда узнали о нас?</label>
              <select style={s.input} value={source} onChange={(e) => setSource(e.target.value)} data-testid="select-source">
                <option value="">Не указывать</option>
                {["Поиск Яндекс / Google", "Авито / ЦИАН", "ВКонтакте / Instagram", "Рекомендация", "Видел объект / баннер", "Другое"].map((o) => <option key={o}>{o}</option>)}
              </select>
            </div>

            <p style={s.note}>
              Нажимая «Отправить», вы соглашаетесь с обработкой персональных данных.
              Свяжемся в течение рабочего дня.
            </p>

            <div style={s.btns}>
              <button style={s.btnB} onClick={() => setStep(2)} data-testid="button-step3-back">← Назад</button>
              <button style={{ ...s.btnN, opacity: loading ? .7 : 1 }} onClick={submit} disabled={loading} data-testid="button-submit-lead">
                {loading ? "Отправка..." : "Отправить заявку"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
