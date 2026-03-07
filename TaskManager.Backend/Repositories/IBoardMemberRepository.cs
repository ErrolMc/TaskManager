using TaskManager.Backend.Models;

namespace TaskManager.Backend.Repositories
{
    public interface IBoardMemberRepository
    {
        public Task<bool> CreateBoardMemberAsync(BoardMember boardMember);
        public Task<BoardMember?> GetBoardMemberAsync(string boardID, string userID);
        public Task<bool> DeleteBoardMembersAsync(string boardID);
    }
}
