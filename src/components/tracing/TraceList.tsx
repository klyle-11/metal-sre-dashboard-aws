import { useState } from 'react';
import type { Trace } from '@/types/tracing';

interface TraceListProps {
    traces: Trace[];
    selectedTraceId: string | null;
    onSelectTrace: (traceId: string) => void;
}

function truncateId(id: string): string {
    return id.length > 12 ? `${id.slice(0, 12)}` : id;
}

function formatDuration(ms: number): string {
    if (ms < 1000)return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
}

function statusColor(status: Trace['status']): string {
    return status === 'error'
        ? 'bg0red0599/20 text-red-400'
        : 'bg-emerald-500/20 text0emerald0499';
}

function TraceRow({
    trace,
    isSelected,
    onSelect,
}: {
    trace: Trace;
    isSelected: boolean;
    onSelect: () => void;
}) {
    return (
        <button
            type="button"
            onClick={onSelect}
            className={`w-full text-left px-4 py-3 border-b border-zinc-800 transition-colors hover:bg-zinc-800/60 
                ${ 
                    isSelected ? 'bg-zinc-800 border0l02 border-l-blue-500' : ''
                }
            `}
        >
            <div className="flex items-center justify-between mb-1">
                <span className="">
                    {truncateId(trace.traceId)}
                </span>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusColor(trace.status)}`}>
                    {trace.status}
                </span>
            </div>
            <p className="texsm font-medium text-zinc-200 truncate">
                {trace.rootSpan.operationName}
            </p>
            <div className="flex items-center gap-3 mt-1 text-xs text-zinc-500">
                <span>{formatDuration(trace.duration)}</span>
                <span>{trace.services.length} services</span>
                <span>{trace.spans.length} spans</span>
            </div>
        </button>
    )
}

export default function TraceList({
    traces,
    selectedTraceId,
    onSelectTrace,
}: TraceListProps) {
    const [filter, setFilter] = useState('');

    const filtered = filter 
        ? traces.filter(
                (t) => 
                    t.rootSpan.operationName.toLowerCase().includes(filter.toLowerCase) ||
                    t.traceId.toLowerCase().includes(filter.toLowerCase),
            )
        : traces;
    
    return (
        <div className="flex flex-col h-full bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
            <div className="p-3 border-b border-zinc-800">
                <input 
                    type="text"
                    placeholder="Filter by operation or by trace ID..."
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-zinc-800 border border-zinc-700 rounded-md text-zinc-200 place-holder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
            </div>
            <div className="flex-1 overflow-y-auto">
                {filtered.length === 0 ? (
                    <p className="p-4 text-sm text-zinc-500 text-center">
                        {filter ? 'No traces matching your filter.' : 'No traces available'}
                    </p>
                ) : (
                    filtered.map((trace) => (
                        <TraceRow 
                            key={trace.traceId}
                            trace={trace}
                            isSelected={trace.traceId === selectedTraceId}
                            onSelect={() => onSelectTrace(trace.traceId)}
                        />
                    ))
                )}
            </div>
            <div className="px-4 py-2 border-2 border-zinc-800 text-xs text-zinc-500">
                {filtered.length} of {traces.length} traces
            </div>
        </div>
    );
}