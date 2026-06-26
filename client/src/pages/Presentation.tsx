import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import {
  LayoutDashboard,
  FileSpreadsheet,
  HardHat,
  CreditCard,
  FileText,
  Camera,
  MessageCircle,
  Map,
  Leaf,
  CheckCircle2,
  BarChart3,
  Shield,
  Smartphone,
  Brain,
  Building2,
  ArrowRight,
  Star,
  Clock,
  Users,
  TrendingUp,
  Bell,
  Lock,
} from "lucide-react";

const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  show: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, delay: i * 0.1, ease: "easeOut" },
  }),
};

const fadeIn = {
  hidden: { opacity: 0, scale: 0.96 },
  show: (i: number = 0) => ({
    opacity: 1,
    scale: 1,
    transition: { duration: 0.5, delay: i * 0.08, ease: "easeOut" },
  }),
};

const features = [
  {
    icon: LayoutDashboard,
    title: "Дашборд проекта",
    desc: "Единый экран с ключевыми показателями: прогресс работ, оплата, документы и прогноз завершения.",
    color: "text-blue-500",
    bg: "bg-blue-500/10",
  },
  {
    icon: FileSpreadsheet,
    title: "Плановая смета",
    desc: "Полная детализация сметы с разбивкой по статьям. Заказчик всегда знает, на что идут деньги.",
    color: "text-emerald-500",
    bg: "bg-emerald-500/10",
  },
  {
    icon: HardHat,
    title: "Выполнение работ",
    desc: "Хронология всех этапов стройки с процентом готовности и актуальным статусом каждой позиции.",
    color: "text-amber-500",
    bg: "bg-amber-500/10",
  },
  {
    icon: CreditCard,
    title: "Оплата и финансы",
    desc: "История платежей, плановые суммы и баланс — прозрачность на каждом шаге.",
    color: "text-purple-500",
    bg: "bg-purple-500/10",
  },
  {
    icon: Camera,
    title: "Фотоотчёт",
    desc: "Ежедневные фото с объекта. Заказчик видит ход работ в реальном времени, не выезжая.",
    color: "text-rose-500",
    bg: "bg-rose-500/10",
  },
  {
    icon: FileText,
    title: "Документы",
    desc: "Все договоры, акты и разрешения хранятся в одном месте и доступны в один клик.",
    color: "text-sky-500",
    bg: "bg-sky-500/10",
  },
  {
    icon: Map,
    title: "Карта объекта",
    desc: "Интерактивная карта с кадастровой выпиской, схемой коммуникаций и экспортом в PDF.",
    color: "text-teal-500",
    bg: "bg-teal-500/10",
  },
  {
    icon: Leaf,
    title: "Ландшафтный дизайн",
    desc: "ИИ-концепция благоустройства участка: загрузка выписки ЕГРН, опрос пожеланий, готовый проект.",
    color: "text-green-500",
    bg: "bg-green-500/10",
  },
  {
    icon: MessageCircle,
    title: "Чат с командой",
    desc: "Прямое общение с прорабом и менеджером прямо в кабинете. Без телефонных тегов.",
    color: "text-indigo-500",
    bg: "bg-indigo-500/10",
  },
];

const aiFeatures = [
  {
    icon: TrendingUp,
    title: "Прогноз завершения",
    desc: "Анализ темпа работ и расчёт реалистичной даты сдачи с учётом рисков и сезонности.",
  },
  {
    icon: Brain,
    title: "ИИ-сводка прогресса",
    desc: "Краткое текстовое резюме по проекту: что сделано, что идёт по плану, на что обратить внимание.",
  },
  {
    icon: Leaf,
    title: "Ландшафтный концепт",
    desc: "На основе опроса заказчика и данных ЕГРН ИИ формирует концепцию благоустройства участка.",
  },
];

