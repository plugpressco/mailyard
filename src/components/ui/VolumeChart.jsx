import {
	ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts';

// Brand blue (a chart mark is a surface, not text — the 3:1 bar applies).
const BLUE = '#2395E7';
const RED  = '#DC2626';

function fmtDay( iso ) {
	const d = new Date( iso + 'T00:00:00' );
	return d.toLocaleDateString( undefined, { month: 'short', day: 'numeric' } );
}

function ChartTooltip( { active, payload, label } ) {
	if ( ! active || ! payload?.length ) return null;
	const sent   = payload.find( ( p ) => p.dataKey === 'sent' )?.value ?? 0;
	const failed = payload.find( ( p ) => p.dataKey === 'failed' )?.value ?? 0;
	return (
		<div className="rounded-lg border border-ink-200 bg-surface px-3 py-2 text-[12px] shadow-sm">
			<div className="mb-1 font-semibold text-ink-900">{ fmtDay( label ) }</div>
			<div className="flex items-center gap-1.5 text-ink-600">
				<span className="h-2 w-2 rounded-full" style={ { background: BLUE } } /> { sent } sent
			</div>
			<div className="flex items-center gap-1.5 text-ink-600">
				<span className="h-2 w-2 rounded-full" style={ { background: RED } } /> { failed } failed
			</div>
		</div>
	);
}

// Send-volume area chart (sent vs failed) over the supplied daily series.
export default function VolumeChart( { data = [], height = 210 } ) {
	return (
		<ResponsiveContainer width="100%" height={ height }>
			<AreaChart data={ data } margin={ { top: 8, right: 4, left: -18, bottom: 0 } }>
				<defs>
					<linearGradient id="my-sent" x1="0" y1="0" x2="0" y2="1">
						<stop offset="0%" stopColor={ BLUE } stopOpacity={ 0.18 } />
						<stop offset="100%" stopColor={ BLUE } stopOpacity={ 0 } />
					</linearGradient>
					<linearGradient id="my-failed" x1="0" y1="0" x2="0" y2="1">
						<stop offset="0%" stopColor={ RED } stopOpacity={ 0.16 } />
						<stop offset="100%" stopColor={ RED } stopOpacity={ 0 } />
					</linearGradient>
				</defs>
				<CartesianGrid stroke="#E2E8F0" strokeDasharray="3 3" vertical={ false } />
				<XAxis
					dataKey="date"
					tickFormatter={ fmtDay }
					tick={ { fontSize: 11, fill: '#94A3B8' } }
					axisLine={ false }
					tickLine={ false }
					minTickGap={ 24 }
				/>
				<YAxis
					tick={ { fontSize: 11, fill: '#94A3B8' } }
					axisLine={ false }
					tickLine={ false }
					width={ 34 }
					allowDecimals={ false }
				/>
				<Tooltip content={ <ChartTooltip /> } cursor={ { stroke: '#CBD5E1', strokeWidth: 1 } } />
				<Area type="monotone" dataKey="sent" stroke={ BLUE } strokeWidth={ 2 } fill="url(#my-sent)" />
				<Area type="monotone" dataKey="failed" stroke={ RED } strokeWidth={ 1.5 } fill="url(#my-failed)" />
			</AreaChart>
		</ResponsiveContainer>
	);
}
