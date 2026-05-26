import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import {
  Smartphone,
  BadgePercent,
  Gem,
  Users,
  Shield,
  HeartHandshake,
  LayoutDashboard,
  CheckCircle2,
  MapPin,
  Truck,
  Warehouse,
  HardHat,
} from "lucide-react";

const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  show: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, delay: i * 0.1, ease: "easeOut" },
  }),
};

const secondary = [
  { icon: Gem,          title: "Проверенные материалы",    desc: "Только сертифицированные материалы от надёжных поставщиков" },
  { icon: Users,        title: "Опытная команда",           desc: "Профессионалы с многолетним опытом в строительстве" },
  { icon: Shield,       title: "Гарантия 5 лет",            desc: "Письменная гарантия на все выполненные работы" },
  { icon: HeartHandshake, title: "Под ключ",                desc: "Полный цикл — от проекта до благоустройства" },
  { icon: Truck,        title: "Своя техника",              desc: "Собственный парк строительной техники — без аренды и простоев" },
{ icon: HardHat,      title: "Постоянная бригада",        desc: "Штатные строители, а не временные субподрядчики — стабильное качество" },
];

const reportFeatures = [
  "Список выполненных работ за день",
  "Фотографии с объекта",
  "Потраченные материалы и суммы",
  "Комментарии прораба",
  "Отклонения от графика — сразу видны",
];

