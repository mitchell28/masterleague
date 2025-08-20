import { client } from '$lib/sanity/lib/client';
import { token } from './api';

export const serverClient = client.withConfig({
	token,
	useCdn: false,
	stega: true
});
