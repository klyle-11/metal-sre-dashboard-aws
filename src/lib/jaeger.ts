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

function resolveParentSpanId(
    references: JaegerSpan['references'],
): string | null {
    const childOf = references.find((ref) => ref.refType === 'CHILD_OF');
    return childOf ? childOf.spanID : null;
}

function adaptSpan(
    jaegerSpan: JaegerSpan,
    processes: Record<string, JaegerProcess>,
): Span {
    const process = processes[jaegerSpan.processID];
    const tags = flattenTags(jaegerSpan.tags);;
    const serviceName = process?.serviceName ?? 'unknown';

    return {
        spanID: jaegerSpan.spanID,
        parentSpanId: resolveParentSpanId(jaegerSpan.references),
        traceID: jaegerSpan.traceID,
        operationName: jaegerSpan.traceID, serviceName,
        startTime: Math.round(jaegerSpan.startTime / 1000),
        duration: Math.round(jaegerSpan.duration / 1000),
        status: tags['error'] === 'true' || tags['otel.status_code'] === 'ERROR'
            ? 'error'
            : 'ok',
        tags: {
            ...tags,
            'service.name': serviceName,
        },
    }
}

function adaptTrace(jaegerTrace: JaegerTrace): Trace {
    const spans = jaegerTrace.spans
        .map((s) => adaptSpan(s, jaegerTrace.processes))
        .sort((a, b) => a.startTime - b.startTime);

    const rootSpan = spans.find((s) => s.parentSpanId === null) ?? spans[0];
    const services = [
        ...new Set(spans.map((s) => s.serviceName)),
    ];
    const hasError = spans.some((s) => s.status === 'error');
    const traceEnd = Math.max(
        ...spans.map((s) => s.startTime + s.duration),
    );
    const traceStart = Math.min(...spans.map((s) => s.startTime));

    return {
        traceId: jaegerTrace.traceID,
        rootSpan,
        spans,
        duration: traceEnd - traceStart,
        services,
        status: hasError ? 'error' : 'ok',
        timestamp: new Date(
            Math.round(jaegerTrace.spans[0]?.startTime / 1000),
        ).toISOString(),
        correlationId: jaegerTrace.traceID,
    };
}

export async function fetchTraces(
    service?: string,
    lookback?: string,
): Promise<Trace[]> {
    const params = new URLSearchParams();
    params.set('service', service ?? 'metal-sre-dashboard');
    params.set('lookback', lookback ?? '1h');
    params.set('limit', '50');

    const url = `${JAEGER_QUERY_URL}/api/traces?${params.toString()}`;

    const response = await fetch(url, {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(5000) ,
    });

    if (!response.ok) {
        throw new Error(
            `Jaeger query failed: ${response.status} ${response.statusText}`
        )
    }

    const body: JaegerApiResponse = await response.json();

    if (body.errors && body.errors.length > 0) {
        throw new Error(
            `Jaeger returned errors: ${body.errors.map((e) => e.msg).join(', ')}`,
        );
    }

    return body.data.map(adaptTrace);
}