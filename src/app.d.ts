// See https://kit.svelte.dev/docs/types#app
// for information about these interfaces
import type { Session, User } from '$lib/server/db/auth/auth';
import type { LoaderLocals } from '@sanity/svelte-loader';

declare global {
	namespace App {
		interface Locals extends LoaderLocals {
			session: Session | undefined;
			user: User | undefined;
		}
		// interface Error {}
		// interface PageData {}
		// interface Platform {}
	}
}

export {};
