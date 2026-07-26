interface Props {
  page: number;
  totalPages: number;
  onPageChange: (p: number) => void;
  total?: number;
}

export default function Pagination({ page, totalPages, onPageChange, total }: Props) {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-100">
      {total !== undefined && (
        <p className="text-xs text-slate-500">{total} total records</p>
      )}
      <div className="flex items-center gap-2 ml-auto">
        <button
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          className="btn btn-outline btn-sm disabled:opacity-40"
        >
          ← Prev
        </button>
        <span className="text-sm text-slate-500 px-2">
          {page} / {totalPages}
        </span>
        <button
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          className="btn btn-outline btn-sm disabled:opacity-40"
        >
          Next →
        </button>
      </div>
    </div>
  );
}
