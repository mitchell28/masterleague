import { defineType, defineArrayMember } from 'sanity';

/**
 * Thi		defineArrayMember({
			type: 'image',
			options: { 
				hotspot: true,
				aiAssist: {
					imageDescriptionField: 'alt'
				}
			}, schema definition for the rich text fields used for
 * for this blog studio. When you import it in schemas.js it can be
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
		// Images
		defineArrayMember({
			type: 'image',
			options: {
				hotspot: true,
				aiAssist: {
					imageDescriptionField: 'alt'
				}
			},
			fields: [
				{
					name: 'alt',
					type: 'string',
					title: 'Alternative Text',
					description: 'Important for SEO and screen readers.'
				},
				{
					name: 'caption',
					type: 'string',
					title: 'Caption'
				},
				{
					name: 'size',
					type: 'string',
					title: 'Image Size',
					options: {
						list: [
							{ title: 'Small (400px)', value: 'small' },
							{ title: 'Medium (600px)', value: 'medium' },
							{ title: 'Large (800px)', value: 'large' },
							{ title: 'Full Width (1200px)', value: 'full' }
						]
					},
					initialValue: 'large'
				},
				{
					name: 'centered',
					type: 'boolean',
					title: 'Center Image',
					description: 'Center the image horizontally',
					initialValue: true
				},
				{
					name: 'rounded',
					type: 'boolean',
					title: 'Rounded Corners',
					description: 'Apply rounded corners to the image',
					initialValue: true
				}
			]
		}),
		// Code blocks
		defineArrayMember({
			type: 'object',
			name: 'codeBlock',
			title: 'Code Block',
			fields: [
				{
					name: 'language',
					type: 'string',
					title: 'Language',
					options: {
						list: [
							{ title: 'JavaScript', value: 'javascript' },
							{ title: 'TypeScript', value: 'typescript' },
							{ title: 'HTML', value: 'html' },
							{ title: 'CSS', value: 'css' },
							{ title: 'JSON', value: 'json' },
							{ title: 'Bash', value: 'bash' },
							{ title: 'Python', value: 'python' },
							{ title: 'SQL', value: 'sql' }
						]
					},
					initialValue: 'javascript'
				},
				{
					name: 'filename',
					type: 'string',
					title: 'Filename (Optional)',
					description: 'Optional filename to display'
				},
				{
					name: 'code',
					type: 'text',
					title: 'Code',
					description: 'The code content'
				}
			],
			preview: {
				select: {
					language: 'language',
					filename: 'filename',
					code: 'code'
				},
				prepare({ language, filename, code }) {
					return {
						title: filename || `${language} code`,
						subtitle: code ? `${code.slice(0, 60)}...` : 'Empty code block'
					};
				}
			}
		}),
		// YouTube embeds
		defineArrayMember({
			type: 'object',
			name: 'youtube',
			title: 'YouTube Video',
			fields: [
				{
					name: 'url',
					type: 'url',
					title: 'YouTube Video URL'
				},
				{
					name: 'title',
					type: 'string',
					title: 'Video Title'
				}
			]
		}),
		// Callout/Alert boxes
		defineArrayMember({
			type: 'object',
			name: 'callout',
			title: 'Callout Box',
			fields: [
				{
					name: 'type',
					type: 'string',
					title: 'Type',
					options: {
						list: [
							{ title: 'Info', value: 'info' },
							{ title: 'Warning', value: 'warning' },
							{ title: 'Success', value: 'success' },
							{ title: 'Error', value: 'error' }
						]
					}
				},
				{
					name: 'title',
					type: 'string',
					title: 'Title'
				},
				{
					name: 'content',
					type: 'text',
					title: 'Content'
				}
			]
		}),
		// Table
		defineArrayMember({
			type: 'object',
			name: 'table',
			title: 'Table',
			fields: [
				{
					name: 'caption',
					type: 'string',
					title: 'Table Caption (Optional)'
				},
				{
					name: 'rows',
					type: 'array',
					title: 'Table Rows',
					of: [
						{
							type: 'object',
							name: 'tableRow',
							title: 'Table Row',
							fields: [
								{
									name: 'cells',
									type: 'array',
									title: 'Cells',
									of: [
										{
											type: 'string'
										}
									]
								}
							]
						}
					]
				}
			],
			preview: {
				select: {
					caption: 'caption',
					rows: 'rows'
				},
				prepare({ caption, rows }) {
					const rowCount = rows?.length || 0;
					return {
						title: caption || 'Table',
						subtitle: `${rowCount} rows`
					};
				}
			}
		})
	]
});
