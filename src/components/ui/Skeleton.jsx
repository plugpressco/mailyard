import { cn } from '@/lib/utils';

// Base skeleton block with pulse animation.
export default function Skeleton( { className, ...props } ) {
	return (
		<div
			className={ cn( 'animate-pulse rounded-lg bg-ink-100', className ) }
			{ ...props }
		/>
	);
}

// Common layout presets.

export function SkeletonText( { lines = 3, className } ) {
	return (
		<div className={ cn( 'flex flex-col gap-2', className ) }>
			{ Array.from( { length: lines }, ( _, i ) => (
				<Skeleton key={ i } className="h-3" style={ { width: i === lines - 1 ? '60%' : '100%' } } />
			) ) }
		</div>
	);
}

export function SkeletonCard( { className, height = 88 } ) {
	return <Skeleton className={ cn( 'border border-ink-200/70 bg-surface', className ) } style={ { height, borderRadius: 12 } } />;
}

// Dashboard skeleton — matches the real layout exactly.
export function DashboardSkeleton() {
	return (
		<div className="px-6 py-[22px]">
			<div className="mb-4 grid grid-cols-4 gap-2.5">
				{ [ 1, 2, 3, 4 ].map( ( i ) => <SkeletonCard key={ i } /> ) }
			</div>
			<div className="mb-4 grid grid-cols-[5fr_3fr] gap-3">
				<SkeletonCard height={ 160 } />
				<div className="flex flex-col gap-2">
					<SkeletonCard className="flex-1" height="auto" />
					<SkeletonCard className="flex-1" height="auto" />
					<SkeletonCard className="flex-1" height="auto" />
				</div>
			</div>
			<SkeletonCard height={ 200 } />
		</div>
	);
}

// Table skeleton.
export function TableSkeleton( { rows = 5 } ) {
	return (
		<div className="rounded-xl border border-ink-200/70 bg-surface overflow-hidden">
			<div className="flex gap-4 border-b border-ink-200/50 px-4 py-3">
				{ [ 120, 160, 80, 60, 70 ].map( ( w, i ) => <Skeleton key={ i } className="h-2.5" style={ { width: w } } /> ) }
			</div>
			{ Array.from( { length: rows }, ( _, i ) => (
				<div key={ i } className="flex items-center gap-4 border-b border-ink-200/30 px-4 py-3 last:border-b-0">
					{ [ 140, 180, 70, 50, 60 ].map( ( w, j ) => <Skeleton key={ j } className="h-3" style={ { width: w } } /> ) }
				</div>
			) ) }
		</div>
	);
}

// Connections skeleton.
export function ConnectionsSkeleton() {
	return (
		<div className="px-6 py-[22px]">
			<div className="mb-4 flex items-center justify-between">
				<Skeleton className="h-5 w-28" />
				<Skeleton className="h-8 w-16 rounded-lg" />
			</div>
			<div className="flex flex-col gap-1.5">
				{ [ 1, 2, 3 ].map( ( i ) => (
					<div key={ i } className="flex items-center gap-3 rounded-xl border border-ink-200/70 bg-surface px-4 py-3">
						<Skeleton className="h-6 w-6 rounded-full" />
						<Skeleton className="h-6 w-6 rounded-md" />
						<div className="flex-1">
							<Skeleton className="mb-1.5 h-3.5 w-24" />
							<Skeleton className="h-2.5 w-36" />
						</div>
						<Skeleton className="h-5 w-9 rounded-full" />
					</div>
				) ) }
			</div>
		</div>
	);
}

// Settings skeleton.
export function SettingsSkeleton() {
	return (
		<div className="mx-auto max-w-[680px] px-6 py-[22px]">
			<Skeleton className="mb-5 h-5 w-20" />
			{ [ 1, 2, 3 ].map( ( i ) => (
				<div key={ i } className="mb-3 rounded-xl border border-ink-200/70 bg-surface p-5">
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-3">
							<Skeleton className="h-8 w-8 rounded-lg" />
							<div>
								<Skeleton className="mb-1.5 h-3.5 w-28" />
								<Skeleton className="h-2.5 w-48" />
							</div>
						</div>
						<Skeleton className="h-5 w-9 rounded-full" />
					</div>
				</div>
			) ) }
		</div>
	);
}
