import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import {
	convertToModelMessages,
	stepCountIs,
	streamText,
	tool,
	type UIMessage,
} from "ai";
import { Document, type DocumentData } from "flexsearch";
import { z } from "zod";
import { source } from "@/lib/source";

interface CustomDocument extends DocumentData {
	url: string;
	title: string;
	description: string;
	content: string;
}

export type ChatUIMessage = UIMessage<
	never,
	{
		client: {
			location: string;
		};
	}
>;

// ---------------------------------------------------------------------------
// Rate limiting — in-memory sliding window, 10 req / IP / minute
// ---------------------------------------------------------------------------
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 10;
const RATE_WINDOW_MS = 60_000;

function getClientIp(req: Request): string {
	const headers = req.headers as Headers;
	return (
		headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
		headers.get("x-real-ip") ??
		"unknown"
	);
}

function isRateLimited(ip: string): boolean {
	const now = Date.now();
	const entry = rateLimitStore.get(ip);
	if (!entry || entry.resetAt < now) {
		rateLimitStore.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
		return false;
	}
	if (entry.count >= RATE_LIMIT) return true;
	entry.count++;
	return false;
}

// ---------------------------------------------------------------------------
// FlexSearch index (built once at module load)
// ---------------------------------------------------------------------------
const searchServer = createSearchServer();

async function createSearchServer() {
	const search = new Document<CustomDocument>({
		document: {
			id: "url",
			index: ["title", "description", "content"],
			store: true,
		},
	});

	const docs = await chunkedAll(
		source.getPages().map(async (page) => {
			if (!("getText" in page.data)) return null;

			return {
				title: page.data.title,
				description: page.data.description,
				url: page.url,
				content: await page.data.getText("processed"),
			} as CustomDocument;
		}),
	);

	for (const doc of docs) {
		if (doc) search.add(doc);
	}

	return search;
}

async function chunkedAll<O>(promises: Promise<O>[]): Promise<O[]> {
	const SIZE = 50;
	const out: O[] = [];
	for (let i = 0; i < promises.length; i += SIZE) {
		out.push(...(await Promise.all(promises.slice(i, i + SIZE))));
	}
	return out;
}

// ---------------------------------------------------------------------------
// OpenRouter client
// ---------------------------------------------------------------------------
const openrouter = createOpenRouter({
	apiKey: process.env.OPENROUTER_API_KEY,
});

/** System prompt — update to add Kubeasy-specific context */
const systemPrompt = [
	"You are an AI assistant for a documentation site.",
	"Use the `search` tool to retrieve relevant docs context before answering when needed.",
	"The `search` tool returns raw JSON results from documentation. Use those results to ground your answer and cite sources as markdown links using the document `url` field when available.",
	"If you cannot find the answer in search results, say you do not know and suggest a better search query.",
].join("\n");

// ---------------------------------------------------------------------------
// Search tool
// ---------------------------------------------------------------------------
export type SearchTool = typeof searchTool;

const searchTool = tool({
	description: "Search the docs content and return raw JSON results.",
	inputSchema: z.object({
		query: z.string(),
		limit: z.number().int().min(1).max(20).default(10),
	}),
	async execute({ query, limit }) {
		const search = await searchServer;
		return await search.searchAsync(query, { limit, merge: true, enrich: true });
	},
});

// ---------------------------------------------------------------------------
// Request schema
// ---------------------------------------------------------------------------
const chatRequestSchema = z.object({
	messages: z.array(z.record(z.string(), z.unknown())).default([]),
});

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------
export async function POST(req: Request) {
	if (!process.env.OPENROUTER_API_KEY) {
		return new Response(
			"AI chat is not configured (missing OPENROUTER_API_KEY)",
			{ status: 503 },
		);
	}

	if (isRateLimited(getClientIp(req))) {
		return new Response("Too many requests", { status: 429 });
	}

	const parsed = chatRequestSchema.safeParse(await req.json());
	if (!parsed.success) {
		return new Response("Invalid request body", { status: 400 });
	}

	const result = streamText({
		model: openrouter.chat(
			process.env.OPENROUTER_MODEL ?? "anthropic/claude-3.5-sonnet",
		),
		stopWhen: stepCountIs(5),
		tools: { search: searchTool },
		messages: [
			{ role: "system", content: systemPrompt },
			...(await convertToModelMessages<ChatUIMessage>(
				parsed.data.messages as Parameters<
					typeof convertToModelMessages<ChatUIMessage>
				>[0],
				{
					convertDataPart(part) {
						if (part.type === "data-client")
							return {
								type: "text",
								text: `[Client Context: ${JSON.stringify(part.data)}]`,
							};
					},
				},
			)),
		],
		toolChoice: "auto",
	});

	return result.toUIMessageStreamResponse();
}
