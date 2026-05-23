import { AlertTriangle, Bell, Lock, Package, Settings } from "lucide-react";
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

export default function WarehouseSettings() {
	return (
		<div className="p-6 space-y-6">
			{/* Header */}
			<div>
				<h1 className="text-3xl font-bold text-gray-900">Настройки склада</h1>
				<p className="text-gray-500 mt-1">
					Управление параметрами работы склада
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
							<Label>Название склада</Label>
							<Input
								placeholder="Центральный склад"
								defaultValue="Центральный склад"
							/>
						</div>

						<div className="space-y-2">
							<Label>Адрес</Label>
							<Input placeholder="г. Бишкек, ул. Промышленная 15" />
						</div>

						<div className="space-y-2">
							<Label>Ответственный</Label>
							<Select defaultValue="petrov">
								<SelectTrigger>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="petrov">Петров Алексей</SelectItem>
									<SelectItem value="sidorova">Сидорова Мария</SelectItem>
								</SelectContent>
							</Select>
						</div>

						<div className="space-y-2">
							<Label>Телефон склада</Label>
							<Input placeholder="+996 555 123 456" />
						</div>
					</div>
				</CardContent>
			</Card>

			{/* Inventory Settings */}
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<Package className="w-5 h-5" />
						Управление запасами
					</CardTitle>
				</CardHeader>
				<CardContent className="space-y-6">
					<div className="flex items-center justify-between">
						<div>
							<div className="font-medium text-gray-900">
								Автоматическое резервирование
							</div>
							<div className="text-sm text-gray-500">
								Резервировать товары при создании заявки
							</div>
						</div>
						<Switch defaultChecked />
					</div>

					<div className="flex items-center justify-between">
						<div>
							<div className="font-medium text-gray-900">Списание по FIFO</div>
							<div className="text-sm text-gray-500">
								Первым пришёл - первым вышел
							</div>
						</div>
						<Switch defaultChecked />
					</div>

					<div className="flex items-center justify-between">
						<div>
							<div className="font-medium text-gray-900">
								Требовать подтверждение получения
							</div>
							<div className="text-sm text-gray-500">
								Обязательная подпись при выдаче
							</div>
						</div>
						<Switch />
					</div>

					<div className="space-y-2">
						<Label>Единицы измерения по умолчанию</Label>
						<Select defaultValue="kg">
							<SelectTrigger>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="kg">Килограммы (кг)</SelectItem>
								<SelectItem value="m">Метры (м)</SelectItem>
								<SelectItem value="m2">Квадратные метры (м²)</SelectItem>
								<SelectItem value="m3">Кубические метры (м³)</SelectItem>
								<SelectItem value="pcs">Штуки (шт)</SelectItem>
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
								Уведомления о низких остатках
							</div>
							<div className="text-sm text-gray-500">
								Оповещение когда запасы ниже минимума
							</div>
						</div>
						<Switch defaultChecked />
					</div>

					<div className="flex items-center justify-between">
						<div>
							<div className="font-medium text-gray-900">
								Уведомления о новых заказах
							</div>
							<div className="text-sm text-gray-500">
								Оповещать о поступивших заказах
							</div>
						</div>
						<Switch defaultChecked />
					</div>

					<div className="flex items-center justify-between">
						<div>
							<div className="font-medium text-gray-900">
								Уведомления о просрочке
							</div>
							<div className="text-sm text-gray-500">
								Товары с истекающим сроком годности
							</div>
						</div>
						<Switch />
					</div>

					<div className="space-y-2">
						<Label>Email для уведомлений</Label>
						<Input type="email" placeholder="warehouse@company.kg" />
					</div>
				</CardContent>
			</Card>

			{/* Low Stock Thresholds */}
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<AlertTriangle className="w-5 h-5" />
						Пороги минимальных остатков
					</CardTitle>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<div className="space-y-2">
							<Label>Цемент (% от максимума)</Label>
							<Input type="number" defaultValue="20" />
						</div>
						<div className="space-y-2">
							<Label>Арматура (% от максимума)</Label>
							<Input type="number" defaultValue="15" />
						</div>
						<div className="space-y-2">
							<Label>Кирпич (% от максимума)</Label>
							<Input type="number" defaultValue="25" />
						</div>
						<div className="space-y-2">
							<Label>Песок (% от максимума)</Label>
							<Input type="number" defaultValue="30" />
						</div>
					</div>
				</CardContent>
			</Card>

			{/* Security */}
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<Lock className="w-5 h-5" />
						Безопасность и доступ
					</CardTitle>
				</CardHeader>
				<CardContent className="space-y-6">
					<div className="flex items-center justify-between">
						<div>
							<div className="font-medium text-gray-900">
								Требовать двухфакторную аутентификацию
							</div>
							<div className="text-sm text-gray-500">
								Для критичных операций
							</div>
						</div>
						<Switch />
					</div>

					<div className="flex items-center justify-between">
						<div>
							<div className="font-medium text-gray-900">
								Логировать все операции
							</div>
							<div className="text-sm text-gray-500">
								Полная история изменений
							</div>
						</div>
						<Switch defaultChecked />
					</div>

					<div className="space-y-2">
						<Label>Срок хранения логов (дней)</Label>
						<Input type="number" defaultValue="90" />
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
