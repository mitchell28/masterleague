import { defineField, defineType } from 'sanity';

export default defineType({
	name: 'post',
	title: 'Post',
	type: 'document',
	fields: [
		defineField({
			name: 'publishedAt',
			title: 'Published Date',
			type: 'datetime',
			validation: (Rule) => Rule.required(),
			initialValue: () => new Date().toISOString()
		}),
		defineField({
			name: 'title',
			title: 'Title',
			type: 'string'
		}),
		defineField({
			name: 'slug',
			title: 'Slug',
			type: 'slug',
			validation: (Rule) => Rule.required(),
			options: {
				source: 'title',
				maxLength: 96
			}
		}),
		defineField({
			name: 'excerpt',
			title: 'Excerpt',
			type: 'text',
			rows: 4
		}),
		defineField({
			name: 'category',
			title: 'Category',
			type: 'string',
			options: {
				list: [
					{ title: 'News', value: 'news' },
					{ title: 'Updates', value: 'updates' },
					{ title: 'Guides', value: 'guides' },
					{ title: 'Community', value: 'community' },
					{ title: 'General', value: 'general' }
				]
			},
			initialValue: 'general'
		}),
		defineField({
			name: 'showCTA',
			title: 'Show Call-to-Action',
			type: 'boolean',
			description: 'Display the "Join Master League" call-to-action section at the end of the post',
			initialValue: true
		}),
		defineField({
			name: 'mainImage',
			title: 'Main image',
			type: 'image',
			fields: [
				defineField({
					name: 'imagePrompt',
					title: 'Image prompt',
					type: 'text',
					rows: 3,
					description:
						'Describe the image you want to generate. Be specific about the scene, objects, colors, and style.',
					validation: (Rule) => Rule.max(500)
				}),
				defineField({
					name: 'alt',
					title: 'Alt text',
					type: 'string',
					description:
						'Alternative text for accessibility and SEO. Use AI Assist to generate based on image content and context.'
				})
			],
			options: {
				hotspot: true,
				aiAssist: {
					imageInstructionField: 'imagePrompt',
					imageDescriptionField: 'alt'
				}
			}
		}),
		defineField({
			name: 'body',
			title: 'Body',
			type: 'blockContent'
		})
	],
	preview: {
		select: {
			title: 'title',
			author: 'author.name',
			media: 'mainImage'
		},
		prepare(selection) {
			const { author } = selection;
			return { ...selection, subtitle: author && `by ${author}` };
		}
	}
});
