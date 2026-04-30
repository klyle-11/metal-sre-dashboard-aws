'use client';

import { useState } from 'react';
import TraceList from '@/components/tracing/TraceList';
import TraceWaterfall from '@/components/tracing/TraceWaterfall';
import ServiceMap from '@/components/tracing/ServiceMap';
import { useTraces } from '@/hooks/useTraces';

export default function TracingPage() {
    const { traces, serviceMap, isLoading, isSimData, error } = useTraces();
    const [selectedTraceId, setSelectedTraceId] = useState<string | null>(null);

    const selectedTrace = traces.find((t) => t.traceId === selectedTraceId) ?? null;

    return (
        <div className="page-container">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-zinc-100">Dist. tracing</h2>
            </div>

            {isSimData && (
                <div className="px-4 py-2 bg-amber-500/10 border border-amber-500/30 rounded-md text-sm text-amber-400">
                    Live data unavailable, showing sim data. Start Jaeger with {' '}
                    <code className="font-mono text-xs bg-zinc-800 px-1.5 py-0.5 rounded">
                        docker compose up
                    </code>{' '}
                </div>
            )}

            {error && !isSimData && (
                <div className="">
                    Failed to load trace data. Check your network connection?
                </div>
            )}

            <ServiceMap serviceNodes={serviceMap} />
            <div className="flex-1 grid grid-cols-3 gap-4 min-h-0">
                <div className="col-span-1 min-h-0">
                    <TraceList 
                        traces={traces}
                        selectedTraceId={selectedTraceId}
                        onSelectTrace={setSelectedTraceId}
                    />
                </div>
                <div className="col-span-2 min-h-0">
                    <TraceWaterfall trace={selectedTrace} />
                </div>
            </div>
        </div>
    );
}