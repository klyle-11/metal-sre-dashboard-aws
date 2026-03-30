'use client';

import { useState, useMemo } from 'react';
import type { Span, Trace } from '@/types/tracing';
interface TraceWaterfallProps {
    trace: Trace | null;
}

interface FlattenedSpan {
    span: Span;
    depth: number;
}

const SERVICE_COLORS: Record<string, string> = {
    'api-gateway': 'bg-blue-500',
    'auth-service': 'bg-violet-500',
    'user-service': 'bg-emerald-500',
    'search-service': 'bg-amber-500',
    'billing-service': 'bg-pink-500',
    'notification-service': 'bg-cyan-500',
    cache: 'bg-yellow-500',
    postgres: 'bg-orange-500',
}

function getServiceColor(serviceName: string): string {
    return SERVICE_COLORS[serviceName] ?? 'bg-zinc-500';
}

function flattenSpanTree(spans: Span[]): FlattenedSpan[] {
    const childrenMap = new Map<string | 'root', Span[]>();

    for (const span of spans) {
        const parentKey = span.parentSpanId ?? 'root';
        const siblings = childrenMap.get(parentKey);
        if(siblings) {
            siblings.push(span);
        } else {
            childrenMap.set(parentKey, [span])
        }
    }

    const result: FlattenedSpan[] = [];

    function walk(parentId: string | 'root', depth: number): void {
        const children = childrenMap.get(parentId) ?? [];
        for (const child of children) {
            result.push({ span: child, depth });
            walk(child.spanId, depth + 1)
        }
    }

    walk('root', 0);
    return result;
}

function formatMs(ms: number): string {
    if (ms < 1) return '<1ms';
    if (ms < 1000) return `${Math.round(ms)}ms`;
    return `${(ms / 1000).toFixed(2)}`;
}

function SpanBar({
    entry,
    traceDuration,
    isExpanded,
    onToggle
}: {
    entry: FlattenedSpan;
    traceDuration: number;
    isExpanded: boolean;
    onToggle: () => void;
}) {

    const { span, depth } = entry;
    const leftPercent = traceDuration > 0 ? (span.startTime / traceDuration) * 100 : 0;
    const widthPercent = traceDuration > 0 ? Math.max(0.5, (span.duration / traceDuration) * 100) : 0;
    const isError = span.status === 'error';
    const barColor = isError ? 'bg-red-500' : getServiceColor(span.serviceName);
    
    return (
        <div className="border-b border-zinc-800">
            <button
                type="button"
                onClick={onToggle}
                className="w-full text-left hover:bg-zinc-800/40 transition-colors"
            >
                <div className="flex items-cetner gap-2 px-3 py-2">
                    <div
                        className="flex items-center gap-1 shrink-0 text-cs text-zinc-400"
                        style={{ paddingLeft: `${depth * 20}px`, width: '240px' }}
                    >
                        <span 
                            className={`inline-block w-2.5 h-2.5 rounded-sm shrink-0 ${barColor}`}
                        />
                        <span>{span.serviceName}</span>
                        <span>{span.operationName}</span>
                    </div>
                    <div className="flex-1 relative h-6 bg-zinc-800/50 rounuded">
                        <div 
                            className={`absolute top-0.5 bottom-0.5 rounded ${barColor} ${
                                isError ? 'opacity-90' : 'opacity-70'
                            }`} 
                            style={{
                                left: `${leftPercent}`,
                                width: `${widthPercent}`,
                            }}
                        />
                    </div>
                    <span className="shrink-0 text-xs font-mono text-zinc-400 w-16 text-right">
                        {formatMs(span.duration)}
                    </span>
                </div>
            </button>
            {isExpanded && (
                <div className="px-4 py-2 bg-zinc-800/30 border-t border-zinc-800">
                    <div
                        className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs"
                        style={{ paddingLeft: `${depth * 20 + 20}px` }}
                    >
                        <span className="text-zinc-500">Span ID</span>
                        <span className="text-zinc-300">{span.spanId}</span>
                        <span className="text-zinc-500">Service</span>
                        <span className="text-zinc-300">{span.serviceName}</span>
                        <span className="text-zinc-500">Operation</span>
                        <span className="text-zinc-300">{span.operationName}</span>
                        <span className="text-zinc-500">Duration</span>
                        <span className="text-zinc-300">{formatMs(span.duration)}</span>
                        <span className="text-zinc-500">Status</span>
                        <span className={isError ? 'text-red-400' : 'text-emerald-400'}>{span.status}</span>
                        {Object.entries(span.tags).map(([key, value]) => (
                            <div key={key} className="contents">
                                <span className="text-zinc-500">{key}</span>
                                <span className="font-mono text-zinc-300">{value}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

export default function TraceWaterfall({ trace }: TraceWaterfallProps) {

    const [expandedSpanId, setExpandedSpanId] = useState<string | null>(null);

    const flatSpans = useMemo(() => {
        if (!trace) return [];
        return flattenSpanTree(trace.spans);
    }, [trace]);

    if (!trace) {
        <div className="flex items-center justify-center h-full text-zinc-500 text-sm">
            Click a trace from the list to show its waterfall viz
        </div>
    }
    
    return (
        <div className="flex flex-col h-full bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
            <div className="px-4 py-3 border-b border-zinc-800">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-sm font-medium text-zinc-200">
                            {trace?.rootSpan.operationName}
                        </h3>
                        <p className="text-xs text-zinc-500 font-mono mt-0.5">
                            {trace?.traceId}
                        </p>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-zinc-400">
                        <span>{formatMs(trace?.duration ?? 0)}</span>
                        <span>{trace?.spans.length} spans</span>
                        <span
                            className={`px-2 py-0.5 rounded-full font-medium ${
                                trace?.status === 'error'
                                    ? 'bg-red-500/20 text-red-400'
                                    : 'bg-emerald-500/20 text-emerald-400'
                            }`}
                        >
                            {trace?.status}
                        </span>
                    </div>
                </div>
            </div>
            <div className="flex-1 overflow-y-auto">
                {flatSpans.map((entry) => (
                    <SpanBar 
                        key={entry.span.spanId}
                        entry={entry}
                        traceDuration={trace.duration}
                        isExpanded={entry.span.spanId === expandedSpanId}
                        onToggle={() => 
                            setExpandedSpanId(
                                expandedSpanId === entry.span.spanId ? null : entry.span.spanId,
                            )
                        }
                    />
                ))}
            </div>
        </div>
    );
}