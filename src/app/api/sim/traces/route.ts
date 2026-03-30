import { generateTraces } from '@/lib/sim/traceGenerator';

function parseCount(searchParams: URLSearchParams): number {

    const raw = searchParams.get('count');
    if (!raw) return 20;

    const value = Number(raw);
    if (Number.isNaN(value) || value < 1) return 20;

    return Math.min(50, Math.max(20, value));
}

export async function GET(request: Request) {

    const url = new URL(request.url);
    const count = parseCount(url.searchParams);
    const result = generateTraces(count);

    return Response.json(result, {
        headers: {
            'Cache-Control': 'no-store',
        },
    })
}