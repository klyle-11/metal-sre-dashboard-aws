interface BadgeProps {
    label: string,
    variant: 'ok' | 'error' | 'warning' | 'info' | 'neutral';
}

const VARIANT_CLASSES: Record<BadgeProps['variant'], string> = {
    ok: 'bg-emerald-500/20 text-emerald-400',
    error: 'bg-red-500/20 text-red-400',
    warning: 'bg-amber-500/20 text-amber-400',
    info: 'bg-blue-500/20 text-blue-400',
    neutral: 'bg-zinc-500/20 text-zinc-400',
}

export default function Badge({ label, variant }: BadgeProps) {
    return (
        <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full ${VARIANT_CLASSES[variant]}`}>
            {label}
        </span>
    );
}