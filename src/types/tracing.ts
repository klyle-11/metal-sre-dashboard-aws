export type TraceStatus = "ok" | "error";

export type SpanStatus = "ok" | "error";

export type ServiceNodeType = "gateway" | "service" | "database" | "cache" | "queue";

export interface Span {
    spanId: string;
    parentSpanId: string | null;
    traceId: string;
    operationName: string;
    serviceName: string;
    startTime: number;
    duration: number;
    status: SpanStatus;
    tags: Record<string, string>;
}

export interface Trace {
    traceId: string;
    rootSpan: Span;
    spans: Span[];
    duration: number;
    service: string[];
    status: TraceStatus;
    timestamp: string;
    correlationId: string;
}

export interface ServiceConnection {
    target: string;
    requestRate: number;

}

export interface ServiceNode {
    name: string;
    type: ServiceNodeType;
    requestRate: number;
    errorRte: number;
    avgLatency: number;
    connections: ServiceConnection[];

}