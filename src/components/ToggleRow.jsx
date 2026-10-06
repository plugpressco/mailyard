import { Toggle } from '@/components/ui';

/** One settings row: title + description on the left, a switch on the right. */
export default function ToggleRow( { title, description, on, onChange, children } ) {
	return (
		<div className="px-5 py-4">
			<div className="flex items-center justify-between gap-6">
				<div>
					<div className="text-[13px] font-semibold text-ink-900">{ title }</div>
					<div className="mt-[1px] text-[12px] text-ink-400">{ description }</div>
				</div>
				<Toggle label={ title } on={ on } onChange={ onChange } />
			</div>
			{ on && children && <div className="mt-3">{ children }</div> }
		</div>
	);
}
