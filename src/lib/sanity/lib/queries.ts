import type { PortableTextBlock } from '@portabletext/types';
import type { ImageAsset, Slug } from '@sanity/types';
import groq from 'groq';

export const postQuery = groq`*[_type == "post" && slug.current == $slug][0]{
  _id,
  _type,
  _createdAt,
  title,
  slug,
  excerpt,
  publishedAt,
  category,
  showCTA,
  mainImage,
  body
}`;

export const postsQuery = groq`*[_type == "post" && defined(slug.current)] | order(coalesce(publishedAt, _createdAt) desc) {
  _id,
  _type,
  _createdAt,
  title,
  slug,
  excerpt,
  publishedAt,
  category,
  mainImage
}`;

export interface Post {
	_type: 'post';
	_id: string;
	_createdAt: string;
	title?: string;
	slug: Slug;
	excerpt?: string;
	publishedAt?: string;
	category?: string;
	showCTA?: boolean;
	mainImage?: ImageAsset;
	body: PortableTextBlock[];
}
