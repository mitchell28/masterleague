import { visionTool } from '@sanity/vision';
import { defineConfig } from 'sanity';
import { structureTool } from 'sanity/structure';
import { presentationTool } from 'sanity/presentation';
import {
	PUBLIC_SANITY_STUDIO_PROJECT_ID,
	PUBLIC_SANITY_STUDIO_DATASET,
	PUBLIC_SANITY_STUDIO_PREVIEW_URL
} from '$env/static/public';

import { schemaTypes } from './schemas';

const projectId = PUBLIC_SANITY_STUDIO_PROJECT_ID!;
const dataset = PUBLIC_SANITY_STUDIO_DATASET!;

export default defineConfig({
	name: 'sanity-template-sveltekit-clean',
	title: 'Clean SvelteKit + Sanity app',
	projectId,
	dataset,
	plugins: [
		structureTool(),
		presentationTool({
			previewUrl: {
				origin: PUBLIC_SANITY_STUDIO_PREVIEW_URL || 'http://localhost:5173',
				previewMode: {
					enable: '/preview/enable',
					disable: '/preview/disable'
				}
			}
		}),
		visionTool()
	],
	schema: {
		types: schemaTypes
	}
});
