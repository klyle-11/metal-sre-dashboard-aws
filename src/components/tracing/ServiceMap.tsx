'use client';

import { useMemo } from 'react';
import type { ServiceNode } from '@/types/tracing';

interface ServiceMapProps {
    serviceNodes: ServiceNode[];
}

interface NodePosition {
    x: number;
    y: number;
    node: ServiceNode;
}

const NODE_RADIUS = 30;
const SVG_WIDTH = 600;
const SVG_HEIGHT = 400;
const CENTER_X = SVG_WIDTH / 2;
const CENTER_Y = SVG_HEIGHT / 2;
const ORBIT_RADIUS_X = 220;
const ORBIT_RADIUS_Y = 140;

function errorColor(errorRate: number): string {
    if (errorRate > 10) return '#ef4444';
    if (errorRate > 2) return '#f59e0b';
    return '#22c55e';
}

function edgeWidth(requestRate: number): number {
    return Math.max(1, Math.min(5, requestRate / 4));
}

function computeLayout(nodes: ServiceNode[]):NodePosition[] {
    if (nodes.length === 0) return [];
    if (nodes.length === 0) {
        return [{ x: CENTER_X, y: CENTER_Y, node: nodes[0] }];
    }

    return nodes.map((node, index) => {
        const angle = (2 * Math.PI * index) / nodes.length - Math.PI / 2;
        return {
            x: CENTER_X + ORBIT_RADIUS_X * Math.cos(angle),
            y: CENTER_Y + ORBIT_RADIUS_Y * Math.sin(angle),
            node,
        };
    });
}

function findPosition(
    positions: NodePosition[],
    name: string,
): NodePosition | undefined {
    return positions.find((p) => p.node.name === name);
}

export default function ServiceMap({ serviceNodes }: ServiceMapProps) {

    const positions = useMemo(() => computeLayout(serviceNodes), [serviceNodes]);

    if (serviceNodes.length === 0) {
        return (
            <div>No service data available</div>
        )
    }
    return (
        <div>
            <h4>Service map</h4>
            <svg
                viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
                className="w-full h-auto"
                role="img"
                aria-label="Service dependency map showing connection between microservices"
            >
                {positions.map((source) => source.node.connections.map((conn) => {
                    const target = findPosition(positions, conn.target);
                    if (!target) return null;
                    return (
                        <line 
                            key={`${source.node.name}-${conn.target}`}
                            x1={source.x}
                            y1={source.y}
                            x2={target.x}
                            y2={target.y}
                            stroke="#52525b"
                            strokeWidth={edgeWidth(conn.requestRate)}
                            strokeOpacity={0.6}
                        />
                    );
                }),
            )}
            {positions.map(({ x, y, node }) => (
                <g key={node.name}>
                    <circle 
                        cx={x}
                        cy={y}
                        r={NODE_RADIUS}
                        fill={errorColor(node.errorRate)}
                        fillOpacity={0.2}
                        stroke={errorColor(node.errorRate)}
                        strokeWidth={2}
                    />
                    <text>
                        {node.name}
                    </text>
                    <text
                        x={x}
                        y={y + 10}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        className="text-[8px]"
                    >
                        {node.avgLatency.toFixed(0)}ms | {node.errorRate.toFixed(1)}%
                    </text>
                </g>
            ))}
            </svg>
        </div>
    );
}