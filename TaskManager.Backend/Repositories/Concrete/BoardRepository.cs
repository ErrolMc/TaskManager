using Microsoft.EntityFrameworkCore;
using TaskManager.Backend.Data;
using TaskManager.Backend.Models;

namespace TaskManager.Backend.Repositories.Concrete
{
    public class BoardRepository : IBoardRepository
    {
        private readonly AppDbContext _context;

        public BoardRepository(AppDbContext context)
        {
            _context = context;
        }

        public async Task<bool> CreateBoardAsync(Board board)
        {
            _context.Boards.Add(board);
            return await _context.SaveChangesAsync() > 0;
        }

        public async Task<Board?> GetBoardByIdAsync(string boardID)
        {
            return await _context.Boards.AsNoTracking().FirstOrDefaultAsync(b => b.ID == boardID);
        }

        public async Task<bool> DeleteBoardAsync(string boardID)
        {
            var board = await _context.Boards.FirstOrDefaultAsync(b => b.ID == boardID);
            if (board == null)
                return false;

            _context.Boards.Remove(board);
            return await _context.SaveChangesAsync() > 0;
        }
    }
}
