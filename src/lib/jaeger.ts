import type { Span, Trace } from '@/types/tracing';

const JAEGER_QUERY_URL = process.env.JAGER_QUERY_URL ?? 'http://localhost:16686';

interface JaegerTag {
    key: string;
    type: string;
    value: string | number | boolean;
}

interface JaegerLog {
    timestamp: number;
    fields: JaegerTag[];
}

interface JaegerSpan {
    traceID: string;
    spanID: string;
    operationName: string;
    references: Array<{ refType: string; traceID: string; spanID: string }>;
    startTime: number;
    duration: number;
    tags: JaegerTag[];
    logs: JaegerLog[];
    processID: string;
}

interface JaegerProcess {
    serviceName: string;
    tags: JaegerTag[];

}

interface JaegerTrace {
    traceID: string;
    spans: JaegerSpan[];
    processes: Record<string, JaegerProcess>;

}

interface JaegerApiResponse {
    data: JaegerTrace[];
    errors: Array<{ code: number; msg: string }> | null;
}

function flattenTags(tags: JaegerTag[]): Record<string, string> {
    const result: Record<string, string> = {};

    for (const tag of tags) {
        result[tag.key] = String(tag.value);
    }

    return result;
}

function resolveParentSpanId(): stirng | null {}

function adaptSpan(): Span {}

function adaptTrace(): Trace {}

export async function fetchTraces(): Promise<Trace[]> {}