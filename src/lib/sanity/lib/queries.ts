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
  mainImage{
    asset->,
    alt,
    caption
  },
  body[]{
    ...,
    _type == "image" => {
      ...,
      asset->,
      alt,
      caption,
      size,
      customWidth,
      alignment
    }
  },
  metaTitle,
  metaDescription,
  openGraphTitle,
  openGraphDescription,
  openGraphImage{
    asset->
  },
  twitterTitle,
  twitterDescription,
  keywords,
  noIndex
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
  mainImage{
    asset->,
    alt,
    caption
  }
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
	// SEO fields (now individual fields instead of nested object)
	metaTitle?: string;
	metaDescription?: string;
	openGraphTitle?: string;
	openGraphDescription?: string;
	openGraphImage?: ImageAsset;
	twitterTitle?: string;
	twitterDescription?: string;
	keywords?: string[];
	noIndex?: boolean;
}
