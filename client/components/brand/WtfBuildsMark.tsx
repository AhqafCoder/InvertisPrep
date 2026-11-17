/**
 * Pixel-art "W" mark of the WTFBuilds studio (wtfbuilds.com), recreated as
 * inline SVG from the brand logo — a 5-column grid: outer columns 4 cells
 * tall, lime centre pair, bottom vertices on the last row.
 *
 * White cells use `currentColor` so the mark adapts to any surface; the lime
 * accent is sampled from the logo (#c8ff2e). Transparent background by design.
 */
const CELL = 18;
const GAP = 4;
const STEP = CELL + GAP;
const LIME = "#c8ff2e";

const CELLS: { col: number; row: number; lime?: boolean }[] = [
  // Outer down-strokes
  ...[0, 1, 2, 3].map((row) => ({ col: 0, row })),
  ...[0, 1, 2, 3].map((row) => ({ col: 4, row })),
  // Centre accent
  { col: 2, row: 2, lime: true },
  { col: 2, row: 3, lime: true },
  // Bottom vertices
  { col: 1, row: 4 },
  { col: 3, row: 4 },
];

export default function WtfBuildsMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox={`0 0 ${4 * STEP + CELL} ${4 * STEP + CELL}`}
      className={className}
      aria-hidden="true"
    >
      {CELLS.map(({ col, row, lime }) => (
        <rect
          key={`${col}-${row}`}
          x={col * STEP}
          y={row * STEP}
          width={CELL}
          height={CELL}
          rx={CELL * 0.25}
          fill={lime ? LIME : "currentColor"}
        />
      ))}
    </svg>
  );
}
