import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import {
  Building2,
  Phone,
  Mail,
  MapPin,
  Droplets,
  ArrowUpDown,
  PaintBucket,
  HardHat,
  Paintbrush,
  TreePine,
  Palette,
  Hammer,
  Home,
  LayoutDashboard,
  CheckCircle2,
} from "lucide-react";
import { SiWhatsapp, SiYoutube } from "react-icons/si";

const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  show: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, delay: i * 0.1, ease: "easeOut" },
  }),
};

const services = [
  { icon: Home,        name: "Строительство домов",       desc: "Полный цикл от фундамента до кровли" },
  { icon: Hammer,      name: "Реконструкция",              desc: "Восстановление и модернизация зданий" },
  { icon: PaintBucket, name: "Фасадные работы",            desc: "Отделка и утепление любой сложности" },
  { icon: Paintbrush,  name: "Внутренняя отделка",         desc: "Штукатурка, покраска, плитка, обои" },
  { icon: HardHat,     name: "Бетонные работы",            desc: "Фундаменты, стяжки, монолит" },
  { icon: TreePine,    name: "Ландшафтные работы",         desc: "Благоустройство и озеленение" },
  { icon: Droplets,    name: "Установка бассейнов",        desc: "Монтаж и обслуживание бассейнов" },
  { icon: ArrowUpDown, name: "Лестницы и перила",          desc: "Изготовление и установка любых типов" },
  { icon: Palette,     name: "Дизайн интерьера",           desc: "Индивидуальные дизайн-проекты" },
];

const contacts = [
  {
    icon: MapPin,
    label: "Адрес",
    value: "Краснодарский край, Юг России",
    href: undefined,
    testId: "contact-address",
    valueTestId: "text-contact-address",
  },
  {
    icon: Phone,
    label: "Телефон",
    value: "+7 (918) 669-22-65",
    href: "tel:+79186692265",
    testId: "contact-phone",
    valueTestId: "link-phone",
  },
  {
    icon: Mail,
    label: "Email",
    value: "karachev.e@mail.ru",
    href: "mailto:karachev.e@mail.ru",
    testId: "contact-email",
    valueTestId: "link-email",
  },
  {
    icon: SiWhatsapp,
    label: "WhatsApp",
    value: "+7 (918) 669-22-65",
    href: "https://wa.me/79186692265",
    testId: "contact-whatsapp",
    valueTestId: "link-whatsapp",
    external: true,
  },
];

const highlights = [
  "Полный цикл — от проекта до сдачи",
  "Ежедневная отчётность для заказчика",
  "Аванс всего 10% для начала работ",
];

