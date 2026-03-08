using Microsoft.EntityFrameworkCore;
using TaskManager.Backend.Data;
using TaskManager.Backend.Models;
using TaskManager.Backend.Models.Enums;

namespace TaskManager.Backend.Repositories.Concrete
{
    public class BoardMemberRepository : IBoardMemberRepository
    {
        private readonly AppDbContext _context;

        public BoardMemberRepository(AppDbContext context)
        {
            _context = context;
        }

        public async Task<bool> CreateBoardMemberAsync(BoardMember boardMember)
        {
            _context.BoardMembers.Add(boardMember);
            return await _context.SaveChangesAsync() > 0;
        }

        public async Task<BoardMember?> GetBoardMemberAsync(string boardID, string userID)
        {
            return await _context.BoardMembers.AsNoTracking()
                .FirstOrDefaultAsync(m => m.BoardID == boardID && m.UserID == userID);
        }

        public async Task<List<BoardMember>> GetBoardMembersAsync(string boardID)
        {
            return await _context.BoardMembers.AsNoTracking()
                .Include(m => m.User)
                .Where(m => m.BoardID == boardID)
                .ToListAsync();
        }

        public async Task<List<BoardMember>> GetBoardMembershipsForUserAsync(string userID)
        {
            return await _context.BoardMembers.AsNoTracking()
                .Include(m => m.Board)
                .Where(m => m.UserID == userID)
                .ToListAsync();
        }

        public async Task<bool> UpdateBoardMemberRoleAsync(string boardID, string userID, Role newRole)
        {
            var boardMember = await _context.BoardMembers
                .FirstOrDefaultAsync(m => m.BoardID == boardID && m.UserID == userID);

            if (boardMember == null)
                return false;

            boardMember.Role = newRole;
            return await _context.SaveChangesAsync() > 0;
        }

        public async Task<bool> DeleteBoardMemberAsync(string boardID, string userID)
        {
            var boardMember = await _context.BoardMembers
                .FirstOrDefaultAsync(m => m.BoardID == boardID && m.UserID == userID);

            if (boardMember == null)
                return false;

            _context.BoardMembers.Remove(boardMember);
            return await _context.SaveChangesAsync() > 0;
        }

        public async Task<bool> DeleteBoardMembersAsync(string boardID)
        {
            var boardMembers = await _context.BoardMembers
                .Where(m => m.BoardID == boardID)
                .ToListAsync();

            if (boardMembers.Count == 0)
                return true;

            _context.BoardMembers.RemoveRange(boardMembers);
            return await _context.SaveChangesAsync() > 0;
        }
    }
}
