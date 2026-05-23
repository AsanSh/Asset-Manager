import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { ru } from "date-fns/locale";
import {
	AlertCircle,
	AlertTriangle,
	Bell,
	Check,
	CheckCircle,
	Info,
	X,
} from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";

interface Notification {
	id: number;
	type: string;
	title: string;
	body?: string;
	message?: string;
	icon?: string;
	color?: string;
	link?: string;
	isRead: boolean;
	createdAt: string;
}

const iconMap: Record<string, any> = {
	"alert-circle": AlertCircle,
	"check-circle": CheckCircle,
	"alert-triangle": AlertTriangle,
	info: Info,
};

const colorMap: Record<string, string> = {
	red: "text-rose-600",
	green: "text-emerald-600",
	yellow: "text-amber-600",
	blue: "text-blue-500",
};

export function NotificationBell() {
	const { toast } = useToast();
	const queryClient = useQueryClient();
	const [isOpen, setIsOpen] = useState(false);

	// Get unread count
	const { data: unreadData } = useQuery({
		queryKey: ["notifications-unread-count"],
		queryFn: () =>
			api
				.get<{ count: number }>("/notifications/unread-count")
				.then((r) => r.data),
		refetchInterval: 60000, // Refresh every 60s (было 30s)
		staleTime: 30000, // Считать данные свежими 30 секунд
	});

	// Get notifications
	const { data: notifications = [] } = useQuery<Notification[]>({
		queryKey: ["notifications"],
		queryFn: () =>
			api
				.get("/notifications", { params: { limit: "20" } })
				.then((r) => r.data),
		enabled: isOpen,
	});

	const notificationsArray = Array.isArray(notifications) ? notifications : [];
	const unreadCount = unreadData?.count || 0;

	// Mark as read mutation
	const markReadMutation = useMutation({
		mutationFn: (id: number) => api.patch(`/notifications/${id}/read`),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["notifications"] });
			queryClient.invalidateQueries({
				queryKey: ["notifications-unread-count"],
			});
		},
	});

	// Mark all as read
	const markAllReadMutation = useMutation({
		mutationFn: () => api.patch("/notifications/mark-all-read"),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["notifications"] });
			queryClient.invalidateQueries({
				queryKey: ["notifications-unread-count"],
			});
			toast({ title: "Все уведомления отмечены прочитанными" });
		},
	});

	// Delete notification
	const deleteMutation = useMutation({
		mutationFn: (id: number) => api.delete(`/notifications/${id}`),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["notifications"] });
			queryClient.invalidateQueries({
				queryKey: ["notifications-unread-count"],
			});
		},
	});

	const handleNotificationClick = (notification: Notification) => {
		if (!notification.isRead) {
			markReadMutation.mutate(notification.id);
		}
		if (notification.link) {
			setIsOpen(false);
		}
	};

	return (
		<DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
			<DropdownMenuTrigger asChild>
				<Button variant="ghost" size="icon" className="relative">
					<Bell className="h-5 w-5" />
					{unreadCount > 0 && (
						<Badge
							variant="destructive"
							className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
						>
							{unreadCount > 99 ? "99+" : unreadCount}
						</Badge>
					)}
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" className="w-[380px] p-0">
				<div className="flex items-center justify-between px-4 py-3 border-b">
					<h3 className="font-semibold">Уведомления</h3>
					{unreadCount > 0 && (
						<Button
							variant="ghost"
							size="sm"
							onClick={() => markAllReadMutation.mutate()}
							className="h-8 text-xs"
						>
							<Check className="h-3 w-3 mr-1" />
							Прочитать все
						</Button>
					)}
				</div>

				<ScrollArea className="h-[400px]">
					{notificationsArray.length === 0 ? (
						<div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
							<Bell className="h-12 w-12 mb-2 opacity-20" />
							<p className="text-sm">Нет уведомлений</p>
						</div>
					) : (
						<div className="divide-y">
							{notificationsArray.map((notification) => {
								const IconComponent =
									iconMap[notification.icon || "info"] || Info;
								const iconColor =
									colorMap[notification.color || "blue"] || "text-blue-500";
								const message = notification.message || notification.body || "";

								return (
									<div
										key={notification.id}
										className={`px-4 py-3 hover:bg-muted/50 transition-colors ${
											!notification.isRead ? "bg-blue-50/50" : ""
										}`}
									>
										<div className="flex gap-3">
											<div className={`flex-shrink-0 mt-1 ${iconColor}`}>
												<IconComponent className="h-5 w-5" />
											</div>

											<div className="flex-1 min-w-0">
												{notification.link ? (
													<Link href={notification.link}>
														<button
															onClick={() =>
																handleNotificationClick(notification)
															}
															className="text-left w-full"
														>
															<p className="font-medium text-sm">
																{notification.title}
															</p>
															{message && (
																<p className="text-xs text-muted-foreground mt-1 line-clamp-2">
																	{message}
																</p>
															)}
															<p className="text-xs text-muted-foreground mt-1">
																{formatDistanceToNow(
																	new Date(notification.createdAt),
																	{
																		addSuffix: true,
																		locale: ru,
																	},
																)}
															</p>
														</button>
													</Link>
												) : (
													<div>
														<p className="font-medium text-sm">
															{notification.title}
														</p>
														{message && (
															<p className="text-xs text-muted-foreground mt-1 line-clamp-2">
																{message}
															</p>
														)}
														<p className="text-xs text-muted-foreground mt-1">
															{formatDistanceToNow(
																new Date(notification.createdAt),
																{
																	addSuffix: true,
																	locale: ru,
																},
															)}
														</p>
													</div>
												)}
											</div>

											<div className="flex-shrink-0 flex items-start gap-1">
												{!notification.isRead && (
													<Button
														variant="ghost"
														size="icon"
														className="h-6 w-6"
														onClick={(e) => {
															e.stopPropagation();
															markReadMutation.mutate(notification.id);
														}}
													>
														<Check className="h-3 w-3" />
													</Button>
												)}
												<Button
													variant="ghost"
													size="icon"
													className="h-6 w-6 text-muted-foreground hover:text-destructive"
													onClick={(e) => {
														e.stopPropagation();
														deleteMutation.mutate(notification.id);
													}}
												>
													<X className="h-3 w-3" />
												</Button>
											</div>
										</div>
									</div>
								);
							})}
						</div>
					)}
				</ScrollArea>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
