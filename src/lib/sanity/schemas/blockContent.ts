import { defineType, defineArrayMember } from 'sanity';

/**
 * This is the schema definition for the rich text fields used for
 * this blog studio. When you import it in schemas.js it can be
 * reused in other parts of the studio with:
 *  {
 *    name: 'someName',
 *    title: 'Some title',
 *    type: 'blockContent'
 *  }
 */
export default defineType({
	title: 'Block Content',
	name: 'blockContent',
	type: 'array',
	of: [
		defineArrayMember({
			title: 'Block',
			type: 'block',
			// Styles let you set what your user can mark up blocks with. These
			// correspond with HTML tags, but you can set any title or value
			// you want and decide how you want to deal with it where you want to
			// use your content.
			styles: [
				{ title: 'Normal', value: 'normal' },
				{ title: 'H1', value: 'h1' },
				{ title: 'H2', value: 'h2' },
				{ title: 'H3', value: 'h3' },
				{ title: 'H4', value: 'h4' },
				{ title: 'H5', value: 'h5' },
				{ title: 'H6', value: 'h6' },
				{ title: 'Quote', value: 'blockquote' }
			],
			lists: [
				{ title: 'Bullet', value: 'bullet' },
				{ title: 'Numbered', value: 'number' }
			],
			// Marks let you mark up inline text in the block editor.
			marks: {
				// Decorators usually describe a single property – e.g. a typographic
				// preference or highlighting by editors.
				decorators: [
					{ title: 'Strong', value: 'strong' },
					{ title: 'Emphasis', value: 'em' },
					{ title: 'Code', value: 'code' },
					{ title: 'Underline', value: 'underline' },
					{ title: 'Strike', value: 'strike-through' }
				],
				// Annotations can be any object structure – e.g. a link or a footnote.
				annotations: [
					{
						title: 'URL',
						name: 'link',
						type: 'object',
						fields: [
							{
								title: 'URL',
								name: 'href',
								type: 'url'
							}
						]
					}
				]
			}
		}),
		// Now add image support to the block content
		defineArrayMember({
			type: 'image',
			options: { hotspot: true },
			fields: [
				{
					name: 'alt',
					type: 'string',
					title: 'Alternative Text',
					description: 'Important for SEO and accessibility.',
					validation: (Rule) => Rule.required()
				},
				{
					name: 'caption',
					type: 'string',
					title: 'Caption',
					description: 'Optional caption to display below the image.'
				},
				{
					name: 'size',
					type: 'string',
					title: 'Image Size',
					description: 'Choose how large the image should appear.',
					options: {
						list: [
							{ title: 'Small', value: 'small' },
							{ title: 'Medium', value: 'medium' },
							{ title: 'Large', value: 'large' },
							{ title: 'Full Width', value: 'full' },
							{ title: 'Custom', value: 'custom' }
						],
						layout: 'radio'
					},
					initialValue: 'large'
				},
				{
					name: 'customWidth',
					type: 'number',
					title: 'Custom Width (px)',
					description: 'Custom width in pixels (only used when size is "Custom").',
					hidden: ({ parent }: { parent: any }) => parent?.size !== 'custom',
					validation: (Rule) => Rule.min(100).max(1200)
				},
				{
					name: 'alignment',
					type: 'string',
					title: 'Image Alignment',
					description: 'Choose how to align the image.',
					options: {
						list: [
							{ title: 'Left', value: 'start' },
							{ title: 'Center', value: 'center' },
							{ title: 'Right', value: 'end' }
						],
						layout: 'radio'
					},
					initialValue: 'center'
				}
			]
		})
	]
});