const benefits = [
  { icon: Shield, text: "Полная прозрачность: заказчик видит всё в режиме реального времени" },
  { icon: Clock, text: "Экономия времени: вся документация и история в одном месте" },
  { icon: Bell, text: "Уведомления о новых фото, документах и сообщениях" },
  { icon: Smartphone, text: "Адаптивный интерфейс — удобно с любого устройства" },
  { icon: Lock, text: "Безопасный вход, разграничение прав: администратор и клиент" },
  { icon: Users, text: "Поддержка нескольких объектов для одного клиента" },
];

const stats = [
  { value: "9", label: "разделов в кабинете", icon: LayoutDashboard },
  { value: "ИИ", label: "прогноз и дизайн", icon: Brain },
  { value: "PDF", label: "экспорт карты и отчётов", icon: FileText },
  { value: "24/7", label: "доступ с любого устройства", icon: Smartphone },
];

const stages = [
  { num: "01", title: "Подписание договора", desc: "Клиент получает доступ в личный кабинет и видит объект на карте" },
  { num: "02", title: "Запуск стройки", desc: "В систему заносятся смета и план работ. Начинается ежедневный фотоотчёт" },
  { num: "03", title: "Ход строительства", desc: "Заказчик наблюдает прогресс, общается с командой, оплачивает этапы" },
  { num: "04", title: "Ландшафт и финал", desc: "ИИ помогает с концепцией участка. Все документы подписываются в системе" },
];

