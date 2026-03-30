'use client';

import useSWR from 'swr';
import type { Trace, ServiceNode } from '@/types/tracing';

interface TracesResponse {
    traces: Trace[];
    serviceMap: ServiceNode[];

}

interface UseTracesReturn {
    traces: Trace[];
    serviceMap: ServiceNode[];
    isLoading: boolean;
    isSimData: boolean;
    error: Error | undefined;
}

async function fetchWithFallback(url: string): Promise<TracesResponse & { sim:boolean} > {

    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`API returned ${response.status}`);
        }
        const data: TracesResponse = await response.json();

        return { ...data, sim: false };

    } catch {
        const fallbackResponse = await fetch('/api/sim/traces');
        if (!fallbackResponse.ok) {
            throw new Error(`Sim API returned ${fallbackResponse.status}`);
        }
        const fallbackData: TracesResponse = await fallbackResponse.json();

        return { ...fallbackData, sim: true}
    }


}

export function useTraces(refreshInterval = 30_000): UseTracesReturn {
    const { data, error, isLoading } = useSWR(
        '/api/traces',
        fetchWithFallback,
        {
            refreshInterval,
            revalidateOnFocus: false,
            dedupingInterval: 10_000,
            errorRetryCount: 2,
        },
    );

    return {
        traces: data?.traces ?? [],
        serviceMap: data?.serviceMap ?? [],
        isLoading,
        isSimData: data?.sim ?? false,
        error,
    };
}