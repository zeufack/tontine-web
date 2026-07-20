import { createFileRoute, redirect } from "@tanstack/react-router";
import { getPlatformStaffStatus } from "#/lib/get-platform-staff-status";

export const Route = createFileRoute("/_authenticated/_platformStaff")({
	beforeLoad: async () => {
		const status = await getPlatformStaffStatus();
		if (!status.isStaff) {
			throw redirect({ to: "/app/home", search: { unauthorized: true } });
		}
	},
});
