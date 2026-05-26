import { Card, CardContent } from "@/components/ui/card";
import {
  Gem,
  Users,
  Palette,
  HeartHandshake,
  Shield,
} from "lucide-react";

const advantages = [
  { title: "Качественные материалы", icon: Gem, description: "Используем только проверенные и сертифицированные материалы от надёжных поставщиков" },
  { title: "Опытные специалисты", icon: Users, description: "Команда профессионалов с многолетним опытом в строительстве" },
  { title: "Индивидуальный подход", icon: Palette, description: "Каждый проект разрабатывается с учётом пожеланий и потребностей клиента" },
  { title: "Комплексный сервис", icon: HeartHandshake, description: "Полный спектр услуг — от проектирования до благоустройства территории" },
  { title: "Доверие и гарантии", icon: Shield, description: "Прозрачные условия сотрудничества и гарантия на все виды работ" },
];

export default function Advantages() {
  return (
    <div className="p-4 md:p-6 space-y-8">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight" data-testid="text-advantages-title">
          Почему выбирают нас
        </h1>
        <p className="text-muted-foreground" data-testid="text-advantages-subtitle">
          Почему клиенты выбирают «Дома Юга»
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {advantages.map((adv, index) => (
          <Card key={adv.title} className="h-full" data-testid={`card-advantage-${index}`}>
            <CardContent className="p-6 space-y-3">
              <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-primary/10 text-primary">
                <adv.icon className="w-6 h-6" />
              </div>
              <p className="font-semibold" data-testid={`text-advantage-title-${index}`}>{adv.title}</p>
              <p className="text-sm text-muted-foreground leading-relaxed">{adv.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
