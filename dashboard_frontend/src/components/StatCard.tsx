export function StatCard({ label, value, highlight = false }: { label: string, value: string, highlight?: boolean }) {
    return (
        <div className="bg-surface rounded-xl border border-border-subtle p-5 relative overflow-hidden flex-1 group hover:border-accent-purple/30 transition-colors">
            {/* Top border gradient */}
            <div className={`absolute top-0 left-0 right-0 h-[2px] ${highlight ? 'gradient-primary' : 'bg-border-subtle group-hover:gradient-primary transition-all duration-300'}`} />

            <div className="text-text-muted text-[13px] mb-2">{label}</div>
            <div className="text-text-main text-4xl font-bold font-mono tracking-tight">{value}</div>
        </div>
    );
}
