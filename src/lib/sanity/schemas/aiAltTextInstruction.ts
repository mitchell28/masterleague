import { defineField, defineType } from 'sanity';

export default defineType({
	name: 'aiAltTextInstruction',
	title: 'AI Alt Text Instruction',
	type: 'document',
	fields: [
		defineField({
			name: 'name',
			title: 'Instruction Name',
			type: 'string',
			validation: (Rule) => Rule.required(),
			initialValue: 'Generate Alt Text for Master League Images'
		}),
		defineField({
			name: 'description',
			title: 'Description',
			type: 'text',
			rows: 2,
			description: 'Brief description of this AI instruction',
			initialValue:
				'Generates accessible, SEO-friendly alt text for images in Master League blog posts'
		}),
		defineField({
			name: 'instructionText',
			title: 'AI Instruction',
			type: 'text',
			rows: 15,
			description: 'The instruction text that will be used by AI Assist',
			initialValue: `Generate a concise, descriptive alt text for this image that follows accessibility best practices:

REQUIREMENTS:
1. Describe what the image shows in clear, simple language
2. Keep it between 10-125 characters for optimal accessibility
3. Focus on essential visual elements and their purpose
4. Avoid redundant phrases like "image of" or "picture showing"
5. Be relevant to Master League gaming/esports content
6. Include context about gaming, competition, or community when appropriate

CONTEXT TO CONSIDER:
- Image prompt description: {{imagePrompt}}
- Post title: {{title}}  
- Post category: {{category}}
- Post excerpt: {{excerpt}}

STYLE GUIDELINES:
- Use active, descriptive language
- Prioritize the most important visual elements
- Consider the image's purpose in the blog post
- Make it useful for screen readers
- Ensure it adds value for SEO

EXAMPLES:
- Good: "Competitive gamers focused on screens during esports tournament"
- Bad: "Image of people playing games on computers"
- Good: "Master League trophy ceremony with winner celebrating"
- Bad: "Picture showing trophy and person"  

Write only the alt text, nothing else. No quotes, no explanations, just the descriptive text.`
		}),
		defineField({
			name: 'targetFields',
			title: 'Target Fields',
			type: 'array',
			of: [{ type: 'string' }],
			description: 'Field paths where this instruction should be available',
			initialValue: ['mainImage.alt', 'alt'],
			options: {
				list: [
					{ title: 'Main Image Alt Text', value: 'mainImage.alt' },
					{ title: 'Generic Alt Text', value: 'alt' },
					{ title: 'Article Image Alt', value: 'articleImage.alt' },
					{ title: 'Featured Image Alt', value: 'featuredImage.alt' }
				]
			}
		}),
		defineField({
			name: 'isActive',
			title: 'Active',
			type: 'boolean',
			description: 'Enable this instruction for use in AI Assist',
			initialValue: true
		})
	],
	preview: {
		select: {
			title: 'name',
			subtitle: 'description',
			isActive: 'isActive'
		},
		prepare({ title, subtitle, isActive }) {
			return {
				title: title || 'Untitled Alt Text Instruction',
				subtitle: isActive ? subtitle : `${subtitle} (Inactive)`,
				media: isActive ? '🏷️' : '⚫'
			};
		}
	}
});