export default function Presentation() {
  return (
    <div className="min-h-full">

      {/* ── Hero ─────────────────────────────────────────── */}
      <div className="relative overflow-hidden bg-gradient-to-br from-primary/8 via-background to-background border-b px-5 py-16 md:px-10 md:py-24">
        <div className="absolute -top-32 -right-32 w-[500px] h-[500px] rounded-full bg-primary/5 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 w-64 h-64 rounded-full bg-primary/4 blur-2xl pointer-events-none" />

        <div className="relative max-w-2xl space-y-6">
          <motion.div initial="hidden" animate="show" variants={fadeUp} custom={0}>
            <Badge variant="outline" className="border-primary/30 text-primary text-xs uppercase tracking-widest px-3 py-1">
              Дома Юга · Цифровой кабинет
            </Badge>
          </motion.div>

          <motion.h1
            className="text-3xl md:text-5xl font-bold leading-tight tracking-tight"
            initial="hidden"
            animate="show"
            variants={fadeUp}
            custom={1}
          >
            Личный кабинет клиента —<br />
            <span className="text-primary">стройка под контролем</span>
          </motion.h1>

          <motion.p
            className="text-muted-foreground text-base md:text-lg leading-relaxed max-w-lg"
            initial="hidden"
            animate="show"
            variants={fadeUp}
            custom={2}
          >
            Мы создали цифровую платформу, которая даёт заказчику полную прозрачность:
            сметы, оплата, фото, документы, карта объекта и ИИ-прогноз — всё в одном месте.
          </motion.p>

          <motion.ul
            className="space-y-2"
            initial="hidden"
            animate="show"
            variants={fadeUp}
            custom={3}
          >
            {["Ход работ в реальном времени", "ИИ-прогноз даты завершения", "Ландшафтный дизайн на основе ЕГРН"].map((t) => (
              <li key={t} className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                {t}
              </li>
            ))}
          </motion.ul>

          <motion.div
            className="flex flex-wrap gap-3 pt-2"
            initial="hidden"
            animate="show"
            variants={fadeUp}
            custom={4}
          >
            <Button asChild size="lg">
              <Link href="/cabinet/project/1">
                Открыть демо
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button variant="outline" size="lg" asChild>
              <Link href="/contact">Оставить заявку</Link>
            </Button>
          </motion.div>
        </div>
      </div>

      <div className="px-5 py-12 md:px-10 space-y-16">

        {/* ── Статистика ───────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {stats.map((s, i) => (
            <motion.div
              key={s.label}
              className="rounded-2xl border bg-card p-5 text-center space-y-2"
              initial="hidden"
              whileInView="show"
              viewport={{ once: true }}
              variants={fadeIn}
              custom={i}
            >
              <div className="flex justify-center">
                <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10 text-primary">
                  <s.icon className="w-5 h-5" />
                </div>
              </div>
              <p className="text-2xl font-bold text-primary">{s.value}</p>
              <p className="text-xs text-muted-foreground leading-tight">{s.label}</p>
            </motion.div>
          ))}
        </div>

        {/* ── Возможности кабинета ─────────────────────────── */}
        <div className="space-y-5">
          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            variants={fadeUp}
            custom={0}
          >
            <p className="text-sm font-medium text-primary uppercase tracking-widest mb-1">Функциональность</p>
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Всё для заказчика — в одном кабинете</h2>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                className="rounded-2xl border bg-card p-5 space-y-3 hover:shadow-md transition-shadow"
                initial="hidden"
                whileInView="show"
                viewport={{ once: true }}
                variants={fadeUp}
                custom={i * 0.07}
              >
                <div className={`flex items-center justify-center w-10 h-10 rounded-xl ${f.bg} ${f.color} shrink-0`}>
                  <f.icon className="w-5 h-5" />
                </div>
                <p className="font-semibold text-sm">{f.title}</p>
                <p className="text-xs text-muted-foreground leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>

        {/* ── Этапы работы ─────────────────────────────────── */}
        <div className="space-y-5">
          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            variants={fadeUp}
            custom={0}
          >
            <p className="text-sm font-medium text-primary uppercase tracking-widest mb-1">Как это работает</p>
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight">От договора до сдачи объекта</h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {stages.map((s, i) => (
              <motion.div
                key={s.num}
                className="rounded-2xl border bg-card p-6 flex gap-5"
                initial="hidden"
                whileInView="show"
                viewport={{ once: true }}
                variants={fadeUp}
                custom={i * 0.1}
              >
                <div className="text-3xl font-black text-primary/20 leading-none shrink-0 select-none">{s.num}</div>
                <div className="space-y-1">
                  <p className="font-semibold">{s.title}</p>
                  <p className="text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* ── ИИ-возможности ───────────────────────────────── */}
        <motion.div
          className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 to-background p-7 space-y-6"
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          variants={fadeUp}
          custom={0}
        >
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/15 text-primary shrink-0">
              <Brain className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-primary uppercase tracking-widest">Искусственный интеллект</p>
              <p className="font-semibold text-lg">ИИ помогает на каждом этапе</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {aiFeatures.map((f, i) => (
              <motion.div
                key={f.title}
                className="rounded-xl bg-background border p-4 space-y-2"
                initial="hidden"
                whileInView="show"
                viewport={{ once: true }}
                variants={fadeIn}
                custom={i}
              >
                <div className="flex items-center gap-2">
                  <f.icon className="w-4 h-4 text-primary" />
                  <p className="font-semibold text-sm">{f.title}</p>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* ── Преимущества ─────────────────────────────────── */}
        <div className="space-y-5">
          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            variants={fadeUp}
            custom={0}
          >
            <p className="text-sm font-medium text-primary uppercase tracking-widest mb-1">Почему это важно</p>
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Цифровое строительство — это доверие</h2>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {benefits.map((b, i) => (
              <motion.div
                key={b.text}
                className="flex items-start gap-3 rounded-xl border bg-card p-4"
                initial="hidden"
                whileInView="show"
                viewport={{ once: true }}
                variants={fadeUp}
                custom={i * 0.07}
              >
                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10 text-primary shrink-0 mt-0.5">
                  <b.icon className="w-4 h-4" />
                </div>
                <p className="text-sm leading-relaxed">{b.text}</p>
              </motion.div>
            ))}
          </div>
        </div>

        {/* ── Отзыв / цитата ───────────────────────────────── */}
        <motion.div
          className="rounded-2xl border bg-card p-7 md:p-10 text-center space-y-4"
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          variants={fadeUp}
          custom={0}
        >
          <div className="flex justify-center gap-1">
            {[...Array(5)].map((_, i) => (
              <Star key={i} className="w-5 h-5 fill-primary text-primary" />
            ))}
          </div>
          <p className="text-lg md:text-xl font-medium leading-relaxed max-w-2xl mx-auto text-muted-foreground italic">
            «Мы хотим, чтобы заказчик чувствовал себя <span className="text-foreground font-semibold not-italic">соучастником</span> строительства,
            а не ждал звонков с очередным отчётом. Каждое фото, каждый рубль и каждый документ — в его телефоне.»
          </p>
          <div className="flex items-center justify-center gap-2">
            <div className="flex items-center justify-center w-9 h-9 rounded-full bg-primary/10 text-primary">
              <Building2 className="w-4 h-4" />
            </div>
            <div className="text-left">
              <p className="text-sm font-semibold">Руководство компании</p>
              <p className="text-xs text-muted-foreground">Строительная компания «Дома Юга»</p>
            </div>
          </div>
        </motion.div>

        {/* ── Аналитика в дашборде ─────────────────────────── */}
        <div className="space-y-5">
          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            variants={fadeUp}
            custom={0}
          >
            <p className="text-sm font-medium text-primary uppercase tracking-widest mb-1">Аналитика</p>
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Данные, которые принимают решения</h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              {
                icon: BarChart3,
                title: "График плана vs факта",
                desc: "Столбчатый график помесячного выполнения работ — сразу видно, где отставание.",
                color: "text-blue-500", bg: "bg-blue-500/10",
              },
              {
                icon: TrendingUp,
                title: "Прогноз даты сдачи",
                desc: "Алгоритм считает среднюю скорость работ и пересчитывает реалистичный дедлайн каждый день.",
                color: "text-emerald-500", bg: "bg-emerald-500/10",
              },
              {
                icon: BarChart3,
                title: "Финансовый баланс",
                desc: "Оплачено / запланировано / остаток. Нет неожиданных счётов — только прогноз.",
                color: "text-amber-500", bg: "bg-amber-500/10",
              },
            ].map((item, i) => (
              <motion.div
                key={item.title}
                className="rounded-2xl border bg-card p-5 space-y-3"
                initial="hidden"
                whileInView="show"
                viewport={{ once: true }}
                variants={fadeIn}
                custom={i}
              >
                <div className={`flex items-center justify-center w-10 h-10 rounded-xl ${item.bg} ${item.color}`}>
                  <item.icon className="w-5 h-5" />
                </div>
                <p className="font-semibold text-sm">{item.title}</p>
                <p className="text-xs text-muted-foreground leading-relaxed">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>

        {/* ── CTA ──────────────────────────────────────────── */}
        <motion.div
          className="rounded-2xl border border-primary/25 bg-gradient-to-br from-primary/8 to-primary/3 px-7 py-10 flex flex-col md:flex-row items-center gap-6 text-center md:text-left"
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          variants={fadeUp}
          custom={0}
        >
          <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/15 text-primary shrink-0">
            <LayoutDashboard className="w-8 h-8" />
          </div>
          <div className="flex-1 space-y-2">
            <p className="font-bold text-xl">Убедитесь сами — откройте демо</p>
            <p className="text-sm text-muted-foreground max-w-md">
              Полностью функциональный демонстрационный кабинет с реальными данными.
              Никакой регистрации — просто смотрите.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <Button asChild size="lg">
              <Link href="/cabinet/project/1">
                Открыть демо
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button variant="outline" size="lg" asChild>
              <Link href="/contact">Заказать</Link>
            </Button>
          </div>
        </motion.div>

        <p className="text-center text-xs text-muted-foreground pb-4">
          © Строительная компания «Дома Юга» · Цифровой личный кабинет клиента
        </p>
      </div>
    </div>
  );
}
