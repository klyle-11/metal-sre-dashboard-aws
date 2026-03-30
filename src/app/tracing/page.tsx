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
        <div className="flex flex-col gap-4 p-6 h-full">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-zinc-100">Dist. tracing</h2>
            </div>

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