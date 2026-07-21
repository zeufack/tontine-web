import { z } from "zod";
import { apiFetch } from "./api-fetch";

export const notificationPreferencesSchema = z.object({
	email: z.boolean(),
	push: z.boolean(),
	inApp: z.boolean(),
	sms: z.boolean(),
	tontineUpdates: z.boolean(),
	contributionReminders: z.boolean(),
	beneficiaryNotifications: z.boolean(),
	participantJoined: z.boolean(),
	paymentReceived: z.boolean(),
	quietHoursStart: z.string().nullish(),
	quietHoursEnd: z.string().nullish(),
	timezone: z.string().nullish(),
});
export type NotificationPreferences = z.infer<
	typeof notificationPreferencesSchema
>;

export async function fetchNotificationPreferences(
	accessToken: string,
	userId: string,
): Promise<NotificationPreferences> {
	const raw = await apiFetch(
		`/notifications/preferences/user/${userId}`,
		accessToken,
	);
	return notificationPreferencesSchema.parse(raw);
}

export async function updateNotificationPreferences(
	accessToken: string,
	userId: string,
	patch: Partial<NotificationPreferences>,
): Promise<NotificationPreferences> {
	const raw = await apiFetch(
		`/notifications/preferences/user/${userId}`,
		accessToken,
		{ method: "PUT", body: JSON.stringify(patch) },
	);
	return notificationPreferencesSchema.parse(raw);
}
