import { getExecuteFunctions } from 'n8n-core';
import {
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	IDataObject,
	NodeConnectionType,
	IExecuteFunctions,
} from 'n8n-workflow';
import { getLinkPreview } from 'link-preview-js';
import createDOMPurify from 'dompurify';
import { JSDOM } from 'jsdom';

// URL validation regex
const URL_REGEX = /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*\/?$/;

// Initialize DOMPurify
const window = new JSDOM('').window;
const DOMPurify = createDOMPurify(window);

// Define the preview response type
interface LinkPreviewResponse {
	url: string;
	title?: string;
	description?: string;
	mediaType: string;
	contentType: string;
	favicons: string[];
	images?: string[];
	videos?: string[];
	charset?: string | null;
}

// Define link preview options type
interface LinkPreviewOptions {
	timeout?: number;
	followRedirects?: 'follow' | 'error' | 'manual';
}

// Normalize URL by adding protocol if missing and handling special characters
function normalizeURL(url: string): string {
	try {
		// Add https:// if no protocol is specified
		if (!url.startsWith('http://') && !url.startsWith('https://')) {
			url = 'https://' + url;
		}
		
		// Create URL object to normalize the URL
		const urlObj = new URL(url);
		
		// Remove trailing slash if present
		if (urlObj.pathname === '/' && urlObj.search === '' && urlObj.hash === '') {
			urlObj.pathname = '';
		}
		
		return urlObj.toString();
	} catch (error) {
		throw new Error('Invalid URL format');
	}
}

// Sanitize HTML content while preserving safe tags
function sanitizeHTML(str: string | null | undefined): string {
	if (!str) return '';
	
	// Configure DOMPurify to allow specific HTML tags and attributes
	const config = {
		ALLOWED_TAGS: [
			'a', 'b', 'blockquote', 'code', 'em', 'i', 'li', 'ol', 'strong', 'ul',
			'p', 'br', 'div', 'span', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'
		],
		ALLOWED_ATTR: [
			'href', 'target', 'rel', 'class', 'id', 'title', 'alt'
		],
		ALLOW_DATA_ATTR: false,
		ALLOW_ARIA_ATTR: true,
		ALLOW_UNKNOWN_PROTOCOLS: false,
		FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed'],
		FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'onmouseout', 'onkeydown', 'onkeyup', 'onkeypress'],
	};

	return DOMPurify.sanitize(str, config);
}

// Sanitize array of HTML strings
function sanitizeHTMLArray(arr: string[] | null | undefined): string[] {
	if (!arr || !Array.isArray(arr)) return [];
	return arr.map(str => sanitizeHTML(str));
}

export class LinkPreview implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Link Preview',
		name: 'linkPreview',
		icon: 'file:icons/link.svg',
		group: ['transform'],
		version: 1,
		description: 'Get preview information from a URL',
		defaults: {
			name: 'Link Preview',
		},
		inputs: [NodeConnectionType.Main],
		outputs: [NodeConnectionType.Main],
		properties: [
			{
				displayName: 'URL',
				name: 'url',
				type: 'string',
				default: '',
				required: true,
				description: 'The URL to get preview information from',
				noDataExpression: true,
			},
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				options: [
					{
						displayName: 'Timeout (seconds)',
						name: 'timeout',
						type: 'number',
						default: 10,
						description: 'Maximum time to wait for the preview in seconds',
					},
					{
						displayName: 'Follow Redirects',
						name: 'followRedirects',
						type: 'boolean',
						default: true,
						description: 'Whether to follow redirects when fetching the preview',
					},
				],
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		for (let i = 0; i < items.length; i++) {
			const url = this.getNodeParameter('url', i) as string;
			const options = this.getNodeParameter('options', i) as {
				timeout?: number;
				followRedirects?: boolean;
			};

			try {
				// Normalize and validate URL
				const normalizedUrl = normalizeURL(url);
				
				// Configure link preview options
				const previewOptions: LinkPreviewOptions = {
					timeout: (options.timeout || 10) * 1000, // Convert to milliseconds
					followRedirects: options.followRedirects !== false ? 'follow' : 'error',
				};

				const preview = await getLinkPreview(normalizedUrl, previewOptions) as LinkPreviewResponse;
				const sanitizedPreview: IDataObject = {
					url: preview.url,
					title: sanitizeHTML(preview.title),
					description: sanitizeHTML(preview.description),
					mediaType: preview.mediaType,
					contentType: preview.contentType,
					favicons: sanitizeHTMLArray(preview.favicons),
					images: sanitizeHTMLArray(preview.images),
					videos: sanitizeHTMLArray(preview.videos),
				};

				returnData.push({
					json: sanitizedPreview,
				});
			} catch (error: any) {
				if (this.continueOnFail()) {
					returnData.push({
						json: {
							error: error.message || 'Unknown error occurred',
							url,
						},
					});
					continue;
				}
				throw error;
			}
		}

		return [returnData];
	}
} 