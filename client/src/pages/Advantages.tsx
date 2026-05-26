import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import {
  Gem,
  Users,
  Palette,
  HeartHandshake,
  Shield,
  Award,
  Clock,
  TrendingUp,
  LayoutDashboard,
  CheckCircle2,
} from "lucide-react";

const stats = [
  { value: "10+", label: "лет на рынке" },
  { value: "200+", label: "объектов сдано" },
  { value: "5 лет", label: "гарантия на работы" },
  { value: "98%", label: "довольных клиентов" },
];

const advantages = [
  {
    icon: Gem,
    number: "01",
    title: "Качественные материалы",
    description: "Используем только проверенные и сертифицированные материалы от надёжных поставщиков. Никаких компромиссов с качеством.",
    color: "text-amber-500",
    bg: "bg-amber-500/10",
    border: "border-l-amber-500",
  },
  {
    icon: Users,
    number: "02",
    title: "Опытные специалисты",
    description: "Команда профессионалов с многолетним опытом в строительстве. Каждый мастер проходит строгий отбор и регулярное обучение.",
    color: "text-blue-500",
    bg: "bg-blue-500/10",
    border: "border-l-blue-500",
  },
  {
    icon: Palette,
    number: "03",
    title: "Индивидуальный подход",
    description: "Каждый проект разрабатывается с учётом пожеланий и потребностей клиента. Мы слушаем и воплощаем именно ваши идеи.",
    color: "text-purple-500",
    bg: "bg-purple-500/10",
    border: "border-l-purple-500",
  },
  {
    icon: HeartHandshake,
    number: "04",
    title: "Комплексный сервис",
    description: "Полный спектр услуг — от проектирования до благоустройства территории. Один подрядчик на весь цикл строительства.",
    color: "text-emerald-500",
    bg: "bg-emerald-500/10",
    border: "border-l-emerald-500",
  },
  {
    icon: Shield,
    number: "05",
    title: "Доверие и гарантии",
    description: "Прозрачные условия сотрудничества и гарантия на все виды работ. Договор, смета, отчётность — всё фиксируется документально.",
    color: "text-rose-500",
    bg: "bg-rose-500/10",
    border: "border-l-rose-500",
  },
];

const differentiators = [
  "Личный кабинет клиента с онлайн-отчётностью",
  "Фотоотчёт с объекта каждый рабочий день",
  "Фиксированная смета без скрытых доплат",
  "Соблюдение сроков по договору",
  "Уведомления о ходе работ в Telegram",
  "Гарантийное обслуживание после сдачи",
];

export default function Advantages() {
  return (
    <div className="min-h-full">

      {/* Hero */}
      <div className="relative overflow-hidden bg-gradient-to-br from-primary/5 via-background to-background border-b px-4 py-12 md:px-8 md:py-16">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent pointer-events-none" />
        <div className="relative max-w-2xl space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-medium text-primary">
            <Award className="w-3.5 h-3.5" />
            Строительная компания «Дома Юга»
          </div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight leading-tight" data-testid="text-advantages-title">
            Почему клиенты<br />
            <span className="text-primary">выбирают нас</span>
          </h1>
          <p className="text-muted-foreground text-base md:text-lg leading-relaxed" data-testid="text-advantages-subtitle">
            Строим честно, качественно и в срок. За 10 лет работы мы помогли более чем 200 семьям
            воплотить мечту о собственном доме.
          </p>
        </div>
      </div>

      <div className="p-4 md:p-8 space-y-12">

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="rounded-xl border bg-card p-5 text-center space-y-1 hover:shadow-sm transition-shadow"
              data-testid={`stat-${stat.label}`}
            >
              <p className="text-2xl md:text-3xl font-bold text-primary">{stat.value}</p>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Advantages */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Наши преимущества</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {advantages.map((adv) => (
              <div
                key={adv.number}
                className={`rounded-xl border-l-4 ${adv.border} border border-l-4 bg-card p-6 space-y-3 hover:shadow-md transition-shadow`}
                data-testid={`card-advantage-${adv.number}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className={`flex items-center justify-center w-11 h-11 rounded-xl ${adv.bg} ${adv.color} shrink-0`}>
                    <adv.icon className="w-5 h-5" />
                  </div>
                  <span className="text-3xl font-black text-muted-foreground/20 leading-none select-none">
                    {adv.number}
                  </span>
                </div>
                <div className="space-y-1.5">
                  <p className="font-semibold text-base" data-testid={`text-advantage-title-${adv.number}`}>
                    {adv.title}
                  </p>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {adv.description}
                  </p>
                </div>
              </div>
            ))}

            {/* Wide card — прозрачность */}
            <div className="rounded-xl border bg-primary/5 border-primary/20 p-6 space-y-4 md:col-span-2 hover:shadow-md transition-shadow"
              data-testid="card-advantage-transparency">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-primary/10 text-primary shrink-0">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-semibold text-base">Полная прозрачность процесса</p>
                  <p className="text-sm text-muted-foreground">Вы всегда знаете, что происходит на объекте</p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {differentiators.map((item) => (
                  <div key={item} className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                    <span className="text-sm">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* How we work */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Как мы работаем</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { step: "1", icon: Clock, title: "Консультация", desc: "Бесплатно обсуждаем ваш проект, составляем техзадание и смету" },
              { step: "2", icon: Palette, title: "Строительство", desc: "Ведём работы по графику с ежедневным фотоотчётом в личном кабинете" },
              { step: "3", icon: Shield, title: "Сдача и гарантия", desc: "Принимаете объект по акту и получаете 5-летнюю гарантию на все работы" },
            ].map((item) => (
              <div key={item.step} className="rounded-xl border bg-card p-5 space-y-3" data-testid={`card-step-${item.step}`}>
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-bold shrink-0">
                    {item.step}
                  </div>
                  <item.icon className="w-4 h-4 text-muted-foreground" />
                </div>
                <p className="font-semibold text-sm">{item.title}</p>
                <p className="text-xs text-muted-foreground leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="rounded-xl border bg-primary/5 border-primary/20 p-6 flex flex-col sm:flex-row items-center gap-5" data-testid="card-cta">
          <div className="flex items-center justify-center w-14 h-14 rounded-full bg-primary/10 shrink-0">
            <LayoutDashboard className="w-7 h-7 text-primary" />
          </div>
          <div className="flex-1 text-center sm:text-left space-y-1">
            <p className="font-semibold text-base">Личный кабинет клиента</p>
            <p className="text-sm text-muted-foreground">
              Отслеживайте ход строительства, сметы, оплаты и общайтесь с компанией в одном месте
            </p>
          </div>
          <Button asChild data-testid="button-cabinet-demo">
            <Link href="/cabinet/project/1">Смотреть демо</Link>
          </Button>
        </div>

        <div className="text-center text-xs text-muted-foreground pb-4">
          <p>© Строительная компания «Дома Юга»</p>
        </div>
      </div>
    </div>
  );
}
