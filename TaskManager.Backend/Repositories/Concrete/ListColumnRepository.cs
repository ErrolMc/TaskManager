using Microsoft.EntityFrameworkCore;
using TaskManager.Backend.Contracts.Shared;
using TaskManager.Backend.Data;
using TaskManager.Backend.Models;

namespace TaskManager.Backend.Repositories.Concrete
{
    public class ListColumnRepository : IListColumnRepository
    {
        private readonly AppDbContext _context;

        public ListColumnRepository(AppDbContext context)
        {
            _context = context;
        }

        public async Task<bool> CreateListColumnAsync(ListColumn listColumn)
        {
            _context.ListColumns.Add(listColumn);
            return await _context.SaveChangesAsync() > 0;
        }

        public async Task<List<ListColumn>> GetListColumnsForBoardAsync(string boardID)
        {
            return await _context.ListColumns.AsNoTracking()
                .Where(c => c.BoardID == boardID)
                .OrderBy(c => c.Position)
                .ThenBy(c => c.CreatedAtUTC)
                .ToListAsync();
        }

        public async Task<int> GetNextPositionForBoardAsync(string boardID)
        {
            int? maxPosition = await _context.ListColumns.AsNoTracking()
                .Where(c => c.BoardID == boardID)
                .MaxAsync(c => (int?)c.Position);

            return (maxPosition ?? -1) + 1;
        }

        public async Task<ListColumn?> GetListColumnByIdAsync(string listColumnID)
        {
            return await _context.ListColumns.AsNoTracking()
                .FirstOrDefaultAsync(c => c.ColumnID == listColumnID);
        }

        public async Task<bool> UpdateListColumnAsync(string listColumnID, string name)
        {
            ListColumn? listColumn = await _context.ListColumns
                .FirstOrDefaultAsync(c => c.ColumnID == listColumnID);

            if (listColumn == null)
                return false;

            listColumn.Name = name;
            listColumn.UpdatedAtUTC = DateTime.UtcNow;

            return await _context.SaveChangesAsync() > 0;
        }

        public async Task<List<ItemPosition>?> UpdateListColumnPositionAsync(string listColumnID, int position)
        {
            ListColumn? listColumn = await _context.ListColumns
                .FirstOrDefaultAsync(c => c.ColumnID == listColumnID);

            if (listColumn == null)
                return null;

            List<ListColumn> boardColumns = await _context.ListColumns
                .Where(c => c.BoardID == listColumn.BoardID)
                .OrderBy(c => c.Position)
                .ThenBy(c => c.CreatedAtUTC)
                .ToListAsync();

            if (boardColumns.Count == 0)
                return null;

            DateTime nowUTC = DateTime.UtcNow;
            bool normalizedPositions = false;

            for (int i = 0; i < boardColumns.Count; i++)
            {
                if (boardColumns[i].Position != i)
                {
                    boardColumns[i].Position = i;
                    boardColumns[i].UpdatedAtUTC = nowUTC;
                    normalizedPositions = true;
                }
            }

            int oldPosition = listColumn.Position;
            int maxPosition = boardColumns.Count - 1;
            int newPosition = Math.Min(position, maxPosition);

            if (newPosition == oldPosition)
            {
                if (normalizedPositions && await _context.SaveChangesAsync() <= 0)
                    return null;

                return boardColumns
                    .Select(c => new ItemPosition { Id = c.ColumnID, Position = c.Position })
                    .ToList();
            }

            if (newPosition < oldPosition)
            {
                foreach (ListColumn column in boardColumns.Where(c => c.ColumnID != listColumnID && c.Position >= newPosition && c.Position < oldPosition))
                {
                    column.Position += 1;
                    column.UpdatedAtUTC = nowUTC;
                }
            }
            else
            {
                foreach (ListColumn column in boardColumns.Where(c => c.ColumnID != listColumnID && c.Position <= newPosition && c.Position > oldPosition))
                {
                    column.Position -= 1;
                    column.UpdatedAtUTC = nowUTC;
                }
            }

            listColumn.Position = newPosition;
            listColumn.UpdatedAtUTC = nowUTC;

            if (await _context.SaveChangesAsync() <= 0)
                return null;

            return boardColumns
                .Select(c => new ItemPosition { Id = c.ColumnID, Position = c.Position })
                .ToList();
        }

        public async Task<bool> DeleteListColumnAsync(string listColumnID)
        {
            ListColumn? listColumn = await _context.ListColumns
                .FirstOrDefaultAsync(c => c.ColumnID == listColumnID);

            if (listColumn == null)
                return false;

            _context.ListColumns.Remove(listColumn);
            return await _context.SaveChangesAsync() > 0;
        }
    }
}
