import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
  Shield,
  Users,
  Gem,
  HeartHandshake,
  MessageCircle,
  LayoutDashboard,
} from "lucide-react";
import { SiWhatsapp, SiYoutube } from "react-icons/si";

const services = [
  { name: "Строительство домов и коттеджей", icon: Home, description: "Полный цикл строительства от фундамента до кровли" },
  { name: "Реконструкция", icon: Hammer, description: "Восстановление и модернизация существующих зданий" },
  { name: "Фасадные работы", icon: PaintBucket, description: "Отделка и утепление фасадов любой сложности" },
  { name: "Внутренняя отделка", icon: Paintbrush, description: "Штукатурка, покраска, плитка, обои и многое другое" },
  { name: "Бетонные работы", icon: HardHat, description: "Фундаменты, стяжки, монолитные конструкции" },
  { name: "Ландшафтные работы", icon: TreePine, description: "Благоустройство территории и озеленение" },
  { name: "Установка бассейнов", icon: Droplets, description: "Монтаж и обслуживание бассейнов" },
  { name: "Лестницы и перила", icon: ArrowUpDown, description: "Изготовление и установка лестниц любых типов" },
  { name: "Дизайн интерьера и экстерьера", icon: Palette, description: "Разработка индивидуальных дизайн-проектов" },
];

const advantages = [
  { title: "Качественные материалы", icon: Gem, description: "Используем только проверенные и сертифицированные материалы от надёжных поставщиков" },
  { title: "Опытные специалисты", icon: Users, description: "Команда профессионалов с многолетним опытом в строительстве" },
  { title: "Индивидуальный подход", icon: Palette, description: "Каждый проект разрабатывается с учётом пожеланий и потребностей клиента" },
  { title: "Комплексный сервис", icon: HeartHandshake, description: "Полный спектр услуг — от проектирования до благоустройства территории" },
  { title: "Доверие и гарантии", icon: Shield, description: "Прозрачные условия сотрудничества и гарантия на все виды работ" },
];

export default function About() {
  return (
    <div className="p-4 md:p-6 space-y-8">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight" data-testid="text-about-title">
          О компании
        </h1>
        <p className="text-muted-foreground" data-testid="text-about-subtitle">
          Строительная компания «Дома Юга»
        </p>
      </div>

      <Card data-testid="card-about-main">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Building2 className="h-5 w-5 text-muted-foreground" />
            О нас
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="leading-relaxed" data-testid="text-about-description">
            Строительная компания «Дома Юга» специализируется на создании комфортных домов и коттеджей
            в Южном регионе России. Мы воплощаем в жизнь вашу мечту о идеальном жилье и уютном участке.
          </p>
          <p className="leading-relaxed" data-testid="text-about-services">
            Наша компания предлагает полный спектр услуг — от разработки дизайн-проекта до строительства
            под ключ, включая внутреннюю и наружную отделку, ландшафтные работы и установку бассейнов.
          </p>
          <p className="leading-relaxed" data-testid="text-about-quality">
            Мы ценим доверие наших клиентов и гарантируем высокое качество на каждом этапе работ.
            Индивидуальный подход, опытные специалисты и проверенные материалы — основа нашей работы.
          </p>
        </CardContent>
      </Card>

      <div className="space-y-3">
        <h2 className="text-lg font-semibold" data-testid="text-advantages-heading">Наши преимущества</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {advantages.map((adv, index) => (
            <Card key={adv.title} data-testid={`card-advantage-${index}`}>
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center justify-center w-10 h-10 rounded-md bg-primary/10 text-foreground">
                  <adv.icon className="w-5 h-5" />
                </div>
                <p className="font-medium text-sm" data-testid={`text-advantage-title-${index}`}>{adv.title}</p>
                <p className="text-xs text-muted-foreground leading-relaxed">{adv.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <h2 className="text-lg font-semibold" data-testid="text-services-heading">Услуги</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {services.map((service, index) => (
            <Card key={service.name} data-testid={`card-service-${index}`}>
              <CardContent className="p-4 flex items-start gap-3">
                <div className="flex items-center justify-center w-9 h-9 rounded-md bg-primary/10 text-foreground shrink-0 mt-0.5">
                  <service.icon className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium" data-testid={`text-service-name-${index}`}>{service.name}</p>
                  <p className="text-xs text-muted-foreground">{service.description}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <Card data-testid="card-contacts">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-muted-foreground" />
            Контакты
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex items-start gap-3" data-testid="contact-address">
              <MapPin className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium">Адрес</p>
                <p className="text-sm text-muted-foreground" data-testid="text-contact-address">
                  Краснодарский край, Юг России
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3" data-testid="contact-phone">
              <Phone className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium">Телефон</p>
                <a
                  href="tel:+79186692265"
                  className="text-sm underline"
                  data-testid="link-phone"
                >
                  +7 (918) 669-22-65
                </a>
              </div>
            </div>

            <div className="flex items-start gap-3" data-testid="contact-email">
              <Mail className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium">Email</p>
                <a
                  href="mailto:karachev.e@mail.ru"
                  className="text-sm underline"
                  data-testid="link-email"
                >
                  karachev.e@mail.ru
                </a>
              </div>
            </div>

            <div className="flex items-start gap-3" data-testid="contact-whatsapp">
              <SiWhatsapp className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium">WhatsApp</p>
                <a
                  href="https://wa.me/79186692265"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm underline"
                  data-testid="link-whatsapp"
                >
                  +7 (918) 669-22-65
                </a>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2 border-t">
            <a
              href="https://wa.me/79186692265"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center w-9 h-9 rounded-md bg-muted text-muted-foreground transition-colors"
              data-testid="link-social-whatsapp"
            >
              <SiWhatsapp className="w-5 h-5" />
            </a>
            <a
              href="https://youtube.com"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center w-9 h-9 rounded-md bg-muted text-muted-foreground transition-colors"
              data-testid="link-social-youtube"
            >
              <SiYoutube className="w-5 h-5" />
            </a>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-primary/5 border-primary/20" data-testid="card-cabinet-cta">
        <CardContent className="p-6 flex flex-col sm:flex-row items-center gap-4">
          <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 shrink-0">
            <LayoutDashboard className="w-6 h-6 text-primary" />
          </div>
          <div className="flex-1 text-center sm:text-left space-y-1">
            <p className="font-semibold" data-testid="text-cabinet-cta-title">Личный кабинет клиента</p>
            <p className="text-sm text-muted-foreground">
              Отслеживайте ход строительства, сметы, оплаты и общайтесь с компанией в одном месте
            </p>
          </div>
          <Button asChild data-testid="button-cabinet-demo">
            <Link href="/cabinet">
              Смотреть демо
            </Link>
          </Button>
        </CardContent>
      </Card>

      <div className="text-center text-xs text-muted-foreground py-4" data-testid="text-copyright">
        <p>© Строительная компания «Дома Юга»</p>
      </div>
    </div>
  );
}
