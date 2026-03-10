using TaskManager.Backend.Contracts.Shared;
using TaskManager.Backend.Models;

namespace TaskManager.Backend.Repositories
{
    public interface IListColumnRepository
    {
        public Task<bool> CreateListColumnAsync(ListColumn listColumn);
        public Task<int> GetNextPositionForBoardAsync(string boardID);
        public Task<ListColumn?> GetListColumnByIdAsync(string listColumnID);
        public Task<bool> UpdateListColumnAsync(string listColumnID, string name);
        public Task<List<ItemPosition>?> UpdateListColumnPositionAsync(string listColumnID, int position);
        public Task<bool> DeleteListColumnAsync(string listColumnID);
    }
}
