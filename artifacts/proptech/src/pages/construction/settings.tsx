import { Bell, DollarSign, FileText, HardHat, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

export default function ConstructionSettings() {
	return (
		<div className="p-6 space-y-6">
			{/* Header */}
			<div>
				<h1 className="text-3xl font-bold text-gray-900">
					Настройки строительства
				</h1>
				<p className="text-gray-500 mt-1">
					Параметры модуля контроля строительства
				</p>
			</div>

			{/* General Settings */}
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<Settings className="w-5 h-5" />
						Общие настройки
					</CardTitle>
				</CardHeader>
				<CardContent className="space-y-6">
					<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
						<div className="space-y-2">
							<Label>Валюта по умолчанию</Label>
							<Select defaultValue="kgs">
								<SelectTrigger>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="kgs">Сом (KGS)</SelectItem>
									<SelectItem value="usd">Доллар США (USD)</SelectItem>
									<SelectItem value="eur">Евро (EUR)</SelectItem>
									<SelectItem value="rub">Рубль (RUB)</SelectItem>
								</SelectContent>
							</Select>
						</div>

						<div className="space-y-2">
							<Label>Точность расчётов (знаков после запятой)</Label>
							<Select defaultValue="2">
								<SelectTrigger>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="0">0</SelectItem>
									<SelectItem value="2">2</SelectItem>
									<SelectItem value="4">4</SelectItem>
								</SelectContent>
							</Select>
						</div>

						<div className="space-y-2">
							<Label>Формат дат</Label>
							<Select defaultValue="dmy">
								<SelectTrigger>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="dmy">ДД.ММ.ГГГГ</SelectItem>
									<SelectItem value="mdy">ММ/ДД/ГГГГ</SelectItem>
									<SelectItem value="ymd">ГГГГ-ММ-ДД</SelectItem>
								</SelectContent>
							</Select>
						</div>

						<div className="space-y-2">
							<Label>Часовой пояс</Label>
							<Select defaultValue="asia_bishkek">
								<SelectTrigger>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="asia_bishkek">Бишкек (UTC+6)</SelectItem>
									<SelectItem value="asia_almaty">Алматы (UTC+6)</SelectItem>
									<SelectItem value="europe_moscow">Москва (UTC+3)</SelectItem>
								</SelectContent>
							</Select>
						</div>
					</div>
				</CardContent>
			</Card>

			{/* Project Management */}
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<HardHat className="w-5 h-5" />
						Управление проектами
					</CardTitle>
				</CardHeader>
				<CardContent className="space-y-6">
					<div className="flex items-center justify-between">
						<div>
							<div className="font-medium text-gray-900">
								Автоматическое создание этапов
							</div>
							<div className="text-sm text-gray-500">
								Создавать стандартные этапы при создании проекта
							</div>
						</div>
						<Switch defaultChecked />
					</div>

					<div className="flex items-center justify-between">
						<div>
							<div className="font-medium text-gray-900">
								Требовать утверждение бюджета
							</div>
							<div className="text-sm text-gray-500">
								Обязательное согласование перед началом
							</div>
						</div>
						<Switch defaultChecked />
					</div>

					<div className="flex items-center justify-between">
						<div>
							<div className="font-medium text-gray-900">Контроль сроков</div>
							<div className="text-sm text-gray-500">
								Уведомления о приближающихся дедлайнах
							</div>
						</div>
						<Switch defaultChecked />
					</div>

					<div className="space-y-2">
						<Label>Порог для предупреждения о перерасходе (%)</Label>
						<Input type="number" defaultValue="10" />
					</div>
				</CardContent>
			</Card>

			{/* Document Settings */}
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<FileText className="w-5 h-5" />
						Документооборот
					</CardTitle>
				</CardHeader>
				<CardContent className="space-y-6">
					<div className="flex items-center justify-between">
						<div>
							<div className="font-medium text-gray-900">
								Электронная подпись
							</div>
							<div className="text-sm text-gray-500">
								Использовать ЭЦП для договоров
							</div>
						</div>
						<Switch />
					</div>

					<div className="flex items-center justify-between">
						<div>
							<div className="font-medium text-gray-900">
								Архивирование документов
							</div>
							<div className="text-sm text-gray-500">
								Автоматически архивировать старые документы
							</div>
						</div>
						<Switch defaultChecked />
					</div>

					<div className="space-y-2">
						<Label>Срок хранения документов (лет)</Label>
						<Input type="number" defaultValue="5" />
					</div>

					<div className="space-y-2">
						<Label>Шаблон нумерации договоров</Label>
						<Input
							placeholder="КС-{YYYY}-{№№№}"
							defaultValue="КС-{YYYY}-{№№№}"
						/>
					</div>
				</CardContent>
			</Card>

			{/* Financial Settings */}
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<DollarSign className="w-5 h-5" />
						Финансовые настройки
					</CardTitle>
				</CardHeader>
				<CardContent className="space-y-6">
					<div className="flex items-center justify-between">
						<div>
							<div className="font-medium text-gray-900">Учёт НДС</div>
							<div className="text-sm text-gray-500">
								Включать НДС в расчёты
							</div>
						</div>
						<Switch defaultChecked />
					</div>

					<div className="space-y-2">
						<Label>Ставка НДС (%)</Label>
						<Input type="number" defaultValue="12" />
					</div>

					<div className="flex items-center justify-between">
						<div>
							<div className="font-medium text-gray-900">
								Многовалютный учёт
							</div>
							<div className="text-sm text-gray-500">
								Поддержка нескольких валют
							</div>
						</div>
						<Switch />
					</div>

					<div className="space-y-2">
						<Label>Источник курсов валют</Label>
						<Select defaultValue="nbkr">
							<SelectTrigger>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="nbkr">НБКР (Нацбанк КР)</SelectItem>
								<SelectItem value="cbr">ЦБ РФ</SelectItem>
								<SelectItem value="manual">Вручную</SelectItem>
							</SelectContent>
						</Select>
					</div>
				</CardContent>
			</Card>

			{/* Notifications */}
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<Bell className="w-5 h-5" />
						Уведомления
					</CardTitle>
				</CardHeader>
				<CardContent className="space-y-6">
					<div className="flex items-center justify-between">
						<div>
							<div className="font-medium text-gray-900">
								Уведомления о новых задачах
							</div>
							<div className="text-sm text-gray-500">
								Email при назначении задач
							</div>
						</div>
						<Switch defaultChecked />
					</div>

					<div className="flex items-center justify-between">
						<div>
							<div className="font-medium text-gray-900">
								Уведомления о перерасходе
							</div>
							<div className="text-sm text-gray-500">
								При превышении бюджета
							</div>
						</div>
						<Switch defaultChecked />
					</div>

					<div className="flex items-center justify-between">
						<div>
							<div className="font-medium text-gray-900">
								Еженедельные отчёты
							</div>
							<div className="text-sm text-gray-500">
								Сводка по всем проектам
							</div>
						</div>
						<Switch />
					</div>
				</CardContent>
			</Card>

			{/* Save Button */}
			<div className="flex justify-end gap-3">
				<Button variant="outline">Отменить</Button>
				<Button>Сохранить настройки</Button>
			</div>
		</div>
	);
}
