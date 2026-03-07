using TaskManager.Backend.Models;

namespace TaskManager.Backend.Repositories
{
    public interface IBoardRepository
    {
        public Task<bool> CreateBoardAsync(Board board);
        public Task<Board?> GetBoardByIdAsync(string boardID);
        public Task<bool> DeleteBoardAsync(string boardID);
    }
}