export default function About() {
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
            Дома Юга · О компании
          </p>
          <h1
            className="text-3xl md:text-4xl font-bold leading-tight tracking-tight"
            data-testid="text-about-title"
          >
            Строим дома,<br />
            <span className="text-primary">которые живут долго</span>
          </h1>
          <p
            className="text-muted-foreground text-base md:text-lg leading-relaxed"
            data-testid="text-about-subtitle"
          >
            Строительная компания «Дома Юга» — полный цикл строительства
            в Краснодарском крае. От идеи до готового дома под ключ.
          </p>
          <ul className="space-y-2">
            {highlights.map((t) => (
              <li key={t} className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                {t}
              </li>
            ))}
          </ul>
        </motion.div>
      </div>

      <div className="px-5 py-10 md:px-10 space-y-14">

        {/* ── О компании ───────────────────────────────────── */}
        <motion.div
          className="rounded-2xl border bg-card p-7 space-y-4 hover:shadow-lg transition-shadow"
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          variants={fadeUp}
          custom={0}
          data-testid="card-about-main"
        >
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10 text-primary shrink-0">
              <Building2 className="w-5 h-5" />
            </div>
            <p className="font-semibold text-lg">О нас</p>
          </div>
          <p className="leading-relaxed text-muted-foreground" data-testid="text-about-description">
            Строительная компания «Дома Юга» специализируется на создании комфортных домов
            и коттеджей в Южном регионе России. Мы воплощаем в жизнь вашу мечту
            об идеальном жилье и уютном участке.
          </p>
          <p className="leading-relaxed text-muted-foreground" data-testid="text-about-services">
            Наша компания предлагает полный спектр услуг — от разработки дизайн-проекта
            до строительства под ключ, включая внутреннюю и наружную отделку,
            ландшафтные работы и установку бассейнов.
          </p>
          <p className="leading-relaxed text-muted-foreground" data-testid="text-about-quality">
            Мы ценим доверие наших клиентов и гарантируем высокое качество на каждом
            этапе работ. Индивидуальный подход, опытные специалисты и проверенные
            материалы — основа нашей работы.
          </p>
        </motion.div>

        {/* ── Услуги ──────────────────────────────────────── */}
        <div className="space-y-4">
          <motion.h2
            className="text-lg font-semibold text-muted-foreground"
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            variants={fadeUp}
            custom={0}
            data-testid="text-services-heading"
          >
            Наши услуги
          </motion.h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {services.map((s, i) => (
              <motion.div
                key={s.name}
                className="rounded-xl border bg-card p-5 space-y-3 hover:shadow-sm transition-shadow"
                initial="hidden"
                whileInView="show"
                viewport={{ once: true }}
                variants={fadeUp}
                custom={i * 0.08}
                data-testid={`card-service-${i}`}
              >
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-muted text-muted-foreground">
                  <s.icon className="w-5 h-5" />
                </div>
                <p className="font-semibold text-sm" data-testid={`text-service-name-${i}`}>{s.name}</p>
                <p className="text-xs text-muted-foreground leading-relaxed">{s.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>

        {/* ── Контакты ────────────────────────────────────── */}
        <motion.div
          className="rounded-2xl border bg-card p-7 space-y-6 hover:shadow-lg transition-shadow"
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          variants={fadeUp}
          custom={0}
          data-testid="card-contacts"
        >
          <p className="font-semibold text-lg">Контакты</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {contacts.map((c) => (
              <div
                key={c.label}
                className="flex items-start gap-3"
                data-testid={c.testId}
              >
                <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-muted text-muted-foreground shrink-0 mt-0.5">
                  <c.icon className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-sm font-medium">{c.label}</p>
                  {c.href ? (
                    <a
                      href={c.href}
                      className="text-sm text-primary underline-offset-4 hover:underline"
                      {...(c.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                      data-testid={c.valueTestId}
                    >
                      {c.value}
                    </a>
                  ) : (
                    <p className="text-sm text-muted-foreground" data-testid={c.valueTestId}>
                      {c.value}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Соцсети */}
          <div className="flex items-center gap-3 pt-2 border-t">
            <a
              href="https://wa.me/79186692265"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center w-9 h-9 rounded-lg bg-muted text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
              data-testid="link-social-whatsapp"
            >
              <SiWhatsapp className="w-4 h-4" />
            </a>
            <a
              href="https://youtube.com"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center w-9 h-9 rounded-lg bg-muted text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
              data-testid="link-social-youtube"
            >
              <SiYoutube className="w-4 h-4" />
            </a>
          </div>
        </motion.div>

        {/* ── CTA ──────────────────────────────────────────── */}
        <motion.div
          className="rounded-2xl border border-primary/20 bg-primary/5 px-7 py-8 flex flex-col sm:flex-row items-center gap-5"
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          variants={fadeUp}
          custom={0}
          data-testid="card-cabinet-cta"
        >
          <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-primary/15 text-primary shrink-0">
            <LayoutDashboard className="w-6 h-6" />
          </div>
          <div className="flex-1 text-center sm:text-left space-y-1">
            <p className="font-semibold text-base" data-testid="text-cabinet-cta-title">
              Личный кабинет клиента
            </p>
            <p className="text-sm text-muted-foreground">
              Отслеживайте ход стройки, сметы, оплаты и общайтесь
              с компанией — всё в одном месте
            </p>
          </div>
          <Button asChild data-testid="button-cabinet-demo">
            <Link href="/cabinet/project/1">Смотреть демо</Link>
          </Button>
        </motion.div>

        <p className="text-center text-xs text-muted-foreground pb-4" data-testid="text-copyright">
          © Строительная компания «Дома Юга»
        </p>

      </div>
    </div>
  );
}
