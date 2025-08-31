import { visionTool } from '@sanity/vision';
import { defineConfig } from 'sanity';
import { structureTool } from 'sanity/structure';
import { presentationTool } from 'sanity/presentation';
import {
	PUBLIC_SANITY_STUDIO_PROJECT_ID,
	PUBLIC_SANITY_STUDIO_DATASET,
	PUBLIC_SANITY_STUDIO_PREVIEW_URL,
	PUBLIC_SANITY_STUDIO_URL
} from '$env/static/public';

import { schemaTypes } from './schemas';
import { assist } from '@sanity/assist';

const projectId = PUBLIC_SANITY_STUDIO_PROJECT_ID!;
const dataset = PUBLIC_SANITY_STUDIO_DATASET!;

export default defineConfig({
	name: 'masterleague',
	title: 'Masterleague',
	projectId,
	dataset,
	// Set the base path for the studio
	basePath: '/studio',
	plugins: [
		assist(),
		structureTool(),
		presentationTool({
			previewUrl: {
				origin: PUBLIC_SANITY_STUDIO_URL || PUBLIC_SANITY_STUDIO_PREVIEW_URL,
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
