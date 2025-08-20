import { createClient } from '@sanity/client';
import { apiVersion, projectId, dataset, studioUrl } from './api';

export const client = createClient({
	projectId,
	dataset,
	apiVersion,
	useCdn: true,
	stega: {
		studioUrl
	}
});
