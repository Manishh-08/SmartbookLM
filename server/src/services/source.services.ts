import type { Prisma } from "../generated/prisma/client.js";
import { uploadPdfToCloudinary } from "../lib/cloudinary.js";
import { scrapeWebsite } from "../lib/firecrawl.js";
import { extractPdfFromBuffer } from "../lib/pdf.js";
import { enqueueSourceProcessing, cancelSourceProcessing } from "../lib/source-events.js";
import { fetchYoutubeTranscript } from "../lib/youtube.js";

import {
    createSourceRecord,
    deleteSourceRecord,
    findSourceByIdAndWorkspaceId,
    findSourcesByWorkspaceId,
    type SourceRecord,
} from "../repository/source.repository.js";
import { NotFoundError } from "../types/app-error.js";
import { CreateSourceInput, ImportWebsiteInput, ImportYoutubeInput, ListSourcesQuery } from "../validators/source.validator.js";
import { getWorkspaceByIdForUser } from "./workspace.services.js";
import { removeSourceFromIndex, abortSourceProcessing, processSourceById } from "./source-processing.services.js";

async function assertWorkspaceAccess(workspaceId: string, userId: string) {
    await getWorkspaceByIdForUser(workspaceId, userId);
}

async function createAndProcessSource(
    data: Parameters<typeof createSourceRecord>[0],
) {
    const source = await createSourceRecord(data);

    try {
        await enqueueSourceProcessing({
            sourceId: source.id,
            workspaceId: source.workspaceId,
        });
    } catch (inngestError) {
        console.warn("Inngest background processing enqueue failed:", inngestError);
    }

    // Trigger local background processing so it never stalls if Inngest worker is offline
    void processSourceById(source.id).catch((err) => {
        console.error("Local background source processing failed:", err);
    });

    return source;
}


export async function listSourcesForWorkspace(
    workspaceId: string,
    userId: string,
    filters: ListSourcesQuery = {},
) {
    await assertWorkspaceAccess(workspaceId, userId);
    const sources = await findSourcesByWorkspaceId(workspaceId, filters);

    // Self-healing: if any source has content or is pending/unindexed,
    // trigger background indexing so vectors exist in Pinecone for chat.
    for (const source of sources) {
        const metadata = (source.metadata && typeof source.metadata === "object" && !Array.isArray(source.metadata))
            ? (source.metadata as Record<string, unknown>)
            : {};
        const isNotIndexed = !metadata.indexedAt || !metadata.chunkCount;
        if ((source.status === "PENDING" || source.status === "PROCESSING" || (source.status === "READY" && isNotIndexed)) && source.content) {
            void processSourceById(source.id).catch((err) => {
                console.warn(`Self-healing background indexing failed for source ${source.id}:`, err);
            });
        }
    }

    return sources;
}

export async function getSourceForWorkspace(
    workspaceId: string,
    sourceId: string,
    userId: string,
): Promise<SourceRecord> {
    await assertWorkspaceAccess(workspaceId, userId);

    const source = await findSourceByIdAndWorkspaceId(sourceId, workspaceId);

    if (!source) {
        throw new NotFoundError("Source not found");
    }

    return source;
}

export async function deleteSourceForWorkspace(
    workspaceId: string,
    sourceId: string,
    userId: string,
) {
    await getSourceForWorkspace(workspaceId, sourceId, userId);

    // Halt in-flight processing immediately
    abortSourceProcessing(sourceId);

    // Cancel Inngest background job if currently queued or executing
    try {
        await cancelSourceProcessing({ sourceId, workspaceId });
    } catch (inngestError) {
        console.warn("Inngest cancellation failed:", inngestError);
    }

    try {
        await removeSourceFromIndex(workspaceId, sourceId);
    } catch (error) {
        console.error("Failed to remove source vectors from Pinecone:", error);
    }
    await deleteSourceRecord(sourceId);
}

export async function bulkDeleteSourcesForWorkspace(
    workspaceId: string,
    userId: string,
    sourceIds: string[],
) {
    await assertWorkspaceAccess(workspaceId, userId);

    for (const sourceId of sourceIds) {
        await deleteSourceForWorkspace(workspaceId, sourceId, userId);
    }
}

export async function createTextOrMarkdownSource(
    workspaceId: string,
    userId: string,
    input: CreateSourceInput,
) {
    await assertWorkspaceAccess(workspaceId, userId);

    return createAndProcessSource({
        workspaceId,
        type: input.type,
        title: input.title,
        content: input.content,
        status: "PENDING",
    });
}


export async function importWebsiteSource(
    workspaceId: string,
    userId: string,
    input: ImportWebsiteInput,
) {
    await getWorkspaceByIdForUser(workspaceId, userId);

    const scraped = await scrapeWebsite(input.url);

    return createAndProcessSource({
        workspaceId,
        type: "WEBSITE",
        title: input.title || scraped.title || input.url,
        content: scraped.markdown,
        url: scraped.sourceUrl,
        status: "PENDING",
        metadata: {
            importedFrom: scraped.sourceUrl,
        },
    });
}

export async function uploadPdfSource(
    workspaceId: string,
    userId: string,
    file: Express.Multer.File,
    title?: string,
) {
    await getWorkspaceByIdForUser(workspaceId, userId);

    const upload = await uploadPdfToCloudinary(
        file.buffer,
        file.originalname,
    );

    let content: string | null = null;
    let pageCount: number | undefined;

    try {
        const extracted = await extractPdfFromBuffer(file.buffer);
        content = extracted.text;
        pageCount = extracted.pageCount;
    } catch (extractError) {
        console.warn("Direct PDF buffer extraction failed at upload time:", extractError);
        // Inngest will retry extraction from Cloudinary if upload-time parse fails.
    }

    const metadata: Record<string, unknown> = {
        fileUrl: upload.secureUrl,
        fileName: upload.originalFilename,
        fileSize: upload.bytes,
        publicId: upload.publicId,
        resourceType: upload.resourceType,
    };

    if (typeof pageCount === "number") {
        metadata.pageCount = pageCount;
    }

    return createAndProcessSource({
        workspaceId,
        type: "PDF",
        title: title?.trim() || file.originalname.replace(/\.pdf$/i, ""),
        content,
        status: "PENDING",
        metadata: metadata as Prisma.InputJsonValue,
    });
}


export async function importYoutubeSource(
    workspaceId: string,
    userId: string,
    input: ImportYoutubeInput,
) {
    await getWorkspaceByIdForUser(workspaceId, userId);

    const transcript = await fetchYoutubeTranscript(input.url);

    return createAndProcessSource({
        workspaceId,
        type: "YOUTUBE",
        title: input.title || `YouTube: ${transcript.videoId}`,
        content: transcript.content,
        url: input.url,
        status: "PENDING",
        metadata: {
            videoId: transcript.videoId,
        },
    });
}