export default function Advantages() {
  return (
    <div className="min-h-full">

      {/* ── Hero ─────────────────────────────────────────── */}
      <div className="relative overflow-hidden bg-gradient-to-br from-primary/8 via-background to-background border-b px-5 py-14 md:px-10 md:py-20">
        <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-primary/6 blur-3xl pointer-events-none" />
        <motion.div
          className="relative max-w-xl space-y-5"
          initial="hidden"
          animate="show"
          variants={fadeUp}
          custom={0}
        >
          <p className="text-sm font-medium text-primary uppercase tracking-widest">
            Дома Юга · Строительство
          </p>
          <h1 className="text-3xl md:text-4xl font-bold leading-tight tracking-tight" data-testid="text-advantages-title">
            Строим, пока вы<br />
            <span className="text-primary">живёте своей жизнью</span>
          </h1>
          <p className="text-muted-foreground text-base md:text-lg leading-relaxed" data-testid="text-advantages-subtitle">
            Минимальный аванс и ежедневная прозрачность — вы контролируете
            стройку из любой точки мира, без тревоги и лишних звонков.
          </p>
        </motion.div>
      </div>

      <div className="px-5 py-10 md:px-10 space-y-14">

        {/* ── Два главных преимущества ─────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

          {/* Аванс 10% */}
          <motion.div
            className="relative overflow-hidden rounded-2xl border bg-card p-7 space-y-5 hover:shadow-lg transition-shadow"
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            variants={fadeUp}
            custom={0}
            data-testid="card-main-advance"
          >
            <div className="absolute -bottom-6 -right-4 text-[10rem] font-black leading-none text-primary/6 select-none pointer-events-none">
              10%
            </div>
            <div className="flex items-center justify-center w-13 h-13 w-12 h-12 rounded-xl bg-primary/10 text-primary">
              <BadgePercent className="w-6 h-6" />
            </div>
            <div className="space-y-2">
              <p className="text-xl font-bold">Аванс всего 10%</p>
              <p className="text-muted-foreground leading-relaxed text-sm">
                Чтобы начать стройку, достаточно 10% от стоимости проекта.
                Остальное платите поэтапно — по мере выполнения работ.
                Никаких «заплатите всё сразу».
              </p>
            </div>
            <ul className="space-y-2">
              {[
                "Фиксированная смета — без сюрпризов",
                "Оплата только за сделанное",
                "Договор на каждый этап",
              ].map((t) => (
                <li key={t} className="flex items-start gap-2 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  {t}
                </li>
              ))}
            </ul>
          </motion.div>

          {/* Ежедневный отчёт */}
          <motion.div
            className="relative overflow-hidden rounded-2xl border bg-card p-7 space-y-5 hover:shadow-lg transition-shadow"
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            variants={fadeUp}
            custom={1}
            data-testid="card-main-report"
          >
            <div className="absolute -bottom-8 -right-4 opacity-5 pointer-events-none">
              <Smartphone className="w-48 h-48" />
            </div>
            <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 text-primary">
              <Smartphone className="w-6 h-6" />
            </div>
            <div className="space-y-2">
              <p className="text-xl font-bold">Отчёт каждый день</p>
              <p className="text-muted-foreground leading-relaxed text-sm">
                Вы находитесь в другом городе или стране — не важно.
                Каждый вечер в личном кабинете появляется подробный
                отчёт о том, что сделано за день.
              </p>
            </div>
            <ul className="space-y-2">
              {reportFeatures.map((t) => (
                <li key={t} className="flex items-start gap-2 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  {t}
                </li>
              ))}
            </ul>
          </motion.div>
        </div>

        {/* ── Для удалённых заказчиков ─────────────────────── */}
        <motion.div
          className="rounded-2xl border border-primary/20 bg-primary/5 px-7 py-8 flex flex-col sm:flex-row items-start sm:items-center gap-5"
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          variants={fadeUp}
          custom={0}
          data-testid="card-remote"
        >
          <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-primary/15 text-primary shrink-0">
            <MapPin className="w-6 h-6" />
          </div>
          <div className="flex-1 space-y-1">
            <p className="font-semibold text-base">Живёте далеко от объекта?</p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Многие наши клиенты наблюдают за стройкой из Москвы, Питера и других городов.
              Личный кабинет заменяет ежедневные поездки — вся информация у вас в телефоне.
            </p>
          </div>
          <Button asChild variant="outline" className="shrink-0" data-testid="button-cabinet-demo">
            <Link href="/cabinet/project/1">Смотреть демо</Link>
          </Button>
        </motion.div>

        {/* ── Остальные преимущества ───────────────────────── */}
        <div className="space-y-4">
          <motion.h2
            className="text-lg font-semibold text-muted-foreground"
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            variants={fadeUp}
            custom={0}
          >
            Также о нас
          </motion.h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {secondary.map((adv, i) => (
              <motion.div
                key={adv.title}
                className="rounded-xl border bg-card p-5 space-y-3 hover:shadow-sm transition-shadow"
                initial="hidden"
                whileInView="show"
                viewport={{ once: true }}
                variants={fadeUp}
                custom={i * 0.08}
                data-testid={`card-secondary-${i}`}
              >
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-muted text-muted-foreground">
                  <adv.icon className="w-5 h-5" />
                </div>
                <p className="font-semibold text-sm">{adv.title}</p>
                <p className="text-xs text-muted-foreground leading-relaxed">{adv.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>

        {/* ── CTA ──────────────────────────────────────────── */}
        <motion.div
          className="rounded-2xl border bg-card p-7 flex flex-col sm:flex-row items-center gap-5"
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          variants={fadeUp}
          custom={0}
          data-testid="card-cta"
        >
          <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 shrink-0">
            <LayoutDashboard className="w-6 h-6 text-primary" />
          </div>
          <div className="flex-1 text-center sm:text-left space-y-1">
            <p className="font-semibold text-base">Личный кабинет клиента</p>
            <p className="text-sm text-muted-foreground">
              Сметы, платежи, фото с объекта и чат с прорабом — всё в одном месте
            </p>
          </div>
          <Button asChild data-testid="button-cta-demo">
            <Link href="/cabinet/project/1">Открыть демо</Link>
          </Button>
        </motion.div>

        <p className="text-center text-xs text-muted-foreground pb-4">
          © Строительная компания «Дома Юга»
        </p>
      </div>
    </div>
  );
}
