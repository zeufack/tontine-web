import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import {
	fetchNotificationPreferences,
	type NotificationPreferences,
	notificationPreferencesSchema,
	updateNotificationPreferences,
} from "#/lib/backend-client/notification-preferences";
import { readSessionCookie } from "#/lib/session-cookie";

export type { NotificationPreferences };

const updatePreferencesSchema = notificationPreferencesSchema.partial();

const fetchPreferencesFromBackend = createServerFn({ method: "GET" }).handler(
	async () => {
		const session = readSessionCookie();
		if (!session) throw new Error("Not authenticated");
		return fetchNotificationPreferences(session.accessToken, session.user.id);
	},
);

export async function getNotificationPreferences(): Promise<NotificationPreferences> {
	return fetchPreferencesFromBackend();
}

const updatePreferencesOnBackend = createServerFn({ method: "POST" })
	.validator(updatePreferencesSchema)
	.handler(async ({ data }) => {
		const session = readSessionCookie();
		if (!session) throw new Error("Not authenticated");
		return updateNotificationPreferences(
			session.accessToken,
			session.user.id,
			data,
		);
	});

export async function updateNotificationPreferencesForCurrentUser(
	patch: Partial<NotificationPreferences>,
): Promise<NotificationPreferences> {
	return updatePreferencesOnBackend({ data: patch });
}

export const notificationPreferencesQueries = {
	mine: () =>
		queryOptions({
			queryKey: ["user", "notification-preferences"] as const,
			queryFn: getNotificationPreferences,
		}),
};
