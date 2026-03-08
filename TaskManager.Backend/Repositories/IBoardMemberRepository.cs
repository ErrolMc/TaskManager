using TaskManager.Backend.Models;

namespace TaskManager.Backend.Repositories
{
    public interface IBoardMemberRepository
    {
        public Task<bool> CreateBoardMemberAsync(BoardMember boardMember);
        public Task<BoardMember?> GetBoardMemberAsync(string boardID, string userID);
        public Task<List<BoardMember>> GetBoardMembersAsync(string boardID);
        public Task<List<BoardMember>> GetBoardMembershipsForUserAsync(string userID);
        public Task<bool> DeleteBoardMemberAsync(string boardID, string userID);
        public Task<bool> DeleteBoardMembersAsync(string boardID);
    }
}
