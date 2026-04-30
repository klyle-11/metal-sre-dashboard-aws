interface SkeletonProps {
    className?: string;
}

export default function Skeleton({ className = '' }: SkeletonProps) {
    return (
        <div 
            className={`animate-pulse rounded bg-zinc-800 ${className}`}
            role="status"
            aria-label="Loading"
        />
    );
}