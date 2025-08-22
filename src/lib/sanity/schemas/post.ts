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
			group: 'post',
			validation: (Rule) => Rule.required(),
			initialValue: () => new Date().toISOString()
		}),
		defineField({
			name: 'title',
			title: 'Title',
			type: 'string',
			group: 'post'
		}),
		defineField({
			name: 'slug',
			title: 'Slug',
			type: 'slug',
			group: 'post',
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
			rows: 4,
			group: 'post'
		}),
		defineField({
			name: 'category',
			title: 'Category',
			type: 'string',
			group: 'post',
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
			group: 'post',
			description: 'Display the "Join Master League" call-to-action section at the end of the post',
			initialValue: true
		}),
		defineField({
			name: 'mainImage',
			title: 'Main image',
			type: 'image',
			group: 'post',
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
			type: 'blockContent',
			group: 'post'
		}),
		// SEO Fields (moved to separate group)
		defineField({
			name: 'metaTitle',
			title: 'Meta Title',
			type: 'string',
			group: 'seo',
			description:
				'Title for search engines and social media. If empty, the post title will be used.',
			validation: (Rule) =>
				Rule.max(60).warning('Meta titles should be under 60 characters for optimal SEO')
		}),
		defineField({
			name: 'metaDescription',
			title: 'Meta Description',
			type: 'text',
			rows: 3,
			group: 'seo',
			description:
				'Description for search engines and social media. If empty, the excerpt will be used.',
			validation: (Rule) =>
				Rule.max(160).warning('Meta descriptions should be under 160 characters for optimal SEO')
		}),
		defineField({
			name: 'openGraphTitle',
			title: 'Open Graph Title',
			type: 'string',
			group: 'seo',
			description:
				'Title for social media shares. If empty, meta title or post title will be used.',
			validation: (Rule) => Rule.max(60)
		}),
		defineField({
			name: 'openGraphDescription',
			title: 'Open Graph Description',
			type: 'text',
			rows: 3,
			group: 'seo',
			description:
				'Description for social media shares. If empty, meta description or excerpt will be used.',
			validation: (Rule) => Rule.max(160)
		}),
		defineField({
			name: 'openGraphImage',
			title: 'Open Graph Image',
			type: 'image',
			group: 'seo',
			description: 'Image for social media shares. If empty, the main image will be used.',
			options: {
				hotspot: true
			},
			fields: [
				defineField({
					name: 'alt',
					title: 'Alt text',
					type: 'string'
				})
			]
		}),
		defineField({
			name: 'twitterTitle',
			title: 'Twitter Title',
			type: 'string',
			group: 'seo',
			description: 'Title for Twitter shares. If empty, Open Graph title will be used.',
			validation: (Rule) => Rule.max(60)
		}),
		defineField({
			name: 'twitterDescription',
			title: 'Twitter Description',
			type: 'text',
			rows: 3,
			group: 'seo',
			description: 'Description for Twitter shares. If empty, Open Graph description will be used.',
			validation: (Rule) => Rule.max(160)
		}),
		defineField({
			name: 'keywords',
			title: 'Keywords',
			type: 'array',
			of: [{ type: 'string' }],
			group: 'seo',
			description: 'Keywords for SEO (optional)',
			options: {
				layout: 'tags'
			}
		}),
		defineField({
			name: 'noIndex',
			title: 'No Index',
			type: 'boolean',
			group: 'seo',
			description: 'Prevent search engines from indexing this post',
			initialValue: false
		})
	],
	groups: [
		{
			name: 'post',
			title: 'Post',
			default: true
		},
		{
			name: 'seo',
			title: 'SEO'
		}
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
